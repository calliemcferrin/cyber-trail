/**
 * Core domain enums and value constraints for CYBER TRAIL.
 *
 * These are the allow-lists that drive "reject by default" validation.
 * If a value isn't defined here, the server will refuse it.
 */
import { z } from 'zod';

/** The three player perspectives. */
export const RoleId = z.enum(['employee', 'operator', 'supervisor']);
export type RoleId = z.infer<typeof RoleId>;

/** Available critical-infrastructure facilities (extend as data grows). */
export const FacilityId = z.enum(['water', 'power']);
export type FacilityId = z.infer<typeof FacilityId>;

/** Categories of simulated attack, used for the educational layer. */
export const AttackType = z.enum([
  'phishing',
  'ransomware',
  'ddos',
  'insider_threat',
  'supply_chain',
  'social_engineering',
  'unpatched_vuln',
  'physical_access',
]);
export type AttackType = z.infer<typeof AttackType>;

/** The resource meters tracked during a run. */
export const ResourceKey = z.enum(['integrity', 'uptime', 'budget', 'morale']);
export type ResourceKey = z.infer<typeof ResourceKey>;

/** Resource meters are bounded 0..100. */
export const ResourceValue = z.number().int().min(0).max(100);

export const Resources = z.object({
  integrity: ResourceValue,
  uptime: ResourceValue,
  budget: ResourceValue,
  morale: ResourceValue,
});
export type Resources = z.infer<typeof Resources>;

/** Bounded identifiers to prevent abuse via oversized/odd strings. */
export const SafeId = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9_]+$/, 'ids must be lowercase alphanumeric + underscore');
