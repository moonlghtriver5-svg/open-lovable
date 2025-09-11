// v2 Edit Examples Library
// Deterministic patterns for precise code modifications based on real open-lovable v2

export interface EditExample {
  pattern: string;
  editType: 'CREATE' | 'UPDATE' | 'FIX' | 'ENHANCE' | 'REFACTOR';
  description: string;
  searchTerms: string[];
  regexPatterns: string[];
  targetFileTypes: string[];
  confidence: 'high' | 'medium' | 'low';
}

export interface EditPattern {
  name: string;
  examples: EditExample[];
  applicableScenarios: string[];
}

export class EditExamplesV2 {
  private patterns: EditPattern[] = [
    {
      name: 'Component Creation',
      applicableScenarios: ['create new component', 'add component', 'new react component'],
      examples: [
        {
          pattern: 'CREATE_COMPONENT',
          editType: 'CREATE',
          description: 'Create new React component with TypeScript',
          searchTerms: ['component', 'react', 'tsx'],
          regexPatterns: [
            'export\\s+(?:default\\s+)?(?:function|const)\\s+\\w+',
            'interface\\s+\\w+Props',
            'import.*React'
          ],
          targetFileTypes: ['tsx', 'jsx'],
          confidence: 'high'
        }
      ]
    },
    {
      name: 'Function Updates',
      applicableScenarios: ['update function', 'modify method', 'change function behavior'],
      examples: [
        {
          pattern: 'UPDATE_FUNCTION',
          editType: 'UPDATE',
          description: 'Update existing function implementation',
          searchTerms: ['function', 'const', 'async', 'return'],
          regexPatterns: [
            '(?:function|const)\\s+{FUNCTION_NAME}\\s*[=\\(]',
            '{FUNCTION_NAME}\\s*:\\s*\\(.*?\\)\\s*=>',
            'async\\s+function\\s+{FUNCTION_NAME}'
          ],
          targetFileTypes: ['ts', 'tsx', 'js', 'jsx'],
          confidence: 'high'
        }
      ]
    },
    {
      name: 'Bug Fixes',
      applicableScenarios: ['fix bug', 'resolve error', 'correct issue'],
      examples: [
        {
          pattern: 'FIX_BUG',
          editType: 'FIX',
          description: 'Fix specific bug or error in existing code',
          searchTerms: ['error', 'bug', 'issue', 'problem'],
          regexPatterns: [
            'throw\\s+new\\s+Error',
            'console\\.error',
            'try\\s*\\{[\\s\\S]*?catch'
          ],
          targetFileTypes: ['ts', 'tsx', 'js', 'jsx'],
          confidence: 'medium'
        }
      ]
    },
    {
      name: 'State Management',
      applicableScenarios: ['add state', 'update state', 'manage state'],
      examples: [
        {
          pattern: 'ADD_STATE',
          editType: 'ENHANCE',
          description: 'Add or modify React state management',
          searchTerms: ['useState', 'state', 'setState'],
          regexPatterns: [
            'const\\s+\\[\\w+,\\s*\\w+\\]\\s*=\\s*useState',
            'useState<.*?>\\(',
            'this\\.setState\\('
          ],
          targetFileTypes: ['tsx', 'jsx'],
          confidence: 'high'
        }
      ]
    },
    {
      name: 'Props Interface',
      applicableScenarios: ['add props', 'update props', 'change interface'],
      examples: [
        {
          pattern: 'UPDATE_PROPS',
          editType: 'UPDATE',
          description: 'Update component props interface',
          searchTerms: ['Props', 'interface', 'type'],
          regexPatterns: [
            'interface\\s+\\w+Props\\s*\\{',
            'type\\s+\\w+Props\\s*=',
            '\\w+:\\s*React\\.FC<\\w+Props>'
          ],
          targetFileTypes: ['tsx', 'ts'],
          confidence: 'high'
        }
      ]
    },
    {
      name: 'Import Statements',
      applicableScenarios: ['add import', 'update import', 'fix imports'],
      examples: [
        {
          pattern: 'UPDATE_IMPORTS',
          editType: 'FIX',
          description: 'Add or update import statements',
          searchTerms: ['import', 'from', 'require'],
          regexPatterns: [
            'import\\s+.*?\\s+from\\s+[\'"].*?[\'"]',
            'import\\s*\\{.*?\\}\\s*from',
            'const\\s+.*?\\s*=\\s*require\\('
          ],
          targetFileTypes: ['ts', 'tsx', 'js', 'jsx'],
          confidence: 'high'
        }
      ]
    },
    {
      name: 'CSS Styling',
      applicableScenarios: ['add styles', 'update css', 'modify styling'],
      examples: [
        {
          pattern: 'UPDATE_STYLES',
          editType: 'ENHANCE',
          description: 'Add or update CSS styling',
          searchTerms: ['className', 'style', 'css'],
          regexPatterns: [
            'className\\s*=\\s*[\'"].*?[\'"]',
            'style\\s*=\\s*\\{.*?\\}',
            '\\.\\w+\\s*\\{[\\s\\S]*?\\}'
          ],
          targetFileTypes: ['tsx', 'jsx', 'css', 'scss'],
          confidence: 'medium'
        }
      ]
    },
    {
      name: 'Event Handlers',
      applicableScenarios: ['add handler', 'update handler', 'event handling'],
      examples: [
        {
          pattern: 'ADD_HANDLER',
          editType: 'ENHANCE',
          description: 'Add or update event handlers',
          searchTerms: ['onClick', 'onChange', 'onSubmit', 'handler'],
          regexPatterns: [
            'on\\w+\\s*=\\s*\\{.*?\\}',
            'const\\s+handle\\w+\\s*=',
            'function\\s+handle\\w+\\('
          ],
          targetFileTypes: ['tsx', 'jsx'],
          confidence: 'high'
        }
      ]
    },
    {
      name: 'API Integration',
      applicableScenarios: ['api call', 'fetch data', 'http request'],
      examples: [
        {
          pattern: 'ADD_API_CALL',
          editType: 'ENHANCE',
          description: 'Add API calls and data fetching',
          searchTerms: ['fetch', 'axios', 'api', 'useEffect'],
          regexPatterns: [
            'fetch\\s*\\(\\s*[\'"].*?[\'"]',
            'axios\\.(get|post|put|delete)',
            'useEffect\\(\\(\\)\\s*=>\\s*\\{[\\s\\S]*?\\}\\s*,\\s*\\[\\]\\)'
          ],
          targetFileTypes: ['ts', 'tsx', 'js', 'jsx'],
          confidence: 'medium'
        }
      ]
    },
    {
      name: 'Form Handling',
      applicableScenarios: ['form validation', 'form submit', 'input handling'],
      examples: [
        {
          pattern: 'FORM_HANDLING',
          editType: 'ENHANCE',
          description: 'Add form handling and validation',
          searchTerms: ['form', 'input', 'validation', 'submit'],
          regexPatterns: [
            '<form[^>]*onSubmit\\s*=',
            '<input[^>]*onChange\\s*=',
            'const\\s+\\w+Schema\\s*=\\s*\\w+\\.object'
          ],
          targetFileTypes: ['tsx', 'jsx'],
          confidence: 'high'
        }
      ]
    },
    {
      name: 'Conditional Rendering',
      applicableScenarios: ['conditional display', 'show hide', 'render condition'],
      examples: [
        {
          pattern: 'CONDITIONAL_RENDER',
          editType: 'UPDATE',
          description: 'Add conditional rendering logic',
          searchTerms: ['condition', 'render', 'if', '&&', '?'],
          regexPatterns: [
            '\\{\\w+\\s*&&\\s*<',
            '\\{\\w+\\s*\\?\\s*<.*?>\\s*:\\s*<.*?>',
            'if\\s*\\(.*?\\)\\s*\\{[\\s\\S]*?return'
          ],
          targetFileTypes: ['tsx', 'jsx'],
          confidence: 'high'
        }
      ]
    },
    {
      name: 'Hook Usage',
      applicableScenarios: ['use hook', 'custom hook', 'react hooks'],
      examples: [
        {
          pattern: 'ADD_HOOKS',
          editType: 'ENHANCE',
          description: 'Add React hooks or custom hooks',
          searchTerms: ['use', 'hook', 'useState', 'useEffect', 'useMemo'],
          regexPatterns: [
            'const\\s+.*?\\s*=\\s*use\\w+\\(',
            'use\\w+\\<.*?\\>\\(',
            'function\\s+use\\w+\\('
          ],
          targetFileTypes: ['tsx', 'jsx', 'ts', 'js'],
          confidence: 'high'
        }
      ]
    }
  ];

