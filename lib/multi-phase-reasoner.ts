// v2-Inspired Multi-Phase Reasoning System
// Intent Analysis → Context Search → Strategic Planning → Surgical Execution

import { intentAnalyzer, IntentAnalysis, CodebaseContext } from './intent-analyzer';
import { surgicalEditor, SurgicalEdit } from './surgical-editor';
import { v2StreamingManager } from './v2-streaming';
import { conversationStateManager } from './conversation-state';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { streamText } from 'ai';

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export interface ReasoningPhase {
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: any;
  duration?: number;
  error?: string;
}

export interface StrategicPlan {
  approach: 'surgical_edit' | 'new_creation' | 'multi_file_refactor';
  reasoning: string;
  phases: string[];
  riskAssessment: string[];
  successCriteria: string[];
  estimatedComplexity: 'low' | 'medium' | 'high';
}

export interface ReasoningResult {
  phases: ReasoningPhase[];
  intentAnalysis: IntentAnalysis;
  strategicPlan: StrategicPlan;
  surgicalEdits: SurgicalEdit[];
  totalDuration: number;
  success: boolean;
}

export class MultiPhaseReasoner {
  private phases: ReasoningPhase[] = [];
  private startTime = 0;

  // v2's comprehensive multi-phase reasoning workflow
  async executeMultiPhaseReasoning(
    userPrompt: string,
    codebaseContext: CodebaseContext,
    controller?: any,
    encoder?: TextEncoder
  ): Promise<ReasoningResult> {
    this.startTime = Date.now();
    this.phases = [];

    try {
      // Phase 1: Intent Analysis
      const intentAnalysis = await this.executePhase(
        'Intent Analysis',
        () => this.analyzeUserIntent(userPrompt, codebaseContext, controller),
        controller
      );

      // Phase 2: Context Search & Analysis  
      const searchResults = await this.executePhase(
        'Context Search',
        () => this.performContextSearch(intentAnalysis, codebaseContext, controller),
        controller
      );

      // Phase 3: Strategic Planning
      const strategicPlan = await this.executePhase(
        'Strategic Planning',
        () => this.createStrategicPlan(intentAnalysis, searchResults, codebaseContext, controller),
        controller
      );

      // Phase 4: Surgical Execution
      const surgicalEdits = await this.executePhase(
        'Surgical Execution',
        () => this.executeSurgicalChanges(intentAnalysis, strategicPlan, codebaseContext, controller, encoder),
        controller
      );

      // Phase 5: Validation & Cleanup
      await this.executePhase(
        'Validation',
        () => this.validateResults(surgicalEdits, intentAnalysis, controller),
        controller
      );

      const totalDuration = Date.now() - this.startTime;

      // Record in conversation state
      conversationStateManager.addMessage('assistant', 
        `Completed multi-phase reasoning: ${intentAnalysis.editType} operation`,
        { editType: intentAnalysis.editType, confidence: intentAnalysis.confidence }
      );

      return {
        phases: this.phases,
        intentAnalysis,
        strategicPlan,
        surgicalEdits,
        totalDuration,
        success: this.phases.every(p => p.status === 'completed')
      };

    } catch (error) {
      console.error('[multi-phase-reasoner] Execution failed:', error);
      
      return {
        phases: this.phases,
        intentAnalysis: {} as IntentAnalysis,
        strategicPlan: {} as StrategicPlan,
        surgicalEdits: [],
        totalDuration: Date.now() - this.startTime,
        success: false
      };
    }
  }

  // Execute a single phase with timing and error handling
  private async executePhase<T>(
    phaseName: string,
    executor: () => Promise<T>,
    controller?: any
  ): Promise<T> {
    const phase: ReasoningPhase = {
      name: phaseName,
      status: 'in_progress'
    };

    const phaseStart = Date.now();
    this.phases.push(phase);

    v2StreamingManager.updateStatus(controller, phaseName, `Starting ${phaseName.toLowerCase()}...`);

    try {
      const result = await executor();
      
      phase.status = 'completed';
      phase.result = result;
      phase.duration = Date.now() - phaseStart;

      v2StreamingManager.updateStatus(controller, phaseName, `${phaseName} completed in ${phase.duration}ms`);
      
      return result;

    } catch (error) {
      phase.status = 'failed';
      phase.error = (error as Error).message;
      phase.duration = Date.now() - phaseStart;

      v2StreamingManager.addError(controller, `${phaseName} failed: ${phase.error}`);
      
      throw error;
    }
  }

