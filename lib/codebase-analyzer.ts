// Modern Codebase Context Analysis System
// Implements industry best practices from Cursor, GitHub Copilot, and Windsurf

import { createOpenRouter } from '@openrouter/ai-sdk-provider';
// Note: embed from 'ai' and OpenRouter not used yet - future enhancement
// const openrouter = createOpenRouter({
//   apiKey: process.env.OPENROUTER_API_KEY,
// });

interface CodeChunk {
  id: string;
  filePath: string;
  content: string;
  startLine: number;
  endLine: number;
  type: 'function' | 'class' | 'component' | 'interface' | 'variable' | 'other';
  name?: string;
  embedding?: number[];
}

interface FileAnalysis {
  filePath: string;
  language: string;
  chunks: CodeChunk[];
  dependencies: string[];
  exports: string[];
}

interface CodebaseContext {
  relevantFiles: FileAnalysis[];
  targetFile?: string;
  suggestedEdits: string[];
  confidenceScore: number;
}

export class CodebaseAnalyzer {
  private fileAnalyses: Map<string, FileAnalysis> = new Map();
  private embeddings: Map<string, number[]> = new Map();

  // 1. AST-Based Code Chunking (Tree-sitter approach)
  async analyzeFile(filePath: string, content: string): Promise<FileAnalysis> {
    const language = this.detectLanguage(filePath);
    const chunks = await this.chunkCodeASTBased(content, filePath);
    const dependencies = this.extractDependencies(content);
    const exports = this.extractExports(content);

    const analysis: FileAnalysis = {
      filePath,
      language,
      chunks,
      dependencies,
      exports
    };

    this.fileAnalyses.set(filePath, analysis);
    return analysis;
  }

  // 2. Semantic Search for Relevant Components
  async findRelevantFiles(userQuery: string, maxFiles: number = 5): Promise<FileAnalysis[]> {
    console.log(`[codebase-analyzer] Searching for: "${userQuery}"`);
    
    // Create query embedding
    const queryEmbedding = await this.createEmbedding(userQuery);
    
    // Score all files by semantic similarity
    const scoredFiles: Array<{ analysis: FileAnalysis; score: number }> = [];
    
    for (const [filePath, analysis] of this.fileAnalyses.entries()) {
      // Check if file has relevant keywords
      const keywordScore = this.calculateKeywordScore(userQuery, analysis);
      
      // Check semantic similarity if embeddings exist
      let semanticScore = 0;
      const fileEmbedding = this.embeddings.get(filePath);
      if (fileEmbedding && queryEmbedding) {
        semanticScore = this.calculateCosineSimilarity(queryEmbedding, fileEmbedding);
      }
      
      // Combine scores
      const totalScore = keywordScore * 0.4 + semanticScore * 0.6;
      
      if (totalScore > 0.1) { // Relevance threshold
        scoredFiles.push({ analysis, score: totalScore });
      }
    }
    
    // Return top matches
    return scoredFiles
      .sort((a, b) => b.score - a.score)
      .slice(0, maxFiles)
      .map(item => item.analysis);
  }

  // 3. Context-Aware Edit Suggestions
  async generateContextualEdit(
    userRequest: string,
    targetFilePath?: string
  ): Promise<CodebaseContext> {
    console.log(`[codebase-analyzer] Generating contextual edit for: "${userRequest}"`);
    
    // Find relevant files if no target specified
    const relevantFiles = targetFilePath 
      ? [this.fileAnalyses.get(targetFilePath)!].filter(Boolean)
      : await this.findRelevantFiles(userRequest);
    
    // Identify the most likely target file
    const targetFile = this.identifyTargetFile(userRequest, relevantFiles);
    
    // Generate specific edit suggestions
    const suggestedEdits = await this.generateEditSuggestions(userRequest, relevantFiles);
    
    // Calculate confidence score
    const confidenceScore = this.calculateConfidence(relevantFiles, userRequest);
    
    return {
      relevantFiles,
      targetFile,
      suggestedEdits,
      confidenceScore
    };
  }

  // 4. Smart File Identification
  private identifyTargetFile(userRequest: string, relevantFiles: FileAnalysis[]): string | undefined {
    const request = userRequest.toLowerCase();
    
    // Priority scoring for different patterns
    for (const file of relevantFiles) {
      const fileName = file.filePath.toLowerCase();
      
      // High priority matches
      if (request.includes('progress') && fileName.includes('progress')) {
        return file.filePath;
      }
      if (request.includes('button') && fileName.includes('button')) {
        return file.filePath;
      }
      if (request.includes('modal') && fileName.includes('modal')) {
        return file.filePath;
      }
      
      // Component name matches
      for (const chunk of file.chunks) {
        if (chunk.name && chunk.type === 'component') {
          const componentName = chunk.name.toLowerCase();
          if (request.includes(componentName) || componentName.includes(request.split(' ')[0])) {
            return file.filePath;
          }
        }
      }
    }
    
    // Return first relevant file if no specific match
    return relevantFiles[0]?.filePath;
  }

