import React from 'react';
import { View, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import Text from './Text';
import { spacing } from '../../theme/design-tokens';

interface LoadingProps {
  size?: 'small' | 'large';
  color?: string;
  text?: string;
  overlay?: boolean;
  style?: ViewStyle;
}

export const Loading: React.FC<LoadingProps> = ({
  size = 'large',
  color,
  text,
  overlay = false,
  style,
}) => {
  const { colors } = useThemedStyles();
  
  const spinnerColor = color || colors.primary[500];
  
  const LoadingContent = (
    <View style={[styles.container, overlay && styles.overlay, style]}>
      <ActivityIndicator size={size} color={spinnerColor} />
      {text && (
        <Text 
          variant="body" 
          color="secondary" 
          align="center"
          style={styles.text}
        >
          {text}
        </Text>
      )}
    </View>
  );

  if (overlay) {
    return (
      <View style={styles.overlayContainer}>
        {LoadingContent}
      </View>
    );
  }

  return LoadingContent;
};

// Inline spinner for buttons, etc.
export const InlineLoading: React.FC<{ 
  size?: number; 
  color?: string;
  style?: ViewStyle;
}> = ({ 
  size = 16, 
  color,
  style 
}) => {
  const { colors } = useThemedStyles();
  
  return (
    <ActivityIndicator 
      size={size as any} 
      color={color || colors.primary[500]} 
      style={style}
    />
  );
};

// Page-level loading screen
export const PageLoading: React.FC<{ 
  text?: string;
}> = ({ text = 'Yükleniyor...' }) => {
  const { colors } = useThemedStyles();
  
  return (
    <View style={[styles.pageLoading, { backgroundColor: colors.background.primary }]}>
      <Loading size="large" text={text} />
    </View>
  );
};

// Loading overlay for modals, screens, etc.
export const LoadingOverlay: React.FC<{
  visible: boolean;
  text?: string;
  backgroundColor?: string;
}> = ({ 
  visible, 
  text = 'Yükleniyor...',
  backgroundColor 
}) => {
  const { colors } = useThemedStyles();
  
  if (!visible) return null;
  
  return (
    <View style={[
      styles.loadingOverlay, 
      { backgroundColor: backgroundColor || `${colors.neutral[900]}80` }
    ]}>
      <View style={[styles.loadingCard, { backgroundColor: colors.surface.primary }]}>
        <Loading size="large" text={text} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[4],
  },
  
  overlay: {
    flex: 1,
  },
  
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  
  text: {
    marginTop: spacing[3],
  },
  
  pageLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  
  loadingCard: {
    borderRadius: 12,
    padding: spacing[6],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});