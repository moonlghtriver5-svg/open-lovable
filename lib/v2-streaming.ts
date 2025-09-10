// v2-Enhanced Streaming Architecture
// Granular progress tracking with robust error handling

export interface StreamEvent {
  type: 'intent-analysis' | 'surgical-edit' | 'surgical-thinking' | 'surgical-creating' | 
        'context-building' | 'plan-thinking' | 'plan-complete' | 'execution-start' |
        'file-generation' | 'component-progress' | 'package-detection' | 'error-recovery' |
        'warning' | 'error' | 'complete' | 'status';
  content: any;
  timestamp?: Date;
  metadata?: Record<string, any>;
}

export interface GenerationProgress {
  stage: string;
  currentFile?: string;
  filesCompleted: number;
  totalFiles: number;
  componentsDetected: string[];
  packagesDetected: string[];
  warnings: string[];
  errors: string[];
}

export class V2StreamingManager {
  private encoder = new TextEncoder();
  private progress: GenerationProgress = {
    stage: 'initializing',
    filesCompleted: 0,
    totalFiles: 0,
    componentsDetected: [],
    packagesDetected: [],
    warnings: [],
    errors: []
  };

  // Enhanced progress sender with v2's granular tracking
  sendProgress(
    controller: any, 
    type: StreamEvent['type'],
    content: any,
    metadata?: Record<string, any>
  ): void {
    if (!controller) return;

    const event: StreamEvent = {
      type,
      content,
      timestamp: new Date(),
      metadata
    };

    try {
      controller.enqueue(
        this.encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
      );
    } catch (error) {
      console.error('[v2-streaming] Failed to send progress:', error);
    }
  }

  // v2's status update system
  updateStatus(controller: any, stage: string, details?: string): void {
    this.progress.stage = stage;
    
    const statusMessage = details ? `${stage}: ${details}` : stage;
    
    this.sendProgress(controller, 'status', {
      stage,
      message: statusMessage,
      progress: this.progress
    });
  }

  // Intent analysis progress (new in our v2 implementation)
  startIntentAnalysis(controller: any, userPrompt: string): void {
    this.updateStatus(controller, 'Analyzing user intent', 
      `Processing: "${userPrompt.substring(0, 50)}..."`);
    
    this.sendProgress(controller, 'intent-analysis', {
      phase: 'start',
      prompt: userPrompt.substring(0, 100)
    });
  }

  completeIntentAnalysis(controller: any, analysis: any): void {
    this.sendProgress(controller, 'intent-analysis', {
      phase: 'complete',
      editType: analysis.editType,
      confidence: analysis.confidence,
      surgicalEdit: analysis.surgicalEdit,
      targetFiles: analysis.targetFiles
    });
  }

  // Enhanced plan thinking with better formatting
  streamPlanThinking(controller: any, chunk: string): void {
    this.sendProgress(controller, 'plan-thinking', chunk);
  }

  completePlanning(controller: any, plan: any): void {
    this.sendProgress(controller, 'plan-complete', {
      strategy: plan.buildInstructions || plan.strategy,
      steps: plan.implementationSteps || plan.plan,
      constraints: plan.constraints
    });
  }

  // v2's component and file progress tracking
  startFileGeneration(controller: any, fileName: string): void {
    this.progress.currentFile = fileName;
    this.updateStatus(controller, 'Generating file', fileName);
    
    this.sendProgress(controller, 'file-generation', {
      phase: 'start',
      fileName,
      progress: this.progress
    });
  }

  updateFileGeneration(controller: any, chunk: string): void {
    this.sendProgress(controller, 'file-generation', {
      phase: 'stream',
      content: chunk,
      currentFile: this.progress.currentFile
    });
  }

  completeFileGeneration(controller: any, fileName: string, content: string): void {
    this.progress.filesCompleted++;
    
    // Detect components and packages in generated content
    this.detectComponentsAndPackages(content);
    
    this.sendProgress(controller, 'file-generation', {
      phase: 'complete',
      fileName,
      progress: this.progress
    });
  }

