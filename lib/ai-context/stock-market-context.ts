// Stock Market Context for AI Generation
// This system detects stock market requests and enhances AI prompts with real stock API context

export interface StockContext {
  isStockRequest: boolean;
  detectedKeywords: string[];
  suggestedSymbols: string[];
  contextPrompt: string;
}

export class StockMarketDetector {
  // Stock market keywords and their associated symbols
  private static readonly STOCK_KEYWORDS = {
    // General stock terms
    'stock': ['AAPL', 'MSFT', 'GOOGL', 'TSLA'],
    'stocks': ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA'],
    'stock market': ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA'],
    'stock price': ['AAPL', 'MSFT', 'GOOGL'],
    'stock screener': ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA', 'META'],
    'portfolio': ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'JPM'],
    'investment': ['AAPL', 'MSFT', 'GOOGL', 'JPM', 'JNJ'],
    'trading': ['AAPL', 'TSLA', 'NVDA', 'GOOGL'],
    'trader': ['AAPL', 'TSLA', 'NVDA', 'GOOGL'],
    
    // Specific companies
    'apple': ['AAPL'],
    'microsoft': ['MSFT'],
    'google': ['GOOGL'],
    'alphabet': ['GOOGL'],
    'amazon': ['AMZN'],
    'tesla': ['TSLA'],
    'nvidia': ['NVDA'],
    'facebook': ['META'],
    'meta': ['META'],
    'jpmorgan': ['JPM'],
    'jp morgan': ['JPM'],
    'johnson': ['JNJ'],
    'coca cola': ['KO'],
    'disney': ['DIS'],
    'walmart': ['WMT'],
    
    // Market analysis terms
    'market analysis': ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA'],
    'technical analysis': ['AAPL', 'MSFT', 'GOOGL', 'TSLA'],
    'fundamental analysis': ['AAPL', 'MSFT', 'GOOGL', 'JPM'],
    'earnings': ['AAPL', 'MSFT', 'GOOGL', 'TSLA'],
    'dividend': ['AAPL', 'MSFT', 'JNJ', 'KO'],
    'market cap': ['AAPL', 'MSFT', 'GOOGL', 'TSLA'],
    'volume': ['AAPL', 'TSLA', 'NVDA'],
    'volatility': ['TSLA', 'NVDA', 'GOOGL'],
    
