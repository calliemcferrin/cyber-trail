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

Every scenario offers **3+ choices**: an obviously-wrong option, one or more
**plausible "trap" options** (a reasonable-sounding partial or middle-ground that
still leaves a gap — mild penalty, with a teaching outcome), and the recommended
answer. Labels are intentionally neutral so the correct choice isn't telegraphed.

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

| ID | Title | Role | Attack type | Choices (★) |
|----|-------|------|-------------|-------------|
| `phish_invoice_employee` | An Urgent Invoice | employee | Phishing | click_link, ignore, report_it★ |
| `tailgating_employee` | A Friendly Stranger at the Door | employee | Physical Access / Tailgating | hold_door, escort_in, direct_to_front★ |
| `usb_drop_employee` | A Lucky Find in the Parking Lot | employee | Social Engineering / Baiting | plug_in, scan_first, hand_to_security★ |
| `ransomware_operator` | Encryption Spreading on the Network | operator | Ransomware | pay_quietly, wait_and_watch, isolate_segment★ |
| `patch_window_operator` | A Critical Patch and a Fragile System | operator | Unpatched Vulnerability | ignore_patch, plan_window★, mitigate_compensate★ |
| `ddos_operator` | The Customer Portal Is Drowning | operator | Distributed Denial of Service (DDoS) | add_capacity, block_ips, engage_mitigation★ |
| `budget_training_supervisor` | The Security Budget Meeting | supervisor | Security Culture / Social Engineering | buy_firewall, token_training, fund_training★ |
| `insider_threat_supervisor` | A Disgruntled Engineer Resigns | supervisor | Insider Threat | business_as_usual, just_monitor, reduce_access★ |
| `supply_chain_supervisor` | A Vendor Software Update | supervisor | Supply-Chain Attack | auto_deploy_all, quick_test_then_all, staged_rollout★ |

### Water only

| ID | Title | Role | Attack type | Choices (★) |
|----|-------|------|-------------|-------------|
| `ot_contractor_laptop_water` | A Contractor at the SCADA Cabinet | employee | OT Access / Third-Party Device Risk | allow_laptop, allow_but_watch, require_process★ |
| `ot_segmentation_water` | Flatten the Network to Save Money? | supervisor | Security Architecture / IT-OT Convergence Risk | approve_flatten, single_monitoring_link, fund_segmentation_water★ |

### Power only

| ID | Title | Role | Attack type | Choices (★) |
|----|-------|------|-------------|-------------|
| `ot_remote_help_power` | A Caller Who Wants Into the Substation HMI | employee | Social Engineering / OT Control Access | read_credentials, share_then_change, verify_and_refuse★ |
| `ot_vendor_access_power` | The Always-On Vendor Link to the Substations | supervisor | Third-Party Remote Access Risk | grant_standing_access, standing_vpn_only, broker_jit_access★ |

### Hospital

| ID | Title | Role | Attack type | Choices (★) |
|----|-------|------|-------------|-------------|
| `phish_hr_benefits_employee` | Open Enrollment Is Here | employee | Phishing | login_now, open_portal_directly★, report_phish★ |
| `vishing_it_support_employee` | A Call from "IT Support" | employee | Social Engineering / Vishing | give_password, change_then_share, verify_callback★ |
| `shoulder_surf_records_employee` | A Curious Request at the Nurses' Station | employee | Social Engineering / Data Privacy | share_chart, vague_reassure, follow_privacy_policy★ |
| `ransomware_ehr_operator` | The EHR Just Went Dark | operator | Ransomware | pay_to_restore, reboot_everything, isolate_and_downtime★ |
| `medical_device_operator` | The Infusion Pumps Are Talking to the Internet | operator | Unpatched Vulnerability / Medical Device Security | ignore_devices, firewall_rule_only, segment_devices★ |
| `data_exfil_operator` | A Quiet Trickle of Patient Data Leaving | operator | Data Exfiltration | assume_backup, monitor_more, investigate_block★ |
| `hipaa_budget_supervisor` | The Compliance vs. Convenience Debate | supervisor | Security Governance / Data Protection | defer_security, partial_one_control, fund_with_workflow★ |
| `third_party_breach_supervisor` | A Vendor Had a Breach | supervisor | Supply-Chain / Third-Party Risk | stay_silent, investigate_quietly, activate_ir★ |
| `insider_snooping_supervisor` | A VIP Patient and a Curious Staff | supervisor | Insider Threat | let_it_slide, general_reminder, enforce_and_educate★ |

