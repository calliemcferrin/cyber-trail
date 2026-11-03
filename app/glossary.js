'use strict';
/**
 * Central glossary of acronyms/jargon used in player-facing text.
 *
 * The questions themselves stay concise (just the acronym). The UI shows an
 * optional, collapsible "Beyond the acronym" reference listing only the terms
 * that actually appear in the current scenario — so players who already know
 * the jargon never have to read the expansion, and those who don't can expand
 * it on demand.
 */

const GLOSSARY = {
  AI: 'Artificial intelligence — software that can generate text, images, audio, or video, or make decisions, often by learning from large amounts of data.',
  ARP: 'Address Resolution Protocol — how devices on a local network map an IP address to a hardware (MAC) address; attackers can spoof it to reroute traffic.',
  BEC: 'Business Email Compromise — a scam where attackers impersonate an executive or vendor over email to trick staff into sending money or data.',
  CDN: 'Content Delivery Network — a distributed set of servers that deliver web content quickly and can help absorb traffic floods.',
  DDoS: 'Distributed Denial of Service — flooding a system with traffic from many sources to knock it offline.',
  DLP: 'Data Loss Prevention — tools that detect and block sensitive data from leaving the organization.',
  DMZ: 'Demilitarized Zone — a buffer network segment between a trusted internal network and an untrusted one, used to control what can cross.',
  DNS: 'Domain Name System — the "phone book" of the internet that translates domain names into IP addresses.',
  ED: 'Emergency Department — the hospital unit that treats urgent, walk-in, and ambulance patients.',
  EDR: 'Endpoint Detection and Response — security software that monitors devices (endpoints) for threats and helps respond to them.',
  EHR: 'Electronic Health Record — the digital system holding patients\u2019 charts and medical history.',
  HMI: 'Human-Machine Interface — the screen/console operators use to monitor and control an industrial process.',
  HR: 'Human Resources — the department that manages hiring, employment, and personnel matters.',
  IP: 'Internet Protocol address — the numeric address identifying a device on a network.',
  IT: 'Information Technology — the systems and staff that run an organization\u2019s computers, networks, and business software.',
  LLM: 'Large Language Model — the type of AI behind chatbots that generate human-like text.',
  MFA: 'Multi-Factor Authentication — requiring a second proof of identity (like a phone prompt or hardware key) in addition to a password.',
  OEM: 'Original Equipment Manufacturer — the company that built a piece of equipment and often services or updates it.',
  OSINT: 'Open-Source Intelligence — information gathered from publicly available sources like records, websites, and social media.',
  OT: 'Operational Technology — the systems that monitor and control physical equipment and industrial processes.',
  PLC: 'Programmable Logic Controller — a rugged industrial computer that directly controls physical equipment such as pumps, valves, and breakers.',
  QR: 'Quick-Response code — the square barcode you scan with a phone camera; it hides a link behind an image.',
  RCE: 'Remote Code Execution — a vulnerability that lets an attacker run their own code on a system over the network.',
  SCADA: 'Supervisory Control and Data Acquisition — the control system that monitors and operates industrial processes across a facility.',
  SQL: 'Structured Query Language — the language used to query databases; "SQL injection" abuses inputs to run unintended database commands.',
  SSN: 'Social Security Number — a sensitive US government-issued personal identifier.',
  TLS: 'Transport Layer Security — the encryption that protects data in transit (the padlock / "https" in your browser).',
  USB: 'Universal Serial Bus — the common port/connector for plugging in devices like flash drives.',
  VLAN: 'Virtual LAN — a way to split one physical network into isolated logical segments.',
  VPN: 'Virtual Private Network — an encrypted tunnel that carries traffic securely over an untrusted network.',
  WAF: 'Web Application Firewall — a filter in front of a web app that blocks malicious requests.',
};

/**
 * Terms that are whole words / have clear boundaries. We match on word
 * boundaries and a few known plural/possessive forms so detection is accurate
 * and doesn't fire on substrings (e.g. "IT" inside "security").
 */
