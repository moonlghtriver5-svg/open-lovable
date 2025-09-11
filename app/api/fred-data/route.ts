import { NextRequest, NextResponse } from 'next/server';
import { fredService } from '@/lib/services/fred-api';

// CORS headers for cross-origin requests (E2B sandboxes calling GitHub Codespaces)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle preflight requests
export async function OPTIONS(request: NextRequest) {
  return new Response(null, { status: 200, headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const seriesId = searchParams.get('series');
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const limit = searchParams.get('limit');

    if (!seriesId) {
      return NextResponse.json({
        success: false,
        error: 'Series ID is required'
      }, { status: 400, headers: corsHeaders });
    }

    console.log('[fred-data] Fetching data for series:', seriesId);

    const params: any = {};
    if (start) params.start = start;
    if (end) params.end = end;
    if (limit) params.limit = parseInt(limit);

    const observations = await fredService.getObservations(seriesId, params);
    
    // Filter out invalid values (.) and convert to numbers
    const cleanData = observations
      .filter(obs => obs.value && obs.value !== '.')
      .map(obs => ({
        date: obs.date,
        value: parseFloat(obs.value)
      }))
      .filter(obs => !isNaN(obs.value));

    return NextResponse.json({
      success: true,
      data: cleanData,
      series: seriesId,
      count: cleanData.length
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('[fred-data] Error fetching data:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch economic data'
    }, { status: 500, headers: corsHeaders });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { seriesIds, start, end, limit } = body;

    if (!seriesIds || !Array.isArray(seriesIds) || seriesIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Series IDs array is required'
      }, { status: 400, headers: corsHeaders });
    }

    console.log('[fred-data] Fetching multiple series:', seriesIds);

    const results = {};
    const params: any = {};
    if (start) params.start = start;
    if (end) params.end = end;
    if (limit) params.limit = parseInt(limit);

    // Fetch data for all requested series
    for (const seriesId of seriesIds) {
      try {
        const observations = await fredService.getObservations(seriesId, params);
        
        // Filter out invalid values and convert to numbers
        const cleanData = observations
          .filter(obs => obs.value && obs.value !== '.')
          .map(obs => ({
            date: obs.date,
            value: parseFloat(obs.value)
          }))
          .filter(obs => !isNaN(obs.value));

        results[seriesId] = {
          data: cleanData,
          count: cleanData.length
        };
      } catch (error) {
        console.error(`[fred-data] Error fetching series ${seriesId}:`, error);
        results[seriesId] = {
          error: error instanceof Error ? error.message : 'Failed to fetch data',
          data: [],
          count: 0
        };
      }
    }

    return NextResponse.json({
      success: true,
      results,
      seriesIds
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('[fred-data] Error in bulk fetch:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch economic data'
    }, { status: 500, headers: corsHeaders });
  }
}