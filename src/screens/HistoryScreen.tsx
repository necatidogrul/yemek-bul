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
import { spacing, borderRadius, shadows } from '../theme/design-tokens';

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

  const { colors } = useThemedStyles();
  const { isPremium, showPaywall, refreshPremiumStatus, isLoading: premiumLoading } = usePremium();
  const { showSuccess, showError } = useToast();

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

  // App focus'ta premium durumunu kontrol et
  useEffect(() => {
    const unsubscribe = navigation.addListener?.('focus', async () => {
      if (!isLoading) {
        debugLog('HistoryScreen focused, refreshing premium status');
        // Premium durumunu force refresh yap
        await refreshPremiumStatus?.(true);
      }
    });

    return unsubscribe;
  }, [navigation, isLoading]);


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

  const loadHistoryData = async () => {
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
  };

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
        showSuccess(result.message || 'Tarif favorilerinize eklendi!');
      } else {
        showError(result.message || 'Favorilere eklenirken hata oluştu.');
      }
    } catch (error) {
      showError('Favorilere eklenirken hata oluştu.');
    }
  };

  const handleDeleteItem = useCallback(async (id: string) => {
    Alert.alert(
      'Geçmişi Sil',
      'Bu arama geçmişini silmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
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
      'Tüm Geçmişi Sil',
      'Tüm arama geçmişinizi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Tümünü Sil',
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

    if (diffDays === 1) return 'Bugün';
    if (diffDays === 2) return 'Dün';
    if (diffDays <= 7) return `${diffDays - 1} gün önce`;

    return date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const renderHistoryItem = ({ item }: { item: AIRequestHistory }) => (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      <Card variant='elevated' size='lg' style={styles.historyItem}>
        <View style={styles.historyItemHeader}>
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
            <Text variant='labelSmall' weight='medium' color='secondary'>
              {formatDate(item.timestamp)}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteItem(item.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name='trash-outline'
              size={16}
              color={colors.error[400]}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.historyContent}>
          <View style={styles.resultSummary}>
            <View
              style={[
                styles.resultBadge,
                {
                  backgroundColor: item.success
                    ? colors.success[50]
                    : colors.error[50],
                  borderColor: item.success
                    ? colors.success[200]
                    : colors.error[200],
                },
              ]}
            >
              <Ionicons
                name={item.success ? 'checkmark-circle' : 'close-circle'}
                size={16}
                color={item.success ? colors.success[600] : colors.error[600]}
              />
              <Text
                variant='bodySmall'
                weight='semibold'
                style={{
                  color: item.success ? colors.success[700] : colors.error[700],
                }}
              >
                {item.results.count} tarif{' '}
                {item.success ? 'bulundu' : 'bulunamadı'}
              </Text>
            </View>
          </View>

          <View style={styles.ingredientsList}>
            {item.ingredients.slice(0, 4).map((ingredient, index) => (
              <View
                key={index}
                style={[
                  styles.ingredientChip,
                  {
                    backgroundColor: colors.primary[50],
                    borderColor: colors.primary[100],
                  },
                ]}
              >
                <Text
                  variant='labelSmall'
                  weight='medium'
                  style={{ color: colors.primary[700] }}
                >
                  {ingredient}
                </Text>
              </View>
            ))}
            {item.ingredients.length > 4 && (
              <View
                style={[
                  styles.ingredientChip,
                  styles.moreChip,
                  { backgroundColor: colors.neutral[100] },
                ]}
              >
                <Text
                  variant='labelSmall'
                  weight='medium'
                  style={{ color: colors.neutral[600] }}
                >
                  +{item.ingredients.length - 4}
                </Text>
              </View>
            )}
          </View>

          {item.success && item.results.recipes.length > 0 && (
            <View style={styles.recipesPreview}>
              <View style={styles.recipePreviewHeader}>
                <Ionicons
                  name='restaurant'
                  size={14}
                  color={colors.primary[500]}
                />
                <Text variant='bodySmall' weight='medium' color='primary'>
                  Bulunan tarifler
                </Text>
              </View>
              <View style={styles.recipesList}>
                {item.results.recipes.slice(0, 2).map((recipe, index) => (
                  <View key={recipe.id} style={styles.recipeListItem}>
                    <TouchableOpacity
                      style={styles.recipeNameButton}
                      onPress={() =>
                        navigation.navigate('RecipeDetail', {
                          recipeId: recipe.id,
                          recipeName: recipe.name,
                          recipe: convertToFullRecipe(recipe),
                        })
                      }
                    >
                      <Text variant='labelSmall' color='secondary'>
                        • {recipe.name}
                      </Text>
                    </TouchableOpacity>

                    {isPremium ? (
                      <FavoriteButton
                        recipe={convertToFullRecipe(recipe)}
                        size='small'
                        style={styles.historyFavoriteButton}
                      />
                    ) : (
                      <TouchableOpacity
                        onPress={() => handleAddToFavorites(recipe)}
                        style={styles.premiumFavoriteButton}
                      >
                        <Ionicons
                          name='heart-outline'
                          size={12}
                          color={colors.neutral[400]}
                        />
                        <Ionicons
                          name='star'
                          size={8}
                          color={colors.warning[500]}
                          style={styles.premiumIcon}
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
                {item.results.recipes.length > 2 && (
                  <Text variant='labelSmall' color='primary' weight='medium'>
                    +{item.results.recipes.length - 2} tarif daha
                  </Text>
                )}
              </View>
            </View>
          )}
        </View>

        <View style={styles.historyItemFooter}>
          <Button
            variant={item.success ? 'primary' : 'outline'}
            size='sm'
            onPress={() => handleViewResults(item)}
            leftIcon={
              <Ionicons
                name={item.success ? 'eye' : 'refresh'}
                size={14}
                color={item.success ? 'white' : colors.primary[600]}
              />
            }
            style={styles.actionButton}
          >
            {item.success ? 'Sonuçları Gör' : 'Tekrar Dene'}
          </Button>

          {item.preferences && (
            <View style={styles.preferencesInfo}>
              {item.preferences.difficulty && (
                <View style={styles.preferenceTag}>
                  <Ionicons
                    name='speedometer'
                    size={10}
                    color={colors.neutral[400]}
                  />
                  <Text variant='labelSmall' color='secondary'>
                    {item.preferences.difficulty}
                  </Text>
                </View>
              )}
              {item.preferences.cookingTime && (
                <View style={styles.preferenceTag}>
                  <Ionicons name='time' size={10} color={colors.neutral[400]} />
                  <Text variant='labelSmall' color='secondary'>
                    {item.preferences.cookingTime}dk
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </Card>
    </Animated.View>
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
                Arama İstatistiklerin
              </Text>
              <Text variant='bodySmall' color='secondary'>
                Toplam aktivite özeti
              </Text>
            </View>
          </View>

          <View style={styles.statsOverviewGrid}>
            <View style={styles.statItem}>
              <Text variant='headlineLarge' weight='bold' color='primary'>
                {stats.totalRequests}
              </Text>
              <Text variant='labelSmall' color='secondary' align='center'>
                Toplam Arama
              </Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Text variant='headlineLarge' weight='bold' color='success'>
                {stats.successfulRequests}
              </Text>
              <Text variant='labelSmall' color='secondary' align='center'>
                Başarılı
              </Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Text variant='headlineLarge' weight='bold' color='warning'>
                {stats.totalRecipesGenerated}
              </Text>
              <Text variant='labelSmall' color='secondary' align='center'>
                Tarif Bulundu
              </Text>
            </View>
          </View>

          <View style={styles.successRateContainer}>
            <View style={styles.successRateInfo}>
              <Text variant='bodySmall' color='secondary'>
                Başarı Oranı
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
              Toplam Arama
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
              Başarılı
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
              Tarif
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
                  En Çok Kullanılan
                </Text>
                <Text variant='bodySmall' color='secondary'>
                  Favori malzemeleriniz
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
                          {item.count} kez kullanıldı
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
                  Popüler Kombinasyonlar
                </Text>
                <Text variant='bodySmall' color='secondary'>
                  Başarılı malzeme grupları
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
                          {combo.count} kez
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
                          %{Math.round(combo.successRate * 100)} başarı
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
                          { backgroundColor: colors.neutral[100] },
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
                      Tekrar dene
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
                  Premium Analitik
                </Text>
                <Text variant='bodySmall' color='secondary'>
                  Detaylı kullanım istatistikleri
                </Text>
              </View>
            </View>

            <View style={styles.premiumAnalytics}>
              {/* Token Usage */}
              <View style={styles.analyticsRow}>
                <View style={styles.analyticsItem}>
                  <Text variant='bodySmall' color='secondary'>
                    Toplam Token
                  </Text>
                  <Text variant='headlineSmall' weight='bold' color='primary'>
                    {stats.totalTokensUsed?.toLocaleString() || '0'}
                  </Text>
                </View>
                <View style={styles.analyticsItem}>
                  <Text variant='bodySmall' color='secondary'>
                    Ort. Yanıt Süresi
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
                    Haftalık Aktivite
                  </Text>
                  <View style={styles.weeklyActivity}>
                    {['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'].map(
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
                                      : colors.neutral[200],
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
                    Aylık Trend (Son 6 Ay)
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
                          başarı
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
              Zaman Filtresi
            </Text>
          </View>
          <View style={styles.filterButtons}>
            {[
              { key: 'all', label: 'Tümü', icon: 'infinite' },
              { key: 'today', label: 'Bugün', icon: 'today' },
              { key: 'week', label: 'Bu Hafta', icon: 'calendar' },
              { key: 'month', label: 'Bu Ay', icon: 'calendar-outline' },
            ].map(item => (
              <TouchableOpacity
                key={item.key}
                style={[
                  styles.filterButton,
                  {
                    backgroundColor:
                      filter.dateRange === item.key
                        ? colors.primary[500]
                        : colors.neutral[50],
                    borderColor:
                      filter.dateRange === item.key
                        ? colors.primary[500]
                        : colors.neutral[200],
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

  // Premium olmayan kullanıcılar için paywall
  if (!hasHistoryAccess) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: colors.background.primary },
        ]}
      >
        <StatusBar
          barStyle='light-content'
          backgroundColor={colors.primary[600]}
        />

        {/* Header */}
        <LinearGradient
          colors={[colors.primary[600], colors.primary[700]]}
          style={styles.premiumHeader}
        >
          <SafeAreaView>
            <View style={styles.premiumHeaderContainer}>
              <TouchableOpacity
                style={styles.premiumBackButton}
                onPress={() => navigation.goBack()}
              >
                <Ionicons name='chevron-back' size={24} color='white' />
              </TouchableOpacity>

              <View style={styles.premiumHeaderCenter}>
                <Text
                  variant='headlineSmall'
                  weight='bold'
                  style={{ color: 'white' }}
                >
                  Arama Geçmişi
                </Text>
              </View>

              <View style={styles.premiumHeaderActions} />
            </View>
          </SafeAreaView>
        </LinearGradient>

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
              Premium Özellik
            </Text>

            <Text
              variant='bodyLarge'
              color='secondary'
              align='center'
              style={styles.premiumDescription}
            >
              Arama geçmişinizi görmek ve analiz etmek için Premium'a geçin
            </Text>

            <View style={styles.premiumFeaturesList}>
              {[
                'Tüm arama geçmişinizi görüntüleme',
                'Detaylı istatistik ve analiz',
                'Popüler malzeme kombinasyonları',
                'Haftalık ve aylık aktivite raporları',
                'Başarılı tarifleri tekrar bulma',
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
                  Premium'a Geç
                </Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        </ScrollView>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: colors.background.primary },
        ]}
      >
        <StatusBar
          barStyle='light-content'
          backgroundColor={colors.primary[600]}
        />

        {/* Header for loading state */}
        <LinearGradient
          colors={[
            colors.primary[500],
            colors.primary[600],
            colors.primary[700],
          ]}
          style={styles.heroHeader}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <SafeAreaView>
            <View style={styles.headerContainer}>
              <View style={styles.headerLeft}>
                <View style={styles.heroIcon}>
                  <Ionicons name='time' size={24} color='white' />
                </View>
                <View>
                  <Text
                    variant='headlineMedium'
                    weight='bold'
                    style={{ color: 'white' }}
                  >
                    Arama Geçmişi
                  </Text>
                  <Text
                    variant='bodySmall'
                    style={{ color: 'rgba(255,255,255,0.8)' }}
                  >
                    Yükleniyor...
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
                activeOpacity={0.8}
              >
                <Ionicons name='arrow-back' size={24} color='white' />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </LinearGradient>

        <View style={styles.loadingContainer}>
          <LinearGradient
            colors={[colors.primary[100], colors.primary[200]]}
            style={styles.loadingIcon}
          >
            <Ionicons name='time' size={32} color={colors.primary[500]} />
          </LinearGradient>
          <ActivityIndicator size='large' color={colors.primary[500]} />
          <Text
            variant='headlineSmall'
            weight='semibold'
            color='primary'
            align='center'
          >
            Geçmiş Yükleniyor...
          </Text>
          <Text
            variant='bodyMedium'
            color='secondary'
            align='center'
            style={styles.loadingSubtext}
          >
            Arama geçmişiniz hazırlanıyor
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: colors.background.primary }]}
    >
      <StatusBar
        barStyle='light-content'
        backgroundColor={colors.primary[600]}
      />

      {/* Compact Modern Header */}
      <LinearGradient
        colors={[colors.primary[600], colors.primary[700]]}
        style={styles.compactHeader}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <SafeAreaView>
          <View style={styles.headerContainer}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.8}
            >
              <Ionicons name='chevron-back' size={24} color='white' />
            </TouchableOpacity>
            
            {/* Premium status refresh butonu - debug için */}
            {__DEV__ && (
              <TouchableOpacity
                style={[styles.backButton, { marginLeft: 8 }]}
                onPress={async () => {
                  debugLog('Manual refresh triggered');
                  await refreshPremiumStatus?.(true);
                }}
                activeOpacity={0.8}
              >
                <Ionicons name='refresh' size={18} color='white' />
              </TouchableOpacity>
            )}

            <View style={styles.headerCenter}>
              <View style={styles.headerTitleContainer}>
                <View style={styles.headerIcon}>
                  <Ionicons name='time' size={16} color='white' />
                </View>
                <Text
                  variant='headlineSmall'
                  weight='bold'
                  style={{ color: 'white' }}
                >
                  Arama Geçmişi
                </Text>
              </View>
              {stats && (
                <Text
                  variant='labelSmall'
                  style={{ color: 'rgba(255,255,255,0.8)' }}
                >
                  {stats.totalRequests} arama • {stats.successfulRequests}{' '}
                  başarılı
                </Text>
              )}
            </View>

            <View style={styles.headerActions}>
              {history.length > 0 && (
                <TouchableOpacity
                  style={styles.headerActionButton}
                  onPress={handleClearHistory}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name='refresh'
                    size={18}
                    color='rgba(255,255,255,0.8)'
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        bounces={true}
        nestedScrollEnabled={true}
      >
        {/* View Mode Toggle */}
        <Card variant='elevated' size='lg' style={styles.controlsCard}>
          <View style={styles.viewModeContainer}>
            <View style={styles.viewModeToggle}>
              <TouchableOpacity
                style={[
                  styles.viewModeButton,
                  viewMode === 'list' && styles.viewModeButtonActive,
                  {
                    backgroundColor:
                      viewMode === 'list'
                        ? colors.primary[500]
                        : colors.neutral[100],
                  },
                ]}
                onPress={() => setViewMode('list')}
              >
                <Ionicons
                  name='list'
                  size={16}
                  color={viewMode === 'list' ? 'white' : colors.neutral[600]}
                />
                <Text
                  variant='bodySmall'
                  weight='medium'
                  style={{
                    color: viewMode === 'list' ? 'white' : colors.neutral[600],
                    marginLeft: spacing[1],
                  }}
                >
                  Liste
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.viewModeButton,
                  viewMode === 'stats' && styles.viewModeButtonActive,
                  {
                    backgroundColor:
                      viewMode === 'stats'
                        ? colors.primary[500]
                        : colors.neutral[100],
                  },
                ]}
                onPress={() => setViewMode('stats')}
              >
                <Ionicons
                  name='stats-chart'
                  size={16}
                  color={viewMode === 'stats' ? 'white' : colors.neutral[600]}
                />
                <Text
                  variant='bodySmall'
                  weight='medium'
                  style={{
                    color: viewMode === 'stats' ? 'white' : colors.neutral[600],
                    marginLeft: spacing[1],
                  }}
                >
                  İstatistik
                </Text>
              </TouchableOpacity>
            </View>

            {history.length > 0 && (
              <TouchableOpacity
                style={[
                  styles.clearButton,
                  { backgroundColor: colors.error[100] },
                ]}
                onPress={handleClearHistory}
              >
                <Ionicons name='trash' size={16} color={colors.error[500]} />
                <Text
                  variant='labelSmall'
                  weight='medium'
                  style={{ color: colors.error[500] }}
                >
                  Temizle
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </Card>

        {viewMode === 'list' ? (
          <>
            {renderFilterBar()}

            {history.length === 0 ? (
              <EmptyState
                type='no-history'
                actions={[
                  {
                    label: 'İlk Aramayı Yap',
                    onPress: () => navigation.getParent()?.navigate('HomeTab'),
                    icon: 'search-outline',
                  },
                ]}
              />
            ) : (
              <View style={styles.historyList}>
                {history.map(item => (
                  <View key={item.id} style={{ marginBottom: spacing[4] }}>
                    {renderHistoryItem({ item })}
                  </View>
                ))}
              </View>
            )}
          </>
        ) : (
          <>{renderStatsView()}</>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Compact Header
  compactHeader: {
    paddingBottom: spacing[3],
    ...shadows.sm,
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    minHeight: 56,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    gap: spacing[0.5],
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  headerIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    width: 36,
    alignItems: 'flex-end',
  },
  headerActionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Controls
  controlsCard: {
    marginHorizontal: spacing[4],
    marginBottom: spacing[3],
  },
  viewModeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewModeToggle: {
    flexDirection: 'row',
    borderRadius: borderRadius.xl,
    padding: spacing[1],
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  viewModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.lg,
    gap: spacing[1],
  },
  viewModeButtonActive: {
    ...shadows.sm,
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

  // History Items
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  historyList: {
    paddingHorizontal: spacing[4],
  },
  historyItem: {
    ...shadows.md,
  },
  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  statusIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  deleteButton: {
    padding: spacing[2],
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  historyContent: {
    gap: spacing[3],
  },
  resultSummary: {
    marginBottom: spacing[2],
  },
  resultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    gap: spacing[2],
    alignSelf: 'flex-start',
    borderWidth: 1,
  },
  ingredientsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[1.5],
  },
  ingredientChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  moreChip: {
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  recipesPreview: {
    padding: spacing[3],
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  recipePreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  recipesList: {
    gap: spacing[1],
  },
  historyItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing[2],
  },
  actionButton: {
    paddingHorizontal: spacing[4],
  },
  preferencesInfo: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  preferenceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    backgroundColor: 'rgba(0,0,0,0.04)',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
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
    backgroundColor: 'rgba(0,0,0,0.1)',
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
    backgroundColor: 'rgba(0,0,0,0.06)',
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

  // Loading & Empty States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[6],
    gap: spacing[4],
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
