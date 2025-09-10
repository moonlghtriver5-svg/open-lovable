// Smart Context Analysis and Selection System
// Reduces context overhead by providing only relevant information to agents

export interface ContextChunk {
  type: 'api' | 'ui' | 'financial' | 'error' | 'files';
  relevanceScore: number;
  data: any;
  cacheKey?: string;
}

export interface TaskAnalysis {
  category: 'financial' | 'ui' | 'api' | 'hybrid';
  complexity: 'simple' | 'medium' | 'complex';
  requiredTools: string[];
  estimatedSteps: number;
}

export interface SmartContext {
  task: TaskAnalysis;
  relevantChunks: ContextChunk[];
  totalTokens: number;
}

// Context chunk definitions
const contextPatterns = {
  financial: {
    keywords: ['stock', 'crypto', 'portfolio', 'market', 'price', 'trading', 'screener'],
    apis: ['market-data'],
    patterns: ['input-forms', 'data-tables', 'real-time-updates'],
    files: ['lib/market-data.ts', 'app/api/market-data/**'],
    examples: {
      stockScreener: `
        const [symbols, setSymbols] = useState('AAPL,GOOGL,MSFT');
        const url = \`https://fastprototype.vercel.app/api/market-data?type=multiple&symbols=\${symbols}\`;
      `,
      portfolioTracker: `
        const [portfolio, setPortfolio] = useState([]);
        const addStock = (symbol) => setPortfolio([...portfolio, symbol]);
      `
    }
  },

  ui: {
    keywords: ['component', 'form', 'button', 'modal', 'layout', 'dashboard', 'interface'],
    libraries: ['react', 'tailwind', 'radix-ui'],
    patterns: ['hooks', 'state-management', 'event-handlers'],
    files: ['components/**', 'app/page.tsx'],
    examples: {
      formInput: `
        const [value, setValue] = useState('');
        <input value={value} onChange={(e) => setValue(e.target.value)} />
      `,
      submitButton: `
        <button onClick={handleSubmit} className="bg-blue-500 hover:bg-blue-700">
          Submit
        </button>
      `
    }
  },

  api: {
    keywords: ['fetch', 'api', 'endpoint', 'data', 'request', 'response'],
    patterns: ['error-handling', 'cors', 'validation'],
    files: ['app/api/**', 'lib/**'],
    examples: {
      fetchPattern: `
        try {
          const response = await fetch(url);
          if (!response.ok) throw new Error('Failed to fetch');
          const data = await response.json();
          return data;
        } catch (error) {
          console.error('Fetch error:', error);
          return null;
        }
      `
    }
  }
};

// Analyze user request to determine task category and complexity
export function analyzeTask(userRequest: string): TaskAnalysis {
  const request = userRequest.toLowerCase();
  let category: TaskAnalysis['category'] = 'ui';
  let complexity: TaskAnalysis['complexity'] = 'simple';
  let requiredTools: string[] = [];
  let estimatedSteps = 1;

  // Determine category
  const financialScore = contextPatterns.financial.keywords.reduce((score, keyword) => 
    request.includes(keyword) ? score + 1 : score, 0
  );
  
  const uiScore = contextPatterns.ui.keywords.reduce((score, keyword) => 
    request.includes(keyword) ? score + 1 : score, 0
  );
  
  const apiScore = contextPatterns.api.keywords.reduce((score, keyword) => 
    request.includes(keyword) ? score + 1 : score, 0
  );

  if (financialScore > 0) {
    category = financialScore > uiScore ? 'financial' : 'hybrid';
    requiredTools.push('WebFetch'); // For market data API
  }
  
  if (uiScore > 0) {
    category = category === 'financial' ? 'hybrid' : 'ui';
    requiredTools.push('Write', 'Edit');
  }
  
  if (apiScore > 0) {
    requiredTools.push('Write', 'Edit');
  }

  // Determine complexity
  const complexityIndicators = [
    'screener', 'dashboard', 'tracker', 'multiple', 'complex', 'advanced'
  ];
  
  const multiStepIndicators = [
    'and', 'then', 'also', 'with', 'including'
  ];

  if (complexityIndicators.some(indicator => request.includes(indicator))) {
    complexity = 'complex';
    estimatedSteps = 3;
  } else if (multiStepIndicators.some(indicator => request.includes(indicator))) {
    complexity = 'medium';
    estimatedSteps = 2;
  }

  return {
    category,
    complexity,
    requiredTools: [...new Set(requiredTools)], // Remove duplicates
    estimatedSteps
  };
}

