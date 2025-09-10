// v2-Inspired Surgical Code Editor
// Precise, constrained modifications based on user intent

import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { streamText } from 'ai';
import { IntentAnalysis, CodebaseContext } from './intent-analyzer';

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export interface SurgicalEdit {
  filePath: string;
  originalContent: string;
  modifiedContent: string;
  changeDescription: string;
  linesChanged: number[];
}

export interface EditConstraints {
  maxFiles: number;
  preserveStructure: boolean;
  onlyRequestedChanges: boolean;
  maintainFunctionality: boolean;
}

export class SurgicalEditor {
  // v2's core surgical editing with strict constraints
  async performSurgicalEdit(
    intentAnalysis: IntentAnalysis,
    codebaseContext: CodebaseContext,
    controller?: any,
    encoder?: TextEncoder
  ): Promise<SurgicalEdit[]> {
    console.log('[surgical-editor] Starting surgical edit:', intentAnalysis.editType);
    
    // Determine constraints based on intent
    const constraints = this.getEditConstraints(intentAnalysis);
    
    const edits: SurgicalEdit[] = [];
    
    if (intentAnalysis.surgicalEdit && intentAnalysis.targetFiles.length > 0) {
      // SURGICAL MODE: Modify existing files with extreme precision
      for (const targetFile of intentAnalysis.targetFiles.slice(0, constraints.maxFiles)) {
        if (codebaseContext.files[targetFile]) {
          const edit = await this.performPrecisionEdit(
            targetFile,
            codebaseContext.files[targetFile],
            intentAnalysis,
            constraints,
            controller,
            encoder
          );
          if (edit) edits.push(edit);
        }
      }
    } else {
      // CREATION MODE: Generate new file with surgical precision
      const newEdit = await this.performPrecisionCreation(
        intentAnalysis,
        codebaseContext,
        constraints,
        controller,
        encoder
      );
      if (newEdit) edits.push(newEdit);
    }
    
    console.log('[surgical-editor] Surgical edit complete:', {
      filesModified: edits.length,
      totalLinesChanged: edits.reduce((sum, edit) => sum + edit.linesChanged.length, 0)
    });
    
    return edits;
  }

  // v2's precision editing with CRITICAL RULES
  private async performPrecisionEdit(
    filePath: string,
    originalContent: string,
    intent: IntentAnalysis,
    constraints: EditConstraints,
    controller?: any,
    encoder?: TextEncoder
  ): Promise<SurgicalEdit | null> {
    this.streamUpdate(controller, encoder, 'surgical-edit', `Performing surgical edit on ${filePath}...`);

    const surgicalPrompt = this.createSurgicalPrompt(filePath, originalContent, intent, constraints);

    try {
      const result = await streamText({
        model: openrouter('anthropic/claude-sonnet-4'),
        messages: [
          { role: 'system', content: this.getSurgicalSystemPrompt() },
          { role: 'user', content: surgicalPrompt }
        ],
        temperature: 0.1
      });

      let modifiedContent = '';
      for await (const chunk of result.textStream) {
        modifiedContent += chunk;
        this.streamUpdate(controller, encoder, 'surgical-thinking', chunk);
      }

      // Extract the modified code
      const extractedCode = this.extractModifiedCode(modifiedContent);
      
      if (!extractedCode || extractedCode === originalContent) {
        console.warn('[surgical-editor] No changes detected for', filePath);
        return null;
      }

      // Calculate changed lines
      const changedLines = this.calculateChangedLines(originalContent, extractedCode);

      return {
        filePath,
        originalContent,
        modifiedContent: extractedCode,
        changeDescription: intent.reasoning,
        linesChanged: changedLines
      };

    } catch (error) {
      console.error('[surgical-editor] Precision edit failed for', filePath, error);
      return null;
    }
  }

  // v2's creation mode with constraints
  private async performPrecisionCreation(
    intent: IntentAnalysis,
    codebaseContext: CodebaseContext,
    constraints: EditConstraints,
    controller?: any,
    encoder?: TextEncoder
  ): Promise<SurgicalEdit | null> {
    this.streamUpdate(controller, encoder, 'surgical-create', 'Creating new component with surgical precision...');

    const creationPrompt = this.createCreationPrompt(intent, codebaseContext, constraints);

    try {
      const result = await streamText({
        model: openrouter('anthropic/claude-sonnet-4'),
        messages: [
          { role: 'system', content: this.getCreationSystemPrompt() },
          { role: 'user', content: creationPrompt }
        ],
        temperature: 0.2
      });

      let generatedContent = '';
      for await (const chunk of result.textStream) {
        generatedContent += chunk;
        this.streamUpdate(controller, encoder, 'surgical-creating', chunk);
      }

      // Extract filename and code
      const { fileName, code } = this.extractCreatedFile(generatedContent);
      
      if (!fileName || !code) {
        console.warn('[surgical-editor] Failed to extract created file');
        return null;
      }

      return {
        filePath: fileName,
        originalContent: '',
        modifiedContent: code,
        changeDescription: `Created ${fileName} - ${intent.reasoning}`,
        linesChanged: []
      };

    } catch (error) {
      console.error('[surgical-editor] Precision creation failed:', error);
      return null;
    }
  }

