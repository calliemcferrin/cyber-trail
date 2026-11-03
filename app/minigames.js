'use strict';
/**
 * Mini-games (Model C: hybrid). Some events carry an interactive mini-game
 * instead of plain multiple-choice. Performance is GRADED into a band
 * (perfect / good / fail) that maps to resource deltas. Players may SKIP, which
 * is graded as a fail (worst-case loss).
 *
 * SECURITY / trust boundary: the answer key lives here on the server and is
 * NEVER sent to the client. The client submits only the player's raw result
 * (which items they picked, the order they chose, etc.); the server grades it.
 * A tampered client cannot award itself a better band.
 *
 * Each mini-game definition has:
 *   type     — which UI renderer to use
 *   config   — the puzzle data SENT to the client (no answer key)
 *   answer   — the hidden answer key used only for server-side grading
 *   grades   — resource deltas for each band, plus the debrief text per band
 *
 * Grading contract (per type) is implemented in `gradeMiniGame`.
 */

const MINIGAMES = {
  // ───────────────────────── Spot the Phish ─────────────────────────
  // Player clicks the suspicious elements ("tokens") in a message.
  spot_the_phish_invoice: {
    type: 'spot_the_phish',
    attackType: 'Phishing',
    config: {
      instructions:
        'Click every suspicious element in this email, then submit. Find the ' +
        'red flags a phishing message hides.',
      from: 'Accounts Payable <billing@blackwater-billing.co>',
      subject: 'URGENT: unpaid invoice — act within 2 hours',
      // Each token has an id; "suspicious" ones are the answer key (hidden).
      tokens: [
        { id: 't1', text: 'billing@blackwater-billing.co' },
        { id: 't2', text: 'URGENT' },
        { id: 't3', text: 'within 2 hours or your account is suspended' },
        { id: 't4', text: 'Dear Valued Customer' },
        { id: 't5', text: 'Click here to view your invoice' },
        { id: 't6', text: 'Thank you for your business' },
      ],
    },
    answer: {
      suspicious: ['t1', 't2', 't3', 't4', 't5'], // 5 of 6 are red flags
    },
    grades: {
      perfect: {
        effects: [{ key: 'integrity', amount: 8 }, { key: 'morale', amount: 2 }],
        outcome:
          'You caught the look-alike domain, the manufactured urgency, the ' +
          'generic greeting, and the deceptive link — then reported it. A ' +
          'textbook catch that protects everyone.',
      },
      good: {
        effects: [{ key: 'integrity', amount: 3 }],
        outcome:
          'You spotted most of the red flags — enough to be suspicious and not ' +
          'click. Train your eye on the ones you missed (the sender domain is ' +
          'the biggest tell).',
      },
      fail: {
        effects: [{ key: 'integrity', amount: -20 }, { key: 'morale', amount: -4 }],
        outcome:
          'You missed the red flags that mattered. This is exactly the message ' +
          'that harvests credentials — the mismatched domain, the urgency, and ' +
          'the link were the giveaways.',
      },
    },
  },

  spot_the_phish_safety: {
    type: 'spot_the_phish',
    attackType: 'Phishing',
    config: {
      instructions:
        'This "safety bulletin" wants you to log in. Click every suspicious ' +
        'element, then submit.',
      from: 'Pipeline Safety <alerts@cascade-gas-safety.net>',
      subject: 'MANDATORY acknowledgment required within the hour',
      tokens: [
        { id: 't1', text: 'alerts@cascade-gas-safety.net' },
        { id: 't2', text: 'MANDATORY … within the hour' },
        { id: 't3', text: 'or be flagged non-compliant' },
        { id: 't4', text: 'Sign in here to confirm you have read this' },
        { id: 't5', text: 'Q3 compressor maintenance schedule' },
      ],
    },
    answer: { suspicious: ['t1', 't2', 't3', 't4'] },
    grades: {
      perfect: {
        effects: [{ key: 'integrity', amount: 8 }, { key: 'morale', amount: 2 }],
        outcome:
          'You flagged the wrong domain, the compliance-deadline pressure, and ' +
          'the login link. Safety themes are bait in industrial settings — and ' +
          'you did not bite.',
      },
      good: {
        effects: [{ key: 'integrity', amount: 3 }],
        outcome:
          'Enough red flags spotted to stay safe. The sending domain ' +
          '("cascade-gas-safety.net", not your real intranet) was the key tell.',
      },
      fail: {
        effects: [{ key: 'integrity', amount: -18 }, { key: 'morale', amount: -3 }],
        outcome:
          'The lure worked. Urgent "compliance" bulletins with login links are a ' +
          'classic way into energy-sector networks.',
      },
    },
  },

  // ───────────────────────── Sort the Inbox ─────────────────────────
  // Player assigns each item to a bin: trust / verify / report.
  sort_inbox_requests: {
    type: 'sort_messages',
    attackType: 'Social Engineering',
    config: {
      instructions:
        'Triage each request into the right bin. Submit when done.',
      bins: [
        { id: 'trust', label: 'Act on it' },
        { id: 'verify', label: 'Verify first' },
        { id: 'report', label: 'Report as suspicious' },
      ],
      items: [
        { id: 'm1', text: 'A caller asks for your password to "fix" your account.' },
        { id: 'm2', text: 'Your manager asks in person to approve a leave request.' },
        { id: 'm3', text: 'An email says your director needs a gift card, kept secret.' },
        { id: 'm4', text: 'A vendor emails that their bank details have changed.' },
        { id: 'm5', text: 'IT emails from the official domain about scheduled patching.' },
      ],
    },
    answer: {
      // correct bin per item (hidden)
      map: { m1: 'report', m2: 'trust', m3: 'report', m4: 'verify', m5: 'trust' },
    },
    grades: {
      perfect: {
        effects: [{ key: 'integrity', amount: 8 }, { key: 'morale', amount: 2 }],
        outcome:
          'Perfect triage: you reported the credential and gift-card scams, ' +
          'verified the bank-change request out-of-band, and trusted the ' +
          'legitimate in-person and official-domain items.',
      },
      good: {
        effects: [{ key: 'integrity', amount: 3 }],
        outcome:
          'Mostly right. The trickiest ones: a bank-detail change always needs ' +
          'out-of-band verification, and any password/gift-card request is a ' +
          'report-it red flag.',
      },
      fail: {
        effects: [{ key: 'integrity', amount: -18 }, { key: 'morale', amount: -3 }],
        outcome:
          'Too many mis-sorts. Trusting a scam or reporting a legitimate request ' +
          'both cause harm — when unsure, verify before you act.',
      },
    },
  },

  // ───────────────────────── Build a Credential ─────────────────────────
  // Player selects the good practices (and avoids the bad ones).
  build_password_practices: {
    type: 'pick_practices',
    attackType: 'Password Hygiene / Credential Reuse',
    config: {
      instructions:
        'Select every practice that makes your account harder to break into. ' +
        'Avoid the bad habits. Submit when ready.',
      options: [
        { id: 'o1', text: 'A long, unique passphrase for this account' },
        { id: 'o2', text: 'Reuse your favorite personal password' },
        { id: 'o3', text: 'Store it in a reputable password manager' },
        { id: 'o4', text: 'Enable multi-factor authentication' },
        { id: 'o5', text: 'Write it on a sticky note under the keyboard' },
        { id: 'o6', text: 'Share it with a teammate "just in case"' },
      ],
    },
    answer: { good: ['o1', 'o3', 'o4'], bad: ['o2', 'o5', 'o6'] },
    grades: {
      perfect: {
        effects: [{ key: 'integrity', amount: 7 }, { key: 'morale', amount: 2 }],
        outcome:
          'Every good habit selected and every bad one avoided — unique ' +
          'passphrase, a password manager, and MFA. That combination defeats ' +
          'reuse, guessing, and stolen-password attacks.',
      },
      good: {
        effects: [{ key: 'integrity', amount: 3 }],
        outcome:
          'A solid set of habits with a slip or two. The non-negotiables: unique ' +
          'per account, stored safely (never on a sticky note), never shared, ' +
          'with MFA on.',
      },
      fail: {
        effects: [{ key: 'integrity', amount: -16 }],
        outcome:
          'Too many risky habits. Reuse, sticky notes, and sharing are exactly ' +
          'how accounts get taken over.',
      },
    },
  },

  // ───────── Spot the Phish: hospital benefits-deadline lure ─────────
  spot_the_phish_benefits: {
    type: 'spot_the_phish',
    attackType: 'Phishing',
    config: {
      instructions:
        'This "open enrollment" email wants you to log in. Click every ' +
        'suspicious element, then submit.',
      from: 'HR Benefits <benefits@stmercy-hr-portal.com>',
      subject: 'ACTION REQUIRED: confirm benefits before enrollment closes TONIGHT',
      tokens: [
        { id: 't1', text: 'benefits@stmercy-hr-portal.com' },
        { id: 't2', text: 'before enrollment closes TONIGHT' },
        { id: 't3', text: 'or you will lose your coverage' },
        { id: 't4', text: 'Log in here to confirm' },
        { id: 't5', text: 'Open Enrollment runs this month' },
      ],
    },
    answer: { suspicious: ['t1', 't2', 't3', 't4'] },
    grades: {
      perfect: {
        effects: [{ key: 'integrity', amount: 8 }, { key: 'morale', amount: 2 }],
        outcome:
          'You flagged the look-alike HR domain, the "tonight" deadline, the ' +
          'coverage-loss threat, and the login link. Seasonal, emotional lures ' +
          'like benefits deadlines are classic phishing bait.',
      },
      good: {
        effects: [{ key: 'integrity', amount: 3 }],
        outcome:
          'Enough red flags caught to stay safe. The sending domain and the ' +
          'manufactured deadline were the biggest tells.',
      },
      fail: {
        effects: [{ key: 'integrity', amount: -20 }, { key: 'morale', amount: -4 }],
        outcome:
          'The deadline pressure worked and credentials were harvested. Always ' +
          'reach the real portal from your own bookmark, never an email link.',
      },
    },
  },

  // ───────── Spot the Deepfake: red flags in a "viral" video ─────────
  spot_the_deepfake: {
    type: 'spot_the_phish',
    attackType: 'AI Exploitation / Deepfake Disinformation',
    config: {
      instructions:
        'A viral "emergency" video of an official is going around. Click every ' +
        'red flag that suggests it is an AI deepfake, then submit.',
      from: 'Posted by: @breaking_alerts_2am (unverified account)',
      subject: 'Clip: "County orders immediate evacuation — share now!"',
      tokens: [
        { id: 't1', text: 'Posted only by an unverified, brand-new account' },
        { id: 't2', text: 'Not on any official county channel or website' },
        { id: 't3', text: 'Mouth movements and audio are slightly out of sync' },
        { id: 't4', text: 'Urges you to "share now" before verifying' },
        { id: 't5', text: 'The official is a real person who exists' },
      ],
    },
    answer: { suspicious: ['t1', 't2', 't3', 't4'] },
    grades: {
      perfect: {
        effects: [{ key: 'integrity', amount: 8 }, { key: 'morale', amount: 2 }],
        outcome:
          'You spotted the unverified source, the absence from official ' +
          'channels, the lip-sync artifacts, and the "share now" urgency — the ' +
          'hallmarks of deepfake disinformation. Verify through official ' +
          'channels before believing or sharing.',
      },
      good: {
        effects: [{ key: 'integrity', amount: 3 }],
        outcome:
          'Good eye on most red flags. The strongest tell is simple: a real ' +
          'emergency order appears on official, authenticated channels — not ' +
          'only on an anonymous account.',
      },
      fail: {
        effects: [{ key: 'integrity', amount: -18 }, { key: 'morale', amount: -5 }],
        outcome:
          'The fake spread. Deepfakes exploit urgency and trust; the defense is ' +
          'to check official channels and resist the pressure to share instantly.',
      },
    },
  },

  // ───────── Pick Practices: defend against credential stuffing ─────────
  pick_credential_defenses: {
    type: 'pick_practices',
    attackType: 'Credential Stuffing / Password Attack',
    config: {
      instructions:
        'A flood of logins is hitting your portal with reused passwords. Select ' +
        'every defense that actually helps, and avoid the non-answers. Submit ' +
        'when ready.',
      options: [
        { id: 'o1', text: 'Require multi-factor authentication' },
        { id: 'o2', text: 'Rate-limit and lock out repeated failed logins' },
        { id: 'o3', text: 'Ban known-breached / reused passwords' },
        { id: 'o4', text: 'Email users asking them to "be careful"' },
        { id: 'o5', text: 'Shorten the minimum password length to reduce lockouts' },
        { id: 'o6', text: 'Monitor for logins from impossible-travel locations' },
      ],
    },
    answer: { good: ['o1', 'o2', 'o3', 'o6'], bad: ['o4', 'o5'] },
    grades: {
      perfect: {
        effects: [{ key: 'integrity', amount: 8 }],
        outcome:
          'Exactly right: MFA, rate-limiting/lockout, banning breached passwords, ' +
          'and anomaly detection all directly defeat credential stuffing — while ' +
          'a vague "be careful" email and weaker passwords do nothing (or hurt).',
      },
      good: {
        effects: [{ key: 'integrity', amount: 3 }],
        outcome:
          'Mostly solid. The single highest-value control is MFA — it makes a ' +
          'stolen password alone useless. Weakening password rules never helps.',
      },
      fail: {
        effects: [{ key: 'integrity', amount: -16 }],
        outcome:
          'Too many non-answers chosen. Awareness emails and shorter passwords ' +
          'do not stop automated credential stuffing — MFA and lockouts do.',
      },
    },
  },

  // ───────── Order the Response: zero-day with no patch ─────────
  order_zero_day_steps: {
    type: 'order_steps',
    attackType: 'Zero-Day Exploitation',
    config: {
      instructions:
        'An internet-facing appliance is being exploited via a zero-day with no ' +
        'patch yet. Put your response in the right order (first action at the ' +
        'top), then submit.',
      steps: [
        { id: 'z_reduce', text: 'Reduce exposure now (take it off the internet / restrict access)' },
        { id: 'z_mitigate', text: 'Apply the vendor\u2019s interim mitigations' },
        { id: 'z_hunt', text: 'Threat-hunt for signs it was already compromised' },
        { id: 'z_patch', text: 'Apply the real patch once the vendor ships it' },
      ],
    },
    answer: { order: ['z_reduce', 'z_mitigate', 'z_hunt', 'z_patch'] },
    grades: {
      perfect: {
        effects: [{ key: 'integrity', amount: 8 }, { key: 'uptime', amount: -5 }],
        outcome:
          'Cut exposure first, apply mitigations, assume compromise and hunt, ' +
          'then patch when available. With active exploitation and no patch, ' +
          'reducing exposure immediately is everything.',
      },
      good: {
        effects: [{ key: 'integrity', amount: 2 }, { key: 'uptime', amount: -6 }],
        outcome:
          'Close. The critical first move is to reduce exposure right away — ' +
          'waiting on anything while the flaw is internet-reachable invites a breach.',
      },
      fail: {
        effects: [{ key: 'integrity', amount: -18 }, { key: 'uptime', amount: -5 }],
        outcome:
          'That order left the appliance exposed too long. For a zero-day under ' +
          'active attack, exposure reduction must come before you wait for a patch.',
      },
    },
  },

  // ───────── Sort: verify-the-request triage (government) ─────────
  sort_verify_requests: {
    type: 'sort_messages',
    attackType: 'Social Engineering / Impersonation',
    config: {
      instructions:
        'High-pressure requests are coming in. Triage each one. Submit when done.',
      bins: [
        { id: 'trust', label: 'Act on it' },
        { id: 'verify', label: 'Verify out-of-band' },
        { id: 'report', label: 'Report as scam' },
      ],
      items: [
        { id: 'r1', text: 'A text "from a senior official" asks you to buy gift cards, in secret.' },
        { id: 'r2', text: 'A video call directs you to wire emergency funds to a new account now.' },
        { id: 'r3', text: 'A caller claiming to be IT asks you to approve an MFA prompt for them.' },
        { id: 'r4', text: 'Your teammate, in person, asks you to hold the lift for them.' },
        { id: 'r5', text: 'An email says a vendor\u2019s bank details changed; please update payments.' },
      ],
    },
    answer: { map: { r1: 'report', r2: 'verify', r3: 'report', r4: 'trust', r5: 'verify' } },
    grades: {
      perfect: {
        effects: [{ key: 'integrity', amount: 8 }, { key: 'morale', amount: 2 }],
        outcome:
          'Spot on: report the gift-card and MFA-approval scams, verify the ' +
          'fund-wire and bank-change requests out-of-band, and the in-person ' +
          'lift request is harmless. Urgency + secrecy + money = verify or report.',
      },
      good: {
        effects: [{ key: 'integrity', amount: 3 }],
        outcome:
          'Mostly right. Remember: any money movement or MFA approval requested ' +
          'under pressure needs out-of-band verification — or a report if it is ' +
          'an obvious scam pattern (gift cards, secrecy).',
      },
      fail: {
        effects: [{ key: 'integrity', amount: -18 }, { key: 'morale', amount: -3 }],
        outcome:
          'Too many mis-sorts. Acting on a deepfake wire request or an MFA-reset ' +
          'scam is how organizations lose money and access.',
      },
    },
  },

  // ───────────────────────── Contain the Breach ─────────────────────────
  // Player orders the response steps; speed/order matters.
  contain_ransomware_steps: {
    type: 'order_steps',
    attackType: 'Ransomware',
    config: {
      instructions:
        'Ransomware is spreading. Put the response steps in the right order ' +
        '(first action at the top), then submit.',
      steps: [
        { id: 's_isolate', text: 'Isolate the affected network segment' },
        { id: 's_ir', text: 'Activate the incident-response plan / notify leadership' },
        { id: 's_restore', text: 'Restore clean systems from tested offline backups' },
        { id: 's_review', text: 'Review and harden to prevent recurrence' },
      ],
    },
    answer: {
      // the correct order (hidden)
      order: ['s_isolate', 's_ir', 's_restore', 's_review'],
    },
    grades: {
      perfect: {
        effects: [{ key: 'integrity', amount: 8 }, { key: 'uptime', amount: -4 }],
        outcome:
          'Contain first (isolate), then mobilize (IR plan), then recover from ' +
          'backups, then harden. That order stops the spread before it reaches ' +
          'everything — exactly right.',
      },
      good: {
        effects: [{ key: 'integrity', amount: 2 }, { key: 'uptime', amount: -6 }],
        outcome:
          'Close. The single most important move is to isolate *first* — any ' +
          'delay lets the encryption spread to more systems and your backups.',
      },
      fail: {
        effects: [{ key: 'integrity', amount: -18 }, { key: 'uptime', amount: -6 }],
        outcome:
          'The order let the ransomware spread. Containment (isolation) has to ' +
          'come before investigation or recovery, or there is nothing clean left ' +
          'to restore.',
      },
    },
  },

  // ───────────────────── Terminal: Linux intrusion triage ─────────────────────
  // Adaptive difficulty: the player first picks a comfort level, which changes
  // how much HELP they get (not the score ceiling — perfect is reachable at any
  // level). A safe SIMULATION: no real shell, commands are matched to show
  // canned output. The server validates the submitted commands per step.
  terminal_linux_triage: {
    type: 'terminal',
    attackType: 'Intrusion Investigation (Linux basics)',
    config: {
      instructions:
        'An alert fired on a Linux server. Investigate it from the terminal. ' +
        'First, choose how much guidance you want \u2014 you can reach a perfect ' +
        'score at any level.',
      scenario:
        'You are a cyber operator. An EDR alert flags unusual activity on ' +
        '"wtp-scada-01". You have a shell. Work through the investigation one ' +
        'command at a time.',
      prompt: 'operator@wtp-scada-01:~$',
      // Each step: the task, the canonical command (shown in guided mode), a
      // plain-language explanation, a palette of candidate commands (shown in
      // comfortable mode), and the simulated output on success.
      steps: [
        {
          id: 'step_ls',
          task: 'List the files in the current directory, including hidden ones.',
          canonical: 'ls -la',
          explain:
            '`ls` lists directory contents; the `-l` flag shows details and ' +
            '`-a` includes hidden files (names starting with a dot). Attackers ' +
            'often hide files, so always look with `-a`.',
          palette: ['ls', 'ls -la', 'pwd', 'cd', 'cat'],
          output:
            'total 28\\n' +
            'drwxr-xr-x 3 operator operator 4096 .\\n' +
            'drwxr-xr-x 6 root     root     4096 ..\\n' +
            '-rw-r--r-- 1 operator operator  220 .bash_logout\\n' +
            '-rwxr-xr-x 1 root     root     1337 .update.sh   <-- unexpected, hidden, root-owned',
        },
        {
          id: 'step_who',
          task: 'See who is currently logged in to the machine.',
          canonical: 'who',
          explain:
            '`who` shows the users currently logged in and from where. An ' +
            'unexpected session is a strong sign of an intruder.',
          palette: ['who', 'whoami', 'ls', 'id', 'last'],
          output:
            'operator pts/0        10.0.0.5     (your session)\\n' +
            'root     pts/1        203.0.113.77 <-- root login from an unknown external IP',
        },
        {
          id: 'step_ps',
          task: 'List all running processes to find anything suspicious.',
          canonical: 'ps aux',
          explain:
            '`ps aux` lists every running process with its user and resource ' +
            'use. Malware frequently shows up as an odd process eating CPU.',
          palette: ['ps aux', 'top', 'ls -la', 'kill', 'jobs'],
          output:
            'USER  PID %CPU COMMAND\\n' +
            'root  931 98.7 /tmp/.update.sh   <-- suspicious script pegging the CPU\\n' +
            'root    1  0.0 /sbin/init',
        },
        {
          id: 'step_grep',
          task: 'Search the auth log for failed login attempts.',
          canonical: 'grep "Failed password" /var/log/auth.log',
          explain:
            '`grep` searches text for a pattern. Scanning /var/log/auth.log for ' +
            '"Failed password" reveals brute-force attempts; a success right ' +
            'after a flood of failures is a red flag.',
          palette: [
            'grep "Failed password" /var/log/auth.log',
            'cat /var/log/auth.log',
            'ls /var/log',
            'tail',
            'grep',
          ],
          output:
            'Failed password for root from 203.0.113.77 (x1,284)\\n' +
            'Accepted password for root from 203.0.113.77   <-- brute force succeeded',
        },
        {
          id: 'step_ss',
          task: 'Show active network connections to spot any outbound links.',
          canonical: 'ss -tunap',
          explain:
            '`ss` (or the older `netstat`) shows network sockets. An ' +
            'established outbound connection to an unknown host often means ' +
            'data exfiltration or command-and-control.',
          palette: ['ss -tunap', 'netstat -tunap', 'ping', 'ifconfig', 'who'],
          output:
            'ESTAB  10.0.0.9:49722  198.51.100.4:4444   /tmp/.update.sh\\n' +
            '<-- active connection to a suspicious external host on port 4444',
        },
      ],
    },
    answer: {
      // Accepted command patterns per step (hidden; used for grading all modes).
      // Matching is lenient: normalized whitespace, flexible flag order.
      accepted: {
        step_ls: ['ls -la', 'ls -al', 'ls -a -l', 'ls -l -a', 'ls -lah', 'ls - al', 'ls --all -l'],
        step_who: ['who', 'w'],
        step_ps: ['ps aux', 'ps -aux', 'ps -ef', 'ps aux --sort', 'top'],
        step_grep: [
          'grep "failed password" /var/log/auth.log',
          "grep 'failed password' /var/log/auth.log",
          'grep failed /var/log/auth.log',
          'grep "failed" /var/log/auth.log',
          'cat /var/log/auth.log | grep "failed password"',
          'grep -i "failed password" /var/log/auth.log',
        ],
        step_ss: [
          'ss -tunap', 'ss -tulnp', 'ss -tunp', 'ss -tan', 'ss -tulpn', 'ss',
          'netstat -tunap', 'netstat -tulnp', 'netstat -an', 'netstat -tulpn', 'netstat',
        ],
      },
      // "Right tool, wrong form" — the command is on the right track but
      // incomplete for the task. Grading gives a targeted nudge and a small,
      // recoverable deduction (the player can still type the full command and
      // earn the step's points minus the carelessness penalty). Hidden.
      partial: {
        step_ls: [
          { match: ['ls', 'ls -l', 'ls -a', 'dir'],
            hint: 'Right command — but plain `ls` hides the files that matter. ' +
              'Add flags to show ALL entries (including dotfiles) in LONG form, ' +
              'e.g. `ls -la`. Attackers hide droppers as dot-files.' },
        ],
        step_grep: [
          { match: ['cat /var/log/auth.log', 'less /var/log/auth.log', 'more /var/log/auth.log'],
            hint: 'That opens the whole log — right file, but you need to FILTER ' +
              'it. Use `grep` to pull just the "Failed password" lines so the ' +
              'brute force stands out, e.g. `grep "Failed password" /var/log/auth.log`.' },
        ],
      },
      // "Plausible but wrong" — commands a learner might reach for that do NOT
      // answer THIS step's question. Grading rejects them with a specific
      // teaching explanation (not a generic error) and the same small,
      // recoverable deduction once the player corrects. Hidden.
      rejected: {
        step_who: [
          { match: ['whoami', 'id', 'echo $user', 'echo $us-er'],
            why: '`whoami` (and `id`) print only YOUR OWN identity — they can\u2019t ' +
              'reveal the intruder. To see every session on the box, including ' +
              'the rogue root login from an unknown IP, use `who` (or `w`).' },
        ],
        step_ps: [
          { match: ['ls -la', 'ls', 'jobs'],
            why: '`jobs`/`ls` only show this shell\u2019s background jobs or files — ' +
              'not every process on the system. To find a CPU-pegging malicious ' +
              'process you need the full process table: `ps aux` (or `top`).' },
        ],
        step_ss: [
          { match: ['ping', 'ifconfig', 'ip a', 'ip addr'],
            why: '`ping`/`ifconfig` test or describe YOUR interface — they don\u2019t ' +
              'list active connections. To spot the command-and-control link you ' +
              'need the socket table: `ss -tunap` (or `netstat -tunap`).' },
        ],
      },
    },
    // Reward bands. "Perfect" is reachable at any comfort level (guidance only
    // changes help, not the ceiling). Reveals in comfortable mode cost a little.
    grades: {
      perfect: {
        effects: [{ key: 'integrity', amount: 9 }, { key: 'morale', amount: 2 }],
        outcome:
          'Clean investigation. You listed the hidden dropper, caught the rogue ' +
          'root login, found the CPU-pegging process, confirmed the brute force ' +
          'in the auth log, and spotted the command-and-control connection. ' +
          'That is exactly how an operator triages an intrusion.',
      },
      good: {
        effects: [{ key: 'integrity', amount: 4 }],
        outcome:
          'You worked through most of the investigation. Each command answers a ' +
          'question: what is here (ls), who is on (who), what is running (ps), ' +
          'what happened (grep the logs), and where it is talking (ss/netstat).',
      },
      fail: {
        effects: [{ key: 'integrity', amount: -16 }, { key: 'morale', amount: -3 }],
        outcome:
          'The investigation stalled. These core commands \u2014 ls, who, ps, grep, ' +
          'ss/netstat \u2014 are an operator\u2019s first toolkit for spotting an intruder. ' +
          'Worth practicing until they are second nature.',
      },
    },
  },

  // ───────────────── Trace the Intrusion (network kill-chain path) ─────────────────
  // Player clicks the network nodes in the ORDER the attack spread, following
  // the kill chain from entry point to the OT target. Graded like order_steps.
  trace_intrusion_path: {
    type: 'order_steps',
    attackType: 'Lateral Movement / Kill Chain',
    config: {
      instructions:
        'Logs show an intruder moved through the network. Reconstruct the path ' +
        'by selecting the nodes in the order the attack spread \u2014 from entry ' +
        'point to final target. Submit when done.',
      steps: [
        { id: 'n_email', text: 'Phished employee laptop (initial foothold via email)' },
        { id: 'n_ad', text: 'Domain controller (stole credentials, escalated privilege)' },
        { id: 'n_jump', text: 'IT/OT jump host (pivoted toward operations)' },
        { id: 'n_hmi', text: 'SCADA HMI workstation (reached the control layer)' },
        { id: 'n_plc', text: 'PLC / physical process (final target)' },
      ],
    },
    answer: { order: ['n_email', 'n_ad', 'n_jump', 'n_hmi', 'n_plc'] },
    grades: {
      perfect: {
        effects: [{ key: 'integrity', amount: 8 }, { key: 'morale', amount: 2 }],
        outcome:
          'You reconstructed the kill chain exactly: phished laptop \u2192 domain ' +
          'controller \u2192 jump host \u2192 HMI \u2192 PLC. Understanding how attackers move ' +
          'laterally from IT toward OT is how you cut them off and spot the next one.',
      },
      good: {
        effects: [{ key: 'integrity', amount: 3 }],
        outcome:
          'Close. Attacks typically start at an exposed human/IT asset and pivot ' +
          'step by step toward the OT target \u2014 each hop reusing access gained in ' +
          'the last. Segmentation and monitoring break that chain.',
      },
      fail: {
        effects: [{ key: 'integrity', amount: -16 }, { key: 'uptime', amount: -4 }],
        outcome:
          'The path was out of order. Reconstructing lateral movement matters: ' +
          'if you misread how the attacker reached the control layer, you will ' +
          'miss the chokepoints that stop it.',
      },
    },
  },

  // ───────────────── Segment the Network (zone assignment) ─────────────────
  // Everything sits on one flat network. Player assigns each device to the
  // correct zone (IT / DMZ / OT) so a breach can't cross freely. Like sorting.
  segment_network_zones: {
    type: 'sort_messages',
    attackType: 'Network Segmentation (IT/OT)',
    config: {
      instructions:
        'These devices are all on one flat network \u2014 a breach anywhere can ' +
        'reach everything. Assign each device to the right security zone so an ' +
        'intrusion is contained. Submit when done.',
      bins: [
        { id: 'it', label: 'IT (corporate)' },
        { id: 'dmz', label: 'DMZ (buffer)' },
        { id: 'ot', label: 'OT (control network)' },
      ],
      items: [
        { id: 'd_email', text: 'Staff email & office workstations' },
        { id: 'd_web', text: 'Public-facing customer web portal' },
        { id: 'd_hist', text: 'Data historian (shares OT data with IT)' },
        { id: 'd_plc', text: 'PLCs controlling pumps and valves' },
        { id: 'd_hmi', text: 'SCADA HMI operator consoles' },
        { id: 'd_jump', text: 'Vendor remote-access jump host' },
      ],
    },
    answer: {
      map: {
        d_email: 'it',
        d_web: 'dmz',
        d_hist: 'dmz',
        d_plc: 'ot',
        d_hmi: 'ot',
        d_jump: 'dmz',
      },
    },
    grades: {
      perfect: {
        effects: [{ key: 'integrity', amount: 9 }, { key: 'uptime', amount: -2 }],
        outcome:
          'Textbook segmentation: office IT stays in IT; internet-facing and ' +
          'bridging systems (web portal, data historian, vendor jump host) go in ' +
          'a monitored DMZ; and the PLCs and HMIs sit in a protected OT zone. Now ' +
          'a breach in one zone cannot freely reach the physical process.',
      },
      good: {
        effects: [{ key: 'integrity', amount: 3 }],
        outcome:
          'Mostly sound. The key rules: never put control devices (PLCs/HMIs) ' +
          'where IT can reach them directly, and anything that bridges IT and OT ' +
          '(historians, vendor access, public portals) belongs in a monitored DMZ.',
      },
      fail: {
        effects: [{ key: 'integrity', amount: -18 }, { key: 'uptime', amount: -3 }],
        outcome:
          'Too many devices in the wrong zone. Flat or mis-segmented networks are ' +
          'how an office-network breach ends up operating the pumps \u2014 the exact ' +
          'exposure behind incidents like Colonial Pipeline.',
      },
    },
  },
};

