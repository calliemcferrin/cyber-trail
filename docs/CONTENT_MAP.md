# Content Map — CYBER TRAIL

A quick reference to every piece of in-game text, so wording changes can be
requested precisely. **All game copy lives in `app/content.js`.**

How to request an edit — just point at a scenario by **ID** or **title**, e.g.:
> "In `gov_voice_clone_employee`, reword the prompt…"
> "Change the title of 'An Urgent Invoice' to…"
> "In the EHR ransomware scenario, soften the `pay_to_restore` outcome text."

Each scenario has these editable text fields:
- **title** — the event headline
- **prompt** — the situation shown to the player
- per **choice**: **label** (the button text) and **outcome** (shown in the debrief)
- **learning**: **summary**, **realWorldExample**, **preventiveMeasures[]**

`★` marks the recommended (best-practice) choice.

---

## Facilities (editable: name, sector, tagline, description)

| ID | Name | Stages/run |
|----|------|-----------|
| `water` | Blackwater Municipal Water Treatment | 6 |
| `power` | Grid North Regional Electric | 6 |
| `hospital` | St. Mercy Regional Medical Center | 5 |
| `gas` | Cascade Natural Gas Pipeline Co. | 5 |
| `government` | Capitol County Government Services | 6 |

## Roles (editable: name, tagline, description)

| ID | Name |
|----|------|
| `employee` | Entry-Level Employee |
| `operator` | Cyber Operator |
| `supervisor` | Supervisor |

---

## Scenarios

Grouped by the facilities they appear in. Many technical scenarios are shared
across multiple facilities (noted in **Facilities**).

### Water & Power (shared core)

| ID | Title | Role | Attack type | Choices (★ = recommended) |
|----|-------|------|-------------|---------------------------|
| `phish_invoice_employee` | An Urgent Invoice | employee | Phishing | click_link, report_it★, ignore |
| `tailgating_employee` | A Friendly Stranger at the Door | employee | Physical Access / Tailgating | hold_door, direct_to_front★ |
| `usb_drop_employee` | A Lucky Find in the Parking Lot | employee | Social Engineering / Baiting | plug_in, hand_to_security★ |
| `ransomware_operator` | Encryption Spreading on the Network | operator | Ransomware | pay_quietly, isolate_segment★, wait_and_watch |
| `patch_window_operator` | A Critical Patch and a Fragile System | operator | Unpatched Vulnerability | ignore_patch, plan_window★, mitigate_compensate★ |
| `ddos_operator` | The Customer Portal Is Drowning | operator | DDoS | add_capacity, engage_mitigation★ |
| `budget_training_supervisor` | The Security Budget Meeting | supervisor | Security Culture / Social Engineering | buy_firewall, fund_training★ |
| `insider_threat_supervisor` | A Disgruntled Engineer Resigns | supervisor | Insider Threat | business_as_usual, reduce_access★ |
| `supply_chain_supervisor` | A Vendor Software Update | supervisor | Supply-Chain Attack | auto_deploy_all, staged_rollout★ |

### Water only

| ID | Title | Role | Attack type | Choices (★) |
|----|-------|------|-------------|-------------|
| `ot_contractor_laptop_water` | A Contractor at the SCADA Cabinet | employee | OT Access / Third-Party Device Risk | allow_laptop, require_process★ |
| `ot_segmentation_water` | Flatten the Network to Save Money? | supervisor | IT-OT Convergence Risk | approve_flatten, fund_segmentation_water★ |

### Power only

| ID | Title | Role | Attack type | Choices (★) |
|----|-------|------|-------------|-------------|
| `ot_remote_help_power` | A Caller Who Wants Into the Substation HMI | employee | Social Engineering / OT Control Access | read_credentials, verify_and_refuse★ |
| `ot_vendor_access_power` | The Always-On Vendor Link to the Substations | supervisor | Third-Party Remote Access Risk | grant_standing_access, broker_jit_access★ |

### Hospital

| ID | Title | Role | Attack type | Choices (★) |
|----|-------|------|-------------|-------------|
| `phish_hr_benefits_employee` | Open Enrollment Is Here | employee | Phishing | login_now, open_portal_directly★, report_phish★ |
| `vishing_it_support_employee` | A Call from "IT Support" | employee | Social Engineering / Vishing | give_password, verify_callback★ |
| `shoulder_surf_records_employee` | A Curious Request at the Nurses' Station | employee | Social Engineering / Data Privacy | share_chart, follow_privacy_policy★ |
| `ransomware_ehr_operator` | The EHR Just Went Dark | operator | Ransomware | pay_to_restore, isolate_and_downtime★, reboot_everything |
| `medical_device_operator` | The Infusion Pumps Are Talking to the Internet | operator | Medical Device Security | ignore_devices, segment_devices★ |
| `data_exfil_operator` | A Quiet Trickle of Patient Data Leaving | operator | Data Exfiltration | assume_backup, investigate_block★ |
| `hipaa_budget_supervisor` | The Compliance vs. Convenience Debate | supervisor | Security Governance / Data Protection | defer_security, fund_with_workflow★ |
| `third_party_breach_supervisor` | A Vendor Had a Breach | supervisor | Supply-Chain / Third-Party Risk | stay_silent, activate_ir★ |
| `insider_snooping_supervisor` | A VIP Patient and a Curious Staff | supervisor | Insider Threat | let_it_slide, enforce_and_educate★ |

