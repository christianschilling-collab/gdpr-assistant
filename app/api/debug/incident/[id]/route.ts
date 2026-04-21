import { NextResponse } from 'next/server';
import { getIncident, getAllIncidents } from '@/lib/firebase/incidents';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  console.log('🔍 API: Checking incident:', id);
  
  try {
    const incident = await getIncident(id);
    
    if (!incident) {
      console.log('❌ API: Incident not found');
      
      // List all incidents for debugging
      const allIncidents = await getAllIncidents();
      console.log(`📋 Total incidents in DB: ${allIncidents.length}`);
      allIncidents.slice(0, 5).forEach(inc => {
        console.log(`  - ${inc.id} | ${inc.incidentId} | ${inc.natureOfIncident?.substring(0, 50)}`);
      });
      
      return NextResponse.json({
        found: false,
        message: 'Incident not found',
        searchedId: id,
        totalIncidents: allIncidents.length,
        recentIncidents: allIncidents.slice(0, 5).map(inc => ({
          id: inc.id,
          incidentId: inc.incidentId,
          nature: inc.natureOfIncident,
        })),
      }, { status: 404 });
    }
    
    console.log('✅ API: Incident found:', incident.incidentId);
    
    return NextResponse.json({
      found: true,
      incident: {
        id: incident.id,
        incidentId: incident.incidentId,
        natureOfIncident: incident.natureOfIncident,
        status: incident.status,
        createdAt: incident.createdAt.toISOString(),
      },
    });
    
  } catch (error) {
    console.error('❌ API Error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
