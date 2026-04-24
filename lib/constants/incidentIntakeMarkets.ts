/** Markets / regions at incident intake (aligned with escalation markets + common extras). */
export const INCIDENT_INTAKE_MARKETS = [
  'Germany',
  'Austria',
  'Switzerland',
  'France',
  'Belgium',
  'Netherlands',
  'Luxembourg',
  'Sweden',
  'Norway',
  'Denmark',
  'EU-wide',
  'Multiple regions',
] as const;

export type IncidentIntakeMarket = (typeof INCIDENT_INTAKE_MARKETS)[number];