  // Find matching edit patterns for a given intent
  findMatchingPatterns(
    userPrompt: string,
    editType: string,
    searchTerms: string[]
  ): EditExample[] {
    const matches: EditExample[] = [];
    const promptLower = userPrompt.toLowerCase();

    for (const pattern of this.patterns) {
      // Check if scenario matches
      const scenarioMatch = pattern.applicableScenarios.some(scenario =>
        promptLower.includes(scenario.toLowerCase())
      );

      if (scenarioMatch) {
        for (const example of pattern.examples) {
          // Check edit type match
          if (example.editType === editType) {
            matches.push(example);
          }
        }
      }

      // Check search term overlap
      for (const example of pattern.examples) {
        const termOverlap = searchTerms.some(term =>
          example.searchTerms.some(exampleTerm =>
            term.toLowerCase().includes(exampleTerm.toLowerCase()) ||
            exampleTerm.toLowerCase().includes(term.toLowerCase())
          )
        );

        if (termOverlap && !matches.includes(example)) {
          matches.push(example);
        }
      }
    }

    // Sort by confidence
    return matches.sort((a, b) => {
      const confidenceOrder = { 'high': 3, 'medium': 2, 'low': 1 };
      return confidenceOrder[b.confidence] - confidenceOrder[a.confidence];
    });
  }

