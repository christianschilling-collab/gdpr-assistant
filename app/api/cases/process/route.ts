/**
 * API Route: Process a GDPR case with AI
 * POST /api/cases/process
 */

import { NextRequest, NextResponse } from 'next/server';
import { classifyCase, matchTemplates, extractDetails, generateDraftReply } from '@/lib/gemini/client';
import { getTemplates } from '@/lib/firebase/templates';
import { updateCase } from '@/lib/firebase/cases';

export async function POST(request: NextRequest) {
  // TODO: Fix this API route - classifyCase function signature changed
  return NextResponse.json(
    { error: 'AI processing temporarily disabled during deployment' },
    { status: 503 }
  );
  
  /*
  try {
    const body = await request.json();
    const { caseId, caseDescription, specificQuestion, market } = body;

    if (!caseId || !caseDescription) {
      return NextResponse.json(
        { error: 'Missing required fields: caseId, caseDescription' },
        { status: 400 }
      );
    }

    // Step 1: Classify the case
    console.log('Step 1: Classifying case...');
    const classification = await classifyCase(
      caseDescription,
      specificQuestion,
      market
    );

    // Step 2: Get all templates
    console.log('Step 2: Loading templates...');
    const templates = await getTemplates();

    // Step 3: Match templates
    console.log('Step 3: Matching templates...');
    const templateMatches = await matchTemplates(
      caseDescription,
      classification,
      templates
    );

    // Step 4: Extract details
    console.log('Step 4: Extracting details...');
    const keyDetails = await extractDetails(caseDescription, market);

    // Step 5: Generate draft reply (if good match found)
    let suggestedReply = '';
    if (templateMatches.length > 0 && templateMatches[0].confidence > 0.4) {
      console.log('Step 5: Generating draft reply...');
      suggestedReply = await generateDraftReply(
        templateMatches[0].template,
        keyDetails,
        caseId
      );
    } else {
      suggestedReply = '[No matching template found. Manual review required.]';
    }

    // Step 6: Determine if flagging needed
    const reviewFlag =
      classification.confidence < 0.7 ||
      templateMatches.length === 0 ||
      templateMatches[0].confidence < 0.4;

    // Step 7: Update the case in Firestore
    console.log('Step 6: Updating case...');
    await updateCase(caseId, {
      primaryCategory: classification.primaryCategory,
      subCategory: classification.subCategory,
      customerType: classification.customerType,
      confidence: classification.confidence,
      templateMatches: templateMatches.map((m) => ({
        template: m.template,
        confidence: m.confidence,
        reason: m.reason,
      })),
      suggestedReply,
      keyDetails,
      reviewFlag,
      status: 'AI Processed',
    });

    return NextResponse.json({
      success: true,
      classification,
      templateMatches: templateMatches.slice(0, 2), // Return top 2
      suggestedReply,
      keyDetails,
      reviewFlag,
    });
  } catch (error: any) {
    console.error('Error processing case:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
  */
}
