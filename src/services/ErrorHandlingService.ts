import { Logger } from './LoggerService';

export type ErrorType =
  | 'network'
  | 'api'
  | 'validation'
  | 'auth'
  | 'storage'
  | 'permission'
  | 'unknown';

export interface AppError {
  type: ErrorType;
  code?: string;
  message: string;
  originalError?: Error;
  userMessage?: string;
  suggestions?: string[];
  retryable?: boolean;
  timestamp: number;
}

export class ErrorHandlingService {
  private static errorMessages: Record<
    ErrorType,
    {
      title: string;
      defaultMessage: string;
      suggestions: string[];
    }
  > = {
    network: {
      title: 'Bağlantı Sorunu',
      defaultMessage: 'İnternet bağlantınızı kontrol edin.',
      suggestions: [
        'İnternet bağlantınızı kontrol edin',
        'WiFi veya mobil veriye yeniden bağlanın',
        'Birkaç saniye sonra tekrar deneyin',
      ],
    },
    api: {
      title: 'Sunucu Hatası',
      defaultMessage: 'Sunucu geçici olarak kullanılamıyor.',
      suggestions: [
        'Birkaç dakika sonra tekrar deneyin',
        'Uygulama güncellemesi var mı kontrol edin',
        'Sorun devam ederse destek ekibine ulaşın',
      ],
    },
    validation: {
      title: 'Geçersiz Veri',
      defaultMessage: 'Girdiğiniz bilgileri kontrol edin.',
      suggestions: [
        'Tüm alanları doğru şekilde doldurun',
        'Özel karakterler kullanmaktan kaçının',
        'Minimum/maksimum karakter sınırlarına dikkat edin',
      ],
    },
    auth: {
      title: 'Yetkilendirme Sorunu',
      defaultMessage: 'Oturum süreniz dolmuş olabilir.',
      suggestions: [
        'Çıkış yapıp tekrar giriş yapmayı deneyin',
        'Uygulama ayarlarından hesabınızı kontrol edin',
        'Premium özellikler için aboneliğinizi kontrol edin',
      ],
    },
    storage: {
      title: 'Depolama Sorunu',
      defaultMessage: 'Veri kaydedilemedi.',
      suggestions: [
        'Cihazınızda yeterli depolama alanı olduğunu kontrol edin',
        'Uygulamayı yeniden başlatmayı deneyin',
        'Gerekirse uygulama verilerini temizleyin',
      ],
    },
    permission: {
      title: 'İzin Sorunu',
      defaultMessage: 'Bu özellik için izin gerekiyor.',
      suggestions: [
        'Uygulama ayarlarından izinleri kontrol edin',
        'Gerekli izinleri verin',
        'Cihaz ayarlarından uygulama izinlerini açın',
      ],
    },
    unknown: {
      title: 'Beklenmeyen Hata',
      defaultMessage: 'Bir hata oluştu.',
      suggestions: [
        'Uygulamayı yeniden başlatmayı deneyin',
        'Cihazınızı yeniden başlatın',
        'Sorun devam ederse destek ekibine ulaşın',
      ],
    },
  };

  static createError(
    type: ErrorType,
    originalError?: Error | string,
    customMessage?: string,
    code?: string
  ): AppError {
    const errorConfig = this.errorMessages[type];
    const timestamp = Date.now();

    let message = customMessage || errorConfig.defaultMessage;
    let userMessage = customMessage || errorConfig.defaultMessage;

    // Handle different error types
    if (originalError) {
      if (typeof originalError === 'string') {
        message = originalError;
      } else {
        message = originalError.message;
      }
    }

    // Network specific handling
    if (type === 'network' && originalError instanceof Error) {
      if (originalError.message.includes('timeout')) {
        userMessage = 'Bağlantı zaman aşımına uğradı. Lütfen tekrar deneyin.';
      } else if (originalError.message.includes('offline')) {
        userMessage =
          'İnternet bağlantınız yok. Lütfen bağlantınızı kontrol edin.';
      }
    }

    // API specific handling
    if (type === 'api' && code) {
      switch (code) {
        case '429':
          userMessage = 'Çok fazla istek gönderildi. Lütfen bekleyin.';
          break;
        case '500':
          userMessage =
            'Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.';
          break;
        case '404':
          userMessage = 'İstenilen kaynak bulunamadı.';
          break;
        case '401':
          userMessage = 'Yetkiniz yok. Lütfen giriş yapın.';
          break;
      }
    }

    const error: AppError = {
      type,
      code,
      message,
      originalError: originalError instanceof Error ? originalError : undefined,
      userMessage,
      suggestions: errorConfig.suggestions,
      retryable: type === 'network' || type === 'api',
      timestamp,
    };

    // Log the error
    Logger.error(`[${type.toUpperCase()}] ${message}`, {
      code,
      timestamp,
      originalError:
        originalError instanceof Error ? originalError.stack : originalError,
    });

    return error;
  }

  static getNetworkError(error: any): AppError {
    if (!navigator.onLine) {
      return this.createError('network', 'İnternet bağlantınız yok');
    }

    if (error?.message?.includes('timeout')) {
      return this.createError('network', 'Bağlantı zaman aşımına uğradı');
    }

    if (error?.message?.includes('fetch')) {
      return this.createError('network', 'Sunucuya bağlanılamadı');
    }

    return this.createError('network', error);
  }

  static getAPIError(response: Response, error?: any): AppError {
    const status = response.status.toString();

    switch (response.status) {
      case 400:
        return this.createError(
          'validation',
          'Geçersiz istek',
          undefined,
          status
        );
      case 401:
        return this.createError(
          'auth',
          'Oturum süreniz doldu',
          undefined,
          status
        );
      case 403:
        return this.createError(
          'auth',
          'Bu işlem için yetkiniz yok',
          undefined,
          status
        );
      case 404:
        return this.createError(
          'api',
          'İstenilen kaynak bulunamadı',
          undefined,
          status
        );
      case 429:
        return this.createError(
          'api',
          'Çok fazla istek. Lütfen bekleyin',
          undefined,
          status
        );
      case 500:
      case 502:
      case 503:
        return this.createError(
          'api',
          'Sunucu geçici olarak kullanılamıyor',
          undefined,
          status
        );
      default:
        return this.createError(
          'api',
          error?.message || 'Bilinmeyen API hatası',
          undefined,
          status
        );
    }
  }

  static getValidationError(message: string): AppError {
    return this.createError('validation', message);
  }

  static getStorageError(error: any): AppError {
    return this.createError('storage', error?.message || 'Veri kaydedilemedi');
  }

  static getPermissionError(permission: string): AppError {
    return this.createError('permission', `${permission} izni gerekiyor`);
  }

  static getGenericError(error: any): AppError {
    return this.createError(
      'unknown',
      error?.message || 'Beklenmeyen bir hata oluştu'
    );
  }

  static isRetryable(error: AppError): boolean {
    return error.retryable || false;
  }

  static shouldShowSuggestions(error: AppError): boolean {
    return !!(error.suggestions && error.suggestions.length > 0);
  }
}