  // Get enhanced regex patterns based on matching examples
  getEnhancedRegexPatterns(
    matchingExamples: EditExample[],
    searchTerms: string[]
  ): string[] {
    const patterns: string[] = [];

    for (const example of matchingExamples) {
      for (const pattern of example.regexPatterns) {
        // Replace placeholders with actual search terms
        let enhancedPattern = pattern;
        
        if (pattern.includes('{FUNCTION_NAME}')) {
          for (const term of searchTerms) {
            enhancedPattern = pattern.replace('{FUNCTION_NAME}', term);
            patterns.push(enhancedPattern);
          }
        } else {
          patterns.push(pattern);
        }
      }
    }

    return [...new Set(patterns)]; // Remove duplicates
  }

  // Get file types to focus search on
  getTargetFileTypes(matchingExamples: EditExample[]): string[] {
    const fileTypes = new Set<string>();
    
    for (const example of matchingExamples) {
      example.targetFileTypes.forEach(type => fileTypes.add(type));
    }

    return Array.from(fileTypes);
  }

  // Generate enhanced search terms based on patterns
  getEnhancedSearchTerms(
    userPrompt: string,
    matchingExamples: EditExample[]
  ): string[] {
    const enhancedTerms = new Set<string>();
    
    // Add terms from matching examples
    for (const example of matchingExamples) {
      example.searchTerms.forEach(term => enhancedTerms.add(term));
    }

    // Extract additional terms from user prompt
    const promptWords = userPrompt.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !['this', 'that', 'with', 'from', 'they', 'have', 'will', 'been', 'were'].includes(word));

    promptWords.forEach(word => enhancedTerms.add(word));

    return Array.from(enhancedTerms);
  }

  // Get confidence score for the match quality
  calculateMatchConfidence(
    matchingExamples: EditExample[],
    editType: string,
    searchTerms: string[]
  ): number {
    if (matchingExamples.length === 0) return 0.1;

    let totalScore = 0;
    let maxScore = 0;

    for (const example of matchingExamples) {
      let score = 0;
      maxScore += 3;

      // Edit type exact match
      if (example.editType === editType) {
        score += 1;
      }

      // Confidence level
      const confidenceScores = { 'high': 1, 'medium': 0.7, 'low': 0.4 };
      score += confidenceScores[example.confidence];

      // Search term overlap
      const termOverlap = searchTerms.filter(term =>
        example.searchTerms.some(exampleTerm =>
          term.toLowerCase().includes(exampleTerm.toLowerCase())
        )
      ).length;
      
      score += Math.min(termOverlap / example.searchTerms.length, 1);

      totalScore += score;
    }

    return Math.min(totalScore / maxScore, 1.0);
  }

  // Get all available patterns for debugging
  getAllPatterns(): EditPattern[] {
    return this.patterns;
  }

  // Add a new pattern dynamically (for learning)
  addPattern(pattern: EditPattern): void {
    this.patterns.push(pattern);
  }

  // Find the best single example for a given scenario
  getBestExample(
    userPrompt: string,
    editType: string,
    searchTerms: string[]
  ): EditExample | null {
    const matches = this.findMatchingPatterns(userPrompt, editType, searchTerms);
    
    if (matches.length === 0) return null;

    // Return the highest confidence match
    return matches[0];
  }
}

// Export singleton
export const editExamplesV2 = new EditExamplesV2();