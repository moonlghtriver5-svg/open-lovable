// Application Configuration
// This file contains all configurable settings for the application

export const appConfig = {
  // E2B Sandbox Configuration
  e2b: {
    // Sandbox timeout in minutes
    timeoutMinutes: 60,
    
    // Convert to milliseconds for E2B API
    get timeoutMs() {
      return this.timeoutMinutes * 60 * 1000;
    },
    
    // Vite development server port
    vitePort: 5173,
    
    // Time to wait for Vite to be ready (in milliseconds)
    viteStartupDelay: 7000,
    
    // Time to wait for CSS rebuild (in milliseconds)
    cssRebuildDelay: 2000,
    
    // Default sandbox template (if using templates)
    defaultTemplate: undefined, // or specify a template ID
  },
  
  // AI Model Configuration
  ai: {
    // Default AI model
    defaultModel: 'moonshotai/kimi-k2-instruct-0905',
    
    // Available models
    availableModels: [
      'moonshotai/kimi-k2-instruct-0905',
      'openrouter/openai/gpt-5-chat',
      'openrouter/openai/gpt-5',
      'openrouter/anthropic/claude-sonnet-4',
      'openrouter/anthropic/claude-opus-4.1',
      'openrouter/z-ai/glm-4.5'
    ],
    
    // Model display names
    modelDisplayNames: {
      'moonshotai/kimi-k2-instruct-0905': 'Kimi K2 Instruct 0905',
      'openrouter/openai/gpt-5-chat': 'GPT-5 Chat (OpenRouter)',
      'openrouter/openai/gpt-5': 'GPT-5 (OpenRouter)',
      'openrouter/anthropic/claude-sonnet-4': 'Claude 4 Sonnet (OpenRouter)',
      'openrouter/anthropic/claude-opus-4.1': 'Claude 4.1 Opus (OpenRouter)',
      'openrouter/z-ai/glm-4.5': 'GLM-4.5 (OpenRouter)'
    },
    
    // Temperature settings for non-reasoning models
    defaultTemperature: 0.7,
    
    // Max tokens for code generation (increased for large models)
    maxTokens: 40000,
    
    // Max tokens for truncation recovery
    truncationRecoveryMaxTokens: 4000,
  },
  
  // Code Application Configuration
  codeApplication: {
    // Delay after applying code before refreshing iframe (milliseconds)
    defaultRefreshDelay: 2000,
    
    // Delay when packages are installed (milliseconds)
    packageInstallRefreshDelay: 5000,
    
    // Enable/disable automatic truncation recovery
    enableTruncationRecovery: false, // Disabled - too many false positives
    
    // Maximum number of truncation recovery attempts per file
    maxTruncationRecoveryAttempts: 1,
  },
  
  // UI Configuration
  ui: {
    // Show/hide certain UI elements
    showModelSelector: true,
    showStatusIndicator: true,
    
    // Animation durations (milliseconds)
    animationDuration: 200,
    
    // Toast notification duration (milliseconds)
    toastDuration: 3000,
    
    // Maximum chat messages to keep in memory (increased for large context models)
    maxChatMessages: 200,
    
    // Maximum recent messages to send as context (increased for GPT-5-chat)
    maxRecentMessagesContext: 40,
  },
  
  // Development Configuration
  dev: {
    // Enable debug logging
    enableDebugLogging: true,
    
    // Enable performance monitoring
    enablePerformanceMonitoring: false,
    
    // Log API responses
    logApiResponses: true,
  },
  
  // Package Installation Configuration
  packages: {
    // Use --legacy-peer-deps flag for npm install
    useLegacyPeerDeps: true,
    
    // Package installation timeout (milliseconds)
    installTimeout: 60000,
    
    // Auto-restart Vite after package installation
    autoRestartVite: true,
  },
  
  // File Management Configuration
  files: {
    // Excluded file patterns (files to ignore)
    excludePatterns: [
      'node_modules/**',
      '.git/**',
      '.next/**',
      'dist/**',
      'build/**',
      '*.log',
      '.DS_Store'
    ],
    
    // Maximum file size to read (bytes)
    maxFileSize: 1024 * 1024, // 1MB
    
    // File extensions to treat as text
    textFileExtensions: [
      '.js', '.jsx', '.ts', '.tsx',
      '.css', '.scss', '.sass',
      '.html', '.xml', '.svg',
      '.json', '.yml', '.yaml',
      '.md', '.txt', '.env',
      '.gitignore', '.dockerignore'
    ],
  },
  
  // API Endpoints Configuration (for external services)
  api: {
    // Retry configuration
    maxRetries: 3,
    retryDelay: 1000, // milliseconds
    
    // Request timeout (milliseconds)
    requestTimeout: 30000,
  }
};

// Type-safe config getter
export function getConfig<K extends keyof typeof appConfig>(key: K): typeof appConfig[K] {
  return appConfig[key];
}

// Helper to get nested config values
export function getConfigValue(path: string): any {
  return path.split('.').reduce((obj, key) => obj?.[key], appConfig as any);
}

export default appConfig;