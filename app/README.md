# CYBER TRAIL — runnable build (zero dependencies)

This is the **dependency-free** build of CYBER TRAIL that runs with nothing but
Node.js installed — no `npm install`, no registry access required. It was built
this way because the sandbox had no internet access to install React/Express/Vite.

It preserves the full design and the security-by-design principles:

- **Server-authoritative game state** — the browser is a dumb renderer; all
  resource math, scoring, and win/lose outcomes are computed server-side, so a
  tampered client cannot cheat. (This is the trust boundary to pen-test.)
- **Reject-by-default input validation** on every request (`validate.js`).
- **Strict security headers + CSP**, per-IP **rate limiting**, bounded request
  bodies, path-traversal protection, and **generic error responses** (no stack
  leaks). See `../SECURITY.md`.

## Run it

```bash
cd app
node server.js
# then open http://localhost:4000
```

Optional environment variables:

| Var                          | Effect                                              |
|------------------------------|-----------------------------------------------------|
| `PORT`                       | Port to listen on (default 4000)                    |
| `NODE_ENV=production`        | Emits HSTS header (use behind TLS termination)      |
| `TLS_KEY_FILE`, `TLS_CERT_FILE` | Serve over HTTPS directly (end-to-end TLS in a lab) |

## Test it

```bash
node server.js &        # start server
node smoketest.js       # runs the end-to-end + security checks
```

## Files

| File           | Purpose                                             |
|----------------|-----------------------------------------------------|
| `server.js`    | HTTP server (Node stdlib), routing, security controls |
| `engine.js`    | Server-authoritative game engine (state, scoring)   |
| `content.js`   | Facilities, roles, and the 9 educational scenarios  |
| `validate.js`  | Hand-rolled input validation (reject by default)    |
| `public/`      | Cyberpunk-arcade client (HTML/CSS/vanilla JS)       |
| `smoketest.js` | End-to-end + anti-cheat verification                |

## Relationship to the full stack

The repo root also contains a `shared/` + `server/` scaffold for the richer
**React + Vite + TypeScript + Express + Zod** version, which needs internet to
`npm install`. This `app/` build is the runnable equivalent and can be ported to
that stack when a networked environment is available.