### Natural Gas

| ID | Title | Role | Attack type | Choices (★) |
|----|-------|------|-------------|-------------|
| `phish_safety_bulletin_gas` | An Urgent Safety Bulletin | employee | Phishing | sign_in_link, forward_coworkers, verify_intranet★ |
| `contractor_laptop_gas` | A Contractor Needs to Plug In | employee | Social Engineering / Removable & Third-Party Devices | let_them_plug, watch_them_plug, follow_process★ |
| `usb_find_gas` | A USB Drive by the Control Room | employee | Social Engineering / Baiting | check_contents, check_on_spare, turn_in★ |
| `it_ot_convergence_gas` | The Budget for the Air Gap | supervisor | Security Architecture / IT-OT Convergence Risk | flatten_network, single_direct_link, fund_segmentation★ |
| `ransom_decision_gas` | The Ransom Clock Is Ticking | supervisor | Ransomware (Crisis Leadership) | pay_fast, pay_and_recover, execute_ir_plan★ |
| `vendor_remote_access_gas` | The Always-On Vendor Connection | supervisor | Third-Party Remote Access Risk | grant_always_on, always_on_notify, broker_access★ |

### Shared technical (water/power/gas/hospital)

| ID | Title | Role | Attack type | Choices (★) |
|----|-------|------|-------------|-------------|
| `plc_logic_operator` | The Setpoints Are Changing by Themselves | operator | PLC / SCADA Logic Manipulation | trust_hmi, manual_verify_isolate★, reflash_blind |
| `credential_stuffing_operator` | A Flood of Logins at 3 A.M. | operator | Credential Stuffing / Password Attack | ignore_noise, block_ips_only, mfa_lockout_reset★ |
| `mitm_operator` | A Certificate Warning Nobody Can Explain | operator | Man-in-the-Middle (MITM) | click_through, move_to_wifi, investigate_rogue★ |
| `sql_injection_operator` | Strange Queries Hitting the Customer Portal | operator | SQL Injection / Web Application Attack | ignore_webapp, block_attacker_ip, patch_parametrize★ |
| `zero_day_operator` | An Exploit With No Patch | operator | Zero-Day Exploitation | wait_for_patch, waf_signature_only, mitigate_now★ |

### Cross-facility (all four infrastructure sites)

| ID | Title | Role | Attack type | Choices (★) |
|----|-------|------|-------------|-------------|
| `password_reuse_employee` | One Password to Rule Them All | employee | Password Hygiene / Credential Reuse | reuse_it, unique_no_mfa, unique_plus_mfa★ |
| `bec_wire_employee` | An Urgent Request from the Boss | employee | Business Email Compromise (BEC) / Wire Fraud | process_wire, reply_to_confirm, verify_out_of_band★ |
| `tabletop_exercise_supervisor` | Do We Really Need Another Drill? | supervisor | Incident-Response Preparedness | skip_drill, email_the_plan, run_tabletop★ |
| `logging_monitoring_supervisor` | The Blind Spot in the Budget | supervisor | Logging & Monitoring Gaps | defer_monitoring, collect_no_monitor, fund_monitoring★ |

### Government (social engineering & AI exploitation)