const TERMS = Object.keys(GLOSSARY);

/**
 * Deeper "why it matters / how it's used" notes for the harder OT and
 * networking acronyms. These enrich the inline popup (and the bottom glossary)
 * with a concrete use case beyond the one-line definition. Common/everyday
 * acronyms (AI, IT, HR, etc.) intentionally have no use case — the short
 * definition is enough.
 *
 * Kept as a parallel map so GLOSSARY[term] stays a plain string (no breaking
 * change); glossaryFor() merges the two into { term, definition, useCase }.
 */
const USE_CASES = {
  // ── OT / industrial ──
  SCADA:
    'In this game, a facility\u2019s SCADA system is what an operator watches to ' +
    'see tank levels, pressures, and breaker states, and what they use to send ' +
    'commands to the plant. Attackers target SCADA because reaching it means ' +
    'they can observe or manipulate the physical process itself — exactly the ' +
    'kind of access behind incidents like the Oldsmar water plant tampering.',
  OT:
    'OT is the "operations" half of a facility (pumps, valves, turbines, ' +
    'controllers) as opposed to IT (email, files, business apps). The central ' +
    'lesson of the game is keeping OT separated from IT: when the two are flat ' +
    'on one network, an office phishing email can end up reaching the equipment ' +
    'that moves water, gas, or power.',
  PLC:
    'A PLC is the small rugged computer physically wired to a pump, valve, or ' +
    'breaker — it executes the control logic in real time. If an attacker ' +
    'changes a PLC\u2019s logic or setpoints, the physical process misbehaves ' +
    '(a valve opens, a dose changes) even while the screens may look normal.',
  HMI:
    'The HMI is the operator\u2019s screen/console view into the process. Because ' +
    'it both displays status and issues commands, a compromised HMI lets an ' +
    'attacker both hide what\u2019s really happening and drive the equipment — ' +
    'which is why it sits in the protected OT zone, not on the office network.',
  OEM:
    'The OEM is the vendor that built (and often remotely services) a piece of ' +
    'equipment. OEM remote-access and update channels are a common way in: a ' +
    'trusted vendor connection or a tampered vendor update can carry an attacker ' +
    'straight into OT, so these links belong in a monitored DMZ.',
  // ── networking / security ──
  ARP:
    'On a local network, ARP maps IP addresses to hardware (MAC) addresses. An ' +
    'attacker who "ARP-spoofs" can quietly insert themselves between two devices ' +
    'to read or alter traffic — the mechanism behind many man-in-the-middle ' +
    'attacks you\u2019ll face in the game.',
  DLP:
    'DLP tools watch for sensitive data (patient records, SSNs, designs) leaving ' +
    'the organization and block it. In a breach scenario, DLP is a safety net ' +
    'that can stop an attacker from exfiltrating data even after they get in.',
  DMZ:
    'A DMZ is a buffer zone between the untrusted internet and your trusted ' +
    'internal network. Systems that must talk to both (public web portals, data ' +
    'historians, vendor jump hosts) live here and are monitored, so a breach of ' +
    'one can\u2019t freely reach IT or OT — a core idea in the segmentation mini-game.',
  EDR:
    'EDR is security software on each device (endpoint) that watches behavior ' +
    'and can alert or respond to threats. In the game it\u2019s what surfaces the ' +
    'alert that starts an intrusion investigation — your early-warning system on ' +
    'a compromised host.',
  RCE:
    'An RCE flaw lets an attacker run their own code on a system over the ' +
    'network — one of the most dangerous bug classes. An internet-facing service ' +
    'with an unpatched RCE is how a remote attacker gets their first foothold ' +
    'before moving deeper.',
  TLS:
    'TLS is the encryption behind "https" and the padlock — it protects data in ' +
    'transit so eavesdroppers can\u2019t read or tamper with it. Missing or ' +
    'downgraded TLS is what makes the man-in-the-middle scenarios possible.',
  VLAN:
    'A VLAN splits one physical network into isolated logical segments. It\u2019s a ' +
    'practical tool for segmentation: putting OT devices on their own VLAN keeps ' +
    'an office-network breach from reaching the control equipment.',
  WAF:
    'A WAF sits in front of a web application and filters out malicious requests ' +
    '(like SQL-injection attempts). In the game it\u2019s a key defense for a ' +
    'public-facing portal under web attack.',
  OSINT:
    'OSINT is intelligence gathered from public sources — social media, records, ' +
    'websites. Attackers use it to craft convincing phishing and impersonation ' +
    '(and in this game, to solve the supervisor access puzzle), which is why ' +
    'oversharing publicly is a real risk.',
  BEC:
    'BEC is a scam where attackers impersonate an executive or vendor by email to ' +
    'trick staff into wiring money or changing payment details. It relies on ' +
    'authority and urgency, not malware — the human-judgment challenge in several ' +
    'triage mini-games.',
  DDoS:
    'A DDoS floods a system with junk traffic from many sources to knock it ' +
    'offline. For critical infrastructure the threat is to availability (uptime): ' +
    'defenses include rate-limiting, upstream scrubbing, and a CDN to absorb load.',
  MFA:
    'MFA requires a second proof of identity beyond a password (a phone prompt, ' +
    'a hardware key). It\u2019s the single highest-value control against stolen or ' +
    'reused passwords — a correct answer in the password and credential-stuffing ' +
    'mini-games.',
  CDN:
    'A CDN is a large distributed network of servers that delivers content and ' +
    'can absorb traffic spikes — including the flood from a DDoS, which is why ' +
    'it shows up as a defense against availability attacks.',
  DNS:
    'DNS is the internet\u2019s phone book, translating names to IP addresses. ' +
    'Poisoning or hijacking DNS lets an attacker redirect users to malicious ' +
    'servers, so DNS integrity is part of defending against redirection attacks.',
  LLM:
    'An LLM is the AI behind chatbots that generate human-like text. Attackers ' +
    'use LLMs to mass-produce convincing phishing and deepfake scripts, raising ' +
    'the quality of social-engineering lures you must learn to spot.',
  SQL:
    'SQL is the language used to query databases. "SQL injection" abuses an ' +
    'input field to run unintended database commands — the web-application attack ' +
    'a WAF and good input validation are meant to stop.',
  VPN:
    'A VPN is an encrypted tunnel carrying traffic over an untrusted network. ' +
    'It\u2019s commonly used for remote access — and a compromised VPN account (no ' +
    'MFA) is a frequent initial-access path into a network.',
};