/**
 * Which events use a mini-game (Model C: hybrid — only some events do).
 * Maps an event id → a mini-game id. Events not listed stay multiple-choice.
 */
const EVENT_MINIGAMES = {
  // Spot the Phish
  phish_invoice_employee: 'spot_the_phish_invoice',
  phish_safety_bulletin_gas: 'spot_the_phish_safety',
  phish_hr_benefits_employee: 'spot_the_phish_benefits',
  gov_deepfake_video_operator: 'spot_the_deepfake',
  // Sort / triage
  bec_wire_employee: 'sort_inbox_requests',
  gov_bec_gift_card_employee: 'sort_verify_requests',
  // Pick practices
  password_reuse_employee: 'build_password_practices',
  credential_stuffing_operator: 'pick_credential_defenses',
  // Order the response
  ransomware_operator: 'contain_ransomware_steps',
  ransomware_ehr_operator: 'contain_ransomware_steps',
  zero_day_operator: 'order_zero_day_steps',
  // Terminal (adaptive Linux investigation)
  plc_logic_operator: 'terminal_linux_triage',
  // Trace the intrusion (network kill-chain path)
  data_exfil_operator: 'trace_intrusion_path',
  // Segment the network (IT/OT zone assignment)
  it_ot_convergence_gas: 'segment_network_zones',
  ot_segmentation_water: 'segment_network_zones',
};

