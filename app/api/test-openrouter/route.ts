import { NextRequest, NextResponse } from 'next/server';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { streamText } from 'ai';

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    console.log('[test-openrouter] Starting OpenRouter test...');
    
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({ error: 'OPENROUTER_API_KEY not found' }, { status: 500 });
    }
    
    console.log('[test-openrouter] API key exists, making request...');
    
    const result = await streamText({
      model: openrouter('anthropic/claude-3-5-sonnet-20241022'),
      messages: [
        { role: 'user', content: 'Say "Hello World" - this is a test.' }
      ],
      temperature: 0
    });

    console.log('[test-openrouter] Request sent, processing response...');
    
    let response = '';
    for await (const textPart of result.textStream) {
      response += textPart;
    }
    
    console.log('[test-openrouter] Response received:', response);
    
    return NextResponse.json({ 
      success: true, 
      response,
      message: 'OpenRouter API is working' 
    });
    
  } catch (error) {
    console.error('[test-openrouter] Error:', error);
    return NextResponse.json({ 
      success: false, 
      error: (error as Error).message 
    }, { status: 500 });
  }
}