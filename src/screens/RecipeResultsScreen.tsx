import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  FlatList,
  SafeAreaView,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Animated,
  Share,
  Platform,
  RefreshControl,
} from 'react-native';
import { Logger } from '../services/LoggerService';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { HomeStackParamList } from '../components/navigation/ThemedNavigators';
import { Recipe, RecipeSearchResult } from '../types/Recipe';
import { RecipeService } from '../services/recipeService';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// UI Components
import { Button, Card, Text } from '../components/ui';
import { RecipeCard } from '../components/ui/RecipeCard';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { useToast } from '../contexts/ToastContext';
import { useHaptics } from '../hooks/useHaptics';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { useTranslation } from 'react-i18next';

// Theme
import { spacing, borderRadius, shadows } from '../theme/design-tokens';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

type RecipeResultsScreenProps = {
  navigation: StackNavigationProp<HomeStackParamList, 'RecipeResults'>;
  route: RouteProp<HomeStackParamList, 'RecipeResults'>;
};

type ViewMode = 'grid' | 'list';
type SortOption = 'relevance' | 'cookingTime' | 'name' | 'rating';
type FilterOption = 'all' | 'exact' | 'near';

interface FilterState {
  sortBy: SortOption;
  filterBy: FilterOption;
  selectedTags: string[];
  showAdvanced: boolean;
}

