'use client';

import React, { useEffect, useState, useRef } from 'react';

interface ErrorInfo {
  message: string;
  stack?: string;
  source?: string;
  lineno?: number;
  colno?: number;
  timestamp: number;
}

interface ErrorDetectorProps {
  iframeRef: React.RefObject<HTMLIFrameElement>;
  onSubmitFix: (errorMessage: string) => void;
}

export default function ErrorDetector({ iframeRef, onSubmitFix }: ErrorDetectorProps) {
  const [errors, setErrors] = useState<ErrorInfo[]>([]);
  const [showFixButton, setShowFixButton] = useState(false);
  const lastErrorRef = useRef<string>('');

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Listen for error messages from the iframe
      if (event.data && typeof event.data === 'object') {
        if (event.data.type === 'error' || event.data.error) {
          const errorInfo: ErrorInfo = {
            message: event.data.message || event.data.error || 'Unknown error',
            stack: event.data.stack,
            source: event.data.source,
            lineno: event.data.lineno,
            colno: event.data.colno,
            timestamp: Date.now()
          };

          // Only add if it's a new error (avoid duplicates)
          if (errorInfo.message !== lastErrorRef.current) {
            setErrors(prev => [...prev.slice(-4), errorInfo]); // Keep last 5 errors
            setShowFixButton(true);
            lastErrorRef.current = errorInfo.message;
          }
        }
      }
    };

    // Listen for console errors from the iframe
    const detectIframeErrors = () => {
      if (iframeRef.current?.contentWindow) {
        try {
          const iframeWindow = iframeRef.current.contentWindow;
          
          // Override console.error to catch errors
          const originalConsoleError = iframeWindow.console?.error;
          if (originalConsoleError) {
            iframeWindow.console.error = function(...args: any[]) {
              const errorMessage = args.map(arg => 
                typeof arg === 'string' ? arg : JSON.stringify(arg)
              ).join(' ');
              
              const errorInfo: ErrorInfo = {
                message: errorMessage,
                timestamp: Date.now()
              };

              if (errorMessage !== lastErrorRef.current && !errorMessage.includes('Warning:')) {
                setErrors(prev => [...prev.slice(-4), errorInfo]);
                setShowFixButton(true);
                lastErrorRef.current = errorMessage;
              }

              // Call original console.error
              originalConsoleError.apply(this, args);
            };
          }

          // Listen for unhandled errors
          iframeWindow.addEventListener('error', (event) => {
            const errorInfo: ErrorInfo = {
              message: event.message || 'Runtime error',
              source: event.filename,
              lineno: event.lineno,
              colno: event.colno,
              timestamp: Date.now()
            };

            if (errorInfo.message !== lastErrorRef.current) {
              setErrors(prev => [...prev.slice(-4), errorInfo]);
              setShowFixButton(true);
              lastErrorRef.current = errorInfo.message;
            }
          });

        } catch (e) {
          // Cross-origin restrictions might prevent access
          console.log('Cannot access iframe content for error detection:', e);
        }
      }
    };

    // Set up iframe error detection when iframe loads
    const setupErrorDetection = () => {
      if (iframeRef.current) {
        iframeRef.current.addEventListener('load', detectIframeErrors);
      }
    };

    // Set up message listener
    window.addEventListener('message', handleMessage);
    
    // Set up iframe monitoring
    setupErrorDetection();

    // Cleanup
    return () => {
      window.removeEventListener('message', handleMessage);
      if (iframeRef.current) {
        iframeRef.current.removeEventListener('load', detectIframeErrors);
      }
    };
  }, [iframeRef]);

  const handleTryToFix = () => {
    const latestError = errors[errors.length - 1];
    if (latestError) {
      const errorDetails = `Error: ${latestError.message}${
        latestError.source ? `\nFile: ${latestError.source}` : ''
      }${
        latestError.lineno ? `\nLine: ${latestError.lineno}` : ''
      }${
        latestError.stack ? `\nStack: ${latestError.stack}` : ''
      }`;
      
      const fixMessage = `Fix this error: ${errorDetails}`;
      onSubmitFix(fixMessage);
      
      // Hide the fix button temporarily
      setShowFixButton(false);
      setErrors([]);
    }
  };

  const handleDismiss = () => {
    setShowFixButton(false);
    setErrors([]);
    lastErrorRef.current = '';
  };

  if (!showFixButton || errors.length === 0) {
    return null;
  }

  const latestError = errors[errors.length - 1];

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-red-800">
              Error Detected
            </h3>
            <div className="mt-1 text-sm text-red-700">
              <p className="truncate" title={latestError.message}>
                {latestError.message.length > 60 
                  ? `${latestError.message.substring(0, 60)}...` 
                  : latestError.message
                }
              </p>
            </div>
            <div className="mt-3 flex space-x-2">
              <button
                onClick={handleTryToFix}
                className="bg-red-600 text-white px-3 py-1.5 rounded text-sm font-medium hover:bg-red-700 transition-colors duration-200"
              >
                🔧 Try to Fix
              </button>
              <button
                onClick={handleDismiss}
                className="bg-gray-200 text-gray-800 px-3 py-1.5 rounded text-sm font-medium hover:bg-gray-300 transition-colors duration-200"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}