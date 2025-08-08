import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, StyleSheet, ScrollView, Text as RNText, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, borderRadius, getColors } from '../../theme/design-tokens';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error to external service (Crashlytics, Sentry, etc.)
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to console in development
    if (__DEV__) {
      console.error('ErrorBoundary caught an error:', error);
      console.error('Error info:', errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.errorCard}>
              {/* Icon */}
              <View style={styles.iconContainer}>
                <Ionicons name="alert-circle" size={64} color={getColors(false).error[500]} />
              </View>

              {/* Title */}
              <RNText style={styles.title}>Beklenmeyen Bir Hata Oluştu</RNText>

              {/* Description */}
              <RNText style={styles.description}>
                Uygulamamızda teknik bir sorun yaşandı. Bu durumu geliştirici ekibimize bildirdik.
              </RNText>

              {/* Error Details (Development Only) */}
              {__DEV__ && this.state.error && (
                <View style={styles.errorDetails}>
                  <RNText style={styles.errorDetailsTitle}>
                    Hata Detayları (Geliştirici Modu)
                  </RNText>
                  <View style={styles.errorContent}>
                    <RNText style={styles.errorText}>{this.state.error.toString()}</RNText>
                    {this.state.errorInfo && (
                      <RNText style={styles.stackTrace}>
                        {this.state.errorInfo.componentStack}
                      </RNText>
                    )}
                  </View>
                </View>
              )}

              {/* Actions */}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={this.handleRetry}
                  activeOpacity={0.7}
                >
                  <Ionicons name="refresh" size={20} color={colors.text.inverse} />
                  <RNText style={styles.buttonText}>Tekrar Dene</RNText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.homeButton}
                  onPress={() => {
                    // Could navigate to home or restart app
                    // For now, just retry
                    this.handleRetry();
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons name="home" size={20} color={colors.primary[500]} />
                  <RNText style={styles.outlineButtonText}>Ana Sayfaya Dön</RNText>
                </TouchableOpacity>
              </View>

              {/* Help Text */}
              <View style={styles.helpContainer}>
                <RNText style={styles.helpText}>
                  Sorun devam ederse uygulamayı yeniden başlatmayı deneyin.
                </RNText>
              </View>
            </View>
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easier usage
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode,
  onError?: (error: Error, errorInfo: ErrorInfo) => void,
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback} onError={onError}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

const colors = getColors(false); // Using light theme as default for ErrorBoundary

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing[6],
  },

  errorCard: {
    alignItems: 'center',
    backgroundColor: colors.surface.primary,
    padding: spacing[6],
    borderRadius: borderRadius.xl,
    shadowColor: colors.neutral[900],
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },

  iconContainer: {
    marginBottom: spacing[4],
  },

  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing[3],
    color: colors.text.primary,
  },

  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: spacing[6],
    maxWidth: 300,
    lineHeight: 22,
    color: colors.text.secondary,
  },

  errorDetails: {
    width: '100%',
    marginBottom: spacing[6],
  },

  errorDetailsTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: spacing[2],
    color: colors.error[500],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  errorContent: {
    backgroundColor: colors.error[50],
    padding: spacing[3],
    borderRadius: borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.error[500],
  },

  errorText: {
    fontFamily: 'monospace',
    color: colors.error[600],
    marginBottom: spacing[2],
    fontSize: 12,
  },

  stackTrace: {
    fontFamily: 'monospace',
    color: colors.error[700],
    fontSize: 10,
    lineHeight: 14,
  },

  actions: {
    width: '100%',
    marginBottom: spacing[4],
  },

  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary[500],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.md,
    marginBottom: spacing[3],
    gap: spacing[2],
  },

  homeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.primary[500],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.md,
    gap: spacing[2],
  },

  buttonText: {
    color: colors.text.inverse,
    fontSize: 16,
    fontWeight: '600',
  },

  outlineButtonText: {
    color: colors.primary[500],
    fontSize: 16,
    fontWeight: '600',
  },

  helpContainer: {
    marginTop: spacing[2],
  },

  helpText: {
    fontSize: 12,
    textAlign: 'center',
    color: colors.text.secondary,
  },
});