| ID | Title | Role | Attack type | Choices (★) |
|----|-------|------|-------------|-------------|
| `gov_voice_clone_employee` | The Director's Voice on the Line | employee | AI Exploitation / Voice Cloning (Deepfake Vishing) | reset_and_read, callback_same_number, verify_callback_policy★ |
| `gov_ai_phishing_employee` | A Flawless Email from a Colleague | employee | AI Exploitation / AI-Generated Phishing | open_link, reply_to_ask, verify_sender★ |
| `gov_chatbot_leak_employee` | The Helpful AI Assistant | employee | AI Exploitation / Data Leakage to AI Tools | paste_data, redact_then_paste, use_approved_tools★ |
| `gov_tailgating_employee` | The Technician Without a Badge | employee | Social Engineering / Pretexting & Tailgating | let_in, escort_to_server, verify_with_facilities★ |
| `gov_qr_quishing_employee` | A QR Code on an Official Notice | employee | Social Engineering / QR Phishing (Quishing) | scan_code, preview_then_scan, use_official_portal★ |
| `gov_bec_gift_card_employee` | A Quiet Favor from a Senior Official | employee | Social Engineering / Impersonation (Gift-Card Scam) | buy_cards, text_back, verify_and_report★ |
| `gov_deepfake_video_operator` | A Viral Video of an Official That Never Happened | operator | AI Exploitation / Deepfake Disinformation | ignore_social, quick_personal_post, activate_comms_playbook★ |
| `gov_prompt_injection_operator` | The Chatbot That Was Talked Into Misbehaving | operator | AI Exploitation / Prompt Injection | leave_running, blocklist_phrase, contain_and_harden★ |
| `gov_ai_osint_operator` | A Spear-Phish Built From Public Data | operator | AI Exploitation / AI-Assisted OSINT Spear-Phishing | block_only, warn_only, layered_response★ |
| `gov_mfa_fatigue_operator` | A Storm of MFA Prompts | operator | Social Engineering / MFA Fatigue (Push Bombing) | tell_them_approve, just_ignore_prompts, deny_reset_harden★ |
| `gov_vishing_helpdesk_operator` | A Caller Who Knows Just Enough | operator | Social Engineering / Help-Desk Impersonation | reset_mfa, extra_public_question, strong_identity_proof★ |
| `gov_watering_hole_operator` | The Compromised Community Site | operator | Social Engineering / Watering-Hole Attack | do_nothing, block_site_only, warn_block_hunt★ |
| `gov_deepfake_ceo_fraud_supervisor` | A Video Call That Looks Exactly Right | supervisor | AI Exploitation / Deepfake Executive Fraud | release_funds, ask_personal_question, enforce_controls★ |
| `gov_ai_governance_supervisor` | The Unapproved AI Tools Everywhere | supervisor | AI Exploitation / Shadow AI Governance | ignore_shadow_ai, ban_all_ai, establish_governance★ |
| `gov_disinfo_policy_supervisor` | Before the Deepfake Hits | supervisor | AI Exploitation / Disinformation Resilience | wait_and_see, assign_as_sidetask, build_resilience★ |
| `gov_insider_manipulation_supervisor` | A Staffer Being Worked From the Outside | supervisor | Social Engineering / Long-Game Elicitation | punish_fire, monitor_quietly, intervene_educate★ |
| `gov_vendor_impersonation_supervisor` | The Vendor Who Changed Their Bank Details | supervisor | Social Engineering / Vendor Email Compromise (Invoice Fraud) | pay_new_account, reply_to_confirm_bank, verify_bank_change★ |
| `gov_ai_awareness_supervisor` | Training Built for Yesterday's Threats | supervisor | AI Exploitation / Modern Awareness Training | keep_old_training, bolt_on_module, modernize_training★ |

---

**Totals:** 5 facilities · 3 roles · 55 scenarios · 48 attack/threat types.

This map is generated from `app/content.js` — regenerate/update it when scenarios
are added, removed, or renamed.