  // Phase 1: Enhanced Intent Analysis with conversation context
  private async analyzeUserIntent(
    userPrompt: string,
    codebaseContext: CodebaseContext,
    controller?: any
  ): Promise<IntentAnalysis> {
    v2StreamingManager.startIntentAnalysis(controller, userPrompt);

    // Add conversation context to improve analysis
    const conversationContext = conversationStateManager.getConversationContext();
    const enhancedContext: CodebaseContext = {
      ...codebaseContext,
      recentChanges: conversationStateManager.getCurrentState().projectEvolution.recentEdits.map(e => e.description)
    };

    const analysis = await intentAnalyzer.analyzeIntent(userPrompt, enhancedContext);
    
    v2StreamingManager.completeIntentAnalysis(controller, analysis);
    return analysis;
  }

  // Phase 2: v2's Context Search System  
  private async performContextSearch(
    intentAnalysis: IntentAnalysis,
    codebaseContext: CodebaseContext,
    controller?: any
  ): Promise<any> {
    v2StreamingManager.updateStatus(controller, 'Context Search', 
      `Searching for: ${intentAnalysis.searchTerms.join(', ')}`);

    const searchResults = {
      relevantFiles: [] as string[],
      matchedTerms: [] as string[],
      codeSnippets: [] as string[],
      confidence: 0
    };

    // Search through files for relevant content
    for (const [filePath, content] of Object.entries(codebaseContext.files)) {
      if (intentAnalysis.targetFiles.includes(filePath) || 
          intentAnalysis.searchTerms.some(term => content.toLowerCase().includes(term.toLowerCase()))) {
        
        searchResults.relevantFiles.push(filePath);
        
        // Extract relevant code snippets
        const snippets = this.extractRelevantSnippets(content, intentAnalysis.searchTerms);
        searchResults.codeSnippets.push(...snippets);
      }
    }

    searchResults.confidence = searchResults.relevantFiles.length / Math.max(intentAnalysis.targetFiles.length, 1);

    return searchResults;
  }

  // Phase 3: Strategic Planning with v2's approach
  private async createStrategicPlan(
    intentAnalysis: IntentAnalysis,
    searchResults: any,
    codebaseContext: CodebaseContext,
    controller?: any
  ): Promise<StrategicPlan> {
    v2StreamingManager.updateStatus(controller, 'Strategic Planning', 
      'Creating execution strategy...');

    // Use conversation context to inform planning
    const userPreferences = conversationStateManager.getPreferredPatterns();
    const projectSummary = conversationStateManager.getProjectSummary();

    const planningPrompt = `Create a strategic execution plan for this request:

INTENT ANALYSIS:
- Edit Type: ${intentAnalysis.editType}
- Target Files: ${intentAnalysis.targetFiles.join(', ')}
- Reasoning: ${intentAnalysis.reasoning}
- Surgical Edit: ${intentAnalysis.surgicalEdit}

PROJECT CONTEXT:
${projectSummary}

USER PREFERENCES:
${JSON.stringify(userPreferences, null, 2)}

SEARCH RESULTS:
- Relevant Files: ${searchResults.relevantFiles.length}
- Confidence: ${Math.round(searchResults.confidence * 100)}%

Create a JSON plan with:
{
  "approach": "surgical_edit|new_creation|multi_file_refactor",
  "reasoning": "Why this approach is optimal",
  "phases": ["phase1", "phase2", "phase3"],
  "riskAssessment": ["potential risk 1", "risk 2"],
  "successCriteria": ["criteria 1", "criteria 2"],
  "estimatedComplexity": "low|medium|high"
}`;

    try {
      const result = await streamText({
        model: openrouter('anthropic/claude-opus-4.1'),
        messages: [
          { role: 'system', content: 'You are a strategic planning expert. Always respond with valid JSON.' },
          { role: 'user', content: planningPrompt }
        ],
        temperature: 0.2
      });

      let planText = '';
      for await (const chunk of result.textStream) {
        planText += chunk;
        v2StreamingManager.streamPlanThinking(controller, chunk);
      }

      const strategicPlan = this.parseStrategicPlan(planText);
      v2StreamingManager.completePlanning(controller, strategicPlan);
      
      return strategicPlan;

    } catch (error) {
      console.error('[multi-phase-reasoner] Strategic planning failed:', error);
      
      // Fallback plan
      return {
        approach: intentAnalysis.surgicalEdit ? 'surgical_edit' : 'new_creation',
        reasoning: 'Fallback plan due to planning error',
        phases: ['analyze', 'modify', 'validate'],
        riskAssessment: ['Unknown risks due to planning failure'],
        successCriteria: ['Complete requested changes'],
        estimatedComplexity: 'medium'
      };
    }
  }