function miniGameIdForEvent(eventId) {
  return EVENT_MINIGAMES[eventId] || null;
}

const clampPct = (n) => Math.max(0, Math.min(1, n));

/**
 * Normalize a typed shell command for lenient matching:
 * lowercase, collapse whitespace, trim, drop a trailing semicolon.
 * (Quotes are preserved loosely by also normalizing to straight quotes.)
 */
function normalizeCmd(s) {
  if (typeof s !== 'string') return '';
  return s
    .replace(/[\u2018\u2019\u201C\u201D]/g, "'") // smart quotes → straight
    .replace(/"/g, "'")
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\s*;\s*$/, '')
    .trim();
}

/**
 * Public, client-safe projection of a mini-game: config only, NO answer key.
 * `id` is the mini-game id so the client can submit it back.
 */
function publicMiniGame(id, def) {
  return { id: id, type: def.type, config: def.config, attackType: def.attackType };
}

function getMiniGame(id) {
  return MINIGAMES[id];
}

// Per-step deduction (0..1) for a careless attempt — "right tool, wrong flags"
// or a plausible-but-wrong command — that the player then corrected. Small and
// recoverable: you still earn the step, minus this. See HANDOFF / design notes.
const TERMINAL_CARELESS_DEDUCTION = 0.15;
// Reveal (comfortable mode) costs a little more than a careless retry.
const TERMINAL_REVEAL_DEDUCTION = 0.2;

