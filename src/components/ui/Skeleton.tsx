import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { borderRadius } from '../../theme/design-tokens';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius: radius = borderRadius.base,
  style,
}) => {
  const { colors, isDark } = useThemedStyles();
  const { shouldReduceMotion } = useReducedMotion();
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Skip animation if reduce motion is enabled
    if (shouldReduceMotion()) {
      animatedValue.setValue(0.5); // Set to middle value for static appearance
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }),
      ])
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [animatedValue, shouldReduceMotion]);

  const backgroundColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: isDark 
      ? [colors.neutral[800], colors.neutral[700]]
      : [colors.neutral[200], colors.neutral[300]],
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor,
        },
        style,
      ]}
    />
  );
};

// Recipe Card Skeleton
export const RecipeCardSkeleton: React.FC = () => {
  const { colors } = useThemedStyles();

  return (
    <View style={[styles.recipeCardSkeleton, { backgroundColor: colors.surface.primary }]}>
      <Skeleton width="100%" height={140} borderRadius={borderRadius.lg} />
      <View style={styles.recipeCardContent}>
        <Skeleton width="80%" height={18} style={styles.recipeTitle} />
        <Skeleton width="60%" height={14} style={styles.recipeSubtitle} />
        <View style={styles.recipeStats}>
          <Skeleton width={50} height={12} />
          <Skeleton width={50} height={12} />
          <Skeleton width={50} height={12} />
        </View>
      </View>
    </View>
  );
};

// Recipe List Skeleton
export const RecipeListSkeleton: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <View style={styles.recipeListSkeleton}>
      {Array.from({ length: count }).map((_, index) => (
        <RecipeCardSkeleton key={index} />
      ))}
    </View>
  );
};

// Text Lines Skeleton (for descriptions, articles, etc.)
export const TextLinesSkeleton: React.FC<{ lines?: number }> = ({ lines = 3 }) => {
  return (
    <View style={styles.textLinesSkeleton}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          width={index === lines - 1 ? '70%' : '100%'}
          height={16}
          style={styles.textLine}
        />
      ))}
    </View>
  );
};

// Hero Section Skeleton
export const HeroSkeleton: React.FC = () => {
  return (
    <View style={styles.heroSkeleton}>
      <Skeleton width={60} height={60} borderRadius={30} style={styles.heroIcon} />
      <Skeleton width="60%" height={24} style={styles.heroTitle} />
      <Skeleton width="40%" height={18} style={styles.heroSubtitle} />
      <TextLinesSkeleton lines={2} />
    </View>
  );
};

// Search Input Skeleton
export const SearchInputSkeleton: React.FC = () => {
  return (
    <View style={styles.searchInputSkeleton}>
      <Skeleton width="100%" height={48} borderRadius={borderRadius.lg} />
      <Skeleton width="100%" height={44} borderRadius={borderRadius.lg} style={styles.searchButton} />
    </View>
  );
};

const styles = StyleSheet.create({
  recipeCardSkeleton: {
    borderRadius: borderRadius.xl,
    marginBottom: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  recipeCardContent: {
    marginTop: 12,
  },
  
  recipeTitle: {
    marginBottom: 8,
  },
  
  recipeSubtitle: {
    marginBottom: 12,
  },
  
  recipeStats: {
    flexDirection: 'row',
    gap: 12,
  },
  
  recipeListSkeleton: {
    padding: 16,
  },
  
  textLinesSkeleton: {
    marginVertical: 8,
  },
  
  textLine: {
    marginBottom: 8,
  },
  
  heroSkeleton: {
    alignItems: 'center',
    padding: 24,
  },
  
  heroIcon: {
    marginBottom: 16,
  },
  
  heroTitle: {
    marginBottom: 8,
  },
  
  heroSubtitle: {
    marginBottom: 16,
  },
  
  searchInputSkeleton: {
    padding: 16,
    gap: 12,
  },
  
  searchButton: {
    marginTop: 8,
  },
});