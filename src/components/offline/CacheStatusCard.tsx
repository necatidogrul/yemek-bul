/**
 * Cache Status Card Component - React Native
 *
 * Cache durumunu ve istatistiklerini gösteren kart
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { MobileStorageService } from '../../services/localStorageService';
import { RecipeService } from '../../services/recipeService';

interface CacheStats {
  totalCachedRecipes: number;
  communityPoolHits: number;
  aiCacheHits: number;
  aiGenerationCount: number;
  mockFallbacks: number;
  storageUsed: string;
  lastCacheUpdate: string;
  cacheHitRate: number;
}

export const CacheStatusCard: React.FC = () => {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadCacheStats();
  }, []);

  const loadCacheStats = async () => {
    try {
      setIsLoading(true);
      const cacheStats = await calculateCacheStats();
      setStats(cacheStats);
    } catch (error) {
      console.error('Failed to load cache stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateCacheStats = async (): Promise<CacheStats> => {
    try {
      // Cache verilerini al
      const cache = await MobileStorageService.getSearchCache();
      const history = await MobileStorageService.getSearchHistory();

      // Cache boyutunu hesapla
      const cacheSize = JSON.stringify(cache).length;
      const storageUsed = `${(cacheSize / 1024).toFixed(1)} KB`;

      // Source type'lara göre ayır
      const communityPoolHits = history.filter(h => h.source === 'community_pool').length;
      const aiCacheHits = history.filter(h => h.source === 'ai_cache').length;
      const aiGenerationCount = history.filter(h => h.source === 'ai_generation').length;
      const mockFallbacks = history.filter(
        h => h.source === 'mock' || h.source === 'offline_mock',
      ).length;

      // Cache hit rate hesapla
      const totalSearches = history.length;
      const cacheHits = history.filter(h => h.source.includes('cached_')).length;
      const cacheHitRate = totalSearches > 0 ? (cacheHits / totalSearches) * 100 : 0;

      // Son cache update zamanı
      const cacheEntries = Object.values(cache);
      const lastUpdate =
        cacheEntries.length > 0
          ? Math.max(...cacheEntries.map(entry => entry.metadata.timestamp))
          : 0;

      return {
        totalCachedRecipes: Object.keys(cache).length,
        communityPoolHits,
        aiCacheHits,
        aiGenerationCount,
        mockFallbacks,
        storageUsed,
        lastCacheUpdate:
          lastUpdate > 0 ? new Date(lastUpdate).toLocaleString('tr-TR') : 'Henüz yok',
        cacheHitRate: Math.round(cacheHitRate),
      };
    } catch (error) {
      console.error('Cache stats calculation failed:', error);
      return {
        totalCachedRecipes: 0,
        communityPoolHits: 0,
        aiCacheHits: 0,
        aiGenerationCount: 0,
        mockFallbacks: 0,
        storageUsed: '0 KB',
        lastCacheUpdate: 'Bilinmiyor',
        cacheHitRate: 0,
      };
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCacheStats();
    setRefreshing(false);
  };

  const clearCache = () => {
    Alert.alert('Cache Temizle', 'Tüm kaydedilmiş tarifleri silmek istediğinizden emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            await RecipeService.clearMobileCache();
            await loadCacheStats();
            Alert.alert('Başarılı', 'Cache temizlendi');
          } catch (error) {
            Alert.alert('Hata', 'Cache temizlenemedi');
          }
        },
      },
    ]);
  };

  const clearAllData = () => {
    Alert.alert(
      'Tüm Verileri Sil',
      'Arama geçmişi, tercihler ve tüm kaydedilmiş veriler silinecek. Bu işlem geri alınamaz!',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Tümünü Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              await RecipeService.clearAllMobileData();
              await loadCacheStats();
              Alert.alert('Başarılı', 'Tüm veriler temizlendi');
            } catch (error) {
              Alert.alert('Hata', 'Veriler temizlenemedi');
            }
          },
        },
      ],
    );
  };

  if (isLoading || !stats) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Cache durumu yükleniyor...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.card}>
        <Text style={styles.title}>📦 Cache Durumu</Text>

        <View style={styles.statsContainer}>
          <StatItem
            label="Kaydedilmiş Tarif"
            value={stats.totalCachedRecipes.toString()}
            icon="🥘"
          />

          <StatItem
            label="Cache Hit Rate"
            value={`%${stats.cacheHitRate}`}
            icon="⚡"
            color={stats.cacheHitRate > 50 ? '#4CAF50' : '#FF9800'}
          />

          <StatItem label="Storage Kullanımı" value={stats.storageUsed} icon="💾" />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kaynak Dağılımı</Text>

          <SourceItem
            label="Community Pool"
            count={stats.communityPoolHits}
            icon="🌍"
            color="#2196F3"
          />

          <SourceItem label="AI Cache" count={stats.aiCacheHits} icon="🧠" color="#9C27B0" />

          <SourceItem
            label="AI Generation"
            count={stats.aiGenerationCount}
            icon="✨"
            color="#FF5722"
          />

          <SourceItem label="Mock/Offline" count={stats.mockFallbacks} icon="📱" color="#607D8B" />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Son Güncelleme</Text>
          <Text style={styles.lastUpdate}>{stats.lastCacheUpdate}</Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionButton} onPress={clearCache}>
            <Text style={styles.actionButtonText}>Cache Temizle</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.dangerButton]}
            onPress={clearAllData}
          >
            <Text style={[styles.actionButtonText, styles.dangerButtonText]}>Tüm Verileri Sil</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const StatItem: React.FC<{
  label: string;
  value: string;
  icon: string;
  color?: string;
}> = ({ label, value, icon, color }) => (
  <View style={styles.statItem}>
    <Text style={styles.statIcon}>{icon}</Text>
    <View style={styles.statContent}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, color && { color }]}>{value}</Text>
    </View>
  </View>
);

const SourceItem: React.FC<{
  label: string;
  count: number;
  icon: string;
  color: string;
}> = ({ label, count, icon, color }) => (
  <View style={styles.sourceItem}>
    <View style={styles.sourceIcon}>
      <Text style={styles.sourceIconText}>{icon}</Text>
    </View>
    <View style={styles.sourceContent}>
      <Text style={styles.sourceLabel}>{label}</Text>
      <Text style={[styles.sourceCount, { color }]}>{count}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    marginTop: 20,
  },
  card: {
    backgroundColor: 'white',
    margin: 15,
    borderRadius: 12,
    padding: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  statsContainer: {
    marginBottom: 20,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  sourceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  sourceIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sourceIconText: {
    fontSize: 16,
  },
  sourceContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sourceLabel: {
    fontSize: 14,
    color: '#666',
  },
  sourceCount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  lastUpdate: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  actionButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 0.45,
  },
  actionButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
  },
  dangerButton: {
    backgroundColor: '#f44336',
  },
  dangerButtonText: {
    color: 'white',
  },
});

export default CacheStatusCard;
