/**
 * Standard Workflow Templates
 * Pre-defined workflow configurations for common GDPR request types
 */

import { ProcessStep, EmailDraft } from '../types';

/**
 * Standard workflow for Data Access Requests (Datenauskunft)
 * 6 Steps: Acknowledgement → ID Check → ID Request (conditional) → Data Collection → Data Package → Close
 */
export const WORKFLOW_DATA_ACCESS: ProcessStep[] = [
  {
    order: 0,
    title: 'Eingangsbestätigung senden',
    description: 'Sende eine Bestätigungs-E-Mail an den Antragsteller, dass die Anfrage eingegangen ist.',
    required: true,
    stepType: 'email',
    emailTemplate: {
      subject: 'Eingangsbestätigung Ihrer Datenanfrage',
      bodyTemplate: `Sehr geehrte Damen und Herren,

vielen Dank für Ihre Anfrage bezüglich Ihrer personenbezogenen Daten. Wir haben Ihre Anfrage erhalten und werden diese umgehend bearbeiten.

Sie können mit einer Antwort innerhalb von 30 Tagen rechnen, wie es gemäß Art. 12 Abs. 3 DSGVO vorgesehen ist.

Ihre Referenznummer: {{CASE_ID}}

Mit freundlichen Grüßen
HelloFresh Customer Care Team`,
      placeholders: ['CASE_ID'],
      category: 'acknowledgement',
    },
  },
  {
    order: 1,
    title: 'Identitätsprüfung durchführen',
    description: 'Prüfe ob die Identität des Antragstellers eindeutig verifiziert werden kann (via Kundennummer, E-Mail, etc.).',
    required: true,
    stepType: 'decision',
    checklist: [
      'Kundennummer vorhanden?',
      'E-Mail-Adresse verifiziert?',
      'Weitere Identifikationsmerkmale vorhanden?',
    ],
    skipConditions: ['identity_verified'],
  },
  {
    order: 2,
    title: 'Identitätsnachweis anfordern (falls nötig)',
    description: 'Fordere zusätzliche Identifikationsdokumente an, falls die Identität nicht eindeutig verifiziert werden kann.',
    required: false,
    stepType: 'email',
    emailTemplate: {
      subject: 'Identitätsverifizierung erforderlich',
      bodyTemplate: `Sehr geehrte Damen und Herren,

um Ihre Anfrage bearbeiten zu können, benötigen wir von Ihnen folgende Informationen zur Identitätsverifizierung:

1. Ihre vollständige Adresse
2. Ihre E-Mail-Adresse, die mit Ihrem HelloFresh-Konto verknüpft ist
3. Ihre Kundennummer (falls vorhanden)

Diese Informationen sind notwendig, um sicherzustellen, dass wir Ihre Daten nur an die berechtigte Person weitergeben (gemäß Art. 12 Abs. 6 DSGVO).

Referenznummer: {{CASE_ID}}

Mit freundlichen Grüßen
HelloFresh Customer Care Team`,
      placeholders: ['CASE_ID'],
      category: 'id_request',
    },
    skipConditions: ['identity_verified'],
  },
  {
    order: 3,
    title: 'Daten sammeln',
    description: 'Sammle alle relevanten personenbezogenen Daten aus den verschiedenen Systemen.',
    required: true,
    stepType: 'manual',
    checklist: [
      'OWL: Kundendaten exportieren',
      'MineOS: Bestellhistorie exportieren',
      'Jira: Support-Tickets exportieren',
      'Weitere Systeme prüfen (Marketing, Analytics, etc.)',
      'Daten in PDF zusammenfassen',
    ],
    confluenceLink: 'https://hellofresh.atlassian.net/wiki/spaces/GDPR/pages/data-collection',
  },
  {
    order: 4,
    title: 'Datenpaket versenden',
    description: 'Sende das zusammengestellte Datenpaket an den Antragsteller.',
    required: true,
    stepType: 'email',
    emailTemplate: {
      subject: 'Ihre angeforderten personenbezogenen Daten',
      bodyTemplate: `Sehr geehrte Damen und Herren,

anbei erhalten Sie die von Ihnen angeforderten personenbezogenen Daten, die wir über Sie gespeichert haben.

Die Daten sind im Anhang als PDF-Datei beigefügt und enthalten:
- Kontodetails
- Bestellhistorie
- Kommunikationsverlauf
- Weitere gespeicherte Informationen

Falls Sie Fragen zu den bereitgestellten Daten haben oder weitere Informationen benötigen, kontaktieren Sie uns gerne.

Referenznummer: {{CASE_ID}}

Mit freundlichen Grüßen
HelloFresh Customer Care Team`,
      placeholders: ['CASE_ID'],
      category: 'data_package',
    },
  },
  {
    order: 5,
    title: 'Fall abschließen',
    description: 'Markiere den Fall als erledigt und dokumentiere die Bearbeitung.',
    required: true,
    stepType: 'manual',
    checklist: [
      'Case-Status auf "Resolved" setzen',
      'Jira Aktennotiz erstellen',
      'Dokumentation vollständig',
    ],
  },
];

