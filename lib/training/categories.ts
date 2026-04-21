/**
 * Training Error Categories for GDPR Agent Training
 */

import { TrainingErrorCategory } from '../types';

export const ERROR_CATEGORIES: TrainingErrorCategory[] = [
  {
    id: 'incorrect-identification',
    title: 'Falsche Identifikation des Kunden',
    description: 'Agenten identifizieren Kunden nicht korrekt oder verifizieren die Identität nicht ausreichend.',
    commonMistakes: [
      'Anfrage ohne Identitätsprüfung bearbeiten',
      'Falsche Person als Anfragesteller identifizieren',
      'Unzureichende Verifizierung bei ähnlichen Namen',
    ],
    correctApproach: 'Vor jeder Bearbeitung muss die Identität des Kunden eindeutig verifiziert werden. Verwende die offiziellen Verifizierungsmethoden (E-Mail-Verifizierung, Post-Ident, etc.).',
    examples: [
      {
        wrong: 'Anfrage von max.mustermann@gmail.com bearbeiten ohne zu prüfen, ob dies wirklich der Account-Inhaber ist.',
        correct: 'Zuerst E-Mail-Verifizierung durchführen: Bestätigungslink an die registrierte E-Mail-Adresse senden und auf Bestätigung warten.',
      },
      {
        wrong: 'Daten an eine E-Mail-Adresse senden, die nicht im System registriert ist.',
        correct: 'Nur Daten an die registrierte und verifizierte E-Mail-Adresse des Account-Inhabers senden.',
      },
    ],
    resources: [
      'Verifizierungsrichtlinien in Confluence',
      'Identity Verification Checklist',
    ],
  },
  {
    id: 'wrong-data-scope',
    title: 'Falscher Datenumfang',
    description: 'Agenten senden nicht alle relevanten Daten oder senden Daten, die nicht angefordert wurden.',
    commonMistakes: [
      'Nur Teil-Daten exportieren statt vollständigem Export',
      'Daten aus falschen Systemen/Zeiträumen exportieren',
      'Löschung von Daten, die nicht gelöscht werden sollten',
    ],
    correctApproach: 'Erstelle einen vollständigen Datenexport aller personenbezogenen Daten aus allen relevanten Systemen. Prüfe alle Datenquellen: Orders, Account, Marketing, Support, etc.',
    examples: [
      {
        wrong: 'Nur Bestellhistorie exportieren, aber Account-Daten und Marketing-Präferenzen vergessen.',
        correct: 'Vollständiger Export: Account-Daten, Bestellhistorie, Marketing-Präferenzen, Support-Tickets, Cookie-Consents, etc.',
      },
      {
        wrong: 'Daten nur aus den letzten 12 Monaten exportieren.',
        correct: 'Alle Daten exportieren, unabhängig vom Zeitraum (sofern gesetzlich zulässig).',
      },
    ],
  },
  {
    id: 'timing-violations',
    title: 'Fristen nicht eingehalten',
    description: 'Agenten bearbeiten DSGVO-Anfragen nicht innerhalb der gesetzlichen Fristen.',
    commonMistakes: [
      '30-Tage-Frist für DSAR nicht einhalten',
      'Keine Fristverlängerung beantragen wenn nötig',
      'Fristen nicht dokumentieren',
    ],
    correctApproach: 'DSAR-Anfragen müssen innerhalb von 30 Tagen bearbeitet werden. Bei komplexen Anfragen kann eine Fristverlängerung um weitere 2 Monate beantragt werden, muss aber begründet werden.',
    examples: [
      {
        wrong: 'Anfrage nach 45 Tagen bearbeiten ohne Fristverlängerung beantragt zu haben.',
        correct: 'Anfrage innerhalb von 30 Tagen bearbeiten oder rechtzeitig Fristverlängerung beantragen und Kunden informieren.',
      },
    ],
  },
  {
    id: 'incorrect-deletion',
    title: 'Falsche Löschung',
    description: 'Agenten löschen Daten, die nicht gelöscht werden dürfen (z.B. aufgrund gesetzlicher Aufbewahrungspflichten).',
    commonMistakes: [
      'Rechnungen löschen, obwohl Aufbewahrungspflicht besteht',
      'Alle Daten löschen ohne rechtliche Prüfung',
      'Daten aus falschen Systemen löschen',
    ],
    correctApproach: 'Prüfe vor jeder Löschung die gesetzlichen Aufbewahrungspflichten. Rechnungen müssen z.B. 10 Jahre aufbewahrt werden. Lösche nur Daten, die wirklich gelöscht werden dürfen.',
    examples: [
      {
        wrong: 'Alle Daten eines Kunden löschen, inklusive Rechnungen und Bestellungen.',
        correct: 'Nur Daten löschen, die nicht gesetzlich aufbewahrt werden müssen. Rechnungen und Bestellungen müssen weiterhin aufbewahrt werden.',
      },
    ],
  },
  {
    id: 'wrong-response-format',
    title: 'Falsches Antwortformat',
    description: 'Agenten senden Daten in falschem Format oder verwenden unstrukturierte Antworten.',
    commonMistakes: [
      'Daten als Screenshots statt strukturiertem Export senden',
      'PDF statt maschinenlesbarem Format (JSON/CSV)',
      'Unvollständige oder unstrukturierte Antworten',
    ],
    correctApproach: 'Sende Daten in einem strukturierten, maschinenlesbaren Format (JSON oder CSV). Stelle sicher, dass alle Felder klar beschriftet sind und der Export vollständig ist.',
    examples: [
      {
        wrong: 'Screenshots von Account-Daten per E-Mail senden.',
        correct: 'Strukturierter JSON- oder CSV-Export mit allen relevanten Datenfeldern.',
      },
    ],
  },
  {
    id: 'missing-legal-basis',
    title: 'Fehlende Rechtsgrundlage',
    description: 'Agenten erklären nicht die Rechtsgrundlage für die Datenverarbeitung oder geben falsche Informationen.',
    commonMistakes: [
      'Keine Rechtsgrundlage in der Antwort erwähnen',
      'Falsche Rechtsgrundlage angeben',
      'Rechtsgrundlage nicht verständlich erklären',
    ],
    correctApproach: 'Jede Antwort muss die Rechtsgrundlage für die Datenverarbeitung klar und verständlich erklären (z.B. Vertragserfüllung, berechtigtes Interesse, Einwilligung).',
    examples: [
      {
        wrong: 'Antwort ohne Erwähnung der Rechtsgrundlage für Datenverarbeitung.',
        correct: 'Klare Erklärung: "Wir verarbeiten Ihre Daten auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung) für die Abwicklung Ihrer Bestellungen."',
      },
    ],
  },
  {
    id: 'insufficient-documentation',
    title: 'Unzureichende Dokumentation',
    description: 'Agenten dokumentieren die Bearbeitung nicht ausreichend oder vergessen wichtige Details.',
    commonMistakes: [
      'Keine Dokumentation der Bearbeitung',
      'Wichtige Details nicht notieren',
      'Fristen nicht dokumentieren',
    ],
    correctApproach: 'Dokumentiere jede Bearbeitung vollständig: Datum, Art der Anfrage, durchgeführte Maßnahmen, Fristen, verwendete Templates. Dies ist wichtig für Compliance und Nachvollziehbarkeit.',
    examples: [
      {
        wrong: 'Anfrage bearbeiten ohne Notizen oder Dokumentation.',
        correct: 'Vollständige Dokumentation: Datum, Art der Anfrage, durchgeführte Schritte, verwendete Templates, Fristen, Ergebnis.',
      },
    ],
  },
  {
    id: 'wrong-template-usage',
    title: 'Falsche Template-Verwendung',
    description: 'Agenten verwenden falsche Templates oder passen Templates nicht korrekt an.',
    commonMistakes: [
      'Falsches Template für die Anfrage verwenden',
      'Templates nicht personalisieren',
      'Placeholder nicht ersetzen',
    ],
    correctApproach: 'Wähle das passende Template basierend auf der Anfrage-Kategorie. Personalisiere das Template mit den korrekten Kundendaten und ersetze alle Placeholder ((Anrede)), ((Vorname)), etc.',
    examples: [
      {
        wrong: 'Template für Datenlöschung verwenden bei einer Datenzugriffsanfrage.',
        correct: 'Korrektes Template für DSAR verwenden und alle Placeholder mit echten Kundendaten ersetzen.',
      },
    ],
  },
];

export function getCategoryById(id: string): TrainingErrorCategory | undefined {
  return ERROR_CATEGORIES.find((cat) => cat.id === id);
}

export function getCategoryIds(): string[] {
  return ERROR_CATEGORIES.map((cat) => cat.id);
}
