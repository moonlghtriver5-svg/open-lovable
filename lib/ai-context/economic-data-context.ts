// Economic Data Context for AI Generation
// This system detects economic data requests and enhances AI prompts with FRED API context

export interface EconomicContext {
  isEconomicRequest: boolean;
  detectedKeywords: string[];
  suggestedSeries: string[];
  contextPrompt: string;
}

export class EconomicDataDetector {
  // Economic keywords and their associated FRED series
  private static readonly ECONOMIC_KEYWORDS = {
    // GDP & Growth
    gdp: ['GDP', 'GDPC1', 'GDPPOT'],
    'gross domestic product': ['GDP', 'GDPC1'],
    'economic growth': ['GDP', 'GDPC1', 'GDPR'],
    growth: ['GDPR', 'GDP'],
    
    // Employment
    unemployment: ['UNRATE', 'CIVPART', 'EMRATIO'],
    employment: ['UNRATE', 'PAYEMS', 'EMRATIO'],
    jobs: ['UNRATE', 'PAYEMS', 'JOLTS'],
    'job market': ['UNRATE', 'PAYEMS', 'JOLTS'],
    'labor force': ['CIVPART', 'EMRATIO'],
    
    // Inflation
    inflation: ['CPIAUCSL', 'PCEPI', 'CPILFESL'],
    cpi: ['CPIAUCSL', 'CPILFESL'],
    'consumer price': ['CPIAUCSL'],
    'price index': ['CPIAUCSL', 'PCEPI'],
    
    // Interest Rates
    'interest rate': ['FEDFUNDS', 'DGS10', 'DGS2'],
    'federal funds': ['FEDFUNDS'],
    'treasury': ['DGS10', 'DGS2', 'DGS5'],
    'mortgage rate': ['MORTGAGE30US'],
    
    // Money Supply
    'money supply': ['M1SL', 'M2SL'],
    'm1': ['M1SL'],
    'm2': ['M2SL'],
    
    // Stock Market
    'stock market': ['SP500', 'NASDAQCOM', 'DJIA'],
    'sp500': ['SP500'],
    's&p': ['SP500'],
    'nasdaq': ['NASDAQCOM'],
    'dow jones': ['DJIA'],
    
    // General Economic
    economic: ['GDP', 'UNRATE', 'CPIAUCSL', 'FEDFUNDS'],
    economy: ['GDP', 'UNRATE', 'CPIAUCSL'],
    financial: ['SP500', 'FEDFUNDS', 'DGS10'],
    finance: ['SP500', 'FEDFUNDS', 'DGS10'],
  };

  // Dashboard types and their requirements
  private static readonly DASHBOARD_TEMPLATES = {
    'GDP Tracker': {
      series: ['GDP', 'GDPC1'],
      chartTypes: ['line', 'area'],
      description: 'Track GDP growth over time with real and nominal values'
    },
    'Unemployment Dashboard': {
      series: ['UNRATE', 'CIVPART', 'EMRATIO'],
      chartTypes: ['line', 'bar'],
      description: 'Monitor employment statistics and labor market trends'
    },
    'Inflation Monitor': {
      series: ['CPIAUCSL', 'PCEPI', 'CPILFESL'],
      chartTypes: ['line', 'gauge'],
      description: 'Track inflation rates using CPI and PCE data'
    },
    'Interest Rate Tracker': {
      series: ['FEDFUNDS', 'DGS10', 'DGS2', 'MORTGAGE30US'],
      chartTypes: ['line', 'area'],
      description: 'Monitor Federal Reserve rates and treasury yields'
    },
    'Economic Overview': {
      series: ['GDP', 'UNRATE', 'CPIAUCSL', 'FEDFUNDS'],
      chartTypes: ['line', 'multi-chart'],
      description: 'Comprehensive economic dashboard with key indicators'
    }
  };

