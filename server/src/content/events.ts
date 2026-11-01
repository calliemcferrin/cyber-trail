import { GameEvent } from '@cyber-trail/shared';

/**
 * The event deck. Each event is tagged with the facilities and roles it applies
 * to, so the engine can draw a perspective-appropriate scenario per stage.
 *
 * All content is parsed through the Zod schema at module load: malformed
 * content throws immediately rather than shipping a broken game.
 */
const RAW: unknown[] = [
  // ───────────────────────── EMPLOYEE perspective ─────────────────────────
  {
    id: 'phish_invoice_employee',
    title: 'An Urgent Invoice',
    prompt:
      'An email lands in your inbox: "URGENT — unpaid invoice, click to view ' +
      'or your account is suspended in 2 hours." The sender looks like your ' +
      'vendor, but the domain is "blackwater-billing.co" instead of ".gov". ' +
      'What do you do?',
    facilities: ['water', 'power'],
    roles: ['employee'],
    choices: [
      {
        id: 'click_link',
        label: 'Click the link to avoid the account suspension.',
        effects: [
          { key: 'integrity', amount: -25 },
          { key: 'morale', amount: -5 },
        ],
        isRecommended: false,
        outcome:
          'The link harvested your credentials. Attackers now have a foothold. ' +
          'Urgency and fear are the classic levers of a phishing attack.',
      },
      {
        id: 'report_it',
        label: 'Report the email to IT/security and do not click.',
        effects: [{ key: 'morale', amount: 5 }],
        isRecommended: true,
        outcome:
          'You spotted the mismatched domain and the manufactured urgency, and ' +
          'reported it. Security blocked the sender for everyone. This is ' +
          'exactly the behavior that stops phishing at the door.',
      },
      {
        id: 'ignore',
        label: 'Delete it and move on without telling anyone.',
        effects: [],
        isRecommended: false,
        outcome:
          'You avoided the trap, but your silent colleagues may still fall for ' +
          'it. Reporting protects the whole organization, not just you.',
      },
    ],
    learning: {
      attackType: 'phishing',
      summary:
        'Phishing uses fake but convincing messages to trick people into ' +
        'revealing credentials or running malware. Urgency and authority are ' +
        'the most common manipulation tactics.',
      realWorldExample:
        'The 2021 Colonial Pipeline ransomware incident began with compromised ' +
        'credentials; phishing remains a leading initial-access technique ' +
        'against critical infrastructure.',
      preventiveMeasures: [
        'Verify sender domains carefully before trusting a message.',
        'Treat urgency and threats as red flags, not reasons to hurry.',
        'Never enter credentials via a link in an unsolicited email.',
        'Report suspicious messages so defenders can protect everyone.',
      ],
      mitreAttck: 'T1566',
    },
  },
  {
    id: 'tailgating_employee',
    title: 'A Friendly Stranger at the Door',
    prompt:
      'Walking into the plant, someone in a delivery uniform with full hands ' +
      'says, "Hey, could you badge me in? Forgot my card again." They seem ' +
      'nice and are clearly in a hurry. Do you hold the secure door?',
    facilities: ['water', 'power'],
    roles: ['employee'],
    choices: [
      {
        id: 'hold_door',
        label: 'Be polite and hold the door open for them.',
        effects: [{ key: 'integrity', amount: -20 }],
        isRecommended: false,
        outcome:
          'You just let an unverified person into a restricted area. Physical ' +
          'access can defeat millions of dollars of cyber defenses.',
      },
      {
        id: 'direct_to_front',
        label: 'Politely direct them to the front desk to sign in.',
        effects: [{ key: 'morale', amount: 3 }],
        isRecommended: true,
        outcome:
          'You resisted the social pressure and followed access policy. ' +
          'Tailgating is a simple, effective physical-access attack — and you ' +
          'stopped it without being rude.',
      },
    ],
    learning: {
      attackType: 'physical_access',
      summary:
        'Tailgating (or "piggybacking") is when an attacker follows an ' +
        'authorized person through a secure door, exploiting politeness to ' +
        'bypass physical access controls.',
      realWorldExample:
        'Red-team assessments of utilities routinely gain physical access to ' +
        'control rooms simply by carrying boxes and acting like they belong.',
      preventiveMeasures: [
        'Require everyone to badge in individually — no exceptions.',
        'Direct unbadged visitors to reception to be verified.',
        'Report tailgating attempts; attackers test which staff comply.',
      ],
      mitreAttck: 'T1200',
    },
  },
  {
    id: 'usb_drop_employee',
    title: 'A Lucky Find in the Parking Lot',
    prompt:
      'You find a USB drive in the parking lot labeled "Payroll Q4 — ' +
      'CONFIDENTIAL." Curiosity is killing you. What do you do with it?',
    facilities: ['water', 'power'],
    roles: ['employee'],
    choices: [
      {
        id: 'plug_in',
        label: 'Plug it into your workstation to see who it belongs to.',
        effects: [{ key: 'integrity', amount: -30 }],
        isRecommended: false,
        outcome:
          'The drive auto-ran malware the moment it mounted. "Baiting" works ' +
          'because curiosity beats caution. Never plug in unknown media.',
      },
      {
        id: 'hand_to_security',
        label: 'Hand it to security without plugging it in anywhere.',
        effects: [{ key: 'morale', amount: 4 }],
        isRecommended: true,
        outcome:
          'You recognized a classic USB-drop (baiting) attack and handed it to ' +
          'security unopened. Smart — that curiosity is exactly what attackers ' +
          'count on.',
      },
    ],
    learning: {
      attackType: 'social_engineering',
      summary:
        'Baiting leaves malware-laden media (like USB drives) where victims ' +
        'will find them, relying on curiosity to get the malware executed.',
      realWorldExample:
        'Security researchers have repeatedly shown that a large fraction of ' +
        'dropped USB drives get plugged into corporate machines by finders.',
      preventiveMeasures: [
        'Never connect unknown USB devices to any work machine.',
        'Hand found media to security unopened.',
        'Enforce device-control policies that block unapproved USB storage.',
      ],
      mitreAttck: 'T1091',
    },
  },

  // ───────────────────────── OPERATOR perspective ─────────────────────────
  {
    id: 'ransomware_operator',
    title: 'Encryption Spreading on the Network',
    prompt:
      'Your EDR console lights up red: files on three servers are being ' +
      'encrypted and the pattern is spreading laterally. A ransom note appears. ' +
      'You have seconds to act. What is your first move?',
    facilities: ['water', 'power'],
    roles: ['operator'],
    choices: [
      {
        id: 'pay_quietly',
        label: 'Quietly arrange to pay the ransom to make it stop.',
        effects: [
          { key: 'budget', amount: -30 },
          { key: 'integrity', amount: -10 },
        ],
        isRecommended: false,
        outcome:
          'Paying funds the attackers and guarantees nothing. The spread ' +
          'continued while you negotiated. Containment, not payment, stops ' +
          'ransomware.',
      },
      {
        id: 'isolate_segment',
        label: 'Isolate the affected segment from the network immediately.',
        effects: [
          { key: 'uptime', amount: -10 },
          { key: 'integrity', amount: 5 },
        ],
        isRecommended: true,
        outcome:
          'You pulled the affected segment off the network, halting lateral ' +
          'movement. A brief uptime hit saved the rest of the plant. ' +
          'Containment first — always.',
      },
      {
        id: 'wait_and_watch',
        label: 'Keep monitoring to understand the attack before acting.',
        effects: [{ key: 'integrity', amount: -25 }],
        isRecommended: false,
        outcome:
          'While you watched, the ransomware reached backup servers too. With ' +
          'active encryption spreading, speed matters more than perfect ' +
          'understanding.',
      },
    ],
    learning: {
      attackType: 'ransomware',
      summary:
        'Ransomware encrypts systems and demands payment. In operational ' +
        'technology environments it can halt physical processes, not just data.',
      realWorldExample:
        'The 2021 Colonial Pipeline ransomware attack shut down fuel delivery ' +
        'across the US East Coast even though OT systems were precautionarily ' +
        'taken offline.',
      preventiveMeasures: [
        'Segment IT from OT so an infection cannot cross freely.',
        'Maintain tested, offline backups you can restore from.',
        'Contain and isolate first; paying is a last resort and unreliable.',
        'Rehearse an incident-response playbook before you need it.',
      ],
      mitreAttck: 'T1486',
    },
  },
  {
    id: 'patch_window_operator',
    title: 'A Critical Patch and a Fragile System',
    prompt:
      'A critical remote-code-execution vulnerability was just disclosed for ' +
      'software running on your control network. Patching requires a ' +
      'maintenance window and risks a finicky legacy system. What do you do?',
    facilities: ['water', 'power'],
    roles: ['operator'],
    choices: [
      {
        id: 'ignore_patch',
        label: 'Skip it — the system is too fragile to touch.',
        effects: [{ key: 'integrity', amount: -20 }],
        isRecommended: false,
        outcome:
          'An unpatched, internet-exposed RCE is an open door. Attackers scan ' +
          'for these within hours of disclosure.',
      },
      {
        id: 'plan_window',
        label: 'Schedule an urgent maintenance window and patch with a rollback plan.',
        effects: [
          { key: 'uptime', amount: -5 },
          { key: 'integrity', amount: 10 },
        ],
        isRecommended: true,
        outcome:
          'You planned a short window with a rollback plan and closed the hole ' +
          'before it was exploited. Managed patching beats both reckless haste ' +
          'and dangerous neglect.',
      },
      {
        id: 'mitigate_compensate',
        label: 'Apply compensating controls (segmentation, firewall rules) now, patch soon.',
        effects: [{ key: 'integrity', amount: 5 }],
        isRecommended: true,
        outcome:
          'When you cannot patch instantly, compensating controls reduce ' +
          'exposure in the meantime. A solid defense-in-depth move.',
      },
    ],
    learning: {
      attackType: 'unpatched_vuln',
      summary:
        'Unpatched vulnerabilities are among the most common ways attackers ' +
        'gain access. Legacy OT systems make patching hard but not optional.',
      realWorldExample:
        'Many critical-infrastructure intrusions exploit known vulnerabilities ' +
        'for which patches existed but had not been applied.',
      preventiveMeasures: [
        'Track asset inventory and known vulnerabilities continuously.',
        'Use maintenance windows and rollback plans for OT patching.',
        'Apply compensating controls when immediate patching is impossible.',
        'Prioritize internet-exposed and critical systems first.',
      ],
      mitreAttck: 'T1190',
    },
  },
  {
    id: 'ddos_operator',
    title: 'The Customer Portal Is Drowning',
    prompt:
      'Your public customer portal and remote-access gateway are being hit ' +
      'with a massive flood of traffic from thousands of IPs. Legitimate users ' +
      'can\'t connect. Is this just a busy day?',
    facilities: ['water', 'power'],
    roles: ['operator'],
    choices: [
      {
        id: 'add_capacity',
        label: 'Just add more server capacity and ride it out.',
        effects: [
          { key: 'budget', amount: -15 },
          { key: 'uptime', amount: -10 },
        ],
        isRecommended: false,
        outcome:
          'Throwing hardware at a volumetric DDoS is a losing race. The flood ' +
          'scaled right past you — and it may be a smokescreen for another ' +
          'intrusion.',
      },
      {
        id: 'engage_mitigation',
        label: 'Engage DDoS mitigation/scrubbing and watch for a secondary attack.',
        effects: [{ key: 'uptime', amount: 5 }],
        isRecommended: true,
        outcome:
          'Upstream scrubbing absorbed the flood and you watched for the ' +
          'intrusion a DDoS often masks. Restored service and stayed vigilant.',
      },
    ],
    learning: {
      attackType: 'ddos',
      summary:
        'A Distributed Denial of Service overwhelms a service with traffic to ' +
        'make it unavailable. It is sometimes used as a distraction for a ' +
        'second, quieter attack.',
      realWorldExample:
        'DDoS campaigns have repeatedly targeted energy and financial-sector ' +
        'portals to disrupt operations and public confidence.',
      preventiveMeasures: [
        'Use upstream DDoS scrubbing / CDN protection for public services.',
        'Rate-limit and filter traffic at the edge.',
        'Watch for secondary intrusions hidden behind the noise.',
      ],
      mitreAttck: 'T1498',
    },
  },

  // ──────────────────────── SUPERVISOR perspective ────────────────────────
  {
    id: 'budget_training_supervisor',
    title: 'The Security Budget Meeting',
    prompt:
      'Finance wants to cut costs. You can fund one initiative this quarter: ' +
      'security-awareness training for all staff, or a flashy new firewall ' +
      'appliance. The board loves visible hardware. What do you champion?',
    facilities: ['water', 'power'],
    roles: ['supervisor'],
    choices: [
      {
        id: 'buy_firewall',
        label: 'Buy the firewall — it looks decisive to the board.',
        effects: [
          { key: 'budget', amount: -20 },
          { key: 'integrity', amount: 3 },
        ],
        isRecommended: false,
        outcome:
          'The firewall helps, but most breaches start with people. Neglecting ' +
          'the human layer leaves your biggest attack surface untouched.',
      },
      {
        id: 'fund_training',
        label: 'Fund organization-wide security-awareness training.',
        effects: [
          { key: 'budget', amount: -10 },
          { key: 'integrity', amount: 8 },
          { key: 'morale', amount: 5 },
        ],
        isRecommended: true,
        outcome:
          'You invested in the human firewall. Trained staff report phishing, ' +
          'resist social engineering, and multiply every technical control. ' +
          'The highest-leverage security spend is often people.',
      },
    ],
    learning: {
      attackType: 'social_engineering',
      summary:
        'Security culture is a leadership decision. The human layer is both ' +
        'the most-attacked and the most-neglected part of most defenses.',
      realWorldExample:
        'Verizon\'s annual breach reports consistently find the human element ' +
        'involved in the large majority of breaches.',
      preventiveMeasures: [
        'Fund recurring security-awareness training, not just hardware.',
        'Run phishing simulations and reward reporting, not punishment.',
        'Make security a visible leadership priority and culture.',
      ],
      mitreAttck: 'T1566',
    },
  },
  {
    id: 'insider_threat_supervisor',
    title: 'A Disgruntled Engineer Resigns',
    prompt:
      'A senior control-systems engineer just resigned angrily after being ' +
      'passed over for promotion. They have broad administrative access and a ' +
      'two-week notice period. HR wants a smooth handover. What is your call?',
    facilities: ['water', 'power'],
    roles: ['supervisor'],
    choices: [
      {
        id: 'business_as_usual',
        label: 'Keep all access active for a smooth two-week handover.',
        effects: [{ key: 'integrity', amount: -25 }],
        isRecommended: false,
        outcome:
          'A disgruntled insider with full access is a serious risk. During the ' +
          'notice period, sensitive data walked out the door.',
      },
      {
        id: 'reduce_access',
        label: 'Apply least privilege: revoke sensitive access, monitor, document handover.',
        effects: [
          { key: 'integrity', amount: 8 },
          { key: 'morale', amount: -3 },
        ],
        isRecommended: true,
        outcome:
          'You balanced dignity with least privilege — trimming dangerous ' +
          'access while enabling a documented handover. Insider risk managed ' +
          'without treating the person as a criminal.',
      },
    ],
    learning: {
      attackType: 'insider_threat',
      summary:
        'Insider threats — malicious or negligent — abuse legitimate access. ' +
        'They are hard to detect precisely because the access is authorized.',
      realWorldExample:
        'Multiple water and energy incidents have involved former employees ' +
        'retaining access and tampering with systems after departure.',
      preventiveMeasures: [
        'Enforce least privilege and review access regularly.',
        'Promptly adjust access when roles or employment change.',
        'Monitor for unusual activity by privileged accounts.',
        'Separate duties so no single person can act unchecked.',
      ],
      mitreAttck: 'T1078',
    },
  },
  {
    id: 'supply_chain_supervisor',
    title: 'A Vendor Software Update',
    prompt:
      'A trusted vendor pushes a routine software update for your monitoring ' +
      'platform. Deploying everywhere immediately is convenient. But you recall ' +
      'that trusted updates have been weaponized before. What policy do you set?',
    facilities: ['water', 'power'],
    roles: ['supervisor'],
    choices: [
      {
        id: 'auto_deploy_all',
        label: 'Auto-deploy to all systems immediately for convenience.',
        effects: [{ key: 'integrity', amount: -20 }],
        isRecommended: false,
        outcome:
          'Blindly trusting updates is how supply-chain attacks spread. If the ' +
          'vendor is compromised, you just deployed the attacker\'s code ' +
          'everywhere at once.',
      },
      {
        id: 'staged_rollout',
        label: 'Require staged rollout, integrity verification, and monitoring.',
        effects: [
          { key: 'integrity', amount: 8 },
          { key: 'uptime', amount: -3 },
        ],
        isRecommended: true,
        outcome:
          'You verified update integrity and rolled out in stages with ' +
          'monitoring, limiting blast radius if the supply chain were ' +
          'compromised. Trust, but verify.',
      },
    ],
    learning: {
      attackType: 'supply_chain',
      summary:
        'Supply-chain attacks compromise a trusted vendor or component so the ' +
        'malicious code is delivered through legitimate, trusted channels.',
      realWorldExample:
        'The 2020 SolarWinds compromise distributed a backdoor through a signed, ' +
        'trusted software update to thousands of organizations.',
      preventiveMeasures: [
        'Verify update integrity (signatures/hashes) before deploying.',
        'Use staged rollouts and monitor for anomalies after updates.',
        'Maintain a software bill of materials and vendor risk reviews.',
        'Apply least privilege to vendor and update-management accounts.',
      ],
      mitreAttck: 'T1195',
    },
  },
];

export const EVENTS: GameEvent[] = RAW.map((e) => GameEvent.parse(e));

/** Events available for a given facility + role combination. */
export function eventsFor(facilityId: string, roleId: string): GameEvent[] {
  return EVENTS.filter(
    (e) =>
      (e.facilities as string[]).includes(facilityId) &&
      (e.roles as string[]).includes(roleId),
  );
}
