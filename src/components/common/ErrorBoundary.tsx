import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Text from '../ui/Text';
import {
  ErrorHandlingService,
  AppError,
} from '../../services/ErrorHandlingService';
import { Logger } from '../../services/LoggerService';
import { spacing, borderRadius } from '../../theme/design-tokens';

interface Props {
  children: ReactNode;
  fallback?: (error: AppError, retry: () => void) => ReactNode;
  onError?: (error: AppError) => void;
}

interface State {
  hasError: boolean;
  error: AppError | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    // Create an app error from the caught error
    const appError = ErrorHandlingService.getGenericError(error);
    return { hasError: true, error: appError };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error
    Logger.error('ErrorBoundary caught an error', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    const appError = ErrorHandlingService.getGenericError(error);

    // Call the onError callback if provided
    this.props.onError?.(appError);
  }

  retry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // If a custom fallback is provided, use it
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.retry);
      }

      // Default error UI
      return (
        <DefaultErrorFallback error={this.state.error} onRetry={this.retry} />
      );
    }

    return this.props.children;
  }
}

interface DefaultErrorFallbackProps {
  error: AppError;
  onRetry: () => void;
}

const DefaultErrorFallback: React.FC<DefaultErrorFallbackProps> = ({
  error,
  onRetry,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Error Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name='bug-outline' size={48} color='#EF4444' />
        </View>

        {/* Error Title */}
        <Text variant='h3' weight='bold' align='center' style={styles.title}>
          Ups! Bir Sorun Oluştu
        </Text>

        {/* Error Message */}
        <Text
          variant='body'
          color='secondary'
          align='center'
          style={styles.message}
        >
          {error.userMessage || error.message}
        </Text>

        {/* Error Code */}
        {error.code && (
          <Text
            variant='caption'
            color='tertiary'
            align='center'
            style={styles.code}
          >
            Hata Kodu: {error.code}
          </Text>
        )}

        {/* Suggestions */}
        {error.suggestions && error.suggestions.length > 0 && (
          <View style={styles.suggestions}>
            <Text
              variant='bodySmall'
              weight='600'
              style={styles.suggestionsTitle}
            >
              Çözüm Önerileri:
            </Text>
            {error.suggestions.map((suggestion, index) => (
              <View key={index} style={styles.suggestionItem}>
                <Text variant='caption' style={styles.suggestionBullet}>
                  •
                </Text>
                <Text
                  variant='caption'
                  color='secondary'
                  style={styles.suggestionText}
                >
                  {suggestion}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={onRetry}
            activeOpacity={0.8}
          >
            <Ionicons name='refresh' size={20} color='white' />
            <Text
              variant='bodyMedium'
              weight='600'
              style={styles.retryButtonText}
            >
              Tekrar Dene
            </Text>
          </TouchableOpacity>
        </View>

        {/* Debug Info (only in development) */}
        {__DEV__ && (
          <View style={styles.debugInfo}>
            <Text variant='caption' color='tertiary' style={styles.debugText}>
              Debug: {error.type} - {new Date(error.timestamp).toISOString()}
            </Text>
            {error.originalError && (
              <Text variant='caption' color='tertiary' style={styles.debugText}>
                {error.originalError.stack?.substring(0, 200) + '...'}
              </Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[6],
  },
  content: {
    alignItems: 'center',
    maxWidth: 320,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
  },
  title: {
    marginBottom: spacing[3],
    color: '#1F2937',
  },
  message: {
    marginBottom: spacing[2],
    lineHeight: 22,
  },
  code: {
    marginBottom: spacing[4],
  },
  suggestions: {
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    marginBottom: spacing[6],
  },
  suggestionsTitle: {
    marginBottom: spacing[2],
    color: '#374151',
  },
  suggestionItem: {
    flexDirection: 'row',
    marginBottom: spacing[1],
  },
  suggestionBullet: {
    width: 12,
    color: '#9CA3AF',
  },
  suggestionText: {
    flex: 1,
    lineHeight: 18,
  },
  actions: {
    width: '100%',
    alignItems: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF4444',
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    gap: spacing[2],
  },
  retryButtonText: {
    color: 'white',
  },
  debugInfo: {
    marginTop: spacing[6],
    padding: spacing[3],
    backgroundColor: '#F3F4F6',
    borderRadius: borderRadius.md,
    width: '100%',
  },
  debugText: {
    fontSize: 10,
    lineHeight: 14,
    fontFamily: 'monospace',
  },
});