/**
 * Standard workflow for Marketing Opt-Out (Werbewiderruf)
 * 4 Steps: Acknowledgement → ID Check → Opt-Out Processing → Confirmation
 */
export const WORKFLOW_MARKETING_OPT_OUT: ProcessStep[] = [
  {
    order: 0,
    title: 'Eingangsbestätigung senden',
    description: 'Bestätige den Eingang der Opt-Out-Anfrage.',
    required: true,
    stepType: 'email',
    emailTemplate: {
      subject: 'Eingangsbestätigung Ihrer Marketing-Abmeldung',
      bodyTemplate: `Sehr geehrte Damen und Herren,

vielen Dank für Ihre Mitteilung. Wir werden Ihre Marketing-Abmeldung umgehend bearbeiten.

Die Deaktivierung wird innerhalb von 48 Stunden vollständig wirksam sein.

Referenznummer: {{CASE_ID}}

Mit freundlichen Grüßen
HelloFresh Customer Care Team`,
      placeholders: ['CASE_ID'],
      category: 'acknowledgement',
    },
  },
  {
    order: 1,
    title: 'Marketing Opt-Out durchführen',
    description: 'Entferne die Marketing-Einwilligung in allen relevanten Systemen.',
    required: true,
    stepType: 'manual',
    checklist: [
      'OWL: Marketing-Flag deaktivieren',
      'Newsletter-System: E-Mail-Adresse austragen',
      'Marketing-Automation: Kontakt pausieren/entfernen',
      'Prüfen: Weitere Marketing-Kanäle (SMS, Push, etc.)',
    ],
    confluenceLink: 'https://hellofresh.atlassian.net/wiki/spaces/GDPR/pages/marketing-opt-out',
  },
  {
    order: 2,
    title: 'Bestätigung senden',
    description: 'Bestätige die erfolgreiche Deaktivierung der Marketing-Kommunikation.',
    required: true,
    stepType: 'email',
    emailTemplate: {
      subject: 'Bestätigung: Marketing-Abmeldung erfolgreich',
      bodyTemplate: `Sehr geehrte Damen und Herren,

wir bestätigen hiermit, dass wir Ihre Marketing-Einwilligung zurückgenommen haben.

Sie werden ab sofort keine Marketing-E-Mails mehr von HelloFresh erhalten. Bitte beachten Sie, dass:
- Transaktionale E-Mails (Bestellbestätigungen, Lieferupdates) weiterhin versendet werden
- Die Deaktivierung innerhalb von 48 Stunden vollständig wirksam ist
- Sie sich jederzeit wieder für Marketing-E-Mails anmelden können

Referenznummer: {{CASE_ID}}

Mit freundlichen Grüßen
HelloFresh Customer Care Team`,
      placeholders: ['CASE_ID'],
      category: 'marketing_opt_out',
    },
  },
  {
    order: 3,
    title: 'Fall abschließen',
    description: 'Dokumentiere die erfolgreiche Bearbeitung.',
    required: true,
    stepType: 'manual',
    checklist: [
      'Case-Status auf "Resolved" setzen',
      'Jira Aktennotiz erstellen',
    ],
  },
];

