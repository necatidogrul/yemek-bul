import React, { useEffect, useRef } from 'react';
import {
  View,
  Text as RNText,
  Animated,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import Text from './Text';
import { borderRadius, spacing, shadows } from '../../theme/design-tokens';

export type ToastType = 'success' | 'error' | 'warning' | 'info';
export type ToastPosition = 'top' | 'bottom';

export interface ToastConfig {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  position?: ToastPosition;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
}

interface ToastProps extends ToastConfig {
  visible: boolean;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const TOAST_HEIGHT = 80;

export const Toast: React.FC<ToastProps> = ({
  visible,
  type,
  title,
  message,
  position = 'top',
  actionLabel,
  onAction,
  onDismiss,
}) => {
  const { colors, isDark } = useThemedStyles();
  const translateY = useRef(new Animated.Value(position === 'top' ? -100 : 100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: position === 'top' ? -100 : 100,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, translateY, opacity, position]);

  const getToastStyles = () => {
    const baseStyles = {
      backgroundColor: colors.surface.primary,
      borderLeftWidth: 4,
    };

    switch (type) {
      case 'success':
        return {
          ...baseStyles,
          borderLeftColor: colors.success[500],
          iconColor: colors.success[500],
          iconBg: colors.success[100],
          iconName: 'checkmark-circle' as const,
        };
      case 'error':
        return {
          ...baseStyles,
          borderLeftColor: colors.error[500],
          iconColor: colors.error[500],
          iconBg: colors.error[100],
          iconName: 'close-circle' as const,
        };
      case 'warning':
        return {
          ...baseStyles,
          borderLeftColor: colors.warning[500],
          iconColor: colors.warning[500],
          iconBg: colors.warning[100],
          iconName: 'warning' as const,
        };
      case 'info':
        return {
          ...baseStyles,
          borderLeftColor: colors.info[500],
          iconColor: colors.info[500],
          iconBg: colors.info[100],
          iconName: 'information-circle' as const,
        };
      default:
        return {
          ...baseStyles,
          borderLeftColor: colors.primary[500],
          iconColor: colors.primary[500],
          iconBg: colors.primary[100],
          iconName: 'information-circle' as const,
        };
    }
  };

  const toastStyles = getToastStyles();

  const containerStyle = [
    styles.container,
    {
      [position]: Platform.OS === 'ios' ? (position === 'top' ? 60 : 40) : 20,
    },
  ];

  return (
    <Animated.View
      style={[
        containerStyle,
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <View
        style={[
          styles.toast,
          {
            backgroundColor: toastStyles.backgroundColor,
            borderLeftColor: toastStyles.borderLeftColor,
            borderLeftWidth: toastStyles.borderLeftWidth,
          },
          shadows.lg,
        ]}
      >
        {/* Icon */}
        <View style={[styles.iconContainer, { backgroundColor: toastStyles.iconBg }]}>
          <Ionicons name={toastStyles.iconName} size={20} color={toastStyles.iconColor} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text variant="bodyMedium" weight="semibold" numberOfLines={1}>
            {title}
          </Text>
          {message && (
            <Text variant="bodySmall" color="secondary" numberOfLines={2} style={styles.message}>
              {message}
            </Text>
          )}
        </View>

        {/* Action Button */}
        {actionLabel && onAction && (
          <TouchableOpacity style={styles.action} onPress={onAction}>
            <Text variant="bodySmall" weight="semibold" style={{ color: toastStyles.iconColor }}>
              {actionLabel}
            </Text>
          </TouchableOpacity>
        )}

        {/* Dismiss Button */}
        {onDismiss && (
          <TouchableOpacity style={styles.dismiss} onPress={onDismiss}>
            <Ionicons name="close" size={16} color={colors.text.tertiary} />
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing[4],
    right: spacing[4],
    zIndex: 9999,
  },

  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.lg,
    minHeight: TOAST_HEIGHT,
  },

  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },

  content: {
    flex: 1,
    paddingRight: spacing[2],
  },

  message: {
    marginTop: spacing[1],
    lineHeight: 16,
  },

  action: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
  },

  dismiss: {
    padding: spacing[2],
    marginLeft: spacing[1],
  },
});
