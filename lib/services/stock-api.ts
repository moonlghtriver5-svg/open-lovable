// Stock Market Data API Service
// This service provides access to real-time stock market data from various free APIs

export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  timestamp: number;
}

export interface StockCandle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface StockApiResponse {
  success: boolean;
  data: StockQuote[] | StockCandle[];
  symbol?: string;
  count: number;
  error?: string;
}

class StockMarketService {
  private baseUrl = 'https://query1.finance.yahoo.com';

  // Get real-time stock quote
  async getQuote(symbol: string): Promise<StockQuote> {
    const url = `${this.baseUrl}/v8/finance/chart/${symbol.toUpperCase()}?range=1d&interval=1d`;
    console.log('[Stock API] Fetching quote for:', symbol);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Stock API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[Stock API] Quote response meta:', data.chart?.result?.[0]?.meta);

    if (!data.chart?.result?.[0]) {
      throw new Error('Invalid response from Yahoo Finance API');
    }

    const result = data.chart.result[0];
    const meta = result.meta;
    
    return {
      symbol: meta.symbol || symbol.toUpperCase(),
      price: meta.regularMarketPrice || 0,
      change: (meta.regularMarketPrice || 0) - (meta.chartPreviousClose || 0),
      changePercent: meta.regularMarketPrice && meta.chartPreviousClose 
        ? ((meta.regularMarketPrice - meta.chartPreviousClose) / meta.chartPreviousClose) 
        : 0,
      volume: meta.regularMarketVolume || 0,
      timestamp: Date.now()
    };
  }

  // Get historical stock data (candles)
  async getCandles(symbol: string, timeframe: 'D' | 'H' | '5' = 'D', limit: number = 30): Promise<StockCandle[]> {
    // Map timeframe to Yahoo Finance intervals
    const intervalMap = {
      'D': '1d',
      'H': '1h', 
      '5': '5m'
    };
    
    const rangeMap = {
      'D': Math.max(limit, 30) > 100 ? '1y' : Math.max(limit, 30) > 30 ? '3mo' : '1mo',
      'H': '5d',
      '5': '1d'
    };

    const interval = intervalMap[timeframe] || '1d';
    const range = rangeMap[timeframe] || '1mo';
    
    const url = `${this.baseUrl}/v8/finance/chart/${symbol.toUpperCase()}?range=${range}&interval=${interval}`;
    console.log('[Stock API] Fetching candles for:', symbol, timeframe, 'URL:', url);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Stock API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('[Stock API] Candles response sample:', { 
      symbol: data.chart?.result?.[0]?.meta?.symbol,
      count: data.chart?.result?.[0]?.timestamp?.length || 0
    });

    if (!data.chart?.result?.[0]) {
      throw new Error('Invalid response from Yahoo Finance API');
    }

    const result = data.chart.result[0];
    const timestamps = result.timestamp || [];
    const indicators = result.indicators?.quote?.[0] || {};
    const opens = indicators.open || [];
    const highs = indicators.high || [];
    const lows = indicators.low || [];
    const closes = indicators.close || [];
    const volumes = indicators.volume || [];

    // Transform data into candles format
    const candles: StockCandle[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      // Skip null/invalid data points
      if (closes[i] != null) {
        candles.push({
          timestamp: timestamps[i] * 1000, // Convert to milliseconds
          open: opens[i] || 0,
          high: highs[i] || 0,
          low: lows[i] || 0,
          close: closes[i] || 0,
          volume: volumes[i] || 0
        });
      }
    }

    return candles.slice(-limit); // Return latest entries
  }

  // Common stock symbols and their descriptions
  static readonly COMMON_STOCKS = {
    // Tech Giants
    AAPL: 'Apple Inc.',
    MSFT: 'Microsoft Corporation',
    GOOGL: 'Alphabet Inc. (Google)',
    AMZN: 'Amazon.com Inc.',
    META: 'Meta Platforms Inc. (Facebook)',
    TSLA: 'Tesla Inc.',
    NVDA: 'NVIDIA Corporation',
    
    // Financial
    JPM: 'JPMorgan Chase & Co.',
    BAC: 'Bank of America Corp.',
    WFC: 'Wells Fargo & Company',
    GS: 'Goldman Sachs Group Inc.',
    
    // Healthcare
    JNJ: 'Johnson & Johnson',
    PFE: 'Pfizer Inc.',
    UNH: 'UnitedHealth Group Inc.',
    
    // Consumer
    KO: 'Coca-Cola Company',
    PEP: 'PepsiCo Inc.',
    WMT: 'Walmart Inc.',
    DIS: 'Walt Disney Company',
    
    // Industrial
    BA: 'Boeing Company',
    GE: 'General Electric Company',
    CAT: 'Caterpillar Inc.',
  };

  // Helper methods for common requests
  async getTechStocks(): Promise<string[]> {
    return ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'NVDA'];
  }

  async getMarketMovers(): Promise<string[]> {
    return ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'GOOGL'];
  }

  async getBlueChips(): Promise<string[]> {
    return ['AAPL', 'MSFT', 'JPM', 'JNJ', 'KO', 'WMT', 'DIS'];
  }

  // Get stock description
  getStockDescription(symbol: string): string {
    return StockMarketService.COMMON_STOCKS[symbol as keyof typeof StockMarketService.COMMON_STOCKS] || `${symbol} Stock`;
  }
}

// Export a singleton instance
export const stockService = new StockMarketService();
export default StockMarketService;