/** Build a single string of the player-facing text for an event. */
function eventText(event) {
  const parts = [event.prompt];
  for (const c of event.choices) {
    parts.push(c.label);
    parts.push(c.outcome);
  }
  return parts.join(' \u241F ');
}

/**
 * Detect which glossary terms appear in an event's player-facing text.
 * Returns an array of { term, definition } sorted alphabetically.
 * Matching is case-sensitive on the acronym with word boundaries, plus an
 * optional trailing "s" (plural) — acronyms are uppercase, so this avoids
 * false hits on lowercase words.
 */
function glossaryFor(event) {
  const text = eventText(event);
  const found = [];
  for (const term of TERMS) {
    // Escape regex-special chars just in case; match as a standalone token.
    const esc = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp('(^|[^A-Za-z0-9])' + esc + 's?([^A-Za-z0-9]|$)');
    if (re.test(text)) {
      const entry = { term, definition: GLOSSARY[term] };
      if (USE_CASES[term]) entry.useCase = USE_CASES[term];
      found.push(entry);
    }
  }
  found.sort((a, b) => a.term.localeCompare(b.term));
  return found;
}

module.exports = {
  GLOSSARY,
  USE_CASES,
  glossaryFor,
  // Source access for the offline standalone build (build-standalone.js).
  _internal: { eventText, TERMS },
};
