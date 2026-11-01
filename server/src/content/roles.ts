import { RoleDef } from '@cyber-trail/shared';

export const ROLES: Record<string, RoleDef> = {
  employee: RoleDef.parse({
    id: 'employee',
    name: 'Entry-Level Employee',
    tagline: 'The human firewall on the ground floor.',
    description:
      'You are the first line of defense. Most breaches start with a person, ' +
      'not a machine. Learn to spot social engineering, phishing, and the ' +
      'quiet manipulation that turns a helpful employee into an entry point.',
  }),
  operator: RoleDef.parse({
    id: 'operator',
    name: 'Cyber Operator',
    tagline: 'Hands on the keyboard in the SOC.',
    description:
      'You detect, triage, and respond. Alerts are flooding in and not all of ' +
      'them matter. Learn to contain incidents, patch wisely, and segment ' +
      'networks before a foothold becomes a catastrophe.',
  }),
  supervisor: RoleDef.parse({
    id: 'supervisor',
    name: 'Supervisor',
    tagline: 'The buck stops at your desk.',
    description:
      'You control budget, policy, and people. Every dollar spent on defense ' +
      'is a dollar not spent elsewhere. Learn to balance risk, build a ' +
      'security culture, and lead when the crisis is real.',
  }),
};

export function getRole(id: string): RoleDef | undefined {
  return ROLES[id];
}
