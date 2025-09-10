// v2-Inspired Conversation State Management  
// Track context, preferences, and project evolution

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    editType?: string;
    filesModified?: string[];
    confidence?: number;
  };
}

export interface ProjectEvolution {
  components: string[];
  recentEdits: Array<{
    fileName: string;
    editType: string;
    timestamp: Date;
    description: string;
  }>;
  userPreferences: Record<string, any>;
  techStack: string[];
  architecture: string;
}

export interface ConversationState {
  messages: ConversationMessage[];
  projectEvolution: ProjectEvolution;
  currentContext: Record<string, string>;
  sessionStartTime: Date;
  lastActivity: Date;
}

export class ConversationStateManager {
  private state: ConversationState;

  constructor() {
    this.state = this.initializeState();
  }

  // Initialize clean conversation state
  private initializeState(): ConversationState {
    return {
      messages: [],
      projectEvolution: {
        components: [],
        recentEdits: [],
        userPreferences: {},
        techStack: ['React', 'TypeScript', 'Next.js'],
        architecture: 'component-based'
      },
      currentContext: {},
      sessionStartTime: new Date(),
      lastActivity: new Date()
    };
  }

  // Add message with v2's metadata tracking
  addMessage(
    role: 'user' | 'assistant' | 'system',
    content: string,
    metadata?: ConversationMessage['metadata']
  ): void {
    const message: ConversationMessage = {
      role,
      content,
      timestamp: new Date(),
      metadata
    };

    this.state.messages.push(message);
    this.state.lastActivity = new Date();

    // Analyze message for preferences and patterns
    if (role === 'user') {
      this.analyzeUserPreferences(content);
    }

    // Keep last 50 messages to avoid memory bloat
    if (this.state.messages.length > 50) {
      this.state.messages = this.state.messages.slice(-50);
    }
  }

  // Track file modifications with v2's evolution tracking
  recordFileEdit(
    fileName: string,
    editType: 'CREATE' | 'UPDATE' | 'FIX' | 'ENHANCE' | 'REFACTOR',
    description: string,
    componentsAffected: string[] = []
  ): void {
    const edit = {
      fileName,
      editType,
      timestamp: new Date(),
      description
    };

    this.state.projectEvolution.recentEdits.push(edit);

    // Update components list
    componentsAffected.forEach(comp => {
      if (!this.state.projectEvolution.components.includes(comp)) {
        this.state.projectEvolution.components.push(comp);
      }
    });

    // Keep last 20 edits
    if (this.state.projectEvolution.recentEdits.length > 20) {
      this.state.projectEvolution.recentEdits = 
        this.state.projectEvolution.recentEdits.slice(-20);
    }

    this.state.lastActivity = new Date();
  }

  // Update current codebase context
  updateContext(files: Record<string, string>): void {
    this.state.currentContext = { ...files };
    this.state.lastActivity = new Date();
    
    // Update components from context
    this.extractComponentsFromContext(files);
  }

  // v2's user preference analysis
  private analyzeUserPreferences(userMessage: string): void {
    const message = userMessage.toLowerCase();
    
    // Detect styling preferences
    if (message.includes('tailwind') || message.includes('tw-')) {
      this.state.projectEvolution.userPreferences.styling = 'tailwind';
    } else if (message.includes('css modules') || message.includes('.module.css')) {
      this.state.projectEvolution.userPreferences.styling = 'css-modules';
    } else if (message.includes('styled-components') || message.includes('emotion')) {
      this.state.projectEvolution.userPreferences.styling = 'css-in-js';
    }

    // Detect component preferences  
    if (message.includes('functional component') || message.includes('hooks')) {
      this.state.projectEvolution.userPreferences.componentStyle = 'functional';
    } else if (message.includes('class component')) {
      this.state.projectEvolution.userPreferences.componentStyle = 'class';
    }

    // Detect state management preferences
    if (message.includes('zustand') || message.includes('jotai')) {
      this.state.projectEvolution.userPreferences.stateManagement = 'zustand';
    } else if (message.includes('redux') || message.includes('toolkit')) {
      this.state.projectEvolution.userPreferences.stateManagement = 'redux';
    } else if (message.includes('context') || message.includes('usecontext')) {
      this.state.projectEvolution.userPreferences.stateManagement = 'context';
    }

    // Detect testing preferences
    if (message.includes('jest') || message.includes('testing-library')) {
      this.state.projectEvolution.userPreferences.testing = 'jest';
    } else if (message.includes('vitest')) {
      this.state.projectEvolution.userPreferences.testing = 'vitest';
    }
  }

