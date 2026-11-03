# HANDOFF — Continue CYBER TRAIL in a new session

> Read this first. It captures the **current** state so a fresh session (or a
> future you) can pick up instantly. Everything described here is already built,
> working, committed, and pushed.

## What this project is

**CYBER TRAIL** — a cyberpunk-90s-arcade, Oregon-Trail-style web game that teaches
cybersecurity for critical infrastructure. The player chooses a **facility** and a
**role**, then survives a journey of simulated cyber-attack scenarios. Each event
teaches a real attack type, a real-world example, and preventive measures. Built
in collaboration with the **Marshall University Institute for Cyber Security**
(their logos/marks are used with permission — see README "Collaboration &
trademarks").

- **5 facilities:** Water Treatment, Power Grid, Hospital, Natural Gas Pipeline,
  Government (the Government facility is themed exclusively on social engineering
  & AI exploitation).
- **3 roles:** Entry-Level Employee · Cyber Operator · Supervisor (same scenarios
  seen from different perspectives — the core teaching device).
- **55 scenarios across 48 attack/threat types.** Every scenario has 3+ choices:
  an obvious-wrong option, a plausible **"trap"** (reasonable-sounding but flawed,
  mild penalty + teaching outcome), and the recommended answer. Labels are neutral
  so the right answer isn't telegraphed.
- **Resources:** Integrity, Uptime, Budget, Morale.

## IMPORTANT: which codebase is live

There are **two** codebases in the repo. **`app/` is the real, running game.**

- **`app/`** — a **zero-dependency** build (Node stdlib `http` server + vanilla
  browser JS/CSS). This is what actually runs and is fully featured. **Work here.**
- **`shared/` + `server/`** — an earlier React/Express/TypeScript/Zod scaffold
  from the first session. It was never finished/built and needs `npm install`.
  Treat it as legacy/reference; the `app/` build superseded it. (We went
  zero-dependency because the original sandbox had no internet for `npm install`.)

## How to run & test (`app/`)

```bash
cd /projects/sandbox/app
node server.js            # serves http://localhost:4000  (Node stdlib only, no install)
node smoketest.js         # end-to-end + anti-cheat checks (run while server is up)
node build-standalone.js  # regenerates ../cyber-trail-standalone.html (offline single file)
```

Sandbox gotcha: a background server does NOT persist across separate `execute_bash`
calls, and localhost may not be reachable from a browser. To test the loop, start
the server and run the checks **in the same command**, e.g.:
`node server.js > /tmp/s.log 2>&1 & SRV=$!; sleep 1.2; node smoketest.js; kill $SRV`.

## `app/` file map

| File | Purpose |
|------|---------|
| `server.js` | Node stdlib HTTP server: routing, static files, security headers/CSP, rate limit, bounded bodies, generic errors. Optional HTTPS via `TLS_KEY_FILE`/`TLS_CERT_FILE`. |
| `engine.js` | **Server-authoritative** game engine: state, scoring, win/lose, difficulty, mini-game grading dispatch. |
| `content.js` | All facilities, roles, and the 55 scenarios (prompts, choices, effects, learning payloads). |
| `minigames.js` | 13 mini-games: definitions + **server-side grader** (returns band + per-item review) + `EVENT_MINIGAMES` mapping events→mini-games. |
| `glossary.js` | Acronym glossary + per-event term detection ("Beyond the acronym"). |
| `validate.js` | Hand-rolled "reject by default" input validation. |
| `public/app.js` | The vanilla-JS client (all screens + mini-game renderers). |
| `public/styles.css` | Cyberpunk theme (green-forward palette, CRT/scanlines). |
| `public/matrix.js` | Slow (90s top-to-bottom) dense binary/hex "digital rain" background. |
| `public/index.html` | Page shell (canvas, CRT overlays, app mount, footer). |
| `public/cyber-bison.png`, `mascot.png`, `marshall-m.png` | Marshall logos (used with permission). |
| `smoketest.js` | End-to-end + security/anti-cheat test. |
| `build-standalone.js` | Builds the offline single-file `cyber-trail-standalone.html` (inlines CSS/JS, base64 images). |

> The standalone at repo root (`cyber-trail-standalone.html`) is a **generated
> artifact** (git-ignored). Rebuild it with `node app/build-standalone.js` after
> any `app/` change; it embeds the real grader so its behavior matches the server.

## Features implemented (all working)

- **Game loop:** Title → Choose Facility → Choose Role → **Import mission terminal**
  → Journey (events: multiple-choice OR mini-game) → Debrief → Win/Lose + score.
- **Mini-games (Model C, hybrid — 13 across ~15 events):** spot-the-phish (x3),
  spot-the-deepfake, sort/triage (x2), pick-practices (x2), order-response (x2),
  the **adaptive Linux terminal** (comfort levels: guided/comfortable/expert —
  perfect reachable at any level; help differs, not the ceiling), trace-the-
  intrusion (kill chain), segment-the-network (IT/DMZ/OT). Graded into
  perfect/good/fail → resource deltas; **skippable** = full-loss fail.
- **Mini-game review:** debrief shows an expandable, attention-styled "Review your
  answers (N wrong)" with per-item right/wrong detail (auto-opens when wrong).
- **Import/mission terminal** (desktop only; **skipped on mobile** via
  touch+narrow detection): type `import <facility> --<role>`, THEN (for gated
  roles) an access code. **Flavor only, not scored.** Gates:
  - Operator → `linux` (case-insensitive); hint rotates among 3 Linux fun-facts.
  - Supervisor → `Marco` (case-sensitive); hint = "the Mascot's name, capitalized"
    — intentionally an **OSINT exercise** (Marco = Marshall's mascot; the name is
    NOT written anywhere in-game; the mascot image is shown as the clue).
  - Employee → no gate.
- **"Beyond the acronym"** collapsible glossary on events/debriefs.
- **Difficulty** (deliberately hard; in `engine.js` `DIFFICULTY` block):
  lose if Integrity or Uptime ≤ **25** (not 0); per-stage drain
  (integrity/uptime −3, budget/morale −2); reduced start (integrity −10,
  uptime −5, budget/morale −10). Perfect play wins all 15 combos; a mistake
  every ~3rd stage or skipping mini-games reliably loses.
- **Aesthetic:** green/blue/purple/white/grey palette (no pink), CRT + scanlines,
  slow dense binary/hex matrix rain, mobile-responsive, text centered globally
  (terminal/choices/cards/lists stay left-aligned for readability), transparent
  CYBER-bison hero logo, title `<h1>` is just "TRAIL" (CYBER is in the PNG).

## Secure by design (a hard requirement from the user)

- **Server owns the trust boundary.** All state, resource math, scoring, win/lose,
  and **mini-game grading** happen server-side. The client sends only intents and
  raw mini-game results; **answer keys never reach the client**. A tampered client
  cannot change its score or band. See `SECURITY.md` + `docs/THREAT_MODEL.md`.
- Controls in `app/server.js`: strict security headers + CSP, per-IP rate limiting,
  bounded JSON bodies, reject-by-default validation, generic errors, path-traversal
  guard on static files, HSTS in production, optional end-to-end TLS.
- All "attacks" are narrative simulations — no exploits/malware in the repo.
- Caveat (documented): the flavor passwords (`linux`/`Marco`) live in client code
  by necessity — they are NOT a security control, just themed gating.

## API quick reference

```bash
curl -s localhost:4000/api/health
curl -s localhost:4000/api/content/facilities
curl -s localhost:4000/api/content/roles
# start a run -> returns sessionId + first event (may carry a .minigame)
curl -s -X POST localhost:4000/api/game/start -H 'content-type: application/json' \
  -d '{"facilityId":"power","roleId":"operator"}'
# resolve a multiple-choice event
curl -s -X POST localhost:4000/api/game/<sessionId>/choose -H 'content-type: application/json' \
  -d '{"eventId":"<id>","choiceId":"<id>"}'
# submit a mini-game result (server grades it)
curl -s -X POST localhost:4000/api/game/<sessionId>/minigame -H 'content-type: application/json' \
  -d '{"eventId":"<id>","minigameId":"<id>","result":{...}}'   # or {"skipped":true}
```

## GitHub

- Repo: **https://github.com/calliemcferrin/cyber-trail** (branch `main`).
- `gh` + `git` are preconfigured via the Kiro gateway (push works). Create PRs with
  `gh api repos/{owner}/{repo}/pulls` — NOT `gh pr create`.
- Workflow so far: commit + push directly to `main` after each change, then rebuild
  the standalone.

## Reference docs

- `docs/CONTENT_MAP.md` — every facility/role/scenario with IDs + choice IDs
  (use this to request precise wording/content edits).
- `docs/ATTACK_CATALOG.md` — all 48 attack types, grouped, with MITRE refs.
- `docs/GAME_DESIGN.md` — design intent & aesthetic.
- `SECURITY.md`, `docs/THREAT_MODEL.md` — security model & pen-test scope.

## Conventions / gotchas for the next session

- **Make changes in `app/`.** After editing, **run `node app/build-standalone.js`**
  so the offline file stays in sync; it embeds the real grader (keep them matching).
- Every scenario must keep **3+ choices with exactly one recommended** (two
  scenarios intentionally have two recommended). Mini-game events map via
  `EVENT_MINIGAMES` in `minigames.js`.
- Keep the **trust boundary**: never move scoring/grading/answer-keys to the client.
- The client `render()` must skip `null` nodes (a past bug: `appendChild(null)`
  threw and blanked the import screen for operator/employee — already fixed).
- Verify after changes: `node smoketest.js` (perfect play should win) and, ideally,
  a quick all-15-combos perfect-play loop (see git history for the snippet).