const RecipeResultsScreen: React.FC<RecipeResultsScreenProps> = ({
  navigation,
  route,
}) => {
  const { ingredients, aiRecipes } = route.params;
  const [searchResults, setSearchResults] = useState<RecipeSearchResult | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(!aiRecipes);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [refreshing, setRefreshing] = useState(false);
  const [filterState, setFilterState] = useState<FilterState>({
    sortBy: 'relevance',
    filterBy: 'all',
    selectedTags: [],
    showAdvanced: false,
  });

  const { colors } = useThemedStyles();
  const { showSuccess, showError, showInfo } = useToast();
  const haptics = useHaptics();
  const { t } = useTranslation();

  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(1)).current;
  const fadeAnimation = useRef(new Animated.Value(0)).current;

  // Get all recipes for processing
  const allRecipes = searchResults
    ? [...searchResults.exactMatches, ...searchResults.nearMatches]
    : aiRecipes || [];

  // Filter and sort recipes
  const processedRecipes = React.useMemo(() => {
    let result = [...allRecipes];

    // Apply filter
    if (filterState.filterBy === 'exact' && searchResults) {
      result = searchResults.exactMatches;
    } else if (filterState.filterBy === 'near' && searchResults) {
      result = searchResults.nearMatches;
    }

    // Apply tag filtering
    if (filterState.selectedTags.length > 0) {
      result = result.filter(recipe =>
        filterState.selectedTags.some(
          tag =>
            recipe.ingredients?.some((ingredient: string) =>
              ingredient.toLowerCase().includes(tag.toLowerCase())
            ) || recipe.name.toLowerCase().includes(tag.toLowerCase())
        )
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (filterState.sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'cookingTime':
          return (a.cookingTime || 30) - (b.cookingTime || 30);
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'relevance':
        default:
          // Sort by matching ingredients ratio
          const aMatch =
            (a.matchingIngredients || 0) / (a.totalIngredients || 1);
          const bMatch =
            (b.matchingIngredients || 0) / (b.totalIngredients || 1);
          return bMatch - aMatch;
      }
    });

    return result;
  }, [allRecipes, filterState, searchResults]);

  // Recipe statistics
  const recipeStats = React.useMemo(() => {
    const stats = {
      total: allRecipes.length,
      exact: searchResults?.exactMatches.length || 0,
      near: searchResults?.nearMatches.length || 0,
      avgCookingTime: 0,
      difficulties: { kolay: 0, orta: 0, zor: 0 },
    };

    if (allRecipes.length > 0) {
      const totalTime = allRecipes.reduce(
        (sum, recipe) => sum + (recipe.cookingTime || 30),
        0
      );
      stats.avgCookingTime = Math.round(totalTime / allRecipes.length);

      allRecipes.forEach(recipe => {
        if (recipe.difficulty) {
          stats.difficulties[
            recipe.difficulty as keyof typeof stats.difficulties
          ]++;
        }
      });
    }

    return stats;
  }, [allRecipes, searchResults]);

  // Popular ingredient tags
  const ingredientTags = React.useMemo(() => {
    const tagCount: { [key: string]: number } = {};
    allRecipes.forEach(recipe => {
      recipe.ingredients?.forEach((ingredient: string) => {
        const cleanIngredient = ingredient
          .split(' ')
          .find(
            (word: string) =>
              word.length > 3 &&
              !['adet', 'gram', 'litre', 'kaşık', 'bardak'].includes(
                word.toLowerCase()
              )
          );
        if (cleanIngredient) {
          tagCount[cleanIngredient] = (tagCount[cleanIngredient] || 0) + 1;
        }
      });
    });

    return Object.entries(tagCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([tag]) => tag);
  }, [allRecipes]);

  const loadRecipes = async () => {
    if (aiRecipes) {
      setSearchResults({
        exactMatches: aiRecipes,
        nearMatches: [],
      });
      return;
    }

    try {
      setIsLoading(true);
      const results = await RecipeService.searchRecipesByIngredients({
        ingredients,
        maxMissingIngredients: 5,
      });
      setSearchResults(results);
      Logger.info(
        `Found ${
          results.exactMatches.length + results.nearMatches.length
        } recipes`
      );
    } catch (error) {
      Logger.error('Recipe search failed:', error);
      showError('Tarifler yüklenemedi');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    haptics.light();

    try {
      await loadRecipes();
      haptics.success();
      showSuccess('Tarifler yenilendi');
    } catch (error) {
      showError('Yenileme başarısız');
    } finally {
      setRefreshing(false);
    }
  };

  const shareResults = async () => {
    try {
      haptics.light();
      const message = `🍽️ ${ingredients.join(', ')} ile ${
        processedRecipes.length
      } tarif buldum!\n\nYemek Bulucu ile paylaşıldı`;
      await Share.share({
        message,
        title: 'Tarif Sonuçları',
      });
    } catch (error) {
      Logger.error('Share failed:', error);
    }
  };

  const updateFilter = (updates: Partial<FilterState>) => {
    setFilterState(prev => ({ ...prev, ...updates }));
    haptics.light();
  };

  const clearFilters = () => {
    setFilterState({
      sortBy: 'relevance',
      filterBy: 'all',
      selectedTags: [],
      showAdvanced: false,
    });
    haptics.light();
  };

  const toggleTag = (tag: string) => {
    setFilterState(prev => ({
      ...prev,
      selectedTags: prev.selectedTags.includes(tag)
        ? prev.selectedTags.filter(t => t !== tag)
        : [...prev.selectedTags, tag],
    }));
    haptics.light();
  };

  const handleRecipePress = (recipe: Recipe) => {
    haptics.light();
    navigation.navigate('RecipeDetail', {
      recipeId: recipe.id,
      recipeName: recipe.name,
      recipe: recipe,
      isAiGenerated: recipe.aiGenerated || false,
    });
  };

  // Animation effects
  useEffect(() => {
    Animated.timing(fadeAnimation, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    loadRecipes();
  }, []);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: false,
      listener: (event: any) => {
        const y = event.nativeEvent.contentOffset.y;
        const opacity = Math.max(0, Math.min(1, 1 - y / 100));
        headerOpacity.setValue(opacity);
      },
    }
  );

  const renderGridItem = ({ item, index }: { item: Recipe; index: number }) => {
    const gradientColors = item.aiGenerated
      ? ['#8B5CF6', '#A855F7']
      : ['#6366F1', '#8B5CF6'];

    return (
      <Animated.View
        style={[
          styles.modernGridItem,
          {
            opacity: fadeAnimation,
            transform: [
              {
                scale: fadeAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.8, 1],
                }),
              },
            ],
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => handleRecipePress(item)}
          activeOpacity={0.85}
        >
          <View
            style={[
              styles.modernCard,
              { backgroundColor: colors.surface.primary },
            ]}
          >
            {/* Recipe Image */}
            <View style={styles.modernImageContainer}>
              {item.imageUrl ? (
                <Animated.Image
                  source={{ uri: item.imageUrl }}
                  style={styles.modernImage}
                  resizeMode='cover'
                />
              ) : (
                <LinearGradient
                  colors={gradientColors as [string, string]}
                  style={styles.modernImagePlaceholder}
                >
                  <Ionicons name='restaurant' size={32} color='white' />
                </LinearGradient>
              )}

              {/* AI Badge */}
              {item.aiGenerated && (
                <View style={[styles.aiBadge, { backgroundColor: '#8B5CF6' }]}>
                  <Ionicons name='sparkles' size={10} color='white' />
                  <Text style={styles.aiBadgeText}>AI</Text>
                </View>
              )}

              {/* Match Badge */}
              {item.matchingIngredients && item.totalIngredients && (
                <View
                  style={[
                    styles.modernMatchBadge,
                    {
                      backgroundColor:
                        item.matchingIngredients === item.totalIngredients
                          ? '#10B981'
                          : '#F59E0B',
                    },
                  ]}
                >
                  <Text style={styles.matchBadgeText}>
                    {Math.round(
                      (item.matchingIngredients / item.totalIngredients) * 100
                    )}
                    %
                  </Text>
                </View>
              )}
            </View>

            {/* Recipe Content */}
            <View style={styles.modernCardContent}>
              <Text
                variant='bodyMedium'
                weight='600'
                numberOfLines={2}
                style={{ color: colors.text.primary, marginBottom: 8 }}
              >
                {item.name}
              </Text>

              <View style={styles.modernStats}>
                <View style={styles.modernStat}>
                  <Ionicons
                    name='time-outline'
                    size={14}
                    color={colors.text.secondary}
                  />
                  <Text
                    variant='labelSmall'
                    style={{ color: colors.text.secondary, marginLeft: 4 }}
                  >
                    {item.cookingTime || '30'}dk
                  </Text>
                </View>

                <View style={styles.modernStat}>
                  <Ionicons
                    name='people-outline'
                    size={14}
                    color={colors.text.secondary}
                  />
                  <Text
                    variant='labelSmall'
                    style={{ color: colors.text.secondary, marginLeft: 4 }}
                  >
                    {item.servings || '4'} kişi
                  </Text>
                </View>
              </View>

              {item.difficulty && (
                <View style={styles.modernDifficultyContainer}>
                  <View
                    style={[
                      styles.modernDifficulty,
                      {
                        backgroundColor:
                          item.difficulty === 'kolay'
                            ? '#10B981'
                            : item.difficulty === 'orta'
                              ? '#F59E0B'
                              : '#EF4444',
                      },
                    ]}
                  >
                    <Text style={styles.difficultyText}>{item.difficulty}</Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderListItem = ({ item }: { item: Recipe }) => (
    <Animated.View
      style={{
        opacity: fadeAnimation,
        marginBottom: 12,
      }}
    >
      <RecipeCard
        recipe={item}
        variant='compact'
        onPress={() => handleRecipePress(item)}
      />
    </Animated.View>
  );

  const renderFilterSheet = () => {
    if (!filterState.showAdvanced) return null;

    return (
      <View
        style={[
          styles.modernFilterSheet,
          { backgroundColor: colors.surface.primary },
        ]}
      >
        {/* Filter Header */}
        <View style={styles.filterHeader}>
          <Text
            variant='headlineSmall'
            weight='600'
            style={{ color: colors.text.primary }}
          >
            Filtrele & Sırala
          </Text>
          <TouchableOpacity
            onPress={() => updateFilter({ showAdvanced: false })}
            style={styles.closeButton}
          >
            <Ionicons name='close' size={24} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Quick Sort Options */}
          <View style={styles.modernFilterSection}>
            <Text
              variant='labelLarge'
              weight='600'
              style={{ color: colors.text.primary, marginBottom: 12 }}
            >
              Sıralama
            </Text>
            <View style={styles.quickSortGrid}>
              {[
                {
                  key: 'relevance',
                  label: 'En Uygun',
                  icon: 'star',
                  color: '#8B5CF6',
                },
                {
                  key: 'cookingTime',
                  label: 'En Hızlı',
                  icon: 'time',
                  color: '#10B981',
                },
                { key: 'name', label: 'A-Z', icon: 'text', color: '#6366F1' },
                {
                  key: 'rating',
                  label: 'En Popüler',
                  icon: 'heart',
                  color: '#EF4444',
                },
              ].map(option => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.quickSortCard,
                    {
                      backgroundColor:
                        filterState.sortBy === option.key
                          ? option.color
                          : colors.background?.primary || '#FFFFFF',
                      borderColor:
                        filterState.sortBy === option.key
                          ? option.color
                          : colors.border?.light || '#E5E5E5',
                    },
                  ]}
                  onPress={() =>
                    updateFilter({ sortBy: option.key as SortOption })
                  }
                >
                  <Ionicons
                    name={option.icon as any}
                    size={20}
                    color={
                      filterState.sortBy === option.key
                        ? 'white'
                        : colors.text.secondary
                    }
                  />
                  <Text
                    variant='labelMedium'
                    weight='500'
                    style={{
                      color:
                        filterState.sortBy === option.key
                          ? 'white'
                          : colors.text.primary,
                      marginTop: 4,
                    }}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Filter by Match Type */}
          {searchResults && (
            <View style={styles.modernFilterSection}>
              <Text
                variant='labelLarge'
                weight='600'
                style={{ color: colors.text.primary, marginBottom: 12 }}
              >
                Eşleşme Türü
              </Text>
              <View style={styles.matchTypeFilters}>
                {[
                  {
                    key: 'all',
                    label: `Tümü (${recipeStats.total})`,
                    icon: 'apps',
                  },
                  {
                    key: 'exact',
                    label: `Tam (${recipeStats.exact})`,
                    icon: 'checkmark-circle',
                  },
                  {
                    key: 'near',
                    label: `Yakın (${recipeStats.near})`,
                    icon: 'add-circle',
                  },
                ].map(option => (
                  <TouchableOpacity
                    key={option.key}
                    style={[
                      styles.matchTypeButton,
                      {
                        backgroundColor:
                          filterState.filterBy === option.key
                            ? colors.primary[500]
                            : 'transparent',
                        borderColor: colors.primary[500],
                      },
                    ]}
                    onPress={() =>
                      updateFilter({ filterBy: option.key as FilterOption })
                    }
                  >
                    <Ionicons
                      name={option.icon as any}
                      size={16}
                      color={
                        filterState.filterBy === option.key
                          ? 'white'
                          : colors.primary[500]
                      }
                    />
                    <Text
                      variant='labelMedium'
                      weight='500'
                      style={{
                        color:
                          filterState.filterBy === option.key
                            ? 'white'
                            : colors.primary[500],
                      }}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Ingredient Tags */}
          {ingredientTags.length > 0 && (
            <View style={styles.modernFilterSection}>
              <Text
                variant='labelLarge'
                weight='600'
                style={{ color: colors.text.primary, marginBottom: 12 }}
              >
                Popüler Malzemeler
              </Text>
              <View style={styles.tagGrid}>
                {ingredientTags.map(tag => (
                  <TouchableOpacity
                    key={tag}
                    style={[
                      styles.modernTag,
                      {
                        backgroundColor: filterState.selectedTags.includes(tag)
                          ? colors.primary[500]
                          : colors.background?.primary || '#FFFFFF',
                        borderColor: colors.primary[300],
                      },
                    ]}
                    onPress={() => toggleTag(tag)}
                  >
                    <Text
                      variant='labelSmall'
                      weight='500'
                      style={{
                        color: filterState.selectedTags.includes(tag)
                          ? 'white'
                          : colors.primary[600],
                      }}
                    >
                      {tag}
                    </Text>
                    {filterState.selectedTags.includes(tag) && (
                      <Ionicons
                        name='checkmark'
                        size={12}
                        color='white'
                        style={{ marginLeft: 4 }}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Clear All Button */}
          <TouchableOpacity
            style={[
              styles.modernClearButton,
              {
                backgroundColor: colors.background?.primary || '#FFFFFF',
                borderColor: colors.border?.light || '#E5E5E5',
              },
            ]}
            onPress={clearFilters}
          >
            <Ionicons
              name='refresh-outline'
              size={20}
              color={colors.text.secondary}
            />
            <Text
              variant='bodyMedium'
              weight='500'
              style={{ color: colors.text.secondary, marginLeft: 8 }}
            >
              Filtreleri Temizle
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.modernEmptyContainer}>
      <LinearGradient
        colors={['#6366F1', '#8B5CF6']}
        style={styles.modernEmptyIcon}
      >
        <Ionicons name='restaurant-outline' size={48} color='white' />
      </LinearGradient>

      <Text
        variant='headlineSmall'
        weight='700'
        style={{
          color: colors.text.primary,
          textAlign: 'center',
          marginTop: 20,
          marginBottom: 8,
        }}
      >
        Tarif Bulunamadı
      </Text>

      <Text
        variant='bodyMedium'
        style={{
          color: colors.text.secondary,
          textAlign: 'center',
          marginBottom: 32,
          paddingHorizontal: 32,
        }}
      >
        Seçili filtrelere uygun tarif bulunamadı.\nFarklı filtreler deneyin veya
        malzemelerinizi değiştirin.
      </Text>

      <TouchableOpacity
        style={[
          styles.modernEmptyButton,
          { backgroundColor: colors.primary[500] },
        ]}
        onPress={clearFilters}
      >
        <Ionicons name='refresh' size={20} color='white' />
        <Text
          variant='bodyMedium'
          weight='600'
          style={{ color: 'white', marginLeft: 8 }}
        >
          Filtreleri Temizle
        </Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: colors.background?.primary || '#FFFFFF' },
        ]}
      >
        <StatusBar
          barStyle='dark-content'
          backgroundColor={colors.background?.primary || '#FFFFFF'}
        />
        <View style={styles.modernLoadingContainer}>
          <LinearGradient
            colors={['#6366F1', '#8B5CF6']}
            style={styles.loadingIconContainer}
          >
            <ActivityIndicator size='large' color='white' />
          </LinearGradient>

          <Text
            variant='headlineSmall'
            weight='700'
            style={{
              color: colors.text.primary,
              marginTop: 24,
              textAlign: 'center',
            }}
          >
            Tarifler Yükleniyor
          </Text>

          <Text
            variant='bodyMedium'
            style={{
              color: colors.text.secondary,
              marginTop: 8,
              textAlign: 'center',
            }}
          >
            En iyi tarifleri sizin için buluyoruz...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: colors.background?.primary || '#FFFFFF' },
      ]}
    >
      <StatusBar
        barStyle='dark-content'
        backgroundColor={colors.background?.primary || '#FFFFFF'}
      />

      {/* Modern Header */}
      <View
        style={[
          styles.modernHeader,
          { backgroundColor: colors.background?.primary || '#FFFFFF' },
        ]}
      >
        <View style={styles.modernHeaderContent}>
          <TouchableOpacity
            style={[
              styles.modernBackButton,
              { backgroundColor: colors.surface.primary },
            ]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name='arrow-back' size={20} color={colors.text.primary} />
          </TouchableOpacity>

          <View style={styles.modernHeaderInfo}>
            <Text
              variant='headlineSmall'
              weight='700'
              style={{ color: colors.text.primary, fontSize: 20 }}
            >
              Tarif Sonuçları
            </Text>
            <Text
              variant='labelMedium'
              style={{ color: colors.text.secondary, marginTop: 2 }}
            >
              {processedRecipes.length} tarif • {ingredients.length} malzeme
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.modernShareButton,
              { backgroundColor: colors.surface.primary },
            ]}
            onPress={shareResults}
          >
            <Ionicons
              name='share-outline'
              size={20}
              color={colors.text.primary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Ingredients Section */}
      <View
        style={[
          styles.modernIngredientsSection,
          { backgroundColor: colors.background?.primary || '#FFFFFF' },
        ]}
      >
        <View style={styles.modernIngredientsHeader}>
          <Ionicons
            name='restaurant-outline'
            size={20}
            color={colors.primary[500]}
          />
          <Text
            variant='bodyLarge'
            weight='600'
            style={{ color: colors.text.primary, marginLeft: 8 }}
          >
            Kullanılan Malzemeler
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.modernIngredientsContainer}
        >
          {ingredients.map((ingredient, index) => (
            <View
              key={index}
              style={[
                styles.modernIngredientChip,
                {
                  backgroundColor: colors.primary[100],
                  borderColor: colors.primary[300],
                },
              ]}
            >
              <Text
                variant='labelMedium'
                weight='500'
                style={{ color: colors.primary[700] }}
              >
                {ingredient}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Modern Controls */}
      <View
        style={[
          styles.modernControlsSection,
          { backgroundColor: colors.background?.primary || '#FFFFFF' },
        ]}
      >
        {/* View Mode Selector */}
        <View
          style={[
            styles.modernViewControls,
            { backgroundColor: colors.surface.primary },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.modernViewButton,
              {
                backgroundColor:
                  viewMode === 'grid' ? colors.primary[500] : 'transparent',
              },
            ]}
            onPress={() => {
              setViewMode('grid');
              haptics.light();
            }}
          >
            <Ionicons
              name='grid-outline'
              size={18}
              color={viewMode === 'grid' ? 'white' : colors.text.secondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.modernViewButton,
              {
                backgroundColor:
                  viewMode === 'list' ? colors.primary[500] : 'transparent',
              },
            ]}
            onPress={() => {
              setViewMode('list');
              haptics.light();
            }}
          >
            <Ionicons
              name='list-outline'
              size={18}
              color={viewMode === 'list' ? 'white' : colors.text.secondary}
            />
          </TouchableOpacity>
        </View>

        {/* Filter & Sort Button */}
        <TouchableOpacity
          style={[
            styles.modernFilterButton,
            {
              backgroundColor: filterState.showAdvanced
                ? colors.primary[500]
                : colors.surface.primary,
            },
          ]}
          onPress={() =>
            updateFilter({ showAdvanced: !filterState.showAdvanced })
          }
        >
          <Ionicons
            name='options-outline'
            size={18}
            color={filterState.showAdvanced ? 'white' : colors.text.primary}
          />
          <Text
            variant='labelMedium'
            weight='500'
            style={{
              color: filterState.showAdvanced ? 'white' : colors.text.primary,
              marginLeft: 6,
            }}
          >
            Filtrele
          </Text>

          {/* Active Filter Indicator */}
          {(filterState.filterBy !== 'all' ||
            filterState.selectedTags.length > 0 ||
            filterState.sortBy !== 'relevance') && (
            <View
              style={[
                styles.modernFilterIndicator,
                { backgroundColor: '#EF4444' },
              ]}
            />
          )}
        </TouchableOpacity>
      </View>

      {/* Filter Sheet */}
      {renderFilterSheet()}

      {/* Recipe Content */}
      {processedRecipes.length === 0 ? (
        renderEmpty()
      ) : (
        <FlatList
          data={processedRecipes}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          renderItem={viewMode === 'grid' ? renderGridItem : renderListItem}
          numColumns={viewMode === 'grid' ? 2 : 1}
          key={`${viewMode}-${filterState.sortBy}-${filterState.filterBy}`}
          contentContainerStyle={[
            styles.modernListContainer,
            { paddingBottom: Platform.OS === 'ios' ? 100 : 80 },
          ]}
          columnWrapperStyle={
            viewMode === 'grid' ? styles.modernGridRow : undefined
          }
          showsVerticalScrollIndicator={false}
          bounces={true}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary[500]]}
              tintColor={colors.primary[500]}
              title='Yenileniyor...'
              titleColor={colors.text.secondary}
            />
          }
          onScroll={handleScroll}
          scrollEventThrottle={16}
          ItemSeparatorComponent={() =>
            viewMode === 'list' ? <View style={{ height: 16 }} /> : null
          }
          initialNumToRender={viewMode === 'grid' ? 6 : 4}
          maxToRenderPerBatch={viewMode === 'grid' ? 8 : 6}
          windowSize={10}
          removeClippedSubviews={true}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Loading
  modernLoadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
  },
  loadingIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },

  // Header
  modernHeader: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    ...shadows.sm,
  },
  modernHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modernBackButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  modernShareButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  modernHeaderInfo: {
    flex: 1,
    alignItems: 'center',
  },

  // Stats
  statsScroll: {
    marginVertical: spacing[2],
  },
  statsScrollContainer: {
    paddingHorizontal: spacing[4],
    gap: spacing[3],
  },
  modernStatCard: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[4],
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    minWidth: 80,
    ...shadows.sm,
  },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[2],
  },

  // Ingredients
  modernIngredientsSection: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  modernIngredientsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  modernIngredientsContainer: {
    gap: spacing[2],
    paddingRight: spacing[4],
  },
  modernIngredientChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },

  // Controls
  modernControlsSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  modernViewControls: {
    flexDirection: 'row',
    borderRadius: borderRadius.lg,
    padding: spacing[1],
    ...shadows.sm,
  },
  modernViewButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modernFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    position: 'relative',
    ...shadows.sm,
  },
  modernFilterIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // Filter Sheet
  modernFilterSheet: {
    marginHorizontal: spacing[4],
    marginBottom: spacing[3],
    borderRadius: borderRadius.xl,
    padding: spacing[5],
    maxHeight: screenHeight * 0.6,
    ...shadows.lg,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[5],
  },
  closeButton: {
    padding: spacing[2],
  },
  modernFilterSection: {
    marginBottom: spacing[6],
  },
  quickSortGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
  },
  quickSortCard: {
    width: (screenWidth - spacing[4] * 2 - spacing[5] * 2 - spacing[3] * 3) / 2,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[3],
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchTypeFilters: {
    gap: spacing[2],
  },
  matchTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    gap: spacing[2],
  },
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  modernTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  modernClearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[4],
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    marginTop: spacing[4],
  },

  // List Content
  modernListContainer: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
  },
  modernGridRow: {
    justifyContent: 'space-between',
    marginBottom: spacing[4],
  },

  // Grid Items
  modernGridItem: {
    width: (screenWidth - spacing[4] * 2 - spacing[3]) / 2,
    marginBottom: spacing[4],
  },
  modernCard: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.md,
  },
  modernImageContainer: {
    height: 140,
    position: 'relative',
  },
  modernImage: {
    width: '100%',
    height: '100%',
  },
  modernImagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiBadge: {
    position: 'absolute',
    top: spacing[2],
    left: spacing[2],
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
    gap: 2,
  },
  aiBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
  },
  modernMatchBadge: {
    position: 'absolute',
    top: spacing[2],
    right: spacing[2],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
  },
  matchBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'white',
  },
  modernCardContent: {
    padding: spacing[4],
  },
  modernStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  modernStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modernDifficultyContainer: {
    alignItems: 'flex-start',
  },
  modernDifficulty: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
  },
  difficultyText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'white',
    textTransform: 'capitalize',
  },

  // Empty State
  modernEmptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[8],
  },
  modernEmptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
  modernEmptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[4],
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
});

export default RecipeResultsScreen;
