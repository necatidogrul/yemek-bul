import { useState, useEffect, useCallback } from 'react';
import {
  AccessibilityManager,
  AccessibilityState,
} from '../services/AccessibilityService';

export interface AccessibilityHelpers {
  announceForAccessibility: (message: string) => void;
  generateRecipeLabel: (recipe: any) => string;
  generateHint: (action: string, context?: string) => string;
  getAnimationDuration: (normal: number, reduced?: number) => number;
  shouldReduceMotion: () => boolean;
  isScreenReaderActive: () => boolean;
  isVoiceOverActive: () => boolean;
}

/**
 * Custom hook for accessibility features
 */
export const useAccessibility = (): AccessibilityState &
  AccessibilityHelpers => {
  const [accessibilityState, setAccessibilityState] =
    useState<AccessibilityState>(AccessibilityManager.getState());

  useEffect(() => {
    // Subscribe to accessibility state changes
    const unsubscribe = AccessibilityManager.addListener(setAccessibilityState);

    return unsubscribe;
  }, []);

  // Helper functions
  const announceForAccessibility = useCallback((message: string) => {
    AccessibilityManager.announceForAccessibility(message);
  }, []);

  const generateRecipeLabel = useCallback((recipe: any) => {
    return AccessibilityManager.generateRecipeAccessibilityLabel(recipe);
  }, []);

  const generateHint = useCallback((action: string, context?: string) => {
    return AccessibilityManager.generateAccessibilityHint(action, context);
  }, []);

  const getAnimationDuration = useCallback(
    (normal: number, reduced: number = 0) => {
      return AccessibilityManager.getAnimationDuration(normal, reduced);
    },
    []
  );

  const shouldReduceMotion = useCallback(() => {
    return AccessibilityManager.shouldReduceMotion();
  }, []);

  const isScreenReaderActive = useCallback(() => {
    return AccessibilityManager.isScreenReaderActive();
  }, []);

  const isVoiceOverActive = useCallback(() => {
    return AccessibilityManager.isVoiceOverActive();
  }, []);

  return {
    ...accessibilityState,
    announceForAccessibility,
    generateRecipeLabel,
    generateHint,
    getAnimationDuration,
    shouldReduceMotion,
    isScreenReaderActive,
    isVoiceOverActive,
  };
};
