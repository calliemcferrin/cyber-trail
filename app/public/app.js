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
    (Array.isArray(nodes) ? nodes : [nodes]).forEach((n) => { if (n != null) app.appendChild(n); });
    window.scrollTo(0, 0);
  }

  async function api(path, options) {
    // Transport seam: the normal app talks to the server over fetch. The
    // offline standalone build installs `window.__CYBER_TRAIL_LOCAL__` — a
    // local, in-browser handler that mirrors the server API — so the SAME UI
    // code runs with no server. The server app never sets this global, so its
    // behavior here is unchanged.
    const local = typeof window !== 'undefined' && window.__CYBER_TRAIL_LOCAL__;
    if (typeof local === 'function') {
      const method = (options && options.method) || 'GET';
      let body = null;
      if (options && options.body) {
        try { body = JSON.parse(options.body); } catch { body = null; }
      }
      const out = local(method, path, body); // { status, json }
      if (!out || out.status >= 400) {
        throw new Error((out && out.json && out.json.error) || 'Request failed.');
      }
      return out.json;
    }
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
  // `taughtTerms` tracks which acronyms have already been explained INLINE this
  // playthrough. An acronym is highlighted with a popover the first stage it
  // appears in; after that it falls back to the bottom "Beyond the acronym"
  // panel only. Reset on each new run. Purely a client-side teaching aid — no
  // bearing on scoring or the server trust boundary.
  const state = {
    facilities: [], roles: [], facilityId: null, roleId: null, game: null,
    taughtTerms: Object.create(null),
  };

  // ------------------------- screens -------------------------
  function titleScreen() {
    render([
      el('div', { class: 'center' }, [
        el('p', { class: 'eyebrow', text: '// INSERT COIN — CRITICAL INFRASTRUCTURE DIVISION' }),
        el('img', { class: 'hero-logo', src: 'cyber-bison.png', alt: 'Marshall Cyber Bison' }),
        el('h1', { class: 'title', text: 'TRAIL' }),
        el('p', { class: 'subtitle', text: 'Survive the journey. Defend the grid. Learn the threats.' }),
        el('p', { class: 'collab', text: 'In collaboration with the Marshall University Institute for Cyber Security.' }),
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
    // straight into the mission. On desktop, show the explainer then the
    // themed import terminal.
    if (isMobile()) {
      startJourney();
    } else {
      importIntroScreen();
    }
  }

  // Plain-language explainer shown BEFORE the import terminal, so players know
  // exactly how to use the terminal that follows. Desktop-only (mobile skips
  // the terminal entirely).
  function importIntroScreen() {
    const fac = state.facilityId;
    const role = state.roleId;
    const gate = accessGateFor(role);
    render([
      el('p', { class: 'eyebrow', text: '// MISSION LOADER — BRIEFING' }),
      el('h2', { class: 'subtitle', text: 'How to import your mission data' }),
      el('div', { class: 'panel' }, [
        el('p', { class: 'prompt-text', text:
          'The next screen is a terminal — a text prompt where you load your ' +
          'game data by typing a command. It works like a real command line: ' +
          'type the command, then press Enter.' }),
        el('p', { class: 'intro-step', text: '1. Build the import command in this order:' }),
        el('div', { class: 'intro-cmd' }, [
          el('code', { text: 'import <facility> --<role>' }),
        ]),
        el('p', { class: 'meta', text:
          'The command is always: the word "import", then your facility, then ' +
          '"--" immediately followed by your role. The <> are placeholders — the ' +
          'terminal shows your actual facility and role; read them off the screen ' +
          'and fill them in yourself (don\u2019t type the angle brackets).' }),
        gate
          ? el('p', { class: 'intro-step', text:
              '2. Then you\u2019ll be asked for an access code (a themed puzzle — a ' +
              'hint is shown on the terminal). Work it out and type it, then Enter.' })
          : null,
        el('p', { class: 'intro-note', text:
          'Handy commands in the terminal: type "clear" to wipe the screen and ' +
          'reprint the instructions, and you can drag the bottom edge of the ' +
          'terminal to resize it so the instructions stay in view.' }),
      ]),
      el('div', { class: 'btn-row' }, [
        el('button', { class: 'btn secondary', onClick: roleScreen, text: '◀ Back' }),
        el('button', { class: 'btn', onClick: importScreen, text: '▶ Open the terminal' }),
      ]),
    ]);
  }

  async function startJourney() {
    try {
      state.taughtTerms = Object.create(null); // fresh inline-teaching for a new run
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
  // Role-specific access passwords (flavor only — do NOT affect scoring).
  // Hints are baked into the terminal so players can solve them.
  var LINUX_HINTS = [
    "This operating system's kernel, first released in 1991 by Linus Torvalds, shares its creator's first name. What is it?",
    'Its mascot is a penguin named Tux. Name this open-source OS.',
    'Android is built on top of this open-source OS kernel. Name it.',
  ];
  function accessGateFor(role) {
    if (role === 'operator') {
      return {
        password: 'linux',
        caseSensitive: false,
        hints: LINUX_HINTS.map(function (h) {
          return 'access code hint: ' + h + ' (answer is all lowercase)';
        }),
      };
    }
    if (role === 'supervisor') {
      return {
        password: 'Marco',
        caseSensitive: true,
        hints: ['access code hint: the password is the Mascot\u2019s name, capitalized.'],
      };
    }
    return null; // employee: no gate
  }

  function importScreen() {
    const fac = state.facilityId;
    const role = state.roleId;
    const expected = ('import ' + fac + ' --' + role).toLowerCase();
    const gate = accessGateFor(role);

    // Pinned instructions header — always visible, never scrolls away, and is
    // reprinted by `clear`. This is the "don't keep scrolling to find the
    // original data" fix.
    const pinned = el('div', { class: 'term-pinned' }, [
      el('div', { class: 'term-pinned-title', text: 'cyber-trail // mission loader' }),
      el('div', { class: 'term-pinned-line', text: 'usage: import <facility> --<role>   (<> are placeholders — don\u2019t type the brackets)' }),
      el('div', { class: 'term-pinned-line term-dim', text: 'order: import · then your facility · then --your role (use the values shown below)' }),
      el('div', { class: 'term-pinned-line term-dim', text: 'type "clear" to reset the screen · drag the bottom edge to resize' }),
    ]);

    const screen = el('div', { class: 'term-screen term-import-screen' });
    const input = el('input', { class: 'term-input', autocomplete: 'off',
      spellcheck: 'false', placeholder: 'type here and press Enter' });
    const promptSpan = el('span', { class: 'term-prompt', text: 'operator@cyber-trail:~$ ' });
    // Drag handle to resize the scrolling output area.
    const resizeHandle = el('div', { class: 'term-resize', title: 'drag to resize' });

    // phase: always start with 'import'; gated roles move to 'auth' afterward.
    let phase = 'import';

    function print(line, cls) {
      screen.appendChild(el('div', { class: 'term-line' + (cls ? ' ' + cls : '') }, [line]));
      screen.scrollTop = screen.scrollHeight;
    }

    function clearScreen() {
      screen.textContent = '';
    }

    function setMasked(masked) {
      input.type = masked ? 'password' : 'text';
      input.value = '';
      input.placeholder = masked ? 'enter access code and press Enter' : 'type the import command and press Enter';
    }

    // Flow: ALWAYS import first; if the role has an access gate, prompt for the
    // access code AFTER a successful import, then load + launch.
    function boot() {
      // Usage now lives in the always-visible pinned header above; keep the
      // scrollback light so the prompt starts clean.
      print('ready. target facility: ' + fac + ' · role: ' + role, 'term-dim');
      print('type the import command below and press Enter.', 'term-dim');
      print('—', 'term-dim');
      promptSpan.textContent = 'operator@cyber-trail:~$ ';
      setMasked(false);
    }

    function beginAuth() {
      print('restricted: ' + role + ' access requires an access code.', 'term-dim');
      var hint = gate.hints[(Math.random() * gate.hints.length) | 0];
      print(hint, 'term-dim');
      print('—', 'term-dim');
      promptSpan.textContent = 'auth@cyber-trail:~$ ';
      phase = 'auth';
      setMasked(true);
      input.focus();
    }

    function launch() {
      input.disabled = true;
      print('fetching ' + fac + ' profile …', 'term-out');
      setTimeout(() => print('loading ' + role + ' toolkit …', 'term-out'), 350);
      setTimeout(() => print('integrity check … OK', 'term-out'), 700);
      setTimeout(() => { print('mission loaded. launching …', 'term-ok'); }, 1000);
      setTimeout(() => startJourney(), 1500);
    }

    function normalize(s) {
      return (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
    }

    function checkPassword(raw) {
      if (gate.caseSensitive) return raw === gate.password;
      return raw.toLowerCase() === gate.password.toLowerCase();
    }

    function run() {
      const raw = input.value.trim();
      if (!raw) return;

      // `clear` / `cls`: wipe the scrollback and reprint the right prompt for
      // the current phase. The pinned instructions above never go away.
      if (/^(clear|cls)$/i.test(raw)) {
        clearScreen();
        if (phase === 'auth') {
          print('restricted: ' + role + ' access requires an access code.', 'term-dim');
          var h = gate.hints[(Math.random() * gate.hints.length) | 0];
          print(h, 'term-dim');
          print('—', 'term-dim');
        } else {
          boot();
        }
        input.value = '';
        input.focus();
        return;
      }

      // Phase 2 (only for gated roles): access code, after a good import.
      if (phase === 'auth') {
        print(promptSpan.textContent + '••••••'); // never echo the code itself
        if (checkPassword(raw)) {
          print('access granted. welcome, ' + role + '.', 'term-ok');
          launch();
        } else {
          print('access denied — incorrect access code. try again.', 'term-dim');
          input.value = '';
          input.focus();
        }
        return;
      }

      // Phase 1: the import command.
      print(promptSpan.textContent + raw);
      const norm = normalize(raw);
      const ok =
        norm === expected ||
        norm === normalize('import --' + role + ' ' + fac) ||
        norm === normalize('import ' + fac + ' -' + role);
      if (!ok) {
        if (norm.indexOf('import') !== 0) {
          print("command not found: " + raw.split(' ')[0] +
            ' — start with "import", then your facility and --your role (see the values above).', 'term-dim');
        } else {
          print('import: that doesn\u2019t match — usage: import <facility> --<role>. ' +
            'Check the facility and role shown above and fill them in (no angle brackets).', 'term-dim');
        }
        input.value = '';
        input.focus();
        return;
      }
      // Import succeeded. If this role is gated, require the code now; else go.
      print('import OK — ' + fac + ' / ' + role + ' staged.', 'term-ok');
      if (gate) {
        beginAuth();
      } else {
        launch();
      }
    }

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); run(); }
    });

    render([
      el('p', { class: 'eyebrow', text: '// MISSION LOADER' }),
      el('h2', { class: 'subtitle', text: 'Import your mission data' }),
      // Supervisor access is gated by the mascot's name — show the mascot as a cue.
      role === 'supervisor'
        ? el('div', { class: 'mascot-cue' }, [
            el('img', { class: 'mascot-img', src: 'mascot.png', alt: 'Marshall mascot' }),
            el('p', { class: 'mascot-cap', text: 'Marshall\u2019s mascot stands guard here.' }),
          ])
        : null,
      el('div', { class: 'panel' }, [
        pinned,
        screen,
        resizeHandle,
        el('div', { class: 'term-input-row' }, [promptSpan, input]),
      ]),
      el('div', { class: 'btn-row' }, [
        el('button', { class: 'btn secondary', onClick: importIntroScreen, text: '◀ Back' }),
      ]),
    ]);
    enableResize(screen, resizeHandle);
    boot();
    input.focus();
  }

  // Drag-to-resize for a terminal output area. Dragging the handle adjusts the
  // scrolling region's height (bounded), so players can expand it to keep more
  // of the session (and the pinned instructions) in view without scrolling.
  function enableResize(screen, handle) {
    let startY = 0;
    let startH = 0;
    let dragging = false;
    function onMove(e) {
      if (!dragging) return;
      const y = (e.touches ? e.touches[0].clientY : e.clientY);
      const next = Math.max(120, Math.min(640, startH + (y - startY)));
      screen.style.height = next + 'px';
      e.preventDefault();
    }
    function onUp() {
      dragging = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
    }
    function onDown(e) {
      dragging = true;
      startY = (e.touches ? e.touches[0].clientY : e.clientY);
      startH = screen.getBoundingClientRect().height;
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      document.addEventListener('touchmove', onMove, { passive: false });
      document.addEventListener('touchend', onUp);
      e.preventDefault();
    }
    handle.addEventListener('mousedown', onDown);
    handle.addEventListener('touchstart', onDown, { passive: false });
  }

  // ------------------------- HUD -------------------------
  // What each meter means and what moves it — shown as an expandable explainer
  // on the side rail so players understand the consequences of their choices.
  var METER_INFO = {
    integrity: {
      label: 'Integrity',
      what: 'Your security posture — how clean and uncompromised your systems are.',
      up: 'Catching threats, correct responses, strong practices.',
      down: 'Missing attacks, risky choices, skipping challenges, and ongoing drain.',
    },
    uptime: {
      label: 'Uptime',
      what: 'How available your facility\u2019s services are to the people who depend on them.',
      up: 'Keeping systems running; fast, contained incident response.',
      down: 'Outages, heavy-handed responses that take systems offline, and drain.',
    },
    budget: {
      label: 'Budget',
      what: 'The money you have left to spend on defense and operations.',
      up: 'Efficient decisions and avoided incidents (incidents are expensive).',
      down: 'Costly responses, fines, cleanup, and steady operating cost each stage.',
    },
    morale: {
      label: 'Morale',
      what: 'The confidence and sharpness of your people — your human firewall.',
      up: 'Good calls that protect the team and build a security culture.',
      down: 'Breaches, blame, burnout, and the grind of each stage.',
    },
  };

  // A single meter. `delta` (optional) shows how much this value just changed.
  function meter(key, value, delta) {
    const info = METER_INFO[key];
    const cls = value > 50 ? 'good' : value > 25 ? 'warn' : 'bad';
    const valueRow = el('div', { class: 'label' }, [
      el('span', { text: info.label }),
      el('span', { class: 'meter-val' }, [
        delta ? el('span', {
          class: 'meter-delta ' + (delta > 0 ? 'up' : 'down'),
          text: (delta > 0 ? '+' : '') + delta + ' ',
        }) : null,
        el('span', { text: String(value) }),
      ]),
    ]);
    return el('div', { class: 'meter' }, [
      valueRow,
      el('div', { class: 'bar' }, [
        el('div', { class: 'fill ' + cls, style: 'width:' + value + '%' }),
      ]),
      el('details', { class: 'meter-info' }, [
        el('summary', { text: 'what moves this?' }),
        el('p', { class: 'mi-what', text: info.what }),
        el('p', { class: 'mi-line' }, [ el('span', { class: 'mi-up', text: '▲ raises: ' }), info.up ]),
        el('p', { class: 'mi-line' }, [ el('span', { class: 'mi-down', text: '▼ lowers: ' }), info.down ]),
      ]),
    ]);
  }

  // The resource rail. `deltas` (optional) is the per-meter change from the last
  // turn, shown only on the debrief so the player sees what their choice did.
  function hud(g, deltas) {
    deltas = deltas || {};
    return el('aside', { class: 'hud' }, [
      el('p', { class: 'hud-title', text: 'FACILITY STATUS' }),
      meter('integrity', g.resources.integrity, deltas.integrity),
      meter('uptime', g.resources.uptime, deltas.uptime),
      meter('budget', g.resources.budget, deltas.budget),
      meter('morale', g.resources.morale, deltas.morale),
    ]);
  }

  // Two-column journey/debrief layout: resource rail beside the main panel.
  // Collapses to stacked on narrow screens via CSS.
  function gameLayout(g, mainNodes, deltas) {
    return el('div', { class: 'game-layout' }, [
      hud(g, deltas),
      el('div', { class: 'game-main' }, Array.isArray(mainNodes) ? mainNodes : [mainNodes]),
    ]);
  }

  // ------------------------- inline acronym popovers -------------------------
  // Only one popover is open at a time. Clicking the term toggles it; clicking
  // elsewhere, pressing Esc, or opening another term closes it.
  let openPopover = null;
  function closePopover() {
    if (openPopover && openPopover.parentNode) openPopover.parentNode.removeChild(openPopover);
    openPopover = null;
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePopover(); });
  // Clicking anywhere outside the open chip/popover closes it. The chip and the
  // popover both stopPropagation on their own clicks, so this only fires for
  // "outside" clicks (bubble phase).
  document.addEventListener('click', () => closePopover());

  // Build an interactive acronym chip with an on-demand definition popover.
  function acronymChip(entry) {
    const chip = el('button', {
      class: 'acro' + (entry.useCase ? ' acro-deep' : ''),
      type: 'button',
      'aria-label': entry.term + ' — show definition',
      title: 'what is ' + entry.term + '?',
    }, [entry.term]);
    chip.addEventListener('click', (e) => {
      e.stopPropagation(); // don't let the document handler treat this as "outside"
      const wasThis = openPopover && openPopover.__term === entry.term;
      closePopover();
      if (wasThis) return; // toggle off
      const pop = el('span', { class: 'acro-pop' }, [
        el('span', { class: 'acro-pop-term', text: entry.term }),
        el('span', { class: 'acro-pop-def', text: entry.definition }),
        entry.useCase ? el('span', { class: 'acro-pop-use' }, [
          el('span', { class: 'acro-pop-use-label', text: 'In practice: ' }),
          entry.useCase,
        ]) : null,
      ]);
      pop.__term = entry.term;
      pop.addEventListener('click', (ev) => ev.stopPropagation()); // clicks inside stay open
      chip.appendChild(pop);
      openPopover = pop;
    });
    return chip;
  }

  // Render a text string into an array of text nodes + acronym chips. Only the
  // acronyms in `entries` (this event's detected terms) that have NOT yet been
  // taught inline this run are turned into chips; each is marked taught after
  // its FIRST occurrence so repeats in the same text aren't all chips. Terms
  // already taught on a previous stage are left as plain text (they live in the
  // bottom glossary instead).
  function withAcronyms(text, entries) {
    if (!text || !entries || !entries.length) return [text];
    // Candidates = detected terms not yet taught this run, longest-first so a
    // term like "SCADA" is matched before a shorter overlapping token.
    const byTerm = {};
    entries.forEach((e) => { byTerm[e.term] = e; });
    const candidates = entries
      .map((e) => e.term)
      .filter((t) => !state.taughtTerms[t])
      .sort((a, b) => b.length - a.length);
    if (!candidates.length) return [text];
    const esc = candidates.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    // Word-boundary-ish match with optional trailing plural s (acronyms are
    // uppercase tokens): capture the surrounding non-alphanumerics.
    const re = new RegExp('(^|[^A-Za-z0-9])(' + esc.join('|') + ')(s?)(?=[^A-Za-z0-9]|$)', 'g');
    const nodes = [];
    let last = 0;
    let m;
    while ((m = re.exec(text))) {
      const term = m[2];
      // Only chip the FIRST occurrence of each term; mark it taught.
      if (state.taughtTerms[term]) continue;
      const start = m.index + m[1].length;
      if (start > last) nodes.push(text.slice(last, start));
      nodes.push(acronymChip(byTerm[term]));
      if (m[3]) nodes.push(m[3]); // preserve a trailing plural "s" as text
      state.taughtTerms[term] = true;
      last = start + term.length + (m[3] ? m[3].length : 0);
    }
    if (last < text.length) nodes.push(text.slice(last));
    return nodes.length ? nodes : [text];
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
          nodes.push(el('dd', {}, [
            t.definition,
            // Show the deeper "In practice" note for the enriched OT/networking
            // terms here too, so the bottom panel mirrors the inline popover.
            t.useCase ? el('span', { class: 'glossary-use' }, [
              el('span', { class: 'glossary-use-label', text: 'In practice: ' }),
              t.useCase,
            ]) : null,
          ]));
          return nodes;
        }, []),
      ),
    ]);
    return details;
  }

  // ------------------------- meter-change explanation -------------------------
  const METER_NAME = { integrity: 'Integrity', uptime: 'Uptime', budget: 'Budget', morale: 'Morale' };

  // Format an effects array (or a deltas object) into "+8 Integrity, −4 Morale".
  // Returns '' when there is no net change.
  function fmtEffects(effects) {
    // Accept either [{key,amount}] or {integrity:n,...}
    let pairs;
    if (Array.isArray(effects)) {
      pairs = effects.map((e) => [e.key, e.amount]);
    } else {
      pairs = Object.keys(effects || {}).map((k) => [k, effects[k]]);
    }
    const parts = pairs
      .filter(([, amt]) => amt)
      .map(([key, amt]) => (amt > 0 ? '+' : '\u2212') + Math.abs(amt) + ' ' + (METER_NAME[key] || key));
    return parts.join(', ');
  }

  // Explains WHERE the meter changes came from. For a mini-game: which band you
  // landed in and the better/worse bands you could have hit (so the player sees
  // exactly where negative points come from — dropping a band). For a plain
  // choice: the literal per-choice delta that just hit the meters.
  function meterExplain(o) {
    if (!o) return null;
    const BAND_LABEL = { perfect: '★ PERFECT', good: '✓ GOOD', fail: '✗ FAIL' };

    // Mini-game: band-based explanation.
    if (o.band && o.bandEffects) {
      const be = o.bandEffects;
      const rows = ['perfect', 'good', 'fail']
        .filter((b) => be[b])
        .map((b) => {
          const eff = fmtEffects(be[b]) || 'no change';
          const isYou = b === o.band;
          return el('li', { class: 'meter-why-row' + (isYou ? ' you' : '') }, [
            el('span', { class: 'meter-why-band', text: BAND_LABEL[b] || b }),
            el('span', { class: 'meter-why-eff', text: eff }),
            isYou ? el('span', { class: 'meter-why-tag', text: '  ← you' }) : null,
          ]);
        });
      const wrong = o.wrongCount || 0;
      const lead = o.skipped
        ? 'You skipped this challenge, so it was scored as FAIL — the full penalty below.'
        : wrong === 0
          ? 'A clean sweep landed you in the top band. Here\u2019s what each band awards:'
          : 'Your ' + wrong + ' wrong answer' + (wrong === 1 ? '' : 's') +
            ' pushed you down the bands. Each band awards a fixed set of meter ' +
            'changes — fewer mistakes = a higher band = better meters:';
      return el('div', { class: 'meter-why' }, [
        el('p', { class: 'meter-why-lead', text: 'Why your meters moved' }),
        el('p', { class: 'meter-why-sub', text: lead }),
        el('ul', { class: 'meter-why-list' }, rows),
        wrong > 0 ? el('p', { class: 'meter-why-note', text:
          'The negative points come from dropping a band — not from any single ' +
          'item. Getting those ' + wrong + ' right would move you up.' }) : null,
      ]);
    }

    // Plain choice: literal per-choice delta.
    if (o.deltas) {
      const s = fmtEffects(o.deltas);
      if (!s) return null;
      const good = o.isRecommended;
      return el('div', { class: 'meter-why' }, [
        el('p', { class: 'meter-why-lead', text: 'Why your meters moved' }),
        el('p', { class: 'meter-why-sub' }, [
          'This choice ' + (good ? 'earned' : 'cost') + ' you: ',
          el('span', { class: 'meter-why-eff ' + (good ? 'pos' : 'neg'), text: s }),
          good ? '.' : ' — a stronger decision would have protected those meters.',
        ]),
      ]);
    }
    return null;
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
      gameLayout(g, el('div', { class: 'panel' }, [
        el('p', { class: 'eyebrow', text: ev.minigame ? '// INTERACTIVE CHALLENGE' : '// INCOMING EVENT' }),
        el('h2', { class: 'subtitle', text: ev.title }),
        // Prompt with inline acronym popovers (first encounter this run). This
        // must render before glossaryBlock so the bottom panel knows which
        // terms were just taught inline.
        el('p', { class: 'prompt-text' }, withAcronyms(ev.prompt, ev.glossary)),
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
      ])),
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
    try {
      return miniGameBlockInner(ev);
    } catch (err) {
      // Surface a render failure on-screen instead of a blank panel, and give a
      // fallback so the run can continue.
      const box = el('div', { class: 'minigame' }, [
        el('p', { class: 'error', text: 'This challenge failed to load: ' + (err && err.message) }),
        el('div', { class: 'btn-row' }, [
          el('button', { class: 'btn secondary', onClick: () => submitMiniGame(ev, {}, true),
            text: 'Skip this challenge and continue' }),
        ]),
      ]);
      return box;
    }
  }

  function miniGameBlockInner(ev) {
    const mg = ev.minigame;
    const cfg = mg.config;
    const wrap = el('div', { class: 'minigame' });
    wrap.appendChild(el('p', { class: 'mg-instructions', text: cfg.instructions }));

    // local mutable selection state for this mini-game instance
    const state2 = { selected: {}, assignments: {}, order: null };

    if (mg.type === 'spot_the_phish') {
      // Optional "known-good" reference, so look-alike red flags are detectable
      // (you compare against what you already know is legitimate).
      if (cfg.knownGood) {
        wrap.appendChild(el('div', { class: 'mg-knowngood' }, [
          el('span', { class: 'mg-knowngood-mark', text: '✓ ' }),
          cfg.knownGood,
        ]));
      }
      wrap.appendChild(el('div', { class: 'mg-email' }, [
        el('div', { class: 'mg-email-head' }, [
          el('div', {}, [el('span', { class: 'mg-label', text: (cfg.fromLabel || 'From') + ': ' }), el('span', { class: 'mg-tok', 'data-id': 'from', text: cfg.from })]),
          el('div', {}, [el('span', { class: 'mg-label', text: (cfg.subjectLabel || 'Subject') + ': ' }), el('span', { class: 'mg-tok', 'data-id': 'subject', text: cfg.subject })]),
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
      const attempts = {};     // stepId -> [command, command, ...] (full history)
      const reveals = [];      // stepIds where the player revealed the answer
      let downgraded = false;  // expert → comfortable drop (caps score at 'good')
      steps.forEach((s) => { attempts[s.id] = []; });

      host.textContent = '';
      const banner = el('div', { class: 'term-banner', text:
        'LEVEL: ' + ({ guided: 'NEW TO LINUX (guided)', comfortable: 'COMFORTABLE', expert: 'EXPERT' }[level]) });
      const screen = el('div', { class: 'term-screen' });
      const taskBox = el('div', { class: 'term-task' });
      const helpBox = el('div', { class: 'term-help' });
      const inputRow = el('div', { class: 'term-input-row' });
      const input = el('input', { class: 'term-input', type: 'text', autocomplete: 'off',
        autocapitalize: 'none', autocorrect: 'off', spellcheck: 'false',
        placeholder: isMobile() ? 'tap a command above, or type here' : 'type a command and press Enter' });
      const promptSpan = el('span', { class: 'term-prompt', text: cfg.prompt + ' ' });

      function print(line, cls) {
        screen.appendChild(el('div', { class: 'term-line' + (cls ? ' ' + cls : '') }, [line]));
        screen.scrollTop = screen.scrollHeight;
      }
      function printMulti(text, cls) {
        String(text).split('\\n').forEach((l) => print(l, cls));
      }

      // The EFFECTIVE level drives how much help is shown. Starts at the chosen
      // level; an expert who drops difficulty becomes 'comfortable'.
      function effectiveLevel() {
        return (level === 'expert' && downgraded) ? 'comfortable' : level;
      }

      function loadStep() {
        if (idx >= steps.length) return finish();
        const s = steps[idx];
        taskBox.textContent = '';
        taskBox.appendChild(el('span', { class: 'term-step-num', text: 'STEP ' + (idx + 1) + '/' + steps.length + ' — ' }));
        taskBox.appendChild(document.createTextNode(s.task));
        renderHelp(s);
        input.value = '';
        input.focus();
      }

      // A palette of candidate commands rendered as large tap targets. Tapping
      // one RUNS it (no keyboard needed) — this is what makes the terminal
      // playable on a phone. `tapRuns` true = submit on tap; false = just fill
      // the input (desktop convenience). Grading is identical either way (the
      // server classifies whatever command is submitted).
      function commandPalette(s, tapRuns) {
        return el('div', { class: 'term-palette' + (tapRuns ? ' term-palette-tap' : '') },
          (s.palette || []).map((c) =>
            el('button', {
              class: 'term-pal-btn',
              onClick: () => {
                if (tapRuns) { runCommand(c); }
                else { input.value = c; input.focus(); }
              },
            }, [c]),
          ),
        );
      }

      function renderHelp(s) {
        const lvl = effectiveLevel();
        // On touch devices, tapping a command should RUN it (typing a full Linux
        // command on a soft keyboard is impractical). On desktop, the palette
        // fills the input so people can still type/edit, except in guided mode
        // where tapping-to-run is a nice accessibility convenience.
        const tapRuns = isMobile();
        helpBox.textContent = '';
        if (lvl === 'guided') {
          helpBox.appendChild(el('div', { class: 'term-guide' }, [
            el('div', {}, [el('span', { class: 'term-cmd-hint', text: s.canonical })]),
            el('div', { class: 'term-explain', text: s.explain }),
          ]));
          // Tap-to-run palette so a phone user can answer without typing.
          helpBox.appendChild(el('div', { class: 'term-help-row' }, [
            el('span', { class: 'mg-label', text: isMobile() ? 'tap to run: ' : 'or tap: ' }),
            commandPalette(s, tapRuns || true /* guided always tap-runs */),
          ]));
        } else if (lvl === 'comfortable') {
          const reveal = el('button', { class: 'term-reveal', onClick: () => {
            if (reveals.indexOf(s.id) < 0) reveals.push(s.id);
            if (isMobile()) {
              print('(revealed: ' + s.canonical + ')', 'term-dim');
              runCommand(s.canonical);
            } else {
              input.value = s.canonical;
              input.focus();
              print('(revealed: ' + s.canonical + ')', 'term-dim');
            }
          }, text: isMobile() ? 'reveal & run answer' : 'reveal answer' });
          helpBox.appendChild(el('div', { class: 'term-help-row' }, [
            el('span', { class: 'mg-label', text: tapRuns ? 'tap to run: ' : 'commands: ' }),
            commandPalette(s, tapRuns),
          ]));
          helpBox.appendChild(reveal);
          if (downgraded) {
            helpBox.appendChild(el('p', { class: 'term-downgraded', text:
              '⚠ Help mode on — your ceiling for this challenge is now GOOD (not perfect).' }));
          }
        } else {
          // expert: bare prompt on desktop. On a phone, typing isn't practical,
          // so expert still shows a tap-to-run palette (the challenge is that
          // it's unlabeled — no explanation, no reveal — unless you drop down).
          if (isMobile()) {
            helpBox.appendChild(el('div', { class: 'term-help-row' }, [
              el('span', { class: 'mg-label', text: 'tap to run: ' }),
              commandPalette(s, true),
            ]));
          }
          // offer the option to drop a difficulty for hints.
          const drop = el('button', { class: 'term-drop', onClick: () => {
            if (downgraded) return;
            downgraded = true;
            print('⚠ dropped to COMFORTABLE — hints enabled; max score is now GOOD.', 'term-dim');
            renderHelp(s);
            if (!isMobile()) input.focus();
          }, text: 'stuck? drop to Comfortable (hints on · caps score at GOOD)' });
          helpBox.appendChild(drop);
        }
      }

      // Ask the SERVER to classify the typed command (it holds the answer key).
      // Returns { kind, output?, hint? }. On any error, fall back to a neutral
      // "try again" so the game never blocks.
      async function classify(stepId, command) {
        try {
          return await api('/api/game/' + state.game.sessionId + '/terminal', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ eventId: ev.id, minigameId: ev.minigame.id, stepId, command }),
          });
        } catch (e) {
          return { kind: 'error' };
        }
      }

      // Run a command for the current step — shared by the Enter key (typed)
      // and by tapping a command button (mobile-friendly, no keyboard needed).
      async function runCommand(raw) {
        raw = (raw || '').trim();
        if (!raw) return;
        const s = steps[idx];
        print(cfg.prompt + ' ' + raw);
        attempts[s.id].push(raw);
        input.disabled = true;
        const verdict = await classify(s.id, raw);
        input.disabled = false;

        if (verdict.kind === 'accepted') {
          printMulti(verdict.output || s.output, 'term-out');
          print('✓ nice — that\u2019s the right tool for this step.', 'term-ok');
          idx += 1;
          setTimeout(loadStep, 150);
        } else if (verdict.kind === 'partial') {
          // Right tool, wrong form — targeted nudge, small recoverable cost.
          print('➤ ' + (verdict.hint || 'Right idea, but refine the command.'), 'term-warn');
        } else if (verdict.kind === 'rejected') {
          // Plausible but wrong for THIS task — specific teaching explanation.
          print('✗ ' + (verdict.hint || 'That command doesn\u2019t answer this step.'), 'term-warn');
        } else {
          const lvl = effectiveLevel();
          print('Hmm, that didn\u2019t surface what you need. Try another command'
            + (lvl === 'expert' ? '.' : (lvl === 'comfortable' ? ' (or tap a command / reveal).' : ' — check the suggested command above.')), 'term-dim');
        }
        input.value = '';
        input.focus();
      }

      // Enter-key handler: read the typed input and run it.
      function submitLine() { runCommand(input.value); }

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
      // Submit/Skip. Submit sends the full attempt history; the server grades it
      // (per-step credit, careless-attempt deductions, downgrade cap).
      host.appendChild(miniGameButtons(ev, () => ({
        level: level,
        attempts: attempts,
        reveals: reveals.slice(),
        downgraded: downgraded,
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
      gameLayout(g, el('div', { class: 'panel debrief' }, [
        el('span', { class: 'badge ' + (o.isRecommended ? 'ok' : 'no'),
          text: o.band
            ? (o.skipped ? '⤼ Skipped — ' : '') +
              ({ perfect: '★ PERFECT', good: '✓ GOOD', fail: '✗ FAILED' }[o.band] || o.band)
            : (o.isRecommended ? '✓ Strong security decision' : '✗ Risky decision') }),
        el('p', { class: 'prompt-text', text: o.outcome }),
        meterExplain(o),
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
      ]), o.deltas),
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
