'use strict';
/**
 * Builds a single self-contained HTML file (no server, no dependencies) for
 * previewing / playing CYBER TRAIL by just opening it in a browser.
 *
 * SINGLE UI SOURCE OF TRUTH
 * -------------------------
 * This build inlines the REAL client (`public/app.js`) verbatim — it does NOT
 * re-implement the UI. The only thing missing offline is the server, so we
 * also inline a small "local API" shim that installs
 * `window.__CYBER_TRAIL_LOCAL__`. The client's `api()` function detects that
 * global and routes requests to the shim instead of `fetch`, so the exact same
 * UI runs with no server. There is therefore no second copy of the UI to keep
 * in sync — any change to `public/app.js` is automatically reflected here.
 *
 * The shim mirrors the server's routes and reuses the REAL grader, command
 * classifier, and glossary detector (inlined from their source via
 * Function#toString), so grading/classification/glossary behavior matches the
 * server exactly. Only the thin game-state wrapper is local to the shim.
 *
 * NOTE (security): the offline demo necessarily ships the answer keys to the
 * browser (there is no server to hide them behind). That is acceptable for a
 * demo — the REAL game keeps all grading/classification server-side and never
 * sends answer keys to the client. See SECURITY.md.
 */
const fs = require('node:fs');
const path = require('node:path');

const PUB = path.join(__dirname, 'public');
const css = fs.readFileSync(path.join(PUB, 'styles.css'), 'utf8');
const matrixJs = fs.readFileSync(path.join(PUB, 'matrix.js'), 'utf8');
const appJs = fs.readFileSync(path.join(PUB, 'app.js'), 'utf8');

// Inline the logo images as base64 data URIs so the standalone stays a single
// offline file. (Marshall marks used with permission.)
function dataUri(file, mime) {
  const b64 = fs.readFileSync(path.join(PUB, file)).toString('base64');
  return 'data:' + mime + ';base64,' + b64;
}
const cyberBisonUri = dataUri('cyber-bison.png', 'image/png');
const mascotUri = dataUri('mascot.png', 'image/png');

const { FACILITIES, ROLES, EVENTS, eventsFor } = require('./content.js');
const { GLOSSARY, glossaryFor } = require('./glossary.js');
const mg = require('./minigames.js');

// ---- Rewrite `public/app.js` for the standalone -------------------------
// 1) The client loads logo images by filename (src: 'cyber-bison.png'); swap
//    those for the inlined data URIs so the single file is fully offline.
let clientJs = appJs
  .replace(/'cyber-bison\.png'/g, JSON.stringify(cyberBisonUri))
  .replace(/'mascot\.png'/g, JSON.stringify(mascotUri));

// ---- Inlined data + REAL logic (for the local API shim) -----------------
const facilities = JSON.stringify(Object.values(FACILITIES));
const roles = JSON.stringify(Object.values(ROLES));
const events = JSON.stringify(EVENTS);
const glossary = JSON.stringify(GLOSSARY);
const useCases = JSON.stringify(require('./glossary.js').USE_CASES);
const minigames = JSON.stringify(mg.MINIGAMES);
const eventMinigames = JSON.stringify(mg.EVENT_MINIGAMES);

// Reuse the REAL implementations by serializing their source. These are pure,
// browser-safe functions (no require / no Node APIs in their bodies).
const realLogicSource = [
  '// ---- real grader/classifier/glossary (inlined from server source) ----',
  'function clampPct(n){ return Math.max(0, Math.min(1, n)); }',
  'var TERMINAL_CARELESS_DEDUCTION = ' + mg.TERMINAL_CARELESS_DEDUCTION + ';',
  'var TERMINAL_REVEAL_DEDUCTION = ' + mg.TERMINAL_REVEAL_DEDUCTION + ';',
  fnSource(mg._internal.normalizeCmd),
  fnSource(mg._internal.matchesAny),
  fnSource(mg._internal.classifyTerminalCommand),
  fnSource(mg._internal.classifyTerminalLive),
  fnSource(mg._internal.bandFromScore),
  fnSource(mg._internal.withReview),
  fnSource(mg._internal.scoreTerminal),
  fnSource(mg._internal.scoreMiniGame),
  fnSource(mg._internal.miniGameIdForEvent),
  fnSource(mg._internal.getMiniGame),
  fnSource(mg._internal.publicMiniGame),
  // glossary detection (TERMS + eventText + glossaryFor are the real source)
  'var USE_CASES = ' + useCases + ';',
  'var TERMS = Object.keys(GLOSSARY);',
  fnSource(require('./glossary.js')._internal.eventText),
  fnSource(glossaryFor),
].join('\n');

