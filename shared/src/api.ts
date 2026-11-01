/**
 * API request/response contracts shared by client and server.
 *
 * The server validates every incoming request against these schemas before any
 * game logic runs. The client uses the same types so the contract can't drift.
 */
import { z } from 'zod';
import { FacilityId, Resources, RoleId, SafeId } from './domain.js';
import { Choice, GameEvent } from './content.js';

/** POST /api/game/start — begin a new run. */
export const StartGameRequest = z.object({
  facilityId: FacilityId,
  roleId: RoleId,
});
export type StartGameRequest = z.infer<typeof StartGameRequest>;

/** POST /api/game/:sessionId/choose — resolve a choice for the current event. */
export const ChooseRequest = z.object({
  eventId: SafeId,
  choiceId: SafeId,
});
export type ChooseRequest = z.infer<typeof ChooseRequest>;

export const GameStatus = z.enum(['in_progress', 'won', 'lost']);
export type GameStatus = z.infer<typeof GameStatus>;

/**
 * Public view of a run. Note: the server holds additional private state
 * (event deck, RNG seed) that is never sent to the client.
 */
export const GameView = z.object({
  sessionId: z.string(),
  facilityId: FacilityId,
  roleId: RoleId,
  stage: z.number().int(),
  totalStages: z.number().int(),
  resources: Resources,
  status: GameStatus,
  score: z.number().int(),
  currentEvent: GameEvent.nullable(),
  /** Populated after a choice is resolved, for the debrief screen. */
  lastOutcome: z
    .object({
      choiceId: z.string(),
      outcome: z.string(),
      isRecommended: z.boolean(),
    })
    .nullable(),
});
export type GameView = z.infer<typeof GameView>;

/** Generic error envelope — intentionally free of internal detail. */
export const ApiError = z.object({
  error: z.string(),
  code: z.string().optional(),
});
export type ApiError = z.infer<typeof ApiError>;

export type { Choice };
