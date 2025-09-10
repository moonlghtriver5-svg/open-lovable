// Error Detection and Auto-Fix System
// Detects common issues in generated code and applies automatic fixes

export interface DetectedError {
  type: 'syntax' | 'template_literal' | 'undefined_variable' | 'missing_import' | 'cors' | 'logical';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  location?: {
    line?: number;
    column?: number;
    code?: string;
  };
  autoFixable: boolean;
  fixStrategy?: string;
}

export interface AutoFixResult {
  success: boolean;
  fixedCode?: string;
  appliedFixes: string[];
  remainingErrors: DetectedError[];
}

// Common error patterns to detect
const errorPatterns = {
  // Template literal with single quotes instead of backticks
  templateLiteralQuotes: {
    regex: /'([^']*\$\{[^}]+\}[^']*)'/g,
    type: 'template_literal' as const,
    severity: 'high' as const,
    message: 'Template literal using single quotes instead of backticks',
    autoFixable: true
  },

  // Undefined variables like ${symbolsParam}
  undefinedVariables: {
    regex: /\$\{(\w*[Pp]aram\w*|\w*[Qq]uery\w*)\}/g,
    type: 'undefined_variable' as const,
    severity: 'critical' as const,
    message: 'Undefined variable in template literal',
    autoFixable: true
  },

  // Missing React imports
  missingReactImport: {
    regex: /useState|useEffect|useCallback/,
    type: 'missing_import' as const,
    severity: 'high' as const,
    message: 'React hook used without import',
    autoFixable: true
  },

  // Relative URLs that won't work in sandbox
  relativeUrls: {
    regex: /fetch\s*\(\s*['"`]\/api\//g,
    type: 'logical' as const,
    severity: 'high' as const,
    message: 'Relative URL will not work in sandbox environment',
    autoFixable: true
  },

  // CORS issues
  corsError: {
    regex: /blocked by CORS policy/,
    type: 'cors' as const,
    severity: 'critical' as const,
    message: 'CORS policy blocking cross-origin request',
    autoFixable: false
  },

  // Syntax errors
  syntaxErrors: {
    regex: /SyntaxError|Unexpected token|Unexpected end of input/,
    type: 'syntax' as const,
    severity: 'critical' as const,
    message: 'JavaScript syntax error detected',
    autoFixable: false
  }
};

// Detect errors in generated code
export function detectErrors(code: string, context?: any): DetectedError[] {
  const errors: DetectedError[] = [];

  // Check each error pattern
  Object.entries(errorPatterns).forEach(([key, pattern]) => {
    if (key === 'missingReactImport') {
      // Special handling for missing imports
      if (pattern.regex.test(code) && !code.includes('import React')) {
        errors.push({
          type: pattern.type,
          severity: pattern.severity,
          message: pattern.message,
          autoFixable: pattern.autoFixable,
          fixStrategy: 'addReactImport'
        });
      }
    } else {
      // Regular regex pattern matching
      const matches = code.match(pattern.regex);
      if (matches) {
        matches.forEach(match => {
          errors.push({
            type: pattern.type,
            severity: pattern.severity,
            message: `${pattern.message}: ${match}`,
            location: { code: match },
            autoFixable: pattern.autoFixable,
            fixStrategy: key
          });
        });
      }
    }
  });

  // Check for logical errors based on context
  if (context?.task?.category === 'financial') {
    // Ensure market data API is used for financial apps
    if (!code.includes('fastprototype.vercel.app/api/market-data')) {
      errors.push({
        type: 'logical',
        severity: 'high',
        message: 'Financial app should use market data API',
        autoFixable: false
      });
    }
  }

  // Check for proper user input handling
  if (code.includes('${') && !code.includes('useState')) {
    errors.push({
      type: 'logical',
      severity: 'medium',
      message: 'Template literals used without proper state management',
      autoFixable: true,
      fixStrategy: 'addStateManagement'
    });
  }

  return errors;
}

// Auto-fix strategies
const autoFixStrategies = {
  templateLiteralQuotes: (code: string): string => {
    return code.replace(/'([^']*\$\{[^}]+\}[^']*)'/g, '`$1`');
  },

  undefinedVariables: (code: string): string => {
    // Replace common undefined variable patterns
    let fixed = code;
    fixed = fixed.replace(/\$\{symbolsParam\}/g, '${symbols}');
    fixed = fixed.replace(/\$\{symbolsQuery\}/g, '${symbols}');
    fixed = fixed.replace(/\$\{stocksParam\}/g, '${stocks}');
    fixed = fixed.replace(/\$\{dataQuery\}/g, '${query}');
    return fixed;
  },

  addReactImport: (code: string): string => {
    if (code.includes('useState') && !code.includes('import React')) {
      return `import React, { useState } from 'react';\n\n${code}`;
    }
    if (code.includes('useEffect') && !code.includes('useEffect')) {
      return code.replace(
        /import React, { ([^}]+) } from 'react';/, 
        'import React, { $1, useEffect } from \'react\';'
      );
    }
    return code;
  },

  relativeUrls: (code: string): string => {
    return code.replace(
      /fetch\s*\(\s*['"`](\/api\/[^'"`]+)['"`]/g,
      'fetch(`https://fastprototype.vercel.app$1`'
    );
  },

  addStateManagement: (code: string): string => {
    // If template literals are used but no useState, add basic state
    if (code.includes('${symbols}') && !code.includes('useState')) {
      const stateDeclaration = "const [symbols, setSymbols] = useState('AAPL,GOOGL,MSFT');";
      
      // Find the right place to insert state (after imports, before component)
      if (code.includes('export default function')) {
        return code.replace(
          /(export default function \w+\(\) \{)/,
          `$1\n  ${stateDeclaration}\n`
        );
      } else if (code.includes('function')) {
        return code.replace(
          /(function \w+\([^)]*\) \{)/,
          `$1\n  ${stateDeclaration}\n`
        );
      }
    }
    return code;
  }
};

// Apply automatic fixes to code
export function autoFixCode(code: string, errors: DetectedError[]): AutoFixResult {
  let fixedCode = code;
  const appliedFixes: string[] = [];
  const remainingErrors: DetectedError[] = [];

  errors.forEach(error => {
    if (error.autoFixable && error.fixStrategy) {
      const fixStrategy = autoFixStrategies[error.fixStrategy as keyof typeof autoFixStrategies];
      if (fixStrategy) {
        const previousCode = fixedCode;
        fixedCode = fixStrategy(fixedCode);
        
        if (fixedCode !== previousCode) {
          appliedFixes.push(`${error.type}: ${error.message}`);
        } else {
          remainingErrors.push(error);
        }
      } else {
        remainingErrors.push(error);
      }
    } else {
      remainingErrors.push(error);
    }
  });

  return {
    success: appliedFixes.length > 0,
    fixedCode: appliedFixes.length > 0 ? fixedCode : undefined,
    appliedFixes,
    remainingErrors
  };
}

// Validate if code is likely to work
export function validateCode(code: string): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];

  // Basic syntax checks
  try {
    // Simple validation - check for balanced brackets
    const openBraces = (code.match(/\{/g) || []).length;
    const closeBraces = (code.match(/\}/g) || []).length;
    if (openBraces !== closeBraces) {
      issues.push('Mismatched braces');
    }

    const openParens = (code.match(/\(/g) || []).length;
    const closeParens = (code.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      issues.push('Mismatched parentheses');
    }
  } catch (error) {
    issues.push('Syntax validation failed');
  }

  // Logical checks
  if (code.includes('${') && !code.includes('`')) {
    issues.push('Template literals without backticks');
  }

  if (code.includes('useState') && !code.includes('import')) {
    issues.push('React hooks without imports');
  }

  return {
    isValid: issues.length === 0,
    issues
  };
}

// Create error context for retry attempts
export function createErrorContext(
  failedCode: string, 
  errors: DetectedError[], 
  autoFixResult: AutoFixResult
) {
  return {
    failedCode,
    errors: errors.map(err => ({
      type: err.type,
      message: err.message,
      severity: err.severity,
      autoFixable: err.autoFixable
    })),
    fixes: autoFixResult.appliedFixes,
    remainingIssues: autoFixResult.remainingErrors.map(err => err.message),
    suggestions: generateFixSuggestions(autoFixResult.remainingErrors)
  };
}

// Generate human-readable fix suggestions for remaining errors
function generateFixSuggestions(errors: DetectedError[]): string[] {
  const suggestions: string[] = [];

  errors.forEach(error => {
    switch (error.type) {
      case 'syntax':
        suggestions.push('Check for missing semicolons, brackets, or quotes');
        break;
      case 'undefined_variable':
        suggestions.push('Define variables before using them in template literals');
        break;
      case 'missing_import':
        suggestions.push('Add necessary import statements at the top of the file');
        break;
      case 'logical':
        suggestions.push('Review the logic flow and ensure all dependencies are met');
        break;
      case 'cors':
        suggestions.push('CORS headers need to be added to the API endpoint');
        break;
    }
  });

  return [...new Set(suggestions)]; // Remove duplicates
}