/**
 * Classify a single typed command for a terminal step against the hidden key.
 * Returns one of: 'accepted' | 'partial' | 'rejected' | 'unknown'.
 * `partial`/`rejected` also return the teaching text so the client can show a
 * targeted nudge (the client never holds the key; it only learns about a
 * command it actually typed, after the server tells it).
 */
function classifyTerminalCommand(def, stepId, raw) {
  const typed = normalizeCmd(raw);
  if (!typed) return { kind: 'unknown' };
  const ans = def.answer || {};
  const accepted = (ans.accepted && ans.accepted[stepId]) || [];
  if (accepted.map(normalizeCmd).indexOf(typed) >= 0) return { kind: 'accepted' };
  const partial = (ans.partial && ans.partial[stepId]) || [];
  for (const p of partial) {
    if (matchesAny(typed, p.match)) return { kind: 'partial', text: p.hint };
  }
  const rejected = (ans.rejected && ans.rejected[stepId]) || [];
  for (const r of rejected) {
    if (matchesAny(typed, r.match)) return { kind: 'rejected', text: r.why };
  }
  return { kind: 'unknown' };
}

/**
 * Match a normalized command against a list of patterns. A pattern matches
 * either exactly, or as a whole-word command prefix (so `ping 8.8.8.8` matches
 * the pattern `ping`), but never a partial word (so `pingx` does NOT match
 * `ping`). Used only for partial/rejected teaching hints — never for grading.
 */
