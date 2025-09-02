import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Text from './Text';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import {
  AppError,
  ErrorHandlingService,
} from '../../services/ErrorHandlingService';
import { spacing, borderRadius } from '../../theme/design-tokens';

interface ErrorDisplayProps {
  error: AppError;
  onRetry?: () => void;
  onDismiss?: () => void;
  showSuggestions?: boolean;
  compact?: boolean;
}

const errorIcons: Record<string, string> = {
  network: 'cloud-offline-outline',
  api: 'server-outline',
  validation: 'alert-circle-outline',
  auth: 'lock-closed-outline',
  storage: 'save-outline',
  permission: 'shield-outline',
  unknown: 'help-circle-outline',
};

const errorColors: Record<string, string> = {
  network: '#EF4444',
  api: '#F59E0B',
  validation: '#8B5CF6',
  auth: '#EC4899',
  storage: '#06B6D4',
  permission: '#10B981',
  unknown: '#6B7280',
};

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onRetry,
  onDismiss,
  showSuggestions = true,
  compact = false,
}) => {
  const { colors } = useThemedStyles();
  const errorColor = errorColors[error.type] || errorColors.unknown;
  const errorIcon = errorIcons[error.type] || errorIcons.unknown;

  if (compact) {
    return (
      <View
        style={[
          styles.compactContainer,
          { backgroundColor: colors.surface.secondary },
        ]}
      >
        <View style={styles.compactContent}>
          <Ionicons name={errorIcon as any} size={20} color={errorColor} />
          <View style={styles.compactText}>
            <Text
              variant='bodySmall'
              weight='600'
              style={{ color: colors.text.primary }}
            >
              {error.userMessage || error.message}
            </Text>
          </View>
          {onRetry && ErrorHandlingService.isRetryable(error) && (
            <TouchableOpacity
              style={[styles.retryButton, { borderColor: errorColor }]}
              onPress={onRetry}
              activeOpacity={0.7}
            >
              <Ionicons name='refresh' size={16} color={errorColor} />
            </TouchableOpacity>
          )}
          {onDismiss && (
            <TouchableOpacity
              style={styles.dismissButton}
              onPress={onDismiss}
              activeOpacity={0.7}
            >
              <Ionicons name='close' size={16} color={colors.text.tertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: colors.surface.secondary }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View
          style={[styles.iconContainer, { backgroundColor: errorColor + '20' }]}
        >
          <Ionicons name={errorIcon as any} size={24} color={errorColor} />
        </View>
        <View style={styles.headerText}>
          <Text
            variant='bodyLarge'
            weight='bold'
            style={{ color: colors.text.primary }}
          >
            {ErrorHandlingService['errorMessages'][error.type]?.title || 'Hata'}
          </Text>
          <Text variant='bodySmall' style={{ color: colors.text.secondary }}>
            {new Date(error.timestamp).toLocaleTimeString('tr-TR')}
          </Text>
        </View>
        {onDismiss && (
          <TouchableOpacity
            style={styles.headerDismiss}
            onPress={onDismiss}
            activeOpacity={0.7}
          >
            <Ionicons name='close' size={20} color={colors.text.tertiary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Message */}
      <View style={styles.messageContainer}>
        <Text
          variant='body'
          style={{ color: colors.text.secondary, lineHeight: 20 }}
        >
          {error.userMessage || error.message}
        </Text>
        {error.code && (
          <Text
            variant='caption'
            style={{ color: colors.text.tertiary, marginTop: spacing[1] }}
          >
            Hata Kodu: {error.code}
          </Text>
        )}
      </View>

      {/* Suggestions */}
      {showSuggestions && ErrorHandlingService.shouldShowSuggestions(error) && (
        <View style={styles.suggestionsContainer}>
          <Text
            variant='bodySmall'
            weight='600'
            style={{
              color: colors.text.primary,
              marginBottom: spacing[2],
            }}
          >
            Çözüm Önerileri:
          </Text>
          {error.suggestions?.map((suggestion, index) => (
            <View key={index} style={styles.suggestionItem}>
              <Ionicons name='checkmark-circle' size={14} color={errorColor} />
              <Text
                variant='caption'
                style={{
                  color: colors.text.secondary,
                  flex: 1,
                  marginLeft: spacing[1],
                }}
              >
                {suggestion}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        {onRetry && ErrorHandlingService.isRetryable(error) && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: errorColor }]}
            onPress={onRetry}
            activeOpacity={0.8}
          >
            <Ionicons name='refresh' size={16} color='white' />
            <Text
              variant='bodySmall'
              weight='600'
              style={{ color: 'white', marginLeft: spacing[1] }}
            >
              Tekrar Dene
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    margin: spacing[2],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  headerText: {
    flex: 1,
  },
  headerDismiss: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageContainer: {
    marginBottom: spacing[3],
  },
  suggestionsContainer: {
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: borderRadius.md,
    padding: spacing[3],
    marginBottom: spacing[3],
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing[1],
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing[2],
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
  },

  // Compact styles
  compactContainer: {
    borderRadius: borderRadius.md,
    margin: spacing[1],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    gap: spacing[2],
  },
  compactText: {
    flex: 1,
  },
  retryButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
