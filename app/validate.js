'use strict';
/**
 * Hand-rolled "reject by default" validation, replacing Zod with zero deps.
 * Every validator returns { ok: true, value } or { ok: false }.
 * We never surface *why* validation failed to the client (no info disclosure).
 */

const ID_RE = /^[a-z0-9_]+$/;

/** Validate a bounded, lowercase-alphanumeric id. */
function isId(v, max = 64) {
  return typeof v === 'string' && v.length >= 1 && v.length <= max && ID_RE.test(v);
}

/** Validate a UUID (v4-ish shape) for session ids. */
function isUuid(v) {
  return (
    typeof v === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
  );
}

/** Parse a JSON body safely with a size cap already enforced upstream. */
function parseJson(raw) {
  try {
    const value = JSON.parse(raw);
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      return { ok: false };
    }
    return { ok: true, value };
  } catch {
    return { ok: false };
  }
}

/** POST /api/game/start body. */
function validateStart(body) {
  if (!body || typeof body !== 'object') return { ok: false };
  const { facilityId, roleId } = body;
  if (!isId(facilityId) || !isId(roleId)) return { ok: false };
  // Reject unexpected extra keys (strict object).
  if (Object.keys(body).length !== 2) return { ok: false };
  return { ok: true, value: { facilityId, roleId } };
}

/** POST /api/game/:id/choose body. */
function validateChoose(body) {
  if (!body || typeof body !== 'object') return { ok: false };
  const { eventId, choiceId } = body;
  if (!isId(eventId) || !isId(choiceId)) return { ok: false };
  if (Object.keys(body).length !== 2) return { ok: false };
  return { ok: true, value: { eventId, choiceId } };
}

module.exports = { isId, isUuid, parseJson, validateStart, validateChoose };
