import { useCallback, useMemo, useRef } from 'react';
import { Platform, ListRenderItem, ViewToken } from 'react-native';
import { Logger } from '../services/LoggerService';

interface OptimizedFlatListOptions<T> {
  /** Item height (sabit yükseklik varsa) */
  itemHeight?: number;
  /** Estimated item size */
  estimatedItemSize?: number;
  /** Enable getItemLayout optimization */
  enableGetItemLayout?: boolean;
  /** Initial number to render */
  initialNumToRender?: number;
  /** Max to render per batch */
  maxToRenderPerBatch?: number;
  /** Window size */
  windowSize?: number;
  /** Update cells batching period */
  updateCellsBatchingPeriod?: number;
  /** Enable remove clipped subviews */
  removeClippedSubviews?: boolean;
  /** Key extractor function */
  keyExtractor?: (item: T, index: number) => string;
  /** Viewability config */
  viewabilityConfig?: {
    itemVisiblePercentThreshold?: number;
    minimumViewTime?: number;
  };
}

/**
 * FlatList performance optimizasyonları için hook
 */
export const useOptimizedFlatList = <T = any>(options: OptimizedFlatListOptions<T> = {}) => {
  const {
    itemHeight,
    estimatedItemSize = 100,
    enableGetItemLayout = false,
    initialNumToRender = Platform.OS === 'ios' ? 10 : 8,
    maxToRenderPerBatch = Platform.OS === 'ios' ? 8 : 6,
    windowSize = Platform.OS === 'ios' ? 10 : 8,
    updateCellsBatchingPeriod = Platform.OS === 'ios' ? 100 : 150,
    removeClippedSubviews = Platform.OS === 'android',
    keyExtractor = (item: any, index: number) => item?.id?.toString() || index.toString(),
    viewabilityConfig = {
      itemVisiblePercentThreshold: 50,
      minimumViewTime: 100,
    },
  } = options;

  // Viewable items tracking
  const viewableItemsRef = useRef<ViewToken[]>([]);

  /**
   * GetItemLayout optimizasyonu (sabit yükseklik gerekli)
   */
  const getItemLayout = useMemo(() => {
    if (!enableGetItemLayout || !itemHeight) return undefined;
    
    return (data: ArrayLike<T> | null | undefined, index: number) => ({
      length: itemHeight,
      offset: itemHeight * index,
      index,
    });
  }, [enableGetItemLayout, itemHeight]);

  /**
   * Render item wrapper - memoization için
   */
  const createRenderItem = useCallback(<ItemT = T>(
    renderItem: ListRenderItem<ItemT>
  ): ListRenderItem<ItemT> => {
    return ({ item, index, separators }) => {
      // Render item with performance optimizations
      return renderItem({ item, index, separators });
    };
  }, []);

  /**
   * Viewability değişiklik handler
   */
  const onViewableItemsChanged = useCallback(({ viewableItems, changed }: {
    viewableItems: ViewToken[];
    changed: ViewToken[];
  }) => {
    viewableItemsRef.current = viewableItems;
    
    // Debug için (production'da kaldırılabilir)
    if (__DEV__) {
      console.log(`Viewable items: ${viewableItems.length}, Changed: ${changed.length}`);
    }
  }, []);

  /**
   * Cell unmount sırasında cleanup
   */
  const onEndReached = useCallback((info: { distanceFromEnd: number }) => {
    // End reached logic here
    if (__DEV__) {
      console.log('End reached:', info.distanceFromEnd);
    }
  }, []);

  /**
   * Scroll performance ayarları
   */
  const scrollEventThrottle = useMemo(() => {
    return Platform.OS === 'ios' ? 16 : 32; // 60fps için 16ms, 30fps için 32ms
  }, []);

  /**
   * Optimized FlatList props
   */
  const optimizedProps = useMemo(() => ({
    // Performance props
    initialNumToRender,
    maxToRenderPerBatch,
    windowSize,
    updateCellsBatchingPeriod,
    removeClippedSubviews,
    scrollEventThrottle,
    
    // Item layout
    getItemLayout,
    keyExtractor,
    
    // Viewability
    viewabilityConfig,
    onViewableItemsChanged,
    
    // Other optimizations
    disableVirtualization: false,
    legacyImplementation: false,
    
    // Platform specific
    ...(Platform.OS === 'android' && {
      // Android specific optimizations
      persistentScrollbar: false,
    }),
    
    ...(Platform.OS === 'ios' && {
      // iOS specific optimizations
      automaticallyAdjustContentInsets: false,
      contentInsetAdjustmentBehavior: 'never' as const,
    }),
  }), [
    initialNumToRender,
    maxToRenderPerBatch,
    windowSize,
    updateCellsBatchingPeriod,
    removeClippedSubviews,
    scrollEventThrottle,
    getItemLayout,
    keyExtractor,
    viewabilityConfig,
    onViewableItemsChanged,
  ]);

  /**
   * Current viewable items
   */
  const getCurrentViewableItems = useCallback(() => {
    return viewableItemsRef.current;
  }, []);

  /**
   * Item görünür mü kontrol et
   */
  const isItemVisible = useCallback((itemId: string) => {
    return viewableItemsRef.current.some(viewable => 
      keyExtractor(viewable.item, viewable.index || 0) === itemId
    );
  }, [keyExtractor]);

  return {
    optimizedProps,
    createRenderItem,
    getCurrentViewableItems,
    isItemVisible,
    onEndReached,
    
    // Helper functions
    estimatedItemSize,
    scrollEventThrottle,
  };
};