/**
 * Standard workflow for Data Deletion (Datenlöschung)
 * 5 Steps: Acknowledgement → ID Check → Deletion Impact Assessment → Execute Deletion → Confirmation
 */
export const WORKFLOW_DATA_DELETION: ProcessStep[] = [
  {
    order: 0,
    title: 'Eingangsbestätigung senden',
    description: 'Bestätige den Eingang der Löschungsanfrage.',
    required: true,
    stepType: 'email',
    emailTemplate: {
      subject: 'Eingangsbestätigung Ihrer Löschungsanfrage',
      bodyTemplate: `Sehr geehrte Damen und Herren,

vielen Dank für Ihre Anfrage zur Löschung Ihrer personenbezogenen Daten. Wir haben Ihre Anfrage erhalten und werden diese umgehend prüfen.

Bitte beachten Sie, dass wir bestimmte Daten aufgrund gesetzlicher Aufbewahrungsfristen möglicherweise nicht sofort löschen können.

Sie erhalten eine Bestätigung innerhalb von 30 Tagen.

Referenznummer: {{CASE_ID}}

Mit freundlichen Grüßen
HelloFresh Customer Care Team`,
      placeholders: ['CASE_ID'],
      category: 'acknowledgement',
    },
  },
  {
    order: 1,
    title: 'Identitätsprüfung durchführen',
    description: 'Verifiziere die Identität des Antragstellers vor der Löschung.',
    required: true,
    stepType: 'decision',
    checklist: [
      'Kundennummer verifiziert?',
      'E-Mail-Adresse verifiziert?',
      'Falls nötig: Identitätsnachweis anfordern',
    ],
  },
  {
    order: 2,
    title: 'Löschungsumfang prüfen',
    description: 'Prüfe welche Daten gelöscht werden können und welche aufbewahrt werden müssen (z.B. Rechnungen).',
    required: true,
    stepType: 'manual',
    checklist: [
      'Aktive Bestellungen vorhanden? → Kunde informieren',
      'Offene Rechnungen? → Aufbewahrungspflicht prüfen',
      'Garantieansprüche? → Aufbewahrungspflicht prüfen',
      'Rechtliche Aufbewahrungsfristen dokumentieren',
    ],
    confluenceLink: 'https://hellofresh.atlassian.net/wiki/spaces/GDPR/pages/data-deletion',
  },
  {
    order: 3,
    title: 'Daten löschen',
    description: 'Führe die Löschung in allen relevanten Systemen durch.',
    required: true,
    stepType: 'manual',
    checklist: [
      'OWL: Kundendaten anonymisieren/löschen',
      'MineOS: Bestelldaten anonymisieren',
      'Marketing-Systeme: Kontakt entfernen',
      'Support-Systeme: Tickets anonymisieren',
      'Backup-Systeme informieren',
    ],
  },
  {
    order: 4,
    title: 'Löschung bestätigen',
    description: 'Bestätige die erfolgreiche Löschung beim Antragsteller.',
    required: true,
    stepType: 'email',
    emailTemplate: {
      subject: 'Bestätigung: Löschung Ihrer Daten',
      bodyTemplate: `Sehr geehrte Damen und Herren,

wir bestätigen hiermit die Löschung Ihrer personenbezogenen Daten gemäß Ihrer Anfrage.

Folgende Daten wurden gelöscht bzw. anonymisiert:
- Kontodetails
- Präferenzen und Einstellungen
- Marketing-Daten

Bitte beachten Sie, dass bestimmte Daten aufgrund gesetzlicher Aufbewahrungsfristen (z.B. Rechnungen) für die vorgeschriebene Dauer aufbewahrt werden müssen.

Referenznummer: {{CASE_ID}}

Mit freundlichen Grüßen
HelloFresh Customer Care Team`,
      placeholders: ['CASE_ID'],
      category: 'other',
    },
  },
  {
    order: 5,
    title: 'Fall abschließen',
    description: 'Dokumentiere die erfolgreiche Löschung.',
    required: true,
    stepType: 'manual',
    checklist: [
      'Case-Status auf "Resolved" setzen',
      'Jira Aktennotiz mit Löschungsnachweis erstellen',
      'Dokumentation vollständig',
    ],
  },
];

