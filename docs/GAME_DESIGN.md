# Game Design — CYBER TRAIL

A cyberpunk 90s arcade reimagining of *The Oregon Trail*, built to teach
cybersecurity for critical infrastructure.

## Premise

You are responsible for guiding a **critical infrastructure facility** through a
journey of operational "stages." Along the way, **cyber events and attacks**
strike (the ransomware to Oregon Trail's dysentery). You survive by making smart
security decisions with limited resources. Each event teaches what the attack is,
how it works in the real world, and how to prevent it.

## Game flow

```
Title screen  →  Choose Facility  →  Choose Role  →  Journey loop  →  Debrief
 (arcade)          (sector/threats)   (perspective)   (events+choices)  (win/lose + learning)
```

## Facilities (data-driven)

Each facility defines its sector, flavor, starting resources, and a weighted
threat profile. Flagship for v1: **Water Treatment Plant**. Second: **Power Grid**.
Easy to add more (Hospital, Pipeline, …) as data.

| Facility             | Real-world hook                         |
|----------------------|------------------------------------------|
| Water Treatment      | 2021 Oldsmar, FL chemical-setpoint attack |
| Power Grid           | 2015 Ukraine grid attack (BlackEnergy)    |
| Hospital (future)    | Ransomware against healthcare             |
| Pipeline (future)    | 2021 Colonial Pipeline ransomware         |

## Roles (perspectives)

The same scenario is experienced differently per role — this is the core
teaching device.

| Role                 | Teaches                                   | Resources                         |
|----------------------|-------------------------------------------|-----------------------------------|
| Entry-Level Employee | Social engineering, phishing, hygiene     | Attention, trust, reporting       |
| Cyber Operator       | Detection, response, patching, IR         | Tools, time, alerts               |
| Supervisor           | Budget, policy, risk, crisis leadership   | Budget, staffing, training        |

## Resources

Shared meters, weighted per facility/role:

- **Integrity** — are systems uncompromised? (lose at 0)
- **Uptime** — is the facility operational? (lose at 0)
- **Budget** — can you afford defenses? (constrains choices)
- **Trust/Morale** — staff + public confidence (affects outcomes)

## Turn/event loop

1. Advance to next stage of the journey.
2. Draw an event from the facility+role-weighted deck.
3. Present the scenario and 2–4 choices (each mapped to a security principle).
4. **Server** resolves the choice → applies resource deltas → may chain events.
5. Show a **debrief**: what the attack was, the real-world example, the correct
   preventative measure, and why.
6. Repeat until the journey completes (win) or a meter hits a lose condition.

## Educational layer

Every event carries structured learning content:

- `attackType` (e.g., phishing, ransomware, DDoS)
- `realWorldExample` (with citation)
- `preventiveMeasures` (the takeaways)
- `mitreAttck` (optional technique reference)

## Win / lose

- **Win:** complete all stages with Integrity and Uptime above 0.
- **Lose:** Integrity or Uptime hits 0, or budget collapse cascades.
- **Score:** server-computed from survival, correct decisions, and resources
  preserved — never client-supplied.

## Aesthetic — cyberpunk 90s arcade

- Neon palette: cyan `#00f0ff`, magenta `#ff2bd6`, acid green `#39ff14` on near-black.
- CRT scanlines + subtle flicker/glitch; glowing grid horizon.
- Monospace / pixel typography; chunky arcade HUD, coin-op framing.
- Sound-ready (hooks for blips/alarms) but silent-safe.
