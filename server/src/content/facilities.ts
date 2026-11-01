import { FacilityDef } from '@cyber-trail/shared';

/**
 * Facility definitions. Validated at load time so malformed content fails fast.
 */
export const FACILITIES: Record<string, FacilityDef> = {
  water: FacilityDef.parse({
    id: 'water',
    name: 'Blackwater Municipal Water Treatment',
    sector: 'Water & Wastewater Systems',
    tagline: 'Keep the city hydrated. Keep the chemicals in balance.',
    description:
      'A mid-sized municipal water treatment plant running aging SCADA ' +
      'systems. A single setpoint tampered with can poison a water supply — ' +
      'as nearly happened in Oldsmar, Florida in 2021.',
    startingResources: { integrity: 80, uptime: 90, budget: 60, morale: 70 },
    stages: 6,
  }),
  power: FacilityDef.parse({
    id: 'power',
    name: 'Grid North Regional Electric',
    sector: 'Energy',
    tagline: 'Keep the lights on across three counties.',
    description:
      'A regional electric utility operating substations and a control ' +
      'center. In 2015, attackers used BlackEnergy malware to black out ' +
      'parts of Ukraine — operator vigilance is everything here.',
    startingResources: { integrity: 75, uptime: 85, budget: 70, morale: 65 },
    stages: 6,
  }),
};

export function getFacility(id: string): FacilityDef | undefined {
  return FACILITIES[id];
}
