import { NextRequest, NextResponse } from 'next/server';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { streamText } from 'ai';
import type { SandboxState } from '@/types/sandbox';
import type { ConversationState } from '@/types/conversation';

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

declare global {
  var sandboxState: SandboxState;
  var conversationState: ConversationState | null;
}

export async function POST(request: NextRequest) {
  try {
    const { prompt, context } = await request.json();
    
    console.log('[plan-ai-code] Planning request received');
    console.log('[plan-ai-code] Prompt:', prompt);
    
    if (!prompt) {
      return NextResponse.json({
        error: 'Prompt is required'
      }, { status: 400 });
    }
    
    // Build context for planning
    let planningContext = '';
    
    // Include existing app context if available
    if (context?.currentFiles && Object.keys(context.currentFiles).length > 0) {
      planningContext += '\n\nEXISTING APPLICATION CONTEXT:\n';
      const fileEntries = Object.entries(context.currentFiles);
      
      // Show file structure
      planningContext += 'Current files:\n';
      fileEntries.forEach(([path]) => {
        planningContext += `- ${path}\n`;
      });
      
      // Include key file contents for planning
      const keyFiles = fileEntries.filter(([path]) => 
        path.includes('App.jsx') || path.includes('main.jsx') || path.includes('package.json')
      ).slice(0, 3); // Limit for planning
      
      if (keyFiles.length > 0) {
        planningContext += '\nKey file contents:\n';
        keyFiles.forEach(([path, content]) => {
          if (typeof content === 'string') {
            planningContext += `\n<file path="${path}">\n${content.substring(0, 1000)}${content.length > 1000 ? '\n...' : ''}\n</file>\n`;
          }
        });
      }
    }
    
    // Include conversation history
    if (global.conversationState && global.conversationState.context.messages.length > 1) {
      const recentMessages = global.conversationState.context.messages.slice(-5);
      planningContext += '\n\nRECENT CONVERSATION:\n';
      recentMessages.forEach(msg => {
        if (msg.role === 'user') {
          planningContext += `User: "${msg.content}"\n`;
        }
      });
    }
    
    const planningPrompt = `You are a concise software architect. Create a BRIEF, actionable implementation plan.

📋 PLAN FORMAT (Keep each section SHORT):

## 🎯 Goal
- 1-2 sentence summary of what to build

## 🛠️ Steps
1. [Brief step]
2. [Brief step] 
3. [Brief step]
(Max 5-6 steps)

## 📦 Dependencies
- List any new packages needed (prefer Radix UI for components)

## 🎨 Key Features
- Bullet list of main functionality

Keep it CONCISE and ACTIONABLE. Maximum 200 words total.

USER REQUEST: "${prompt}"

${planningContext}

PLANNING RESPONSE:`;
    
    console.log('[plan-ai-code] Using Claude Opus 4.1 for planning...');
    
    const result = await streamText({
      model: openrouter('anthropic/claude-opus-4.1'),
      messages: [
        { 
          role: 'system', 
          content: 'You are a world-class software architect creating detailed implementation plans.'
        },
        { 
          role: 'user', 
          content: planningPrompt
        }
      ],
      temperature: 0.3, // Lower temperature for consistent planning
    });
    
    // Stream the planning response
    let planContent = '';
    
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const textPart of result.textStream) {
            const text = textPart || '';
            planContent += text;
            
            // Stream the plan to the client
            const chunk = encoder.encode(`data: ${JSON.stringify({ 
              type: 'plan', 
              content: text 
            })}\n\n`);
            controller.enqueue(chunk);
          }
          
          // Send completion signal
          const completeChunk = encoder.encode(`data: ${JSON.stringify({ 
            type: 'plan-complete', 
            fullPlan: planContent 
          })}\n\n`);
          controller.enqueue(completeChunk);
          
          controller.close();
        } catch (error) {
          console.error('[plan-ai-code] Streaming error:', error);
          controller.error(error);
        }
      }
    });
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
    
  } catch (error) {
    console.error('[plan-ai-code] Error:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message
    }, { status: 500 });
  }
}