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

const clamp = (n, min = 0, max = 100) => Math.max(min, Math.min(max, n));

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
  const currentEvent = run.currentEventId
    ? findEvent(run.currentEventId, pool) || null
    : null;
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
  const totalStages = Math.min(facility.stages, pool.length);
  const deck = shuffle(pool.map((e) => e.id)).slice(0, totalStages);
  const now = Date.now();
  const run = {
    sessionId: randomUUID(),
    facilityId,
    roleId,
    stage: 0,
    totalStages,
    resources: Object.assign({}, facility.startingResources),
    status: 'in_progress',
    deck,
    currentEventId: deck[0] || null,
    lastOutcome: null,
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

  for (const eff of choice.effects) {
    run.resources[eff.key] = clamp(run.resources[eff.key] + eff.amount);
  }
  run.lastOutcome = {
    choiceId: choice.id,
    outcome: choice.outcome,
    isRecommended: choice.isRecommended,
    learning: event.learning,
    eventTitle: event.title,
  };
  run.stage += 1;

  if (run.resources.integrity <= 0 || run.resources.uptime <= 0) {
    run.status = 'lost';
    run.currentEventId = null;
  } else if (run.stage >= run.totalStages) {
    run.status = 'won';
    run.currentEventId = null;
  } else {
    run.currentEventId = run.deck[run.stage] || null;
    if (!run.currentEventId) run.status = 'won';
  }
  run.updatedAt = Date.now();
  return toView(run);
}

function getView(sessionId) {
  const run = runs.get(sessionId);
  if (!run) throw new GameEngineError('Session not found.', 'no_session');
  return toView(run);
}

module.exports = { startGame, choose, getView, GameEngineError };
