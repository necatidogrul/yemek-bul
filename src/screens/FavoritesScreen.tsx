import React, { useState, useEffect, useMemo } from "react";
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
} from "react-native";
import { Logger } from "../services/LoggerService";
import { StackNavigationProp } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { FavoritesStackParamList } from "../../App";
import { Recipe } from "../types/Recipe";
import { FavoritesService } from "../services/FavoritesService";
import { useCreditContext } from "../contexts/CreditContext";

// UI Components
import { Button, Card, Text } from "../components/ui";
import { RecipeCard } from "../components/ui/RecipeCard";
import { PullToRefresh } from "../components/ui/PullToRefresh";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
import { useOptimizedFlatList } from "../hooks/useOptimizedFlatList";
import { useTheme } from "../contexts/ThemeContext";
import { spacing, borderRadius, elevation } from "../contexts/ThemeContext";
import PaywallModal from "../components/premium/PaywallModal";
import { usePremiumGuard } from "../hooks/usePremiumGuard";
import { usePremium } from "../contexts/PremiumContext";
import { useToast } from "../contexts/ToastContext";
import { useHaptics } from "../hooks/useHaptics";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

type FavoritesScreenProps = {
  navigation: StackNavigationProp<FavoritesStackParamList, "FavoritesMain">;
};

type ViewMode = "list" | "grid";
type SortOption = "recent" | "name" | "cookingTime";
type FilterOption = "all" | "easy" | "medium" | "hard";