  // 5. AST-Based Code Chunking Implementation
  private async chunkCodeASTBased(content: string, filePath: string): Promise<CodeChunk[]> {
    const chunks: CodeChunk[] = [];
    const lines = content.split('\n');
    
    // Simple regex-based chunking (would use Tree-sitter in production)
    const patterns = {
      reactComponent: /^(export\s+)?(default\s+)?(?:const|function|class)\s+(\w+)/,
      function: /^(?:export\s+)?(?:async\s+)?function\s+(\w+)/,
      class: /^(?:export\s+)?class\s+(\w+)/,
      interface: /^(?:export\s+)?interface\s+(\w+)/,
      variable: /^(?:export\s+)?(?:const|let|var)\s+(\w+)/
    };
    
    let currentChunk: Partial<CodeChunk> | null = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check for chunk boundaries
      for (const [type, pattern] of Object.entries(patterns)) {
        const match = line.match(pattern);
        if (match) {
          // Save previous chunk
          if (currentChunk && currentChunk.startLine !== undefined) {
            chunks.push({
              id: `${filePath}:${currentChunk.startLine}`,
              filePath,
              content: lines.slice(currentChunk.startLine!, i).join('\n'),
              startLine: currentChunk.startLine,
              endLine: i - 1,
              type: currentChunk.type as any,
              name: currentChunk.name
            });
          }
          
          // Start new chunk
          currentChunk = {
            startLine: i,
            type: this.mapPatternToType(type),
            name: match[match.length - 1] // Last capture group is usually the name
          };
          break;
        }
      }
    }
    
    // Save final chunk
    if (currentChunk && currentChunk.startLine !== undefined) {
      chunks.push({
        id: `${filePath}:${currentChunk.startLine}`,
        filePath,
        content: lines.slice(currentChunk.startLine).join('\n'),
        startLine: currentChunk.startLine,
        endLine: lines.length - 1,
        type: currentChunk.type as any,
        name: currentChunk.name
      });
    }
    
    return chunks;
  }

  // Helper methods
  private detectLanguage(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const langMap: Record<string, string> = {
      'ts': 'typescript',
      'tsx': 'typescript',
      'js': 'javascript', 
      'jsx': 'javascript',
      'py': 'python',
      'java': 'java',
      'css': 'css',
      'html': 'html'
    };
    return langMap[ext || ''] || 'text';
  }
  
  private mapPatternToType(pattern: string): CodeChunk['type'] {
    const typeMap: Record<string, CodeChunk['type']> = {
      'reactComponent': 'component',
      'function': 'function',
      'class': 'class',
      'interface': 'interface',
      'variable': 'variable'
    };
    return typeMap[pattern] || 'other';
  }

  private extractDependencies(content: string): string[] {
    const imports: string[] = [];
    const importRegex = /import.*from\s+['"`]([^'"`]+)['"`]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      imports.push(match[1]);
    }
    return imports;
  }

  private extractExports(content: string): string[] {
    const exports: string[] = [];
    const exportRegex = /export\s+(?:default\s+)?(?:const|function|class|interface)\s+(\w+)/g;
    let match;
    while ((match = exportRegex.exec(content)) !== null) {
      exports.push(match[1]);
    }
    return exports;
  }

  private calculateKeywordScore(query: string, analysis: FileAnalysis): number {
    const queryWords = query.toLowerCase().split(/\s+/);
    const fileContent = analysis.filePath.toLowerCase() + ' ' + 
      analysis.chunks.map(c => c.content.toLowerCase()).join(' ');
    
    let score = 0;
    for (const word of queryWords) {
      if (word.length > 2) {
        const occurrences = (fileContent.match(new RegExp(word, 'g')) || []).length;
        score += Math.min(occurrences * 0.1, 1); // Max 1 point per word
      }
    }
    
    return Math.min(score / queryWords.length, 1);
  }

  private async createEmbedding(_text: string): Promise<number[] | null> {
    try {
      // OpenRouter doesn't have reliable embedding support yet
      // Use keyword-based semantic scoring instead
      // Future: integrate with OpenAI embeddings or Voyage AI directly
      return null;
    } catch (error) {
      console.error('[codebase-analyzer] Embedding error:', error);
      return null;
    }
  }

  private calculateCosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB) || 0;
  }

  private async generateEditSuggestions(
    userRequest: string, 
    relevantFiles: FileAnalysis[]
  ): Promise<string[]> {
    const suggestions: string[] = [];
    
    for (const file of relevantFiles) {
      suggestions.push(`Edit ${file.filePath} - contains relevant ${file.chunks.length} code sections`);
      
      // Add specific chunk suggestions
      for (const chunk of file.chunks) {
        if (chunk.name) {
          suggestions.push(`  └ Update ${chunk.type} '${chunk.name}' (lines ${chunk.startLine}-${chunk.endLine})`);
        }
      }
    }
    
    return suggestions;
  }

  private calculateConfidence(relevantFiles: FileAnalysis[], userRequest: string): number {
    if (relevantFiles.length === 0) return 0;
    
    let confidence = Math.min(relevantFiles.length * 0.2, 1);
    
    // Boost confidence for exact matches
    const request = userRequest.toLowerCase();
    for (const file of relevantFiles) {
      if (file.filePath.toLowerCase().includes(request.split(' ')[0])) {
        confidence += 0.3;
      }
    }
    
    return Math.min(confidence, 1);
  }

  // Public API for integration
  async analyzeCodebase(files: Record<string, string>): Promise<void> {
    console.log(`[codebase-analyzer] Analyzing ${Object.keys(files).length} files...`);
    
    for (const [filePath, content] of Object.entries(files)) {
      await this.analyzeFile(filePath, content);
    }
    
    console.log(`[codebase-analyzer] Analysis complete. Indexed ${this.fileAnalyses.size} files.`);
  }
}

// Export singleton instance
export const codebaseAnalyzer = new CodebaseAnalyzer();