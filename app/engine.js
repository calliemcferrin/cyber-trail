'use strict';
/**
 * Server-authoritative game engine (zero dependencies).
 *
 * SECURITY: all game state lives here, on the server. The client sends only
 * intents (start, choose). The server computes every resource change, the
 * score, and the win/lose outcome. A tampered client cannot alter its score or
 * skip consequences — the core trust-boundary property this game demonstrates.
 */
const { randomUUID } = require('node:crypto');
const { FACILITIES, ROLES, eventsFor } = require('./content.js');
const { glossaryFor } = require('./glossary.js');
const {
  miniGameIdForEvent,
  getMiniGame,
  publicMiniGame,
  scoreMiniGame,
  classifyTerminalLive,
} = require('./minigames.js');

const clamp = (n, min = 0, max = 100) => Math.max(min, Math.min(max, n));

/**
 * Difficulty tuning. The game is deliberately unforgiving: a facility is
 * considered compromised well before a meter hits zero, each stage imposes an
 * ongoing operating drain, and you can't coast on a good start.
 */
const DIFFICULTY = {
  // Lose if Integrity or Uptime drops to this or below (not just 0).
  loseThreshold: 25,
  // Per-stage passive drain applied before evaluating win/lose, modelling the
  // constant pressure of running critical infrastructure.
  stageDrain: { integrity: 3, uptime: 3, budget: 2, morale: 2 },
  // Starting resources are reduced by this much from each facility's base,
  // leaving less cushion for mistakes.
  startPenalty: { integrity: 10, uptime: 5, budget: 10, morale: 10 },
};

/**
 * The mid-journey funding/grant event for each role. The Supervisor's is a
 * mini-game that can EARN budget; the Operator/Employee versions are questions.
 * Inserted at the journey midpoint as an additive, skippable step.
 */
const FUNDING_EVENT_IDS = {
  supervisor: 'funding_grants_supervisor',
  operator: 'funding_grants_operator',
  employee: 'funding_grants_employee',
};

/** Fisher–Yates shuffle. */
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

class GameEngineError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

const TTL_MS = 1000 * 60 * 60; // 1 hour
const runs = new Map();

function reap() {
  const now = Date.now();
  for (const [id, run] of runs) {
    if (now - run.updatedAt > TTL_MS) runs.delete(id);
  }
}

function findEvent(id, pool) {
  return pool.find((e) => e.id === id);
}

function computeScore(run) {
  const { integrity, uptime, budget, morale } = run.resources;
  const survival = run.stage * 100;
  const resourceScore = integrity * 3 + uptime * 3 + budget + morale;
  const winBonus = run.status === 'won' ? 500 : 0;
  return Math.max(0, survival + resourceScore + winBonus);
}

/** Public, client-safe projection of a run. Private deck/state stays server-side. */
function toView(run) {
  const pool = eventsFor(run.facilityId, run.roleId);
  let currentEvent = run.currentEventId
    ? findEvent(run.currentEventId, pool) || null
    : null;
  if (currentEvent) {
    // Attach the "Beyond the acronym" glossary for terms in this event.
    const extra = { glossary: glossaryFor(currentEvent) };
    // If this event uses a mini-game, attach the client-safe version (no
    // answer key). The event still carries its choices as a fallback.
    const mgId = miniGameIdForEvent(currentEvent.id);
    const mgDef = mgId ? getMiniGame(mgId) : null;
    if (mgDef) {
      extra.minigame = publicMiniGame(mgId, mgDef);
    }
    currentEvent = Object.assign({}, currentEvent, extra);
  }
  return {
    sessionId: run.sessionId,
    facilityId: run.facilityId,
    roleId: run.roleId,
    stage: run.stage,
    totalStages: run.totalStages,
    resources: run.resources,
    status: run.status,
    score: computeScore(run),
    currentEvent,
    lastOutcome: run.lastOutcome,
    loseReason: run.loseReason || null,
  };
}

