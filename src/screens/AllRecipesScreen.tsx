import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  FlatList,
  SafeAreaView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  TextInput,
  StatusBar,
  Animated,
  ScrollView,
} from 'react-native';
import { Logger } from '../services/LoggerService';
import { StackNavigationProp } from '@react-navigation/stack';
import { HomeStackParamList } from '../../App';
import { Recipe } from '../types/Recipe';
import { RecipeService } from '../services/recipeService';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { debounce } from 'lodash';
import { spacing, borderRadius, elevation } from '../contexts/ThemeContext';

// UI Components
import { Input, Text, Card, Button } from '../components/ui';
import { RecipeCard } from '../components/ui/RecipeCard';
import { PullToRefresh } from '../components/ui/PullToRefresh';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { useOptimizedFlatList } from '../hooks/useOptimizedFlatList';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { useHaptics } from '../hooks/useHaptics';
import { useTranslation } from '../hooks/useTranslation';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

type AllRecipesScreenProps = {
  navigation: StackNavigationProp<HomeStackParamList, 'AllRecipes'>;
};

interface FilterState {
  category: string;
  difficulty: string;
  cookingTime: string;
  servings: string;
  ingredients: string[];
}

type ViewMode = 'list' | 'grid';
type SortOption = 'popular' | 'recent' | 'name' | 'cookingTime' | 'rating';

