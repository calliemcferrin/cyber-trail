# CYBER TRAIL: Critical Infrastructure

> An educational, Oregon-Trail-style survival game that teaches cybersecurity for
> critical infrastructure — rendered in a cyberpunk 90s arcade aesthetic.

Guide a critical infrastructure facility through a journey of cyber events and
attacks. Choose your **facility**, choose your **role**, and survive the trail by
making smart security decisions. Learn how real attacks work and how to prevent
them — from the perspective of an entry-level employee, a cyber operator, or a
supervisor.

## Why this project is also a security demo

This game is built **secure by design**. The architecture, the trust boundary,
and the controls are documented in [`SECURITY.md`](./SECURITY.md) and
[`docs/THREAT_MODEL.md`](./docs/THREAT_MODEL.md) so that the project itself is a
teaching artifact — and a legitimate target for higher-level penetration-testing
exercises.

## Architecture

```
cyber-trail/
├── client/     React + Vite + TypeScript + Tailwind (cyberpunk arcade UI)
├── server/     Node + Express + TypeScript (trust boundary, state validation)
├── shared/     Zod schemas & types shared across client and server
└── docs/       Threat model & design notes
```

- The **client** is untrusted. It renders the game and sends intents.
- The **server** owns the trust boundary: it validates every input, advances and
  scores game state authoritatively, and never trusts client-supplied outcomes.

## Tech stack

| Area        | Choice                                   |
|-------------|------------------------------------------|
| Frontend    | React, Vite, TypeScript, Tailwind CSS    |
| Backend     | Node.js, Express, TypeScript             |
| Validation  | Zod (shared schemas)                     |
| Security    | helmet, rate-limiting, CORS allow-list   |

## Getting started

```bash
# install workspace dependencies
npm install

# run server and client in dev
npm run dev
```

(Scripts are wired up as the scaffold progresses — see each package's README.)

## Content model

Facilities, roles, and attack scenarios are **data-driven definitions**, so new
content is added as data, not code:

- **Facilities:** Water Treatment Plant, Power Grid, Hospital, Pipeline …
- **Roles:** Entry-Level Employee · Cyber Operator · Supervisor
- **Events:** phishing, ransomware, DDoS, insider threat, supply-chain, …

See [`docs/GAME_DESIGN.md`](./docs/GAME_DESIGN.md) for the full design.

## Safety note

All "attacks" in this game are **simulated, narrative, educational scenarios**.
This project contains no functional exploits, malware, or attack tooling.

## Collaboration & trademarks

This project is developed in collaboration with the **Marshall University
Institute for Cyber Security**.

Marshall University's names, logos, and marks — including the Marshall "M"
wordmark, **Marco the Bison**, the "Cyber Bison" mark, and "Marshall University
Institute for Cyber Security" — are **trademarks of Marshall University** and are
used **with permission**. They remain the property of Marshall University; their
inclusion here does not transfer any rights, and they may not be reused from this
repository without Marshall University's authorization.

All other game content is part of this educational project. The in-game
"attacks" are simulated, narrative scenarios — see the Safety note above.