/**
 * Standard workflow for Data Portability (Datenübertragbarkeit)
 * Similar to Data Access but with structured export format
 */
export const WORKFLOW_DATA_PORTABILITY: ProcessStep[] = [
  {
    order: 0,
    title: 'Eingangsbestätigung senden',
    description: 'Bestätige den Eingang der Portabilitätsanfrage.',
    required: true,
    stepType: 'email',
    emailTemplate: {
      subject: 'Eingangsbestätigung Ihrer Portabilitätsanfrage',
      bodyTemplate: `Sehr geehrte Damen und Herren,

vielen Dank für Ihre Anfrage zur Datenübertragbarkeit. Wir werden Ihre Daten in einem strukturierten, maschinenlesbaren Format bereitstellen.

Sie erhalten Ihre Daten innerhalb von 30 Tagen.

Referenznummer: {{CASE_ID}}

Mit freundlichen Grüßen
HelloFresh Customer Care Team`,
      placeholders: ['CASE_ID'],
      category: 'acknowledgement',
    },
  },
  {
    order: 1,
    title: 'Identitätsprüfung',
    description: 'Verifiziere die Identität vor Datenexport.',
    required: true,
    stepType: 'decision',
  },
  {
    order: 2,
    title: 'Daten in strukturiertem Format exportieren',
    description: 'Exportiere Daten im JSON/CSV-Format.',
    required: true,
    stepType: 'manual',
    checklist: [
      'JSON-Export erstellen (maschinenlesbar)',
      'CSV-Dateien für Tabellendaten',
      'README-Datei mit Erklärungen hinzufügen',
      'Alle Dateien in ZIP-Archiv packen',
    ],
  },
  {
    order: 3,
    title: 'Datenpaket versenden',
    description: 'Sende das strukturierte Datenpaket.',
    required: true,
    stepType: 'email',
    emailTemplate: {
      subject: 'Ihre Daten im strukturierten Format',
      bodyTemplate: `Sehr geehrte Damen und Herren,

anbei erhalten Sie Ihre personenbezogenen Daten in einem strukturierten, maschinenlesbaren Format (JSON/CSV).

Das ZIP-Archiv enthält:
- data.json: Alle Ihre Daten im JSON-Format
- orders.csv: Bestellhistorie
- README.txt: Erklärung der Datenstruktur

Referenznummer: {{CASE_ID}}

Mit freundlichen Grüßen
HelloFresh Customer Care Team`,
      placeholders: ['CASE_ID'],
      category: 'data_package',
    },
  },
  {
    order: 4,
    title: 'Fall abschließen',
    description: 'Dokumentiere die erfolgreiche Übermittlung.',
    required: true,
    stepType: 'manual',
  },
];

/**
 * Standard workflow for Data Correction (Datenberichtigung)
 */
