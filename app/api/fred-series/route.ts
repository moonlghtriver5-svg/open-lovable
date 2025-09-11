import { NextRequest, NextResponse } from 'next/server';
import { fredService } from '@/lib/services/fred-api';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const seriesId = searchParams.get('series');
    const search = searchParams.get('search');
    const limit = searchParams.get('limit');

    if (search) {
      // Search for series by text
      console.log('[fred-series] Searching for series with text:', search);
      
      const searchLimit = limit ? parseInt(limit) : 10;
      const series = await fredService.searchSeries(search, searchLimit);
      
      return NextResponse.json({
        success: true,
        series: series.map(s => ({
          id: s.id,
          title: s.title,
          units: s.units,
          frequency: s.frequency,
          observation_start: s.observation_start,
          observation_end: s.observation_end,
          notes: s.notes
        })),
        query: search,
        count: series.length
      });
      
    } else if (seriesId) {
      // Get specific series information
      console.log('[fred-series] Getting series info for:', seriesId);
      
      const series = await fredService.getSeries(seriesId);
      
      if (series.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'Series not found'
        }, { status: 404 });
      }
      
      return NextResponse.json({
        success: true,
        series: series[0],
        id: seriesId
      });
      
    } else {
      return NextResponse.json({
        success: false,
        error: 'Either series ID or search query is required'
      }, { status: 400 });
    }

  } catch (error) {
    console.error('[fred-series] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch series information'
    }, { status: 500 });
  }
}

// POST endpoint for getting multiple series info at once
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { seriesIds } = body;

    if (!seriesIds || !Array.isArray(seriesIds) || seriesIds.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Series IDs array is required'
      }, { status: 400 });
    }

    console.log('[fred-series] Getting info for multiple series:', seriesIds);

    const results = {};

    for (const seriesId of seriesIds) {
      try {
        const series = await fredService.getSeries(seriesId);
        
        if (series.length > 0) {
          results[seriesId] = {
            success: true,
            info: {
              id: series[0].id,
              title: series[0].title,
              units: series[0].units,
              frequency: series[0].frequency,
              observation_start: series[0].observation_start,
              observation_end: series[0].observation_end,
              notes: series[0].notes
            }
          };
        } else {
          results[seriesId] = {
            success: false,
            error: 'Series not found'
          };
        }
      } catch (error) {
        console.error(`[fred-series] Error fetching series ${seriesId}:`, error);
        results[seriesId] = {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fetch series info'
        };
      }
    }

    return NextResponse.json({
      success: true,
      results,
      seriesIds
    });

  } catch (error) {
    console.error('[fred-series] Error in bulk series info fetch:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch series information'
    }, { status: 500 });
  }
}