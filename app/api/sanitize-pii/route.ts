import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY not found in environment variables');
}

interface SanitizeRequest {
  text: string;
}

interface SanitizeResponse {
  sanitizedText: string;
  piiFound: {
    names: string[];
    emails: string[];
    addresses: string[];
    phoneNumbers: string[];
  };
  success: boolean;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'Gemini API key not configured' },
        { status: 500 }
      );
    }

    const body: SanitizeRequest = await request.json();
    const { text } = body;

    if (!text || text.trim().length === 0) {
      return NextResponse.json<SanitizeResponse>({
        success: true,
        sanitizedText: text,
        piiFound: {
          names: [],
          emails: [],
          addresses: [],
          phoneNumbers: [],
        },
      });
    }

    const prompt = `You are a PII (Personally Identifiable Information) sanitization assistant for GDPR compliance.

Your task:
1. Identify ALL PII in the text (names, emails, addresses, phone numbers)
2. Replace them with placeholders:
   - Names → [NAME]
   - Emails → [EMAIL]
   - Addresses → [ADDRESS]
   - Phone numbers → [PHONE]

Input text:
"""
${text}
"""

Respond ONLY with valid JSON in this exact format:
{
  "sanitizedText": "the text with PII replaced by placeholders",
  "piiFound": {
    "names": ["list of names found"],
    "emails": ["list of emails found"],
    "addresses": ["list of addresses found"],
    "phoneNumbers": ["list of phone numbers found"]
  }
}

Do NOT include any other text, explanations, or markdown formatting. Only JSON.`;

    const model = "gemini-1.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2048,
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Gemini API error:', response.status, errorText);
      return NextResponse.json(
        { 
          success: false, 
          error: `Gemini API error: ${response.status}`,
          sanitizedText: text,
          piiFound: { names: [], emails: [], addresses: [], phoneNumbers: [] }
        },
        { status: 500 }
      );
    }

    const data = await response.json();
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Parse AI response
    let parsedResponse;
    try {
      // Remove markdown code blocks if present
      const cleanedResponse = aiResponse
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      
      parsedResponse = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('❌ Failed to parse AI response:', aiResponse);
      return NextResponse.json<SanitizeResponse>({
        success: false,
        error: 'Failed to parse AI response',
        sanitizedText: text,
        piiFound: { names: [], emails: [], addresses: [], phoneNumbers: [] }
      });
    }

    return NextResponse.json<SanitizeResponse>({
      success: true,
      sanitizedText: parsedResponse.sanitizedText || text,
      piiFound: parsedResponse.piiFound || { names: [], emails: [], addresses: [], phoneNumbers: [] },
    });

  } catch (error) {
    console.error('❌ Error in sanitize-pii API:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        sanitizedText: '',
        piiFound: { names: [], emails: [], addresses: [], phoneNumbers: [] }
      },
      { status: 500 }
    );
  }
}
