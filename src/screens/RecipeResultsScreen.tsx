import React, { useEffect, useState, useRef } from "react";
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
} from "react-native";
import { Logger } from "../services/LoggerService";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { HomeStackParamList } from "../../App";
import { Recipe, RecipeSearchResult } from "../types/Recipe";
import { RecipeService } from "../services/recipeService";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

// UI Components
import { Button, Card, Text } from "../components/ui";
import { RecipeCard } from "../components/ui/RecipeCard";
import {
  useTheme,
  spacing,
  borderRadius,
  elevation,
  colors,
} from "../contexts/ThemeContext";
// import { spacing as designTokensSpacing } from "../theme/design-tokens";
import { useToast } from "../contexts/ToastContext";
import { useHaptics } from "../hooks/useHaptics";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
// import { useOptimizedFlatList } from "../hooks/useOptimizedFlatList";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

type RecipeResultsScreenProps = {
  navigation: StackNavigationProp<HomeStackParamList, "RecipeResults">;
  route: RouteProp<HomeStackParamList, "RecipeResults">;
};

type ViewMode = "grid" | "list";
type SortOption = "relevance" | "cookingTime" | "name" | "rating";
type FilterOption = "all" | "exact" | "near";

const RecipeResultsScreen: React.FC<RecipeResultsScreenProps> = ({
  navigation,
  route,
}) => {
  const { ingredients, aiRecipes } = route.params;
  const [searchResults, setSearchResults] = useState<RecipeSearchResult | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(!aiRecipes);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortBy, setSortBy] = useState<SortOption>("relevance");
  const [filterBy, setFilterBy] = useState<FilterOption>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const { colors } = useTheme();
  const { showSuccess, showError, showInfo } = useToast();
  const haptics = useHaptics();

  const scrollY = useRef(new Animated.Value(0)).current;
  const filterAnimation = useRef(new Animated.Value(0)).current;

  // Get all recipes for processing
  const allRecipes = searchResults
    ? [...searchResults.exactMatches, ...searchResults.nearMatches]
    : aiRecipes || [];

  // Filter and sort recipes
  const processedRecipes = React.useMemo(() => {
    let result = [...allRecipes];

    // Apply filter
    if (filterBy === "exact" && searchResults) {
      result = searchResults.exactMatches;
    } else if (filterBy === "near" && searchResults) {
      result = searchResults.nearMatches;
    }

    // Apply tag filtering
    if (selectedTags.length > 0) {
      result = result.filter((recipe) =>
        selectedTags.some(
          (tag) =>
            recipe.ingredients?.some((ingredient: string) =>
              ingredient.toLowerCase().includes(tag.toLowerCase())
            ) || recipe.name.toLowerCase().includes(tag.toLowerCase())
        )
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "cookingTime":
          return (a.cookingTime || 30) - (b.cookingTime || 30);
        case "rating":
          return (b.rating || 0) - (a.rating || 0);
        case "relevance":
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
  }, [allRecipes, filterBy, selectedTags, sortBy, searchResults]);

  // Popular ingredient tags
  const ingredientTags = React.useMemo(() => {
    const tagCount: { [key: string]: number } = {};
    allRecipes.forEach((recipe) => {
      recipe.ingredients?.forEach((ingredient: string) => {
        const cleanIngredient = ingredient
          .split(" ")
          .find(
            (word: string) =>
              word.length > 3 &&
              !["adet", "gram", "litre", "kaşık", "bardak"].includes(
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
      .slice(0, 8)
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
      Logger.error("Recipe search failed:", error);
      showError("Tarifler yüklenemedi");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadRecipes();
    setRefreshing(false);
    haptics.notificationSuccess();
    showSuccess("Tarifler yenilendi");
  };

  const shareResults = async () => {
    try {
      const message = `🍽️ ${ingredients.join(", ")} ile ${
        processedRecipes.length
      } tarif buldum!\n\nYemek Bulucu ile paylaşıldı`;
      await Share.share({
        message,
        title: "Tarif Sonuçları",
      });
    } catch (error) {
      Logger.error("Share failed:", error);
    }
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

  const clearAllFilters = () => {
    setFilterBy("all");
    setSelectedTags([]);
    setSortBy("relevance");
    haptics.lightImpact();
  };

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags((prev) => prev.filter((t) => t !== tag));
    } else {
      setSelectedTags((prev) => [...prev, tag]);
    }
    haptics.lightImpact();
  };

  const handleRecipePress = (recipe: Recipe) => {
    navigation.navigate("RecipeDetail", {
      recipeId: recipe.id,
      recipeName: recipe.name,
      recipe: recipe,
      isAiGenerated: recipe.aiGenerated || false,
    });
  };

  const pullToRefresh = usePullToRefresh({
    onRefresh: handleRefresh,
    enabled: true,
  });

  // Removed useOptimizedFlatList hook usage

  useEffect(() => {
    loadRecipes();
  }, []);

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
        <Ionicons name="restaurant" size={28} color="white" />

        {/* Match Badge */}
        {item.matchingIngredients && item.totalIngredients && (
          <View
            style={[
              styles.matchBadge,
              {
                backgroundColor:
                  item.matchingIngredients === item.totalIngredients
                    ? colors.semantic.success
                    : colors.semantic.warning,
              },
            ]}
          >
            <Text variant="labelSmall" weight="600" style={{ color: "white" }}>
              {Math.round(
                (item.matchingIngredients / item.totalIngredients) * 100
              )}
              %
            </Text>
          </View>
        )}
      </LinearGradient>

      <View style={styles.gridItemContent}>
        <Text variant="labelLarge" weight="600" numberOfLines={2}>
          {item.name}
        </Text>

        <View style={styles.gridItemStats}>
          <View style={styles.gridItemStat}>
            <Ionicons
              name="time-outline"
              size={12}
              color={colors.text.secondary}
            />
            <Text variant="labelSmall" color="secondary">
              {item.cookingTime || "30"}dk
            </Text>
          </View>

          <View style={styles.gridItemStat}>
            <Ionicons
              name="people-outline"
              size={12}
              color={colors.text.secondary}
            />
            <Text variant="labelSmall" color="secondary">
              {item.servings || "4"}
            </Text>
          </View>
        </View>

        {item.difficulty && (
          <View
            style={[
              styles.difficultyIndicator,
              {
                backgroundColor:
                  item.difficulty === "kolay"
                    ? colors.semantic.success + "20"
                    : item.difficulty === "orta"
                    ? colors.semantic.warning + "20"
                    : colors.semantic.error + "20",
              },
            ]}
          >
            <Text
              variant="labelSmall"
              weight="500"
              style={{
                color:
                  item.difficulty === "kolay"
                    ? colors.semantic.success
                    : item.difficulty === "orta"
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
      variant="compact"
      onPress={() => handleRecipePress(item)}
    />
  );

  const renderFilterPanel = () => (
    <Animated.View
      style={[
        styles.filterPanel,
        {
          backgroundColor: colors.surface,
          maxHeight: filterAnimation.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 300],
          }),
          opacity: filterAnimation,
        },
      ]}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Filter Options */}
        <View style={styles.filterSection}>
          <Text
            variant="labelLarge"
            weight="600"
            style={{ marginBottom: spacing.sm }}
          >
            Sonuç Tipi
          </Text>
          <View style={styles.filterOptions}>
            {[
              { key: "all", label: "Tümü" },
              { key: "exact", label: "Tam Eşleşme" },
              { key: "near", label: "Yakın Eşleşme" },
            ].map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.filterOption,
                  {
                    backgroundColor:
                      filterBy === option.key
                        ? colors.primary[500]
                        : "transparent",
                    borderColor: colors.primary[500],
                  },
                ]}
                onPress={() => setFilterBy(option.key as FilterOption)}
              >
                <Text
                  variant="labelSmall"
                  weight="500"
                  style={{
                    color:
                      filterBy === option.key ? "white" : colors.primary[500],
                  }}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Sort Options */}
        <View style={styles.filterSection}>
          <Text
            variant="labelLarge"
            weight="600"
            style={{ marginBottom: spacing.sm }}
          >
            Sıralama
          </Text>
          <View style={styles.filterOptions}>
            {[
              { key: "relevance", label: "Uygunluk", icon: "star" },
              { key: "name", label: "İsim", icon: "text" },
              { key: "cookingTime", label: "Süre", icon: "time" },
              { key: "rating", label: "Puan", icon: "heart" },
            ].map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.sortOption,
                  {
                    backgroundColor:
                      sortBy === option.key
                        ? colors.secondary[500]
                        : colors.surface,
                  },
                ]}
                onPress={() => setSortBy(option.key as SortOption)}
              >
                <Ionicons
                  name={option.icon as any}
                  size={16}
                  color={sortBy === option.key ? "white" : colors.text.primary}
                />
                <Text
                  variant="labelMedium"
                  weight="500"
                  style={{
                    color:
                      sortBy === option.key ? "white" : colors.text.primary,
                  }}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Ingredient Tags */}
        {ingredientTags.length > 0 && (
          <View style={styles.filterSection}>
            <Text
              variant="labelLarge"
              weight="600"
              style={{ marginBottom: spacing.sm }}
            >
              Popüler Malzemeler
            </Text>
            <View style={styles.tagContainer}>
              {ingredientTags.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  style={[
                    styles.ingredientTag,
                    {
                      backgroundColor: selectedTags.includes(tag)
                        ? colors.primary[500]
                        : colors.primary[50],
                      borderColor: colors.primary[300],
                    },
                  ]}
                  onPress={() => toggleTag(tag)}
                >
                  <Text
                    variant="labelSmall"
                    weight="500"
                    style={{
                      color: selectedTags.includes(tag)
                        ? "white"
                        : colors.primary[600],
                    }}
                  >
                    {tag}
                  </Text>
                  {selectedTags.includes(tag) && (
                    <Ionicons name="checkmark" size={12} color="white" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Clear Filters */}
        <TouchableOpacity
          style={[
            styles.clearFiltersButton,
            { borderColor: colors.neutral[300] },
          ]}
          onPress={clearAllFilters}
        >
          <Ionicons name="refresh" size={16} color={colors.text.secondary} />
          <Text variant="labelMedium" color="secondary">
            Filtreleri Temizle
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </Animated.View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <LinearGradient
        colors={[colors.primary[100], colors.primary[200]]}
        style={styles.emptyIcon}
      >
        <Ionicons name="search-outline" size={60} color={colors.primary[500]} />
      </LinearGradient>

      <Text
        variant="headlineSmall"
        weight="600"
        align="center"
        style={{ marginVertical: spacing.lg }}
      >
        Tarif Bulunamadı
      </Text>

      <Text
        variant="bodyMedium"
        color="secondary"
        align="center"
        style={{ marginBottom: spacing.xl }}
      >
        Seçili filtrelere uygun tarif bulunamadı. Farklı filtreler deneyin.
      </Text>

      <Button
        variant="outline"
        onPress={clearAllFilters}
        leftIcon={<Ionicons name="refresh" size={20} />}
      >
        Filtreleri Temizle
      </Button>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <StatusBar barStyle="light-content" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text
            variant="headlineSmall"
            weight="600"
            style={{ marginTop: spacing.md }}
          >
            Tarifler Yükleniyor...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBar barStyle="light-content" />

      {/* Modern Hero Header */}
      <LinearGradient
        colors={[
          colors.primary[500],
          colors.primary[600],
          colors.secondary[500],
        ]}
        style={styles.heroHeader}
      >
        <View style={styles.headerContainer}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>

            <View style={styles.headerInfo}>
              <Text
                variant="headlineSmall"
                weight="700"
                style={{ color: "white" }}
              >
                Tarif Sonuçları
              </Text>
              <Text
                variant="bodyMedium"
                style={{ color: "rgba(255,255,255,0.8)" }}
              >
                {processedRecipes.length} tarif bulundu
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.shareButton} onPress={shareResults}>
            <Ionicons name="share-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Search Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <View
              style={[
                styles.statIcon,
                { backgroundColor: "rgba(255,255,255,0.2)" },
              ]}
            >
              <Ionicons name="restaurant" size={16} color="white" />
            </View>
            <Text variant="labelSmall" style={{ color: "white" }}>
              {ingredients.length} malzeme
            </Text>
          </View>

          {searchResults && (
            <>
              <View style={styles.statItem}>
                <View
                  style={[
                    styles.statIcon,
                    { backgroundColor: "rgba(255,255,255,0.2)" },
                  ]}
                >
                  <Ionicons name="checkmark-circle" size={16} color="white" />
                </View>
                <Text variant="labelSmall" style={{ color: "white" }}>
                  {searchResults.exactMatches.length} tam eşleşme
                </Text>
              </View>

              <View style={styles.statItem}>
                <View
                  style={[
                    styles.statIcon,
                    { backgroundColor: "rgba(255,255,255,0.2)" },
                  ]}
                >
                  <Ionicons name="add-circle" size={16} color="white" />
                </View>
                <Text variant="labelSmall" style={{ color: "white" }}>
                  {searchResults.nearMatches.length} yakın eşleşme
                </Text>
              </View>
            </>
          )}
        </View>
      </LinearGradient>

      {/* Ingredients Tags */}
      <View
        style={[
          styles.ingredientsSection,
          { backgroundColor: colors.background },
        ]}
      >
        <View style={styles.ingredientsHeader}>
          <Ionicons
            name="restaurant-outline"
            size={20}
            color={colors.primary[500]}
          />
          <Text variant="labelLarge" weight="600">
            Kullanılan Malzemeler
          </Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.ingredientsContainer}>
            {ingredients.map((ingredient, index) => (
              <View
                key={index}
                style={[
                  styles.ingredientChip,
                  { backgroundColor: colors.primary[50] },
                ]}
              >
                <Text
                  variant="labelSmall"
                  weight="500"
                  style={{ color: colors.primary[700] }}
                >
                  {ingredient}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Controls */}
      <View
        style={[styles.controlsSection, { backgroundColor: colors.background }]}
      >
        {/* View Mode Toggle */}
        <View style={styles.viewControls}>
          <TouchableOpacity
            style={[
              styles.viewModeButton,
              {
                backgroundColor:
                  viewMode === "grid" ? colors.primary[500] : colors.surface,
              },
            ]}
            onPress={() => {
              setViewMode("grid");
              haptics.lightImpact();
            }}
          >
            <Ionicons
              name="grid"
              size={20}
              color={viewMode === "grid" ? "white" : colors.text.primary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.viewModeButton,
              {
                backgroundColor:
                  viewMode === "list" ? colors.primary[500] : colors.surface,
              },
            ]}
            onPress={() => {
              setViewMode("list");
              haptics.lightImpact();
            }}
          >
            <Ionicons
              name="list"
              size={20}
              color={viewMode === "list" ? "white" : colors.text.primary}
            />
          </TouchableOpacity>
        </View>

        {/* Filter Button */}
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
            name="options"
            size={20}
            color={showFilters ? "white" : colors.text.primary}
          />
          <Text
            variant="labelMedium"
            weight="500"
            style={{
              color: showFilters ? "white" : colors.text.primary,
            }}
          >
            Filtrele
          </Text>
          {(filterBy !== "all" ||
            selectedTags.length > 0 ||
            sortBy !== "relevance") && (
            <View
              style={[
                styles.filterIndicator,
                { backgroundColor: colors.semantic.error },
              ]}
            />
          )}
        </TouchableOpacity>
      </View>

      {/* Filter Panel */}
      {renderFilterPanel()}

      {/* Content */}
      {processedRecipes.length === 0 ? (
        renderEmpty()
      ) : (
        <FlatList
          data={processedRecipes}
          keyExtractor={(item) => item.id}
          renderItem={viewMode === "grid" ? renderGridItem : renderListItem}
          numColumns={viewMode === "grid" ? 2 : 1}
          key={viewMode}
          contentContainerStyle={[
            styles.listContainer,
            processedRecipes.length === 0 && styles.emptyListContainer,
          ]}
          columnWrapperStyle={viewMode === "grid" ? styles.gridRow : undefined}
          showsVerticalScrollIndicator={false}
          refreshing={pullToRefresh.isRefreshing}
          onRefresh={pullToRefresh.handleRefresh}
          onEndReached={() => {}}
          onEndReachedThreshold={0.5}
          getItemLayout={(data, index) => ({
            length: viewMode === "grid" ? 200 : 140,
            offset: (viewMode === "grid" ? 200 : 140) * index,
            index,
          })}
          ItemSeparatorComponent={() =>
            viewMode === "list" ? <View style={{ height: 12 }} /> : null
          }
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Hero Header
  heroHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    ...elevation.medium,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  headerInfo: {
    marginLeft: spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  shareButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Stats
  statsContainer: {
    flexDirection: "row",
    gap: spacing.lg,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  statIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  // Ingredients Section
  ingredientsSection: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...elevation.low,
  },
  ingredientsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  ingredientsContainer: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  ingredientChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.primary[200],
  },

  // Controls Section
  controlsSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...elevation.low,
  },
  viewControls: {
    flexDirection: "row",
    backgroundColor: colors.light.surface,
    borderRadius: borderRadius.medium,
    padding: spacing.xs,
  },
  viewModeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.medium,
    gap: spacing.xs,
    position: "relative",
    ...elevation.low,
  },
  filterIndicator: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // Filter Panel
  filterPanel: {
    marginHorizontal: spacing.lg,
    borderRadius: borderRadius.large,
    padding: spacing.md,
    overflow: "hidden",
    ...elevation.medium,
  },
  filterSection: {
    marginBottom: spacing.lg,
  },
  filterOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  filterOption: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.medium,
    borderWidth: 1,
  },
  sortOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
    ...elevation.low,
  },
  tagContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  ingredientTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    gap: spacing.tiny,
  },
  clearFiltersButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    borderRadius: borderRadius.medium,
    borderWidth: 1,
    gap: spacing.xs,
    marginTop: spacing.sm,
  },

  // Content
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  listContainer: {
    padding: spacing.md,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: "center",
  },
  gridRow: {
    justifyContent: "space-between",
    paddingHorizontal: spacing.xs,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxxl,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },

  // Grid Items
  gridItem: {
    width: (screenWidth - spacing.lg * 3) / 2,
    borderRadius: borderRadius.large,
    overflow: "hidden",
    marginBottom: spacing.md,
    ...elevation.low,
  },
  gridItemImage: {
    height: 120,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  matchBadge: {
    position: "absolute",
    top: spacing.xs,
    left: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.tiny,
    borderRadius: borderRadius.small,
  },
  gridItemContent: {
    padding: spacing.md,
  },
  gridItemStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.xs,
  },
  gridItemStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.tiny,
  },
  difficultyIndicator: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.tiny,
    borderRadius: borderRadius.full,
    marginTop: spacing.xs,
  },
});

export default RecipeResultsScreen;