  static detectEconomicRequest(userPrompt: string): EconomicContext {
    const prompt = userPrompt.toLowerCase();
    const detectedKeywords: string[] = [];
    const suggestedSeries: string[] = [];

    // Check for economic keywords
    for (const [keyword, series] of Object.entries(this.ECONOMIC_KEYWORDS)) {
      if (prompt.includes(keyword)) {
        detectedKeywords.push(keyword);
        suggestedSeries.push(...series);
      }
    }

    // Remove duplicates
    const uniqueSeries = [...new Set(suggestedSeries)];
    const isEconomicRequest = detectedKeywords.length > 0;

    let contextPrompt = '';
    if (isEconomicRequest) {
      contextPrompt = this.generateEconomicPrompt(detectedKeywords, uniqueSeries, userPrompt);
    }

    return {
      isEconomicRequest,
      detectedKeywords,
      suggestedSeries: uniqueSeries,
      contextPrompt
    };
  }

  private static generateEconomicPrompt(keywords: string[], series: string[], originalPrompt: string): string {
    return `
🏦 ECONOMIC DATA APPLICATION - REAL FRED API REQUIRED 🏦

🚨 ABSOLUTE REQUIREMENT: NO SAMPLE DATA! ONLY REAL FRED API CALLS! 🚨

The user wants: "${originalPrompt}"

YOU MUST:
1. ❌ NEVER use sample/fake data arrays like: const gdpData = [{date: '2019-Q1', value: 21.49}...]
2. ✅ ALWAYS use real API calls like: fetch('/api/fred-data?series=GDP&start=2020-01-01')
3. ✅ ALWAYS use useState + useEffect for data fetching
4. ✅ ALWAYS show loading states while fetching
5. ✅ Users must see network requests in DevTools when using the app

DETECTED ECONOMIC TOPICS: ${keywords.join(', ')}
RELEVANT FRED SERIES: ${series.slice(0, 6).join(', ')} ${series.length > 6 ? '(and more)' : ''}

FRED API INTEGRATION INSTRUCTIONS:
1. Use the built-in FRED API endpoints: /api/fred-data and /api/fred-series
2. These endpoints handle authentication and return clean, formatted data
3. Include proper error handling and loading states
4. Format data for chart libraries (Recharts recommended)

REQUIRED COMPONENTS TO INCLUDE:
- FRED data fetching service using local API endpoints
- Tab-based interface for switching between different economic indicators
- Loading states while fetching data (shows "Loading GDP data from FRED...")
- Responsive charts using Recharts or Chart.js
- Date range selectors (1Y, 5Y, 10Y, All)
- Data export functionality
- Real-time data indicators with timestamps
- Professional economic dashboard styling
- Network activity indicators (users should see API calls in DevTools)

IMPORTANT: Each tab click should trigger a new API call to /api/fred-data with the appropriate series ID.
This ensures users see real network requests in their browser's DevTools Network tab.

🚨 CRITICAL: DO NOT USE SAMPLE/FAKE DATA! ALWAYS USE REAL FRED API CALLS!

⚠️  IMPORTANT: ALWAYS include start=2020-01-01 parameter! Without a start date, FRED returns data from 1946 with missing values (.) that get filtered out, resulting in empty datasets!

MANDATORY FRED API USAGE - YOU MUST IMPLEMENT THIS EXACTLY:
\`\`\`javascript
// REQUIRED: Real FRED API data fetching
const [gdpData, setGdpData] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

useEffect(() => {
  const fetchGDPData = async () => {
    setLoading(true);
    try {
      // REAL API CALL - NOT SAMPLE DATA!
      // When running in E2B sandbox, call back to GitHub Codespace
      const apiUrl = window.location.origin.includes('e2b.app') 
        ? 'https://friendly-doodle-wrjpvx455j972vjrv-3000.app.github.dev'
        : window.location.origin;
      const response = await fetch(\`\${apiUrl}/api/fred-data?series=GDP&start=2020-01-01&limit=20\`);
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error);
      }
      
      // Transform FRED data for charts
      const chartData = result.data.map(item => ({
        date: item.date,
        value: item.value,
        quarter: new Date(item.date).toISOString().slice(0, 7)
      }));
      
      setGdpData(chartData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  fetchGDPData();
}, []);

// For unemployment data
const fetchUnemploymentData = async () => {
  const apiUrl = window.location.origin.includes('e2b.app') 
    ? 'https://friendly-doodle-wrjpvx455j972vjrv-3000.app.github.dev'
    : window.location.origin;
  const response = await fetch(\`\${apiUrl}/api/fred-data?series=UNRATE&start=2020-01-01&limit=50\`);
  const result = await response.json();
  return result.data;
};

// For inflation data
const fetchInflationData = async () => {
  const apiUrl = window.location.origin.includes('e2b.app') 
    ? 'https://friendly-doodle-wrjpvx455j972vjrv-3000.app.github.dev'
    : window.location.origin;
  const response = await fetch(\`\${apiUrl}/api/fred-data?series=CPIAUCSL&start=2020-01-01&limit=50\`);
  const result = await response.json();
  return result.data;
};
\`\`\`

❌ NEVER DO THIS:
\`\`\`javascript
// THIS IS WRONG - NO SAMPLE DATA ALLOWED!
const gdpData = [
  { date: '2019-Q1', nominal: 21.49, real: 19.32 },
  // ... more sample data
];
\`\`\`

✅ ALWAYS DO THIS:
\`\`\`javascript
// THIS IS CORRECT - REAL FRED API CALLS!
const [data, setData] = useState([]);
useEffect(() => {
  const apiUrl = window.location.origin.includes('e2b.app') 
    ? 'https://friendly-doodle-wrjpvx455j972vjrv-3000.app.github.dev'
    : window.location.origin;
  fetch(\`\${apiUrl}/api/fred-data?series=GDP&start=2020-01-01&limit=50\`)
    .then(res => res.json())
    .then(result => setData(result.data));
}, []);
\`\`\`

CHART IMPLEMENTATIONS:
- Use professional color schemes (blues, greens for positive trends)
- Include tooltips with exact values and dates
- Add trend lines and moving averages where appropriate
- Implement responsive design for mobile devices
- Add data source attribution: "Data source: Federal Reserve Economic Data (FRED)"

SERIES DESCRIPTIONS FOR UI:
${this.getSeriesDescriptions(series)}

Make the application professional, data-rich, and suitable for economic analysis.
`;
  }

