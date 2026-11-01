/**
 * Content schemas: facilities, roles, and events are data-driven definitions.
 * Validating content with the same rigor as user input keeps the data layer honest.
 */
import { z } from 'zod';
import {
  AttackType,
  FacilityId,
  ResourceKey,
  RoleId,
  SafeId,
} from './domain.js';

/** A single resource delta applied by a choice (e.g. integrity -20). */
export const ResourceDelta = z.object({
  key: ResourceKey,
  amount: z.number().int().min(-100).max(100),
});
export type ResourceDelta = z.infer<typeof ResourceDelta>;

/** Structured educational payload attached to every event. */
export const Learning = z.object({
  attackType: AttackType,
  summary: z.string().min(1).max(600),
  realWorldExample: z.string().min(1).max(600),
  preventiveMeasures: z.array(z.string().min(1).max(240)).min(1).max(8),
  mitreAttck: z.string().max(32).optional(),
});
export type Learning = z.infer<typeof Learning>;

/** One choice the player can make in response to an event. */
export const Choice = z.object({
  id: SafeId,
  label: z.string().min(1).max(160),
  /** Resource effects applied server-side when chosen. */
  effects: z.array(ResourceDelta).max(4).default([]),
  /** Whether this choice reflects the recommended security practice. */
  isRecommended: z.boolean().default(false),
  /** Shown in the debrief after the choice resolves. */
  outcome: z.string().min(1).max(600),
});
export type Choice = z.infer<typeof Choice>;

/** An event is a scenario shown at a stage, filtered by facility + role. */
export const GameEvent = z.object({
  id: SafeId,
  title: z.string().min(1).max(120),
  /** Narrative prompt describing the situation from the role's perspective. */
  prompt: z.string().min(1).max(1000),
  facilities: z.array(FacilityId).min(1),
  roles: z.array(RoleId).min(1),
  choices: z.array(Choice).min(2).max(4),
  learning: Learning,
});
export type GameEvent = z.infer<typeof GameEvent>;

/** A role definition: perspective + starting resource emphasis. */
export const RoleDef = z.object({
  id: RoleId,
  name: z.string().min(1).max(60),
  tagline: z.string().min(1).max(160),
  description: z.string().min(1).max(600),
});
export type RoleDef = z.infer<typeof RoleDef>;

/** A facility definition: sector flavor + starting resources. */
export const FacilityDef = z.object({
  id: FacilityId,
  name: z.string().min(1).max(60),
  sector: z.string().min(1).max(80),
  tagline: z.string().min(1).max(160),
  description: z.string().min(1).max(600),
  startingResources: z.object({
    integrity: z.number().int().min(0).max(100),
    uptime: z.number().int().min(0).max(100),
    budget: z.number().int().min(0).max(100),
    morale: z.number().int().min(0).max(100),
  }),
  /** Number of stages (events) in a run for this facility. */
  stages: z.number().int().min(3).max(12),
});
export type FacilityDef = z.infer<typeof FacilityDef>;
