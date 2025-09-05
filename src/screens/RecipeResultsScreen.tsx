import React, { useEffect, useState, useRef } from 'react';
import {
  View,
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
  Image,
} from 'react-native';
import { Logger } from '../services/LoggerService';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { HomeStackParamList } from '../components/navigation/ThemedNavigators';
import { Recipe, RecipeSearchResult } from '../types/Recipe';
import { RecipeService } from '../services/recipeService';
import { Ionicons } from '@expo/vector-icons';

// UI Components
import { Button, Card, Text } from '../components/ui';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { useToast } from '../contexts/ToastContext';
import { useHaptics } from '../hooks/useHaptics';
import { useTranslation } from 'react-i18next';

// Theme
import { spacing, borderRadius, shadows } from '../theme/design-tokens';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - spacing[5] * 3) / 2;

type RecipeResultsScreenProps = {
  navigation: StackNavigationProp<HomeStackParamList, 'RecipeResults'>;
  route: RouteProp<HomeStackParamList, 'RecipeResults'>;
};

type FilterOption = 'all' | 'exact' | 'near';

const RecipeResultsScreen: React.FC<RecipeResultsScreenProps> = ({
  navigation,
  route,
}) => {
  const { ingredients, aiRecipes } = route.params;
  const [searchResults, setSearchResults] = useState<RecipeSearchResult | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(!aiRecipes);
  const [refreshing, setRefreshing] = useState(false);
  const [filterBy, setFilterBy] = useState<FilterOption>('all');

  const { colors } = useThemedStyles();
  const { showSuccess, showError } = useToast();
  const haptics = useHaptics();
  const { t } = useTranslation();

  const fadeAnimation = useRef(new Animated.Value(0)).current;

  // Get all recipes for processing
  const allRecipes = searchResults
    ? [...searchResults.exactMatches, ...searchResults.nearMatches]
    : aiRecipes || [];

  // Filter recipes
  const filteredRecipes = React.useMemo(() => {
    let result = [...allRecipes];

    if (filterBy === 'exact' && searchResults) {
      result = searchResults.exactMatches;
    } else if (filterBy === 'near' && searchResults) {
      result = searchResults.nearMatches;
    }

    return result;
  }, [allRecipes, filterBy, searchResults]);

  const loadRecipes = async () => {
    if (aiRecipes) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      Logger.info('Searching for recipes with ingredients:', ingredients);
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
      showError(t('recipeResultsScreen.failedToLoad'));
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
      showSuccess(t('recipeResultsScreen.recipesRefreshed'));
    } catch (error) {
      showError(t('recipeResultsScreen.refreshFailed'));
    } finally {
      setRefreshing(false);
    }
  };

  const shareResults = async () => {
    try {
      haptics.light();
      const message = t('recipeResultsScreen.shareMessage', {
        ingredients: ingredients.join(', '),
        count: filteredRecipes.length
      });
      await Share.share({
        message,
        title: t('recipeResultsScreen.title'),
      });
    } catch (error) {
      Logger.error('Share failed:', error);
    }
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
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    loadRecipes();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: colors.background.primary },
        ]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size='large' color={colors.primary[500]} />
          <Text
            variant='bodyLarge'
            color='secondary'
            style={{ marginTop: spacing[4] }}
          >
            {t('recipeResultsScreen.searchingRecipes')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background.primary }]}
    >
      <StatusBar barStyle='dark-content' />

      {/* Fixed Header */}
      <View
        style={[
          styles.header,
          { borderBottomColor: colors.border.light },
        ]}
      >
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons
            name='arrow-back'
            size={24}
            color={colors.text.primary}
          />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text variant='headlineMedium' weight='semibold'>
            {t('recipeResultsScreen.title')}
          </Text>
          <Text variant='bodySmall' color='secondary'>
            {t('recipeResultsScreen.recipesFound', { count: filteredRecipes.length })}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.headerButton}
          onPress={shareResults}
        >
          <Ionicons
            name='share-outline'
            size={22}
            color={colors.text.primary}
          />
        </TouchableOpacity>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary[500]]}
            tintColor={colors.primary[500]}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Ingredients Used */}
        <View style={styles.ingredientsSection}>
          <Text variant='labelLarge' weight='medium' style={{ marginBottom: spacing[2] }}>
            {t('recipeResultsScreen.ingredients', { count: ingredients.length })}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.ingredientsList}>
              {ingredients.map((ingredient, index) => (
                <View
                  key={index}
                  style={[
                    styles.ingredientChip,
                    { backgroundColor: colors.primary[100] },
                  ]}
                >
                  <Text variant='bodySmall' style={{ color: colors.primary[700] }}>
                    {ingredient}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Filter Tabs */}
        {searchResults && (
          <View
            style={[
              styles.filterContainer,
              { backgroundColor: colors.surface.primary },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.filterTab,
                filterBy === 'all' && [
                  styles.activeFilterTab,
                  { backgroundColor: colors.primary[100] },
                ],
              ]}
              onPress={() => {
                setFilterBy('all');
                haptics.selection();
              }}
            >
              <Text
                variant='labelMedium'
                weight={filterBy === 'all' ? 'semibold' : 'normal'}
                color={filterBy === 'all' ? 'primary' : 'secondary'}
              >
                {t('recipeResultsScreen.allRecipes')} ({allRecipes.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterTab,
                filterBy === 'exact' && [
                  styles.activeFilterTab,
                  { backgroundColor: colors.primary[100] },
                ],
              ]}
              onPress={() => {
                setFilterBy('exact');
                haptics.selection();
              }}
            >
              <Text
                variant='labelMedium'
                weight={filterBy === 'exact' ? 'semibold' : 'normal'}
                color={filterBy === 'exact' ? 'primary' : 'secondary'}
              >
                {t('recipeResultsScreen.exactMatches')} ({searchResults.exactMatches.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterTab,
                filterBy === 'near' && [
                  styles.activeFilterTab,
                  { backgroundColor: colors.primary[100] },
                ],
              ]}
              onPress={() => {
                setFilterBy('near');
                haptics.selection();
              }}
            >
              <Text
                variant='labelMedium'
                weight={filterBy === 'near' ? 'semibold' : 'normal'}
                color={filterBy === 'near' ? 'primary' : 'secondary'}
              >
                {t('recipeResultsScreen.nearMatches')} ({searchResults.nearMatches.length})
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Recipes Grid */}
        <Animated.View
          style={[
            styles.recipesContainer,
            { opacity: fadeAnimation },
          ]}
        >
          {filteredRecipes.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons
                name='search-outline'
                size={64}
                color={colors.text.tertiary}
              />
              <Text
                variant='headlineSmall'
                color='secondary'
                style={{ marginTop: spacing[4], marginBottom: spacing[2] }}
              >
                {t('recipeResultsScreen.noRecipesFound')}
              </Text>
              <Text variant='bodyMedium' color='tertiary' style={{ textAlign: 'center' }}>
                {t('recipeResultsScreen.tryDifferentIngredients')}
              </Text>
            </View>
          ) : (
            <View style={styles.recipesGrid}>
              {filteredRecipes.map((recipe, index) => (
                <TouchableOpacity
                  key={recipe.id}
                  style={styles.recipeCard}
                  onPress={() => handleRecipePress(recipe)}
                  activeOpacity={0.8}
                >
                  <Card
                    variant='elevated'
                    style={[
                      styles.cardContent,
                      { backgroundColor: colors.surface.primary },
                    ]}
                  >
                    {/* Recipe Image */}
                    <View style={styles.imageContainer}>
                      {recipe.imageUrl ? (
                        <Image
                          source={{ uri: recipe.imageUrl }}
                          style={styles.recipeImage}
                          resizeMode='cover'
                        />
                      ) : (
                        <View
                          style={[
                            styles.imagePlaceholder,
                            { backgroundColor: colors.neutral[100] },
                          ]}
                        >
                          <Ionicons
                            name='restaurant'
                            size={32}
                            color={colors.neutral[400]}
                          />
                        </View>
                      )}

                      {/* AI Badge */}
                      {recipe.aiGenerated && (
                        <View style={[styles.aiBadge, { backgroundColor: colors.primary[500] }]}>
                          <Ionicons name='sparkles' size={10} color='white' />
                          <Text style={styles.aiBadgeText}>AI</Text>
                        </View>
                      )}

                      {/* Match Percentage */}
                      {recipe.matchingIngredients && recipe.totalIngredients && (
                        <View
                          style={[
                            styles.matchBadge,
                            {
                              backgroundColor:
                                recipe.matchingIngredients === recipe.totalIngredients
                                  ? colors.success[500]
                                  : colors.warning[500],
                            },
                          ]}
                        >
                          <Text style={styles.matchBadgeText}>
                            {Math.round(
                              (recipe.matchingIngredients / recipe.totalIngredients) * 100
                            )}
                            %
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Recipe Info */}
                    <View style={styles.recipeInfo}>
                      <Text
                        variant='bodyMedium'
                        weight='semibold'
                        numberOfLines={2}
                        style={{ marginBottom: spacing[1] }}
                      >
                        {recipe.name}
                      </Text>

                      <View style={styles.recipeStats}>
                        {recipe.cookingTime && (
                          <View style={styles.statItem}>
                            <Ionicons
                              name='time-outline'
                              size={14}
                              color={colors.text.secondary}
                            />
                            <Text variant='caption' color='secondary'>
                              {recipe.cookingTime} {t('recipeResultsScreen.min')}
                            </Text>
                          </View>
                        )}

                        {recipe.difficulty && (
                          <View style={styles.statItem}>
                            <Ionicons
                              name='speedometer-outline'
                              size={14}
                              color={colors.text.secondary}
                            />
                            <Text variant='caption' color='secondary'>
                              {recipe.difficulty === 'kolay'
                                ? t('recipeDetailScreen.easy')
                                : recipe.difficulty === 'orta'
                                  ? t('recipeDetailScreen.medium')
                                  : t('recipeDetailScreen.hard')}
                            </Text>
                          </View>
                        )}
                      </View>

                      {recipe.missingIngredients && recipe.missingIngredients.length > 0 && (
                        <View style={styles.missingInfo}>
                          <Text variant='caption' color='tertiary' numberOfLines={1}>
                            {t('recipeResultsScreen.missing')}: {recipe.missingIngredients.join(', ')}
                          </Text>
                        </View>
                      )}
                    </View>
                  </Card>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
  },
  headerButton: {
    padding: spacing[2],
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },

  // Content
  scrollContent: {
    paddingBottom: spacing[8],
  },

  // Ingredients Section
  ingredientsSection: {
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
  },
  ingredientsList: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  ingredientChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
  },

  // Filter
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    gap: spacing[2],
    marginBottom: spacing[3],
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing[5],
  },
  filterTab: {
    flex: 1,
    paddingVertical: spacing[2],
    alignItems: 'center',
    borderRadius: borderRadius.base,
  },
  activeFilterTab: {
    ...shadows.xs,
  },

  // Recipes
  recipesContainer: {
    paddingHorizontal: spacing[5],
  },
  recipesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
  },
  recipeCard: {
    width: CARD_WIDTH,
  },
  cardContent: {
    overflow: 'hidden',
  },
  imageContainer: {
    height: 120,
    position: 'relative',
  },
  recipeImage: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
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
    gap: 4,
  },
  aiBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  matchBadge: {
    position: 'absolute',
    top: spacing[2],
    right: spacing[2],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
  },
  matchBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
  },
  recipeInfo: {
    padding: spacing[3],
  },
  recipeStats: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[1],
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  missingInfo: {
    marginTop: spacing[2],
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[10],
  },
});

export default RecipeResultsScreen;