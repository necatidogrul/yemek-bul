import { useState, useCallback } from 'react';
import { useHaptics } from './useHaptics';
import { useAccessibility } from './useAccessibility';

export interface PullToRefreshOptions {
  onRefresh?: () => Promise<void>;
  enabled?: boolean;
  hapticFeedback?: boolean;
  refreshingText?: string;
  pullToRefreshText?: string;
  releaseToRefreshText?: string;
}

/**
 * Pull-to-refresh işlevselliği için özel hook
 * iOS standartlarına uygun olarak haptic feedback ve accessibility desteği ile
 */
export const usePullToRefresh = (options: PullToRefreshOptions = {}) => {
  const {
    onRefresh,
    enabled = true,
    hapticFeedback = true,
    refreshingText = 'Yenileniyor...',
    pullToRefreshText = 'Yenilemek için aşağı çekin',
    releaseToRefreshText = 'Yenilemek için bırakın',
  } = options;

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshText, setRefreshText] = useState(pullToRefreshText);
  
  const haptics = useHaptics();
  const { announceForAccessibility } = useAccessibility();

  /**
   * Refresh işlemini başlat
   */
  const handleRefresh = useCallback(async () => {
    if (!enabled || isRefreshing || !onRefresh) return;

    setIsRefreshing(true);
    setRefreshText(refreshingText);

    // Haptic feedback
    if (hapticFeedback) {
      await haptics.medium();
    }

    // Accessibility duyurusu
    announceForAccessibility('Sayfa yenileniyor');

    try {
      await onRefresh();
      
      // Başarı durumunda haptic feedback
      if (hapticFeedback) {
        await haptics.success();
      }
      
      announceForAccessibility('Sayfa başarıyla yenilendi');
    } catch (error) {
      console.error('Refresh error:', error);
      
      // Hata durumunda haptic feedback
      if (hapticFeedback) {
        await haptics.error();
      }
      
      announceForAccessibility('Sayfa yenileme sırasında hata oluştu');
    } finally {
      setIsRefreshing(false);
      setRefreshText(pullToRefreshText);
    }
  }, [
    enabled,
    isRefreshing,
    onRefresh,
    refreshingText,
    pullToRefreshText,
    hapticFeedback,
    haptics,
    announceForAccessibility,
  ]);

  /**
   * Refresh durumunu manuel olarak değiştir
   */
  const setRefreshing = useCallback((refreshing: boolean) => {
    setIsRefreshing(refreshing);
    setRefreshText(refreshing ? refreshingText : pullToRefreshText);
  }, [refreshingText, pullToRefreshText]);

  /**
   * Refresh metnini güncelle (pull durumuna göre)
   */
  const updateRefreshText = useCallback((isPulling: boolean, canRefresh: boolean) => {
    if (isRefreshing) {
      setRefreshText(refreshingText);
    } else if (isPulling && canRefresh) {
      setRefreshText(releaseToRefreshText);
    } else {
      setRefreshText(pullToRefreshText);
    }
  }, [isRefreshing, refreshingText, releaseToRefreshText, pullToRefreshText]);

  return {
    isRefreshing,
    refreshText,
    handleRefresh,
    setRefreshing,
    updateRefreshText,
    enabled,
  };
};