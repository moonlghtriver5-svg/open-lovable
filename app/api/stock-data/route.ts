import { NextRequest, NextResponse } from 'next/server';
import { stockService } from '@/lib/services/stock-api';

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
    const symbol = searchParams.get('symbol');
    const type = searchParams.get('type') || 'quote'; // 'quote' or 'candles'
    const timeframe = searchParams.get('timeframe') || 'D';
    const limit = searchParams.get('limit');

    if (!symbol) {
      return NextResponse.json({
        success: false,
        error: 'Stock symbol is required'
      }, { status: 400, headers: corsHeaders });
    }

    console.log('[stock-data] Fetching data for symbol:', symbol, 'type:', type);

    if (type === 'quote') {
      // Get real-time quote
      const quote = await stockService.getQuote(symbol);
      
      return NextResponse.json({
        success: true,
        data: [quote], // Wrap in array for consistency
        symbol: symbol.toUpperCase(),
        count: 1,
        type: 'quote'
      }, { headers: corsHeaders });

    } else if (type === 'candles') {
      // Get historical candles
      const limitNum = limit ? parseInt(limit) : 30;
      const candles = await stockService.getCandles(symbol, timeframe as 'D' | 'H' | '5', limitNum);
      
      return NextResponse.json({
        success: true,
        data: candles,
        symbol: symbol.toUpperCase(),
        count: candles.length,
        type: 'candles',
        timeframe
      }, { headers: corsHeaders });

    } else {
      return NextResponse.json({
        success: false,
        error: 'Invalid type. Use "quote" or "candles"'
      }, { status: 400, headers: corsHeaders });
    }

  } catch (error) {
    console.error('[stock-data] Error fetching data:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch stock data'
    }, { status: 500, headers: corsHeaders });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbols, type = 'quote', timeframe = 'D', limit = 30 } = body;

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Symbols array is required'
      }, { status: 400, headers: corsHeaders });
    }

    console.log('[stock-data] Fetching multiple symbols:', symbols);

    const results: Record<string, any> = {};

    // Fetch data for all requested symbols
    for (const symbol of symbols) {
      try {
        if (type === 'quote') {
          const quote = await stockService.getQuote(symbol);
          results[symbol.toUpperCase()] = {
            data: [quote],
            count: 1,
            type: 'quote'
          };
        } else if (type === 'candles') {
          const candles = await stockService.getCandles(symbol, timeframe, parseInt(limit.toString()));
          results[symbol.toUpperCase()] = {
            data: candles,
            count: candles.length,
            type: 'candles',
            timeframe
          };
        }
      } catch (error) {
        console.error(`[stock-data] Error fetching ${symbol}:`, error);
        results[symbol.toUpperCase()] = {
          error: error instanceof Error ? error.message : 'Failed to fetch data',
          data: [],
          count: 0
        };
      }
    }

    return NextResponse.json({
      success: true,
      results,
      symbols: symbols.map(s => s.toUpperCase()),
      type
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('[stock-data] Error in bulk fetch:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch stock data'
    }, { status: 500, headers: corsHeaders });
  }
}