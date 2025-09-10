// Debug endpoint to test agentic workflow planner directly
import { NextRequest, NextResponse } from 'next/server';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { streamText } from 'ai';

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { prompt = "create a simple button component" } = await request.json();
    
    console.log('🔍 [debug-agentic] Testing agentic workflow planner...');
    console.log('🔍 [debug-agentic] Prompt:', prompt);

    const plannerPrompt = `You are a strategic planner. Create a JSON plan for: "${prompt}"

Respond with JSON only:
{
  "taskAnalysis": "Brief analysis of what needs to be created",
  "implementationSteps": ["step 1", "step 2", "step 3"],
  "buildInstructions": "Specific instructions for the builder",
  "constraints": ["constraint 1", "constraint 2"],
  "codeExamples": "Relevant patterns",
  "riskFactors": ["risk 1", "risk 2"]
}`;

    console.log('🔍 [debug-agentic] Calling Claude Opus 4.1...');
    console.log('🔍 [debug-agentic] Prompt length:', plannerPrompt.length);

    const result = await streamText({
      model: openrouter('anthropic/claude-opus-4.1'),
      messages: [
        { role: 'system', content: 'You are a strategic planner. Always respond with valid JSON.' },
        { role: 'user', content: plannerPrompt }
      ],
      temperature: 0.2
    });

    let responseText = '';
    let chunkCount = 0;
    const chunks = [];

    console.log('🔍 [debug-agentic] Starting to stream response...');
    
    for await (const textPart of result.textStream) {
      responseText += textPart;
      chunkCount++;
      chunks.push(textPart);
      
      if (chunkCount <= 10) {
        console.log(`🔍 [debug-agentic] Chunk ${chunkCount}:`, textPart);
      }
    }

    console.log('🔍 [debug-agentic] Stream complete:', {
      totalChunks: chunkCount,
      responseLength: responseText.length,
      firstChars: responseText.substring(0, 100),
      lastChars: responseText.substring(responseText.length - 100)
    });

    // Test JSON parsing
    let parsedJSON = null;
    let parseResult = 'failed';
    
    try {
      parsedJSON = JSON.parse(responseText);
      parseResult = 'direct_success';
    } catch (directError) {
      console.log('🔍 [debug-agentic] Direct parse failed, trying markdown extraction...');
      
      const jsonMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        try {
          parsedJSON = JSON.parse(jsonMatch[1]);
          parseResult = 'markdown_success';
        } catch (markdownError) {
          console.log('🔍 [debug-agentic] Markdown parse also failed');
        }
      }
    }

    return NextResponse.json({
      success: true,
      debug: {
        promptLength: plannerPrompt.length,
        totalChunks: chunkCount,
        responseLength: responseText.length,
        parseResult,
        firstChunks: chunks.slice(0, 5),
        lastChunks: chunks.slice(-5),
        rawResponse: responseText,
        parsedJSON
      }
    });

  } catch (error) {
    console.error('🔍 [debug-agentic] Error:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message,
      stack: (error as Error).stack
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Use POST to debug agentic workflow planner',
    example: { prompt: 'create a button component' }
  });
}