function startGame({ facilityId, roleId }) {
  reap();
  const facility = FACILITIES[facilityId];
  const role = ROLES[roleId];
  if (!facility || !role) {
    throw new GameEngineError('Unknown facility or role.', 'bad_selection');
  }
  const pool = eventsFor(facilityId, roleId);
  if (pool.length === 0) {
    throw new GameEngineError('No scenarios available.', 'no_content');
  }
  // The funding/grant event is handled specially: it's an ADDITIVE, mid-journey
  // step (not part of the random scenario count), so separate it from the pool.
  const fundingEvent = pool.find((e) => e.id === FUNDING_EVENT_IDS[roleId]);
  const scenarioPool = pool.filter((e) => e.id !== (fundingEvent && fundingEvent.id));

  const scenarioCount = Math.min(facility.stages, scenarioPool.length);
  const deck = shuffle(scenarioPool.map((e) => e.id)).slice(0, scenarioCount);

  // Insert the funding event at the journey midpoint (if one exists for this
  // role). This makes the run one stage longer than the scenario count.
  let fundingEventId = null;
  if (fundingEvent) {
    fundingEventId = fundingEvent.id;
    const mid = Math.floor(deck.length / 2);
    deck.splice(mid, 0, fundingEventId);
  }
  const totalStages = deck.length;
  const now = Date.now();
  // Reduced starting resources — less cushion than the facility's base.
  const base = facility.startingResources;
  // Per-facility starting budget (reduced by the start penalty like the other
  // meters). Budget is a managed resource again: it starts lean and the new
  // funding mini-game (mid-journey) is how a facility EARNS money back.
  const startResources = {
    integrity: clamp(base.integrity - DIFFICULTY.startPenalty.integrity),
    uptime: clamp(base.uptime - DIFFICULTY.startPenalty.uptime),
    budget: clamp(base.budget - DIFFICULTY.startPenalty.budget),
    morale: clamp(base.morale - DIFFICULTY.startPenalty.morale),
  };
  const run = {
    sessionId: randomUUID(),
    facilityId,
    roleId,
    stage: 0,
    totalStages,
    resources: startResources,
    status: 'in_progress',
    deck,
    currentEventId: deck[0] || null,
    lastOutcome: null,
    // Funding-event tracking (for the Supervisor skip rule). `fundingEventId` is
    // the mid-journey funding step for this role; `fundingSkipped` records a
    // skip; `imperfectElsewhere` is set true if ANY non-funding event was less
    // than perfect (a non-recommended choice, or a mini-game band below perfect).
    fundingEventId,
    fundingSkipped: false,
    imperfectElsewhere: false,
    createdAt: now,
    updatedAt: now,
  };
  runs.set(run.sessionId, run);
  return toView(run);
}

function choose(sessionId, { eventId, choiceId }) {
  const run = runs.get(sessionId);
  if (!run) throw new GameEngineError('Session not found.', 'no_session');
  if (run.status !== 'in_progress') {
    throw new GameEngineError('This run is already over.', 'run_over');
  }
  if (!run.currentEventId || run.currentEventId !== eventId) {
    throw new GameEngineError('Event mismatch.', 'event_mismatch');
  }
  const pool = eventsFor(run.facilityId, run.roleId);
  const event = findEvent(run.currentEventId, pool);
  if (!event) throw new GameEngineError('Event not found.', 'event_not_found');

  const choice = event.choices.find((c) => c.id === choiceId);
  if (!choice) throw new GameEngineError('Invalid choice.', 'bad_choice');

  const deltas = applyEffects(run, choice.effects);
  // Glossary for the debrief: terms appearing in the outcome + learning text.
  const debriefText = {
    prompt: choice.outcome,
    choices: [
      {
        label: event.learning.summary,
        outcome:
          event.learning.realWorldExample +
          ' ' +
          event.learning.preventiveMeasures.join(' '),
      },
    ],
  };
  run.lastOutcome = {
    choiceId: choice.id,
    outcome: choice.outcome,
    isRecommended: choice.isRecommended,
    learning: event.learning,
    eventTitle: event.title,
    deltas,
    glossary: glossaryFor(debriefText),
  };

  // Track run quality for the funding skip rule.
  trackFundingQuality(run, event.id, {
    skipped: false,
    perfect: !!choice.isRecommended,
  });

  advanceStage(run);
  return toView(run);
}

