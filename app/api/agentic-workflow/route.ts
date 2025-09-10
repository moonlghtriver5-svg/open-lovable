// Agentic Workflow - Robust Multi-Agent System
// Supervisor orchestrates specialized agents with smart context management

import { NextRequest, NextResponse } from 'next/server';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { streamText } from 'ai';
import { createPlannerContext, createBuilderContext } from '@/lib/smart-context-retrieval';
import { createSupervisorContext } from '@/lib/context-analyzer';
import { generatePlannerPrompt, generateBuilderPrompt, generateValidatorPrompt, generateErrorRecoveryPrompt } from '@/lib/prompt-templates';
import { detectErrors, autoFixCode, createErrorContext, validateCode } from '@/lib/error-detector';
import { codebaseAnalyzer } from '@/lib/codebase-analyzer';
import { fileSummarizer } from '@/lib/file-summarizer';

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const { prompt, context, conversationState, maxRetries = 2 } = await request.json();

    console.log('[agentic-workflow] New request:', { 
      prompt: prompt.substring(0, 100) + '...',
      maxRetries 
    });

    if (!prompt) {
      return NextResponse.json({
        error: 'Prompt is required'
      }, { status: 400, headers: corsHeaders });
    }

    // Phase 1: Planner Agent Analysis - Simple Fallback for Now
    console.log('[agentic-workflow] Starting simple planner approach');
    
    // Create simple planner context
    const plannerContext = {
      relevantFiles: context?.currentFiles || {},
      patterns: [],
      constraints: ['Generate working React code', 'Use modern patterns', 'Include proper TypeScript types'],
      examples: '',
      totalTokens: 500 // Estimated
    };

    // Stream the entire workflow with real-time updates
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Phase 0: Codebase Analysis (Context-Aware)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'context-analysis-start',
            content: 'Analyzing existing codebase for context...'
          })}\n\n`));

          // Analyze existing codebase if files are provided
          let contextualInfo = null;
          let fileSummaries = null;
          
          if (context?.currentFiles && Object.keys(context.currentFiles).length > 0) {
            console.log('[agentic-workflow] Analyzing codebase for context...');
            
            // Phase 1: LLM-based file summarization
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'context-analysis-start',
              content: 'Generating LLM summaries for existing files...'
            })}\n\n`));
            
            fileSummaries = await fileSummarizer.updateContextIndex(context.currentFiles);
            
            // Phase 2: Smart file relevance analysis
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'context-analysis-start',
              content: 'Finding relevant files for your request...'
            })}\n\n`));
            
            await codebaseAnalyzer.analyzeCodebase(context.currentFiles);
            contextualInfo = await codebaseAnalyzer.generateContextualEdit(prompt);
            
            // Phase 3: Enhanced context with LLM summaries
            const relevantSummaries = fileSummarizer.findRelevantFiles(prompt, 3);
            const contextSummary = fileSummarizer.getContextSummary();
            
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'context-analysis-complete',
              content: {
                filesAnalyzed: Object.keys(context.currentFiles).length,
                filesWithSummaries: Object.keys(fileSummaries.files).length,
                relevantFiles: contextualInfo.relevantFiles.map((f: any) => f.filePath),
                targetFile: contextualInfo.targetFile,
                confidence: contextualInfo.confidenceScore,
                contextSummary: contextSummary.substring(0, 200) + '...',
                relevantSummaries: relevantSummaries.map(s => ({ path: s.path, summary: s.summary }))
              }
            })}\n\n`));
          } else {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'context-analysis-complete', 
              content: { message: 'No existing codebase provided - generating new code' }
            })}\n\n`));
          }

          // Phase 1: Stream Planner Analysis (Now Context-Aware)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'planner-start',
            content: 'Starting strategic planning with codebase context...'
          })}\n\n`));

          console.log('[agentic-workflow] About to call context-aware planner agent...');
          console.log('[agentic-workflow] Planner context:', plannerContext);
          
          const plannerResult = await runPlannerAgentStreaming(prompt, plannerContext, controller, encoder, contextualInfo, fileSummaries);
          console.log('[agentic-workflow] Planner agent returned:', plannerResult.success ? 'SUCCESS' : 'FAILED');
          
          if (plannerResult.success) {
            console.log('[agentic-workflow] Planner output keys:', Object.keys(plannerResult.output || {}));
          } else {
            console.log('[agentic-workflow] Planner error:', plannerResult.error);
          }
          
          if (!plannerResult.success) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'error',
              message: 'Planner agent failed: ' + plannerResult.error
            })}\n\n`));
            controller.close();
            return;
          }

          // Send planner completion
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'planner-complete',
            content: {
              task: plannerContext.constraints,
              plan: plannerResult.output.implementationSteps,
              strategy: plannerResult.output.buildInstructions
            }
          })}\n\n`));

          // Phase 2: Stream Execution with Error Handling
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'execution-start',
            content: 'Starting code generation...'
          })}\n\n`));

          const executionResult = await executeWithRetryStreaming(
            prompt,
            plannerResult.output,
            context,
            maxRetries,
            controller,
            encoder
          );

          // Stream the final result
          if (executionResult.type === 'success') {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'execution-complete',
              success: true,
              attempts: executionResult.attempts,
              appliedFixes: executionResult.appliedFixes
            })}\n\n`));
          } else {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'execution-failed',
              error: executionResult.error,
              attempts: executionResult.attempts,
              lastErrors: executionResult.lastErrors
            })}\n\n`));
          }

          controller.close();
        } catch (error) {
          console.error('[agentic-workflow] Streaming error:', error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            message: (error as Error).message
          })}\n\n`));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache'
      }
    });

  } catch (error) {
    console.error('[agentic-workflow] Error:', error);
    return NextResponse.json({
      error: 'Agentic workflow failed',
      details: (error as Error).message
    }, { status: 500, headers: corsHeaders });
  }
}

