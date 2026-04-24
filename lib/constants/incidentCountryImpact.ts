import type { CountryImpact, IncidentCountry } from '../types';

export const INCIDENT_COUNTRY_GROUPS: Record<
  string,
  readonly { code: IncidentCountry; flag: string; name: string }[]
> = {
  'BNL + France': [
    { code: 'BE', flag: '🇧🇪', name: 'Belgium' },
    { code: 'LU', flag: '🇱🇺', name: 'Luxembourg' },
    { code: 'NL', flag: '🇳🇱', name: 'Netherlands' },
    { code: 'FR', flag: '🇫🇷', name: 'France' },
  ],
  DACH: [
    { code: 'DE', flag: '🇩🇪', name: 'Germany' },
    { code: 'AT', flag: '🇦🇹', name: 'Austria' },
    { code: 'CH', flag: '🇨🇭', name: 'Switzerland' },
  ],
  Nordics: [
    { code: 'SE', flag: '🇸🇪', name: 'Sweden' },
    { code: 'DK', flag: '🇩🇰', name: 'Denmark' },
    { code: 'NO', flag: '🇳🇴', name: 'Norway' },
  ],
} as const;

/** All jurisdictions tracked in the impact table (same order as wizard / detail). */
export const ALL_INCIDENT_COUNTRY_CODES: IncidentCountry[] = [
  ...INCIDENT_COUNTRY_GROUPS['BNL + France'].map((c) => c.code),
  ...INCIDENT_COUNTRY_GROUPS.DACH.map((c) => c.code),
  ...INCIDENT_COUNTRY_GROUPS.Nordics.map((c) => c.code),
];

export function emptyCountryImpactRows(): CountryImpact[] {
  return ALL_INCIDENT_COUNTRY_CODES.map((country) => ({
    country,
    impactedVolume: 0,
    complaintsReceived: 0,
    riskLevel: 'Low',
  }));
}

/** Merge stored rows with the full template so older incidents still show every country. */
export function normalizeCountryImpact(existing: CountryImpact[] | undefined): CountryImpact[] {
  const template = emptyCountryImpactRows();
  if (!existing?.length) return template;
  return template.map((row) => {
    const found = existing.find((e) => e.country === row.country);
    if (!found) return row;
    return {
      ...row,
      ...found,
      riskLevel: found.riskLevel || row.riskLevel,
    };
  });
}
