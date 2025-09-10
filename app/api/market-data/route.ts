import { NextRequest, NextResponse } from 'next/server';
import { getStockData, getCryptoData, getMultipleStocks, getMarketSummary } from '@/lib/market-data';

// CORS headers for cross-origin requests from E2B sandbox
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'stock', 'crypto', 'multiple', 'summary'
    const symbol = searchParams.get('symbol');
    const symbols = searchParams.get('symbols'); // comma-separated

    console.log('[market-data] Request:', { type, symbol, symbols });

    switch (type) {
      case 'stock':
        if (!symbol) {
          return NextResponse.json({ error: 'Symbol is required for stock data' }, { status: 400 });
        }
        const stockData = await getStockData(symbol);
        if (!stockData) {
          return NextResponse.json({ error: `Stock data not found for ${symbol}` }, { status: 404 });
        }
        return NextResponse.json(stockData, { headers: corsHeaders });

      case 'crypto':
        if (!symbol) {
          return NextResponse.json({ error: 'Symbol is required for crypto data' }, { status: 400 });
        }
        const cryptoData = await getCryptoData(symbol.toLowerCase());
        if (!cryptoData) {
          return NextResponse.json({ error: `Crypto data not found for ${symbol}` }, { status: 404 });
        }
        return NextResponse.json(cryptoData, { headers: corsHeaders });

      case 'multiple':
        if (!symbols) {
          return NextResponse.json({ error: 'Symbols are required for multiple stocks' }, { status: 400 });
        }
        const symbolsList = symbols.split(',').map(s => s.trim());
        const multipleData = await getMultipleStocks(symbolsList);
        return NextResponse.json(multipleData, { headers: corsHeaders });

      case 'summary':
        const summary = await getMarketSummary();
        return NextResponse.json(summary, { headers: corsHeaders });

      default:
        return NextResponse.json({
          error: 'Invalid type. Use: stock, crypto, multiple, or summary',
          examples: {
            stock: '/api/market-data?type=stock&symbol=AAPL',
            crypto: '/api/market-data?type=crypto&symbol=bitcoin',
            multiple: '/api/market-data?type=multiple&symbols=AAPL,GOOGL,MSFT',
            summary: '/api/market-data?type=summary'
          }
        }, { status: 400, headers: corsHeaders });
    }
  } catch (error) {
    console.error('[market-data] Error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch market data',
      details: (error as Error).message 
    }, { status: 500, headers: corsHeaders });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { symbols, type = 'stock' } = await request.json();

    if (!symbols || !Array.isArray(symbols)) {
      return NextResponse.json({ error: 'Symbols array is required' }, { status: 400, headers: corsHeaders });
    }

    console.log('[market-data] POST request:', { symbols, type });

    if (type === 'stock') {
      const data = await getMultipleStocks(symbols);
      return NextResponse.json(data, { headers: corsHeaders });
    } else if (type === 'crypto') {
      const promises = symbols.map(symbol => getCryptoData(symbol.toLowerCase()));
      const results = await Promise.all(promises);
      const data = results.filter(result => result !== null);
      return NextResponse.json(data, { headers: corsHeaders });
    } else {
      return NextResponse.json({ error: 'Invalid type. Use: stock or crypto' }, { status: 400, headers: corsHeaders });
    }
  } catch (error) {
    console.error('[market-data] POST Error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch market data',
      details: (error as Error).message 
    }, { status: 500, headers: corsHeaders });
  }
}

// Handle preflight OPTIONS requests for CORS
export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders });
}