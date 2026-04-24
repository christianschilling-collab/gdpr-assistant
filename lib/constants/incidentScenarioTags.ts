import type { IncidentScenarioTagId } from '../types';

export const INCIDENT_SCENARIO_TAG_DEFS: readonly {
  id: IncidentScenarioTagId;
  labelDe: string;
  labelEn: string;
}[] = [
  {
    id: 'unintended_disclosure',
    labelDe: 'Unbeabsichtigte Offenlegung',
    labelEn: 'Unintended disclosure',
  },
  { id: 'data_leak', labelDe: 'Datenleck', labelEn: 'Data leak' },
  {
    id: 'third_party_access',
    labelDe: 'Zugriff auf Daten durch Dritte',
    labelEn: 'Third-party access to data',
  },
  {
    id: 'technical_error',
    labelDe: 'Technischer Fehler',
    labelEn: 'Technical error',
  },
  {
    id: 'misconfiguration',
    labelDe: 'Fehlkonfiguration',
    labelEn: 'Misconfiguration',
  },
  {
    id: 'lost_stolen_device',
    labelDe: 'Verlust / Diebstahl von Gerät oder Datenträger',
    labelEn: 'Lost or stolen device / media',
  },
  {
    id: 'ransomware_malware',
    labelDe: 'Ransomware / Schadsoftware',
    labelEn: 'Ransomware / malware',
  },
  {
    id: 'insider_threat',
    labelDe: 'Insider-Risiko',
    labelEn: 'Insider threat',
  },
  {
    id: 'other_mixed',
    labelDe: 'Sonstiges / gemischt',
    labelEn: 'Other / mixed',
  },
] as const;

const EN_BY_ID = new Map(
  INCIDENT_SCENARIO_TAG_DEFS.map((d) => [d.id, d.labelEn] as const)
);

export function scenarioTagLabelEn(id: IncidentScenarioTagId): string {
  return EN_BY_ID.get(id) ?? id;
}

export function formatIncidentScenarioLabelsEn(
  ids: IncidentScenarioTagId[] | undefined,
  maxTags?: number
): string {
  if (!ids?.length) return '';
  const slice = typeof maxTags === 'number' ? ids.slice(0, maxTags) : ids;
  const labels = slice.map(scenarioTagLabelEn);
  const extra =
    typeof maxTags === 'number' && ids.length > maxTags ? ` +${ids.length - maxTags}` : '';
  return labels.join(', ') + extra;
}

export function isIncidentScenarioTagId(v: string): v is IncidentScenarioTagId {
  return INCIDENT_SCENARIO_TAG_DEFS.some((d) => d.id === v);
}
