// Federal Reserve Economic Data (FRED) API Service
// This service provides access to economic data from the Federal Reserve Bank of St. Louis

export interface FREDSeries {
  id: string;
  title: string;
  observation_start: string;
  observation_end: string;
  frequency: string;
  units: string;
  notes?: string;
}

export interface FREDObservation {
  date: string;
  value: string;
}

export interface FREDApiResponse<T> {
  realtime_start: string;
  realtime_end: string;
  observation_start: string;
  observation_end: string;
  units: string;
  output_type: number;
  file_type: string;
  order_by: string;
  sort_order: string;
  count: number;
  offset: number;
  limit: number;
  observations?: T[];
  seriess?: T[];
}

class FREDService {
  private apiKey: string;
  private baseUrl = 'https://api.stlouisfed.org/fred';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.FRED_API_KEY || '';
    if (!this.apiKey && typeof window === 'undefined') {
      console.warn('FRED API key not found. Set FRED_API_KEY environment variable.');
    }
  }

  private async fetchFREDData<T>(endpoint: string, params: Record<string, string> = {}): Promise<FREDApiResponse<T>> {
    const url = new URL(`${this.baseUrl}/${endpoint}`);
    
    // Add API key and default params
    url.searchParams.append('api_key', this.apiKey);
    url.searchParams.append('file_type', 'json');
    
    // Add additional params
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`FRED API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Get economic data series information
  async getSeries(seriesId: string): Promise<FREDSeries[]> {
    const response = await this.fetchFREDData<FREDSeries>('series', {
      series_id: seriesId
    });
    return response.seriess || [];
  }

  // Get observations (data points) for a series
  async getObservations(seriesId: string, params: {
    start?: string;
    end?: string;
    limit?: number;
    sort_order?: 'asc' | 'desc';
  } = {}): Promise<FREDObservation[]> {
    const queryParams: Record<string, string> = {
      series_id: seriesId
    };

    if (params.start) queryParams.observation_start = params.start;
    if (params.end) queryParams.observation_end = params.end;
    if (params.limit) queryParams.limit = params.limit.toString();
    if (params.sort_order) queryParams.sort_order = params.sort_order;

    const response = await this.fetchFREDData<FREDObservation>('series/observations', queryParams);
    return response.observations || [];
  }

  // Search for series by text
  async searchSeries(searchText: string, limit: number = 10): Promise<FREDSeries[]> {
    const response = await this.fetchFREDData<FREDSeries>('series/search', {
      search_text: searchText,
      limit: limit.toString(),
      order_by: 'popularity',
      sort_order: 'desc'
    });
    return response.seriess || [];
  }

  // Common economic indicators with their FRED series IDs
  static readonly COMMON_SERIES = {
    // GDP
    GDP: 'GDP', // Gross Domestic Product
    GDPC1: 'GDPC1', // Real GDP (Chained 2017 Dollars)
    GDPPOT: 'GDPPOT', // Real Potential GDP
    GDPR: 'GDPR', // Real GDP Growth Rate
    
    // Employment
    UNRATE: 'UNRATE', // Unemployment Rate
    CIVPART: 'CIVPART', // Labor Force Participation Rate
    EMRATIO: 'EMRATIO', // Employment-Population Ratio
    PAYEMS: 'PAYEMS', // Total Nonfarm Payrolls
    
    // Inflation
    CPIAUCSL: 'CPIAUCSL', // Consumer Price Index (CPI)
    CPILFESL: 'CPILFESL', // Core CPI (less food & energy)
    PCEPI: 'PCEPI', // PCE Price Index
    PCEPILFE: 'PCEPILFE', // Core PCE Price Index
    
    // Interest Rates
    FEDFUNDS: 'FEDFUNDS', // Federal Funds Rate
    GS10: 'GS10', // 10-Year Treasury Rate
    GS2: 'GS2', // 2-Year Treasury Rate
    MORTGAGE30US: 'MORTGAGE30US', // 30-Year Fixed Mortgage Rate
    
    // Money Supply
    M1SL: 'M1SL', // M1 Money Stock
    M2SL: 'M2SL', // M2 Money Stock
    BASE: 'BASE', // Monetary Base
    
    // Market Data
    SP500: 'SP500', // S&P 500
    NASDAQCOM: 'NASDAQCOM', // NASDAQ Composite Index
    DJIA: 'DJIA', // Dow Jones Industrial Average
    
    // International
    DEXUSEU: 'DEXUSEU', // USD/EUR Exchange Rate
    DEXJPUS: 'DEXJPUS', // USD/JPY Exchange Rate
    DEXCHUS: 'DEXCHUS', // USD/CNY Exchange Rate
  };

  // Helper method to get common economic indicators
  async getGDPData(years: number = 10): Promise<FREDObservation[]> {
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - years);
    
    return this.getObservations(FREDService.COMMON_SERIES.GDP, {
      start: startDate.toISOString().split('T')[0],
      sort_order: 'asc'
    });
  }

  async getUnemploymentData(years: number = 5): Promise<FREDObservation[]> {
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - years);
    
    return this.getObservations(FREDService.COMMON_SERIES.UNRATE, {
      start: startDate.toISOString().split('T')[0],
      sort_order: 'asc'
    });
  }

  async getInflationData(years: number = 5): Promise<FREDObservation[]> {
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - years);
    
    return this.getObservations(FREDService.COMMON_SERIES.CPIAUCSL, {
      start: startDate.toISOString().split('T')[0],
      sort_order: 'asc'
    });
  }

  async getInterestRateData(series: string = FREDService.COMMON_SERIES.FEDFUNDS, years: number = 5): Promise<FREDObservation[]> {
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - years);
    
    return this.getObservations(series, {
      start: startDate.toISOString().split('T')[0],
      sort_order: 'asc'
    });
  }
}

// Export a singleton instance
export const fredService = new FREDService();
export default FREDService;