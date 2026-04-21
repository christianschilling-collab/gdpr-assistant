/**
 * Email Draft Generation using Gemini 2.0 Flash
 * Generates workflow-step specific emails for GDPR cases
 * Uses APPROVED email templates from Firestore as base
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { GDPRCase, ProcessStep, EmailDraft, Template } from '../types';
import { getTemplates } from '../firebase/templates';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

/**
 * Market-specific salutations and closings
 */
const MARKET_LOCALE = {
  DE: {
    formal: 'Sie',
    greeting: 'Sehr geehrte Damen und Herren',
    closing: 'Mit freundlichen Grüßen',
    company: 'HelloFresh',
  },
  AT: {
    formal: 'Sie',
    greeting: 'Sehr geehrte Damen und Herren',
    closing: 'Mit freundlichen Grüßen',
    company: 'HelloFresh',
  },
  CH: {
    formal: 'Sie',
    greeting: 'Sehr geehrte Damen und Herren',
    closing: 'Freundliche Grüsse',
    company: 'HelloFresh',
  },
};

/**
 * Load approved email template from Firestore
 * Matches based on category ID and requester type ID
 */
async function loadApprovedTemplate(
  caseData: GDPRCase,
  emailCategory: string
): Promise<Template | null> {
  try {
    const templates = await getTemplates();
    
    // 🔥 FIX: Match by ID, not by name
    // primaryCategory and requesterType are IDs like 'data_access', 'customer'
    const matchingTemplates = templates.filter(t => 
      t.primaryCategory === caseData.primaryCategory &&
      t.requesterType === caseData.customerType // customerType is the requester type ID
    );
    
    if (matchingTemplates.length === 0) {
      console.warn('No approved templates found for', caseData.primaryCategory, caseData.customerType);
      return null;
    }
    
    // Find template with keywords matching email category
    // Keywords should include: 'acknowledgement', 'id_request', 'negative_response', etc.
    const bestMatch = matchingTemplates.find(t => 
      t.keywords?.some(k => 
        k.toLowerCase().includes(emailCategory.toLowerCase()) ||
        emailCategory.toLowerCase().includes(k.toLowerCase())
      )
    );
    
    // Fallback to first matching template
    const result = bestMatch || matchingTemplates[0];
    
    if (result) {
      console.log('✅ Found approved template:', result.id, result.title);
    }
    
    return result || null;
  } catch (error) {
    console.error('Error loading approved template:', error);
    return null;
  }
}

/**
 * Generate email draft based on workflow step
 * Uses APPROVED templates from Firestore as base
 */
export async function generateEmailDraft(
  step: ProcessStep,
  caseData: GDPRCase,
  additionalContext?: string
): Promise<string> {
  const emailTemplate = step.emailTemplate;
  
  if (!emailTemplate) {
    throw new Error('Step has no email template defined');
  }

  const locale = MARKET_LOCALE[caseData.market as keyof typeof MARKET_LOCALE] || MARKET_LOCALE.DE;
  
  // 🔥 NEW: Load approved template from Firestore
  const approvedTemplate = await loadApprovedTemplate(caseData, emailTemplate.category);

  // Route to specific generator based on email category
  switch (emailTemplate.category) {
    case 'acknowledgement':
      return generateAcknowledgementEmail(caseData, emailTemplate, locale, approvedTemplate);
    case 'id_request':
      return generateIDRequestEmail(caseData, emailTemplate, locale, approvedTemplate);
    case 'negative_response':
      return generateNegativeResponseEmail(caseData, additionalContext || '', emailTemplate, locale, approvedTemplate);
    case 'data_package':
      return generateDataPackageEmail(caseData, emailTemplate, locale, approvedTemplate);
    case 'marketing_opt_out':
      return generateMarketingOptOutEmail(caseData, emailTemplate, locale, approvedTemplate);
    default:
      return generateGenericEmail(caseData, emailTemplate, locale, additionalContext, approvedTemplate);
  }
}

/**
 * Generate Acknowledgement Email
 * Sent immediately after receiving a GDPR request
 * Uses approved template from Firestore if available
 */
