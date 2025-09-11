// v2-Inspired Intent Analysis System
// Precisely analyzes user intent before making any code changes

import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { streamText } from 'ai';
import { editExamplesV2 } from './edit-examples-v2';

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export interface IntentAnalysis {
  editType: 'CREATE' | 'UPDATE' | 'FIX' | 'ENHANCE' | 'REFACTOR';
  reasoning: string;
  targetFiles: string[];
  searchTerms: string[];
  regexPatterns?: string[];
  expectedChanges: string[];
  surgicalEdit: boolean;
  confidence: number;
}

export interface CodebaseContext {
  files: Record<string, string>;
  fileStructure: string;
  componentList: string[];
  recentChanges: string[];
}

export class IntentAnalyzer {
  // Analyze user intent with v2's sophisticated approach
  async analyzeIntent(
    userPrompt: string,
    codebaseContext: CodebaseContext
  ): Promise<IntentAnalysis> {
    console.log('[intent-analyzer] Analyzing user intent:', userPrompt.substring(0, 100));

    const contextSummary = this.generateContextSummary(codebaseContext);
    
    const analysisPrompt = `You are an expert code intent analyzer. Analyze this user request and respond with ONLY valid JSON.

USER REQUEST: "${userPrompt}"

CODEBASE CONTEXT:
${contextSummary}

ANALYZE THE INTENT and respond with this exact JSON structure:
{
  "editType": "CREATE|UPDATE|FIX|ENHANCE|REFACTOR",
  "reasoning": "Detailed explanation of what the user wants and why",
  "targetFiles": ["file1.tsx", "file2.ts"],
  "searchTerms": ["specific", "terms", "to", "find"],
  "regexPatterns": ["optional regex patterns"],
  "expectedChanges": ["what will change", "specific modifications"],
  "surgicalEdit": true,
  "confidence": 0.95
}

RULES:
- surgicalEdit: true if modifying existing code, false if creating new
- confidence: 0.0-1.0 based on clarity of request
- targetFiles: actual files that need modification
- searchTerms: specific text to locate in code
- Be precise and surgical in your analysis`;

    try {
      const result = await streamText({
        model: openrouter('anthropic/claude-sonnet-4'),
        messages: [
          { role: 'system', content: 'You are an expert code intent analyzer. Always respond with valid JSON only.' },
          { role: 'user', content: analysisPrompt }
        ],
        temperature: 0.1
      });

      let responseText = '';
      for await (const chunk of result.textStream) {
        responseText += chunk;
      }

      // Parse with v2's robust JSON extraction
      const analysis = this.parseIntentResponse(responseText);
      
      // Enhance analysis with edit examples patterns
      const enhancedAnalysis = this.enhanceWithEditExamples(analysis, userPrompt);
      
      console.log('[intent-analyzer] Analysis complete:', {
        editType: enhancedAnalysis.editType,
        confidence: enhancedAnalysis.confidence,
        surgicalEdit: enhancedAnalysis.surgicalEdit,
        targetFiles: enhancedAnalysis.targetFiles.length
      });

      return enhancedAnalysis;

    } catch (error) {
      console.error('[intent-analyzer] Analysis failed:', error);
      
      // Fallback analysis
      return {
        editType: 'CREATE',
        reasoning: 'Fallback analysis due to parsing error',
        targetFiles: [],
        searchTerms: this.extractKeywords(userPrompt),
        expectedChanges: ['Generate requested functionality'],
        surgicalEdit: false,
        confidence: 0.3
      };
    }
  }

  // v2-style robust JSON parsing
  private parseIntentResponse(responseText: string): IntentAnalysis {
    try {
      // Try direct parse first
      return JSON.parse(responseText);
    } catch (directError) {
      // Extract from markdown if needed
      const jsonMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }

      // Find JSON object anywhere
      const jsonObjectMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonObjectMatch) {
        return JSON.parse(jsonObjectMatch[0]);
      }

      throw new Error('No valid JSON found in response');
    }
  }

  // Generate concise context summary for AI
  private generateContextSummary(context: CodebaseContext): string {
    const files = Object.keys(context.files);
    const components = context.componentList;
    
    let summary = `FILES (${files.length} total):\n`;
    files.slice(0, 10).forEach(file => {
      const size = context.files[file]?.length || 0;
      summary += `- ${file} (${size} chars)\n`;
    });
    
    if (components.length > 0) {
      summary += `\nCOMPONENTS: ${components.slice(0, 8).join(', ')}`;
    }
    
    if (context.recentChanges.length > 0) {
      summary += `\nRECENT CHANGES: ${context.recentChanges.join(', ')}`;
    }
    
    return summary;
  }

  // Extract keywords for fallback
  private extractKeywords(prompt: string): string[] {
    const words = prompt.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !['this', 'that', 'with', 'from', 'they', 'have', 'will', 'been', 'were'].includes(word));
    
    return words.slice(0, 5);
  }

  // Enhance analysis with v2's deterministic edit examples
  private enhanceWithEditExamples(analysis: IntentAnalysis, userPrompt: string): IntentAnalysis {
    // Find best matching example
    const bestExample = editExamplesV2.getBestExample(
      userPrompt,
      analysis.editType,
      analysis.searchTerms
    );

    if (!bestExample) {
      return analysis;
    }

    // Calculate enhanced confidence
    const exampleConfidence = editExamplesV2.calculateMatchConfidence(
      [bestExample],
      analysis.editType,
      analysis.searchTerms
    );

    // Merge the confidence scores
    const enhancedConfidence = (analysis.confidence + exampleConfidence) / 2;

    // Get enhanced search terms and patterns
    const enhancedSearchTerms = editExamplesV2.getEnhancedSearchTerms(
      userPrompt,
      [bestExample]
    );

    const enhancedPatterns = editExamplesV2.getEnhancedRegexPatterns(
      [bestExample],
      analysis.searchTerms
    );

    console.log('[intent-analyzer] Enhanced with edit example:', bestExample.pattern);

    return {
      ...analysis,
      confidence: enhancedConfidence,
      searchTerms: [...new Set([...analysis.searchTerms, ...enhancedSearchTerms])],
      regexPatterns: [...new Set([...(analysis.regexPatterns || []), ...enhancedPatterns])],
      expectedChanges: [...analysis.expectedChanges, bestExample.description]
    };
  }
}

// Export singleton
export const intentAnalyzer = new IntentAnalyzer();