// Planner Agent - Strategic Planning with Real-time Streaming and Context Awareness
async function runPlannerAgentStreaming(
  userRequest: string, 
  context: any, 
  controller: any, 
  encoder: TextEncoder, 
  contextualInfo: any = null,
  fileSummaries: any = null
) {
  try {
    console.log('[planner] Starting planner agent with contextual info:', !!contextualInfo);
    let plannerPrompt = `You are a strategic planner. Create a JSON plan for: "${userRequest}"`;
    
    // Add context-aware information if available
    if (contextualInfo && contextualInfo.relevantFiles.length > 0) {
      plannerPrompt += `\n\n🔍 EXISTING CODEBASE CONTEXT:
Target File: ${contextualInfo.targetFile || 'Not identified'}
Relevant Files: ${contextualInfo.relevantFiles.map((f: any) => f.filePath).join(', ')}
Confidence: ${Math.round(contextualInfo.confidenceScore * 100)}%

INSTRUCTIONS:
- This is a MODIFICATION/FIX request, not new code generation
- Focus on editing the existing file: ${contextualInfo.targetFile}
- Understand the current implementation before suggesting changes
- Preserve existing functionality while making requested improvements
- Reference specific functions/components that need changes`;

      // Add LLM-generated file summaries for better understanding
      if (fileSummaries && Object.keys(fileSummaries.files).length > 0) {
        plannerPrompt += `\n\n📚 LLM-GENERATED FILE SUMMARIES:`;
        
        const relevantSummaries = fileSummarizer.findRelevantFiles(userRequest, 3);
        for (const summary of relevantSummaries) {
          plannerPrompt += `\n\n📄 ${summary.path}:
  Purpose: ${summary.purpose}
  Summary: ${summary.summary}`;
          
          if (summary.components.length > 0) {
            plannerPrompt += `\n  Components: ${summary.components.join(', ')}`;
          }
          
          if (summary.exports.length > 0) {
            plannerPrompt += `\n  Exports: ${summary.exports.join(', ')}`;
          }
        }
        
        plannerPrompt += `\n\n💡 USE THIS CONTEXT: The LLM summaries above give you deep understanding of what each file does. Use this to make informed decisions about which files to edit and how to preserve existing functionality.`;
      }

      plannerPrompt += `\n\nEXISTING CODE STRUCTURE:`;
      
      // Add relevant code chunks
      for (const file of contextualInfo.relevantFiles.slice(0, 2)) { // Top 2 most relevant
        plannerPrompt += `\n\n📁 ${file.filePath}:`;
        for (const chunk of file.chunks.slice(0, 3)) { // Top 3 chunks per file
          plannerPrompt += `\n  - ${chunk.type}: ${chunk.name} (lines ${chunk.startLine}-${chunk.endLine})`;
        }
      }
    }

    plannerPrompt += `\n\nRespond with JSON only:
{
  "taskAnalysis": "Brief analysis of what needs to be ${contextualInfo ? 'modified' : 'created'}",
  "implementationSteps": ["step 1", "step 2", "step 3"],
  "buildInstructions": "Specific instructions for the builder",
  "targetFile": "${contextualInfo?.targetFile || 'new file'}",
  "editType": "${contextualInfo ? 'modify' : 'create'}",
  "constraints": ["constraint 1", "constraint 2"],
  "codeExamples": "Relevant patterns",
  "riskFactors": ["risk 1", "risk 2"]
}`;

    // Try Claude Opus 4.1, fallback to Sonnet if unavailable
    console.log('[planner] Attempting Claude Opus 4.1 for strategic planning...');
    console.log('[planner] Prompt length:', plannerPrompt.length);
    
    let result;
    let modelUsed = 'anthropic/claude-opus-4.1';
    
    try {
      result = await streamText({
        model: openrouter('anthropic/claude-opus-4.1'),
        messages: [
          { role: 'system', content: 'You are a strategic planner. Always respond with valid JSON.' },
          { role: 'user', content: plannerPrompt }
        ],
        temperature: 0.2
      });
      console.log('[planner] Claude Opus 4.1 succeeded');
    } catch (opusError) {
      console.log('[planner] Claude Opus 4.1 failed, falling back to Sonnet 4:', opusError);
      modelUsed = 'anthropic/claude-sonnet-4';
      result = await streamText({
        model: openrouter('anthropic/claude-sonnet-4'),
        messages: [
          { role: 'system', content: 'You are a strategic planner. Always respond with valid JSON.' },
          { role: 'user', content: plannerPrompt }
        ],
        temperature: 0.2
      });
    }

    console.log('[planner] StreamText started, beginning to process response...');
    let responseText = '';
    let chunkCount = 0;
    
    for await (const textPart of result.textStream) {
      responseText += textPart;
      chunkCount++;
      
      // Stream planner thinking in real-time
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
        type: 'planner-thinking',
        content: textPart
      })}\n\n`));
      
      if (chunkCount % 10 === 0) {
        console.log('[planner] Streamed', chunkCount, 'chunks, current length:', responseText.length);
      }
    }
    
    console.log('[planner] Streaming complete. Model used:', modelUsed, 'Total chunks:', chunkCount, 'Total response length:', responseText.length);

    // Parse planner output with fallback
    try {
      const plannerOutput = JSON.parse(responseText);
      return { success: true, output: plannerOutput };
    } catch (parseError) {
      console.error('[planner] JSON parse error:', parseError);
      console.log('[planner] Raw response:', responseText.substring(0, 200));
      
      // Fallback: create a simple plan structure
      return { 
        success: true, 
        output: {
          taskAnalysis: "Generate requested component",
          implementationSteps: ["Create component", "Add styling", "Export component"],
          buildInstructions: "Create a clean, working React component",
          constraints: ["Use TypeScript", "Use modern React patterns"],
          codeExamples: "",
          riskFactors: ["None identified"]
        }
      };
    }

  } catch (error) {
    console.error('[planner] Error:', error);
    return { 
      success: false, 
      error: (error as Error).message 
    };
  }
}

// Original non-streaming planner (keep for fallback)
async function runPlannerAgent(userRequest: string, context: any) {
  try {
    const plannerPrompt = `You are a strategic planner. Create a JSON plan for: "${userRequest}"

