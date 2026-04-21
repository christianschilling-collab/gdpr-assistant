/**
 * API Route: Classify a GDPR case with AI (server-side only)
 * POST /api/classify-case
 */

import { NextRequest, NextResponse } from 'next/server';
import { classifyCase, extractDetails } from '@/lib/gemini/client';
import { getCategories } from '@/lib/firebase/categories';
import { getRequesterTypes } from '@/lib/firebase/requesterTypes';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      caseDescription, 
      requesterTypeId, 
      specificQuestion, 
      market,
      customerName,
      customerEmail,
      customerAddress
    } = body;

    if (!caseDescription || !requesterTypeId) {
      return NextResponse.json(
        { error: 'Missing required fields: caseDescription, requesterTypeId' },
        { status: 400 }
      );
    }

    // Load categories and requester types
    const categories = await getCategories();
    const requesterTypes = await getRequesterTypes();

    // Call AI classification (server-side, API key is available)
    const classification = await classifyCase(
      caseDescription,
      requesterTypeId,
      categories,
      requesterTypes,
      specificQuestion,
      market
    );

    // Extract customer details from text if not already provided
    const extractedDetails: any = {};
    if (!customerName || !customerEmail || !customerAddress) {
      const details = await extractDetails(caseDescription, market || 'DE');
      
      // Only use extracted details if fields are empty
      if (!customerName && (details.firstName || details.lastName)) {
        extractedDetails.customerName = `${details.firstName || ''} ${details.lastName || ''}`.trim();
      }
      if (!customerEmail && details.email) {
        extractedDetails.customerEmail = details.email;
      }
      if (!customerAddress && details.other) {
        // Check if 'other' contains address-like information
        const addressKeywords = ['straße', 'strasse', 'str.', 'plz', 'stadt'];
        if (addressKeywords.some(keyword => details.other.toLowerCase().includes(keyword))) {
          extractedDetails.customerAddress = details.other;
        }
      }
    }

    return NextResponse.json({
      success: true,
      classification,
      extractedDetails,
    });
  } catch (error: any) {
    console.error('Error classifying case:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
