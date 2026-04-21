/**
 * API Route: Generate Email Draft
 * Server-side email generation using Gemini API (secure)
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Import approved template loading (optional enhancement)
// For now, we'll use the step's bodyTemplate directly

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { stepDefinition, caseData, additionalContext } = body;

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Gemini API Key not configured' },
        { status: 500 }
      );
    }

    if (!stepDefinition || !caseData) {
      return NextResponse.json(
        { error: 'Missing required parameters: stepDefinition and caseData' },
        { status: 400 }
      );
    }

    // Build the prompt based on email type
    const emailTemplate = stepDefinition.emailTemplate;
    if (!emailTemplate) {
      return NextResponse.json(
        { error: 'Step has no email template defined' },
        { status: 400 }
      );
    }

    const locale = getLocaleForMarket(caseData.market);
    let prompt = '';

    // 📧 Build prompts based on email category
    switch (emailTemplate.category) {
      case 'acknowledgement':
        prompt = buildAcknowledgementPrompt(caseData, emailTemplate, locale);
        break;
      case 'id_request':
        prompt = buildIDRequestPrompt(caseData, emailTemplate, locale);
        break;
      case 'negative_response':
        prompt = buildNegativeResponsePrompt(caseData, emailTemplate, locale);
        break;
      case 'data_package':
        prompt = buildDataPackagePrompt(caseData, emailTemplate, locale);
        break;
      case 'marketing_optout':
      case 'marketing_opt_out':
        prompt = buildMarketingOptOutPrompt(caseData, emailTemplate, locale);
        break;
      default:
        prompt = buildGenericPrompt(caseData, emailTemplate, locale);
    }

    if (additionalContext) {
      prompt += `\n\nAdditional Context:\n${additionalContext}`;
    }

    // Call Gemini API
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
    const result = await model.generateContent(prompt);
    const emailDraft = result.response.text();

    return NextResponse.json({ emailDraft });
  } catch (error) {
    console.error('Error generating email draft:', error);
    return NextResponse.json(
      { error: 'Failed to generate email draft', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Helper functions

function getLocaleForMarket(market: string): string {
  const MARKET_LOCALE: Record<string, string> = {
    DE: 'de-DE',
    AT: 'de-AT',
    CH: 'de-CH',
    NL: 'nl-NL',
    BE: 'nl-BE',
    FR: 'fr-FR',
    SE: 'sv-SE',
    NO: 'nb-NO',
    DK: 'da-DK',
    UK: 'en-GB',
    US: 'en-US',
    CA: 'en-CA',
    AU: 'en-AU',
  };
  return MARKET_LOCALE[market] || 'de-DE';
}

function buildAcknowledgementPrompt(caseData: any, template: any, locale: string): string {
  return `Generate a professional GDPR acknowledgement email in German.

Case Details:
- Case ID: ${caseData.caseId}
- Market: ${caseData.market}
- Request Type: ${caseData.primaryCategory}

Base Template:
${template.bodyTemplate || 'Sehr geehrte Damen und Herren, vielen Dank für Ihre Anfrage...'}

Instructions:
1. Replace {{CASE_ID}} with: ${caseData.caseId}
2. Replace {{CUSTOMER_NAME}} with: Sehr geehrte Damen und Herren
3. Replace {{RECEIVED_DATE}} with: ${new Date().toLocaleDateString(locale)}
4. Keep professional and compliant tone
5. Include SLA timeline (28 days)

Output ONLY the final email text (no explanations).`;
}

function buildIDRequestPrompt(caseData: any, template: any, locale: string): string {
  return `Generate a professional ID verification request email in German.

Case Details:
- Case ID: ${caseData.caseId}
- Market: ${caseData.market}

Base Template:
${template.bodyTemplate || 'Sehr geehrte Damen und Herren, zur Bearbeitung Ihrer Anfrage benötigen wir...'}

Instructions:
1. Explain why ID verification is needed (data protection)
2. List acceptable ID documents
3. Include secure upload link placeholder
4. Replace {{CASE_ID}} with: ${caseData.caseId}

Output ONLY the final email text.`;
}

function buildNegativeResponsePrompt(caseData: any, template: any, locale: string): string {
  return `Generate a professional negative response email in German.

Case Details:
- Case ID: ${caseData.caseId}
- Market: ${caseData.market}

Base Template:
${template.bodyTemplate || 'Sehr geehrte Damen und Herren, nach eingehender Prüfung...'}

Instructions:
1. Polite and empathetic tone
2. Clear reason for rejection (no data found / out of scope)
3. Reference data protection rights
4. Replace {{CASE_ID}} with: ${caseData.caseId}

Output ONLY the final email text.`;
}

function buildDataPackagePrompt(caseData: any, template: any, locale: string): string {
  return `Generate a professional data package delivery email in German.

Case Details:
- Case ID: ${caseData.caseId}
- Market: ${caseData.market}

Base Template:
${template.bodyTemplate || 'Sehr geehrte Damen und Herren, anbei erhalten Sie...'}

Instructions:
1. Explain attached data package
2. Reference GDPR Article 15
3. Include security notice
4. Replace {{CASE_ID}} with: ${caseData.caseId}

Output ONLY the final email text.`;
}

function buildMarketingOptOutPrompt(caseData: any, template: any, locale: string): string {
  return `Generate a professional marketing opt-out confirmation email in German.

Case Details:
- Case ID: ${caseData.caseId}
- Market: ${caseData.market}

Base Template:
${template.bodyTemplate || 'Sehr geehrte Damen und Herren, Ihre Marketing-Deaktivierung...'}

Instructions:
1. Confirm opt-out effective immediately
2. Mention possible delay (up to 7 days for system sync)
3. Keep concise and friendly
4. Replace {{CASE_ID}} with: ${caseData.caseId}

Output ONLY the final email text.`;
}

function buildGenericPrompt(caseData: any, template: any, locale: string): string {
  return `Generate a professional GDPR email in German.

Case Details:
- Case ID: ${caseData.caseId}
- Market: ${caseData.market}

Base Template:
${template.bodyTemplate || 'Sehr geehrte Damen und Herren...'}

Instructions:
1. Replace all placeholders ({{CASE_ID}}, {{CUSTOMER_NAME}}, etc.)
2. Keep professional tone
3. Ensure GDPR compliance

Output ONLY the final email text.`;
}
