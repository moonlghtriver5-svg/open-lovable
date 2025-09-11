// v2-Enhanced Planning API
// Strategic planning with intent analysis and conversation awareness

import { NextRequest, NextResponse } from 'next/server';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { streamText } from 'ai';
import { intentAnalyzer } from '@/lib/intent-analyzer';
import { v2StreamingManager } from '@/lib/v2-streaming';
import { conversationStateManager } from '@/lib/conversation-state';

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

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
    const { prompt, context, conversationHistory = [] } = await request.json();
    
    console.log('[plan-v2-enhanced] v2-Enhanced planning request:', {
      prompt: prompt.substring(0, 100) + '...',
      contextFiles: Object.keys(context?.currentFiles || {}).length
    });
    
    if (!prompt) {
      return NextResponse.json({
        error: 'Prompt is required'
      }, { status: 400, headers: corsHeaders });
    }

    // Initialize conversation state
    if (conversationHistory.length > 0) {
      conversationHistory.forEach((msg: any) => {
        conversationStateManager.addMessage(msg.role, msg.content, msg.metadata);
      });
    }

    // Stream the enhanced planning process
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          v2StreamingManager.reset();
          
          // Phase 1: Intent Analysis
          v2StreamingManager.updateStatus(controller, 'Intent Analysis', 
            'Analyzing request with conversation context...');

          const codebaseContext = {
            files: context?.currentFiles || {},
            fileStructure: context?.structure || '',
            componentList: Object.keys(context?.currentFiles || {})
              .filter(f => f.endsWith('.tsx') || f.endsWith('.jsx'))
              .map(f => f.split('/').pop()?.replace(/\.(tsx|jsx)$/, '') || ''),
            recentChanges: conversationStateManager.getCurrentState()
              .projectEvolution.recentEdits.map(e => e.description)
          };

          const intentAnalysis = await intentAnalyzer.analyzeIntent(prompt, codebaseContext);
          
          v2StreamingManager.sendProgress(controller, 'intent-analysis', {
            editType: intentAnalysis.editType,
            confidence: intentAnalysis.confidence,
            reasoning: intentAnalysis.reasoning,
            surgicalEdit: intentAnalysis.surgicalEdit,
            targetFiles: intentAnalysis.targetFiles
          });

          // Phase 2: Enhanced Strategic Planning
          v2StreamingManager.updateStatus(controller, 'Strategic Planning', 
            'Creating comprehensive implementation plan...');

          const strategicPlan = await createEnhancedPlan(
            prompt, 
            intentAnalysis, 
            codebaseContext, 
            controller
          );

          // Stream completion
          v2StreamingManager.sendProgress(controller, 'plan-complete', {
            strategy: strategicPlan.approach,
            reasoning: strategicPlan.reasoning,
            phases: strategicPlan.phases,
            riskAssessment: strategicPlan.riskAssessment,
            successCriteria: strategicPlan.successCriteria,
            complexity: strategicPlan.estimatedComplexity,
            intentAnalysis: {
              editType: intentAnalysis.editType,
              confidence: intentAnalysis.confidence,
              surgicalEdit: intentAnalysis.surgicalEdit
            }
          });

          v2StreamingManager.complete(controller, {
            planType: 'v2-enhanced',
            intentAnalysis,
            strategicPlan,
            conversationAware: true
          });

          controller.close();

        } catch (error) {
          console.error('[plan-v2-enhanced] Planning error:', error);
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            content: {
              message: (error as Error).message,
              stage: 'planning'
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
    console.error('[plan-v2-enhanced] Error:', error);
    return NextResponse.json({
      error: 'v2-Enhanced planning failed',
      details: (error as Error).message
    }, { status: 500, headers: corsHeaders });
  }

}

