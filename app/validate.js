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

/** A bounded array of ids (for mini-game selections / order). */
function isIdArray(v, maxLen = 32) {
  return (
    Array.isArray(v) &&
    v.length <= maxLen &&
    v.every((x) => isId(x))
  );
}

/**
 * POST /api/game/:id/minigame body.
 * Shape: { eventId, minigameId, skipped?, result? }
 * `result` is type-dependent and validated loosely but safely:
 *   - selected: id[]            (spot_the_phish / pick_practices)
 *   - order: id[]               (order_steps)
 *   - assignments: { id: binId } (sort_messages) — bounded, ids only
 * The server grades it; invalid/missing result simply grades poorly.
 */
function validateMiniGame(body) {
  if (!body || typeof body !== 'object') return { ok: false };
  const { eventId, minigameId, skipped, result } = body;
  if (!isId(eventId) || !isId(minigameId)) return { ok: false };

  const allowed = ['eventId', 'minigameId', 'skipped', 'result'];
  if (Object.keys(body).some((k) => !allowed.includes(k))) return { ok: false };

  if (skipped !== undefined && typeof skipped !== 'boolean') return { ok: false };

  let cleanResult = {};
  if (result !== undefined) {
    if (result === null || typeof result !== 'object' || Array.isArray(result)) {
      return { ok: false };
    }
    if (result.selected !== undefined) {
      if (!isIdArray(result.selected)) return { ok: false };
      cleanResult.selected = result.selected;
    }
    if (result.order !== undefined) {
      if (!isIdArray(result.order)) return { ok: false };
      cleanResult.order = result.order;
    }
    if (result.assignments !== undefined) {
      const a = result.assignments;
      if (a === null || typeof a !== 'object' || Array.isArray(a)) return { ok: false };
      const keys = Object.keys(a);
      if (keys.length > 32) return { ok: false };
      for (const k of keys) {
        if (!isId(k) || !isId(a[k])) return { ok: false };
      }
      cleanResult.assignments = a;
    }
    // Terminal mini-game: { level, steps: {stepId: "typed cmd"}, reveals: id[] }
    if (result.level !== undefined) {
      if (['guided', 'comfortable', 'expert'].indexOf(result.level) < 0) {
        return { ok: false };
      }
      cleanResult.level = result.level;
    }
    if (result.steps !== undefined) {
      const st = result.steps;
      if (st === null || typeof st !== 'object' || Array.isArray(st)) return { ok: false };
      const keys = Object.keys(st);
      if (keys.length > 32) return { ok: false };
      for (const k of keys) {
        // Key must be an id; value is a short free-text command string.
        if (!isId(k)) return { ok: false };
        if (typeof st[k] !== 'string' || st[k].length > 200) return { ok: false };
      }
      cleanResult.steps = st;
    }
    if (result.reveals !== undefined) {
      if (!isIdArray(result.reveals)) return { ok: false };
      cleanResult.reveals = result.reveals;
    }
  }

  return {
    ok: true,
    value: {
      eventId,
      minigameId,
      skipped: Boolean(skipped),
      result: cleanResult,
    },
  };
}

module.exports = {
  isId,
  isUuid,
  parseJson,
  validateStart,
  validateChoose,
  validateMiniGame,
};
