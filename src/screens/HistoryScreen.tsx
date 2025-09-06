import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Logger } from '../services/LoggerService';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StackNavigationProp } from '@react-navigation/stack';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

// Services & Types
import { HistoryService } from '../services/historyService';
import { FavoritesService } from '../services/FavoritesService';
import {
  AIRequestHistory,
  HistoryStats,
  HistoryFilter,
} from '../types/History';
import { Recipe } from '../types/Recipe';

// UI Components
import { Text, Card, Button } from '../components/ui';
import { EmptyState } from '../components/ui/EmptyState';
import { FavoriteButton } from '../components/ui/FavoriteButton';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { usePremium } from '../contexts/PremiumContext';
import { useToast } from '../contexts/ToastContext';
import {
  spacing,
  borderRadius,
  shadows,
  typography,
} from '../theme/design-tokens';

const { width: screenWidth } = Dimensions.get('window');

interface HistoryScreenProps {
  navigation: StackNavigationProp<any, 'History'>;
}

type ViewMode = 'list' | 'stats';

const HistoryScreen: React.FC<HistoryScreenProps> = ({ navigation }) => {
  const [history, setHistory] = useState<AIRequestHistory[]>([]);
  const [stats, setStats] = useState<HistoryStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [filter, setFilter] = useState<HistoryFilter>({ dateRange: 'all' });
  const [popularCombinations, setPopularCombinations] = useState<
    Array<{
      ingredients: string[];
      count: number;
      successRate: number;
    }>
  >([]);

  // Animation values
  const fadeAnim = useState(() => new Animated.Value(0))[0];
  const slideAnim = useState(() => new Animated.Value(50))[0];

  const { colors, isDark } = useThemedStyles();
  const {
    isPremium,
    showPaywall,
    refreshPremiumStatus,
    isLoading: premiumLoading,
  } = usePremium();
  const { showSuccess, showError } = useToast();
  const { t } = useTranslation();

  const debugLog = (message: string, data?: any) => {
    if (__DEV__) {
      Logger.info(`[HistoryScreen] ${message}`, data || '');
    }
  };

  // Premium kontrolü basit yöntemle - favoriler gibi
  const hasHistoryAccess = isPremium;

  // Convert history recipe to full Recipe type
  const convertToFullRecipe = (historyRecipe: any): Recipe => ({
    id: historyRecipe.id,
    name: historyRecipe.name,
    ingredients: [], // History doesn't store ingredients
    instructions: [], // History doesn't store instructions
    difficulty: historyRecipe.difficulty || 'kolay',
    cookingTime: historyRecipe.cookingTime,
    source: 'ai' as const,
  });

  useEffect(() => {
    if (!hasHistoryAccess) {
      // Premium gerektiren özellik için paywall göster
      return;
    }
    loadHistoryData();
  }, [filter, hasHistoryAccess]);

  // Premium durumu değiştiğinde geçmişi yeniden yükle
  useEffect(() => {
    if (isPremium && !isLoading) {
      debugLog('Premium status changed to active, reloading history');
      loadHistoryData();
    }
  }, [isPremium]);

  useEffect(() => {
    // Start entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const loadHistoryData = useCallback(async () => {
    if (!hasHistoryAccess) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const [historyData, statsData, popularData] = await Promise.all([
        HistoryService.getHistory(filter),
        HistoryService.getStats(isPremium), // Premium istatistikler dahil
        HistoryService.getPopularCombinations(5),
      ]);

      setHistory(historyData);
      setStats(statsData);
      setPopularCombinations(popularData);
    } catch (error) {
      Logger.error('History loading error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [hasHistoryAccess, filter, isPremium]);

  // Screen focus'ta premium durumunu kontrol et ve geçmişi yenile
  useFocusEffect(
    useCallback(() => {
      if (!isLoading && !premiumLoading) {
        debugLog('HistoryScreen focused, refreshing premium status and history');
        // Premium durumunu force refresh yap
        refreshPremiumStatus?.(true).then(() => {
          // Geçmiş verilerini de yeniden yükle
          if (hasHistoryAccess) {
            loadHistoryData();
          }
        });
      }
    }, [isLoading, premiumLoading, hasHistoryAccess, refreshPremiumStatus, loadHistoryData])
  );

  const handleViewResults = useCallback(
    (item: AIRequestHistory) => {
      if (item.success && item.results.recipes.length > 0) {
        // Sonuçları direkt göster
        navigation.navigate('RecipeResults', {
          ingredients: item.ingredients,
          aiRecipes: item.results.recipes,
          fromHistory: true,
        });
      } else {
        // Başarısız aramalar için ana sayfaya yönlendir
        navigation.getParent()?.navigate('HomeTab', {
          screen: 'HomeMain',
          params: { prefillIngredients: item.ingredients },
        });
      }
    },
    [navigation]
  );

  // Favorileme fonksiyonu - premium kontrolü ile
  const handleAddToFavorites = async (recipe: any) => {
    if (!isPremium) {
      showPaywall();
      return;
    }

    try {
      const result = await FavoritesService.addToFavorites(
        convertToFullRecipe(recipe)
      );
      if (result.success) {
        showSuccess(result.message || t('historyScreen.addedToFavorites'));
      } else {
        showError(result.message || t('historyScreen.failedToAddFavorite'));
      }
    } catch (error) {
      showError(t('historyScreen.failedToAddFavorite'));
    }
  };

  const handleDeleteItem = useCallback(async (id: string) => {
    Alert.alert(
      t('historyScreen.deleteTitle'),
      t('historyScreen.deleteMessage'),
      [
        { text: t('historyScreen.cancel'), style: 'cancel' },
        {
          text: t('historyScreen.delete'),
          style: 'destructive',
          onPress: async () => {
            await HistoryService.deleteRequest(id);
            loadHistoryData();
          },
        },
      ]
    );
  }, []);

  const handleClearHistory = useCallback(() => {
    Alert.alert(
      t('historyScreen.clearAllTitle'),
      t('historyScreen.clearAllMessage'),
      [
        { text: t('historyScreen.cancel'), style: 'cancel' },
        {
          text: t('historyScreen.deleteAll'),
          style: 'destructive',
          onPress: async () => {
            await HistoryService.clearHistory();
            loadHistoryData();
          },
        },
      ]
    );
  }, []);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return t('historyScreen.today');
    if (diffDays === 2) return t('historyScreen.yesterday');
    if (diffDays <= 7) return t('historyScreen.daysAgo', { days: diffDays - 1 });

    return date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const renderHistoryItem = ({ item }: { item: AIRequestHistory }) => (
    <TouchableOpacity
      style={[styles.historyCard, { backgroundColor: colors.surface.primary }]}
      onPress={() => handleViewResults(item)}
      activeOpacity={0.9}
    >
      <View style={styles.historyCardHeader}>
        <View style={styles.statusBadge}>
          <View
            style={[
              styles.statusIndicator,
              {
                backgroundColor: item.success
                  ? colors.success[500]
                  : colors.error[500],
              },
            ]}
          />
          <Text variant='labelSmall' color='secondary'>
            {formatDate(item.timestamp)}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={e => {
            e.stopPropagation();
            handleDeleteItem(item.id);
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name='trash-outline' size={16} color={colors.error[400]} />
        </TouchableOpacity>
      </View>

      <View style={styles.historyContent}>
        <Text
          variant='bodyMedium'
          weight='600'
          numberOfLines={1}
          style={{ color: colors.text.primary }}
        >
          {item.ingredients.join(', ')}
        </Text>

        <View style={styles.historyStats}>
          <View
            style={[
              styles.resultBadge,
              {
                backgroundColor: item.success
                  ? (isDark ? 'rgba(34, 197, 94, 0.15)' : colors.success[50])
                  : (isDark ? 'rgba(239, 68, 68, 0.15)' : colors.error[50]),
              },
            ]}
          >
            <Ionicons
              name={item.success ? 'checkmark-circle' : 'close-circle'}
              size={12}
              color={item.success ? colors.success[600] : colors.error[600]}
            />
            <Text
              variant='labelSmall'
              style={{
                color: item.success ? colors.success[700] : colors.error[700],
              }}
            >
              {item.results.count} {t('historyScreen.recipes')}
            </Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={styles.viewButton}
        onPress={e => {
          e.stopPropagation();
          handleViewResults(item);
        }}
      >
        <Ionicons
          name={item.success ? 'eye' : 'refresh'}
          size={18}
          color={colors.primary[600]}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderStatsView = () => {
    if (!stats) return null;

    const successRate =
      stats.totalRequests > 0
        ? (stats.successfulRequests / stats.totalRequests) * 100
        : 0;

    return (
      <Animated.View
        style={[
          styles.statsContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        {/* Stats Overview */}
        <Card variant='elevated' size='lg' style={styles.statsOverview}>
          <View style={styles.statsOverviewHeader}>
            <LinearGradient
              colors={[colors.primary[500], colors.primary[600]]}
              style={styles.statsOverviewIcon}
            >
              <Ionicons name='analytics' size={24} color='white' />
            </LinearGradient>
            <View>
              <Text variant='headlineSmall' weight='bold' color='primary'>
                {t('historyScreen.searchStatistics')}
              </Text>
              <Text variant='bodySmall' color='secondary'>
                {t('historyScreen.totalActivity')}
              </Text>
            </View>
          </View>

          <View style={styles.statsOverviewGrid}>
            <View style={styles.statItem}>
              <Text variant='headlineLarge' weight='bold' color='primary'>
                {stats.totalRequests}
              </Text>
              <Text variant='labelSmall' color='secondary' align='center'>
                {t('historyScreen.totalSearches')}
              </Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Text variant='headlineLarge' weight='bold' color='success'>
                {stats.successfulRequests}
              </Text>
              <Text variant='labelSmall' color='secondary' align='center'>
                {t('historyScreen.successful')}
              </Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Text variant='headlineLarge' weight='bold' color='warning'>
                {stats.totalRecipesGenerated}
              </Text>
              <Text variant='labelSmall' color='secondary' align='center'>
                {t('historyScreen.recipesFound')}
              </Text>
            </View>
          </View>

          <View style={styles.successRateContainer}>
            <View style={styles.successRateInfo}>
              <Text variant='bodySmall' color='secondary'>
                {t('historyScreen.successRate')}
              </Text>
              <Text variant='headlineSmall' weight='bold' color='primary'>
                %{Math.round(successRate)}
              </Text>
            </View>
            <View style={styles.successRateBar}>
              <View
                style={[
                  styles.successRateFill,
                  {
                    width: `${successRate}%`,
                    backgroundColor:
                      successRate >= 70
                        ? colors.success[500]
                        : successRate >= 40
                          ? colors.warning[500]
                          : colors.error[500],
                  },
                ]}
              />
            </View>
          </View>
        </Card>

        {/* Quick Stats Grid */}
        <View style={styles.quickStatsGrid}>
          <Card variant='elevated' size='md' style={styles.quickStatCard}>
            <View
              style={[
                styles.quickStatIcon,
                { backgroundColor: colors.primary[50] },
              ]}
            >
              <Ionicons name='search' size={20} color={colors.primary[600]} />
            </View>
            <Text variant='bodyMedium' weight='bold' color='primary'>
              {stats.totalRequests}
            </Text>
            <Text variant='labelSmall' color='secondary' align='center'>
              {t('historyScreen.totalSearches')}
            </Text>
          </Card>

          <Card variant='elevated' size='md' style={styles.quickStatCard}>
            <View
              style={[
                styles.quickStatIcon,
                { backgroundColor: colors.success[50] },
              ]}
            >
              <Ionicons
                name='checkmark-circle'
                size={20}
                color={colors.success[600]}
              />
            </View>
            <Text variant='bodyMedium' weight='bold' color='success'>
              {stats.successfulRequests}
            </Text>
            <Text variant='labelSmall' color='secondary' align='center'>
              {t('historyScreen.successful')}
            </Text>
          </Card>

          <Card variant='elevated' size='md' style={styles.quickStatCard}>
            <View
              style={[
                styles.quickStatIcon,
                { backgroundColor: colors.warning[50] },
              ]}
            >
              <Ionicons
                name='restaurant'
                size={20}
                color={colors.warning[600]}
              />
            </View>
            <Text variant='bodyMedium' weight='bold' color='warning'>
              {stats.totalRecipesGenerated}
            </Text>
            <Text variant='labelSmall' color='secondary' align='center'>
              {t('historyScreen.recipes')}
            </Text>
          </Card>
        </View>

        {/* Most Used Ingredients */}
        {stats.mostUsedIngredients.length > 0 && (
          <Card variant='elevated' size='lg' style={styles.statsSection}>
            <View style={styles.statsSectionHeader}>
              <LinearGradient
                colors={[colors.primary[500], colors.primary[600]]}
                style={styles.sectionIcon}
              >
                <Ionicons name='star' size={18} color='white' />
              </LinearGradient>
              <View>
                <Text variant='headlineSmall' weight='bold' color='primary'>
                  {t('historyScreen.mostUsed')}
                </Text>
                <Text variant='bodySmall' color='secondary'>
                  {t('historyScreen.yourFavoriteIngredients')}
                </Text>
              </View>
            </View>

            <View style={styles.ingredientsStats}>
              {stats.mostUsedIngredients.slice(0, 5).map((item, index) => {
                const maxCount = Math.max(
                  ...stats.mostUsedIngredients.map(i => i.count)
                );
                const percentage = (item.count / maxCount) * 100;

                return (
                  <View key={item.ingredient} style={styles.ingredientStat}>
                    <View style={styles.ingredientStatContent}>
                      <View style={styles.ingredientStatInfo}>
                        <Text
                          variant='bodyMedium'
                          weight='semibold'
                          color='primary'
                        >
                          {item.ingredient}
                        </Text>
                        <Text variant='labelSmall' color='secondary'>
                          {t('historyScreen.usedTimes', { count: item.count })}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.ingredientStatBadge,
                          { backgroundColor: colors.primary[500] },
                        ]}
                      >
                        <Text
                          variant='labelSmall'
                          weight='bold'
                          style={{ color: 'white' }}
                        >
                          {item.count}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.ingredientStatBar}>
                      <View
                        style={[
                          styles.ingredientStatBarFill,
                          {
                            width: `${percentage}%`,
                            backgroundColor: colors.primary[400],
                          },
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          </Card>
        )}

        {/* Popular Combinations */}
        {popularCombinations.length > 0 && (
          <Card variant='elevated' size='lg' style={styles.statsSection}>
            <View style={styles.statsSectionHeader}>
              <LinearGradient
                colors={[colors.success[500], colors.success[600]]}
                style={styles.sectionIcon}
              >
                <Ionicons name='trending-up' size={18} color='white' />
              </LinearGradient>
              <View>
                <Text variant='headlineSmall' weight='bold' color='primary'>
                  {t('historyScreen.popularCombinations')}
                </Text>
                <Text variant='bodySmall' color='secondary'>
                  {t('historyScreen.successfulIngredientGroups')}
                </Text>
              </View>
            </View>

            <View style={styles.combinationsStats}>
              {popularCombinations.map((combo, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.combinationItem}
                  onPress={() =>
                    navigation.getParent()?.navigate('HomeTab', {
                      screen: 'HomeMain',
                      params: { prefillIngredients: combo.ingredients },
                    })
                  }
                  activeOpacity={0.7}
                >
                  <View style={styles.combinationHeader}>
                    <View style={styles.combinationRank}>
                      <Text
                        variant='labelSmall'
                        weight='bold'
                        style={{ color: colors.success[600] }}
                      >
                        #{index + 1}
                      </Text>
                    </View>
                    <View style={styles.combinationStats}>
                      <View style={styles.combinationStat}>
                        <Text variant='labelSmall' color='secondary'>
                          {t('historyScreen.times', { count: combo.count })}
                        </Text>
                      </View>
                      <View style={styles.combinationStat}>
                        <Text
                          variant='labelSmall'
                          weight='medium'
                          style={{
                            color:
                              combo.successRate >= 0.7
                                ? colors.success[600]
                                : combo.successRate >= 0.4
                                  ? colors.warning[600]
                                  : colors.error[600],
                          }}
                        >
                          {t('historyScreen.successPercentage', { percentage: Math.round(combo.successRate * 100) })}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.combinationIngredients}>
                    {combo.ingredients.slice(0, 3).map((ingredient, idx) => (
                      <View
                        key={idx}
                        style={[
                          styles.miniChip,
                          {
                            backgroundColor: colors.success[50],
                            borderColor: colors.success[200],
                          },
                        ]}
                      >
                        <Text
                          variant='labelSmall'
                          weight='medium'
                          style={{ color: colors.success[700] }}
                        >
                          {ingredient}
                        </Text>
                      </View>
                    ))}
                    {combo.ingredients.length > 3 && (
                      <View
                        style={[
                          styles.miniChip,
                          { backgroundColor: colors.surface.secondary },
                        ]}
                      >
                        <Text
                          variant='labelSmall'
                          weight='medium'
                          style={{ color: colors.neutral[600] }}
                        >
                          +{combo.ingredients.length - 3}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.combinationAction}>
                    <Text variant='labelSmall' color='secondary'>
                      {t('historyScreen.tryAgain')}
                    </Text>
                    <Ionicons
                      name='chevron-forward'
                      size={14}
                      color={colors.success[500]}
                    />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </Card>
        )}

        {/* Premium Analytics */}
        {isPremium && stats?.totalTokensUsed !== undefined && (
          <Card variant='elevated' size='lg' style={styles.statsSection}>
            <View style={styles.statsSectionHeader}>
              <LinearGradient
                colors={['#FFD700', '#FFA500']}
                style={styles.sectionIcon}
              >
                <Ionicons name='analytics' size={18} color='white' />
              </LinearGradient>
              <View>
                <Text variant='headlineSmall' weight='bold' color='primary'>
                  {t('historyScreen.premiumAnalytics')}
                </Text>
                <Text variant='bodySmall' color='secondary'>
                  {t('historyScreen.detailedUsageStats')}
                </Text>
              </View>
            </View>

            <View style={styles.premiumAnalytics}>
              {/* Token Usage */}
              <View style={styles.analyticsRow}>
                <View style={styles.analyticsItem}>
                  <Text variant='bodySmall' color='secondary'>
                    {t('historyScreen.totalTokens')}
                  </Text>
                  <Text variant='headlineSmall' weight='bold' color='primary'>
                    {stats.totalTokensUsed?.toLocaleString() || '0'}
                  </Text>
                </View>
                <View style={styles.analyticsItem}>
                  <Text variant='bodySmall' color='secondary'>
                    {t('historyScreen.avgResponseTime')}
                  </Text>
                  <Text variant='headlineSmall' weight='bold' color='primary'>
                    {Math.round(stats.averageResponseTime || 0)}ms
                  </Text>
                </View>
              </View>

              {/* Weekly Activity */}
              {stats.weeklyActivity && stats.weeklyActivity.length > 0 && (
                <View style={styles.weeklyActivityContainer}>
                  <Text variant='bodyMedium' weight='semibold' color='primary'>
                    {t('historyScreen.weeklyActivity')}
                  </Text>
                  <View style={styles.weeklyActivity}>
                    {[t('historyScreen.days.sun'), t('historyScreen.days.mon'), t('historyScreen.days.tue'), t('historyScreen.days.wed'), t('historyScreen.days.thu'), t('historyScreen.days.fri'), t('historyScreen.days.sat')].map(
                      (day, index) => {
                        const dayData = stats.weeklyActivity?.find(
                          d => d.day === index
                        );
                        const count = dayData?.count || 0;
                        const maxCount = Math.max(
                          ...(stats.weeklyActivity?.map(d => d.count) || [1])
                        );
                        const height = Math.max(4, (count / maxCount) * 40);

                        return (
                          <View key={day} style={styles.weeklyActivityItem}>
                            <View
                              style={[
                                styles.weeklyActivityBar,
                                {
                                  height,
                                  backgroundColor:
                                    count > 0
                                      ? colors.primary[500]
                                      : colors.border.medium,
                                },
                              ]}
                            />
                            <Text variant='labelSmall' color='secondary'>
                              {day}
                            </Text>
                          </View>
                        );
                      }
                    )}
                  </View>
                </View>
              )}

              {/* Monthly Trends */}
              {stats.monthlyTrends && stats.monthlyTrends.length > 0 && (
                <View style={styles.monthlyTrendsContainer}>
                  <Text variant='bodyMedium' weight='semibold' color='primary'>
                    {t('historyScreen.monthlyTrend')}
                  </Text>
                  <View style={styles.monthlyTrends}>
                    {stats.monthlyTrends.map((month, index) => (
                      <View key={index} style={styles.monthlyTrendItem}>
                        <Text variant='labelSmall' color='secondary'>
                          {month.month}
                        </Text>
                        <Text
                          variant='bodyMedium'
                          weight='semibold'
                          color='primary'
                        >
                          {month.requests}
                        </Text>
                        <Text
                          variant='labelSmall'
                          style={{
                            color:
                              month.success > month.requests * 0.7
                                ? colors.success[600]
                                : colors.warning[600],
                          }}
                        >
                          %
                          {Math.round(
                            (month.success / (month.requests || 1)) * 100
                          )}{' '}
                          {t('historyScreen.success')}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
          </Card>
        )}
      </Animated.View>
    );
  };

  const renderFilterBar = () => (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      <Card variant='elevated' size='md' style={styles.filterBar}>
        <View style={styles.filterContent}>
          <View style={styles.filterHeader}>
            <Ionicons name='funnel' size={16} color={colors.primary[500]} />
            <Text variant='bodySmall' weight='semibold' color='primary'>
              {t('historyScreen.timeFilter')}
            </Text>
          </View>
          <View style={styles.filterButtons}>
            {[
              { key: 'all', label: t('historyScreen.filterOptions.all'), icon: 'infinite' },
              { key: 'today', label: t('historyScreen.filterOptions.today'), icon: 'today' },
              { key: 'week', label: t('historyScreen.filterOptions.thisWeek'), icon: 'calendar' },
              { key: 'month', label: t('historyScreen.filterOptions.thisMonth'), icon: 'calendar-outline' },
            ].map(item => (
              <TouchableOpacity
                key={item.key}
                style={[
                  styles.filterButton,
                  {
                    backgroundColor:
                      filter.dateRange === item.key
                        ? colors.primary[500]
                        : colors.surface.secondary,
                    borderColor:
                      filter.dateRange === item.key
                        ? colors.primary[500]
                        : colors.border.light,
                  },
                ]}
                onPress={() =>
                  setFilter({ ...filter, dateRange: item.key as any })
                }
                activeOpacity={0.8}
              >
                <Ionicons
                  name={item.icon as any}
                  size={12}
                  color={
                    filter.dateRange === item.key
                      ? 'white'
                      : colors.neutral[600]
                  }
                />
                <Text
                  variant='labelSmall'
                  weight='medium'
                  style={{
                    color:
                      filter.dateRange === item.key
                        ? 'white'
                        : colors.neutral[700],
                  }}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Card>
    </Animated.View>
  );

  // Premium olmayan kullanıcılar için paywall - Clean Style
  if (!hasHistoryAccess) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: colors.background.primary },
        ]}
      >
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

        {/* Header - Exact Copy from SettingsScreen */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: colors.surface.primary,
              borderBottomColor: colors.border.light,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.backButtonContainer,
                { backgroundColor: colors.surface.secondary },
              ]}
            >
              <Ionicons
                name='arrow-back'
                size={22}
                color={colors.text.primary}
              />
            </View>
          </TouchableOpacity>
          <Text
            variant='headlineSmall'
            weight='bold'
            style={{ color: colors.text.primary }}
          >
            {t('historyScreen.title')}
          </Text>
          <View style={styles.headerRight} />
        </View>

        {/* Scrollable Premium Required Content */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.premiumScrollContent}
          bounces={true}
        >
          <View style={styles.premiumRequiredContainer}>
            <LinearGradient
              colors={[colors.primary[500], colors.primary[600]]}
              style={styles.premiumMainIcon}
            >
              <Ionicons name='time' size={40} color='white' />
            </LinearGradient>

            <Text
              variant='displaySmall'
              weight='bold'
              color='primary'
              align='center'
            >
              {t('historyScreen.premium.title')}
            </Text>

            <Text
              variant='bodyLarge'
              color='secondary'
              align='center'
              style={styles.premiumDescription}
            >
              {t('historyScreen.premium.description')}
            </Text>

            <View style={styles.premiumFeaturesList}>
              {[
                t('historyScreen.premium.features.viewAll'),
                t('historyScreen.premium.features.detailedStats'),
                t('historyScreen.premium.features.popularCombos'),
                t('historyScreen.premium.features.activityReports'),
                t('historyScreen.premium.features.findSuccessful'),
              ].map((feature, index) => (
                <View key={index} style={styles.premiumFeatureItem}>
                  <Ionicons
                    name='checkmark-circle'
                    size={20}
                    color={colors.success[500]}
                  />
                  <Text
                    variant='bodyMedium'
                    style={{ flex: 1, marginLeft: 12 }}
                  >
                    {feature}
                  </Text>
                </View>
              ))}
            </View>

            <LinearGradient
              colors={[colors.primary[500], colors.primary[600]]}
              style={styles.premiumButton}
            >
              <TouchableOpacity
                style={styles.premiumButtonContent}
                onPress={() => showPaywall()}
              >
                <Ionicons name='time' size={20} color='white' />
                <Text
                  variant='headlineSmall'
                  weight='bold'
                  style={{ color: 'white' }}
                >
                  {t('historyScreen.premium.upgradeToPremium')}
                </Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: colors.background.primary },
        ]}
      >
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

        {/* Header - Exact Copy from SettingsScreen */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: colors.surface.primary,
              borderBottomColor: colors.border.light,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.backButtonContainer,
                { backgroundColor: colors.surface.secondary },
              ]}
            >
              <Ionicons
                name='arrow-back'
                size={22}
                color={colors.text.primary}
              />
            </View>
          </TouchableOpacity>
          <Text
            variant='headlineSmall'
            weight='bold'
            style={{ color: colors.text.primary }}
          >
            {t('historyScreen.title')}
          </Text>
          <View style={styles.headerRight} />
        </View>

        <View style={styles.loadingContainer}>
          <ActivityIndicator size='large' color={colors.primary[500]} />
          <Text
            variant='bodyMedium'
            style={{ marginTop: spacing[3], color: colors.neutral[500] }}
          >
            {t('historyScreen.loadingHistory')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background.primary }]}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header - Exact Copy from SettingsScreen */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.surface.primary,
            borderBottomColor: colors.border.light,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.backButtonContainer,
              { backgroundColor: colors.surface.secondary },
            ]}
          >
            <Ionicons name='arrow-back' size={22} color={colors.text.primary} />
          </View>
        </TouchableOpacity>
        <Text
          variant='headlineSmall'
          weight='bold'
          style={{ color: colors.text.primary }}
        >
          {t('historyScreen.title')}
        </Text>
        <View style={styles.headerRight}>
          {/* View Mode Toggle */}
          <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                viewMode === 'list' && styles.toggleActive,
              ]}
              onPress={() => {
                setViewMode('list');
              }}
            >
              <Ionicons
                name='list'
                size={18}
                color={
                  viewMode === 'list'
                    ? colors.primary[600]
                    : colors.neutral[400]
                }
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                viewMode === 'stats' && styles.toggleActive,
              ]}
              onPress={() => {
                setViewMode('stats');
              }}
            >
              <Ionicons
                name='stats-chart'
                size={16}
                color={
                  viewMode === 'stats'
                    ? colors.primary[600]
                    : colors.neutral[400]
                }
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Search and Clear Actions */}
      <View style={styles.actionBar}>
        <View style={styles.searchContainer}>
          <View
            style={[styles.searchBar, { backgroundColor: colors.surface.secondary }]}
          >
            <Ionicons name='search' size={18} color={colors.text.tertiary} />
            <Text
              style={{
                ...styles.searchInput,
                color: colors.text.tertiary,
              }}
            >
              {t('historyScreen.searchPlaceholder')}
            </Text>
          </View>

          {history.length > 0 && (
            <TouchableOpacity
              style={[
                styles.clearButton,
                { backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : colors.error[100] },
              ]}
              onPress={handleClearHistory}
            >
              <Ionicons name='trash' size={16} color={colors.error[500]} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size='large' color={colors.primary[500]} />
          <Text
            variant='bodyMedium'
            style={{ marginTop: spacing[3], color: colors.neutral[500] }}
          >
            {t('historyScreen.loadingHistory')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={viewMode === 'list' ? history : []}
          renderItem={({ item }) => renderHistoryItem({ item })}
          contentContainerStyle={[
            styles.listContainer,
            history.length === 0 && {
              flex: 1,
              justifyContent: 'center',
            },
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={() =>
            viewMode === 'list' ? (
              <EmptyState
                type='no-history'
                actions={[
                  {
                    label: t('historyScreen.makeFirstSearch'),
                    onPress: () => navigation.getParent()?.navigate('HomeTab'),
                    icon: 'search-outline',
                  },
                ]}
              />
            ) : null
          }
          ListHeaderComponent={
            viewMode === 'stats' ? () => renderStatsView() : null
          }
          ItemSeparatorComponent={() => <View style={{ height: spacing[2] }} />}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header - Exact Copy from SettingsScreen
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    ...shadows.xs,
  },
  backButton: {
    padding: spacing[2],
  },
  backButtonContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: spacing[4],
  },
  headerRight: {
    width: 80,
  },

  // Action Bar for Search
  actionBar: {
    backgroundColor: 'transparent',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: borderRadius.md,
    padding: 2,
  },
  toggleButton: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md - 2,
  },
  toggleActive: {
    backgroundColor: 'white',
    ...shadows.sm,
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
    gap: spacing[2],
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.lg,
    gap: spacing[1],
  },

  // Filter Bar
  filterBar: {
    marginHorizontal: spacing[4],
    marginBottom: spacing[4],
  },
  filterContent: {
    gap: spacing[3],
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  filterButtons: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.lg,
    flex: 1,
    justifyContent: 'center',
    gap: spacing[1],
    borderWidth: 1,
    ...shadows.xs,
  },

  // Content
  listContainer: {
    padding: spacing[3],
  },

  // History Card
  historyCard: {
    flexDirection: 'row',
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    ...shadows.sm,
    alignItems: 'center',
  },
  historyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'absolute',
    top: spacing[2],
    left: spacing[3],
    right: spacing[3],
    zIndex: 1,
  },
  historyContent: {
    flex: 1,
    paddingTop: spacing[5],
    paddingRight: spacing[3],
  },
  historyStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[1],
  },
  viewButton: {
    justifyContent: 'center',
    paddingHorizontal: spacing[2],
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  statusIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  deleteButton: {
    padding: spacing[1],
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  resultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
    gap: spacing[1],
  },

  // Stats View
  statsContainer: {
    paddingHorizontal: spacing[4],
    gap: spacing[5],
  },

  // Stats Overview
  statsOverview: {
    gap: spacing[4],
  },
  statsOverviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  statsOverviewIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsOverviewGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    gap: spacing[1],
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(128,128,128,0.2)',
    marginHorizontal: spacing[2],
  },
  successRateContainer: {
    gap: spacing[2],
  },
  successRateInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  successRateBar: {
    height: 6,
    backgroundColor: 'rgba(128,128,128,0.15)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  successRateFill: {
    height: '100%',
    borderRadius: 3,
  },

  // Quick Stats
  quickStatsGrid: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  quickStatCard: {
    flex: 1,
    alignItems: 'center',
    gap: spacing[2],
    paddingVertical: spacing[4],
  },
  quickStatIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Stats Sections
  statsSection: {
    gap: spacing[4],
  },
  statsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Ingredients Stats
  ingredientsStats: {
    gap: spacing[4],
  },
  ingredientStat: {
    gap: spacing[2],
  },
  ingredientStatContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ingredientStatInfo: {
    flex: 1,
    gap: spacing[0.5],
  },
  ingredientStatBadge: {
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1.5],
    borderRadius: borderRadius.full,
    minWidth: 36,
    alignItems: 'center',
    ...shadows.xs,
  },
  ingredientStatBar: {
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  ingredientStatBarFill: {
    height: '100%',
    borderRadius: 2,
  },

  // Combinations
  combinationsStats: {
    gap: spacing[3],
  },
  combinationItem: {
    gap: spacing[3],
    padding: spacing[4],
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    ...shadows.xs,
  },
  combinationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  combinationRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  combinationStats: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  combinationStat: {
    alignItems: 'flex-end',
  },
  combinationIngredients: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[1.5],
  },
  miniChip: {
    paddingHorizontal: spacing[2.5],
    paddingVertical: spacing[1.5],
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  combinationAction: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },

  // Loading & Empty States - Clean Style
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingSubtext: {
    marginTop: spacing[2],
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[8],
  },
  emptyIllustration: {
    position: 'relative',
    marginBottom: spacing[6],
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
  emptyDecorations: {
    position: 'absolute',
    top: -10,
    right: -10,
    flexDirection: 'row',
    gap: spacing[1],
  },
  emptyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  emptyDotLarge: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  emptyContent: {
    alignItems: 'center',
    gap: spacing[3],
    marginBottom: spacing[6],
  },
  emptyDescription: {
    maxWidth: 260,
    lineHeight: 22,
    textAlign: 'center',
  },
  emptyActions: {
    alignItems: 'center',
    gap: spacing[3],
    width: '100%',
  },
  startSearchButton: {
    paddingHorizontal: spacing[8],
    ...shadows.md,
  },
  emptySecondaryAction: {
    paddingVertical: spacing[2],
  },

  // Hero Header (for loading state)
  heroHeader: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[5],
    ...shadows.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },

  // Recipe list favorites
  recipeListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[1],
  },
  recipeNameButton: {
    flex: 1,
  },
  historyFavoriteButton: {
    marginLeft: spacing[2],
  },
  premiumFavoriteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[1],
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    position: 'relative',
  },
  premiumIcon: {
    position: 'absolute',
    top: -2,
    right: -2,
  },

  // Premium Required Styles
  premiumHeader: {
    paddingBottom: spacing[3],
    ...shadows.sm,
  },
  premiumHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    minHeight: 56,
  },
  premiumBackButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumHeaderCenter: {
    flex: 1,
    alignItems: 'center',
  },
  premiumHeaderActions: {
    width: 36,
    alignItems: 'flex-end',
  },
  premiumScrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  premiumRequiredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[6],
    gap: spacing[6],
    minHeight: 600,
  },
  premiumMainIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
  premiumDescription: {
    maxWidth: 300,
    lineHeight: 24,
    marginVertical: spacing[2],
  },
  premiumFeaturesList: {
    width: '100%',
    gap: spacing[3],
    marginVertical: spacing[4],
  },
  premiumFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  premiumButton: {
    borderRadius: borderRadius.xl,
    width: '100%',
    ...shadows.lg,
  },
  premiumButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[5],
    gap: spacing[3],
  },

  // Premium Analytics Styles
  premiumAnalytics: {
    gap: spacing[5],
  },
  analyticsRow: {
    flexDirection: 'row',
    gap: spacing[4],
  },
  analyticsItem: {
    flex: 1,
    alignItems: 'center',
    padding: spacing[4],
    backgroundColor: '#F9FAFB',
    borderRadius: borderRadius.lg,
    gap: spacing[2],
  },
  weeklyActivityContainer: {
    gap: spacing[3],
  },
  weeklyActivity: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: spacing[2],
  },
  weeklyActivityItem: {
    alignItems: 'center',
    gap: spacing[2],
  },
  weeklyActivityBar: {
    width: 24,
    borderRadius: 2,
    minHeight: 4,
  },
  monthlyTrendsContainer: {
    gap: spacing[3],
  },
  monthlyTrends: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  monthlyTrendItem: {
    alignItems: 'center',
    flex: 1,
    gap: spacing[1],
    padding: spacing[2],
    backgroundColor: '#F9FAFB',
    borderRadius: borderRadius.sm,
    marginHorizontal: spacing[0.5],
  },
});

export default HistoryScreen;
