import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Text from '../ui/Text';
import Button from '../ui/Button';
import Card from '../ui/Card';
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
            <Card variant="default" size="lg" style={styles.errorCard}>
              {/* Icon */}
              <View style={styles.iconContainer}>
                <Ionicons name="alert-circle" size={64} color={getColors().error[500]} />
              </View>

              {/* Title */}
              <Text variant="h3" weight="bold" align="center" style={styles.title}>
                Beklenmeyen Bir Hata Oluştu
              </Text>

              {/* Description */}
              <Text variant="body" color="secondary" align="center" style={styles.description}>
                Uygulamamızda teknik bir sorun yaşandı. Bu durumu geliştirici ekibimize bildirdik.
              </Text>

              {/* Error Details (Development Only) */}
              {__DEV__ && this.state.error && (
                <View style={styles.errorDetails}>
                  <Text variant="overline" weight="semibold" style={styles.errorDetailsTitle}>
                    Hata Detayları (Geliştirici Modu)
                  </Text>
                  <View style={styles.errorContent}>
                    <Text variant="caption" style={styles.errorText}>
                      {this.state.error.toString()}
                    </Text>
                    {this.state.errorInfo && (
                      <Text variant="caption" style={styles.stackTrace}>
                        {this.state.errorInfo.componentStack}
                      </Text>
                    )}
                  </View>
                </View>
              )}

              {/* Actions */}
              <View style={styles.actions}>
                <Button
                  variant="primary"
                  size="lg"
                  onPress={this.handleRetry}
                  leftIcon={<Ionicons name="refresh" size={20} />}
                  style={styles.retryButton}
                >
                  Tekrar Dene
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  onPress={() => {
                    // Could navigate to home or restart app
                    // For now, just retry
                    this.handleRetry();
                  }}
                  leftIcon={<Ionicons name="home" size={20} />}
                  style={styles.homeButton}
                >
                  Ana Sayfaya Dön
                </Button>
              </View>

              {/* Help Text */}
              <View style={styles.helpContainer}>
                <Text variant="caption" color="secondary" align="center">
                  Sorun devam ederse uygulamayı yeniden başlatmayı deneyin.
                </Text>
              </View>
            </Card>
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
  onError?: (error: Error, errorInfo: ErrorInfo) => void
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback} onError={onError}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

const colors = getColors();

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
  },
  
  iconContainer: {
    marginBottom: spacing[4],
  },
  
  title: {
    marginBottom: spacing[3],
    color: colors.text.primary,
  },
  
  description: {
    marginBottom: spacing[6],
    maxWidth: 300,
    lineHeight: 22,
  },
  
  errorDetails: {
    width: '100%',
    marginBottom: spacing[6],
  },
  
  errorDetailsTitle: {
    marginBottom: spacing[2],
    color: colors.error[500],
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
  },
  
  stackTrace: {
    fontFamily: 'monospace',
    color: colors.error[700],
    fontSize: 10,
    lineHeight: 14,
  },
  
  actions: {
    width: '100%',
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  
  retryButton: {
    width: '100%',
  },
  
  homeButton: {
    width: '100%',
  },
  
  helpContainer: {
    marginTop: spacing[2],
  },
});