function matchesAny(typed, patterns) {
  for (const raw of patterns || []) {
    const pat = normalizeCmd(raw);
    if (!pat) continue;
    if (typed === pat) return true;
    if (typed === pat || typed.indexOf(pat + ' ') === 0) return true;
  }
  return false;
}

/**
 * Grade the terminal mini-game from per-step ATTEMPT HISTORY. The client submits
 * `attempts` = { stepId: ["cmd1", "cmd2", ...] } (every command the player ran
 * for that step, in order) plus `reveals` (steps where they revealed the answer)
 * and `downgraded` (whether they dropped difficulty from expert).
 *
 * Trust boundary: the server RE-DERIVES the outcome of every step from the hidden
 * answer key. The client cannot claim full credit — the deduction for a careless
 * attempt (wrong flags / plausible-but-wrong before the correct command) and the
 * reveal penalty are computed here, from the real attempt log. A `downgraded` run
 * is capped at the 'good' band (perfect unreachable once help was taken).
 *
 * Backward-compatible: if `attempts` is absent but the legacy `steps`
 * ({stepId: finalCommand}) is present, each step is graded on that single value.
 */
function scoreTerminal(def, result, skipped) {
  const steps = def.config.steps;
  const reveals = Array.isArray(result && result.reveals) ? result.reveals : [];
  const downgraded = Boolean(result && result.downgraded);

  // Normalize input to an attempts-per-step array.
  const attemptsByStep = {};
  if (result && result.attempts && typeof result.attempts === 'object') {
    for (const s of steps) {
      const a = result.attempts[s.id];
      attemptsByStep[s.id] = Array.isArray(a) ? a : (a != null ? [a] : []);
    }
  } else {
    const legacy = (result && result.steps) || {};
    for (const s of steps) {
      attemptsByStep[s.id] = legacy[s.id] != null ? [legacy[s.id]] : [];
    }
  }

  const review = [];
  let total = 0;
  for (const s of steps) {
    const attempts = attemptsByStep[s.id] || [];
    const revealed = reveals.indexOf(s.id) >= 0;

    // Walk the attempt history: did they ever reach an accepted command, and did
    // they make a careless (partial/rejected) attempt before getting there?
    let reachedCorrect = false;
    let carelessBefore = false;
    let lastHint = null;
    let lastTyped = null;
    for (const raw of attempts) {
      const c = classifyTerminalCommand(def, s.id, raw);
      if (c.kind === 'accepted') { reachedCorrect = true; lastTyped = raw; break; }
      if (c.kind === 'partial' || c.kind === 'rejected') {
        carelessBefore = true;
        lastHint = c.text;
      }
      lastTyped = raw;
    }

    let credit = 0;
    let ok = false;
    let detail;
    if (reachedCorrect) {
      let deduction = 0;
      if (revealed) deduction += TERMINAL_REVEAL_DEDUCTION;
      if (carelessBefore) deduction += TERMINAL_CARELESS_DEDUCTION;
      credit = Math.max(0, 1 - deduction);
      ok = credit >= 0.999; // only a clean first-try solve counts as fully "ok"
      detail = credit >= 0.999
        ? 'Correct: `' + (lastTyped || s.canonical) + '`'
        : 'Correct after a nudge: `' + (lastTyped || s.canonical) + '`'
          + (revealed ? ' (answer revealed, −' + TERMINAL_REVEAL_DEDUCTION + ')' : '')
          + (carelessBefore ? ' (careless attempt first, −' + TERMINAL_CARELESS_DEDUCTION + ')' : '');
    } else if (lastHint) {
      // Ended on a partial/rejected attempt without ever correcting.
      credit = 0;
      ok = false;
      detail = lastHint;
    } else if (attempts.length) {
      credit = 0;
      ok = false;
      detail = 'Wrong: you ran `' + lastTyped + '` — try e.g. `' + s.canonical + '`';
    } else {
      credit = 0;
      ok = false;
      detail = 'Not attempted — the command was `' + s.canonical + '`';
    }
    total += credit;
    review.push({ label: s.task, ok, detail });
  }

  const score = clampPct(total / steps.length);
  const graded = withReview(score, review, skipped);
  // Downgrade cap: once the player dropped difficulty, 'perfect' is off the table.
  if (downgraded && !skipped && graded.band === 'perfect') {
    graded.band = 'good';
  }
  return graded;
}