const FavoritesScreen: React.FC<FavoritesScreenProps> = ({ navigation }) => {
  const [favorites, setFavorites] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("recent");
  const [filterBy, setFilterBy] = useState<FilterOption>("all");
  const [showFilters, setShowFilters] = useState(false);

  const { colors } = useTheme();
  const { userCredits, canAfford } = useCreditContext();
  const { isPremium } = usePremium();
  const { showSuccess, showError, showWarning } = useToast();
  const haptics = useHaptics();

  const {
    showPaywall,
    currentFeature,
    paywallTitle,
    paywallDescription,
    checkPremiumFeature,
    hidePaywall,
  } = usePremiumGuard();

  // Animation for filter panel
  const filterAnimation = useState(new Animated.Value(0))[0];

  // Filtering and sorting logic
  const filteredFavorites = useMemo(() => {
    let result = [...favorites];

    // Apply search filter
    if (searchQuery.trim()) {
      result = result.filter(
        (recipe) =>
          recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          recipe.ingredients?.some((ingredient) =>
            ingredient.toLowerCase().includes(searchQuery.toLowerCase())
          )
      );
    }

    // Apply difficulty filter
    if (filterBy !== "all") {
      const difficultyMap = {
        easy: ["Kolay", "Easy"],
        medium: ["Orta", "Medium"],
        hard: ["Zor", "Hard"],
      };
      result = result.filter((recipe) =>
        difficultyMap[filterBy].includes(recipe.difficulty || "")
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "cookingTime":
          return (a.cookingTime || 30) - (b.cookingTime || 30);
        case "recent":
        default:
          return (
            new Date(b.createdAt || 0).getTime() -
            new Date(a.createdAt || 0).getTime()
          );
      }
    });

    return result;
  }, [favorites, searchQuery, sortBy, filterBy]);

  const { isRefreshing, handleRefresh } = usePullToRefresh({
    onRefresh: loadFavorites,
  });

  const { optimizedProps, onEndReached } = useOptimizedFlatList<Recipe>({
    enableGetItemLayout: true,
    itemHeight: viewMode === "grid" ? 180 : 120,
    keyExtractor: (item) => item.id || `recipe-${Date.now()}-${Math.random()}`,
  });

  async function loadFavorites() {
    try {
      setIsLoading(true);
      const favRecipes = await FavoritesService.getFavoriteRecipes();
      
      // Validate recipes have valid IDs
      const invalidRecipes = favRecipes.filter(recipe => !recipe.id);
      if (invalidRecipes.length > 0) {
        Logger.warn(`Found ${invalidRecipes.length} recipes without IDs, they should be auto-fixed`);
      }
      
      setFavorites(favRecipes);
      Logger.info(`Loaded ${favRecipes.length} favorite recipes`);
    } catch (error) {
      Logger.error("Failed to load favorites:", error);
      showError("Favoriler yüklenemedi");
      setFavorites([]); // Set empty array as fallback
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      loadFavorites();
    });

    loadFavorites();
    return unsubscribe;
  }, [navigation]);

  const handleRecipePress = (recipe: Recipe) => {
    // Check if recipe has valid id
    if (!recipe.id) {
      showError("Bu tarif bozuk görünüyor. Lütfen uygulamayı yeniden başlatın.");
      return;
    }

    // Premium users can view favorites freely
    // Free users need credit only for AI-generated recipe details
    if (!isPremium && recipe.aiGenerated && !canAfford("favorite_view")) {
      showWarning("AI tarif detaylarını görüntülemek için kredi gerekli");
      return;
    }

    navigation.navigate("RecipeDetail", {
      recipeId: recipe.id,
      recipeName: recipe.name,
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
    setSearchQuery("");
    setSortBy("recent");
    setFilterBy("all");
    haptics.selection();
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
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Ionicons name="restaurant" size={32} color="white" />

        {/* Premium Badge - removed (not in Recipe type) */}

        {/* Difficulty Badge */}
        {item.difficulty && (
          <View
            style={[
              styles.difficultyBadge,
              {
                backgroundColor:
                  item.difficulty === "kolay"
                    ? colors.semantic.success
                    : item.difficulty === "orta"
                    ? colors.semantic.warning
                    : colors.semantic.error,
              },
            ]}
          >
            <Ionicons
              name={
                item.difficulty === "kolay"
                  ? "checkmark"
                  : item.difficulty === "orta"
                  ? "pause"
                  : "alert"
              }
              size={10}
              color="white"
            />
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

        <TouchableOpacity
          style={[
            styles.favoriteIcon,
            { backgroundColor: colors.semantic.error + "20" },
          ]}
          onPress={async () => {
            if (!item.id) {
              showError("Bu tarif bozuk görünüyor. Favorileri temizlemeyi deneyin.");
              return;
            }
            
            const success = await FavoritesService.removeFromFavorites(item.id);
            if (success) {
              haptics.notificationSuccess();
              showSuccess("Tarif favorilerden çıkarıldı");
              loadFavorites(); // Refresh list
            } else {
              showError("Tarif çıkarılırken hata oluştu");
            }
          }}
        >
          <Ionicons name="heart" size={14} color={colors.semantic.error} />
        </TouchableOpacity>
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

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <LinearGradient
        colors={[colors.primary[100], colors.primary[200]]}
        style={styles.emptyIcon}
      >
        <Ionicons name="heart-outline" size={60} color={colors.primary[500]} />
      </LinearGradient>

      <Text
        variant="headlineSmall"
        weight="600"
        align="center"
        style={{ marginVertical: spacing.lg }}
      >
        {searchQuery || filterBy !== "all"
          ? "Sonuç Bulunamadı"
          : "Henüz Favori Yok"}
      </Text>

      <Text
        variant="bodyMedium"
        color="secondary"
        align="center"
        style={{ marginBottom: spacing.xl }}
      >
        {searchQuery || filterBy !== "all"
          ? "Arama kriterlerinize uygun favori tarif bulunamadı"
          : "Beğendiğin tarifleri favorilere ekleyerek burada görebilirsin"}
      </Text>

      {!searchQuery && filterBy === "all" && (
        <Button
          variant="primary"
          onPress={() => navigation.getParent()?.navigate("HomeTab" as any)}
          leftIcon={<Ionicons name="search" size={20} color="white" />}
        >
          Tarifler Keşfet
        </Button>
      )}

      {(searchQuery || filterBy !== "all") && (
        <Button
          variant="outline"
          onPress={clearFilters}
          leftIcon={<Ionicons name="refresh" size={20} />}
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
            outputRange: [0, 200],
          }),
          opacity: filterAnimation,
        },
      ]}
    >
      <View style={styles.filterRow}>
        <Text variant="labelMedium" weight="600">
          Sıralama:
        </Text>
        <View style={styles.filterOptions}>
          {[
            { key: "recent", label: "En Yeni" },
            { key: "name", label: "İsim" },
            { key: "cookingTime", label: "Süre" },
          ].map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.filterOption,
                {
                  backgroundColor:
                    sortBy === option.key ? colors.primary[500] : "transparent",
                  borderColor: colors.primary[500],
                },
              ]}
              onPress={() => setSortBy(option.key as SortOption)}
            >
              <Text
                variant="labelSmall"
                weight="500"
                style={{
                  color: sortBy === option.key ? "white" : colors.primary[500],
                }}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.filterRow}>
        <Text variant="labelMedium" weight="600">
          Zorluk:
        </Text>
        <View style={styles.filterOptions}>
          {[
            { key: "all", label: "Tümü" },
            { key: "easy", label: "Kolay" },
            { key: "medium", label: "Orta" },
            { key: "hard", label: "Zor" },
          ].map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.filterOption,
                {
                  backgroundColor:
                    filterBy === option.key
                      ? colors.secondary[500]
                      : "transparent",
                  borderColor: colors.secondary[500],
                },
              ]}
              onPress={() => setFilterBy(option.key as FilterOption)}
            >
              <Text
                variant="labelSmall"
                weight="500"
                style={{
                  color:
                    filterBy === option.key ? "white" : colors.secondary[500],
                }}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.clearFiltersButton,
          { borderColor: colors.neutral[300] },
        ]}
        onPress={clearFilters}
      >
        <Ionicons name="refresh" size={16} color={colors.text.secondary} />
        <Text variant="labelMedium" color="secondary">
          Temizle
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <Text variant="displaySmall" weight="700">
              Favorilerim
            </Text>
            <Text variant="bodyMedium" color="secondary">
              {filteredFavorites.length} tarif
            </Text>
          </View>

          <View style={styles.headerRight}>
            <TouchableOpacity
              style={[
                styles.headerButton,
                {
                  backgroundColor:
                    viewMode === "grid" ? colors.primary[500] : colors.surface,
                },
              ]}
              onPress={() => {
                setViewMode("grid");
                haptics.selection();
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
                styles.headerButton,
                {
                  backgroundColor:
                    viewMode === "list" ? colors.primary[500] : colors.surface,
                },
              ]}
              onPress={() => {
                setViewMode("list");
                haptics.selection();
              }}
            >
              <Ionicons
                name="list"
                size={20}
                color={viewMode === "list" ? "white" : colors.text.primary}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search and Filter */}
        <View style={styles.searchContainer}>
          <View
            style={[styles.searchInput, { backgroundColor: colors.surface }]}
          >
            <Ionicons name="search" size={20} color={colors.text.secondary} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Favorilerde ara..."
              placeholderTextColor={colors.text.secondary}
              style={[styles.searchText, { color: colors.text.primary }]}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons
                  name="close-circle"
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
              name="options"
              size={20}
              color={showFilters ? "white" : colors.text.primary}
            />
          </TouchableOpacity>
        </View>

        {/* Filter Panel */}
        {renderFilterPanel()}
      </View>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text
            variant="bodyMedium"
            color="secondary"
            style={{ marginTop: spacing.md }}
          >
            Favoriler yükleniyor...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredFavorites}
          renderItem={viewMode === "grid" ? renderGridItem : renderListItem}
          numColumns={viewMode === "grid" ? 2 : 1}
          key={viewMode} // Force re-render when switching modes
          contentContainerStyle={[
            styles.listContainer,
            filteredFavorites.length === 0 && styles.emptyListContainer,
            { flexGrow: 1, paddingBottom: 100 },
          ]}
          bounces={true}
          nestedScrollEnabled={true}
          columnWrapperStyle={viewMode === "grid" ? styles.gridRow : undefined}
          showsVerticalScrollIndicator={false}
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          {...optimizedProps}
          ListEmptyComponent={renderEmpty}
          ItemSeparatorComponent={() =>
            viewMode === "list" ? <View style={{ height: spacing.sm }} /> : null
          }
        />
      )}

      <PaywallModal
        visible={showPaywall}
        onClose={hidePaywall}
        feature={(currentFeature || "general") as any}
        title={paywallTitle}
        description={paywallDescription}
      />
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.lg,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    ...elevation.low,
  },

  // Search
  searchContainer: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
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
    alignItems: "center",
    justifyContent: "center",
    ...elevation.low,
  },

  // Filter Panel
  filterPanel: {
    borderRadius: borderRadius.large,
    padding: spacing.md,
    gap: spacing.md,
    overflow: "hidden",
    ...elevation.medium,
  },
  filterRow: {
    gap: spacing.sm,
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
  clearFiltersButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.medium,
    borderWidth: 1,
    gap: spacing.xs,
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

  // Grid Items
  gridItem: {
    width: (screenWidth - spacing.md * 3) / 2,
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
  premiumBadge: {
    position: "absolute",
    top: spacing.xs,
    left: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.tiny,
    borderRadius: borderRadius.small,
  },
  difficultyBadge: {
    position: "absolute",
    top: spacing.xs,
    right: spacing.xs,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  gridItemContent: {
    padding: spacing.md,
    position: "relative",
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
  favoriteIcon: {
    position: "absolute",
    top: spacing.xs,
    right: spacing.xs,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  // Empty State
  emptyContainer: {
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxxl,
  },
  emptyIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default FavoritesScreen;