/**
 * Update the funding-rule tracking after an event resolves.
 * - If this is the funding event and it was skipped → mark fundingSkipped.
 * - If this is ANY OTHER event and it wasn't a top-mark result → mark
 *   imperfectElsewhere (a non-recommended choice, or a mini-game below perfect).
 * The funding event's own result never sets imperfectElsewhere (the rule is
 * explicitly "perfect APART FROM the funding mini-game").
 */
function trackFundingQuality(run, eventId, { skipped, perfect }) {
  if (eventId === run.fundingEventId) {
    if (skipped) run.fundingSkipped = true;
  } else if (!perfect) {
    run.imperfectElsewhere = true;
  }
}

/**
 * Apply a list of effects to the run's resources, returning the ACTUAL applied
 * delta per key (after clamping to 0..100). This lets the client show the player
 * exactly what each choice/outcome did to each meter this turn. The returned
 * value is derived state, not a secret — safe to send to the client.
 */
function applyEffects(run, effects) {
  const deltas = { integrity: 0, uptime: 0, budget: 0, morale: 0 };
  for (const eff of effects || []) {
    if (!(eff.key in run.resources)) continue; // ignore unknown resource keys
    const before = run.resources[eff.key];
    run.resources[eff.key] = clamp(before + eff.amount);
    deltas[eff.key] += run.resources[eff.key] - before;
  }
  return deltas;
}

/** Advance the run one stage and evaluate win/lose. Shared by choose + minigame. */
function advanceStage(run) {
  run.stage += 1;

  // Ongoing operating drain each stage — you can't coast on a good start.
  const d = DIFFICULTY.stageDrain;
  run.resources.integrity = clamp(run.resources.integrity - d.integrity);
  run.resources.uptime = clamp(run.resources.uptime - d.uptime);
  run.resources.budget = clamp(run.resources.budget - d.budget);
  run.resources.morale = clamp(run.resources.morale - d.morale);

  const t = DIFFICULTY.loseThreshold;
  if (run.resources.integrity <= t || run.resources.uptime <= t) {
    // Compromised well before zero — a critically degraded facility has failed.
    run.status = 'lost';
    run.currentEventId = null;
  } else if (run.stage >= run.totalStages) {
    // Reached the end. Apply the funding safety-net rule before declaring a win:
    // skipping the funding step is only forgiven on an otherwise-perfect run.
    if (run.fundingSkipped && run.imperfectElsewhere) {
      run.status = 'lost';
      run.loseReason = 'funding';
    } else {
      run.status = 'won';
    }
    run.currentEventId = null;
  } else {
    run.currentEventId = run.deck[run.stage] || null;
    if (!run.currentEventId) {
      // Deck exhausted early — same end-of-run funding check applies.
      if (run.fundingSkipped && run.imperfectElsewhere) {
        run.status = 'lost';
        run.loseReason = 'funding';
      } else {
        run.status = 'won';
      }
    }
  }
  run.updatedAt = Date.now();
}

/**
 * Resolve a mini-game event. The client submits its raw result (or skipped);
 * the server grades it against the hidden answer key, applies the graded
 * resource deltas, and produces the debrief. Trust boundary: the client never
 * sees the answer key and cannot set its own band.
 */
