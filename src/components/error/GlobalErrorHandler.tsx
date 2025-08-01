import React, { useEffect } from 'react';
import { ErrorUtils } from 'react-native';
import { useErrorHandler } from '../../hooks/useErrorHandler';

interface GlobalErrorHandlerProps {
  children: React.ReactNode;
}

export const GlobalErrorHandler: React.FC<GlobalErrorHandlerProps> = ({ children }) => {
  const { handleError } = useErrorHandler();

  useEffect(() => {
    // Set global error handler for JavaScript errors
    const originalHandler = ErrorUtils.getGlobalHandler();

    ErrorUtils.setGlobalHandler((error, isFatal) => {
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

    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event: any) => {
      const error = event.reason || event;
      handleError(error, 'UnhandledPromise', {
        logError: true,
        showToast: true,
        customMessage: 'Beklenmeyen bir hata oluştu.',
      });
    };

    // Note: React Native doesn't have global unhandledrejection event
    // This is more relevant for web platforms, but keeping for completeness
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', handleUnhandledRejection);
    }

    return () => {
      // Restore original handler on cleanup
      ErrorUtils.setGlobalHandler(originalHandler);
      
      if (typeof window !== 'undefined') {
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      }
    };
  }, [handleError]);

  return <>{children}</>;
};