  // v2's CRITICAL RULES system prompt
  private getSurgicalSystemPrompt(): string {
    return `You are a SURGICAL CODE EDITOR. Your job is to make PRECISE, MINIMAL modifications.

🚨 CRITICAL RULES - FOLLOW EXACTLY:
1. DO EXACTLY WHAT IS ASKED - NOTHING MORE, NOTHING LESS
2. ONLY modify the specific parts mentioned in the request
3. PRESERVE 99% of the original code
4. Do NOT add unrequested features, imports, or logic
5. Do NOT change formatting unless explicitly asked
6. Do NOT modify unrelated code sections
7. Make the SMALLEST possible change that achieves the goal

RESPONSE FORMAT:
Return ONLY the modified code, no explanations or markdown.`;
  }

  private getCreationSystemPrompt(): string {
    return `You are a PRECISION CODE GENERATOR. Create EXACTLY what is requested.

🚨 CRITICAL RULES - FOLLOW EXACTLY:  
1. Generate ONLY what the user explicitly requested
2. Use modern React patterns with TypeScript
3. Keep code minimal and focused
4. Do NOT add unrequested features or styling
5. Include proper imports and exports
6. Make code production-ready

RESPONSE FORMAT:
Return the complete file with filename on first line as comment.`;
  }

  // Create surgical editing prompt with v2's constraints
  private createSurgicalPrompt(
    filePath: string,
    originalContent: string,
    intent: IntentAnalysis,
    constraints: EditConstraints
  ): string {
    return `SURGICAL EDIT REQUEST:
File: ${filePath}
Intent: ${intent.reasoning}
Edit Type: ${intent.editType}

SEARCH TERMS: ${intent.searchTerms.join(', ')}
EXPECTED CHANGES: ${intent.expectedChanges.join(', ')}

ORIGINAL CODE:
\`\`\`
${originalContent}
\`\`\`

CONSTRAINTS:
- Max files to modify: ${constraints.maxFiles}
- Preserve structure: ${constraints.preserveStructure}
- Only requested changes: ${constraints.onlyRequestedChanges}

Make the MINIMAL change needed. Return ONLY the modified code.`;
  }

  private createCreationPrompt(
    intent: IntentAnalysis,
    codebaseContext: CodebaseContext,
    constraints: EditConstraints
  ): string {
    const contextSummary = Object.keys(codebaseContext.files).slice(0, 5).join(', ');
    
    return `CREATE NEW COMPONENT:
Request: ${intent.reasoning}
Type: ${intent.editType}

EXISTING CONTEXT: ${contextSummary}
EXPECTED FUNCTIONALITY: ${intent.expectedChanges.join(', ')}

CONSTRAINTS:
- Create minimal, focused component
- Use existing patterns from codebase
- TypeScript + modern React
- No unnecessary features

Return filename as comment + complete code.`;
  }

  // Determine edit constraints based on intent (v2 approach)
  private getEditConstraints(intent: IntentAnalysis): EditConstraints {
    const baseConstraints = {
      preserveStructure: true,
      onlyRequestedChanges: true,
      maintainFunctionality: true,
      maxFiles: 1
    };

    switch (intent.editType) {
      case 'UPDATE':
      case 'FIX':
        return { ...baseConstraints, maxFiles: 1 }; // Simple changes = 1 file
      case 'ENHANCE':
        return { ...baseConstraints, maxFiles: 2 }; // Enhancement = 2 files max
      case 'CREATE':
        return { ...baseConstraints, maxFiles: 1, preserveStructure: false };
      case 'REFACTOR':
        return { ...baseConstraints, maxFiles: 3 }; // Refactor can touch more files
      default:
        return baseConstraints;
    }
  }

  // Helper methods
  private streamUpdate(controller: any, encoder: TextEncoder | undefined, type: string, content: string) {
    if (controller && encoder) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type, content })}\n\n`));
    }
  }

  private extractModifiedCode(response: string): string {
    // Extract code from various formats
    const codeBlockMatch = response.match(/```(?:tsx?|jsx?|javascript|typescript)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim();
    }
    
    // If no code block, return trimmed response
    return response.trim();
  }

  private extractCreatedFile(response: string): { fileName: string, code: string } {
    const lines = response.trim().split('\n');
    const firstLine = lines[0];
    
    // Look for filename comment
    const fileNameMatch = firstLine.match(/\/\/\s*(.+\.(tsx?|jsx?))/) || firstLine.match(/\/\*\s*(.+\.(tsx?|jsx?))\s*\*\//);
    
    if (fileNameMatch) {
      return {
        fileName: fileNameMatch[1],
        code: lines.slice(1).join('\n').trim()
      };
    }
    
    // Fallback: guess filename from content
    const componentMatch = response.match(/(?:export\s+default\s+|function\s+|const\s+)(\w+)/);
    const fileName = componentMatch ? `${componentMatch[1]}.tsx` : 'Component.tsx';
    
    return {
      fileName,
      code: response.trim()
    };
  }

  private calculateChangedLines(original: string, modified: string): number[] {
    const originalLines = original.split('\n');
    const modifiedLines = modified.split('\n');
    const changedLines: number[] = [];
    
    const maxLines = Math.max(originalLines.length, modifiedLines.length);
    for (let i = 0; i < maxLines; i++) {
      if (originalLines[i] !== modifiedLines[i]) {
        changedLines.push(i + 1);
      }
    }
    
    return changedLines;
  }
}

// Export singleton
export const surgicalEditor = new SurgicalEditor();