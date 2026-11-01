# HANDOFF — Continue CYBER TRAIL in a new session

> Read this first. It records exactly where the project stopped, why, what's
> done, and what to do next. The previous session scaffolded the project but
> **could not run `npm install`** because that sandbox had no internet
> (`INTEGRATIONS_ONLY` network mode). Network mode is fixed per session, so the
> work was handed off to a fresh, internet-enabled session — this one.

## What this project is

**CYBER TRAIL: Critical Infrastructure** — a cyberpunk-90s-arcade, Oregon-Trail-
style web game that teaches cybersecurity for critical infrastructure. The player
chooses a **facility** and a **role**, then survives a journey of simulated cyber-
attack scenarios. Each event teaches a real attack type, a real-world example,
and preventive measures.

- **Facilities:** Water Treatment Plant, Power Grid (data-driven; easy to add more)
- **Roles:** Entry-Level Employee · Cyber Operator · Supervisor (same scenarios,
  different perspectives — the core teaching device)
- **Resources:** Integrity, Uptime, Budget, Morale (0–100; lose at Integrity or
  Uptime = 0; win by completing all stages)

## Secure by design (a hard requirement from the user)

Security is built in from the first commit so the game can withstand higher-level
penetration testing. See `SECURITY.md` and `docs/THREAT_MODEL.md`.

- **Thin, untrusted client.** Browser renders and sends intents only; holds no secrets.
- **Server owns the trust boundary.** All game state, resource math, scoring, and
  win/lose outcomes are computed server-side. A tampered client cannot cheat.
- Controls already implemented on the server: `helmet` (strict CSP + headers),
  CORS allow-list, per-IP rate limiting, bounded JSON bodies, Zod "reject-by-
  default" validation on every input, generic error responses (no stack leaks),
  env-only config, session TTL reaping.
- All in-game "attacks" are **narrative simulations** — no functional exploits
  or malware anywhere in the repo.

## Tech stack

| Area       | Choice                                 |
|------------|----------------------------------------|
| Frontend   | React + Vite + TypeScript + Tailwind   |
| Backend    | Node + Express + TypeScript            |
| Validation | Zod (shared schemas, client + server)  |
| Layout     | npm workspaces: `shared/`, `server/`, `client/` |

## Status

### DONE (written to disk, NOT yet installed/built/run)
- Root `package.json` (npm workspaces), `.gitignore` (secrets protected), `README.md`
- `SECURITY.md`, `docs/THREAT_MODEL.md`, `docs/GAME_DESIGN.md`
- `shared/` — Zod schemas + types: `domain.ts`, `content.ts`, `api.ts`, `index.ts`
- `server/` — full hardened API:
  - `src/app.ts` (helmet, CORS allow-list, rate limit, body limit)
  - `src/index.ts` (bootstrap + graceful shutdown)
  - `src/config.ts` (env validation via Zod)
  - `src/game/engine.ts` (server-authoritative state, scoring, win/lose, TTL reaping)
  - `src/content/facilities.ts`, `roles.ts`, `events.ts` (9 educational scenarios)
  - `src/middleware/validate.ts`, `errorHandler.ts`
  - `src/routes/game.ts` (start / get / choose), `content.ts` (facilities / roles)
  - `.env.example`

### BLOCKED in the previous session
- `npm install` failed — no internet (proxy 403 on all registries/hosts).
- Nothing has been compiled, run, or verified yet. Expect to shake out TS errors.

### TODO (do these in order in the new, internet-enabled session)
1. `npm install` at the repo root (`/projects/sandbox`). Should now succeed.
2. Build/typecheck the `shared` package first (server imports `@cyber-trail/shared`):
   `npm run build --workspace=shared`.
3. Typecheck + run the server: `npm run dev --workspace=server`. Fix any TS errors.
4. Verify the API end-to-end (examples below).
5. **Build the `client/` workspace — it does NOT exist yet.** This is the biggest
   remaining task. Requirements:
   - React + Vite + TS + Tailwind, cyberpunk-90s-arcade aesthetic (neon cyan/
     magenta/acid-green on near-black, CRT scanlines, glitch/flicker, monospace/
     pixel type, glowing grid, arcade HUD). See `docs/GAME_DESIGN.md` aesthetic section.
   - Screens: Title → Choose Facility → Choose Role → Journey loop (event + choices
     + resource HUD) → Debrief (attack explainer + real-world example + preventive
     measures) → Win/Lose + score.
   - Call the server API; use the shared Zod types. Set a strict client CSP too.
   - Add a Vite dev proxy or configure `CORS_ORIGINS` so the client origin
     (`http://localhost:5173`) is allowed.
6. Test the complete game loop end-to-end in the browser.
7. Run `npm audit` and address high/critical findings.
8. Push to GitHub and open a PR (via `gh api ... repos/{owner}/{repo}/pulls`) so
   the user can review. Reference the PR/branch URL back to the user.

## API quick reference (for verification)

```bash
# Health
curl -s localhost:4000/api/health

# Content for selection screens
curl -s localhost:4000/api/content/facilities
curl -s localhost:4000/api/content/roles

# Start a run (returns sessionId + first event)
curl -s -X POST localhost:4000/api/game/start \
  -H 'content-type: application/json' \
  -d '{"facilityId":"water","roleId":"operator"}'

# Resolve a choice (use ids from the start/current event)
curl -s -X POST localhost:4000/api/game/<sessionId>/choose \
  -H 'content-type: application/json' \
  -d '{"eventId":"<eventId>","choiceId":"<choiceId>"}'
```

## Notes / gotchas
- `shared` is ESM with `.js` import specifiers in TS source (NodeNext-style). Build
  `shared` before the server, or configure TS project references if preferred.
- Dependency versions in the `package.json` files were pinned from memory; if any
  version is unavailable or has advisories, bump to the nearest safe version and
  keep the lockfile.
- Keep the trust boundary intact: never move scoring or resource math into the
  client. The client should only render server-provided `GameView`s.
