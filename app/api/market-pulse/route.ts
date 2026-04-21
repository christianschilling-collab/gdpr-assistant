import { NextRequest, NextResponse } from 'next/server';
import {
  saveMarketPulseCheck,
  getAllPulseChecks,
  getPulseChecksByWeek,
  getAverageScoreForWeek,
  getWeekTrends,
  getWeekString,
} from '@/lib/firebase/marketPulse';
import { MarketPulseCheck } from '@/lib/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const week = searchParams.get('week');
    const market = searchParams.get('market');
    const status = searchParams.get('status') as MarketPulseCheck['status'] | null;
    const action = searchParams.get('action');

    if (action === 'average-score' && week) {
      const average = await getAverageScoreForWeek(week);
      return NextResponse.json({ averageScore: average });
    }

    if (action === 'trends' && week) {
      const trends = await getWeekTrends(week);
      return NextResponse.json({ trends });
    }

    const checks = await getAllPulseChecks({
      week: week || undefined,
      market: market || undefined,
      status: status || undefined,
    });

    return NextResponse.json({ checks });
  } catch (error: any) {
    console.error('Error in GET /api/market-pulse:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch pulse checks' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const pulseCheck: MarketPulseCheck = {
      market: body.market,
      week: body.week || getWeekString(),
      submittedBy: body.submittedBy || 'system',
      responses: body.responses || [],
      overallScore: body.overallScore,
      status: body.status || 'submitted',
      notes: body.notes,
      submittedAt: body.submittedAt ? new Date(body.submittedAt) : new Date(),
    };

    const id = await saveMarketPulseCheck(pulseCheck);

    return NextResponse.json({ id, success: true });
  } catch (error: any) {
    console.error('Error in POST /api/market-pulse:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save pulse check' },
      { status: 500 }
    );
  }
}