function fnSource(fn) {
  return fn.toString();
}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>CYBER TRAIL // Critical Infrastructure (standalone demo)</title>
<style>
${css}
</style>
</head>
<body>
<canvas id="matrix" aria-hidden="true"></canvas>
<div class="crt" aria-hidden="true"></div>
<div class="scanlines" aria-hidden="true"></div>
<main id="app" class="screen">
  <noscript>
    <div class="panel" style="margin-top:2rem">
      <h2 class="subtitle">JavaScript is required</h2>
      <p class="prompt-text">This game runs in your browser with JavaScript.
      It looks like scripts are disabled, or this file was opened in a preview
      (e.g. an email, messaging app, or cloud-drive viewer) that does not run
      scripts. Please <strong>save the file and open it in a real browser</strong>
      (Safari or Chrome), or enable JavaScript.</p>
    </div>
  </noscript>
</main>
<footer class="footer">
  <span class="blink">&#9679;</span> CYBER TRAIL v0.1 &mdash; in collaboration with the
  Marshall University Institute for Cyber Security.
  All "attacks" are simulated for learning.
</footer>

<script>
${matrixJs}
</script>

<script>
'use strict';
/* =====================================================================
 * LOCAL API SHIM (offline). Installs window.__CYBER_TRAIL_LOCAL__, which the
 * inlined client (below) uses instead of fetch. Mirrors the server routes and
 * reuses the REAL grader / classifier / glossary so behavior matches the
 * server. Answer keys are present here only because an offline file has no
 * server to hide them behind (see SECURITY.md).
 * ===================================================================== */
