// v2-Enhanced Code Generation API
// Multi-phase reasoning with surgical precision and better instruction following

import { NextRequest, NextResponse } from 'next/server';
import { multiPhaseReasoner } from '@/lib/multi-phase-reasoner';
import { v2StreamingManager } from '@/lib/v2-streaming';
import { conversationStateManager } from '@/lib/conversation-state';

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
    const { 
      prompt, 
      context, 
      useMultiPhaseReasoning = true,
      conversationHistory = []
    } = await request.json();

    console.log('[generate-v2-enhanced] New request:', {
      prompt: prompt.substring(0, 100) + '...',
      contextFiles: Object.keys(context?.currentFiles || {}).length,
      multiPhaseReasoning: useMultiPhaseReasoning
    });

    if (!prompt) {
      return NextResponse.json({
        error: 'Prompt is required'
      }, { status: 400, headers: corsHeaders });
    }

    // Initialize v2 streaming
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          v2StreamingManager.reset();
          
          // Add conversation history to state manager
          if (conversationHistory.length > 0) {
            conversationHistory.forEach((msg: any) => {
              conversationStateManager.addMessage(msg.role, msg.content, msg.metadata);
            });
          }

          // Build codebase context
          const codebaseContext = {
            files: context?.currentFiles || {},
            fileStructure: context?.structure || '',
            componentList: Object.keys(context?.currentFiles || {})
              .filter(f => f.endsWith('.tsx') || f.endsWith('.jsx'))
              .map(f => f.split('/').pop()?.replace(/\.(tsx|jsx)$/, '') || ''),
            recentChanges: conversationStateManager.getCurrentState()
              .projectEvolution.recentEdits.map(e => e.description)
          };

          v2StreamingManager.updateStatus(controller, 'Initializing', 
            `v2-Enhanced generation with ${Object.keys(codebaseContext.files).length} context files`);

          if (useMultiPhaseReasoning) {
            // 🚀 v2 Multi-Phase Reasoning Approach
            console.log('[generate-v2-enhanced] Using multi-phase reasoning...');
            
            const reasoningResult = await multiPhaseReasoner.executeMultiPhaseReasoning(
              prompt,
              codebaseContext,
              controller,
              encoder
            );

            if (reasoningResult.success) {
              // Stream the final results
              for (const edit of reasoningResult.surgicalEdits) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                  type: 'file-generation',
                  content: {
                    fileName: edit.filePath,
                    content: edit.modifiedContent,
                    changeDescription: edit.changeDescription,
                    linesChanged: edit.linesChanged.length
                  }
                })}\n\n`));
              }

              // Send completion summary
              v2StreamingManager.complete(controller, {
                approach: reasoningResult.strategicPlan.approach,
                filesModified: reasoningResult.surgicalEdits.length,
                totalDuration: reasoningResult.totalDuration,
                confidence: reasoningResult.intentAnalysis.confidence,
                phases: reasoningResult.phases.map(p => ({
                  name: p.name,
                  status: p.status,
                  duration: p.duration
                }))
              });

            } else {
              throw new Error('Multi-phase reasoning failed');
            }

          } else {
            // Fallback to simplified generation
            console.log('[generate-v2-enhanced] Using simplified generation...');
            await this.simpleGeneration(prompt, codebaseContext, controller, encoder);
          }

          controller.close();

        } catch (error) {
          console.error('[generate-v2-enhanced] Streaming error:', error);
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            content: {
              message: (error as Error).message,
              stage: v2StreamingManager.getProgress().stage
            }
          })}\n\n`));
          
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });

  } catch (error) {
    console.error('[generate-v2-enhanced] Error:', error);
    return NextResponse.json({
      error: 'v2-Enhanced generation failed',
      details: (error as Error).message
    }, { status: 500, headers: corsHeaders });
  }

  // Simplified generation for fallback
  private async simpleGeneration(
    prompt: string,
    codebaseContext: any,
    controller: any,
    encoder: TextEncoder
  ) {
    v2StreamingManager.updateStatus(controller, 'Simple Generation', 
      'Generating with basic approach...');

    // Basic code generation logic here
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({
      type: 'file-generation',
      content: {
        fileName: 'SimpleComponent.tsx',
        content: `// Generated component for: ${prompt}\nexport default function SimpleComponent() {\n  return <div>Hello World</div>;\n}`,
        changeDescription: 'Basic component generation'
      }
    })}\n\n`));

    v2StreamingManager.complete(controller, {
      approach: 'simple_generation',
      filesModified: 1
    });
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: 'v2-Enhanced API Ready',
    features: [
      'Multi-phase reasoning',
      'Intent analysis',
      'Surgical editing', 
      'Context retention',
      'Conversation state management',
      'Enhanced streaming'
    ],
    version: '2.0.0'
  }, { headers: corsHeaders });
}