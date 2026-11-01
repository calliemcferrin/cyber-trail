# Threat Model — CYBER TRAIL

A lightweight threat model using a STRIDE-style breakdown. This doubles as
learning material: it shows how a real application reasons about threats.

## Assets

- **Game-state integrity** — the authoritative run state and score.
- **Service availability** — the API staying responsive.
- **(Future) user accounts & progress** — credentials and saved data.
- **Educational content** — the facility/role/event definitions.

## Entry points

- The HTTP API exposed by the server (`/api/*`).
- The static client bundle served to browsers.

## STRIDE analysis

| Threat                     | Example                                               | Mitigation                                                            |
|----------------------------|-------------------------------------------------------|-----------------------------------------------------------------------|
| **S**poofing               | Forging another player's session                      | Opaque, unguessable session tokens; (future) authenticated accounts   |
| **T**ampering              | Editing score/state in the browser to "win"           | Server-authoritative state; client outcomes never trusted             |
| **R**epudiation            | Denying an action occurred                            | Server-side logging of security-relevant events                       |
| **I**nformation disclosure | Leaking stack traces, secrets, internal paths         | Generic error responses; secrets in env only; no verbose errors       |
| **D**enial of service      | Flooding the API                                      | Rate limiting; small, bounded request handling; timeouts              |
| **E**levation of privilege | Accessing actions beyond the player's role            | Server-side authorization checks on every state transition            |

## Key design decisions

1. **Thin, untrusted client.** The browser renders and sends intents. It holds
   no secrets and no authority over outcomes.
2. **Server owns the game loop.** Advancing a turn, resolving an event, and
   scoring all happen server-side against validated input.
3. **Reject by default.** Unknown fields, wrong types, and out-of-range values
   are rejected before any logic runs.
4. **Fail closed.** On validation or auth failure, deny the action and return a
   generic error.

## Residual risk

No system is unhackable. Client-side rendering is inherently inspectable (by
design in browsers). The security value comes from the **server trust boundary**:
the client cannot change its score, skip consequences, or access role-restricted
actions without the server allowing it. Those are the properties worth testing.
