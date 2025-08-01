import { useCallback, useMemo, useRef } from 'react';
import { InteractionManager, Platform } from 'react-native';

/**
 * Performance optimizasyonu için çeşitli yardımcı hook'lar
 */
export const usePerformanceOptimization = () => {
  
  /**
   * Expensive işlemleri interaction tamamlandıktan sonra çalıştır
   */
  const runAfterInteractions = useCallback((callback: () => void) => {
    InteractionManager.runAfterInteractions(() => {
      callback();
    });
  }, []);

  /**
   * Debounced function oluştur
   */
  const useDebounce = useCallback(<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): T => {
    const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
    
    return useCallback((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        func(...args);
      }, delay);
    }, [func, delay]) as T;
  }, []);

  /**
   * Throttled function oluştur
   */
  const useThrottle = useCallback(<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): T => {
    const inThrottleRef = useRef(false);
    
    return useCallback((...args: Parameters<T>) => {
      if (!inThrottleRef.current) {
        func(...args);
        inThrottleRef.current = true;
        setTimeout(() => {
          inThrottleRef.current = false;
        }, limit);
      }
    }, [func, limit]) as T;
  }, []);

  /**
   * Platform-specific performans ayarları
   */
  const getOptimalSettings = useMemo(() => {
    return {
      // FlatList optimizasyonları
      flatList: {
        initialNumToRender: Platform.OS === 'ios' ? 10 : 8,
        maxToRenderPerBatch: Platform.OS === 'ios' ? 8 : 6,
        windowSize: Platform.OS === 'ios' ? 10 : 8,
        updateCellsBatchingPeriod: Platform.OS === 'ios' ? 100 : 150,
        getItemLayout: (itemHeight: number) => (data: any, index: number) => ({
          length: itemHeight,
          offset: itemHeight * index,
          index,
        }),
      },
      // Image loading optimizasyonları
      image: {
        cachePolicy: 'memory-disk' as const,
        priority: 'normal' as const,
        resizeMode: 'cover' as const,
        fadeInDuration: Platform.OS === 'ios' ? 200 : 300,
      },
      // Animation optimizasyonları
      animation: {
        useNativeDriver: true,
        duration: Platform.OS === 'ios' ? 250 : 300,
      },
    };
  }, []);

  return {
    runAfterInteractions,
    useDebounce,
    useThrottle,
    getOptimalSettings,
  };
};