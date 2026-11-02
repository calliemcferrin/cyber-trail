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

  function beginGame(roleId) {
    state.roleId = roleId;
    // On mobile (touch + narrow screen), skip the typing step entirely and go
    // straight into the mission. On desktop, show the themed import terminal.
    if (isMobile()) {
      startJourney();
    } else {
      importScreen();
    }
  }

  async function startJourney() {
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

  // Treat as mobile when the device has a coarse/touch pointer AND a narrow
  // viewport — catches phones without falsely skipping touch-enabled desktops.
  function isMobile() {
    const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    const touch = ('ontouchstart' in window) || (navigator.maxTouchPoints || 0) > 0;
    const narrow = window.innerWidth <= 820;
    const uaMobile = navigator.userAgentData
      ? !!navigator.userAgentData.mobile
      : /Mobi|Android|iPhone|iPod/i.test(navigator.userAgent || '');
    return (uaMobile || ((coarse || touch) && narrow));
  }

  // ------------------------- import terminal (mission loader) -------------------------
  // Flavor-only gate: the player types `import <facility> --<role>` to "load"
  // their mission. Guidance is baked into the terminal's usage line. Not scored.
  function importScreen() {
    const fac = state.facilityId;
    const role = state.roleId;
    const expected = ('import ' + fac + ' --' + role).toLowerCase();

    const screen = el('div', { class: 'term-screen term-import-screen' });
    const input = el('input', { class: 'term-input', type: 'text', autocomplete: 'off',
      spellcheck: 'false', placeholder: 'type the import command and press Enter' });
    const promptSpan = el('span', { class: 'term-prompt', text: 'operator@cyber-trail:~$ ' });

    function print(line, cls) {
      screen.appendChild(el('div', { class: 'term-line' + (cls ? ' ' + cls : '') }, [line]));
      screen.scrollTop = screen.scrollHeight;
    }

    function boot() {
      print('cyber-trail // mission loader', 'term-ok');
      print('usage: import <facility> --<role>', 'term-dim');
      print('note: <> mark placeholders — do not type the angle brackets.', 'term-dim');
      print('target facility : ' + fac, 'term-dim');
      print('target role     : ' + role, 'term-dim');
      print('e.g.  import ' + fac + ' --' + role, 'term-dim');
      print('—', 'term-dim');
    }

    function normalize(s) {
      return (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
    }

    async function run() {
      const raw = input.value.trim();
      if (!raw) return;
      print(promptSpan.textContent + raw);
      const norm = normalize(raw);
      // Accept: "import <fac> --<role>" with flexible spacing/order of the flag.
      const ok =
        norm === expected ||
        norm === normalize('import --' + role + ' ' + fac) ||
        norm === normalize('import ' + fac + ' -' + role);
      if (!ok) {
        if (norm.indexOf('import') !== 0) {
          print("command not found: " + raw.split(' ')[0] + ' — try: import ' + fac + ' --' + role, 'term-dim');
        } else {
          print("import: unknown target — usage: import <facility> --<role> (import " + fac + ' --' + role + ')', 'term-dim');
        }
        input.value = '';
        input.focus();
        return;
      }
      // Success: brief simulated load, then start.
      input.disabled = true;
      print('fetching ' + fac + ' profile …', 'term-out');
      setTimeout(() => print('loading ' + role + ' toolkit …', 'term-out'), 350);
      setTimeout(() => print('integrity check … OK', 'term-out'), 700);
      setTimeout(() => { print('mission loaded. launching …', 'term-ok'); }, 1000);
      setTimeout(() => startJourney(), 1500);
    }

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); run(); }
    });

    render([
      el('p', { class: 'eyebrow', text: '// MISSION LOADER' }),
      el('h2', { class: 'subtitle', text: 'Import your mission data' }),
      el('div', { class: 'panel' }, [
        screen,
        el('div', { class: 'term-input-row' }, [promptSpan, input]),
      ]),
      el('div', { class: 'btn-row' }, [
        el('button', { class: 'btn secondary', onClick: roleScreen, text: '◀ Back' }),
      ]),
    ]);
    boot();
    input.focus();
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

  // ------------------------- mini-game review ("where you went wrong") -------------------------
  // Collapsible per-item breakdown shown in the debrief after a mini-game.
  function reviewBlock(o) {
    if (!o || !o.review || !o.review.length) return null;
    const total = o.review.length;
    const wrong = o.wrongCount || 0;
    const summary = wrong === 0
      ? '★ Review your answers — all ' + total + ' correct'
      : '⚠ Review your answers — ' + wrong + ' of ' + total + ' wrong (tap to see where)';
    const details = el('details', { class: 'review ' + (wrong === 0 ? 'all-ok' : 'has-wrong') }, [
      el('summary', { text: summary }),
      el('ul', { class: 'review-list' },
        o.review.map((r) =>
          el('li', { class: 'review-item ' + (r.ok ? 'ok' : 'no') }, [
            el('span', { class: 'review-mark', text: r.ok ? '✓ ' : '✗ ' }),
            el('span', { class: 'review-label', text: r.label }),
            el('div', { class: 'review-detail', text: r.detail }),
          ]),
        ),
      ),
    ]);
    // Auto-open the breakdown when there are wrong answers, so it stands out.
    if (wrong > 0) details.open = true;
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

    else if (mg.type === 'terminal') {
      wrap.appendChild(terminalGame(ev, cfg));
    }

    return wrap;
  }

  // ---- Terminal mini-game (adaptive Linux investigation) ----
  function terminalGame(ev, cfg) {
    const host = el('div', { class: 'terminal-host' });

    // Phase 1: comfort-level selection.
    function levelSelect() {
      host.textContent = '';
      host.appendChild(el('p', { class: 'prompt-text', text: cfg.scenario }));
      host.appendChild(el('p', { class: 'mg-sublabel', text: 'How comfortable are you with Linux?' }));
      host.appendChild(el('div', { class: 'term-levels' }, [
        levelCard('guided', '🟢 New to Linux', 'I\u2019ll show you each command and explain it. You still type it.'),
        levelCard('comfortable', '🟡 Comfortable', 'You get a command palette and a "reveal" option if stuck.'),
        levelCard('expert', '🔴 Expert', 'Just the task and a bare prompt. No hints.'),
      ]));
      host.appendChild(el('p', { class: 'meta', text: 'You can reach a perfect score at any level — the level only changes how much help you get.' }));
    }
    function levelCard(level, title, desc) {
      return el('button', { class: 'card term-level', onClick: () => runGame(level) }, [
        el('h3', { text: title }),
        el('p', { text: desc }),
      ]);
    }

    // Phase 2: the terminal loop.
    function runGame(level) {
      const steps = cfg.steps;
      let idx = 0;
      const typed = {};        // stepId -> command string (submitted)
      const reveals = [];      // stepIds where the player revealed the answer
      const solvedLocal = {};  // stepId -> bool (client-side echo; server re-grades)

      host.textContent = '';
      const banner = el('div', { class: 'term-banner', text:
        'LEVEL: ' + ({ guided: 'NEW TO LINUX (guided)', comfortable: 'COMFORTABLE', expert: 'EXPERT' }[level]) });
      const screen = el('div', { class: 'term-screen' });
      const taskBox = el('div', { class: 'term-task' });
      const helpBox = el('div', { class: 'term-help' });
      const inputRow = el('div', { class: 'term-input-row' });
      const input = el('input', { class: 'term-input', type: 'text', autocomplete: 'off',
        spellcheck: 'false', placeholder: 'type a command and press Enter' });
      const promptSpan = el('span', { class: 'term-prompt', text: cfg.prompt + ' ' });

      function print(line, cls) {
        screen.appendChild(el('div', { class: 'term-line' + (cls ? ' ' + cls : '') }, [line]));
        screen.scrollTop = screen.scrollHeight;
      }
      function printMulti(text, cls) {
        String(text).split('\\n').forEach((l) => print(l, cls));
      }

      function loadStep() {
        if (idx >= steps.length) return finish();
        const s = steps[idx];
        taskBox.textContent = '';
        taskBox.appendChild(el('span', { class: 'term-step-num', text: 'STEP ' + (idx + 1) + '/' + steps.length + ' — ' }));
        taskBox.appendChild(document.createTextNode(s.task));
        helpBox.textContent = '';
        if (level === 'guided') {
          helpBox.appendChild(el('div', { class: 'term-guide' }, [
            el('div', {}, [el('span', { class: 'term-cmd-hint', text: s.canonical })]),
            el('div', { class: 'term-explain', text: s.explain }),
          ]));
        } else if (level === 'comfortable') {
          const pal = el('div', { class: 'term-palette' },
            (s.palette || []).map((c) =>
              el('button', { class: 'term-pal-btn', onClick: () => { input.value = c; input.focus(); } }, [c]),
            ),
          );
          const reveal = el('button', { class: 'term-reveal', onClick: () => {
            if (reveals.indexOf(s.id) < 0) reveals.push(s.id);
            input.value = s.canonical;
            input.focus();
            print('(revealed: ' + s.canonical + ')', 'term-dim');
          }, text: 'reveal answer' });
          helpBox.appendChild(el('div', { class: 'term-help-row' }, [
            el('span', { class: 'mg-label', text: 'commands: ' }), pal,
          ]));
          helpBox.appendChild(reveal);
        }
        // expert: no help shown.
        input.value = '';
        input.focus();
      }

      function matchesStep(s, raw) {
        // Light client-side check just for the live echo/feedback.
        const norm = (raw || '').replace(/[\u2018\u2019\u201C\u201D]/g, "'").replace(/"/g, "'")
          .toLowerCase().replace(/\s+/g, ' ').replace(/\s*;\s*$/, '').trim();
        // We don't have the answer key on the client, so accept the canonical
        // (and a couple of obvious equivalents) for the echo; the SERVER is the
        // real grader on submit.
        const canon = s.canonical.replace(/"/g, "'").toLowerCase().replace(/\s+/g, ' ').trim();
        return norm === canon || norm.indexOf(canon.split(' ')[0]) === 0 && norm.length >= canon.split(' ')[0].length
          ? norm === canon
          : false;
      }

      function submitLine() {
        const s = steps[idx];
        const raw = input.value.trim();
        if (!raw) return;
        print(cfg.prompt + ' ' + raw);
        typed[s.id] = raw;
        const ok = matchesStep(s, raw);
        if (ok) {
          printMulti(s.output, 'term-out');
          solvedLocal[s.id] = true;
          print('✓ nice — that\u2019s the right tool for this step.', 'term-ok');
          idx += 1;
          setTimeout(loadStep, 150);
        } else {
          // Let them try again; expert/comfortable get a nudge to retry or (comfortable) reveal.
          print('Hmm, that didn\u2019t surface what you need. Try another command'
            + (level === 'expert' ? '.' : (level === 'comfortable' ? ' (or use the palette / reveal).' : ' — check the suggested command above.')), 'term-dim');
          // Still record their last attempt in `typed`; they can retry.
        }
      }

      function finish() {
        print('— investigation complete —', 'term-ok');
        input.disabled = true;
      }

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); submitLine(); }
      });

      banner && host.appendChild(banner);
      host.appendChild(taskBox);
      host.appendChild(screen);
      inputRow.appendChild(promptSpan);
      inputRow.appendChild(input);
      host.appendChild(inputRow);
      host.appendChild(helpBox);
      // Submit/Skip. Submit sends the whole result; the server grades it.
      host.appendChild(miniGameButtons(ev, () => ({
        level: level,
        steps: typed,
        reveals: reveals.slice(),
      })));

      print(cfg.scenario, 'term-dim');
      loadStep();
    }

    levelSelect();
    return host;
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
        reviewBlock(o),
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
