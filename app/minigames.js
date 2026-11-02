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
};

/**
 * Which events use a mini-game (Model C: hybrid — only some events do).
 * Maps an event id → a mini-game id. Events not listed stay multiple-choice.
 */
const EVENT_MINIGAMES = {
  phish_invoice_employee: 'spot_the_phish_invoice',
  phish_safety_bulletin_gas: 'spot_the_phish_safety',
  password_reuse_employee: 'build_password_practices',
  ransomware_operator: 'contain_ransomware_steps',
  ransomware_ehr_operator: 'contain_ransomware_steps',
  bec_wire_employee: 'sort_inbox_requests',
};

function miniGameIdForEvent(eventId) {
  return EVENT_MINIGAMES[eventId] || null;
}

const clampPct = (n) => Math.max(0, Math.min(1, n));

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

/**
 * Grade a submitted result (server-side) into a band: 'perfect' | 'good' | 'fail'.
 * `result` shape depends on type. `skipped === true` always grades as 'fail'.
 * Returns { band, score } where score is 0..1.
 */
function scoreMiniGame(def, result, skipped) {
  if (skipped) return { band: 'fail', score: 0 };
  const type = def.type;

  if (type === 'spot_the_phish') {
    const correct = new Set(def.answer.suspicious);
    const allTokens = def.config.tokens.map((t) => t.id);
    const benign = new Set(allTokens.filter((id) => !correct.has(id)));
    const picked = Array.isArray(result && result.selected) ? result.selected : [];
    const pickedSet = new Set(picked.filter((id) => allTokens.includes(id)));
    let hits = 0;
    for (const id of correct) if (pickedSet.has(id)) hits++;
    let falseAlarms = 0;
    for (const id of pickedSet) if (benign.has(id)) falseAlarms++;
    // score = fraction of red flags found minus a penalty for false alarms.
    const score = clampPct(hits / correct.size - 0.25 * falseAlarms);
    return bandFromScore(score);
  }

  if (type === 'sort_messages') {
    const map = def.answer.map;
    const ids = Object.keys(map);
    const assign = (result && result.assignments) || {};
    let right = 0;
    for (const id of ids) if (assign[id] === map[id]) right++;
    return bandFromScore(clampPct(right / ids.length));
  }

  if (type === 'pick_practices') {
    const good = new Set(def.answer.good);
    const bad = new Set(def.answer.bad);
    const total = good.size + bad.size;
    const picked = new Set(
      Array.isArray(result && result.selected) ? result.selected : [],
    );
    let correct = 0;
    for (const id of good) if (picked.has(id)) correct++; // good correctly picked
    for (const id of bad) if (!picked.has(id)) correct++; // bad correctly avoided
    return bandFromScore(clampPct(correct / total));
  }

  if (type === 'order_steps') {
    const order = def.answer.order;
    const submitted = Array.isArray(result && result.order) ? result.order : [];
    let rightPos = 0;
    for (let i = 0; i < order.length; i++) {
      if (submitted[i] === order[i]) rightPos++;
    }
    // Bonus emphasis: the first step being correct is critical.
    const firstRight = submitted[0] === order[0];
    let score = rightPos / order.length;
    if (!firstRight) score = Math.min(score, 0.5); // cap if containment wasn't first
    return bandFromScore(clampPct(score));
  }

  // Unknown type → treat as fail (defensive).
  return { band: 'fail', score: 0 };
}

function bandFromScore(score) {
  if (score >= 0.999) return { band: 'perfect', score };
  if (score >= 0.6) return { band: 'good', score };
  return { band: 'fail', score };
}

module.exports = {
  MINIGAMES,
  EVENT_MINIGAMES,
  miniGameIdForEvent,
  getMiniGame,
  publicMiniGame,
  scoreMiniGame,
};