### Natural Gas

| ID | Title | Role | Attack type | Choices (★) |
|----|-------|------|-------------|-------------|
| `phish_safety_bulletin_gas` | An Urgent Safety Bulletin | employee | Phishing | sign_in_link, verify_intranet★ |
| `contractor_laptop_gas` | A Contractor Needs to Plug In | employee | Removable & Third-Party Devices | let_them_plug, follow_process★ |
| `usb_find_gas` | A USB Drive by the Control Room | employee | Social Engineering / Baiting | check_contents, turn_in★ |
| `it_ot_convergence_gas` | The Budget for the Air Gap | supervisor | IT-OT Convergence Risk | flatten_network, fund_segmentation★ |
| `ransom_decision_gas` | The Ransom Clock Is Ticking | supervisor | Ransomware (Crisis Leadership) | pay_fast, execute_ir_plan★ |
| `vendor_remote_access_gas` | The Always-On Vendor Connection | supervisor | Third-Party Remote Access Risk | grant_always_on, broker_access★ |

### Government (social engineering & AI exploitation)

| ID | Title | Role | Attack type | Choices (★) |
|----|-------|------|-------------|-------------|
| `gov_voice_clone_employee` | The Director's Voice on the Line | employee | AI / Voice Cloning (Deepfake Vishing) | reset_and_read, verify_callback_policy★ |
| `gov_ai_phishing_employee` | A Flawless Email from a Colleague | employee | AI / AI-Generated Phishing | open_link, verify_sender★ |
| `gov_chatbot_leak_employee` | The Helpful AI Assistant | employee | AI / Data Leakage to AI Tools | paste_data, use_approved_tools★ |
| `gov_tailgating_employee` | The Technician Without a Badge | employee | Social Engineering / Pretexting & Tailgating | let_in, verify_with_facilities★ |
| `gov_qr_quishing_employee` | A QR Code on an Official Notice | employee | Social Engineering / QR Phishing (Quishing) | scan_code, use_official_portal★ |
| `gov_bec_gift_card_employee` | A Quiet Favor from a Senior Official | employee | Social Engineering / Impersonation (Gift-Card) | buy_cards, verify_and_report★ |
| `gov_deepfake_video_operator` | A Viral Video of an Official That Never Happened | operator | AI / Deepfake Disinformation | ignore_social, activate_comms_playbook★ |
| `gov_prompt_injection_operator` | The Chatbot That Was Talked Into Misbehaving | operator | AI / Prompt Injection | leave_running, contain_and_harden★ |
| `gov_ai_osint_operator` | A Spear-Phish Built From Public Data | operator | AI / AI-Assisted OSINT Spear-Phishing | block_only, layered_response★ |
| `gov_mfa_fatigue_operator` | A Storm of MFA Prompts | operator | Social Engineering / MFA Fatigue (Push Bombing) | tell_them_approve, deny_reset_harden★ |
| `gov_vishing_helpdesk_operator` | A Caller Who Knows Just Enough | operator | Social Engineering / Help-Desk Impersonation | reset_mfa, strong_identity_proof★ |
| `gov_watering_hole_operator` | The Compromised Community Site | operator | Social Engineering / Watering-Hole Attack | do_nothing, warn_block_hunt★ |
| `gov_deepfake_ceo_fraud_supervisor` | A Video Call That Looks Exactly Right | supervisor | AI / Deepfake Executive Fraud | release_funds, enforce_controls★ |
| `gov_ai_governance_supervisor` | The Unapproved AI Tools Everywhere | supervisor | AI / Shadow AI Governance | ignore_shadow_ai, establish_governance★ |
| `gov_disinfo_policy_supervisor` | Before the Deepfake Hits | supervisor | AI / Disinformation Resilience | wait_and_see, build_resilience★ |
| `gov_insider_manipulation_supervisor` | A Staffer Being Worked From the Outside | supervisor | Social Engineering / Long-Game Elicitation | punish_fire, intervene_educate★ |
| `gov_vendor_impersonation_supervisor` | The Vendor Who Changed Their Bank Details | supervisor | Social Engineering / Vendor Email Compromise | pay_new_account, verify_bank_change★ |
| `gov_ai_awareness_supervisor` | Training Built for Yesterday's Threats | supervisor | AI / Modern Awareness Training | keep_old_training, modernize_training★ |

---

**Totals:** 5 facilities · 3 roles · 55 scenarios · 48 attack/threat types.

This map is generated from `app/content.js` — regenerate/update it when scenarios
are added, removed, or renamed.
