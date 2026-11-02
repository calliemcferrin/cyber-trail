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
      found.push({ term, definition: GLOSSARY[term] });
    }
  }
  found.sort((a, b) => a.term.localeCompare(b.term));
  return found;
}

module.exports = { GLOSSARY, glossaryFor };
