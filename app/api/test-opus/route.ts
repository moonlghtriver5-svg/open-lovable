// Test Claude Opus 4.1 availability on OpenRouter
import { NextRequest, NextResponse } from 'next/server';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { streamText } from 'ai';

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    console.log('[test-opus] Testing Claude Opus 4.1 availability...');

    const testPrompt = `You are a test assistant. Respond with exactly this JSON:
{
  "status": "working",
  "model": "claude-opus-4.1",
  "message": "Test successful"
}`;

    const result = await streamText({
      model: openrouter('anthropic/claude-opus-4.1'),
      messages: [
        { role: 'system', content: 'You are a test assistant. Always respond with valid JSON only.' },
        { role: 'user', content: testPrompt }
      ],
      temperature: 0.1
    });

    let responseText = '';
    let chunkCount = 0;
    
    console.log('[test-opus] Starting to stream response...');
    for await (const textPart of result.textStream) {
      responseText += textPart;
      chunkCount++;
      
      if (chunkCount <= 5) {
        console.log('[test-opus] Chunk', chunkCount, ':', textPart);
      }
    }
    
    console.log('[test-opus] Stream complete. Total chunks:', chunkCount);
    console.log('[test-opus] Full response:', responseText.substring(0, 200));

    // Try to parse JSON response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(responseText);
      console.log('[test-opus] JSON parse successful:', parsedResponse);
    } catch (parseError) {
      console.log('[test-opus] JSON parse failed:', parseError);
      return NextResponse.json({
        success: false,
        error: 'JSON parse failed',
        rawResponse: responseText.substring(0, 500),
        chunkCount
      });
    }

    return NextResponse.json({
      success: true,
      model: 'anthropic/claude-opus-4.1',
      response: parsedResponse,
      chunkCount,
      responseLength: responseText.length
    });

  } catch (error) {
    console.error('[test-opus] Error:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message,
      stack: (error as Error).stack?.substring(0, 500)
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Use POST to test Claude Opus 4.1' });
}