import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  FlatList,
  SafeAreaView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  TextInput,
  Animated,
  Image,
  ScrollView,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { FavoritesStackParamList } from '../../App';
import { Recipe } from '../types/Recipe';
import { FavoritesService } from '../services/FavoritesService';

// UI Components
import { Text } from '../components/ui';
import { EmptyState } from '../components/ui/EmptyState';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { useToast } from '../contexts/ToastContext';
import { useHaptics } from '../hooks/useHaptics';
import { usePremium } from '../contexts/PremiumContext';
import { usePremiumGuard } from '../hooks/usePremiumGuard';
import { spacing, borderRadius, shadows } from '../theme/design-tokens';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

type FavoritesScreenProps = {
  navigation: StackNavigationProp<FavoritesStackParamList, 'FavoritesMain'>;
};

type ViewMode = 'list' | 'grid';
type SortOption = 'recent' | 'name' | 'cookingTime';
type FilterOption = 'all' | 'easy' | 'medium' | 'hard';

const FavoritesScreen: React.FC<FavoritesScreenProps> = ({ navigation }) => {
  const [favorites, setFavorites] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [showFilters, setShowFilters] = useState(false);

  const { colors } = useThemedStyles();
  const { showSuccess, showError } = useToast();
  const haptics = useHaptics();
  const { isPremium, showPaywall } = usePremium();

  // Premium guard for favorites access
  const favoritesGuard = usePremiumGuard({
    feature: 'unlimitedRecipes',
    title: 'Favoriler özelliği premium kullanıcılar içindir',
  });

  // Animation for filter panel
  const filterAnimation = useState(new Animated.Value(0))[0];
  const scaleAnim = useState(new Animated.Value(1))[0];

  // Filtering and sorting logic
  const filteredFavorites = useMemo(() => {
    let result = [...favorites];

    // Apply search filter
    if (searchQuery.trim()) {
      result = result.filter(
        recipe =>
          recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          recipe.ingredients?.some(ingredient =>
            ingredient.toLowerCase().includes(searchQuery.toLowerCase())
          )
      );
    }

    // Apply difficulty filter
    if (filterBy !== 'all') {
      const difficultyMap = {
        easy: ['Kolay', 'Easy', 'kolay'],
        medium: ['Orta', 'Medium', 'orta'],
        hard: ['Zor', 'Hard', 'zor'],
      };
      result = result.filter(recipe =>
        difficultyMap[filterBy].includes(recipe.difficulty || '')
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'cookingTime':
          return (a.cookingTime || 30) - (b.cookingTime || 30);
        case 'recent':
        default:
          return (
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime()
          );
      }
    });

    return result;
  }, [favorites, searchQuery, sortBy, filterBy]);

  async function loadFavorites() {
    if (!favoritesGuard.hasAccess) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const favRecipes = await FavoritesService.getFavoriteRecipes();
      setFavorites(favRecipes);
    } catch (error) {
      console.error('Failed to load favorites:', error);
      showError('Favoriler yüklenemedi');
      setFavorites([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!favoritesGuard.hasAccess) {
      favoritesGuard.requirePremium();
      return;
    }

    const unsubscribe = navigation.addListener('focus', () => {
      loadFavorites();
    });

    loadFavorites();
    return unsubscribe;
  }, [navigation, favoritesGuard.hasAccess]);

  const handleRecipePress = (recipe: Recipe) => {
    if (!recipe.id) {
      showError('Tarif bilgisi eksik');
      return;
    }

    // Eğer recipe eksikse, tam halini yükleyelim
    if (!recipe.instructions || !recipe.ingredients) {
      // Eksik tarif bilgisi var, sadece ID ve isimle gönder
      // RecipeDetailScreen kendi başına yükleyecek
      navigation.navigate('RecipeDetail', {
        recipeId: recipe.id,
        recipeName: recipe.name,
      });
    } else {
      // Tam recipe var, hepsini gönder
      navigation.navigate('RecipeDetail', {
        recipeId: recipe.id,
        recipeName: recipe.name,
        recipe: recipe,
      });
    }
  };

  const animateScale = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const toggleFilters = () => {
    const toValue = showFilters ? 0 : 1;
    setShowFilters(!showFilters);
    haptics.selection();

    Animated.spring(filterAnimation, {
      toValue,
      useNativeDriver: false,
      tension: 100,
      friction: 8,
    }).start();
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSortBy('recent');
    setFilterBy('all');
    haptics.selection();
    animateScale();
  };

  const renderGridItem = ({ item }: { item: Recipe }) => (
    <TouchableOpacity
      style={[styles.gridCard]}
      onPress={() => {
        haptics.selection();
        handleRecipePress(item);
      }}
      activeOpacity={0.9}
    >
      <View style={styles.gridImageContainer}>
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.gridImage}
            resizeMode='cover'
          />
        ) : (
          <LinearGradient
            colors={['#F97316', '#FB923C']}
            style={styles.gridImagePlaceholder}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name='restaurant' size={32} color='white' />
          </LinearGradient>
        )}

        {/* Difficulty Badge */}
        {item.difficulty && (
          <View
            style={[
              styles.difficultyBadge,
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
            <Text style={{ color: 'white', fontSize: 10, fontWeight: '600' }}>
              {item.difficulty.toUpperCase()}
            </Text>
          </View>
        )}

        {/* Remove Favorite Button */}
        <TouchableOpacity
          style={styles.removeButton}
          onPress={async e => {
            e.stopPropagation();
            if (!item.id) return;

            haptics.notificationSuccess();
            const success = await FavoritesService.removeFromFavorites(item.id);
            if (success) {
              showSuccess('Favorilerden kaldırıldı');
              loadFavorites();
            }
          }}
        >
          <Ionicons name='heart' size={20} color='#EF4444' />
        </TouchableOpacity>
      </View>

      <View style={styles.gridContent}>
        <Text
          variant='bodyMedium'
          weight='600'
          numberOfLines={2}
          style={{ color: colors.text.primary }}
        >
          {item.name}
        </Text>

        <View style={styles.gridStats}>
          <View style={styles.statItem}>
            <Ionicons
              name='time-outline'
              size={14}
              color={colors.neutral[400]}
            />
            <Text variant='labelSmall' style={{ color: colors.neutral[500] }}>
              {item.cookingTime || 30} dk
            </Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons
              name='people-outline'
              size={14}
              color={colors.neutral[400]}
            />
            <Text variant='labelSmall' style={{ color: colors.neutral[500] }}>
              {item.servings || 4} kişi
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderListItem = ({ item }: { item: Recipe }) => (
    <TouchableOpacity
      style={styles.listCard}
      onPress={() => {
        haptics.selection();
        handleRecipePress(item);
      }}
      activeOpacity={0.9}
    >
      <View style={styles.listImageContainer}>
        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.listImage}
            resizeMode='cover'
          />
        ) : (
          <LinearGradient
            colors={['#F97316', '#FB923C']}
            style={styles.listImagePlaceholder}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name='restaurant' size={24} color='white' />
          </LinearGradient>
        )}
      </View>

      <View style={styles.listContent}>
        <Text
          variant='bodyLarge'
          weight='600'
          numberOfLines={1}
          style={{ color: colors.text.primary }}
        >
          {item.name}
        </Text>

        <View style={styles.listStats}>
          <View style={styles.statItem}>
            <Ionicons
              name='time-outline'
              size={12}
              color={colors.neutral[400]}
            />
            <Text variant='labelSmall' style={{ color: colors.neutral[500] }}>
              {item.cookingTime || 30} dk
            </Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons
              name='people-outline'
              size={12}
              color={colors.neutral[400]}
            />
            <Text variant='labelSmall' style={{ color: colors.neutral[500] }}>
              {item.servings || 4}
            </Text>
          </View>
          {item.difficulty && (
            <View
              style={[
                styles.difficultyChip,
                {
                  backgroundColor:
                    item.difficulty === 'kolay'
                      ? '#10B98120'
                      : item.difficulty === 'orta'
                        ? '#F59E0B20'
                        : '#EF444420',
                },
              ]}
            >
              <Text
                style={{
                  color:
                    item.difficulty === 'kolay'
                      ? '#10B981'
                      : item.difficulty === 'orta'
                        ? '#F59E0B'
                        : '#EF4444',
                  fontSize: 11,
                  fontWeight: '600',
                }}
              >
                {item.difficulty}
              </Text>
            </View>
          )}
        </View>
      </View>

      <TouchableOpacity
        style={styles.listRemoveButton}
        onPress={async () => {
          if (!item.id) return;
          haptics.notificationSuccess();
          const success = await FavoritesService.removeFromFavorites(item.id);
          if (success) {
            showSuccess('Favorilerden kaldırıldı');
            loadFavorites();
          }
        }}
      >
        <Ionicons name='heart' size={22} color='#EF4444' />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderEmpty = () => {
    if (searchQuery || filterBy !== 'all') {
      return (
        <EmptyState
          type='no-search-results'
          actions={[
            {
              label: 'Filtreleri Temizle',
              onPress: clearFilters,
              variant: 'outline',
              icon: 'close-circle-outline',
            },
          ]}
        />
      );
    }

    return (
      <EmptyState
        type='no-favorites'
        actions={[
          {
            label: 'Tarif Keşfet',
            onPress: () => navigation.getParent()?.navigate('HomeTab' as any),
            icon: 'compass-outline',
          },
        ]}
      />
    );
  };

  // Premium olmayan kullanıcılar için paywall
  if (!favoritesGuard.hasAccess) {
    return (
      <SafeAreaView
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
                Favorilerim
              </Text>
            </View>

            <View style={styles.premiumHeaderActions} />
          </View>
        </LinearGradient>

        {/* Scrollable Premium Required Content */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.premiumScrollContent}
          bounces={true}
        >
          <View style={styles.premiumRequiredContainer}>
            <LinearGradient
              colors={['#FF6B6B', '#FF8E8E']}
              style={styles.premiumMainIcon}
            >
              <Ionicons name='heart' size={40} color='white' />
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
              Favori tariflerinizi kaydetmek ve yönetmek için Premium'a geçin
            </Text>

            <View style={styles.premiumFeaturesList}>
              {[
                'Sınırsız favori tarif kaydetme',
                'Favorileri kategorilere ayırma',
                'Offline erişim için kaydetme',
                'Favori tarifleri dışa aktarma',
                'Gelişmiş arama ve filtreleme',
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
              colors={['#FF6B6B', '#FF8E8E']}
              style={styles.premiumButton}
            >
              <TouchableOpacity
                style={styles.premiumButtonContent}
                onPress={() => favoritesGuard.requirePremium()}
              >
                <Ionicons name='heart' size={20} color='white' />
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
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background.primary }]}
    >
      <StatusBar barStyle='dark-content' />

      {/* Compact Header */}
      <View
        style={[styles.header, { backgroundColor: colors.background.primary }]}
      >
        <View style={styles.headerTop}>
          <View>
            <Text
              variant='headlineMedium'
              weight='bold'
              style={{ color: colors.text.primary }}
            >
              Favorilerim
            </Text>
            {filteredFavorites.length > 0 && (
              <Text
                variant='bodySmall'
                style={{ color: colors.neutral[500], marginTop: 2 }}
              >
                {filteredFavorites.length} tarif kayıtlı
              </Text>
            )}
          </View>

          <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                viewMode === 'grid' && styles.toggleActive,
              ]}
              onPress={() => {
                setViewMode('grid');
                haptics.selection();
              }}
            >
              <Ionicons
                name='grid'
                size={18}
                color={
                  viewMode === 'grid'
                    ? colors.primary[600]
                    : colors.neutral[400]
                }
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                viewMode === 'list' && styles.toggleActive,
              ]}
              onPress={() => {
                setViewMode('list');
                haptics.selection();
              }}
            >
              <Ionicons
                name='list'
                size={20}
                color={
                  viewMode === 'list'
                    ? colors.primary[600]
                    : colors.neutral[400]
                }
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View
            style={[styles.searchBar, { backgroundColor: colors.neutral[50] }]}
          >
            <Ionicons name='search' size={18} color={colors.neutral[400]} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder='Favorilerde ara...'
              placeholderTextColor={colors.neutral[400]}
              style={[styles.searchInput, { color: colors.text.primary }]}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons
                  name='close-circle'
                  size={18}
                  color={colors.neutral[400]}
                />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.filterToggle,
              showFilters && { backgroundColor: colors.primary[100] },
            ]}
            onPress={toggleFilters}
          >
            <Ionicons
              name='options-outline'
              size={20}
              color={showFilters ? colors.primary[600] : colors.neutral[600]}
            />
          </TouchableOpacity>
        </View>

        {/* Filter Options */}
        <Animated.View
          style={[
            styles.filterContainer,
            {
              height: filterAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 120],
              }),
              opacity: filterAnimation,
              marginTop: filterAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [0, spacing[3]],
              }),
            },
          ]}
        >
          <View style={styles.filterSection}>
            <Text
              variant='labelSmall'
              weight='600'
              style={{ color: colors.neutral[600] }}
            >
              Sıralama
            </Text>
            <View style={styles.filterChips}>
              {[
                { key: 'recent', label: 'En Yeni', icon: 'time' },
                { key: 'name', label: 'İsim', icon: 'text' },
                { key: 'cookingTime', label: 'Süre', icon: 'timer' },
              ].map(option => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.filterChip,
                    sortBy === option.key && {
                      backgroundColor: colors.primary[100],
                    },
                  ]}
                  onPress={() => {
                    setSortBy(option.key as SortOption);
                    haptics.selection();
                  }}
                >
                  <Ionicons
                    name={option.icon as any}
                    size={14}
                    color={
                      sortBy === option.key
                        ? colors.primary[600]
                        : colors.neutral[500]
                    }
                  />
                  <Text
                    variant='labelSmall'
                    weight={sortBy === option.key ? '600' : '400'}
                    style={{
                      color:
                        sortBy === option.key
                          ? colors.primary[600]
                          : colors.neutral[600],
                    }}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.filterSection}>
            <Text
              variant='labelSmall'
              weight='600'
              style={{ color: colors.neutral[600] }}
            >
              Zorluk
            </Text>
            <View style={styles.filterChips}>
              {[
                { key: 'all', label: 'Tümü' },
                { key: 'easy', label: 'Kolay' },
                { key: 'medium', label: 'Orta' },
                { key: 'hard', label: 'Zor' },
              ].map(option => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.filterChip,
                    filterBy === option.key && {
                      backgroundColor: colors.secondary[100],
                    },
                  ]}
                  onPress={() => {
                    setFilterBy(option.key as FilterOption);
                    haptics.selection();
                  }}
                >
                  <Text
                    variant='labelSmall'
                    weight={filterBy === option.key ? '600' : '400'}
                    style={{
                      color:
                        filterBy === option.key
                          ? colors.secondary[600]
                          : colors.neutral[600],
                    }}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Animated.View>
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size='large' color={colors.primary[500]} />
          <Text
            variant='bodyMedium'
            style={{ marginTop: spacing[3], color: colors.neutral[500] }}
          >
            Favoriler yükleniyor...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredFavorites}
          renderItem={viewMode === 'grid' ? renderGridItem : renderListItem}
          numColumns={viewMode === 'grid' ? 2 : 1}
          key={viewMode}
          contentContainerStyle={[
            styles.listContainer,
            filteredFavorites.length === 0 && {
              flex: 1,
              justifyContent: 'center',
            },
          ]}
          columnWrapperStyle={viewMode === 'grid' ? styles.gridRow : undefined}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmpty}
          ItemSeparatorComponent={() =>
            viewMode === 'list' ? <View style={{ height: spacing[2] }} /> : null
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
    paddingHorizontal: spacing[3],
    paddingTop: spacing[2],
    paddingBottom: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
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
  filterToggle: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },

  // Filters
  filterContainer: {
    overflow: 'hidden',
  },
  filterSection: {
    marginBottom: spacing[2],
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[1],
    marginTop: spacing[1],
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[2],
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    backgroundColor: 'rgba(0,0,0,0.05)',
    gap: 4,
  },

  // Content
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContainer: {
    padding: spacing[3],
  },
  gridRow: {
    justifyContent: 'space-between',
  },

  // Grid Card
  gridCard: {
    width: (screenWidth - spacing[3] * 3) / 2,
    backgroundColor: 'white',
    borderRadius: borderRadius.lg,
    marginBottom: spacing[3],
    ...shadows.sm,
    overflow: 'hidden',
  },
  gridImageContainer: {
    height: 140,
    position: 'relative',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  gridImagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridContent: {
    padding: spacing[2],
  },
  gridStats: {
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: spacing[1],
  },

  // List Card
  listCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: borderRadius.lg,
    padding: spacing[2],
    ...shadows.sm,
  },
  listImageContainer: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  listImage: {
    width: '100%',
    height: '100%',
  },
  listImagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    flex: 1,
    marginLeft: spacing[3],
    justifyContent: 'center',
  },
  listStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[1],
  },
  listRemoveButton: {
    justifyContent: 'center',
    paddingHorizontal: spacing[2],
  },

  // Common
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  difficultyBadge: {
    position: 'absolute',
    top: spacing[2],
    left: spacing[2],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  difficultyChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  removeButton: {
    position: 'absolute',
    top: spacing[2],
    right: spacing[2],
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[8],
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyButton: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    ...shadows.md,
  },
  emptyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    gap: spacing[2],
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
});

export default FavoritesScreen;