export const WORKFLOW_DATA_CORRECTION: ProcessStep[] = [
  {
    order: 0,
    title: 'Eingangsbestätigung senden',
    description: 'Bestätige den Eingang der Berichtigungsanfrage.',
    required: true,
    stepType: 'email',
    emailTemplate: {
      subject: 'Eingangsbestätigung Ihrer Berichtigungsanfrage',
      bodyTemplate: `Sehr geehrte Damen und Herren,

vielen Dank für Ihre Mitteilung. Wir werden die von Ihnen genannten Daten prüfen und ggf. korrigieren.

Referenznummer: {{CASE_ID}}

Mit freundlichen Grüßen
HelloFresh Customer Care Team`,
      placeholders: ['CASE_ID'],
      category: 'acknowledgement',
    },
  },
  {
    order: 1,
    title: 'Daten prüfen und korrigieren',
    description: 'Prüfe die angegebenen Daten und korrigiere sie in den Systemen.',
    required: true,
    stepType: 'manual',
    checklist: [
      'Welche Daten sollen korrigiert werden?',
      'Korrektheit der neuen Daten prüfen',
      'In allen Systemen korrigieren (OWL, MineOS, etc.)',
      'Dokumentation der Änderungen',
    ],
  },
  {
    order: 2,
    title: 'Korrektur bestätigen',
    description: 'Bestätige die erfolgreiche Korrektur.',
    required: true,
    stepType: 'email',
    emailTemplate: {
      subject: 'Bestätigung: Datenkorrektur durchgeführt',
      bodyTemplate: `Sehr geehrte Damen und Herren,

wir bestätigen hiermit die Korrektur Ihrer Daten gemäß Ihrer Anfrage.

Die Änderungen sind ab sofort in unserem System aktiv.

Referenznummer: {{CASE_ID}}

Mit freundlichen Grüßen
HelloFresh Customer Care Team`,
      placeholders: ['CASE_ID'],
      category: 'other',
    },
  },
  {
    order: 3,
    title: 'Fall abschließen',
    description: 'Dokumentiere die Korrektur.',
    required: true,
    stepType: 'manual',
  },
];

/**
 * Get workflow template by type
 */
export function getWorkflowTemplate(type: string): ProcessStep[] | null {
  const workflows: Record<string, ProcessStep[]> = {
    data_access: WORKFLOW_DATA_ACCESS,
    marketing_opt_out: WORKFLOW_MARKETING_OPT_OUT,
    data_deletion: WORKFLOW_DATA_DELETION,
    data_portability: WORKFLOW_DATA_PORTABILITY,
    data_correction: WORKFLOW_DATA_CORRECTION,
  };

  return workflows[type] || null;
}

/**
 * List all available workflow templates
 */
export function getAllWorkflowTemplates(): Array<{
  id: string;
  name: string;
  nameEn: string;
  description: string;
  stepCount: number;
  estimatedDays?: number;
}> {
  return [
    {
      id: 'data_access',
      name: 'Datenauskunft',
      nameEn: 'Data Access Request',
      description: 'Standard-Workflow für Anfragen auf Auskunft über gespeicherte personenbezogene Daten gemäß Art. 15 DSGVO',
      stepCount: WORKFLOW_DATA_ACCESS.length,
      estimatedDays: 28,
    },
    {
      id: 'marketing_opt_out',
      name: 'Werbewiderruf',
      nameEn: 'Marketing Opt-Out',
      description: 'Workflow für Abmeldung von Marketing-Kommunikation gemäß Art. 21 DSGVO',
      stepCount: WORKFLOW_MARKETING_OPT_OUT.length,
      estimatedDays: 2,
    },
    {
      id: 'data_deletion',
      name: 'Datenlöschung',
      nameEn: 'Data Deletion',
      description: 'Workflow für Löschung personenbezogener Daten gemäß Art. 17 DSGVO',
      stepCount: WORKFLOW_DATA_DELETION.length,
      estimatedDays: 14,
    },
    {
      id: 'data_portability',
      name: 'Datenübertragbarkeit',
      nameEn: 'Data Portability',
      description: 'Workflow für Bereitstellung von Daten in strukturiertem, gängigem Format gemäß Art. 20 DSGVO',
      stepCount: WORKFLOW_DATA_PORTABILITY.length,
      estimatedDays: 21,
    },
    {
      id: 'data_correction',
      name: 'Datenberichtigung',
      nameEn: 'Data Correction',
      description: 'Workflow für Korrektur fehlerhafter personenbezogener Daten gemäß Art. 16 DSGVO',
      stepCount: WORKFLOW_DATA_CORRECTION.length,
      estimatedDays: 7,
    },
  ];
}
