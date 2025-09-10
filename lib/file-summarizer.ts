// LLM-Based File Summarization and Context Management
// Updates file summaries automatically when files change

import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { streamText } from 'ai';

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

interface FileSummary {
  path: string;
  content: string;
  summary: string;
  purpose: string;
  components: string[];
  dependencies: string[];
  exports: string[];
  lastUpdated: Date;
  contentHash: string;
}

interface ContextIndex {
  files: Record<string, FileSummary>;
  lastUpdated: Date;
  totalFiles: number;
}

export class FileSummarizer {
  private contextIndex: ContextIndex = {
    files: {},
    lastUpdated: new Date(),
    totalFiles: 0
  };

  // Generate LLM summary for a single file
  async summarizeFile(filePath: string, content: string): Promise<FileSummary> {
    console.log(`[file-summarizer] Summarizing: ${filePath}`);
    
    const summaryPrompt = `Analyze this code file and provide a concise summary:

FILE: ${filePath}
\`\`\`
${content.substring(0, 2000)}${content.length > 2000 ? '\n...(truncated)' : ''}
\`\`\`

Respond with JSON only:
{
  "summary": "Brief 1-2 sentence description of what this file does",
  "purpose": "Primary function (component|utility|API|config|style)",
  "components": ["ComponentName1", "ComponentName2"],
  "dependencies": ["package1", "package2"],
  "exports": ["exportedItem1", "exportedItem2"]
}`;

    try {
      const result = await streamText({
        model: openrouter('anthropic/claude-3-5-sonnet-20250106'),
        messages: [
          { role: 'system', content: 'You are a code analysis assistant. Always respond with valid JSON.' },
          { role: 'user', content: summaryPrompt }
        ],
        temperature: 0.1
      });

      let responseText = '';
      for await (const textPart of result.textStream) {
        responseText += textPart;
      }

      // Parse LLM response
      let analysisResult;
      try {
        analysisResult = JSON.parse(responseText);
      } catch (parseError) {
        console.warn(`[file-summarizer] JSON parse failed for ${filePath}, using fallback`);
        analysisResult = {
          summary: `${this.detectFileType(filePath)} file`,
          purpose: this.detectFileType(filePath),
          components: this.extractComponentNames(content),
          dependencies: this.extractDependencies(content),
          exports: this.extractExports(content)
        };
      }

      const contentHash = this.generateContentHash(content);
      
      const summary: FileSummary = {
        path: filePath,
        content,
        summary: analysisResult.summary || `${this.detectFileType(filePath)} file`,
        purpose: analysisResult.purpose || this.detectFileType(filePath),
        components: Array.isArray(analysisResult.components) ? analysisResult.components : [],
        dependencies: Array.isArray(analysisResult.dependencies) ? analysisResult.dependencies : [],
        exports: Array.isArray(analysisResult.exports) ? analysisResult.exports : [],
        lastUpdated: new Date(),
        contentHash
      };

      console.log(`[file-summarizer] Summary for ${filePath}: ${summary.summary}`);
      return summary;
      
    } catch (error) {
      console.error(`[file-summarizer] Error summarizing ${filePath}:`, error);
      
      // Fallback to basic analysis
      return {
        path: filePath,
        content,
        summary: `${this.detectFileType(filePath)} file`,
        purpose: this.detectFileType(filePath),
        components: this.extractComponentNames(content),
        dependencies: this.extractDependencies(content),
        exports: this.extractExports(content),
        lastUpdated: new Date(),
        contentHash: this.generateContentHash(content)
      };
    }
  }

  // Update context index with new/changed files
  async updateContextIndex(currentFiles: Record<string, string>): Promise<ContextIndex> {
    console.log(`[file-summarizer] Updating context index for ${Object.keys(currentFiles).length} files`);
    
    const updatedFiles: Record<string, FileSummary> = {};
    let changedFiles = 0;
    
    for (const [filePath, content] of Object.entries(currentFiles)) {
      if (typeof content !== 'string') continue;
      
      const contentHash = this.generateContentHash(content);
      const existingSummary = this.contextIndex.files[filePath];
      
      // Check if file needs re-summarization
      if (!existingSummary || existingSummary.contentHash !== contentHash) {
        console.log(`[file-summarizer] File changed, re-summarizing: ${filePath}`);
        updatedFiles[filePath] = await this.summarizeFile(filePath, content);
        changedFiles++;
      } else {
        // File unchanged, keep existing summary
        updatedFiles[filePath] = existingSummary;
      }
    }
    
    // Update the context index
    this.contextIndex = {
      files: updatedFiles,
      lastUpdated: new Date(),
      totalFiles: Object.keys(updatedFiles).length
    };
    
    console.log(`[file-summarizer] Context index updated: ${this.contextIndex.totalFiles} total files, ${changedFiles} changed`);
    return this.contextIndex;
  }