Respond with JSON only:
{
  "taskAnalysis": "Brief analysis",
  "implementationSteps": ["step 1", "step 2", "step 3"],
  "buildInstructions": "Specific instructions",
  "constraints": ["constraint 1", "constraint 2"],
  "codeExamples": "Relevant patterns",
  "riskFactors": ["risk 1", "risk 2"]
}`;

    const result = await streamText({
      model: openrouter('anthropic/claude-3-5-sonnet-20250106'),
      messages: [
        { role: 'system', content: 'You are a strategic planner. Always respond with valid JSON.' },
        { role: 'user', content: plannerPrompt }
      ],
      temperature: 0.2
    });

    let responseText = '';
    for await (const textPart of result.textStream) {
      responseText += textPart;
    }

    // Parse planner output with fallback
    try {
      const plannerOutput = JSON.parse(responseText);
      return { success: true, output: plannerOutput };
    } catch (parseError) {
      console.error('[planner] JSON parse error:', parseError);
      console.log('[planner] Raw response:', responseText.substring(0, 200));
      
      // Fallback: create a simple plan structure
      return { 
        success: true, 
        output: {
          taskAnalysis: "Generate requested component",
          implementationSteps: ["Create component", "Add styling", "Export component"],
          buildInstructions: "Create a clean, working React component",
          constraints: ["Use TypeScript", "Use modern React patterns"],
          codeExamples: "",
          riskFactors: ["None identified"]
        }
      };
    }

  } catch (error) {
    console.error('[planner] Error:', error);
    return { 
      success: false, 
      error: (error as Error).message 
    };
  }
}

// Execute with retry logic and real-time streaming
async function executeWithRetryStreaming(
  userRequest: string,
  plannerOutput: any,
  context: any,
  maxRetries: number,
  controller: any,
  encoder: TextEncoder
) {
  let lastError = null;
  const allAppliedFixes: string[] = [];

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    console.log(`[agentic-workflow] Execution attempt ${attempt}/${maxRetries + 1}`);

    // Stream attempt status
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
      type: 'execution-attempt',
      content: `Attempt ${attempt}/${maxRetries + 1}...`
    })}\n\n`));

    try {
      // Create simple context for builder
      const builderContext = {
        relevantFiles: context?.currentFiles || {},
        patterns: [],
        constraints: ['Generate complete code', 'Use TypeScript'],
        examples: '',
        totalTokens: 300
      };

      console.log('[agentic-workflow] Builder context tokens:', builderContext.totalTokens);

      // Run builder agent with streaming
      const builderResult = await runBuilderAgentStreaming(userRequest, builderContext, plannerOutput, controller, encoder);
      
      if (!builderResult.success) {
        lastError = { error: builderResult.error, attempt };
        continue;
      }

      // Error detection and auto-fixing
      const errors = detectErrors(builderResult.code || '', builderContext);
      console.log(`[agentic-workflow] Detected ${errors.length} errors`);

      if (errors.length > 0) {
        // Stream error detection status
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'error-detection',
          content: `Found ${errors.length} issues, applying auto-fixes...`
        })}\n\n`));

        const autoFixResult = autoFixCode(builderResult.code || '', errors);
        allAppliedFixes.push(...autoFixResult.appliedFixes);

        if (autoFixResult.success && autoFixResult.remainingErrors.length === 0) {
          // Auto-fix successful, validate and return
          const validation = validateCode(autoFixResult.fixedCode!);
          if (validation.isValid) {
            return {
              type: 'success' as const,
              code: autoFixResult.fixedCode!,
              attempts: attempt,
              appliedFixes: allAppliedFixes
            };
          }
        }

        // Create error context for next retry
        lastError = createErrorContext(builderResult.code || '', errors, autoFixResult);
      } else {
        // No errors detected, return successfully
        return {
          type: 'success' as const,
          code: builderResult.code || '',
          attempts: attempt,
          appliedFixes: allAppliedFixes
        };
      }

    } catch (error) {
      console.error(`[agentic-workflow] Attempt ${attempt} failed:`, error);
      lastError = { error: (error as Error).message, attempt };
    }
  }

  // All retries failed
  return {
    type: 'failure' as const,
    error: 'Max retries exceeded',
    attempts: maxRetries + 1,
    lastErrors: lastError
  };
}

// Original non-streaming execute (keep for fallback)
async function executeWithRetry(
  userRequest: string,
  plannerOutput: any,
  context: any,
  maxRetries: number
) {
  let lastError = null;
  let allAppliedFixes: string[] = [];

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    console.log(`[agentic-workflow] Execution attempt ${attempt}/${maxRetries + 1}`);

    try {
      // Create simple context for builder
      const builderContext = {
        relevantFiles: context?.currentFiles || {},
        patterns: [],
        constraints: ['Generate complete code', 'Use TypeScript'],
        examples: '',
        totalTokens: 300
      };

      console.log('[agentic-workflow] Builder context tokens:', builderContext.totalTokens);

      // Run builder agent
      const builderResult = await runBuilderAgent(userRequest, builderContext, plannerOutput);
      
      if (!builderResult.success) {
        lastError = { error: builderResult.error, attempt };
        continue;
      }

      // Error detection and auto-fixing
      const errors = detectErrors(builderResult.code || '', builderContext);
      console.log(`[agentic-workflow] Detected ${errors.length} errors`);

      if (errors.length > 0) {
        const autoFixResult = autoFixCode(builderResult.code || '', errors);
        allAppliedFixes.push(...autoFixResult.appliedFixes);

        if (autoFixResult.success && autoFixResult.remainingErrors.length === 0) {
          // Auto-fix successful, validate and return
          const validation = validateCode(autoFixResult.fixedCode!);
          if (validation.isValid) {
            return {
              type: 'success' as const,
              stream: createCodeStream(autoFixResult.fixedCode!),
              attempts: attempt,
              appliedFixes: allAppliedFixes
            };
          }
        }

        // Create error context for next retry
        lastError = createErrorContext(builderResult.code || '', errors, autoFixResult);
      } else {
        // No errors detected, return successfully
        return {
          type: 'success' as const, 
          stream: createCodeStream(builderResult.code || ''),
          attempts: attempt,
          appliedFixes: allAppliedFixes
        };
      }

    } catch (error) {
      console.error(`[agentic-workflow] Attempt ${attempt} failed:`, error);
      lastError = { error: (error as Error).message, attempt };
    }
  }

  // All retries failed
  return {
    type: 'failure' as const,
    error: 'Max retries exceeded',
    attempts: maxRetries + 1,
    lastErrors: lastError
  };
}

// Builder Agent - Code Generation with Real-time Streaming
async function runBuilderAgentStreaming(userRequest: string, context: any, plannerOutput?: any, controller?: any, encoder?: TextEncoder) {
  try {
    const builderPrompt = `Generate complete, working code for: "${userRequest}"

