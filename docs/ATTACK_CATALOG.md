# Attack Catalog — CYBER TRAIL

A reference of every simulated attack/threat type in the game, the scenarios
that teach it, and which facility + role perspectives encounter it.

> All "attacks" in CYBER TRAIL are **narrative simulations for education**. This
> project contains no functional exploit, malware, or attack tooling.

**At a glance:** 5 facilities · 3 roles · **55 scenarios** across **48 distinct
attack/threat types**, each mapped to a [MITRE ATT&CK](https://attack.mitre.org/)
(or ATT&CK for ICS) technique.

Facilities: **water** (treatment plant) · **power** (electric utility) ·
**hospital** (medical center) · **gas** (natural gas pipeline) ·
**government** (county government — focused on social engineering & AI exploitation).
Roles: **E** = Entry-Level Employee · **O** = Cyber Operator · **S** = Supervisor.

---

## By category

### 🎣 Social engineering & human-factor

| Attack / threat type | Scenario | Roles | Facilities | MITRE |
|---|---|---|---|---|
| Phishing | An Urgent Invoice | E | water, power | T1566 |
| Phishing | Open Enrollment Is Here | E | hospital | T1566 |
| Phishing | An Urgent Safety Bulletin | E | gas | T1566 |
| Business Email Compromise (BEC) / Wire Fraud | An Urgent Request from the Boss | E | all | T1566 |
| Social Engineering / Vishing | A Call from "IT Support" | E | hospital | T1566 |
| Social Engineering / Baiting | A Lucky Find in the Parking Lot | E | water, power | T1091 |
| Social Engineering / Baiting | A USB Drive by the Control Room | E | gas | T1091 |
| Social Engineering / Data Privacy | A Curious Request at the Nurses' Station | E | hospital | T1114 |
| Social Engineering / OT Control Access | A Caller Who Wants Into the Substation HMI | E | power | T1566 |
| Social Engineering / Removable & Third-Party Devices | A Contractor Needs to Plug In | E | gas | T1200 |
| Physical Access / Tailgating | A Friendly Stranger at the Door | E | water, power | T1200 |
| Security Culture / Social Engineering | The Security Budget Meeting | S | water, power | T1566 |
| Social Engineering / Pretexting & Tailgating | The Technician Without a Badge | E | government | T1200 |
| Social Engineering / QR Phishing (Quishing) | A QR Code on an Official Notice | E | government | T1566 |
| Social Engineering / Impersonation (Gift-Card Scam) | A Quiet Favor from a Senior Official | E | government | T1566 |
| Social Engineering / MFA Fatigue (Push Bombing) | A Storm of MFA Prompts | O | government | T1621 |
| Social Engineering / Help-Desk Impersonation | A Caller Who Knows Just Enough | O | government | T1556 |
| Social Engineering / Watering-Hole Attack | The Compromised Community Site | O | government | T1189 |
| Social Engineering / Long-Game Elicitation | A Staffer Being Worked From the Outside | S | government | T1598 |
| Social Engineering / Vendor Email Compromise (Invoice Fraud) | The Vendor Who Changed Their Bank Details | S | government | T1566 |

### 🤖 AI exploitation (government facility)

| Attack / threat type | Scenario | Roles | Facilities | MITRE |
|---|---|---|---|---|
| AI Exploitation / Voice Cloning (Deepfake Vishing) | The Director's Voice on the Line | E | government | T1598 |
| AI Exploitation / AI-Generated Phishing | A Flawless Email from a Colleague | E | government | T1566 |
| AI Exploitation / Data Leakage to AI Tools | The Helpful AI Assistant | E | government | T1213 |
| AI Exploitation / Deepfake Disinformation | A Viral Video of an Official That Never Happened | O | government | T1591 |
| AI Exploitation / Prompt Injection | The Chatbot That Was Talked Into Misbehaving | O | government | T1059 |
| AI Exploitation / AI-Assisted OSINT Spear-Phishing | A Spear-Phish Built From Public Data | O | government | T1598 |
| AI Exploitation / Deepfake Executive Fraud | A Video Call That Looks Exactly Right | S | government | T1598 |
| AI Exploitation / Shadow AI Governance | The Unapproved AI Tools Everywhere | S | government | T1213 |
| AI Exploitation / Disinformation Resilience | Before the Deepfake Hits | S | government | T1591 |
| AI Exploitation / Modern Awareness Training | Training Built for Yesterday's Threats | S | government | T1598 |

### 🔑 Credentials & access

| Attack / threat type | Scenario | Roles | Facilities | MITRE |
|---|---|---|---|---|
| Credential Stuffing / Password Attack | A Flood of Logins at 3 A.M. | O | all | T1110 |
| Password Hygiene / Credential Reuse | One Password to Rule Them All | E | all | T1110 |
| Third-Party Remote Access Risk | The Always-On Vendor Connection | S | gas | T1133 |
| Third-Party Remote Access Risk | The Always-On Vendor Link to the Substations | S | power | T1133 |

### 💻 Technical / network / web

| Attack / threat type | Scenario | Roles | Facilities | MITRE |
|---|---|---|---|---|
| Man-in-the-Middle (MITM) | A Certificate Warning Nobody Can Explain | O | all | T1557 |
| SQL Injection / Web Application Attack | Strange Queries Hitting the Customer Portal | O | all | T1190 |
| Distributed Denial of Service (DDoS) | The Customer Portal Is Drowning | O | water, power | T1498 |
| Unpatched Vulnerability | A Critical Patch and a Fragile System | O | water, power | T1190 |
| Unpatched Vulnerability / Medical Device Security | The Infusion Pumps Are Talking to the Internet | O | hospital | T1190 |
| Zero-Day Exploitation | An Exploit With No Patch | O | all | T1190 |
| Data Exfiltration | A Quiet Trickle of Patient Data Leaving | O | hospital | T1048 |

### 🏭 Operational technology (OT / ICS)

| Attack / threat type | Scenario | Roles | Facilities | MITRE |
|---|---|---|---|---|
| PLC / SCADA Logic Manipulation | The Setpoints Are Changing by Themselves | O | water, power, gas | T0836 |
| Security Architecture / IT-OT Convergence Risk | The Budget for the Air Gap | S | gas | T0812 |
| Security Architecture / IT-OT Convergence Risk | Flatten the Network to Save Money? | S | water | T0812 |
| OT Access / Third-Party Device Risk | A Contractor at the SCADA Cabinet | E | water | T1200 |

### 🦠 Malware & ransomware

| Attack / threat type | Scenario | Roles | Facilities | MITRE |
|---|---|---|---|---|
| Ransomware | Encryption Spreading on the Network | O | water, power | T1486 |
| Ransomware | The EHR Just Went Dark | O | hospital | T1486 |
| Ransomware (Crisis Leadership) | The Ransom Clock Is Ticking | S | gas | T1486 |

### 🏢 Insider, supply-chain & governance

| Attack / threat type | Scenario | Roles | Facilities | MITRE |
|---|---|---|---|---|
| Insider Threat | A Disgruntled Engineer Resigns | S | water, power | T1078 |
| Insider Threat | A VIP Patient and a Curious Staff | S | hospital | T1078 |
| Supply-Chain Attack | A Vendor Software Update | S | water, power | T1195 |
| Supply-Chain / Third-Party Risk | A Vendor Had a Breach | S | hospital | T1195 |
| Security Governance / Data Protection | The Compliance vs. Convenience Debate | S | hospital | T1078 |
| Incident-Response Preparedness | Do We Really Need Another Drill? | S | all | T1078 |
| Logging & Monitoring Gaps | The Blind Spot in the Budget | S | all | T1078 |

---

## Coverage matrix (events available per facility × role)

| Facility | Employee | Operator | Supervisor | Stages per run |
|---|---|---|---|---|
| Water (treatment plant) | 6 | 8 | 6 | 6 |
| Power (electric utility) | 6 | 8 | 6 | 6 |
| Hospital (medical center) | 5 | 7 | 5 | 5 |
| Gas (natural gas pipeline) | 5 | 5 | 5 | 5 |
| Government (county services) | 6 | 6 | 6 | 6 |

**Government facility — themed scope.** Unlike the infrastructure facilities, the
government facility focuses *exclusively* on **social engineering** and **AI
exploitation** (deepfakes, voice cloning, AI phishing, prompt injection, shadow
AI, disinformation) — the human- and AI-centric threats most acutely aimed at
public institutions. Its 18 scenarios split evenly: 9 social engineering, 9 AI
exploitation.

Each run draws a shuffled subset of the available pool up to the facility's
"stages per run," so replays vary.

---

## Notes

- Several scenarios share a MITRE technique (e.g. multiple social-engineering
  types map to **T1566**, and several technical attacks to **T1190**) because
  ATT&CK groups by technique while the game distinguishes them pedagogically by
  real-world framing (phishing vs. vishing vs. BEC, etc.).
- OT/ICS techniques use the **ATT&CK for ICS** matrix (T08xx), e.g. **T0836**
  (Modify Parameter) and **T0812** (Default/architecture exposure).
- **AI exploitation** scenarios map to the closest classic ATT&CK techniques
  (e.g. **T1598** Phishing for Information for deepfake/voice-clone pretexting,
  **T1591** for disinformation/impersonation, **T1213** for data leakage to AI
  tools, **T1059** for prompt injection). AI-specific threats like prompt
  injection also align with the **OWASP Top 10 for LLM Applications**.
- This catalog is generated from the game content in `app/content.js`; update it
  when scenarios are added or changed.
