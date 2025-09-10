// Automatic File Context Updates API
// Updates LLM-based file summaries when files change

import { NextRequest, NextResponse } from 'next/server';
import { fileSummarizer } from '@/lib/file-summarizer';

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
    const { files } = await request.json();
    
    if (!files || typeof files !== 'object') {
      return NextResponse.json({
        success: false,
        error: 'Files object is required'
      }, { status: 400, headers: corsHeaders });
    }

    console.log('[update-file-context] Updating context for', Object.keys(files).length, 'files');

    // Update context index with changed files
    const contextIndex = await fileSummarizer.updateContextIndex(files);
    
    // Get summary of updated context
    const contextSummary = fileSummarizer.getContextSummary();
    
    return NextResponse.json({
      success: true,
      summary: `Updated context for ${contextIndex.totalFiles} files`,
      filesAnalyzed: contextIndex.totalFiles,
      lastUpdated: contextIndex.lastUpdated,
      contextPreview: contextSummary.substring(0, 200) + '...'
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('[update-file-context] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update file context',
      details: (error as Error).message
    }, { status: 500, headers: corsHeaders });
  }
}