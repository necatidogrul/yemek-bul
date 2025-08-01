import React, { useState, useCallback, useMemo } from 'react';
import {
  Image,
  ImageStyle,
  View,
  StyleSheet,
  ImageProps,
  ImageResizeMode,
  Animated,
  Platform,
} from 'react-native';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { Skeleton } from './Skeleton';
import { Ionicons } from '@expo/vector-icons';

interface OptimizedImageProps extends Omit<ImageProps, 'source'> {
  /** Görsel URL'i */
  source: string | { uri: string } | number;
  /** Görsel boyutu */
  width?: number;
  height?: number;
  /** Border radius */
  borderRadius?: number;
  /** Resize mode */
  resizeMode?: ImageResizeMode;
  /** Loading skeleton göster */
  showSkeleton?: boolean;
  /** Error durumunda gösterilecek icon */
  errorIcon?: keyof typeof Ionicons.glyphMap;
  /** Placeholder rengi */
  placeholderColor?: string;
  /** Fade in animasyonu */
  fadeIn?: boolean;
  /** Cache policy */
  cachePolicy?: 'memory' | 'disk' | 'memory-disk';
  /** Priority */
  priority?: 'low' | 'normal' | 'high';
  /** Accessibility label */
  accessibilityLabel?: string;
  /** Test ID */
  testID?: string;
  /** Loading callback */
  onLoadStart?: () => void;
  /** Success callback */
  onLoadEnd?: () => void;
  /** Error callback */
  onError?: (error: any) => void;
}

/**
 * Performance optimized image bileşeni
 * Lazy loading, caching, error handling ve skeleton loading ile
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  source,
  width = 100,
  height = 100,
  borderRadius = 0,
  resizeMode = 'cover',
  showSkeleton = true,
  errorIcon = 'image-outline',
  placeholderColor,
  fadeIn = true,
  cachePolicy = 'memory-disk',
  priority = 'normal',
  accessibilityLabel,
  testID,
  onLoadStart,
  onLoadEnd,
  onError,
  style,
  ...props
}) => {
  const { colors } = useThemedStyles();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  // Image source'u normalize et
  const imageSource = useMemo(() => {
    if (typeof source === 'string') {
      return { uri: source };
    }
    return source;
  }, [source]);

  // Loading başladığında
  const handleLoadStart = useCallback(() => {
    setIsLoading(true);
    setHasError(false);
    onLoadStart?.();
  }, [onLoadStart]);

  // Loading bitti (başarılı)
  const handleLoadEnd = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
    
    if (fadeIn) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: Platform.OS === 'ios' ? 200 : 300,
        useNativeDriver: true,
      }).start();
    }
    
    onLoadEnd?.();
  }, [fadeIn, fadeAnim, onLoadEnd]);

  // Loading hatası
  const handleError = useCallback((error: any) => {
    setIsLoading(false);
    setHasError(true);
    onError?.(error);
  }, [onError]);

  // Container styles
  const containerStyle = useMemo((): ImageStyle => ({
    width,
    height,
    borderRadius,
    backgroundColor: placeholderColor || colors.background.tertiary,
    overflow: 'hidden',
  }), [width, height, borderRadius, placeholderColor, colors.background.tertiary]);

  // Error placeholder
  const renderErrorPlaceholder = useCallback(() => (
    <View style={[containerStyle, styles.placeholder, styles.errorPlaceholder]}>
      <Ionicons
        name={errorIcon}
        size={Math.min(width, height) * 0.3}
        color={colors.text.tertiary}
      />
    </View>
  ), [containerStyle, errorIcon, width, height, colors.text.tertiary]);

  // Loading skeleton
  const renderSkeleton = useCallback(() => (
    showSkeleton ? (
      <Skeleton
        width={width}
        height={height}
        borderRadius={borderRadius}
        style={[containerStyle, style]}
      />
    ) : (
      <View style={[containerStyle, styles.placeholder, style]} />
    )
  ), [showSkeleton, width, height, borderRadius, containerStyle, style]);

  // Hata durumu
  if (hasError) {
    return renderErrorPlaceholder();
  }

  return (
    <View style={containerStyle}>
      {/* Loading Skeleton */}
      {isLoading && renderSkeleton()}
      
      {/* Actual Image */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            opacity: fadeIn ? fadeAnim : 1,
          },
        ]}
      >
        <Image
          {...props}
          source={imageSource}
          style={[
            {
              width,
              height,
              borderRadius,
            },
            style,
          ]}
          resizeMode={resizeMode}
          onLoadStart={handleLoadStart}
          onLoadEnd={handleLoadEnd}
          onError={handleError}
          accessible={true}
          accessibilityLabel={accessibilityLabel || 'Görsel'}
          accessibilityRole="image"
          testID={testID}
          // Performance optimizasyonları
          fadeDuration={0} // Kendi fade animasyonumuzu kullanıyoruz
          progressiveRenderingEnabled={true}
          // Android specific
          {...(Platform.OS === 'android' && {
            resizeMethod: 'resize',
          })}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorPlaceholder: {
    backgroundColor: '#f5f5f5',
  },
});

export default OptimizedImage;