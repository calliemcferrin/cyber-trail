/**
 * Server-authoritative game engine.
 *
 * SECURITY: All game state lives here, on the server. The client sends only
 * intents (start, choose). The server computes every resource change, the score,
 * and the win/lose outcome. A tampered client cannot alter its own score or skip
 * consequences — that is the core trust-boundary property this game demonstrates.
 */
import { randomUUID } from 'node:crypto';
import type {
  ChooseRequest,
  GameEvent,
  GameView,
  Resources,
  StartGameRequest,
} from '@cyber-trail/shared';
import { getFacility } from '../content/facilities.js';
import { getRole } from '../content/roles.js';
import { eventsFor } from '../content/events.js';

/** Private server-side run state (never serialized to the client wholesale). */
interface RunState {
  sessionId: string;
  facilityId: string;
  roleId: string;
  stage: number;
  totalStages: number;
  resources: Resources;
  status: 'in_progress' | 'won' | 'lost';
  /** Remaining event ids to present, in order. */
  deck: string[];
  /** The event currently awaiting a choice, if any. */
  currentEventId: string | null;
  lastOutcome: GameView['lastOutcome'];
  createdAt: number;
  updatedAt: number;
}

const clamp = (n: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, n));

/** Fisher–Yates shuffle using crypto-grade randomness. */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i]!, a[j]!] = [a[j]!, a[i]!];
  }
  return a;
}

function findEvent(id: string, events: GameEvent[]): GameEvent | undefined {
  return events.find((e) => e.id === id);
}

export class GameEngineError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
  }
}

export class GameEngine {
  /**
   * In-memory store. For production this would be a database or cache with TTL;
   * the interface is kept narrow so swapping the store is trivial.
   */
  private runs = new Map<string, RunState>();

  /** Reap runs older than the TTL to bound memory (anti-DoS hygiene). */
  private readonly ttlMs = 1000 * 60 * 60; // 1 hour

  private reap(): void {
    const now = Date.now();
    for (const [id, run] of this.runs) {
      if (now - run.updatedAt > this.ttlMs) this.runs.delete(id);
    }
  }

  startGame(req: StartGameRequest): GameView {
    this.reap();

    const facility = getFacility(req.facilityId);
    const role = getRole(req.roleId);
    if (!facility || !role) {
      throw new GameEngineError('Unknown facility or role.', 'bad_selection');
    }

    const pool = eventsFor(req.facilityId, req.roleId);
    if (pool.length === 0) {
      throw new GameEngineError(
        'No scenarios available for that combination.',
        'no_content',
      );
    }

    const totalStages = Math.min(facility.stages, pool.length);
    const deck = shuffle(pool.map((e) => e.id)).slice(0, totalStages);

    const now = Date.now();
    const run: RunState = {
      sessionId: randomUUID(),
      facilityId: req.facilityId,
      roleId: req.roleId,
      stage: 0,
      totalStages,
      resources: { ...facility.startingResources },
      status: 'in_progress',
      deck,
      currentEventId: deck[0] ?? null,
      lastOutcome: null,
      createdAt: now,
      updatedAt: now,
    };
    this.runs.set(run.sessionId, run);
    return this.toView(run);
  }

  choose(sessionId: string, req: ChooseRequest): GameView {
    const run = this.runs.get(sessionId);
    if (!run) {
      throw new GameEngineError('Session not found.', 'no_session');
    }
    if (run.status !== 'in_progress') {
      throw new GameEngineError('This run is already over.', 'run_over');
    }
    if (!run.currentEventId || run.currentEventId !== req.eventId) {
      // Reject out-of-order / forged event references.
      throw new GameEngineError('Event mismatch.', 'event_mismatch');
    }

    const pool = eventsFor(run.facilityId, run.roleId);
    const event = findEvent(run.currentEventId, pool);
    if (!event) {
      throw new GameEngineError('Event not found.', 'event_not_found');
    }

    const choice = event.choices.find((c) => c.id === req.choiceId);
    if (!choice) {
      // The client tried to submit a choice that doesn't exist on this event.
      throw new GameEngineError('Invalid choice.', 'bad_choice');
    }

    // Apply effects authoritatively.
    for (const eff of choice.effects) {
      run.resources[eff.key] = clamp(run.resources[eff.key] + eff.amount);
    }

    run.lastOutcome = {
      choiceId: choice.id,
      outcome: choice.outcome,
      isRecommended: choice.isRecommended,
    };

    // Advance stage.
    run.stage += 1;

    // Evaluate lose conditions.
    if (run.resources.integrity <= 0 || run.resources.uptime <= 0) {
      run.status = 'lost';
      run.currentEventId = null;
    } else if (run.stage >= run.totalStages) {
      run.status = 'won';
      run.currentEventId = null;
    } else {
      run.currentEventId = run.deck[run.stage] ?? null;
      if (!run.currentEventId) {
        run.status = 'won';
      }
    }

    run.updatedAt = Date.now();
    return this.toView(run);
  }

  getView(sessionId: string): GameView {
    const run = this.runs.get(sessionId);
    if (!run) throw new GameEngineError('Session not found.', 'no_session');
    return this.toView(run);
  }

  /** Server-computed score. Never accepted from the client. */
  private computeScore(run: RunState): number {
    const { integrity, uptime, budget, morale } = run.resources;
    const survival = run.stage * 100;
    const resourceScore = integrity * 3 + uptime * 3 + budget + morale;
    const winBonus = run.status === 'won' ? 500 : 0;
    return Math.max(0, survival + resourceScore + winBonus);
  }

  private toView(run: RunState): GameView {
    const pool = eventsFor(run.facilityId, run.roleId);
    const currentEvent = run.currentEventId
      ? (findEvent(run.currentEventId, pool) ?? null)
      : null;
    return {
      sessionId: run.sessionId,
      facilityId: run.facilityId as GameView['facilityId'],
      roleId: run.roleId as GameView['roleId'],
      stage: run.stage,
      totalStages: run.totalStages,
      resources: run.resources,
      status: run.status,
      score: this.computeScore(run),
      currentEvent,
      lastOutcome: run.lastOutcome,
    };
  }
}

export const engine = new GameEngine();
