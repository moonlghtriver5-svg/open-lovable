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
    const { prompt, context, conversationState } = await request.json();
    
    console.log('[plan-ai-code] Planning request received');
    console.log('[plan-ai-code] Prompt:', prompt);
    console.log('[plan-ai-code] Received conversation state with', conversationState?.context?.messages?.length || 0, 'messages');
    
    if (!prompt) {
      return NextResponse.json({
        error: 'Prompt is required'
      }, { status: 400 });
    }
    
    // Build context for planning
    let planningContext = '';
    
    // Get current files from context or global conversation state
    const currentFiles = context?.currentFiles || (global as any).conversationState?.context?.currentFiles || {};
    
    console.log('[plan-ai-code] Context debugging:');
    console.log('- context?.currentFiles keys:', context?.currentFiles ? Object.keys(context.currentFiles) : 'none');
    console.log('- global.conversationState exists:', !!(global as any).conversationState);
    console.log('- global.conversationState.context exists:', !!(global as any).conversationState?.context);
    console.log('- global.conversationState.context.currentFiles keys:', (global as any).conversationState?.context?.currentFiles ? Object.keys((global as any).conversationState.context.currentFiles) : 'none');
    console.log('- global.conversationState.context.messages count:', (global as any).conversationState?.context?.messages?.length || 0);
    console.log('- final currentFiles keys:', Object.keys(currentFiles));
    
    // Include existing app context if available
    if (Object.keys(currentFiles).length > 0) {
      planningContext += '\n\nEXISTING APPLICATION CONTEXT:\n';
      const fileEntries = Object.entries(currentFiles);
      
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
    
    // Include conversation history - critical for context awareness
    const activeConversationState = conversationState || (global as any).conversationState;
    if (activeConversationState && activeConversationState.context.messages.length > 1) {
      const recentMessages = activeConversationState.context.messages.slice(-10); // Include more messages
      console.log('[plan-ai-code] Including chat history with', recentMessages.length, 'messages');
      planningContext += '\n\nCHAT HISTORY (Recent conversation):\n';
      recentMessages.forEach((msg: any, index: number) => {
        if (msg.role === 'user') {
          planningContext += `👤 User: "${msg.content}"\n`;
          console.log(`[plan-ai-code] Message ${index}: User - "${msg.content.substring(0, 100)}..."`);
        } else if (msg.role === 'assistant') {
          // Include assistant responses but truncate if too long
          const content = msg.content.length > 200 ? msg.content.substring(0, 200) + '...' : msg.content;
          planningContext += `🤖 Assistant: "${content}"\n`;
          console.log(`[plan-ai-code] Message ${index}: Assistant - "${content}"`);
        }
      });
    } else {
      console.log('[plan-ai-code] No chat history available - passed conversationState:', !!conversationState, 'global.conversationState exists:', !!(global as any).conversationState, 'messages count:', activeConversationState?.context?.messages?.length || 0);
    }
    
    const planningPrompt = `You are a concise software architect. Create a BRIEF, actionable implementation plan.

🧠 CRITICAL: Review the CHAT HISTORY below to understand:
- What the user has been working on and building
- Previous requests and implemented features  
- The evolution of the application
- User preferences and feedback
- Context from recent conversations

${Object.keys(currentFiles).length > 0 ? `
🔍 EXISTING CODE CONTEXT:
You have been provided with the existing application code. ANALYZE it carefully:
- Understand the current component structure, styling, and functionality
- Identify existing patterns, colors, libraries, and architecture
- Make your plan SPECIFIC to this existing codebase
- Reference actual component names, file paths, and existing patterns
- Don't suggest generic solutions - tailor to what already exists

` : ''}📋 PLAN FORMAT (Keep each section SHORT):

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

📊 AVAILABLE MARKET DATA API:
You have access to real-time market data through https://fastprototype.vercel.app/api/market-data (no API keys required):
- Stock data: https://fastprototype.vercel.app/api/market-data?type=stock&symbol=AAPL 
- Multiple stocks: https://fastprototype.vercel.app/api/market-data?type=multiple&symbols=AAPL,GOOGL,MSFT
- Crypto data: https://fastprototype.vercel.app/api/market-data?type=crypto&symbol=bitcoin
- Market summary: https://fastprototype.vercel.app/api/market-data?type=summary
- Returns: {symbol, price, change, changePercent, volume, marketCap, timestamp}

For financial apps like stock screeners, portfolio trackers, or market dashboards:
- USE the full production URL: https://fastprototype.vercel.app/api/market-data
- DON'T use relative URLs like /api/market-data (won't work in sandbox)
- DON'T suggest external APIs (Alpha Vantage, Yahoo Finance, etc.)
- DON'T add axios or other HTTP clients (use built-in fetch)
- USE backticks (\`) for template literals when building URLs with variables

🎯 PLAN PROPER USER INTERFACES:
- Stock screener = Input field + Submit button + Results table
- Portfolio tracker = Add/Remove buttons + Stock list + Price updates  
- Market dashboard = Widget selection + Refresh controls + Data display
- ALWAYS include user input handling (forms, buttons, state management)
- NEVER plan hardcoded variables - plan user interaction flows

USER REQUEST: "${prompt}"

${planningContext}

PLANNING RESPONSE:`;
    
    // Try Claude Opus 4.1, fallback to Sonnet 3.5 if unavailable
    let modelToUse = 'anthropic/claude-opus-4.1';
    let result;
    
    try {
      console.log('[plan-ai-code] Trying Claude Opus 4.1 for planning...');
      result = await streamText({
        model: openrouter(modelToUse),
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
    } catch (error) {
      console.log('[plan-ai-code] Claude Opus 4.1 failed, trying Sonnet 3.5 fallback...', error);
      modelToUse = 'anthropic/claude-3-5-sonnet-20241022';
      result = await streamText({
        model: openrouter(modelToUse),
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
        temperature: 0.3,
      });
    }
    
    // Stream the planning response
    let planContent = '';
    
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          console.log('[plan-ai-code] Starting to stream planning response...');
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
          console.log('[plan-ai-code] Finished streaming, total content length:', planContent.length);
          
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