/**
 * Grade a submitted result (server-side) into a band: 'perfect' | 'good' | 'fail'.
 * `result` shape depends on type. `skipped === true` always grades as 'fail'.
 * Returns { band, score, wrongCount, review } where:
 *   - score is 0..1
 *   - wrongCount is the number of items the player got wrong/missed
 *   - review is an array of { label, ok, detail } describing each item, so the
 *     UI can show the player exactly where they went wrong.
 */
function scoreMiniGame(def, result, skipped) {
  const type = def.type;

  if (type === 'spot_the_phish') {
    const correct = new Set(def.answer.suspicious);
    const tokens = def.config.tokens;
    const pickedSet = new Set(
      (Array.isArray(result && result.selected) ? result.selected : []).filter(
        (id) => tokens.some((t) => t.id === id),
      ),
    );
    const review = [];
    let hits = 0;
    let falseAlarms = 0;
    for (const t of tokens) {
      const isFlag = correct.has(t.id);
      const picked = pickedSet.has(t.id);
      let ok;
      let detail;
      if (isFlag && picked) { ok = true; detail = 'Correctly flagged'; hits++; }
      else if (isFlag && !picked) { ok = false; detail = 'Missed — this was a red flag'; }
      else if (!isFlag && picked) { ok = false; detail = 'False alarm — this one was fine'; falseAlarms++; }
      else { ok = true; detail = 'Correctly left alone'; }
      review.push({ label: t.text, ok, detail });
    }
    const score = clampPct(hits / correct.size - 0.25 * falseAlarms);
    return withReview(score, review, skipped);
  }

  if (type === 'sort_messages') {
    const map = def.answer.map;
    const binLabel = {};
    for (const b of def.config.bins) binLabel[b.id] = b.label;
    const assign = (result && result.assignments) || {};
    const review = [];
    let right = 0;
    for (const it of def.config.items) {
      const chosen = assign[it.id];
      const correctBin = map[it.id];
      const ok = chosen === correctBin;
      if (ok) right++;
      review.push({
        label: it.text,
        ok,
        detail: ok
          ? 'Correct: ' + (binLabel[correctBin] || correctBin)
          : 'You chose "' + (binLabel[chosen] || chosen || '—') +
            '"; correct was "' + (binLabel[correctBin] || correctBin) + '"',
      });
    }
    return withReview(clampPct(right / def.config.items.length), review, skipped);
  }

  if (type === 'pick_practices') {
    const good = new Set(def.answer.good);
    const bad = new Set(def.answer.bad);
    const total = good.size + bad.size;
    const picked = new Set(
      Array.isArray(result && result.selected) ? result.selected : [],
    );
    const review = [];
    let correct = 0;
    for (const o of def.config.options) {
      const isGood = good.has(o.id);
      const chosen = picked.has(o.id);
      const ok = isGood ? chosen : !chosen;
      if (ok) correct++;
      let detail;
      if (isGood && chosen) detail = 'Good practice — correctly chosen';
      else if (isGood && !chosen) detail = 'Missed — this is a good practice';
      else if (!isGood && chosen) detail = 'Risky — should NOT be chosen';
      else detail = 'Risky — correctly avoided';
      review.push({ label: o.text, ok, detail });
    }
    return withReview(clampPct(correct / total), review, skipped);
  }

  if (type === 'order_steps') {
    const order = def.answer.order;
    const byId = {};
    for (const s of def.config.steps) byId[s.id] = s.text;
    const submitted = Array.isArray(result && result.order) ? result.order : [];
    const review = [];
    let rightPos = 0;
    for (let i = 0; i < order.length; i++) {
      const ok = submitted[i] === order[i];
      if (ok) rightPos++;
      review.push({
        label: 'Position ' + (i + 1),
        ok,
        detail: ok
          ? 'Correct: ' + byId[order[i]]
          : 'You put "' + (byId[submitted[i]] || '—') +
            '"; correct was "' + byId[order[i]] + '"',
      });
    }
    const firstRight = submitted[0] === order[0];
    let score = rightPos / order.length;
    if (!firstRight) score = Math.min(score, 0.5);
    return withReview(clampPct(score), review, skipped);
  }

  if (type === 'terminal') {
    return scoreTerminal(def, result, skipped);
  }

  // Unknown type → treat as fail (defensive).
  return { band: 'fail', score: 0, wrongCount: 0, review: [] };
}