  // v2's package detection system
  private detectComponentsAndPackages(content: string): void {
    // Detect React components
    const componentMatches = content.match(/(?:function|const|class)\s+([A-Z][a-zA-Z0-9]*)/g);
    if (componentMatches) {
      const newComponents = componentMatches
        .map(match => match.replace(/^(function|const|class)\s+/, ''))
        .filter(comp => !this.progress.componentsDetected.includes(comp));
      
      this.progress.componentsDetected.push(...newComponents);
    }

    // Detect package imports
    const importMatches = content.match(/import.*from\s+['"`]([^'"`]+)['"`]/g);
    if (importMatches) {
      const newPackages = importMatches
        .map(match => {
          const pkg = match.match(/from\s+['"`]([^'"`]+)['"`]/);
          return pkg ? pkg[1] : null;
        })
        .filter(pkg => pkg && !pkg.startsWith('.') && !pkg.startsWith('/'))
        .filter(pkg => !this.progress.packagesDetected.includes(pkg));
      
      this.progress.packagesDetected.push(...newPackages);
    }
  }

  // v2's warning and error handling
  addWarning(controller: any, warning: string): void {
    this.progress.warnings.push(warning);
    this.sendProgress(controller, 'warning', {
      message: warning,
      totalWarnings: this.progress.warnings.length
    });
  }

  addError(controller: any, error: string): void {
    this.progress.errors.push(error);
    this.sendProgress(controller, 'error', {
      message: error,
      totalErrors: this.progress.errors.length
    });
  }

  // Enhanced surgical editing progress
  startSurgicalEdit(controller: any, fileName: string, editType: string): void {
    this.updateStatus(controller, 'Surgical editing', `${editType} on ${fileName}`);
    
    this.sendProgress(controller, 'surgical-edit', {
      phase: 'start',
      fileName,
      editType
    });
  }

  streamSurgicalThinking(controller: any, chunk: string): void {
    this.sendProgress(controller, 'surgical-thinking', chunk);
  }

  completeSurgicalEdit(controller: any, fileName: string, linesChanged: number): void {
    this.sendProgress(controller, 'surgical-edit', {
      phase: 'complete',
      fileName,
      linesChanged
    });
  }

  // v2's error recovery system
  attemptErrorRecovery(controller: any, error: string, attempt: number): void {
    this.updateStatus(controller, 'Recovering from error', `Attempt ${attempt}`);
    
    this.sendProgress(controller, 'error-recovery', {
      error,
      attempt,
      strategy: 'Regenerating with simplified prompt'
    });
  }

  // Context building progress (for our context-aware features)
  startContextBuilding(controller: any, filesCount: number): void {
    this.progress.totalFiles = filesCount;
    this.updateStatus(controller, 'Building context', `Analyzing ${filesCount} files`);
    
    this.sendProgress(controller, 'context-building', {
      phase: 'start',
      totalFiles: filesCount
    });
  }

  updateContextBuilding(controller: any, fileName: string): void {
    this.sendProgress(controller, 'context-building', {
      phase: 'analyzing',
      fileName,
      progress: this.progress.filesCompleted / this.progress.totalFiles
    });
  }

  completeContextBuilding(controller: any, contextSummary: string): void {
    this.sendProgress(controller, 'context-building', {
      phase: 'complete',
      summary: contextSummary,
      totalFiles: this.progress.totalFiles
    });
  }

  // Final completion with v2's comprehensive summary
  complete(controller: any, summary: any): void {
    this.updateStatus(controller, 'Complete', 'Generation finished successfully');
    
    this.sendProgress(controller, 'complete', {
      summary,
      progress: this.progress,
      totalFiles: this.progress.filesCompleted,
      componentsGenerated: this.progress.componentsDetected,
      packagesDetected: this.progress.packagesDetected,
      warnings: this.progress.warnings,
      errors: this.progress.errors
    });
  }

  // Get current progress snapshot
  getProgress(): GenerationProgress {
    return { ...this.progress };
  }

  // Reset progress for new generation
  reset(): void {
    this.progress = {
      stage: 'initializing',
      filesCompleted: 0,
      totalFiles: 0,
      componentsDetected: [],
      packagesDetected: [],
      warnings: [],
      errors: []
    };
  }
}

// Export singleton
export const v2StreamingManager = new V2StreamingManager();