    // Dashboard types
    'dashboard': ['AAPL', 'MSFT', 'GOOGL', 'TSLA'],
    'tracker': ['AAPL', 'MSFT', 'GOOGL', 'TSLA'],
    'monitor': ['AAPL', 'MSFT', 'GOOGL', 'TSLA'],
    'watchlist': ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA'],
  };

  // Dashboard types and their requirements
  private static readonly DASHBOARD_TEMPLATES = {
    'Stock Screener': {
      symbols: ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA', 'META'],
      features: ['quotes', 'filters', 'sorting'],
      description: 'Filter and compare stocks based on various criteria'
    },
    'Portfolio Tracker': {
      symbols: ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'JPM'],
      features: ['quotes', 'portfolio-value', 'gains-losses'],
      description: 'Track portfolio performance and holdings value'
    },
    'Stock Dashboard': {
      symbols: ['AAPL', 'MSFT', 'GOOGL', 'TSLA'],
      features: ['quotes', 'charts', 'news'],
      description: 'Real-time stock quotes and price charts'
    },
    'Market Monitor': {
      symbols: ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA'],
      features: ['quotes', 'market-overview', 'movers'],
      description: 'Monitor overall market trends and top movers'
    },
    'Trading Dashboard': {
      symbols: ['AAPL', 'TSLA', 'NVDA', 'GOOGL'],
      features: ['quotes', 'charts', 'technical-indicators'],
      description: 'Advanced trading interface with technical analysis'
    }
  };

  static detectStockRequest(userPrompt: string): StockContext {
    const prompt = userPrompt.toLowerCase();
    const detectedKeywords: string[] = [];
    const suggestedSymbols: string[] = [];

    // Check for stock market keywords
    for (const [keyword, symbols] of Object.entries(this.STOCK_KEYWORDS)) {
      if (prompt.includes(keyword)) {
        detectedKeywords.push(keyword);
        suggestedSymbols.push(...symbols);
      }
    }

    // Remove duplicates
    const uniqueSymbols = [...new Set(suggestedSymbols)];
    const isStockRequest = detectedKeywords.length > 0;

    let contextPrompt = '';
    if (isStockRequest) {
      contextPrompt = this.generateStockPrompt(detectedKeywords, uniqueSymbols, userPrompt);
    }

    return {
      isStockRequest,
      detectedKeywords,
      suggestedSymbols: uniqueSymbols,
      contextPrompt
    };
  }

  private static generateStockPrompt(keywords: string[], symbols: string[], originalPrompt: string): string {
    return `
📈 STOCK MARKET APPLICATION - REAL STOCK API REQUIRED 📈

🚨 ABSOLUTE REQUIREMENT: NO SAMPLE DATA! ONLY REAL STOCK API CALLS! 🚨

The user wants: "${originalPrompt}"

YOU MUST:
1. ❌ NEVER use sample/fake data arrays like: const stockData = [{symbol: 'AAPL', price: 150.25}...]
2. ✅ ALWAYS use real API calls like: fetch('/api/stock-data?symbol=AAPL&type=quote')
3. ✅ ALWAYS use useState + useEffect for data fetching
4. ✅ ALWAYS show loading states while fetching
5. ✅ Users must see network requests in DevTools when using the app

DETECTED STOCK TOPICS: ${keywords.join(', ')}
RELEVANT STOCK SYMBOLS: ${symbols.slice(0, 8).join(', ')} ${symbols.length > 8 ? '(and more)' : ''}

STOCK API INTEGRATION INSTRUCTIONS:
1. Use the built-in Stock API endpoints: /api/stock-data
2. These endpoints provide real-time quotes and historical data
3. Include proper error handling and loading states
4. Format data for chart libraries (Recharts recommended)

REQUIRED COMPONENTS TO INCLUDE:
- Stock data fetching service using local API endpoints
- Real-time stock quotes with live price updates
- Loading states while fetching data (shows "Loading AAPL data...")
- Responsive charts using Recharts or Chart.js
- Stock symbol search and filtering
- Professional stock dashboard styling
- Network activity indicators (users should see API calls in DevTools)
- Price change indicators (green for gains, red for losses)

🚨 CRITICAL: DO NOT USE SAMPLE/FAKE DATA! ALWAYS USE REAL STOCK API CALLS!

API DATA STRUCTURE - UNDERSTAND THESE PATTERNS:

SINGLE STOCK (/api/stock-data?symbol=AAPL&type=quote):
{
  "success": true,
  "data": [{ "symbol": "AAPL", "price": 228.60, "change": 1.81, "changePercent": 0.008 }],
  "symbol": "AAPL",
  "count": 1
}

MULTIPLE STOCKS (POST /api/stock-data with {symbols: ['AAPL', 'TSLA']}):
{
  "success": true,
  "results": {
    "AAPL": { "data": [{ "symbol": "AAPL", "price": 228.60 }], "count": 1 },
    "TSLA": { "data": [{ "symbol": "TSLA", "price": 361.34 }], "count": 1 }
  }
}

MANDATORY STOCK API USAGE - YOU MUST IMPLEMENT THIS EXACTLY:
\`\`\`javascript
// REQUIRED: Real Stock API data fetching
const [stockData, setStockData] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

useEffect(() => {
  const fetchStockData = async () => {
    setLoading(true);
    try {
      // REAL API CALL - NOT SAMPLE DATA!
      // When running in E2B sandbox, call back to GitHub Codespace
      const apiUrl = window.location.origin.includes('e2b.app') 
        ? 'https://friendly-doodle-wrjpvx455j972vjrv-3000.app.github.dev'
        : window.location.origin;
      const response = await fetch(\`\${apiUrl}/api/stock-data?symbol=AAPL&type=quote\`);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      // Transform stock data for charts
      const chartData = result.data.map(item => ({
        symbol: item.symbol,
        price: item.price,
        change: item.change,
        changePercent: item.changePercent,
        volume: item.volume
      }));
      
      setStockData(chartData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  fetchStockData();
}, []);

// For multiple stocks - CORRECT DATA STRUCTURE
const fetchMultipleStocks = async (symbols) => {
  const apiUrl = window.location.origin.includes('e2b.app') 
    ? 'https://friendly-doodle-wrjpvx455j972vjrv-3000.app.github.dev'
    : window.location.origin;
  const response = await fetch(\`\${apiUrl}/api/stock-data\`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbols, type: 'quote' })
  });
  const result = await response.json();
  
  // Transform nested results into flat array for easy mapping
  const stockArray = [];
  for (const [symbol, stockInfo] of Object.entries(result.results)) {
    if (stockInfo.data && stockInfo.data.length > 0) {
      stockArray.push(stockInfo.data[0]); // Get the first (and only) quote
    }
  }
  return stockArray;
};

// For historical data (charts)
const fetchHistoricalData = async (symbol) => {
  const apiUrl = window.location.origin.includes('e2b.app') 
    ? 'https://friendly-doodle-wrjpvx455j972vjrv-3000.app.github.dev'
    : window.location.origin;
  const response = await fetch(\`\${apiUrl}/api/stock-data?symbol=\${symbol}&type=candles&limit=30\`);
  const result = await response.json();
  return result.data;
};
// COMPLETE STOCK SCREENER EXAMPLE - COPY THIS PATTERN:
const StockScreener = () => {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStocks = async () => {
      setLoading(true);
      try {
        const apiUrl = window.location.origin.includes('e2b.app') 
          ? 'https://friendly-doodle-wrjpvx455j972vjrv-3000.app.github.dev'
          : window.location.origin;
          
        const response = await fetch(\`\${apiUrl}/api/stock-data\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbols: ['AAPL', 'MSFT', 'GOOGL', 'TSLA'], type: 'quote' })
        });
        
        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error);
        }
        
        // CORRECT: Transform nested results into flat array
        const stockArray = [];
        for (const [symbol, stockInfo] of Object.entries(result.results)) {
          if (stockInfo.data && stockInfo.data.length > 0) {
            stockArray.push(stockInfo.data[0]);
          }
        }
        
        setStocks(stockArray);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStocks();
  }, []);

  if (loading) return <div>Loading stocks...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {stocks.map(stock => (
        <div key={stock.symbol}>
          {stock.symbol}: \${stock.price} ({stock.changePercent > 0 ? '+' : ''}{(stock.changePercent * 100).toFixed(2)}%)
        </div>
      ))}
    </div>
  );
};
\`\`\`

❌ NEVER DO THIS:
\`\`\`javascript
// THIS IS WRONG - NO SAMPLE DATA ALLOWED!
const stockData = [
  { symbol: 'AAPL', price: 150.25, change: 2.15 },
  // ... more sample data
];
\`\`\`

✅ ALWAYS DO THIS:
\`\`\`javascript
// THIS IS CORRECT - REAL STOCK API CALLS!
const [data, setData] = useState([]);
useEffect(() => {
  const apiUrl = window.location.origin.includes('e2b.app') 
    ? 'https://friendly-doodle-wrjpvx455j972vjrv-3000.app.github.dev'
    : window.location.origin;
  fetch(\`\${apiUrl}/api/stock-data?symbol=AAPL&type=quote\`)
    .then(res => res.json())
    .then(result => setData(result.data));
}, []);
\`\`\`

CHART IMPLEMENTATIONS:
- Use professional color schemes (green for gains, red for losses)
- Include tooltips with exact prices and percentage changes
- Add price trend indicators and volume bars
- Implement responsive design for mobile devices
- Add data source attribution: "Data source: Real-time stock market data"

SYMBOL DESCRIPTIONS FOR UI:
${this.getSymbolDescriptions(symbols)}

Make the application professional, data-rich, and suitable for stock market analysis.
`;
  }

  private static getSymbolDescriptions(symbols: string[]): string {
    const descriptions: Record<string, string> = {
      'AAPL': 'Apple Inc. - Technology',
      'MSFT': 'Microsoft Corporation - Technology',
      'GOOGL': 'Alphabet Inc. (Google) - Technology',
      'AMZN': 'Amazon.com Inc. - E-commerce',
      'TSLA': 'Tesla Inc. - Electric Vehicles',
      'NVDA': 'NVIDIA Corporation - Semiconductors',
      'META': 'Meta Platforms Inc. - Social Media',
      'JPM': 'JPMorgan Chase & Co. - Financial Services',
      'JNJ': 'Johnson & Johnson - Healthcare',
      'KO': 'Coca-Cola Company - Beverages',
      'DIS': 'Walt Disney Company - Entertainment',
      'WMT': 'Walmart Inc. - Retail',
    };

    return symbols.map(s => `- ${s}: ${descriptions[s] || 'Public Company'}`).join('\n');
  }

  static getTemplateForRequest(userPrompt: string): string | null {
    const prompt = userPrompt.toLowerCase();
    
    for (const [templateName, config] of Object.entries(this.DASHBOARD_TEMPLATES)) {
      if (prompt.includes(templateName.toLowerCase()) || 
          config.symbols.some(symbol => prompt.includes(symbol.toLowerCase()))) {
        return templateName;
      }
    }
    
    return null;
  }
}

export default StockMarketDetector;