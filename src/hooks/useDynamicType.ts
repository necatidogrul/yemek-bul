import { useState, useEffect } from 'react';
import { PixelRatio, Platform } from 'react-native';

export interface DynamicTypeScale {
  scale: number;
  fontSizeMultiplier: number;
  isAccessibilitySize: boolean;
}

/**
 * Custom hook for Dynamic Type support
 * Handles iOS Dynamic Type and Android font scaling
 */
export const useDynamicType = (): DynamicTypeScale => {
  const [scale, setScale] = useState<DynamicTypeScale>({
    scale: 1,
    fontSizeMultiplier: 1,
    isAccessibilitySize: false,
  });

  useEffect(() => {
    const updateScale = () => {
      const fontScale = PixelRatio.getFontScale();
      
      // Determine if we're in accessibility size range
      const isAccessibilitySize = fontScale > 1.3;
      
      // Clamp the scale to reasonable bounds
      // iOS supports up to 3.0x scale, but we'll limit to 2.5x for layout stability
      const clampedScale = Math.min(Math.max(fontScale, 0.8), 2.5);
      
      setScale({
        scale: clampedScale,
        fontSizeMultiplier: clampedScale,
        isAccessibilitySize,
      });
    };

    // Update scale on mount
    updateScale();

    // Note: React Native doesn't have a built-in listener for font scale changes
    // In a real app, you might want to listen to app state changes or implement
    // a more sophisticated detection mechanism
    
    // For iOS, we could potentially listen to content size category changes
    // For Android, we could listen to configuration changes
    
  }, []);

  return scale;
};

/**
 * Scale a font size based on Dynamic Type settings
 */
export const scaleFontSize = (
  baseSize: number, 
  scale: number, 
  minSize?: number, 
  maxSize?: number
): number => {
  let scaledSize = baseSize * scale;
  
  // Apply minimum and maximum constraints
  if (minSize !== undefined) {
    scaledSize = Math.max(scaledSize, minSize);
  }
  
  if (maxSize !== undefined) {
    scaledSize = Math.min(scaledSize, maxSize);
  }
  
  return Math.round(scaledSize);
};

/**
 * Generate responsive spacing based on font scale
 */
export const scaleSpacing = (baseSpacing: number, scale: number): number => {
  // Scale spacing more conservatively than fonts
  const spacingScale = Math.min(scale, 1.5);
  return Math.round(baseSpacing * spacingScale);
};

/**
 * Determine if layout should adapt for large text
 */
export const shouldAdaptLayoutForLargeText = (scale: number): boolean => {
  return scale > 1.3;
};