  // Extract components from current context
  private extractComponentsFromContext(files: Record<string, string>): void {
    const components: string[] = [];
    
    Object.entries(files).forEach(([fileName, content]) => {
      if (fileName.endsWith('.tsx') || fileName.endsWith('.jsx')) {
        // Extract component names
        const componentMatches = content.match(/(?:export\s+default\s+|function\s+|const\s+)([A-Z][a-zA-Z0-9]*)/g);
        if (componentMatches) {
          componentMatches.forEach(match => {
            const componentName = match.replace(/^(export\s+default\s+|function\s+|const\s+)/, '');
            if (!components.includes(componentName)) {
              components.push(componentName);
            }
          });
        }
      }
    });

    // Update project evolution with discovered components
    components.forEach(comp => {
      if (!this.state.projectEvolution.components.includes(comp)) {
        this.state.projectEvolution.components.push(comp);
      }
    });
  }

  // Get conversation context for AI (v2 approach)
  getConversationContext(): string {
    const recentMessages = this.state.messages.slice(-10);
    const recentEdits = this.state.projectEvolution.recentEdits.slice(-5);
    const preferences = this.state.projectEvolution.userPreferences;

    let context = '# CONVERSATION CONTEXT\n\n';

    // Recent conversation
    if (recentMessages.length > 0) {
      context += '## Recent Messages:\n';
      recentMessages.forEach((msg, i) => {
        context += `${i + 1}. ${msg.role}: ${msg.content.substring(0, 100)}...\n`;
      });
      context += '\n';
    }

    // Project evolution
    if (this.state.projectEvolution.components.length > 0) {
      context += `## Current Components: ${this.state.projectEvolution.components.join(', ')}\n\n`;
    }

    // Recent edits
    if (recentEdits.length > 0) {
      context += '## Recent Edits:\n';
      recentEdits.forEach(edit => {
        context += `- ${edit.editType}: ${edit.fileName} (${edit.description})\n`;
      });
      context += '\n';
    }

    // User preferences
    if (Object.keys(preferences).length > 0) {
      context += '## User Preferences:\n';
      Object.entries(preferences).forEach(([key, value]) => {
        context += `- ${key}: ${value}\n`;
      });
      context += '\n';
    }

    return context;
  }

  // Get project summary for context
  getProjectSummary(): string {
    const { components, techStack, architecture, recentEdits } = this.state.projectEvolution;
    
    return `Project: ${architecture} React app
Tech Stack: ${techStack.join(', ')}
Components: ${components.length} (${components.slice(0, 5).join(', ')}${components.length > 5 ? '...' : ''})
Recent Activity: ${recentEdits.length} edits in session`;
  }

  // Check if user has established patterns
  hasEstablishedPatterns(): boolean {
    return Object.keys(this.state.projectEvolution.userPreferences).length > 2 ||
           this.state.projectEvolution.recentEdits.length > 3;
  }

  // Get user's preferred patterns for AI guidance
  getPreferredPatterns(): Record<string, any> {
    return { ...this.state.projectEvolution.userPreferences };
  }

  // Reset conversation state
  reset(): void {
    this.state = this.initializeState();
  }

  // Get current state snapshot
  getCurrentState(): ConversationState {
    return { 
      ...this.state,
      messages: [...this.state.messages],
      projectEvolution: { 
        ...this.state.projectEvolution,
        components: [...this.state.projectEvolution.components],
        recentEdits: [...this.state.projectEvolution.recentEdits]
      }
    };
  }

  // Check for duplicate requests (prevent redundant work)
  isDuplicateRequest(userMessage: string): boolean {
    const recent = this.state.messages
      .filter(m => m.role === 'user')
      .slice(-3)
      .map(m => m.content.toLowerCase().trim());

    const currentMessage = userMessage.toLowerCase().trim();
    
    return recent.some(msg => 
      this.calculateSimilarity(msg, currentMessage) > 0.8
    );
  }

  // Simple similarity calculation
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  // Levenshtein distance calculation
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }
}

// Export singleton
export const conversationStateManager = new ConversationStateManager();