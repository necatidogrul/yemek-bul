import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import Text from '../ui/Text';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { spacing } from '../../theme/design-tokens';

interface ErrorFallbackProps {
  error?: Error;
  resetError?: () => void;
  title?: string;
  message?: string;
  showRetry?: boolean;
  compact?: boolean;
}

// Generic error fallback component
export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetError,
  title = 'Bir Hata Oluştu',
  message = 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.',
  showRetry = true,
  compact = false,
}) => {
  const { colors } = useThemedStyles();

  return (
    <View style={[styles.container, compact && styles.compactContainer]}>
      <Card variant='default' size={compact ? 'md' : 'lg'}>
        <View style={styles.content}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: colors.error[100] },
            ]}
          >
            <Ionicons
              name='alert-circle'
              size={compact ? 32 : 48}
              color={colors.error[500]}
            />
          </View>

          <Text
            variant={compact ? 'bodyLarge' : 'h4'}
            weight='bold'
            align='center'
            style={styles.title}
          >
            {title}
          </Text>

          <Text
            variant={compact ? 'bodySmall' : 'body'}
            color='secondary'
            align='center'
            style={styles.message}
          >
            {message}
          </Text>

          {__DEV__ && error && (
            <View
              style={[
                styles.errorDetails,
                { backgroundColor: colors.error[50] },
              ]}
            >
              <Text variant='caption' style={{ color: colors.error[700] }}>
                {error.toString()}
              </Text>
            </View>
          )}

          {showRetry && resetError && (
            <Button
              variant='primary'
              size={compact ? 'md' : 'lg'}
              onPress={resetError}
              leftIcon={<Ionicons name='refresh' size={16} />}
              style={styles.retryButton}
            >
              Tekrar Dene
            </Button>
          )}
        </View>
      </Card>
    </View>
  );
};

// Specific error fallbacks for different scenarios
export const NetworkErrorFallback: React.FC<{ resetError?: () => void }> = ({
  resetError,
}) => (
  <ErrorFallback
    title='Bağlantı Hatası'
    message='İnternet bağlantınızı kontrol edin ve tekrar deneyin.'
    resetError={resetError}
  />
);

export const LoadingErrorFallback: React.FC<{ resetError?: () => void }> = ({
  resetError,
}) => (
  <ErrorFallback
    title='Yükleme Hatası'
    message='Veriler yüklenirken bir hata oluştu.'
    resetError={resetError}
    compact
  />
);

export const FormErrorFallback: React.FC<{ resetError?: () => void }> = ({
  resetError,
}) => (
  <ErrorFallback
    title='Form Hatası'
    message='Form gönderilirken bir hata oluştu. Lütfen tekrar deneyin.'
    resetError={resetError}
    compact
  />
);

export const PaymentErrorFallback: React.FC<{ resetError?: () => void }> = ({
  resetError,
}) => (
  <ErrorFallback
    title='Ödeme Hatası'
    message='Ödeme işlemi sırasında bir hata oluştu. Lütfen tekrar deneyin.'
    resetError={resetError}
  />
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[6],
  },

  compactContainer: {
    padding: spacing[4],
  },

  content: {
    alignItems: 'center',
    width: '100%',
  },

  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
  },

  title: {
    marginBottom: spacing[2],
  },

  message: {
    marginBottom: spacing[4],
    maxWidth: 280,
    lineHeight: 20,
  },

  errorDetails: {
    width: '100%',
    padding: spacing[3],
    borderRadius: 8,
    marginBottom: spacing[4],
  },

  retryButton: {
    minWidth: 140,
  },
});
