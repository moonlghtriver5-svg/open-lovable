// v2 Enhanced File Search Executor
// Precise file search system based on open-lovable's actual implementation

import { editExamplesV2, EditExample } from './edit-examples-v2';

export interface SearchResult {
  filePath: string;
  lineNumber: number;
  lineContent: string;
  matchedTerm?: string;
  matchedPattern?: string;
  contextBefore: string[];
  contextAfter: string[];
  confidence: 'high' | 'medium' | 'low';
}

export interface SearchPlan {
  editType: string;
  reasoning: string;
  searchTerms: string[];
  regexPatterns?: string[];
  fileTypesToSearch?: string[];
  expectedMatches?: number;
  fallbackSearch?: {
    terms: string[];
    patterns?: string[];
  };
}

export interface SearchExecutionResult {
  success: boolean;
  results: SearchResult[];
  filesSearched: number;
  executionTime: number;
  usedFallback: boolean;
  error?: string;
}

export class FileSearchExecutorV2 {
  
  /**
   * Execute a comprehensive search plan across files with v2's edit examples
   */
  executeSearchPlan(
    searchPlan: SearchPlan,
    files: Record<string, string>
  ): SearchExecutionResult {
    const startTime = Date.now();
    let results: SearchResult[] = [];
    let filesSearched = 0;
    let usedFallback = false;

    try {
      console.log('[file-search-executor-v2] Executing search plan:', {
        editType: searchPlan.editType,
        searchTerms: searchPlan.searchTerms,
        fileCount: Object.keys(files).length
      });

      // Enhance search plan with v2's edit examples
      const enhancedPlan = this.enhanceSearchPlanWithExamples(searchPlan);

      // Filter files by type if specified
      const filesToSearch = this.filterFilesByType(files, enhancedPlan.fileTypesToSearch);
      
      // Primary search
      results = this.performSearch(
        filesToSearch,
        enhancedPlan.searchTerms,
        enhancedPlan.regexPatterns || []
      );
      
      filesSearched = Object.keys(filesToSearch).length;

      // Fallback search if primary search yields insufficient results
      if (results.length < (searchPlan.expectedMatches || 1) && searchPlan.fallbackSearch) {
        console.log('[file-search-executor-v2] Using fallback search...');
        
        const fallbackResults = this.performSearch(
          filesToSearch,
          searchPlan.fallbackSearch.terms,
          searchPlan.fallbackSearch.patterns || []
        );
        
        results = [...results, ...fallbackResults];
        usedFallback = true;
      }

      // Sort results by confidence and relevance
      results = this.sortResultsByRelevance(results, searchPlan.editType);

      const executionTime = Date.now() - startTime;
      
      console.log('[file-search-executor-v2] Search completed:', {
        resultsFound: results.length,
        filesSearched,
        executionTime: `${executionTime}ms`,
        usedFallback
      });

      return {
        success: true,
        results,
        filesSearched,
        executionTime,
        usedFallback
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error('[file-search-executor-v2] Search failed:', error);
      
      return {
        success: false,
        results: [],
        filesSearched,
        executionTime,
        usedFallback: false,
        error: (error as Error).message
      };
    }
  }

  /**
   * Perform actual search across files with terms and patterns
   */
  private performSearch(
    files: Record<string, string>,
    searchTerms: string[],
    regexPatterns: string[]
  ): SearchResult[] {
    const results: SearchResult[] = [];

    for (const [filePath, content] of Object.entries(files)) {
      const lines = content.split('\n');
      
      // Search for exact terms
      for (const term of searchTerms) {
        const termResults = this.searchForTerm(filePath, lines, term);
        results.push(...termResults);
      }
      
      // Search for regex patterns
      for (const pattern of regexPatterns) {
        try {
          const regex = new RegExp(pattern, 'gi');
          const patternResults = this.searchForPattern(filePath, lines, regex, pattern);
          results.push(...patternResults);
        } catch (error) {
          console.warn('[file-search-executor-v2] Invalid regex pattern:', pattern);
        }
      }
    }

    return this.deduplicateResults(results);
  }

  /**
   * Search for exact term matches in file lines
   */
  private searchForTerm(filePath: string, lines: string[], term: string): SearchResult[] {
    const results: SearchResult[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lowerLine = line.toLowerCase();
      const lowerTerm = term.toLowerCase();
      
      if (lowerLine.includes(lowerTerm)) {
        // Determine confidence based on match type
        const confidence = this.calculateTermConfidence(line, term);
        
        results.push({
          filePath,
          lineNumber: i + 1,
          lineContent: line,
          matchedTerm: term,
          contextBefore: this.getContextLines(lines, i, -3),
          contextAfter: this.getContextLines(lines, i, 3),
          confidence
        });
      }
    }
    
    return results;
  }

  /**
   * Search for regex pattern matches in file lines
   */
  private searchForPattern(
    filePath: string, 
    lines: string[], 
    regex: RegExp, 
    pattern: string
  ): SearchResult[] {
    const results: SearchResult[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const matches = line.match(regex);
      
      if (matches) {
        results.push({
          filePath,
          lineNumber: i + 1,
          lineContent: line,
          matchedPattern: pattern,
          contextBefore: this.getContextLines(lines, i, -3),
          contextAfter: this.getContextLines(lines, i, 3),
          confidence: 'high' as const // Regex patterns are considered high confidence
        });
      }
    }
    
    return results;
  }

  /**
   * Calculate confidence score for term matches
   */
  private calculateTermConfidence(line: string, term: string): 'high' | 'medium' | 'low' {
    const lowerLine = line.toLowerCase();
    const lowerTerm = term.toLowerCase();
    
    // Exact word match (surrounded by word boundaries)
    const exactWordRegex = new RegExp(`\\b${lowerTerm}\\b`);
    if (exactWordRegex.test(lowerLine)) {
      return 'high';
    }
    
    // Partial match but significant portion of line
    if (lowerTerm.length >= 5 && lowerLine.includes(lowerTerm)) {
      return 'medium';
    }
    
    // Basic substring match
    return 'low';
  }

  /**
   * Get context lines around a target line
   */
  private getContextLines(lines: string[], targetIndex: number, offset: number): string[] {
    const contextLines: string[] = [];
    const start = Math.max(0, targetIndex + (offset < 0 ? offset : 1));
    const end = Math.min(lines.length, targetIndex + (offset < 0 ? 0 : offset + 1));
    
    for (let i = start; i < end; i++) {
      if (i !== targetIndex) { // Don't include the target line itself
        contextLines.push(lines[i]);
      }
    }
    
    return contextLines;
  }

  /**
   * Filter files by specified file types
   */
  private filterFilesByType(
    files: Record<string, string>,
    fileTypes?: string[]
  ): Record<string, string> {
    if (!fileTypes || fileTypes.length === 0) {
      return files;
    }
    
    const filtered: Record<string, string> = {};
    
    for (const [filePath, content] of Object.entries(files)) {
      const extension = filePath.split('.').pop()?.toLowerCase();
      if (extension && fileTypes.includes(extension)) {
        filtered[filePath] = content;
      }
    }
    
    return filtered;
  }

  /**
   * Remove duplicate search results
   */
  private deduplicateResults(results: SearchResult[]): SearchResult[] {
    const seen = new Set<string>();
    const deduplicated: SearchResult[] = [];
    
    for (const result of results) {
      const key = `${result.filePath}:${result.lineNumber}:${result.lineContent}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(result);
      }
    }
    
    return deduplicated;
  }

  /**
   * Sort results by relevance and confidence
   */
  private sortResultsByRelevance(results: SearchResult[], editType: string): SearchResult[] {
    return results.sort((a, b) => {
      // First sort by confidence
      const confidenceOrder = { 'high': 3, 'medium': 2, 'low': 1 };
      const confidenceDiff = confidenceOrder[b.confidence] - confidenceOrder[a.confidence];
      
      if (confidenceDiff !== 0) {
        return confidenceDiff;
      }
      
      // Then by file type relevance based on edit type
      const aRelevance = this.getFileTypeRelevance(a.filePath, editType);
      const bRelevance = this.getFileTypeRelevance(b.filePath, editType);
      
      return bRelevance - aRelevance;
    });
  }

  /**
   * Get file type relevance score based on edit type
   */
  private getFileTypeRelevance(filePath: string, editType: string): number {
    const extension = filePath.split('.').pop()?.toLowerCase();
    
    // Component-related edit types
    if (['UPDATE_COMPONENT', 'ADD_FEATURE', 'REFACTOR'].includes(editType)) {
      if (['tsx', 'jsx'].includes(extension || '')) return 5;
      if (['ts', 'js'].includes(extension || '')) return 4;
      if (['css', 'scss'].includes(extension || '')) return 2;
    }
    
    // Style-related edit types  
    if (editType === 'UPDATE_STYLE') {
      if (['css', 'scss', 'tailwind'].includes(extension || '')) return 5;
      if (['tsx', 'jsx'].includes(extension || '')) return 3;
    }
    
    // Configuration-related
    if (editType === 'ADD_DEPENDENCY') {
      if (filePath.includes('package.json')) return 5;
      if (['json', 'config'].includes(extension || '')) return 3;
    }
    
    return 1; // Default relevance
  }

  /**
   * Enhance search plan with v2's deterministic edit examples
   */
  private enhanceSearchPlanWithExamples(searchPlan: SearchPlan): SearchPlan {
    // Find matching edit examples
    const matchingExamples = editExamplesV2.findMatchingPatterns(
      searchPlan.reasoning,
      searchPlan.editType,
      searchPlan.searchTerms
    );

    if (matchingExamples.length === 0) {
      console.log('[file-search-executor-v2] No matching edit examples found');
      return searchPlan;
    }

    console.log('[file-search-executor-v2] Found matching edit examples:', matchingExamples.length);

    // Enhance search terms
    const enhancedSearchTerms = editExamplesV2.getEnhancedSearchTerms(
      searchPlan.reasoning,
      matchingExamples
    );

    // Get enhanced regex patterns
    const enhancedRegexPatterns = editExamplesV2.getEnhancedRegexPatterns(
      matchingExamples,
      searchPlan.searchTerms
    );

    // Get target file types
    const enhancedFileTypes = editExamplesV2.getTargetFileTypes(matchingExamples);

    return {
      ...searchPlan,
      searchTerms: [...new Set([...searchPlan.searchTerms, ...enhancedSearchTerms])],
      regexPatterns: [...new Set([...(searchPlan.regexPatterns || []), ...enhancedRegexPatterns])],
      fileTypesToSearch: enhancedFileTypes.length > 0 ? enhancedFileTypes : searchPlan.fileTypesToSearch,
      expectedMatches: Math.max(searchPlan.expectedMatches || 1, matchingExamples.length)
    };
  }

  /**
   * Format search results for AI consumption
   */
  formatSearchResultsForAI(results: SearchResult[]): string {
    if (results.length === 0) {
      return 'No search results found.';
    }
    
    let formatted = `Found ${results.length} search results:\n\n`;
    
    for (const [index, result] of results.entries()) {
      formatted += `${index + 1}. ${result.filePath} (line ${result.lineNumber}) [${result.confidence} confidence]\n`;
      formatted += `   Match: ${result.lineContent.trim()}\n`;
      
      if (result.matchedTerm) {
        formatted += `   Term: "${result.matchedTerm}"\n`;
      }
      
      if (result.matchedPattern) {
        formatted += `   Pattern: ${result.matchedPattern}\n`;
      }
      
      if (result.contextBefore.length > 0) {
        formatted += `   Context before:\n`;
        result.contextBefore.forEach(line => {
          formatted += `     ${line.trim()}\n`;
        });
      }
      
      if (result.contextAfter.length > 0) {
        formatted += `   Context after:\n`;
        result.contextAfter.forEach(line => {
          formatted += `     ${line.trim()}\n`;
        });
      }
      
      formatted += '\n';
    }
    
    return formatted;
  }

  /**
   * Select the most appropriate target file for editing
   */
  selectTargetFile(
    results: SearchResult[],
    editType: string
  ): { filePath: string; lineNumber: number; reason: string } | null {
    if (results.length === 0) {
      return null;
    }
    
    // Find highest confidence result
    const highConfidenceResults = results.filter(r => r.confidence === 'high');
    const targetResults = highConfidenceResults.length > 0 ? highConfidenceResults : results;
    
    // Select most relevant file
    const sortedResults = this.sortResultsByRelevance(targetResults, editType);
    const selected = sortedResults[0];
    
    const reason = `Selected ${selected.filePath} because it has ${selected.confidence} confidence match` +
                  (selected.matchedTerm ? ` for term "${selected.matchedTerm}"` : '') +
                  (selected.matchedPattern ? ` for pattern "${selected.matchedPattern}"` : '') +
                  ` and is most relevant for ${editType} operations.`;
    
    return {
      filePath: selected.filePath,
      lineNumber: selected.lineNumber,
      reason
    };
  }
}

// Export singleton instance
export const fileSearchExecutorV2 = new FileSearchExecutorV2();