// Score relevance of context chunks for specific task
export function scoreContextRelevance(chunk: any, task: TaskAnalysis, userRequest: string): number {
  let score = 0;
  const request = userRequest.toLowerCase();

  // Base relevance by category
  if (task.category === 'financial' && chunk.type === 'financial') score += 10;
  if (task.category === 'ui' && chunk.type === 'ui') score += 10;
  if (task.category === 'api' && chunk.type === 'api') score += 10;
  if (task.category === 'hybrid') score += 5; // All chunks somewhat relevant

  // Keyword matching
  if (chunk.keywords) {
    chunk.keywords.forEach((keyword: string) => {
      if (request.includes(keyword)) score += 3;
    });
  }

  // File relevance
  if (chunk.files) {
    chunk.files.forEach((file: string) => {
      if (file.includes('market-data') && request.includes('stock')) score += 8;
      if (file.includes('components') && request.includes('component')) score += 8;
      if (file.includes('api') && request.includes('api')) score += 6;
    });
  }

  return Math.min(score, 20); // Cap at 20
}

// Create relevant context chunks based on task analysis
export function createRelevantContext(
  task: TaskAnalysis, 
  userRequest: string,
  availableFiles?: Record<string, string>
): ContextChunk[] {
  const chunks: ContextChunk[] = [];

  // Add category-specific context
  const pattern = contextPatterns[task.category === 'hybrid' ? 'financial' : task.category];
  
  // Core patterns chunk
  chunks.push({
    type: task.category as any,
    relevanceScore: 15,
    data: {
      patterns: pattern.patterns,
      examples: pattern.examples,
      keywords: pattern.keywords
    },
    cacheKey: `patterns-${task.category}`
  });

  // API context for financial tasks
  if (task.category === 'financial' || task.category === 'hybrid') {
    chunks.push({
      type: 'api',
      relevanceScore: 12,
      data: {
        marketDataAPI: {
          baseUrl: 'https://fastprototype.vercel.app/api/market-data',
          endpoints: {
            singleStock: '?type=stock&symbol=AAPL',
            multipleStocks: '?type=multiple&symbols=AAPL,GOOGL,MSFT',
            crypto: '?type=crypto&symbol=bitcoin',
            summary: '?type=summary'
          },
          responseFormat: {
            symbol: 'AAPL',
            price: 236.52,
            change: -1.36,
            changePercent: -0.57,
            volume: 4470370,
            timestamp: '2025-09-09T13:55:09.788Z'
          }
        }
      },
      cacheKey: 'market-data-api'
    });
  }

  // File context (only most relevant files)
  if (availableFiles) {
    const relevantFiles = Object.entries(availableFiles)
      .filter(([path]) => {
        if (task.category === 'financial' && path.includes('market-data')) return true;
        if (task.category === 'ui' && path.includes('components')) return true;
        if (path.includes('api') && userRequest.toLowerCase().includes('api')) return true;
        return false;
      })
      .slice(0, 3); // Limit to 3 most relevant files

    if (relevantFiles.length > 0) {
      chunks.push({
        type: 'files',
        relevanceScore: 10,
        data: Object.fromEntries(relevantFiles),
        cacheKey: `files-${task.category}`
      });
    }
  }

  // Sort by relevance and return top chunks
  return chunks
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 4); // Limit context chunks
}

// Calculate approximate token count for context
export function estimateTokenCount(context: SmartContext): number {
  // Rough estimation: 1 token ≈ 4 characters
  const jsonString = JSON.stringify(context);
  return Math.ceil(jsonString.length / 4);
}

// Create minimal context for supervisor agent
export function createSupervisorContext(userRequest: string): SmartContext {
  const task = analyzeTask(userRequest);
  
  // Supervisor only gets task analysis and high-level capabilities
  const chunks: ContextChunk[] = [{
    type: 'api',
    relevanceScore: 10,
    data: {
      availableCapabilities: {
        marketData: task.category === 'financial' || task.category === 'hybrid',
        uiComponents: task.category === 'ui' || task.category === 'hybrid',
        apiEndpoints: task.requiredTools.includes('WebFetch')
      },
      previousTaskOutcome: null // TODO: Add session memory
    },
    cacheKey: 'supervisor-capabilities'
  }];

  const context: SmartContext = {
    task,
    relevantChunks: chunks,
    totalTokens: 0
  };

  context.totalTokens = estimateTokenCount(context);
  return context;
}

// Create targeted context for builder agent
export function createBuilderContext(
  userRequest: string, 
  supervisorOutput: any,
  availableFiles?: Record<string, string>,
  errorContext?: any
): SmartContext {
  const task = analyzeTask(userRequest);
  let chunks = createRelevantContext(task, userRequest, availableFiles);

  // Add supervisor's specific instructions
  if (supervisorOutput?.buildInstructions) {
    chunks.unshift({
      type: 'api',
      relevanceScore: 20,
      data: {
        plan: supervisorOutput.plan,
        buildInstructions: supervisorOutput.buildInstructions,
        focusArea: supervisorOutput.focusArea
      }
    });
  }

  // Add error context if this is a retry
  if (errorContext) {
    chunks.unshift({
      type: 'error',
      relevanceScore: 25,
      data: {
        previousAttempt: errorContext.failedCode,
        errors: errorContext.errors,
        autoFixSuggestions: errorContext.fixes
      }
    });
  }

  const context: SmartContext = {
    task,
    relevantChunks: chunks,
    totalTokens: 0
  };

  context.totalTokens = estimateTokenCount(context);
  return context;
}