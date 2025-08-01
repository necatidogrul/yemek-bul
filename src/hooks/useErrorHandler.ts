import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useToast } from '../contexts/ToastContext';

export interface ErrorHandlerOptions {
  showToast?: boolean;
  showAlert?: boolean;
  logError?: boolean;
  customMessage?: string;
  toastDuration?: number;
}

export const useErrorHandler = () => {
  const { showError } = useToast();

  const handleError = useCallback((
    error: Error | string,
    context?: string,
    options: ErrorHandlerOptions = {}
  ) => {
    const {
      showToast = true,
      showAlert = false,
      logError = true,
      customMessage,
      toastDuration,
    } = options;

    const errorMessage = error instanceof Error ? error.message : error;
    const displayMessage = customMessage || errorMessage;
    const contextInfo = context ? `[${context}] ` : '';

    // Log error to console (and external services in production)
    if (logError) {
      console.error(`${contextInfo}Error:`, error);
      
      // TODO: In production, send to crash reporting service
      // Example: Crashlytics.recordError(error);
    }

    // Show toast notification
    if (showToast) {
      showError(
        'Bir Hata Oluştu',
        displayMessage,
        toastDuration ? { duration: toastDuration } : undefined
      );
    }

    // Show alert dialog
    if (showAlert) {
      Alert.alert(
        'Hata',
        displayMessage,
        [{ text: 'Tamam', style: 'default' }]
      );
    }
  }, [showError]);

  // Specific error handlers for common scenarios
  const handleNetworkError = useCallback((error: Error | string) => {
    handleError(error, 'Network', {
      customMessage: 'İnternet bağlantınızı kontrol edin ve tekrar deneyin.',
      showToast: true,
      toastDuration: 5000,
    });
  }, [handleError]);

  const handleApiError = useCallback((error: Error | string, statusCode?: number) => {
    let message = 'Sunucu ile bağlantı kurulamadı.';
    
    if (statusCode) {
      switch (statusCode) {
        case 400:
          message = 'Geçersiz istek. Lütfen tekrar deneyin.';
          break;
        case 401:
          message = 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.';
          break;
        case 403:
          message = 'Bu işlem için yetkiniz bulunmamaktadır.';
          break;
        case 404:
          message = 'İstenen kaynak bulunamadı.';
          break;
        case 429:
          message = 'Çok fazla istek gönderdiniz. Lütfen bekleyin.';
          break;
        case 500:
          message = 'Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.';
          break;
        default:
          message = `Sunucu hatası (${statusCode}). Lütfen tekrar deneyin.`;
      }
    }

    handleError(error, 'API', {
      customMessage: message,
      showToast: true,
      toastDuration: 6000,
    });
  }, [handleError]);

  const handlePaymentError = useCallback((error: Error | string) => {
    handleError(error, 'Payment', {
      customMessage: 'Ödeme işlemi sırasında bir hata oluştu. Lütfen tekrar deneyin.',
      showToast: true,
      showAlert: true,
      toastDuration: 8000,
    });
  }, [handleError]);

  const handleStorageError = useCallback((error: Error | string) => {
    handleError(error, 'Storage', {
      customMessage: 'Veri kaydetme sırasında bir hata oluştu.',
      showToast: true,
    });
  }, [handleError]);

  const handleSpeechError = useCallback((error: Error | string) => {
    handleError(error, 'Speech', {
      customMessage: 'Ses tanıma sırasında bir hata oluştu. Mikrofonunuzu kontrol edin.',
      showToast: true,
    });
  }, [handleError]);

  return {
    handleError,
    handleNetworkError,
    handleApiError,
    handlePaymentError,
    handleStorageError,
    handleSpeechError,
  };
};