export async function generateAcknowledgementEmail(
  caseData: GDPRCase,
  emailTemplate?: EmailDraft,
  locale?: typeof MARKET_LOCALE.DE,
  approvedTemplate?: Template | null
): Promise<string> {
  const loc = locale || MARKET_LOCALE[caseData.market as keyof typeof MARKET_LOCALE] || MARKET_LOCALE.DE;
  
  // 🔥 Use approved template if available
  const baseTemplate = approvedTemplate?.templateText || emailTemplate?.bodyTemplate || `
${loc.greeting},

vielen Dank für Ihre Anfrage bezüglich Ihrer Daten. Wir haben Ihre Anfrage erhalten und werden diese umgehend bearbeiten.

Sie können mit einer Antwort innerhalb von 30 Tagen rechnen, wie es gemäß Art. 12 Abs. 3 DSGVO vorgesehen ist.

Ihre Referenznummer: {{CASE_ID}}

Sollten Sie weitere Fragen haben, kontaktieren Sie uns gerne über diese E-Mail.

${loc.closing}
${loc.company} Customer Care Team
`;

  const prompt = `Generate a professional GDPR acknowledgement email in German.

Market: ${caseData.market}
Case ID: ${caseData.caseId}
Case Type: ${caseData.primaryCategory || 'GDPR Request'}
Urgency: ${caseData.urgency}

${approvedTemplate ? '⚠️ USE THIS APPROVED TEMPLATE AS BASE (DO NOT CHANGE STRUCTURE, ONLY REPLACE PLACEHOLDERS):' : 'Template:'}
${baseTemplate}

Instructions:
1. ${approvedTemplate ? 'Keep the approved template structure EXACTLY as is' : 'Replace {{CASE_ID}} with: ' + caseData.caseId}
2. Only replace placeholders like {{CASE_ID}}, {{CUSTOMER_NAME}}, etc.
3. Do NOT change wording, tone, or legal references
4. Keep the tone professional and friendly
5. Ensure GDPR compliance (mention 30-day response time per Art. 12 DSGVO)
6. Use appropriate ${loc.formal} form (formal)
7. If urgency is High, mention we'll prioritize this request

${approvedTemplate ? '⚠️ IMPORTANT: This is an APPROVED template. Only fill in placeholders, do not rewrite.' : ''}

Return only the email text, no subject line, no extra formatting.`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

/**
 * Generate ID Request Email
 * Request identity verification documents from requester
 * Uses approved template from Firestore if available
 */
export async function generateIDRequestEmail(
  caseData: GDPRCase,
  emailTemplate?: EmailDraft,
  locale?: typeof MARKET_LOCALE.DE,
  approvedTemplate?: Template | null
): Promise<string> {
  const loc = locale || MARKET_LOCALE[caseData.market as keyof typeof MARKET_LOCALE] || MARKET_LOCALE.DE;
  
  // 🔥 Use approved template if available
  const baseTemplate = approvedTemplate?.templateText || emailTemplate?.bodyTemplate || `
${loc.greeting},

um Ihre Anfrage bearbeiten zu können, benötigen wir von Ihnen folgende Informationen zur Identitätsverifizierung:

1. Ihre vollständige Adresse
2. Ihre E-Mail-Adresse, die mit Ihrem ${loc.company}-Konto verknüpft ist
3. Ihre Kundennummer (falls vorhanden)
4. Optional: Eine Kopie eines Ausweisdokuments (Personalausweis/Reisepass) mit geschwärzten Daten außer Name und Geburtsdatum

Diese Informationen sind notwendig, um sicherzustellen, dass wir Ihre Daten nur an die berechtigte Person weitergeben (gemäß Art. 12 Abs. 6 DSGVO).

Referenznummer: {{CASE_ID}}

${loc.closing}
${loc.company} Customer Care Team
`;

  const prompt = `Generate a professional ID verification request email in German.

Market: ${caseData.market}
Case ID: ${caseData.caseId}
Case Description: ${caseData.caseDescription.substring(0, 200)}

${approvedTemplate ? '⚠️ USE THIS APPROVED TEMPLATE AS BASE (DO NOT CHANGE STRUCTURE, ONLY REPLACE PLACEHOLDERS):' : 'Template:'}
${baseTemplate}

Instructions:
1. ${approvedTemplate ? 'Keep the approved template structure EXACTLY as is' : 'Replace {{CASE_ID}} with: ' + caseData.caseId}
2. Only replace placeholders
3. Do NOT change wording, legal references (Art. 12 Abs. 6 DSGVO), or structure
4. Keep professional and friendly tone
5. Use ${loc.formal} form

${approvedTemplate ? '⚠️ IMPORTANT: This is an APPROVED template. Only fill in placeholders, do not rewrite.' : ''}

Return only the email text, no subject line.`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

/**
 * Generate Negative Response Email
 * When no data is found or request cannot be fulfilled
 * Uses approved template from Firestore if available
 */
export async function generateNegativeResponseEmail(
  caseData: GDPRCase,
  reason: string,
  emailTemplate?: EmailDraft,
  locale?: typeof MARKET_LOCALE.DE,
  approvedTemplate?: Template | null
): Promise<string> {
  const loc = locale || MARKET_LOCALE[caseData.market as keyof typeof MARKET_LOCALE] || MARKET_LOCALE.DE;
  
  // 🔥 Use approved template if available
  const baseTemplate = approvedTemplate?.templateText || emailTemplate?.bodyTemplate || `
${loc.greeting},

vielen Dank für Ihre Anfrage bezüglich Ihrer personenbezogenen Daten.

Nach sorgfältiger Prüfung unserer Systeme müssen wir Ihnen mitteilen, dass wir keine personenbezogenen Daten zu den von Ihnen angegebenen Informationen gefunden haben.

Grund: {{REASON}}

Falls Sie weitere Fragen haben oder glauben, dass diese Auskunft nicht korrekt ist, kontaktieren Sie uns bitte erneut mit zusätzlichen Informationen.

Referenznummer: {{CASE_ID}}

${loc.closing}
${loc.company} Customer Care Team
`;

  const prompt = `Generate a professional negative response email in German (no data found).

Market: ${caseData.market}
Case ID: ${caseData.caseId}
Reason for negative response: ${reason}

${approvedTemplate ? '⚠️ USE THIS APPROVED TEMPLATE AS BASE (DO NOT CHANGE STRUCTURE, ONLY REPLACE PLACEHOLDERS):' : 'Template:'}
${baseTemplate}

Instructions:
1. ${approvedTemplate ? 'Keep the approved template structure EXACTLY as is' : 'Replace {{CASE_ID}} with: ' + caseData.caseId}
2. Replace {{REASON}} with a professional explanation based on: ${reason}
3. Only replace placeholders - do NOT change wording or tone
4. Be empathetic and professional
5. Use ${loc.formal} form

${approvedTemplate ? '⚠️ IMPORTANT: This is an APPROVED template. Only fill in placeholders, do not rewrite.' : ''}

Return only the email text, no subject line.`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

/**
 * Generate Data Package Email
 * Send customer their requested data
 * Uses approved template from Firestore if available
 */
export async function generateDataPackageEmail(
  caseData: GDPRCase,
  emailTemplate?: EmailDraft,
  locale?: typeof MARKET_LOCALE.DE,
  approvedTemplate?: Template | null
): Promise<string> {
  const loc = locale || MARKET_LOCALE[caseData.market as keyof typeof MARKET_LOCALE] || MARKET_LOCALE.DE;
  
  // 🔥 Use approved template if available
  const baseTemplate = approvedTemplate?.templateText || emailTemplate?.bodyTemplate || `
${loc.greeting},

anbei erhalten Sie die von Ihnen angeforderten personenbezogenen Daten, die wir über Sie gespeichert haben.

Die Daten sind im Anhang als PDF-Datei beigefügt und enthalten:
- Kontodetails
- Bestellhistorie
- Kommunikationsverlauf
- Weitere gespeicherte Informationen

Falls Sie Fragen zu den bereitgestellten Daten haben oder weitere Informationen benötigen, kontaktieren Sie uns gerne.

Referenznummer: {{CASE_ID}}

${loc.closing}
${loc.company} Customer Care Team
`;

  const prompt = `Generate a professional data package delivery email in German.

Market: ${caseData.market}
Case ID: ${caseData.caseId}
Case Type: ${caseData.primaryCategory || 'Data Request'}

${approvedTemplate ? '⚠️ USE THIS APPROVED TEMPLATE AS BASE (DO NOT CHANGE STRUCTURE, ONLY REPLACE PLACEHOLDERS):' : 'Template:'}
${baseTemplate}

Instructions:
1. ${approvedTemplate ? 'Keep the approved template structure EXACTLY as is' : 'Replace {{CASE_ID}} with: ' + caseData.caseId}
2. Only replace placeholders - do NOT change wording or structure
3. Professional and friendly tone
4. Use ${loc.formal} form

${approvedTemplate ? '⚠️ IMPORTANT: This is an APPROVED template. Only fill in placeholders, do not rewrite.' : ''}

Return only the email text, no subject line.`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

/**
 * Generate Marketing Opt-Out Confirmation Email
 * Uses approved template from Firestore if available
 */
export async function generateMarketingOptOutEmail(
  caseData: GDPRCase,
  emailTemplate?: EmailDraft,
  locale?: typeof MARKET_LOCALE.DE,
  approvedTemplate?: Template | null
): Promise<string> {
  const loc = locale || MARKET_LOCALE[caseData.market as keyof typeof MARKET_LOCALE] || MARKET_LOCALE.DE;
  
  // 🔥 Use approved template if available
  const baseTemplate = approvedTemplate?.templateText || emailTemplate?.bodyTemplate || `
${loc.greeting},

wir bestätigen hiermit, dass wir Ihre Marketing-Einwilligung zurückgenommen haben.

Sie werden ab sofort keine Marketing-E-Mails mehr von ${loc.company} erhalten. Bitte beachten Sie, dass:
- Transaktionale E-Mails (Bestellbestätigungen, Lieferupdates) weiterhin versendet werden
- Die Deaktivierung innerhalb von 48 Stunden vollständig wirksam ist
- Sie sich jederzeit wieder für Marketing-E-Mails anmelden können

Referenznummer: {{CASE_ID}}

${loc.closing}
${loc.company} Customer Care Team
`;

  const prompt = `Generate a marketing opt-out confirmation email in German.

Market: ${caseData.market}
Case ID: ${caseData.caseId}

${approvedTemplate ? '⚠️ USE THIS APPROVED TEMPLATE AS BASE (DO NOT CHANGE STRUCTURE, ONLY REPLACE PLACEHOLDERS):' : 'Template:'}
${baseTemplate}

Instructions:
1. ${approvedTemplate ? 'Keep the approved template structure EXACTLY as is' : 'Replace {{CASE_ID}} with: ' + caseData.caseId}
2. Only replace placeholders - do NOT change wording or structure
3. Use ${loc.formal} form

${approvedTemplate ? '⚠️ IMPORTANT: This is an APPROVED template. Only fill in placeholders, do not rewrite.' : ''}

Return only the email text, no subject line.`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

/**
 * Generate generic email for custom workflow steps
 * Uses approved template from Firestore if available
 */
async function generateGenericEmail(
  caseData: GDPRCase,
  emailTemplate: EmailDraft,
  locale: typeof MARKET_LOCALE.DE,
  additionalContext?: string,
  approvedTemplate?: Template | null
): Promise<string> {
  // 🔥 Use approved template if available
  const baseTemplate = approvedTemplate?.templateText || emailTemplate.bodyTemplate;
  
  const prompt = `Generate a professional GDPR-related email in German.

Market: ${caseData.market}
Case ID: ${caseData.caseId}
Case Type: ${caseData.primaryCategory || 'GDPR Request'}

${approvedTemplate ? '⚠️ USE THIS APPROVED TEMPLATE AS BASE (DO NOT CHANGE STRUCTURE, ONLY REPLACE PLACEHOLDERS):' : 'Template:'}
Subject: ${emailTemplate.subject}
${baseTemplate}

Additional Context: ${additionalContext || 'None'}

Instructions:
1. ${approvedTemplate ? 'Keep the approved template structure EXACTLY as is' : 'Fill in placeholders ({{CASE_ID}}, {{CUSTOMER_NAME}}, etc.)'}
2. Only replace placeholders - do NOT change wording or structure
3. Use professional, friendly tone
4. Use ${locale.formal} form
5. Ensure GDPR compliance

${approvedTemplate ? '⚠️ IMPORTANT: This is an APPROVED template. Only fill in placeholders, do not rewrite.' : ''}

Return only the email text, no subject line.`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

/**
 * Generate email subject line based on category
 */
export async function generateEmailSubject(
  category: EmailDraft['category'],
  caseId: string,
  market: string
): Promise<string> {
  const locale = MARKET_LOCALE[market as keyof typeof MARKET_LOCALE] || MARKET_LOCALE.DE;
  
  const subjectMap: Record<EmailDraft['category'], string> = {
    acknowledgement: `Eingangsbestätigung Ihrer GDPR-Anfrage - ${caseId}`,
    id_request: `Identitätsverifizierung erforderlich - ${caseId}`,
    negative_response: `Ihre Datenanfrage - Keine Daten gefunden - ${caseId}`,
    data_package: `Ihre angeforderten personenbezogenen Daten - ${caseId}`,
    marketing_opt_out: `Bestätigung: Marketing-Abmeldung - ${caseId}`,
    other: `Ihre GDPR-Anfrage - ${caseId}`,
  };

  return subjectMap[category] || subjectMap.other;
}

/**
 * Replace placeholders in email template
 */
export function replacePlaceholders(
  emailText: string,
  placeholders: Record<string, string>
): string {
  let result = emailText;
  
  Object.entries(placeholders).forEach(([key, value]) => {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(regex, value);
  });
  
  return result;
}

/**
 * Validate email draft before sending
 */
export function validateEmailDraft(emailDraft: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Check for unreplaced placeholders
  const placeholderRegex = /\{\{[A-Z_]+\}\}/g;
  const unreplacedPlaceholders = emailDraft.match(placeholderRegex);
  if (unreplacedPlaceholders) {
    errors.push(`Unreplaced placeholders: ${unreplacedPlaceholders.join(', ')}`);
  }
  
  // Check minimum length
  if (emailDraft.length < 50) {
    errors.push('Email too short (minimum 50 characters)');
  }
  
  // Check for greeting
  if (!emailDraft.includes('Sehr geehrte') && !emailDraft.includes('Hallo')) {
    errors.push('No greeting found');
  }
  
  // Check for closing
  if (!emailDraft.includes('Grüß') && !emailDraft.includes('Gruß')) {
    errors.push('No closing found');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
