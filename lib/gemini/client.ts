/**
 * Gemini API Client - Updated for dynamic Categories & Requester Types
 *
 * Setup Instructions:
 * 1. Go to https://aistudio.google.com/app/apikey
 * 2. Create an API key
 * 3. Add GEMINI_API_KEY to .env.local
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { Classification, Template, TemplateMatch, Category, RequesterType } from '../types';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

/**
 * Classify a GDPR case using Gemini - ONLY determines Category, NOT Requester Type
 * 
 * @param caseDescription - The case text to analyze
 * @param requesterTypeId - The ALREADY SELECTED requester type ID (Kunde, Nichtkunde, etc.)
 * @param categories - Available categories to choose from
 * @param requesterTypes - All requester types (needed to find the name)
 * @param specificQuestion - Optional specific question
 * @param market - Market region
 */
export async function classifyCase(
  caseDescription: string,
  requesterTypeId: string,
  categories: Category[],
  requesterTypes: RequesterType[],
  specificQuestion?: string,
  market?: string
): Promise<Classification> {
  const categoriesText = categories.map(c => `- ${c.nameEn} (${c.name}): ${c.description}`).join('\n');
  
  // Find the requester type name for context
  const requesterType = requesterTypes.find(t => t.id === requesterTypeId);
  const requesterTypeName = requesterType?.nameEn || 'Unknown';

  const prompt = `You are a GDPR expert assistant. Analyze the following customer support case and classify it.

Case Description: ${caseDescription}
${specificQuestion ? `Specific Question: ${specificQuestion}` : ''}
${market ? `Market: ${market}` : ''}
Requester Type: ${requesterTypeName} (${requesterType?.name || 'Unknown'})

Available Categories:
${categoriesText}

Please classify this case:
- Choose the BEST matching category from the list above (use the English name)
- Provide confidence (0.0 to 1.0)

Consider the requester type when determining the category. For example:
- Non-customers requesting data deletion might be different from customers
- Employees have different GDPR rights than customers

Respond in JSON format:
{
  "primaryCategory": "English category name from the list",
  "confidence": 0.95,
  "reasoning": "Brief explanation of the classification"
}`;

  const result = await model.generateContent(prompt);
  const response = result.response.text();

  // Extract JSON from response
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse Gemini response');
  }

  const parsed = JSON.parse(jsonMatch[0]);

  // Convert English names back to IDs
  const categoryMatch = categories.find(
    c => c.nameEn.toLowerCase() === parsed.primaryCategory.toLowerCase()
  );

  return {
    primaryCategory: categoryMatch?.id || categories[0]?.id || '',
    requesterType: requesterTypeId, // Use the PROVIDED requester type ID
    confidence: parsed.confidence || 0.5,
  };
}

/**
 * Match templates to a case using Gemini
 * NOTE: Templates now use Category IDs and RequesterType IDs
 */
export async function matchTemplates(
  caseDescription: string,
  classification: Classification,
  templates: Template[],
  categories: Category[],
  requesterTypes: RequesterType[]
): Promise<TemplateMatch[]> {
  // Get category and type names for better AI understanding
  const category = categories.find(c => c.id === classification.primaryCategory);
  const requesterType = requesterTypes.find(t => t.id === classification.requesterType);

  // Filter templates by category first
  let relevantTemplates = templates.filter(
    (t) => t.primaryCategory === classification.primaryCategory
  );

  // Filter by requesterType: prioritize exact matches, allow "Unknown" for broader applicability
  if (classification.requesterType) {
    const exactMatches = relevantTemplates.filter(
      (t) => t.requesterType === classification.requesterType
    );
    const unknownMatches = relevantTemplates.filter(
      (t) => {
        const type = requesterTypes.find(rt => rt.id === t.requesterType);
        return type?.nameEn === 'Unknown';
      }
    );
    
    // Prefer exact matches, then include unknown matches
    relevantTemplates = exactMatches.length > 0 ? exactMatches : [...exactMatches, ...unknownMatches];
  }

  if (relevantTemplates.length === 0) {
    return [];
  }

  const templatesText = relevantTemplates
    .map((t, i) => {
      const tCategory = categories.find(c => c.id === t.primaryCategory);
      const tType = requesterTypes.find(rt => rt.id === t.requesterType);
      
      return `Template ${i + 1}:
Name: ${t.templateName}
When to Use: ${t.whenToUse}
Keywords: ${t.keywords.join(', ')}
Category: ${tCategory?.nameEn || 'Unknown'}
Requester Type: ${tType?.nameEn || 'Unknown'}`;
    })
    .join('\n\n');

  const prompt = `You are matching a GDPR case to response templates.

Case: ${caseDescription}
Classification: ${category?.nameEn || 'Unknown'}
Requester Type: ${requesterType?.nameEn || 'Unknown'}

Available Templates:
${templatesText}

Rank the templates by relevance (0.0 to 1.0 confidence) considering:
1. Category match
2. Requester type match (prefer exact match over "Unknown")
3. Keyword relevance
4. "When to Use" description

Return the top 2 matches.

Respond in JSON format:
{
  "matches": [
    {
      "templateIndex": 0,
      "confidence": 0.95,
      "reason": "Why this template matches"
    }
  ]
}`;

  const result = await model.generateContent(prompt);
  const response = result.response.text();

  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return [];
  }

  const parsed = JSON.parse(jsonMatch[0]);

  return parsed.matches.map((m: any) => ({
    template: relevantTemplates[m.templateIndex],
    confidence: m.confidence,
    reason: m.reason,
  }));
}

/**
 * Extract key details from case description
 */
export async function extractDetails(
  caseDescription: string,
  market: string
): Promise<Record<string, string>> {
  const prompt = `Extract key details from this GDPR case for template placeholder filling.

Case: ${caseDescription}
Market: ${market}

Extract:
- Customer name (first/last) if mentioned
- Email addresses
- Account numbers
- Dates mentioned
- Any other relevant identifiers

Respond in JSON format:
{
  "firstName": "...",
  "lastName": "...",
  "email": "...",
  "accountNumber": "...",
  "date": "...",
  "other": "..."
}

If a field is not found, use empty string.`;

  const result = await model.generateContent(prompt);
  const response = result.response.text();

  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return {};
  }

  return JSON.parse(jsonMatch[0]);
}

/**
 * Generate a draft reply using template and extracted details
 */
export async function generateDraftReply(
  template: Template,
  keyDetails: Record<string, string>,
  caseId: string
): Promise<string> {
  const prompt = `Generate a personalized GDPR response using this template.

Template:
${template.templateText}

Key Details:
${Object.entries(keyDetails)
  .map(([key, value]) => `${key}: ${value}`)
  .join('\n')}

Case ID: ${caseId}

Fill in the placeholders like ((Anrede)), ((Vorname)), ((Nachname)), etc. with the appropriate values. If a value is not available, use appropriate placeholder text or omit.

Return only the filled template text, no extra formatting.`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

/**
 * Test Gemini connection
 */
export async function testConnection(): Promise<string> {
  const result = await model.generateContent('Say "Connection successful!" in one sentence.');
  return result.response.text();
}