// Create enhanced strategic plan with v2's methodology
async function createEnhancedPlan(
    userPrompt: string,
    intentAnalysis: any,
    codebaseContext: any,
    controller: any
) {
    const conversationContext = conversationStateManager.getConversationContext();
    const userPreferences = conversationStateManager.getPreferredPatterns();
    const projectSummary = conversationStateManager.getProjectSummary();

    // Check for duplicate requests
    const isDuplicate = conversationStateManager.isDuplicateRequest(userPrompt);
    if (isDuplicate) {
      v2StreamingManager.addWarning(controller, 
        'Similar request detected - adapting approach based on previous interactions');
    }

    const enhancedPlanningPrompt = `You are a world-class software architect with deep React expertise. Create a comprehensive implementation plan.

USER REQUEST: "${userPrompt}"

INTENT ANALYSIS:
- Edit Type: ${intentAnalysis.editType}
- Confidence: ${Math.round(intentAnalysis.confidence * 100)}%
- Surgical Edit: ${intentAnalysis.surgicalEdit}
- Target Files: ${intentAnalysis.targetFiles.join(', ')}
- Reasoning: ${intentAnalysis.reasoning}

PROJECT CONTEXT:
${projectSummary}

CONVERSATION HISTORY:
${conversationContext}

USER PREFERENCES:
${JSON.stringify(userPreferences, null, 2)}

EXISTING CODEBASE:
Files: ${Object.keys(codebaseContext.files).length}
Components: ${codebaseContext.componentList.join(', ')}  
Recent Changes: ${codebaseContext.recentChanges.join(', ')}

🚨 CRITICAL FILE AWARENESS:
- DO NOT suggest creating files that already exist
- ONLY modify existing files when necessary
- Prefer surgical edits over new file creation
- Check existing components before suggesting new ones

📊 AVAILABLE DATA APIS:

🏪 MARKET DATA API (stocks/crypto):
Real-time market data through https://fastprototype.vercel.app/api/market-data (no API keys required):
- Stock data: ?type=stock&symbol=AAPL 
- Multiple stocks: ?type=multiple&symbols=AAPL,GOOGL,MSFT
- Crypto data: ?type=crypto&symbol=bitcoin
- Market summary: ?type=summary
- Returns: {symbol, price, change, changePercent, volume, marketCap, timestamp}

🏦 FRED ECONOMIC DATA API (Federal Reserve):
Federal Reserve Economic Data through FRED API (key included):
- GDP: https://api.stlouisfed.org/fred/series/observations?series_id=GDPC1&api_key=dc3251a5a8b7b1d788cf2ee5e3f42bf6&file_type=json
- Unemployment: https://api.stlouisfed.org/fred/series/observations?series_id=UNRATE&api_key=dc3251a5a8b7b1d788cf2ee5e3f42bf6&file_type=json
- Inflation (CPI): https://api.stlouisfed.org/fred/series/observations?series_id=CPIAUCSL&api_key=dc3251a5a8b7b1d788cf2ee5e3f42bf6&file_type=json
- Fed Funds Rate: https://api.stlouisfed.org/fred/series/observations?series_id=FEDFUNDS&api_key=dc3251a5a8b7b1d788cf2ee5e3f42bf6&file_type=json
- Housing Starts: https://api.stlouisfed.org/fred/series/observations?series_id=HOUST&api_key=dc3251a5a8b7b1d788cf2ee5e3f42bf6&file_type=json
- Returns: {"observations": [{"date": "2024-01-01", "value": "27000.5"}]}

API RULES:
- For stock/crypto apps: USE market data API
- For economic/GDP apps: USE FRED API with working key
- DON'T suggest external APIs (Alpha Vantage, World Bank, etc.)
- USE full URLs, never relative paths
- USE built-in fetch, not axios

CREATE A COMPREHENSIVE PLAN:

## 🎯 STRATEGIC APPROACH
Explain WHY this approach is optimal given the context and user preferences.

## 📋 IMPLEMENTATION PHASES  
Break down into logical, sequential phases with clear deliverables.

## 🔧 TECHNICAL REQUIREMENTS
- Dependencies needed
- Component architecture  
- State management approach
- Styling strategy (based on user preferences)

## ⚠️ RISK ASSESSMENT
Identify potential challenges and mitigation strategies.

## ✅ SUCCESS CRITERIA
Define what "done" looks like and how to validate success.

## 🔄 TESTING STRATEGY
How to verify the implementation works correctly.

Focus on precision, maintainability, and alignment with existing patterns. Use established preferences wherever possible.`;

    try {
      const result = await streamText({
        model: openrouter('anthropic/claude-opus-4.1'),
        messages: [
          { 
            role: 'system', 
            content: 'You are a world-class software architect. Provide detailed, actionable implementation plans that follow user preferences and existing patterns.'
          },
          { role: 'user', content: enhancedPlanningPrompt }
        ],
        temperature: 0.3
      });

      let planContent = '';
      for await (const chunk of result.textStream) {
        planContent += chunk;
        v2StreamingManager.streamPlanThinking(controller, chunk);
      }

      // Record the planning session
      conversationStateManager.addMessage('assistant', 
        `Created comprehensive ${intentAnalysis.editType} plan`,
        { editType: intentAnalysis.editType, confidence: intentAnalysis.confidence }
      );

      return {
        approach: intentAnalysis.surgicalEdit ? 'surgical_edit' : 'new_creation',
        reasoning: planContent,
        phases: extractPhases(planContent),
        riskAssessment: extractRisks(planContent),
        successCriteria: extractSuccessCriteria(planContent),
        estimatedComplexity: estimateComplexity(intentAnalysis, codebaseContext)
      };

    } catch (error) {
      console.error('[plan-v2-enhanced] Plan creation failed:', error);
      throw error;
    }
  }

