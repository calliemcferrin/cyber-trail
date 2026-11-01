'use strict';
/* End-to-end smoke test for the game loop. Run against a live server. */
const http = require('node:http');

const BASE = { host: '127.0.0.1', port: Number(process.env.PORT) || 4000 };

function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const r = http.request(
      { ...BASE, method, path, headers: data ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(data) } : {} },
      (res) => {
        let buf = '';
        res.on('data', (c) => (buf += c));
        res.on('end', () => {
          let json;
          try { json = JSON.parse(buf); } catch { json = buf; }
          resolve({ status: res.statusCode, json });
        });
      },
    );
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

(async () => {
  let failures = 0;
  const check = (name, cond, extra) => {
    console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : ''));
    if (!cond) failures++;
  };

  // Start a game
  const start = await req('POST', '/api/game/start', { facilityId: 'water', roleId: 'operator' });
  check('start returns 201', start.status === 201, 'status=' + start.status);
  let g = start.json;
  check('has sessionId', typeof g.sessionId === 'string');
  check('status in_progress', g.status === 'in_progress');
  check('has first event', g.currentEvent && typeof g.currentEvent.id === 'string', g.currentEvent && g.currentEvent.id);

  // Play the whole journey picking the recommended choice each time
  let stages = 0;
  while (g.status === 'in_progress' && g.currentEvent) {
    const ev = g.currentEvent;
    const rec = ev.choices.find((c) => c.isRecommended) || ev.choices[0];
    const r = await req('POST', '/api/game/' + g.sessionId + '/choose', { eventId: ev.id, choiceId: rec.id });
    check('choose stage ' + (stages + 1) + ' ok', r.status === 200, 'status=' + r.status);
    g = r.json;
    check('  debrief has learning', g.lastOutcome && g.lastOutcome.learning && !!g.lastOutcome.learning.attackType, g.lastOutcome && g.lastOutcome.learning && g.lastOutcome.learning.attackType);
    stages++;
    if (stages > 20) break;
  }
  check('journey ended', g.status !== 'in_progress', 'status=' + g.status);
  check('won with recommended choices', g.status === 'won', 'status=' + g.status + ' score=' + g.score);
  check('score computed > 0', typeof g.score === 'number' && g.score > 0, 'score=' + g.score);

  // --- SECURITY / anti-cheat checks ---
  const s2 = (await req('POST', '/api/game/start', { facilityId: 'power', roleId: 'employee' })).json;
  const ev2 = s2.currentEvent;

  // Submitting a choice id that is validly formatted but not on this event -> bad_choice.
  // (Derive one that definitely isn't present rather than hard-coding a real id.)
  const presentIds = new Set(ev2.choices.map((c) => c.id));
  let fakeChoice = 'definitely_not_a_choice';
  while (presentIds.has(fakeChoice)) fakeChoice += '_x';
  const badChoice = await req('POST', '/api/game/' + s2.sessionId + '/choose', { eventId: ev2.id, choiceId: fakeChoice });
  check('invalid choice rejected', badChoice.status === 400 && badChoice.json.code === 'bad_choice', 'code=' + (badChoice.json.code || ''));

  // Replaying the same event after answering -> event_mismatch
  const good = s2.currentEvent.choices[0];
  await req('POST', '/api/game/' + s2.sessionId + '/choose', { eventId: ev2.id, choiceId: good.id });
  const replay = await req('POST', '/api/game/' + s2.sessionId + '/choose', { eventId: ev2.id, choiceId: good.id });
  check('event replay rejected', replay.status === 400 && replay.json.code === 'event_mismatch', 'code=' + (replay.json.code || ''));

  // Unknown session -> no_session
  const ghost = await req('GET', '/api/game/00000000-0000-4000-8000-000000000000');
  check('unknown session rejected', ghost.status === 400 && ghost.json.code === 'no_session', 'code=' + (ghost.json.code || ''));

  // Oversized body -> 413
  const big = 'x'.repeat(20 * 1024);
  const oversize = await req('POST', '/api/game/start', { facilityId: big, roleId: 'operator' });
  check('oversized body rejected', oversize.status === 413 || oversize.status === 400, 'status=' + oversize.status);

  console.log('\n' + (failures === 0 ? 'ALL CHECKS PASSED ✅' : failures + ' CHECK(S) FAILED ❌'));
  process.exit(failures === 0 ? 0 : 1);
})().catch((e) => { console.error('smoketest error:', e.message); process.exit(1); });
