// Agentic Workflow - Robust Multi-Agent System
// Supervisor orchestrates specialized agents with smart context management

import { NextRequest, NextResponse } from 'next/server';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { streamText } from 'ai';
import { createPlannerContext, createBuilderContext } from '@/lib/smart-context-retrieval';
import { createSupervisorContext } from '@/lib/context-analyzer';
import { generatePlannerPrompt, generateBuilderPrompt, generateValidatorPrompt, generateErrorRecoveryPrompt } from '@/lib/prompt-templates';
import { detectErrors, autoFixCode, createErrorContext, validateCode } from '@/lib/error-detector';

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

    const plannerResult = await runPlannerAgent(prompt, plannerContext);
    
    if (!plannerResult.success) {
      return NextResponse.json({
        error: 'Planner agent failed',
        details: plannerResult.error
      }, { status: 500, headers: corsHeaders });
    }

    // Phase 2: Execution with Error Handling
    const executionResult = await executeWithRetry(
      prompt,
      plannerResult.output,
      context,
      maxRetries
    );

    // Stream the final result
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send planner analysis
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'planner-analysis',
            content: {
              task: plannerContext.constraints,
              plan: plannerResult.output.implementationSteps,
              strategy: plannerResult.output.buildInstructions
            }
          })}\n\n`));

          // Stream the execution result
          if (executionResult.type === 'success' && executionResult.stream) {
            for await (const chunk of executionResult.stream) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'code-generation',
                content: chunk
              })}\n\n`));
            }

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

// Planner Agent - Strategic Planning (Simplified)
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
      model: openrouter('anthropic/claude-3-5-sonnet-20241022'),
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

    // Parse planner output
    try {
      const plannerOutput = JSON.parse(responseText);
      return { success: true, output: plannerOutput };
    } catch (parseError) {
      console.error('[planner] JSON parse error:', parseError);
      // Fallback: extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const plannerOutput = JSON.parse(jsonMatch[0]);
        return { success: true, output: plannerOutput };
      }
      throw new Error('Planner response not valid JSON');
    }

  } catch (error) {
    console.error('[planner] Error:', error);
    return { 
      success: false, 
      error: (error as Error).message 
    };
  }
}

// Execute with retry logic and auto-fixing
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

// Builder Agent - Code Generation (Simplified)
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

    const result = await streamText({
      model: openrouter('anthropic/claude-3-5-sonnet-20241022'),
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