// Helper methods to extract structured data from plan
function extractPhases(planContent: string): string[] {
    const phaseSection = planContent.match(/## 📋 IMPLEMENTATION PHASES([\s\S]*?)(?=##|$)/i);
    if (!phaseSection) return ['Planning', 'Implementation', 'Testing'];

    const phases = phaseSection[1]
      .split('\n')
      .filter(line => line.trim().startsWith('-') || line.trim().match(/^\d+\./))
      .map(line => line.replace(/^[-\d.]\s*/, '').trim())
      .filter(phase => phase.length > 0);

    return phases.length > 0 ? phases : ['Planning', 'Implementation', 'Testing'];
  }

function extractRisks(planContent: string): string[] {
    const riskSection = planContent.match(/## ⚠️ RISK ASSESSMENT([\s\S]*?)(?=##|$)/i);
    if (!riskSection) return ['Standard implementation risks'];

    const risks = riskSection[1]
      .split('\n')
      .filter(line => line.trim().startsWith('-') || line.trim().match(/^\d+\./))
      .map(line => line.replace(/^[-\d.]\s*/, '').trim())
      .filter(risk => risk.length > 0);

    return risks.length > 0 ? risks : ['Standard implementation risks'];
  }

function extractSuccessCriteria(planContent: string): string[] {
    const criteriaSection = planContent.match(/## ✅ SUCCESS CRITERIA([\s\S]*?)(?=##|$)/i);
    if (!criteriaSection) return ['Functionality works as requested'];

    const criteria = criteriaSection[1]
      .split('\n')
      .filter(line => line.trim().startsWith('-') || line.trim().match(/^\d+\./))
      .map(line => line.replace(/^[-\d.]\s*/, '').trim())
      .filter(criterion => criterion.length > 0);

    return criteria.length > 0 ? criteria : ['Functionality works as requested'];
  }

function estimateComplexity(intentAnalysis: any, codebaseContext: any): 'low' | 'medium' | 'high' {
    let complexityScore = 0;

    // Factor in edit type
    switch (intentAnalysis.editType) {
      case 'FIX': complexityScore += 1; break;
      case 'UPDATE': complexityScore += 2; break;
      case 'ENHANCE': complexityScore += 3; break;
      case 'CREATE': complexityScore += 4; break;
      case 'REFACTOR': complexityScore += 5; break;
    }

    // Factor in target files
    complexityScore += Math.min(intentAnalysis.targetFiles.length, 3);

    // Factor in codebase size
    complexityScore += Math.min(Object.keys(codebaseContext.files).length / 10, 2);

    if (complexityScore <= 3) return 'low';
    if (complexityScore <= 6) return 'medium';
    return 'high';
  }

// Health check
export async function GET() {
  return NextResponse.json({
    status: 'v2-Enhanced Planning API Ready',
    features: [
      'Intent analysis integration',
      'Conversation awareness', 
      'User preference tracking',
      'Strategic risk assessment',
      'Enhanced streaming'
    ],
    version: '2.0.0'
  }, { headers: corsHeaders });
}