/**
 * Wrap a score + review into the final grade object. A SKIP always grades as a
 * fail band (full loss) but still returns the review so the player can learn.
 */
function withReview(score, review, skipped) {
  const wrongCount = review.filter((r) => !r.ok).length;
  const band = skipped ? 'fail' : bandFromScore(score).band;
  return { band, score, wrongCount, review, skipped: !!skipped };
}

function bandFromScore(score) {
  if (score >= 0.999) return { band: 'perfect', score };
  if (score >= 0.6) return { band: 'good', score };
  return { band: 'fail', score };
}

/**
 * Classify a single typed command for live terminal feedback, WITHOUT leaking
 * the answer key. Returns only what pertains to the command the player actually
 * typed:
 *   { kind, output?, hint?, canonicalShown? }
 * - 'accepted' → includes the step's simulated `output` so the terminal can
 *   print it (the output is not a secret; it's the whole point of the sim).
 * - 'partial' / 'rejected' → includes the teaching `hint` for THAT command.
 * - 'unknown' → nothing but the kind.
 * This is the only terminal data the server hands back mid-step, so a player
 * cannot enumerate the key: an 'unknown' reveals nothing, and accepted/partial/
 * rejected only confirm a command the player already chose to type.
 */
function classifyTerminalLive(def, stepId, raw) {
  const step = (def.config.steps || []).find((s) => s.id === stepId);
  if (!step) return { kind: 'unknown' };
  const c = classifyTerminalCommand(def, stepId, raw);
  if (c.kind === 'accepted') return { kind: 'accepted', output: step.output };
  if (c.kind === 'partial') return { kind: 'partial', hint: c.text };
  if (c.kind === 'rejected') return { kind: 'rejected', hint: c.text };
  return { kind: 'unknown' };
}

module.exports = {
  MINIGAMES,
  EVENT_MINIGAMES,
  miniGameIdForEvent,
  getMiniGame,
  publicMiniGame,
  scoreMiniGame,
  classifyTerminalLive,
  TERMINAL_CARELESS_DEDUCTION,
  TERMINAL_REVEAL_DEDUCTION,
  // Source access for the offline standalone build (build-standalone.js), which
  // inlines these REAL implementations so the demo's grading/classification
  // matches the server. Not used by the server runtime.
  _internal: {
    normalizeCmd,
    matchesAny,
    classifyTerminalCommand,
    classifyTerminalLive,
    bandFromScore,
    withReview,
    scoreTerminal,
    scoreMiniGame,
    miniGameIdForEvent,
    getMiniGame,
    publicMiniGame,
  },
};
