import { useAccessibility } from './useAccessibility';
import { Animated } from 'react-native';

/**
 * Hook for creating animations that respect reduce motion preferences
 */
export const useReducedMotion = () => {
  const { shouldReduceMotion, getAnimationDuration } = useAccessibility();

  /**
   * Create an animated timing that respects reduce motion
   */
  const timing = (
    value: Animated.Value,
    config: Omit<Animated.TimingAnimationConfig, 'duration'> & {
      duration: number;
      reducedDuration?: number;
    }
  ): Animated.CompositeAnimation => {
    const { duration, reducedDuration = 0, ...restConfig } = config;
    
    return Animated.timing(value, {
      ...restConfig,
      duration: getAnimationDuration(duration, reducedDuration),
      useNativeDriver: restConfig.useNativeDriver ?? true,
    });
  };

  /**
   * Create a spring animation that respects reduce motion
   */
  const spring = (
    value: Animated.Value,
    config: Animated.SpringAnimationConfig
  ): Animated.CompositeAnimation => {
    if (shouldReduceMotion()) {
      // Convert spring to instant change for reduced motion
      return Animated.timing(value, {
        toValue: config.toValue as number,
        duration: 0,
        useNativeDriver: config.useNativeDriver ?? true,
      });
    }

    return Animated.spring(value, config);
  };

  /**
   * Create a fade in animation
   */
  const fadeIn = (
    value: Animated.Value,
    duration: number = 300
  ): Animated.CompositeAnimation => {
    return timing(value, {
      toValue: 1,
      duration,
      reducedDuration: 0,
    });
  };

  /**
   * Create a fade out animation
   */
  const fadeOut = (
    value: Animated.Value,
    duration: number = 300
  ): Animated.CompositeAnimation => {
    return timing(value, {
      toValue: 0,
      duration,
      reducedDuration: 0,
    });
  };

  /**
   * Create a slide in animation
   */
  const slideIn = (
    value: Animated.Value,
    fromValue: number,
    toValue: number,
    duration: number = 300
  ): Animated.CompositeAnimation => {
    value.setValue(fromValue);
    return timing(value, {
      toValue,
      duration,
      reducedDuration: 0,
    });
  };

  /**
   * Create a scale animation
   */
  const scale = (
    value: Animated.Value,
    toValue: number,
    duration: number = 200
  ): Animated.CompositeAnimation => {
    return timing(value, {
      toValue,
      duration,
      reducedDuration: 0,
    });
  };

  return {
    shouldReduceMotion,
    getAnimationDuration,
    timing,
    spring,
    fadeIn,
    fadeOut,
    slideIn,
    scale,
  };
};