(function () {
  var FACILITIES_ARR = ${facilities};
  var ROLES_ARR = ${roles};
  var EVENTS = ${events};
  var GLOSSARY = ${glossary};
  var MINIGAMES = ${minigames};
  var EVENT_MINIGAMES = ${eventMinigames};

  // Index facilities/roles by id for the engine.
  var FACILITIES = {}; FACILITIES_ARR.forEach(function (f) { FACILITIES[f.id] = f; });
  var ROLES = {}; ROLES_ARR.forEach(function (r) { ROLES[r.id] = r; });

  // eventsFor: same filter the server uses.
  function eventsFor(fid, rid) {
    return EVENTS.filter(function (e) {
      return e.facilities.indexOf(fid) >= 0 && e.roles.indexOf(rid) >= 0;
    });
  }

  ${realLogicSource}

  // ---- Local engine (thin state wrapper; mirrors engine.js) ----
  function clamp(n) { return Math.max(0, Math.min(100, n)); }
  var DIFFICULTY = {
    loseThreshold: 25,
    stageDrain: { integrity: 3, uptime: 3, budget: 2, morale: 2 },
    startPenalty: { integrity: 10, uptime: 5, budget: 10, morale: 10 },
  };
  function shuffle(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function findEvent(id, pool) { for (var i = 0; i < pool.length; i++) if (pool[i].id === id) return pool[i]; return null; }

  var run = null;

  function computeScore(r) {
    var res = r.resources;
    var survival = r.stage * 100;
    var resourceScore = res.integrity * 3 + res.uptime * 3 + res.budget + res.morale;
    var winBonus = r.status === 'won' ? 500 : 0;
    return Math.max(0, survival + resourceScore + winBonus);
  }

  function glossaryForText(blocks) {
    return glossaryFor({ prompt: blocks.join(' \\u241F '), choices: [] });
  }

  function toView(r) {
    var pool = eventsFor(r.facilityId, r.roleId);
    var ev = r.currentEventId ? findEvent(r.currentEventId, pool) : null;
    if (ev) {
      var copy = {}; for (var k in ev) copy[k] = ev[k];
      copy.glossary = glossaryFor(ev);
      var mgId = miniGameIdForEvent(ev.id);
      if (mgId) { var def = getMiniGame(mgId); if (def) copy.minigame = publicMiniGame(mgId, def); }
      ev = copy;
    }
    return {
      sessionId: 'local', facilityId: r.facilityId, roleId: r.roleId,
      stage: r.stage, totalStages: r.totalStages, resources: r.resources,
      status: r.status, score: computeScore(r), currentEvent: ev, lastOutcome: r.lastOutcome,
    };
  }

  function applyEffects(r, effects) {
    var deltas = { integrity: 0, uptime: 0, budget: 0, morale: 0 };
    (effects || []).forEach(function (eff) {
      if (!(eff.key in r.resources)) return;
      var before = r.resources[eff.key];
      r.resources[eff.key] = clamp(before + eff.amount);
      deltas[eff.key] += r.resources[eff.key] - before;
    });
    return deltas;
  }

  function advanceStage(r) {
    r.stage += 1;
    var d = DIFFICULTY.stageDrain;
    r.resources.integrity = clamp(r.resources.integrity - d.integrity);
    r.resources.uptime = clamp(r.resources.uptime - d.uptime);
    r.resources.budget = clamp(r.resources.budget - d.budget);
    r.resources.morale = clamp(r.resources.morale - d.morale);
    var t = DIFFICULTY.loseThreshold;
    if (r.resources.integrity <= t || r.resources.uptime <= t) { r.status = 'lost'; r.currentEventId = null; }
    else if (r.stage >= r.totalStages) { r.status = 'won'; r.currentEventId = null; }
    else { r.currentEventId = r.deck[r.stage] || null; if (!r.currentEventId) r.status = 'won'; }
  }

  function startGame(fid, rid) {
    var fac = FACILITIES[fid], role = ROLES[rid];
    if (!fac || !role) return err('Unknown facility or role.');
    var pool = eventsFor(fid, rid);
    if (!pool.length) return err('No scenarios available.');
    var totalStages = Math.min(fac.stages, pool.length);
    var deck = shuffle(pool.map(function (e) { return e.id; })).slice(0, totalStages);
    var b = fac.startingResources, sp = DIFFICULTY.startPenalty;
    run = {
      facilityId: fid, roleId: rid, stage: 0, totalStages: totalStages,
      resources: {
        integrity: clamp(b.integrity - sp.integrity), uptime: clamp(b.uptime - sp.uptime),
        budget: clamp(b.budget - sp.budget), morale: clamp(b.morale - sp.morale),
      },
      status: 'in_progress', deck: deck, currentEventId: deck[0] || null, lastOutcome: null,
    };
    return ok(201, toView(run));
  }

  function choose(body) {
    if (!run) return err('Session not found.');
    if (run.status !== 'in_progress') return err('This run is already over.');
    if (!run.currentEventId || run.currentEventId !== body.eventId) return err('Event mismatch.');
    var pool = eventsFor(run.facilityId, run.roleId);
    var ev = findEvent(run.currentEventId, pool);
    if (!ev) return err('Event not found.');
    var ch = ev.choices.filter(function (c) { return c.id === body.choiceId; })[0];
    if (!ch) return err('Invalid choice.');
    var deltas = applyEffects(run, ch.effects);
    run.lastOutcome = {
      choiceId: ch.id, outcome: ch.outcome, isRecommended: ch.isRecommended,
      learning: ev.learning, eventTitle: ev.title, deltas: deltas,
      glossary: glossaryForText([ch.outcome, ev.learning.summary, ev.learning.realWorldExample, ev.learning.preventiveMeasures.join(' ')]),
    };
    advanceStage(run);
    return ok(200, toView(run));
  }

  function submitMiniGame(body) {
    if (!run) return err('Session not found.');
    if (run.status !== 'in_progress') return err('This run is already over.');
    if (!run.currentEventId || run.currentEventId !== body.eventId) return err('Event mismatch.');
    if (miniGameIdForEvent(body.eventId) !== body.minigameId) return err('Mini-game mismatch.');
    var def = getMiniGame(body.minigameId);
    if (!def) return err('Mini-game not found.');
    var pool = eventsFor(run.facilityId, run.roleId);
    var ev = findEvent(run.currentEventId, pool);
    if (!ev) return err('Event not found.');
    var scored = scoreMiniGame(def, body.result, !!body.skipped);
    var graded = def.grades[scored.band];
    var deltas = applyEffects(run, graded.effects);
    var bandEffects = {};
    ['perfect', 'good', 'fail'].forEach(function (b) {
      if (def.grades[b]) bandEffects[b] = def.grades[b].effects;
    });
    run.lastOutcome = {
      choiceId: 'minigame:' + body.minigameId, outcome: graded.outcome,
      isRecommended: scored.band === 'perfect' || scored.band === 'good',
      band: scored.band, bandEffects: bandEffects, skipped: !!body.skipped, wrongCount: scored.wrongCount,
      review: scored.review, learning: ev.learning, eventTitle: ev.title, deltas: deltas,
      glossary: glossaryForText([graded.outcome, ev.learning.summary, ev.learning.realWorldExample, ev.learning.preventiveMeasures.join(' ')]),
    };
    advanceStage(run);
    return ok(200, toView(run));
  }

  function classifyTerminal(body) {
    if (!run) return err('Session not found.');
    if (run.status !== 'in_progress') return err('This run is already over.');
    if (!run.currentEventId || run.currentEventId !== body.eventId) return err('Event mismatch.');
    if (miniGameIdForEvent(body.eventId) !== body.minigameId) return err('Mini-game mismatch.');
    var def = getMiniGame(body.minigameId);
    if (!def || def.type !== 'terminal') return err('Not a terminal mini-game.');
    return ok(200, classifyTerminalLive(def, body.stepId, body.command));
  }

  function ok(status, json) { return { status: status, json: json }; }
  function err(message) { return { status: 400, json: { error: message } }; }

  // Router: mirrors server.js. Path + method + parsed body -> { status, json }.
  window.__CYBER_TRAIL_LOCAL__ = function (method, path, body) {
    var route = path.split('?')[0];
    if (method === 'GET' && route === '/api/content/facilities') return ok(200, { facilities: FACILITIES_ARR });
    if (method === 'GET' && route === '/api/content/roles') return ok(200, { roles: ROLES_ARR });
    if (method === 'POST' && route === '/api/game/start') return startGame((body || {}).facilityId, (body || {}).roleId);
    var m = route.match(/^\\/api\\/game\\/([^/]+)(\\/choose|\\/minigame|\\/terminal)?\$/);
    if (m) {
      var action = m[2];
      if (method === 'GET' && !action) return run ? ok(200, toView(run)) : err('Session not found.');
      if (method === 'POST' && action === '/choose') return choose(body || {});
      if (method === 'POST' && action === '/minigame') return submitMiniGame(body || {});
      if (method === 'POST' && action === '/terminal') return classifyTerminal(body || {});
    }
    return { status: 404, json: { error: 'Not found.' } };
  };
})();
</script>

<script>
/* =====================================================================
 * THE REAL CLIENT — inlined verbatim from public/app.js (single source of
 * truth). It talks to the local shim above via window.__CYBER_TRAIL_LOCAL__.
 * ===================================================================== */
${clientJs}
</script>
</body>
</html>`;

const out = path.join(__dirname, '..', 'cyber-trail-standalone.html');
fs.writeFileSync(out, html);
console.log('wrote', out, '(' + (Buffer.byteLength(html) / 1024).toFixed(1) + ' KB)');
