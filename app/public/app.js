'use strict';
/**
 * CYBER TRAIL client (vanilla JS, zero dependencies).
 *
 * The client is deliberately "dumb": it renders whatever the server sends and
 * submits intents. It holds no game logic, no scoring, and no authority over
 * outcomes — all of that lives on the server (the trust boundary).
 */
(function () {
  const app = document.getElementById('app');
  const API = '';

  // ------------------------- tiny DOM helpers -------------------------
  // Everything is built with textContent / createElement — no innerHTML with
  // server data — so content cannot inject markup (defense against XSS).
  function el(tag, props, children) {
    const node = document.createElement(tag);
    if (props) {
      for (const k in props) {
        if (k === 'class') node.className = props[k];
        else if (k === 'text') node.textContent = props[k];
        else if (k.startsWith('on') && typeof props[k] === 'function') {
          node.addEventListener(k.slice(2).toLowerCase(), props[k]);
        } else if (k === 'disabled') {
          node.disabled = Boolean(props[k]);
        } else {
          node.setAttribute(k, props[k]);
        }
      }
    }
    (children || []).forEach((c) => {
      if (c == null) return;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return node;
  }

  function render(nodes) {
    app.textContent = '';
    app.classList.remove('fade');
    void app.offsetWidth; // reflow to restart animation
    app.classList.add('fade');
    (Array.isArray(nodes) ? nodes : [nodes]).forEach((n) => app.appendChild(n));
    window.scrollTo(0, 0);
  }

  async function api(path, options) {
    const res = await fetch(API + path, Object.assign({ headers: {} }, options));
    const data = await res.json().catch(() => ({ error: 'Bad response.' }));
    if (!res.ok) throw new Error(data.error || 'Request failed.');
    return data;
  }

  function showError(msg) {
    const box = el('div', { class: 'error', text: '⚠ ' + msg });
    app.appendChild(box);
  }

  // ------------------------- state -------------------------
  const state = { facilities: [], roles: [], facilityId: null, roleId: null, game: null };

  // ------------------------- screens -------------------------
  function titleScreen() {
    render([
      el('div', { class: 'center' }, [
        el('p', { class: 'eyebrow', text: '// INSERT COIN — CRITICAL INFRASTRUCTURE DIVISION' }),
        el('h1', { class: 'title', text: 'CYBER TRAIL' }),
        el('p', { class: 'subtitle', text: 'Survive the journey. Defend the grid. Learn the threats.' }),
      ]),
      el('div', { class: 'panel' }, [
        el('p', { class: 'prompt-text', text:
          'The year is now. You are responsible for guiding a piece of critical ' +
          'infrastructure through a gauntlet of cyber threats. Like the pioneers ' +
          'of old, your journey is full of hazards — but yours are phishing emails, ' +
          'ransomware, and insider threats instead of dysentery and broken axles. ' +
          'Choose your facility. Choose your role. Make smart decisions. Survive.' }),
        el('div', { class: 'btn-row' }, [
          el('button', { class: 'btn', onClick: startFlow, text: '▶ Begin Journey' }),
        ]),
      ]),
    ]);
  }

  async function startFlow() {
    try {
      const [f, r] = await Promise.all([
        api('/api/content/facilities'),
        api('/api/content/roles'),
      ]);
      state.facilities = f.facilities;
      state.roles = r.roles;
      facilityScreen();
    } catch (e) {
      titleScreen();
      showError(e.message);
    }
  }

  function facilityScreen() {
    render([
      el('p', { class: 'eyebrow', text: '// STEP 1 OF 2 — SELECT FACILITY' }),
      el('h2', { class: 'subtitle', text: 'Which critical infrastructure will you defend?' }),
      el('div', { class: 'card-grid' },
        state.facilities.map((fac) =>
          el('button', { class: 'card', onClick: () => { state.facilityId = fac.id; roleScreen(); } }, [
            el('div', { class: 'tag', text: fac.sector }),
            el('h3', { text: fac.name }),
            el('p', { text: fac.description }),
          ]),
        ),
      ),
    ]);
  }

  function roleScreen() {
    render([
      el('p', { class: 'eyebrow', text: '// STEP 2 OF 2 — SELECT ROLE' }),
      el('h2', { class: 'subtitle', text: 'Whose eyes will you see the threats through?' }),
      el('div', { class: 'card-grid' },
        state.roles.map((role) =>
          el('button', { class: 'card', onClick: () => beginGame(role.id) }, [
            el('div', { class: 'tag', text: role.tagline }),
            el('h3', { text: role.name }),
            el('p', { text: role.description }),
          ]),
        ),
      ),
      el('div', { class: 'btn-row' }, [
        el('button', { class: 'btn secondary', onClick: facilityScreen, text: '◀ Back' }),
      ]),
    ]);
  }

  async function beginGame(roleId) {
    state.roleId = roleId;
    try {
      state.game = await api('/api/game/start', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ facilityId: state.facilityId, roleId: state.roleId }),
      });
      journeyScreen();
    } catch (e) {
      roleScreen();
      showError(e.message);
    }
  }

  // ------------------------- HUD -------------------------
  function meter(label, value) {
    const cls = value > 50 ? 'good' : value > 25 ? 'warn' : 'bad';
    return el('div', { class: 'meter' }, [
      el('div', { class: 'label' }, [
        el('span', { text: label }),
        el('span', { text: String(value) }),
      ]),
      el('div', { class: 'bar' }, [
        el('div', { class: 'fill ' + cls, style: 'width:' + value + '%' }),
      ]),
    ]);
  }

  function hud(g) {
    return el('div', { class: 'hud' }, [
      meter('Integrity', g.resources.integrity),
      meter('Uptime', g.resources.uptime),
      meter('Budget', g.resources.budget),
      meter('Morale', g.resources.morale),
    ]);
  }

  // ------------------------- glossary ("Beyond the acronym") -------------------------
  // Optional, collapsed-by-default reference so players who know the jargon
  // aren't forced to read definitions, while learners can expand them.
  function glossaryBlock(terms) {
    if (!terms || !terms.length) return null;
    const details = el('details', { class: 'glossary' }, [
      el('summary', { text: 'ⓘ Beyond the acronym (' + terms.length + ')' }),
      el('dl', { class: 'glossary-list' },
        terms.reduce((nodes, t) => {
          nodes.push(el('dt', { text: t.term }));
          nodes.push(el('dd', { text: t.definition }));
          return nodes;
        }, []),
      ),
    ]);
    return details;
  }

  // ------------------------- journey / event -------------------------
  function journeyScreen() {
    const g = state.game;
    if (g.status !== 'in_progress' || !g.currentEvent) return endScreen();
    const ev = g.currentEvent;
    const keys = ['A', 'B', 'C', 'D'];

    render([
      el('div', { class: 'stage-bar', text:
        '◢ STAGE ' + (g.stage + 1) + ' / ' + g.totalStages +
        '   ·   SCORE ' + g.score }),
      hud(g),
      el('div', { class: 'panel' }, [
        el('p', { class: 'eyebrow', text: ev.minigame ? '// INTERACTIVE CHALLENGE' : '// INCOMING EVENT' }),
        el('h2', { class: 'subtitle', text: ev.title }),
        el('p', { class: 'prompt-text', text: ev.prompt }),
        ev.minigame
          ? miniGameBlock(ev)
          : el('div', {},
              ev.choices.map((c, i) =>
                el('button', { class: 'choice', onClick: () => submitChoice(ev.id, c.id) }, [
                  el('span', { class: 'key', text: (keys[i] || '•') + '.' }),
                  c.label,
                ]),
              ),
            ),
        glossaryBlock(ev.glossary),
      ]),
    ]);
  }

  async function submitChoice(eventId, choiceId) {
    try {
      state.game = await api('/api/game/' + state.game.sessionId + '/choose', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ eventId, choiceId }),
      });
      debriefScreen();
    } catch (e) {
      showError(e.message);
    }
  }

  // ------------------------- mini-games -------------------------
  // Model C: some events render an interactive challenge instead of choices.
  // The client collects the player's raw result and submits it; the SERVER
  // grades it (the answer key never reaches the browser).
  function miniGameBlock(ev) {
    const mg = ev.minigame;
    const cfg = mg.config;
    const wrap = el('div', { class: 'minigame' });
    wrap.appendChild(el('p', { class: 'mg-instructions', text: cfg.instructions }));

    // local mutable selection state for this mini-game instance
    const state2 = { selected: {}, assignments: {}, order: null };

    if (mg.type === 'spot_the_phish') {
      wrap.appendChild(el('div', { class: 'mg-email' }, [
        el('div', { class: 'mg-email-head' }, [
          el('div', {}, [el('span', { class: 'mg-label', text: 'From: ' }), el('span', { class: 'mg-tok', 'data-id': 'from', text: cfg.from })]),
          el('div', {}, [el('span', { class: 'mg-label', text: 'Subject: ' }), el('span', { class: 'mg-tok', 'data-id': 'subject', text: cfg.subject })]),
        ]),
        el('div', { class: 'mg-tokens' },
          cfg.tokens.map((t) => {
            const btn = el('button', {
              class: 'mg-token',
              onClick: () => {
                state2.selected[t.id] = !state2.selected[t.id];
                btn.classList.toggle('picked', !!state2.selected[t.id]);
              },
            }, [t.text]);
            return btn;
          }),
        ),
      ]));
      wrap.appendChild(miniGameButtons(ev, () => ({
        selected: Object.keys(state2.selected).filter((k) => state2.selected[k]),
      })));
    }

    else if (mg.type === 'pick_practices') {
      wrap.appendChild(el('div', { class: 'mg-options' },
        cfg.options.map((o) => {
          const btn = el('button', {
            class: 'mg-option',
            onClick: () => {
              state2.selected[o.id] = !state2.selected[o.id];
              btn.classList.toggle('picked', !!state2.selected[o.id]);
            },
          }, [el('span', { class: 'mg-check', text: '◻ ' }), o.text]);
          btn.addEventListener('click', () => {
            btn.querySelector('.mg-check').textContent = state2.selected[o.id] ? '☑ ' : '◻ ';
          });
          return btn;
        }),
      ));
      wrap.appendChild(miniGameButtons(ev, () => ({
        selected: Object.keys(state2.selected).filter((k) => state2.selected[k]),
      })));
    }

    else if (mg.type === 'sort_messages') {
      // Each item gets a row of bin buttons; clicking sets its assignment.
      wrap.appendChild(el('div', { class: 'mg-sort' },
        cfg.items.map((it) => {
          const binRow = el('div', { class: 'mg-bins' },
            cfg.bins.map((b) => {
              const bb = el('button', {
                class: 'mg-bin',
                onClick: () => {
                  state2.assignments[it.id] = b.id;
                  // visually mark selected bin in this row
                  binRow.querySelectorAll('.mg-bin').forEach((x) => x.classList.remove('sel'));
                  bb.classList.add('sel');
                },
              }, [b.label]);
              return bb;
            }),
          );
          return el('div', { class: 'mg-sort-row' }, [
            el('div', { class: 'mg-sort-text', text: it.text }),
            binRow,
          ]);
        }),
      ));
      wrap.appendChild(miniGameButtons(ev, () => ({ assignments: state2.assignments })));
    }

    else if (mg.type === 'order_steps') {
      // Click steps in the order you'd perform them; show the chosen order.
      const chosen = [];
      const chosenBox = el('div', { class: 'mg-order-chosen' });
      const pool = el('div', { class: 'mg-order-pool' });
      function redraw() {
        chosenBox.textContent = '';
        chosen.forEach((id, i) => {
          const step = cfg.steps.find((s) => s.id === id);
          chosenBox.appendChild(el('div', { class: 'mg-order-item' }, [
            el('span', { class: 'mg-order-num', text: (i + 1) + '. ' }), step.text,
          ]));
        });
        pool.textContent = '';
        cfg.steps.filter((s) => chosen.indexOf(s.id) < 0).forEach((s) => {
          pool.appendChild(el('button', { class: 'mg-order-btn', onClick: () => { chosen.push(s.id); redraw(); } }, ['+ ' + s.text]));
        });
      }
      redraw();
      const reset = el('button', { class: 'btn secondary', onClick: () => { chosen.length = 0; redraw(); }, text: '↺ Reset order' });
      wrap.appendChild(el('p', { class: 'mg-sublabel', text: 'Your order:' }));
      wrap.appendChild(chosenBox);
      wrap.appendChild(el('p', { class: 'mg-sublabel', text: 'Remaining steps:' }));
      wrap.appendChild(pool);
      wrap.appendChild(el('div', { class: 'btn-row' }, [reset]));
      wrap.appendChild(miniGameButtons(ev, () => ({ order: chosen.slice() })));
    }

    return wrap;
  }

  function miniGameButtons(ev, collect) {
    return el('div', { class: 'btn-row mg-actions' }, [
      el('button', { class: 'btn', onClick: () => submitMiniGame(ev, collect(), false), text: '✓ Submit' }),
      el('button', { class: 'btn secondary', onClick: () => {
        if (confirmSkip()) submitMiniGame(ev, {}, true);
      }, text: '⤼ Skip (take the loss)' }),
    ]);
  }

  function confirmSkip() {
    return window.confirm(
      'Skip this challenge? It will be scored as a failure and you will take the ' +
      'full resource loss for it.',
    );
  }

  async function submitMiniGame(ev, result, skipped) {
    try {
      state.game = await api('/api/game/' + state.game.sessionId + '/minigame', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ eventId: ev.id, minigameId: ev.minigame.id, result, skipped }),
      });
      debriefScreen();
    } catch (e) {
      showError(e.message);
    }
  }

  // ------------------------- debrief -------------------------
  function debriefScreen() {
    const g = state.game;
    const o = g.lastOutcome;
    if (!o) return journeyScreen();
    const L = o.learning;

    const nodes = [
      el('div', { class: 'stage-bar', text: '◢ DEBRIEF — ' + (o.eventTitle || '') }),
      hud(g),
      el('div', { class: 'panel debrief' }, [
        el('span', { class: 'badge ' + (o.isRecommended ? 'ok' : 'no'),
          text: o.band
            ? (o.skipped ? '⤼ Skipped — ' : '') +
              ({ perfect: '★ PERFECT', good: '✓ GOOD', fail: '✗ FAILED' }[o.band] || o.band)
            : (o.isRecommended ? '✓ Strong security decision' : '✗ Risky decision') }),
        el('p', { class: 'prompt-text', text: o.outcome }),
        el('hr'),
        el('p', { class: 'eyebrow', text: '// THREAT INTEL' }),
        el('p', {}, [ el('span', { class: 'attack-name', text: L.attackType }) ]),
        el('p', { class: 'prompt-text', text: L.summary }),
        el('p', { class: 'real-world', text: '⌁ Real world: ' + L.realWorldExample }),
        el('p', { class: 'eyebrow', text: '// HOW TO PREVENT IT' }),
        el('ul', { class: 'learn-list' },
          L.preventiveMeasures.map((m) => el('li', { text: m })),
        ),
        L.mitreAttck ? el('p', { class: 'meta', text: 'MITRE ATT&CK: ' + L.mitreAttck }) : null,
        glossaryBlock(o.glossary),
      ]),
    ];

    const next = g.status === 'in_progress'
      ? el('button', { class: 'btn', onClick: journeyScreen, text: '▶ Continue Journey' })
      : el('button', { class: 'btn', onClick: endScreen, text: '▶ See Final Report' });
    nodes.push(el('div', { class: 'btn-row' }, [next]));
    render(nodes);
  }

  // ------------------------- end -------------------------
  function endScreen() {
    const g = state.game;
    const won = g.status === 'won';
    render([
      el('div', { class: 'center' }, [
        el('p', { class: 'eyebrow', text: won ? '// JOURNEY COMPLETE' : '// JOURNEY FAILED' }),
        el('div', { class: 'endbanner ' + (won ? 'win' : 'lose'),
          text: won ? 'INFRASTRUCTURE SECURED' : 'INFRASTRUCTURE COMPROMISED' }),
        el('p', { class: 'prompt-text', text: won
          ? 'You guided your facility through the gauntlet. The lights stayed on, ' +
            'the systems stayed clean, and your people stayed sharp. This is what ' +
            'defense in depth looks like.'
          : 'A meter hit zero — a breach or outage you could not recover from. In ' +
            'critical infrastructure the stakes are real. Study the debriefs, learn ' +
            'the preventive measures, and run the trail again.' }),
        el('p', { class: 'score', text: 'FINAL SCORE: ' + g.score }),
        hud(g),
        el('div', { class: 'btn-row', style: 'justify-content:center' }, [
          el('button', { class: 'btn', onClick: () => { state.game = null; titleScreen(); }, text: '↺ Play Again' }),
          el('button', { class: 'btn secondary', onClick: () => { state.facilityId = null; state.roleId = null; startFlow(); }, text: '⇄ New Facility / Role' }),
        ]),
      ]),
    ]);
  }

  // boot
  titleScreen();
})();