  // Get context summary for LLM prompts
  getContextSummary(): string {
    const files = Object.values(this.contextIndex.files);
    if (files.length === 0) {
      return 'No existing files in project';
    }
    
    let summary = `📁 **EXISTING PROJECT CONTEXT** (${files.length} files):\n\n`;
    
    // Group by purpose
    const filesByPurpose: Record<string, FileSummary[]> = {};
    files.forEach(file => {
      const purpose = file.purpose || 'other';
      if (!filesByPurpose[purpose]) filesByPurpose[purpose] = [];
      filesByPurpose[purpose].push(file);
    });
    
    for (const [purpose, purposeFiles] of Object.entries(filesByPurpose)) {
      summary += `**${purpose.toUpperCase()}:**\n`;
      purposeFiles.forEach(file => {
        summary += `  • \`${file.path}\` - ${file.summary}\n`;
        if (file.components.length > 0) {
          summary += `    Components: ${file.components.join(', ')}\n`;
        }
      });
      summary += '\n';
    }
    
    return summary;
  }

  // Find relevant files for a query
  findRelevantFiles(query: string, maxFiles: number = 3): FileSummary[] {
    const files = Object.values(this.contextIndex.files);
    const queryLower = query.toLowerCase();
    
    // Score files by relevance
    const scored = files.map(file => {
      let score = 0;
      
      // File path matching
      if (file.path.toLowerCase().includes(queryLower)) score += 10;
      
      // Summary/purpose matching
      if (file.summary.toLowerCase().includes(queryLower)) score += 8;
      if (file.purpose.toLowerCase().includes(queryLower)) score += 6;
      
      // Component name matching
      for (const component of file.components) {
        if (component.toLowerCase().includes(queryLower) || queryLower.includes(component.toLowerCase())) {
          score += 15; // High score for component matches
        }
      }
      
      // Keyword matching for common terms
      const keywords = queryLower.split(' ');
      for (const keyword of keywords) {
        if (keyword.length > 2) {
          if (file.path.toLowerCase().includes(keyword)) score += 2;
          if (file.summary.toLowerCase().includes(keyword)) score += 3;
        }
      }
      
      return { file, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxFiles);
    
    console.log(`[file-summarizer] Found ${scored.length} relevant files for query: "${query}"`);
    scored.forEach(item => console.log(`  - ${item.file.path} (score: ${item.score})`));
    
    return scored.map(item => item.file);
  }

  // Helper methods
  private detectFileType(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const fileName = filePath.split('/').pop()?.toLowerCase() || '';
    
    if (fileName.includes('component') || ext === 'tsx' || ext === 'jsx') return 'component';
    if (fileName.includes('api') || filePath.includes('/api/')) return 'API';
    if (ext === 'css' || ext === 'scss') return 'style';
    if (fileName === 'package.json') return 'config';
    if (ext === 'ts' || ext === 'js') return 'utility';
    if (ext === 'json') return 'config';
    if (ext === 'md') return 'documentation';
    
    return 'other';
  }

  private extractComponentNames(content: string): string[] {
    const componentRegex = /(?:function|const|class)\s+([A-Z][a-zA-Z0-9]*)/g;
    const matches: string[] = [];
    let match;
    
    while ((match = componentRegex.exec(content)) !== null) {
      matches.push(match[1]);
    }
    
    return [...new Set(matches)]; // Remove duplicates
  }

  private extractDependencies(content: string): string[] {
    const importRegex = /import.*from\s+['"`]([^'"`]+)['"`]/g;
    const dependencies: string[] = [];
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      const dep = match[1];
      if (!dep.startsWith('.') && !dep.startsWith('/')) {
        dependencies.push(dep);
      }
    }
    
    return [...new Set(dependencies)];
  }

  private extractExports(content: string): string[] {
    const exportRegex = /export\s+(?:default\s+)?(?:const|function|class)\s+(\w+)/g;
    const exports: string[] = [];
    let match;
    
    while ((match = exportRegex.exec(content)) !== null) {
      exports.push(match[1]);
    }
    
    return [...new Set(exports)];
  }

  private generateContentHash(content: string): string {
    // Simple hash function for content comparison
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  // Get current context index (for debugging)
  getCurrentIndex(): ContextIndex {
    return this.contextIndex;
  }
}

// Export singleton instance
export const fileSummarizer = new FileSummarizer();