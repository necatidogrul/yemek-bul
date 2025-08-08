import React, { useEffect } from 'react';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { Logger } from '../../services/LoggerService';

interface GlobalErrorHandlerProps {
  children: React.ReactNode;
}

export const GlobalErrorHandler: React.FC<GlobalErrorHandlerProps> = ({ children }) => {
  const { handleError } = useErrorHandler();

  useEffect(() => {
    let originalHandler: ((error: any, isFatal?: boolean) => void) | null = null;

    try {
      // Check if ErrorUtils is available (it might not be in some environments)
      const { ErrorUtils } = require('react-native');
      
      if (ErrorUtils && typeof ErrorUtils.getGlobalHandler === 'function') {
        // Set global error handler for JavaScript errors
        originalHandler = ErrorUtils.getGlobalHandler();

        ErrorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
          handleError(error, 'GlobalJS', {
            logError: true,
            showToast: !isFatal, // Don't show toast for fatal errors
            showAlert: isFatal,  // Show alert for fatal errors
          });

          // Call original handler to maintain default behavior
          if (originalHandler) {
            originalHandler(error, isFatal);
          }
        });
      } else {
        console.warn('ErrorUtils is not available in this environment');
      }
    } catch (error) {
      console.warn('Failed to set up global error handler:', error);
    }

    // Handle unhandled promise rejections (only for web platforms)
    const handleUnhandledRejection = (event: any) => {
      const error = event.reason || event;
      handleError(error, 'UnhandledPromise', {
        logError: true,
        showToast: true,
        customMessage: 'Beklenmeyen bir hata oluştu.',
      });
    };

    // Only add unhandledrejection listener on web platforms
    // React Native doesn't have window object or unhandledrejection event
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('unhandledrejection', handleUnhandledRejection);
    }

    return () => {
      try {
        // Restore original handler on cleanup
        const { ErrorUtils } = require('react-native');
        if (ErrorUtils && typeof ErrorUtils.setGlobalHandler === 'function' && originalHandler) {
          ErrorUtils.setGlobalHandler(originalHandler);
        }
      } catch (error) {
        console.warn('Failed to restore original error handler:', error);
      }
      
      if (typeof window !== 'undefined' && window.removeEventListener) {
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      }
    };
  }, [handleError]);

  return <>{children}</>;
};