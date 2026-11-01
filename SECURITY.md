# Security Policy & Design

Security in CYBER TRAIL is **built in from the first commit**, not bolted on.
This document describes the controls, the trust boundary, and how to report
issues. It is intentionally public: the project is meant to be a teaching
artifact and a legitimate target for supervised penetration-testing exercises.

## Trust boundary

```
┌─────────────────────────┐        HTTPS (validated)        ┌──────────────────────────┐
│  CLIENT (UNTRUSTED)      │  ───────────────────────────▶  │  SERVER (TRUST BOUNDARY)  │
│  React SPA in browser    │                                 │  Express + TypeScript     │
│  • renders game          │  ◀───────────────────────────  │  • validates ALL input    │
│  • sends player intents  │        authoritative state      │  • advances game state    │
│  • holds NO secrets      │                                 │  • computes score/outcome │
└─────────────────────────┘                                 │  • rate limits & logs     │
                                                             └──────────────────────────┘
```

**Golden rule:** the client is never trusted. Anything the browser sends is
treated as hostile until validated. The server is the single source of truth for
game state, scoring, and win/lose outcomes — so the game resists cheating and
state tampering, which is exactly the boundary a pen-tester should probe.

## Controls (defense in depth)

| Category               | Control                                                              |
|------------------------|----------------------------------------------------------------------|
| Input validation       | Zod schemas on every request body/param; reject-by-default           |
| Output handling        | React escaping; no `dangerouslySetInnerHTML` without sanitization    |
| HTTP security headers   | `helmet` — CSP, HSTS, X-Content-Type-Options, frame-ancestors, etc.  |
| CORS                   | Strict origin allow-list; no wildcard with credentials               |
| Rate limiting          | Per-IP throttling to resist brute force / abuse / DoS                |
| Secrets management     | `.env` only, git-ignored; no secrets in client bundle                |
| Error handling         | Generic errors to client; detailed logs server-side; no stack leaks  |
| State integrity        | Server-authoritative game state; signed/opaque session tokens        |
| Dependency hygiene     | Pinned versions, minimal surface, `npm audit` in CI                  |
| Logging                | Security-relevant events logged without secrets/PII                  |

## OWASP Top 10 mapping

Each control above maps to one or more OWASP Top 10 (2021) categories:
A01 Broken Access Control, A02 Cryptographic Failures, A03 Injection,
A04 Insecure Design, A05 Security Misconfiguration, A06 Vulnerable Components,
A07 Identification & Auth Failures, A08 Software & Data Integrity Failures,
A09 Logging & Monitoring Failures, A10 SSRF.

See [`docs/THREAT_MODEL.md`](./docs/THREAT_MODEL.md) for detail.

## Transport security (HTTP vs HTTPS) — a deliberate decision

The application process speaks plain **HTTP** via Node's `node:http` module. This
is intentional and is standard practice, not an oversight:

- **TLS is terminated at the edge.** In any real deployment the app sits behind a
  reverse proxy / load balancer (nginx, Caddy, cloud ALB, Cloudflare) that holds
  a CA-issued certificate, terminates TLS, and forwards plain HTTP to the app over
  a trusted internal network. Baking TLS into app code makes certificate rotation,
  termination, and scaling harder, so it is generally avoided.
- **HSTS is enforced in production.** When `NODE_ENV=production`, the server emits
  `Strict-Transport-Security`, forcing browsers to stay on HTTPS once TLS fronts it.
- **`http://localhost` is a secure context.** Browsers treat localhost as secure
  even over plain HTTP, so local development needs no certificate.
- **End-to-end TLS is one env var away.** Set `TLS_KEY_FILE` and `TLS_CERT_FILE`
  and the server listens over HTTPS directly (useful for labs). A self-signed cert
  is avoided by default because clicking through browser cert warnings teaches an
  unsafe habit.

**Requirement:** HTTPS is mandatory in production. Plain HTTP is acceptable only
for `localhost` development or on a trusted network segment behind TLS termination.

## Scope for penetration testing

In-scope: the game-state API, input validation, session handling, security
headers, rate limiting, and client-side state tampering resistance.

Out of scope / by design: there is **no functional exploit or malware** in this
repo. The in-game "attacks" are narrative simulations. Do not attempt to use
this project to attack real systems.

## Reporting a vulnerability

Open a private security advisory or contact the maintainers. Please include
reproduction steps and impact. Do not open public issues for undisclosed
vulnerabilities.