  private static getSeriesDescriptions(series: string[]): string {
    const descriptions: Record<string, string> = {
      'GDP': 'Gross Domestic Product (Billions of Dollars)',
      'GDPC1': 'Real Gross Domestic Product (Billions of Chained 2017 Dollars)',
      'UNRATE': 'Unemployment Rate (%)',
      'CPIAUCSL': 'Consumer Price Index for All Urban Consumers (1982-84=100)',
      'FEDFUNDS': 'Federal Funds Effective Rate (%)',
      'DGS10': '10-Year Treasury Constant Maturity Rate (%)',
      'SP500': 'S&P 500 Stock Price Index',
      'PAYEMS': 'All Employees, Total Nonfarm (Thousands of Persons)',
      'PCEPI': 'Personal Consumption Expenditures: Chain-type Price Index',
      'M2SL': 'M2 Money Stock (Billions of Dollars)',
    };

    return series.map(s => `- ${s}: ${descriptions[s] || 'Economic indicator'}`).join('\n');
  }

  static getTemplateForRequest(userPrompt: string): string | null {
    const prompt = userPrompt.toLowerCase();
    
    for (const [templateName, config] of Object.entries(this.DASHBOARD_TEMPLATES)) {
      if (prompt.includes(templateName.toLowerCase()) || 
          config.series.some(series => prompt.includes(series.toLowerCase()))) {
        return templateName;
      }
    }
    
    return null;
  }
}

export default EconomicDataDetector;