function submitMiniGame(sessionId, { eventId, minigameId, result, skipped }) {
  const run = runs.get(sessionId);
  if (!run) throw new GameEngineError('Session not found.', 'no_session');
  if (run.status !== 'in_progress') {
    throw new GameEngineError('This run is already over.', 'run_over');
  }
  if (!run.currentEventId || run.currentEventId !== eventId) {
    throw new GameEngineError('Event mismatch.', 'event_mismatch');
  }
  // The event must actually use this mini-game.
  if (miniGameIdForEvent(eventId) !== minigameId) {
    throw new GameEngineError('Mini-game mismatch.', 'minigame_mismatch');
  }
  const def = getMiniGame(minigameId);
  if (!def) throw new GameEngineError('Mini-game not found.', 'minigame_not_found');

  const pool = eventsFor(run.facilityId, run.roleId);
  const event = findEvent(run.currentEventId, pool);
  if (!event) throw new GameEngineError('Event not found.', 'event_not_found');

  const scored = scoreMiniGame(def, result, Boolean(skipped));
  const band = scored.band;
  const graded = def.grades[band];

  const deltas = applyEffects(run, graded.effects);

  // Client-safe summary of what each band awards, so the debrief can explain
  // WHERE the player's meter changes came from: which band they landed in, and
  // the better/worse bands they could have hit. This is the scoring
  // consequence, not the answer key — safe (and educational) to reveal.
  const bandEffects = {};
  for (const b of ['perfect', 'good', 'fail']) {
    if (def.grades[b]) bandEffects[b] = def.grades[b].effects;
  }

  const debriefText = {
    prompt: graded.outcome,
    choices: [
      {
        label: event.learning.summary,
        outcome:
          event.learning.realWorldExample +
          ' ' +
          event.learning.preventiveMeasures.join(' '),
      },
    ],
  };
  run.lastOutcome = {
    choiceId: 'minigame:' + minigameId,
    outcome: graded.outcome,
    isRecommended: band === 'perfect' || band === 'good',
    band,
    bandEffects,
    skipped: Boolean(skipped),
    wrongCount: scored.wrongCount,
    review: scored.review,
    learning: event.learning,
    eventTitle: event.title,
    deltas,
    glossary: glossaryFor(debriefText),
  };

  // Track run quality for the funding skip rule. A skipped funding mini-game
  // records the skip; any OTHER mini-game below the 'perfect' band counts as
  // imperfect-elsewhere.
  trackFundingQuality(run, event.id, {
    skipped: Boolean(skipped),
    perfect: band === 'perfect',
  });

  advanceStage(run);
  return toView(run);
}

/**
 * Live, mid-step classification for the terminal mini-game. The client sends the
 * single command the player just typed; the server classifies it against the
 * hidden key and returns only what pertains to THAT command (simulated output if
 * accepted, a targeted teaching hint if partial/rejected, nothing if unknown).
 *
 * Trust boundary: this is gated to the run's CURRENT event and its mapped
 * terminal mini-game, so it can't be used to probe other mini-games, and it
 * never returns the answer key — only a verdict on a command the player chose to
 * type. Grading still happens authoritatively in submitMiniGame.
 */
function classifyTerminal(sessionId, { eventId, minigameId, stepId, command }) {
  const run = runs.get(sessionId);
  if (!run) throw new GameEngineError('Session not found.', 'no_session');
  if (run.status !== 'in_progress') {
    throw new GameEngineError('This run is already over.', 'run_over');
  }
  if (!run.currentEventId || run.currentEventId !== eventId) {
    throw new GameEngineError('Event mismatch.', 'event_mismatch');
  }
  if (miniGameIdForEvent(eventId) !== minigameId) {
    throw new GameEngineError('Mini-game mismatch.', 'minigame_mismatch');
  }
  const def = getMiniGame(minigameId);
  if (!def || def.type !== 'terminal') {
    throw new GameEngineError('Not a terminal mini-game.', 'minigame_mismatch');
  }
  return classifyTerminalLive(def, stepId, command);
}

function getView(sessionId) {
  const run = runs.get(sessionId);
  if (!run) throw new GameEngineError('Session not found.', 'no_session');
  return toView(run);
}

module.exports = {
  startGame,
  choose,
  submitMiniGame,
  classifyTerminal,
  getView,
  GameEngineError,
};
