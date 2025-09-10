// Smart Context Retrieval System
// RAG-inspired approach for efficient context selection based on user request

interface CodeContext {
  relevantFiles: Record<string, string>;
  patterns: string[];
  constraints: string[];
  examples: string;
  totalTokens: number;
}

interface RelevanceScore {
  file: string;
  score: number;
  reasons: string[];
}

// Smart file relevance scoring (RAG-like)
export function scoreFileRelevance(filePath: string, fileContent: string, userRequest: string): RelevanceScore {
  const request = userRequest.toLowerCase();
  let score = 0;
  const reasons: string[] = [];

  // Keyword matching (weighted)
  const keywords = extractKeywords(request);
  keywords.forEach(keyword => {
    if (fileContent.toLowerCase().includes(keyword)) {
      score += keyword.length > 4 ? 10 : 5; // Longer keywords = more relevant
      reasons.push(`Contains "${keyword}"`);
    }
  });

  // File type relevance
  if (request.includes('component') && filePath.includes('components/')) {
    score += 15;
    reasons.push('Component-related request');
  }
  if (request.includes('api') && filePath.includes('api/')) {
    score += 15;
    reasons.push('API-related request');
  }
  if ((request.includes('stock') || request.includes('market')) && filePath.includes('market-data')) {
    score += 20;
    reasons.push('Market data request');
  }

  // Import/dependency analysis
  if (fileContent.includes('export') && request.includes('import')) {
    score += 8;
    reasons.push('Exportable module');
  }

  // Pattern matching for common tasks
  if (request.includes('form') && fileContent.includes('useState')) {
    score += 12;
    reasons.push('Form state management');
  }
  if (request.includes('table') && fileContent.includes('map')) {
    score += 10;
    reasons.push('Data rendering patterns');
  }

  return { file: filePath, score, reasons };
}

// Extract meaningful keywords from user request
function extractKeywords(request: string): string[] {
  // Remove common words, focus on technical terms
  const stopWords = ['a', 'an', 'the', 'for', 'with', 'that', 'this', 'build', 'create', 'make'];
  const words = request.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.includes(word));
  
  return [...new Set(words)]; // Remove duplicates
}

// Get the most relevant files for a request (top N)
export function getRelevantFiles(
  allFiles: Record<string, string>, 
  userRequest: string, 
  maxFiles: number = 3
): Record<string, string> {
  
  const scored = Object.entries(allFiles)
    .map(([path, content]) => ({
      ...scoreFileRelevance(path, content, userRequest),
      content
    }))
    .filter(item => item.score > 5) // Minimum relevance threshold
    .sort((a, b) => b.score - a.score)
    .slice(0, maxFiles);

  console.log('[smart-context] Relevant files:', scored.map(f => `${f.file} (score: ${f.score})`));
  
  return Object.fromEntries(
    scored.map(item => [item.file, item.content])
  );
}

// Generate smart constraints based on request type
export function generateConstraints(userRequest: string): string[] {
  const request = userRequest.toLowerCase();
  const constraints: string[] = [];

  if (request.includes('stock') || request.includes('market') || request.includes('finance')) {
    constraints.push('MUST use https://fastprototype.vercel.app/api/market-data for real market data');
    constraints.push('NEVER use mock or placeholder data for financial information');
    constraints.push('ALWAYS include user input fields for stock symbols');
    constraints.push('Use backticks (`) for template literals with variables');
  }

  if (request.includes('form') || request.includes('input')) {
    constraints.push('Include proper form validation and error handling');
    constraints.push('Use controlled components with useState');
    constraints.push('Add proper TypeScript types for form data');
  }

  if (request.includes('component')) {
    constraints.push('Export as default React functional component');
    constraints.push('Include proper TypeScript props interface');
    constraints.push('Use modern React patterns (hooks, not classes)');
  }

  if (request.includes('api')) {
    constraints.push('Include proper error handling with try/catch');
    constraints.push('Add TypeScript types for request/response');
    constraints.push('Use NextRequest/NextResponse for API routes');
  }

  return constraints;
}

// Generate relevant patterns/examples based on request
export function generateRelevantPatterns(userRequest: string): string {
  const request = userRequest.toLowerCase();
  
  if (request.includes('stock') || request.includes('screener')) {
    return `
FINANCIAL APP PATTERN:
const [symbols, setSymbols] = useState('AAPL,GOOGL,MSFT');
const [data, setData] = useState([]);

const fetchData = async () => {
  const response = await fetch(\`https://fastprototype.vercel.app/api/market-data?type=multiple&symbols=\${symbols}\`);
  const result = await response.json();
  setData(result);
};

return (
  <div>
    <input value={symbols} onChange={(e) => setSymbols(e.target.value)} />
    <button onClick={fetchData}>Get Data</button>
    {data.map(stock => <div key={stock.symbol}>{stock.symbol}: ${stock.price}</div>)}
  </div>
);`;
  }

  if (request.includes('form')) {
    return `
FORM PATTERN:
const [formData, setFormData] = useState({ name: '', email: '' });
const [errors, setErrors] = useState({});

const handleSubmit = async (e) => {
  e.preventDefault();
  try {
    const response = await fetch('/api/submit', {
      method: 'POST',
      body: JSON.stringify(formData)
    });
    // Handle response
  } catch (error) {
    setErrors({ submit: error.message });
  }
};`;
  }

  return 'Use modern React patterns with TypeScript and proper error handling.';
}

// Create optimized context for planner
export function createPlannerContext(
  userRequest: string,
  allFiles: Record<string, string>
): CodeContext {
  
  const relevantFiles = getRelevantFiles(allFiles, userRequest, 5); // Top 5 most relevant
  const constraints = generateConstraints(userRequest);
  const patterns = generateRelevantPatterns(userRequest);
  
  // Estimate token count
  const totalContent = JSON.stringify(relevantFiles) + constraints.join(' ') + patterns;
  const estimatedTokens = Math.ceil(totalContent.length / 4);

  return {
    relevantFiles,
    patterns: [patterns],
    constraints,
    examples: patterns,
    totalTokens: estimatedTokens
  };
}

// Create minimal context for builder (even more focused)
export function createBuilderContext(
  userRequest: string,
  plannerOutput: any,
  allFiles: Record<string, string>
): CodeContext {
  
  // Builder gets even fewer files, highly targeted
  const relevantFiles = getRelevantFiles(allFiles, userRequest, 2); 
  
  // Use planner's specific instructions instead of general patterns
  const constraints = [
    ...generateConstraints(userRequest).slice(0, 3), // Top 3 constraints only
    plannerOutput.buildInstructions || 'Follow the plan exactly'
  ];

  const examples = plannerOutput.codeExamples || generateRelevantPatterns(userRequest);
  
  const totalContent = JSON.stringify(relevantFiles) + constraints.join(' ') + examples;
  const estimatedTokens = Math.ceil(totalContent.length / 4);

  return {
    relevantFiles,
    patterns: [examples],
    constraints,
    examples,
    totalTokens: estimatedTokens
  };
}