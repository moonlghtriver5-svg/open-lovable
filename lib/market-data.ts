// Free market data API integrations (no API keys required)

export interface StockData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  marketCap?: number;
  pe?: number;
  high52Week?: number;
  low52Week?: number;
  timestamp: string;
}

export interface CryptoData {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  volume24h?: number;
  marketCap?: number;
  timestamp: string;
}

// Multiple API sources for reliability (fallback strategy)
export async function getStockData(symbol: string): Promise<StockData | null> {
  // Try multiple sources in order of reliability
  const sources = [
    () => getStockDataFromMarketData(symbol),
    () => getStockDataFromYahoo(symbol)
  ];

  for (const source of sources) {
    try {
      const data = await source();
      if (data) {
        return data;
      }
    } catch (error) {
      console.warn(`Stock API source failed for ${symbol}:`, error);
      continue; // Try next source
    }
  }

  console.error(`All stock data sources failed for ${symbol}`);
  return null;
}

// MarketData.app API (free, no key required, reliable)
async function getStockDataFromMarketData(symbol: string): Promise<StockData | null> {
  try {
    const response = await fetch(`https://api.marketdata.app/v1/stocks/quotes/${symbol.toUpperCase()}/`);
    
    if (!response.ok) {
      throw new Error(`MarketData API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.s !== 'ok' || !data.last || !Array.isArray(data.last) || data.last.length === 0) {
      return null;
    }
    
    const currentPrice = data.last[0];
    const change = data.change?.[0] || 0;
    const changePercent = data.changepct?.[0] ? data.changepct[0] * 100 : 0;
    const volume = data.volume?.[0] || 0;
    
    return {
      symbol: symbol.toUpperCase(),
      price: currentPrice,
      change: change,
      changePercent: changePercent,
      volume: volume,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Error fetching stock data from MarketData for ${symbol}:`, error);
    return null;
  }
}

// Yahoo Finance API (free, no key required) - backup
async function getStockDataFromYahoo(symbol: string): Promise<StockData | null> {
  try {
    // Yahoo Finance API endpoint
    const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol.toUpperCase()}`);
    
    if (!response.ok) {
      throw new Error(`Yahoo Finance API error: ${response.status}`);
    }
    
    const data = await response.json();
    const result = data.chart?.result?.[0];
    
    if (!result) {
      return null;
    }
    
    const meta = result.meta;
    const currentPrice = meta.regularMarketPrice || meta.previousClose;
    const previousClose = meta.previousClose;
    const change = currentPrice - previousClose;
    const changePercent = (change / previousClose) * 100;
    
    return {
      symbol: symbol.toUpperCase(),
      price: currentPrice,
      change: change,
      changePercent: changePercent,
      volume: meta.regularMarketVolume,
      marketCap: meta.marketCap,
      pe: meta.trailingPE,
      high52Week: meta.fiftyTwoWeekHigh,
      low52Week: meta.fiftyTwoWeekLow,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Error fetching stock data from Yahoo for ${symbol}:`, error);
    return null;
  }
}


// CoinGecko API (free, no key required)
export async function getCryptoData(coinId: string): Promise<CryptoData | null> {
  try {
    const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true`);
    
    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }
    
    const data = await response.json();
    const coinData = data[coinId];
    
    if (!coinData) {
      return null;
    }
    
    return {
      symbol: coinId.toUpperCase(),
      name: coinId,
      price: coinData.usd,
      change24h: coinData.usd_24h_change || 0,
      changePercent24h: coinData.usd_24h_change || 0,
      volume24h: coinData.usd_24h_vol,
      marketCap: coinData.usd_market_cap,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Error fetching crypto data for ${coinId}:`, error);
    return null;
  }
}

// Multiple stocks at once
export async function getMultipleStocks(symbols: string[]): Promise<StockData[]> {
  const promises = symbols.map(symbol => getStockData(symbol));
  const results = await Promise.all(promises);
  return results.filter((data): data is StockData => data !== null);
}

// Popular crypto coins mapping
export const POPULAR_CRYPTOS = {
  bitcoin: 'bitcoin',
  ethereum: 'ethereum',
  'binance-coin': 'bnb',
  cardano: 'ada',
  solana: 'sol',
  xrp: 'xrp',
  polkadot: 'dot',
  dogecoin: 'doge',
  avalanche: 'avax',
  polygon: 'matic'
};

// Get market summary
export async function getMarketSummary(): Promise<{
  stocks: StockData[];
  cryptos: CryptoData[];
}> {
  const popularStocks = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'META', 'NVDA'];
  const popularCryptos = ['bitcoin', 'ethereum', 'binance-coin'];
  
  const [stocks, cryptos] = await Promise.all([
    getMultipleStocks(popularStocks),
    Promise.all(popularCryptos.map(crypto => getCryptoData(crypto)))
  ]);
  
  return {
    stocks,
    cryptos: cryptos.filter((data): data is CryptoData => data !== null)
  };
}

// Format currency
export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

// Format large numbers (for market cap, volume)
export function formatLargeNumber(num: number): string {
  if (num >= 1e12) {
    return (num / 1e12).toFixed(1) + 'T';
  } else if (num >= 1e9) {
    return (num / 1e9).toFixed(1) + 'B';
  } else if (num >= 1e6) {
    return (num / 1e6).toFixed(1) + 'M';
  } else if (num >= 1e3) {
    return (num / 1e3).toFixed(1) + 'K';
  }
  return num.toString();
}