INSTRUCTIONS:
${plannerOutput?.buildInstructions || 'Create high-quality React code'}

CONSTRAINTS:
- Use modern React patterns with hooks
- Include proper TypeScript types
- Generate complete, working code only
- No placeholders or TODOs

Generate ONLY code files. No explanations.`;

    // Use Claude 4 Sonnet for code generation (like regular chat)
    const result = await streamText({
      model: openrouter('anthropic/claude-sonnet-4'),
      messages: [
        { role: 'system', content: 'You are a code generation specialist. Generate clean, working code only.' },
        { role: 'user', content: builderPrompt }
      ],
      temperature: 0.1
    });

    let generatedCode = '';
    for await (const textPart of result.textStream) {
      generatedCode += textPart;
      
      // Stream code generation in real-time
      if (controller && encoder) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'code-generation',
          content: textPart
        })}\n\n`));
      }
    }

    return { success: true, code: generatedCode };

  } catch (error) {
    console.error('[builder] Error:', error);
    return { 
      success: false, 
      error: (error as Error).message 
    };
  }
}

// Original non-streaming builder (keep for fallback)
async function runBuilderAgent(userRequest: string, context: any, plannerOutput?: any) {
  try {
    const builderPrompt = `Generate complete, working code for: "${userRequest}"

INSTRUCTIONS:
${plannerOutput?.buildInstructions || 'Create high-quality React code'}

CONSTRAINTS:
- Use modern React patterns with hooks
- Include proper TypeScript types
- Generate complete, working code only
- No placeholders or TODOs

Generate ONLY code files. No explanations.`;

    // Use Claude 4 Sonnet for code generation (like regular chat)
    const result = await streamText({
      model: openrouter('anthropic/claude-sonnet-4'),
      messages: [
        { role: 'system', content: 'You are a code generation specialist. Generate clean, working code only.' },
        { role: 'user', content: builderPrompt }
      ],
      temperature: 0.1
    });

    let generatedCode = '';
    for await (const textPart of result.textStream) {
      generatedCode += textPart;
    }

    return { success: true, code: generatedCode };

  } catch (error) {
    console.error('[builder] Error:', error);
    return { 
      success: false, 
      error: (error as Error).message 
    };
  }
}

// Create streaming response for generated code
async function* createCodeStream(code: string) {
  const lines = code.split('\n');
  for (let i = 0; i < lines.length; i += 5) {
    yield lines.slice(i, i + 5).join('\n') + '\n';
    await new Promise(resolve => setTimeout(resolve, 50)); // Small delay for streaming effect
  }
}