const AllRecipesScreen: React.FC<AllRecipesScreenProps> = ({ navigation }) => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [filteredRecipes, setFilteredRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('popular');
  const [showFilters, setShowFilters] = useState(false);

  const { colors } = useTheme();
  const { showSuccess, showError, showWarning } = useToast();
  const { t } = useTranslation();
  const haptics = useHaptics();

  const [filters, setFilters] = useState<FilterState>({
    category: '',
    difficulty: '',
    cookingTime: '',
    servings: '',
    ingredients: [],
  });

  // Animation for filter panel
  const filterAnimation = useState(new Animated.Value(0))[0];

  // Categories and filter options
  const categories = [
    { id: '', name: 'Tümü', icon: '🍽️' },
    { id: 'breakfast', name: 'Kahvaltı', icon: '🥞' },
    { id: 'lunch', name: 'Öğle Yemeği', icon: '🥗' },
    { id: 'dinner', name: 'Akşam Yemeği', icon: '🍖' },
    { id: 'dessert', name: 'Tatlı', icon: '🍰' },
    { id: 'snack', name: 'Atıştırmalık', icon: '🥜' },
    { id: 'soup', name: 'Çorba', icon: '🍲' },
    { id: 'salad', name: 'Salata', icon: '🥗' },
    { id: 'drink', name: 'İçecek', icon: '🥤' },
  ];

  const difficulties = [
    { id: '', name: 'Tümü' },
    { id: 'easy', name: 'Kolay' },
    { id: 'medium', name: 'Orta' },
    { id: 'hard', name: 'Zor' },
  ];

  const cookingTimes = [
    { id: '', name: 'Tümü' },
    { id: '0-15', name: '0-15 dk' },
    { id: '15-30', name: '15-30 dk' },
    { id: '30-60', name: '30-60 dk' },
    { id: '60+', name: '60+ dk' },
  ];

  const servingSizes = [
    { id: '', name: 'Tümü' },
    { id: '1-2', name: '1-2 kişi' },
    { id: '3-4', name: '3-4 kişi' },
    { id: '5+', name: '5+ kişi' },
  ];

  const popularIngredients = [
    'Tavuk',
    'Et',
    'Balık',
    'Domates',
    'Soğan',
    'Sarımsak',
    'Patates',
    'Pirinç',
    'Makarna',
    'Peynir',
    'Yumurta',
    'Süt',
  ];

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((term: string) => {
      performSearch(term);
    }, 300),
    []
  );

  // Filter and sort logic
  const processRecipes = useMemo(() => {
    let result = [...recipes];

    // Apply filters
    if (filters.category) {
      result = result.filter(recipe => recipe.category === filters.category);
    }

    if (filters.difficulty) {
      const difficultyMap: { [key: string]: string[] } = {
        easy: ['kolay'],
        medium: ['orta'],
        hard: ['zor'],
      };
      result = result.filter(recipe =>
        difficultyMap[filters.difficulty]?.includes(
          (recipe.difficulty || '') as string
        )
      );
    }

    if (filters.cookingTime) {
      result = result.filter(recipe => {
        const time = recipe.cookingTime || 30;
        switch (filters.cookingTime) {
          case '0-15':
            return time <= 15;
          case '15-30':
            return time > 15 && time <= 30;
          case '30-60':
            return time > 30 && time <= 60;
          case '60+':
            return time > 60;
          default:
            return true;
        }
      });
    }

    if (filters.servings) {
      result = result.filter(recipe => {
        const servings = recipe.servings || 4;
        switch (filters.servings) {
          case '1-2':
            return servings <= 2;
          case '3-4':
            return servings >= 3 && servings <= 4;
          case '5+':
            return servings >= 5;
          default:
            return true;
        }
      });
    }

    if (filters.ingredients.length > 0) {
      result = result.filter(recipe =>
        filters.ingredients.some(ingredient =>
          recipe.ingredients?.some(recipeIngredient =>
            recipeIngredient.toLowerCase().includes(ingredient.toLowerCase())
          )
        )
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'cookingTime':
          return (a.cookingTime || 30) - (b.cookingTime || 30);
        case 'rating':
          return (b.popularityScore || 0) - (a.popularityScore || 0);
        case 'recent':
          return (
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime()
          );
        case 'popular':
        default:
          return (b.popularityScore || 0) - (a.popularityScore || 0);
      }
    });

    return result;
  }, [recipes, filters, sortBy]);

  useEffect(() => {
    setFilteredRecipes(processRecipes);
  }, [processRecipes]);

  const { isRefreshing, handleRefresh } = usePullToRefresh({
    onRefresh: () => loadRecipes(true),
  });

  const { optimizedProps, onEndReached } = useOptimizedFlatList<Recipe>({
    enableGetItemLayout: true,
    itemHeight: viewMode === 'grid' ? 200 : 120,
    keyExtractor: item => item.id,
  });

  async function loadRecipes(refresh = false) {
    try {
      if (refresh) {
        setCurrentPage(1);
        setRecipes([]);
      }
      setIsLoading(refresh || currentPage === 1);
      setIsLoadingMore(!refresh && currentPage > 1);

      const {
        recipes: newRecipes,
        hasMore: moreAvailable,
        totalCount,
      } = await RecipeService.getAllRecipes(refresh ? 1 : currentPage, 20);

      if (refresh) {
        setRecipes(newRecipes);
      } else {
        setRecipes(prev => [...prev, ...newRecipes]);
      }

      setHasMore(moreAvailable);
      setTotalCount(totalCount);
      setCurrentPage(prev => (refresh ? 2 : prev + 1));

      Logger.info(`Loaded ${newRecipes.length} recipes, total: ${totalCount}`);
    } catch (error) {
      Logger.error('Failed to load recipes:', error);
      showError(t('errors.recipesLoadFailed'));
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }

  async function performSearch(term: string) {
    if (!term.trim()) {
      setFilteredRecipes(processRecipes);
      return;
    }

    try {
      const searchResults = await RecipeService.searchRecipesByName(term);
      setFilteredRecipes(searchResults.recipes);
    } catch (error) {
      Logger.error('Search failed:', error);
      showError(t('errors.search'));
    }
  }

  useEffect(() => {
    loadRecipes(true);
  }, []);

  useEffect(() => {
    if (searchTerm) {
      debouncedSearch(searchTerm);
    } else {
      setFilteredRecipes(processRecipes);
    }
  }, [searchTerm, debouncedSearch, processRecipes]);

  const handleRecipePress = (recipe: Recipe) => {
    navigation.navigate('RecipeDetail', {
      recipeId: recipe.id,
      recipeName: recipe.name,
      recipe,
    });
  };

  const toggleFilters = () => {
    const toValue = showFilters ? 0 : 1;
    setShowFilters(!showFilters);

    Animated.spring(filterAnimation, {
      toValue,
      useNativeDriver: false,
      tension: 100,
      friction: 8,
    }).start();
  };

  const clearFilters = () => {
    setFilters({
      category: '',
      difficulty: '',
      cookingTime: '',
      servings: '',
      ingredients: [],
    });
    setSortBy('popular');
    setSearchTerm('');
    haptics.selection();
  };

  const addIngredientFilter = (ingredient: string) => {
    if (!filters.ingredients.includes(ingredient)) {
      setFilters(prev => ({
        ...prev,
        ingredients: [...prev.ingredients, ingredient],
      }));
    }
  };

  const removeIngredientFilter = (ingredient: string) => {
    setFilters(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter(i => i !== ingredient),
    }));
  };

  const renderGridItem = ({ item, index }: { item: Recipe; index: number }) => (
    <TouchableOpacity
      style={[styles.gridItem, { backgroundColor: colors.surface }]}
      onPress={() => handleRecipePress(item)}
      activeOpacity={0.9}
    >
      <LinearGradient
        colors={[colors.primary[400], colors.primary[600]]}
        style={styles.gridItemImage}
      >
        <Ionicons name='restaurant' size={32} color='white' />

        {/* Popularity Badge */}
        {typeof item.popularityScore === 'number' &&
          item.popularityScore > 0 && (
            <View
              style={[
                styles.ratingBadge,
                { backgroundColor: colors.accent.gold },
              ]}
            >
              <Ionicons name='star' size={12} color='white' />
              <Text
                variant='labelSmall'
                weight='600'
                style={{ color: 'white' }}
              >
                {item.popularityScore.toFixed(1)}
              </Text>
            </View>
          )}

        {/* Category Badge */}
        {item.category && (
          <View
            style={[
              styles.categoryBadge,
              { backgroundColor: 'rgba(0,0,0,0.6)' },
            ]}
          >
            <Text variant='labelSmall' weight='500' style={{ color: 'white' }}>
              {categories.find(c => c.id === item.category)?.name ||
                item.category}
            </Text>
          </View>
        )}
      </LinearGradient>

      <View style={styles.gridItemContent}>
        <Text variant='labelLarge' weight='600' numberOfLines={2}>
          {item.name}
        </Text>

        <View style={styles.gridItemStats}>
          <View style={styles.gridItemStat}>
            <Ionicons
              name='time-outline'
              size={12}
              color={colors.text.secondary}
            />
            <Text variant='labelSmall' color='secondary'>
              {item.cookingTime || '30'}dk
            </Text>
          </View>

          <View style={styles.gridItemStat}>
            <Ionicons
              name='people-outline'
              size={12}
              color={colors.text.secondary}
            />
            <Text variant='labelSmall' color='secondary'>
              {item.servings || '4'}
            </Text>
          </View>
        </View>

        {/* Difficulty Indicator */}
        {item.difficulty && (
          <View
            style={[
              styles.difficultyIndicator,
              {
                backgroundColor:
                  item.difficulty === 'kolay'
                    ? colors.semantic.success + '20'
                    : item.difficulty === 'orta'
                      ? colors.semantic.warning + '20'
                      : colors.semantic.error + '20',
              },
            ]}
          >
            <Text
              variant='labelSmall'
              weight='500'
              style={{
                color:
                  item.difficulty === 'kolay'
                    ? colors.semantic.success
                    : item.difficulty === 'orta'
                      ? colors.semantic.warning
                      : colors.semantic.error,
              }}
            >
              {item.difficulty}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderListItem = ({ item }: { item: Recipe }) => (
    <RecipeCard
      recipe={item}
      variant='default'
      onPress={() => handleRecipePress(item)}
    />
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <LinearGradient
        colors={[colors.primary[100], colors.primary[200]]}
        style={styles.emptyIcon}
      >
        <Ionicons name='search-outline' size={60} color={colors.primary[500]} />
      </LinearGradient>

      <Text
        variant='headlineSmall'
        weight='600'
        align='center'
        style={{ marginVertical: spacing.lg }}
      >
        {searchTerm ||
        Object.values(filters).some(
          f => f && (Array.isArray(f) ? f.length > 0 : true)
        )
          ? 'Sonuç Bulunamadı'
          : 'Tarifler Yükleniyor'}
      </Text>

      <Text
        variant='bodyMedium'
        color='secondary'
        align='center'
        style={{ marginBottom: spacing.xl }}
      >
        {searchTerm ||
        Object.values(filters).some(
          f => f && (Array.isArray(f) ? f.length > 0 : true)
        )
          ? 'Arama kriterlerinize uygun tarif bulunamadı'
          : 'Lütfen bekleyin...'}
      </Text>

      {(searchTerm ||
        Object.values(filters).some(
          f => f && (Array.isArray(f) ? f.length > 0 : true)
        )) && (
        <Button
          variant='outline'
          onPress={clearFilters}
          leftIcon={<Ionicons name='refresh' size={20} />}
        >
          Filtreleri Temizle
        </Button>
      )}
    </View>
  );

  const renderFilterPanel = () => (
    <Animated.View
      style={[
        styles.filterPanel,
        {
          backgroundColor: colors.surface,
          maxHeight: filterAnimation.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 400],
          }),
          opacity: filterAnimation,
        },
      ]}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Categories */}
        <View style={styles.filterSection}>
          <Text
            variant='labelLarge'
            weight='600'
            style={{ marginBottom: spacing.sm }}
          >
            Kategori
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.categoryFilters}>
              {categories.map(category => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryFilter,
                    {
                      backgroundColor:
                        filters.category === category.id
                          ? colors.primary[500]
                          : colors.primary[100],
                    },
                  ]}
                  onPress={() =>
                    setFilters(prev => ({
                      ...prev,
                      category:
                        prev.category === category.id ? '' : category.id,
                    }))
                  }
                >
                  <Text variant='bodyMedium'>{category.icon}</Text>
                  <Text
                    variant='labelSmall'
                    weight='500'
                    style={{
                      color:
                        filters.category === category.id
                          ? 'white'
                          : colors.primary[700],
                    }}
                  >
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Quick Filters */}
        <View style={styles.filterSection}>
          <Text
            variant='labelLarge'
            weight='600'
            style={{ marginBottom: spacing.sm }}
          >
            Hızlı Filtreler
          </Text>

          <View style={styles.quickFilters}>
            <View style={styles.filterRow}>
              <Text variant='labelMedium' weight='500'>
                Zorluk:
              </Text>
              <View style={styles.filterOptions}>
                {difficulties.map(difficulty => (
                  <TouchableOpacity
                    key={difficulty.id}
                    style={[
                      styles.filterOption,
                      {
                        backgroundColor:
                          filters.difficulty === difficulty.id
                            ? colors.secondary[500]
                            : 'transparent',
                        borderColor: colors.secondary[500],
                      },
                    ]}
                    onPress={() =>
                      setFilters(prev => ({
                        ...prev,
                        difficulty:
                          prev.difficulty === difficulty.id
                            ? ''
                            : difficulty.id,
                      }))
                    }
                  >
                    <Text
                      variant='labelSmall'
                      weight='500'
                      style={{
                        color:
                          filters.difficulty === difficulty.id
                            ? 'white'
                            : colors.secondary[500],
                      }}
                    >
                      {difficulty.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.filterRow}>
              <Text variant='labelMedium' weight='500'>
                Süre:
              </Text>
              <View style={styles.filterOptions}>
                {cookingTimes.map(time => (
                  <TouchableOpacity
                    key={time.id}
                    style={[
                      styles.filterOption,
                      {
                        backgroundColor:
                          filters.cookingTime === time.id
                            ? colors.semantic.warning
                            : 'transparent',
                        borderColor: colors.semantic.warning,
                      },
                    ]}
                    onPress={() =>
                      setFilters(prev => ({
                        ...prev,
                        cookingTime:
                          prev.cookingTime === time.id ? '' : time.id,
                      }))
                    }
                  >
                    <Text
                      variant='labelSmall'
                      weight='500'
                      style={{
                        color:
                          filters.cookingTime === time.id
                            ? 'white'
                            : colors.semantic.warning,
                      }}
                    >
                      {time.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Popular Ingredients */}
        <View style={styles.filterSection}>
          <Text
            variant='labelLarge'
            weight='600'
            style={{ marginBottom: spacing.sm }}
          >
            Popüler Malzemeler
          </Text>

          <View style={styles.ingredientFilters}>
            {popularIngredients.map(ingredient => (
              <TouchableOpacity
                key={ingredient}
                style={[
                  styles.ingredientFilter,
                  {
                    backgroundColor: filters.ingredients.includes(ingredient)
                      ? colors.primary[500]
                      : colors.primary[50],
                    borderColor: colors.primary[300],
                  },
                ]}
                onPress={() => {
                  if (filters.ingredients.includes(ingredient)) {
                    removeIngredientFilter(ingredient);
                  } else {
                    addIngredientFilter(ingredient);
                  }
                }}
              >
                <Text
                  variant='labelSmall'
                  weight='500'
                  style={{
                    color: filters.ingredients.includes(ingredient)
                      ? 'white'
                      : colors.primary[600],
                  }}
                >
                  {ingredient}
                </Text>
                {filters.ingredients.includes(ingredient) && (
                  <Ionicons name='checkmark' size={12} color='white' />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Clear Filters */}
        <TouchableOpacity
          style={[
            styles.clearFiltersButton,
            { borderColor: colors.neutral[300] },
          ]}
          onPress={clearFilters}
        >
          <Ionicons name='refresh' size={16} color={colors.text.secondary} />
          <Text variant='labelMedium' color='secondary'>
            Tüm Filtreleri Temizle
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </Animated.View>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBar barStyle='dark-content' backgroundColor={colors.background} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <Text variant='displaySmall' weight='700'>
              Tüm Tarifler
            </Text>
            <Text variant='bodyMedium' color='secondary'>
              {totalCount > 0
                ? `${filteredRecipes.length}/${totalCount} tarif`
                : 'Yükleniyor...'}
            </Text>
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity
              style={[
                styles.headerButton,
                {
                  backgroundColor:
                    viewMode === 'grid' ? colors.primary[500] : colors.surface,
                },
              ]}
              onPress={() => {
                setViewMode('grid');
                haptics.selection();
              }}
            >
              <Ionicons
                name='grid'
                size={20}
                color={viewMode === 'grid' ? 'white' : colors.text.primary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.headerButton,
                {
                  backgroundColor:
                    viewMode === 'list' ? colors.primary[500] : colors.surface,
                },
              ]}
              onPress={() => {
                setViewMode('list');
                haptics.selection();
              }}
            >
              <Ionicons
                name='list'
                size={20}
                color={viewMode === 'list' ? 'white' : colors.text.primary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search and Filter */}
        <View style={styles.searchContainer}>
          <View
            style={[styles.searchInput, { backgroundColor: colors.surface }]}
          >
            <Ionicons name='search' size={20} color={colors.text.secondary} />
            <TextInput
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholder='Tarif ara...'
              placeholderTextColor={colors.text.secondary}
              style={[styles.searchText, { color: colors.text.primary }]}
            />
            {searchTerm.length > 0 && (
              <TouchableOpacity onPress={() => setSearchTerm('')}>
                <Ionicons
                  name='close-circle'
                  size={20}
                  color={colors.text.secondary}
                />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.filterButton,
              {
                backgroundColor: showFilters
                  ? colors.primary[500]
                  : colors.surface,
              },
            ]}
            onPress={toggleFilters}
          >
            <Ionicons
              name='options'
              size={20}
              color={showFilters ? 'white' : colors.text.primary}
            />
            {Object.values(filters).some(
              f => f && (Array.isArray(f) ? f.length > 0 : true)
            ) && (
              <View
                style={[
                  styles.filterIndicator,
                  { backgroundColor: colors.semantic.error },
                ]}
              />
            )}
          </TouchableOpacity>
        </View>

        {/* Sort Options */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.sortContainer}
        >
          {[
            { key: 'popular', label: 'Popüler', icon: 'flame' },
            { key: 'recent', label: 'En Yeni', icon: 'time' },
            { key: 'rating', label: 'En İyi', icon: 'star' },
            { key: 'name', label: 'A-Z', icon: 'text' },
            { key: 'cookingTime', label: 'Hızlı', icon: 'speedometer' },
          ].map(sort => (
            <TouchableOpacity
              key={sort.key}
              style={[
                styles.sortOption,
                {
                  backgroundColor:
                    sortBy === sort.key ? colors.primary[500] : colors.surface,
                },
              ]}
              onPress={() => setSortBy(sort.key as SortOption)}
            >
              <Ionicons
                name={sort.icon as any}
                size={16}
                color={sortBy === sort.key ? 'white' : colors.text.primary}
              />
              <Text
                variant='labelMedium'
                weight='500'
                style={{
                  color: sortBy === sort.key ? 'white' : colors.text.primary,
                }}
              >
                {sort.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Filter Panel */}
        {renderFilterPanel()}
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size='large' color={colors.primary[500]} />
          <Text
            variant='bodyMedium'
            color='secondary'
            style={{ marginTop: spacing.md }}
          >
            Tarifler yükleniyor...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredRecipes}
          renderItem={viewMode === 'grid' ? renderGridItem : renderListItem}
          numColumns={viewMode === 'grid' ? 2 : 1}
          key={viewMode} // Force re-render when switching modes
          contentContainerStyle={[
            styles.listContainer,
            filteredRecipes.length === 0 && styles.emptyListContainer,
            { flexGrow: 1, paddingBottom: 100 },
          ]}
          bounces={true}
          nestedScrollEnabled={true}
          columnWrapperStyle={viewMode === 'grid' ? styles.gridRow : undefined}
          showsVerticalScrollIndicator={false}
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          onEndReached={hasMore ? onEndReached : undefined}
          onEndReachedThreshold={0.5}
          {...optimizedProps}
          ListEmptyComponent={renderEmpty}
          ItemSeparatorComponent={() =>
            viewMode === 'list' ? <View style={{ height: spacing.sm }} /> : null
          }
          ListFooterComponent={() =>
            isLoadingMore ? (
              <View style={styles.loadMoreContainer}>
                <ActivityIndicator size='small' color={colors.primary[500]} />
                <Text
                  variant='labelMedium'
                  color='secondary'
                  style={{ marginLeft: spacing.sm }}
                >
                  Daha fazla yükleniyor...
                </Text>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header
  header: {
    paddingHorizontal: spacing.component.section.paddingX,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    ...elevation.low,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    ...elevation.low,
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.medium,
    gap: spacing.sm,
    ...elevation.low,
  },
  searchText: {
    flex: 1,
    fontSize: 16,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    ...elevation.low,
    position: 'relative',
  },
  filterIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // Sort
  sortContainer: {
    marginBottom: spacing.md,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    marginRight: spacing.sm,
    gap: spacing.xs,
    ...elevation.low,
  },

  // Filter Panel
  filterPanel: {
    borderRadius: borderRadius.large,
    padding: spacing.md,
    overflow: 'hidden',
    ...elevation.medium,
  },
  filterSection: {
    marginBottom: spacing.lg,
  },
  categoryFilters: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  categoryFilter: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.medium,
    minWidth: 80,
    gap: spacing.tiny,
  },
  quickFilters: {
    gap: spacing.md,
  },
  filterRow: {
    gap: spacing.sm,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  filterOption: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.medium,
    borderWidth: 1,
  },
  ingredientFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  ingredientFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    gap: spacing.tiny,
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.medium,
    borderWidth: 1,
    gap: spacing.xs,
    marginTop: spacing.sm,
  },

  // Content
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  listContainer: {
    padding: spacing.md,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  gridRow: {
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
  },
  loadMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },

  // Grid Items
  gridItem: {
    width: (screenWidth - spacing.md * 3) / 2,
    borderRadius: borderRadius.large,
    overflow: 'hidden',
    marginBottom: spacing.md,
    ...elevation.low,
  },
  gridItemImage: {
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  ratingBadge: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.tiny,
    borderRadius: borderRadius.small,
    gap: spacing.tiny,
  },
  categoryBadge: {
    position: 'absolute',
    bottom: spacing.xs,
    left: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.tiny,
    borderRadius: borderRadius.small,
  },
  gridItemContent: {
    padding: spacing.md,
  },
  gridItemStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: spacing.xs,
  },
  gridItemStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.tiny,
  },
  difficultyIndicator: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.tiny,
    borderRadius: borderRadius.full,
    marginTop: spacing.xs,
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxxl,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default AllRecipesScreen;
