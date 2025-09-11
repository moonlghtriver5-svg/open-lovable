'use client';

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeHighlight from 'rehype-highlight';
import { MARKDOWN_CONFIG } from '@/config/markdown.config';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  fallback?: boolean; // Allow manual fallback override
}

// Configuration flag to easily enable/disable markdown rendering
const USE_MARKDOWN_RENDERING = MARKDOWN_CONFIG.enabled;

export default function MarkdownRenderer({ 
  content, 
  className = '', 
  fallback = false 
}: MarkdownRendererProps) {
  const [renderError, setRenderError] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Easy revert: if flag is disabled, fallback is forced, or we're server-side, use plain text
  if (!USE_MARKDOWN_RENDERING || fallback || !isClient) {
    return <span className={className}>{content}</span>;
  }

  // If there was a render error, fallback to plain text
  if (renderError) {
    return <span className={className}>{content}</span>;
  }

  try {
    return (
      <div className={className}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkBreaks]}
          rehypePlugins={[rehypeHighlight]}
          components={{
            // Customize rendering to match chat styling
            p: ({ children }) => <span className="block mb-2 last:mb-0">{children}</span>,
            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
            em: ({ children }) => <em className="italic">{children}</em>,
            code: ({ children, className, ...props }) => {
              const isInline = !className;
              if (isInline) {
                return (
                  <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono" {...props}>
                    {children}
                  </code>
                );
              }
              return (
                <pre className="bg-gray-900 text-white p-3 rounded mt-2 mb-2 overflow-x-auto">
                  <code {...props}>{children}</code>
                </pre>
              );
            },
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-gray-300 pl-4 italic my-2">
                {children}
              </blockquote>
            ),
            ul: ({ children }) => <ul className="list-disc pl-5 my-2">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal pl-5 my-2">{children}</ol>,
            li: ({ children }) => <li className="mb-1">{children}</li>,
            h1: ({ children }) => <h1 className="text-lg font-bold mb-2">{children}</h1>,
            h2: ({ children }) => <h2 className="text-base font-bold mb-2">{children}</h2>,
            h3: ({ children }) => <h3 className="text-sm font-bold mb-1">{children}</h3>,
            a: ({ href, children }) => (
              <a 
                href={href} 
                className="text-blue-600 hover:text-blue-800 underline" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                {children}
              </a>
            ),
          }}
          onError={(error) => {
            console.warn('MarkdownRenderer error:', error);
            setRenderError(true);
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  } catch (error) {
    console.warn('MarkdownRenderer render error:', error);
    setRenderError(true);
    return <span className={className}>{content}</span>;
  }
}

// Export the configuration for easy toggling
export { USE_MARKDOWN_RENDERING };