  // Phase 4: Surgical Execution
  private async executeSurgicalChanges(
    intentAnalysis: IntentAnalysis,
    strategicPlan: StrategicPlan,
    codebaseContext: CodebaseContext,
    controller?: any,
    encoder?: TextEncoder
  ): Promise<SurgicalEdit[]> {
    v2StreamingManager.updateStatus(controller, 'Surgical Execution', 
      `Executing ${strategicPlan.approach} changes...`);

    const edits = await surgicalEditor.performSurgicalEdit(
      intentAnalysis,
      codebaseContext,
      controller,
      encoder
    );

    // Record edits in conversation state
    edits.forEach(edit => {
      conversationStateManager.recordFileEdit(
        edit.filePath,
        intentAnalysis.editType,
        edit.changeDescription
      );
    });

    return edits;
  }

  // Phase 5: Validation
  private async validateResults(
    surgicalEdits: SurgicalEdit[],
    intentAnalysis: IntentAnalysis,
    controller?: any
  ): Promise<void> {
    v2StreamingManager.updateStatus(controller, 'Validation', 
      'Validating surgical edits...');

    // Basic validation
    const validationResults = {
      filesModified: surgicalEdits.length,
      linesChanged: surgicalEdits.reduce((sum, edit) => sum + edit.linesChanged.length, 0),
      allFilesValid: surgicalEdits.every(edit => edit.modifiedContent.length > 0),
      matchesIntent: surgicalEdits.length > 0
    };

    if (!validationResults.matchesIntent) {
      throw new Error('Validation failed: No edits produced for user request');
    }

    if (!validationResults.allFilesValid) {
      v2StreamingManager.addWarning(controller, 'Some generated files may be empty or invalid');
    }
  }

  // Helper methods
  private extractRelevantSnippets(content: string, searchTerms: string[]): string[] {
    const snippets: string[] = [];
    const lines = content.split('\n');
    
    searchTerms.forEach(term => {
      lines.forEach((line, index) => {
        if (line.toLowerCase().includes(term.toLowerCase())) {
          // Extract context around the match
          const start = Math.max(0, index - 2);
          const end = Math.min(lines.length, index + 3);
          const snippet = lines.slice(start, end).join('\n');
          snippets.push(snippet);
        }
      });
    });
    
    return snippets;
  }

  private parseStrategicPlan(response: string): StrategicPlan {
    try {
      // Try direct JSON parse
      return JSON.parse(response);
    } catch (directError) {
      // Extract from markdown
      const jsonMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
      
      // Find JSON object
      const jsonObjectMatch = response.match(/\{[\s\S]*\}/);
      if (jsonObjectMatch) {
        return JSON.parse(jsonObjectMatch[0]);
      }
      
      throw new Error('Could not parse strategic plan');
    }
  }
}

// Export singleton
export const multiPhaseReasoner = new MultiPhaseReasoner();