import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  FlatList,
  Alert,
  SafeAreaView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { AllRecipesStackParamList } from "../../App";
import { Recipe } from "../types/Recipe";
import { RecipeService } from "../services/recipeService";
import { Ionicons } from "@expo/vector-icons";
import { debounce } from "lodash";

// UI Components
import { Input, Text, Card, Button } from "../components/ui";
import { RecipeCard } from "../components/ui/RecipeCard";
import { colors, spacing, borderRadius } from "../theme/design-tokens";

type AllRecipesScreenProps = {
  navigation: StackNavigationProp<AllRecipesStackParamList, "AllRecipesMain">;
};

interface FilterState {
  category: string;
  difficulty: string;
}

const AllRecipesScreen: React.FC<AllRecipesScreenProps> = ({ navigation }) => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    category: "all",
    difficulty: "all",
  });

  const categories = [
    { label: "Tümü", value: "all" },
    { label: "Çorba", value: "çorba" },
    { label: "Ana Yemek", value: "ana_yemek" },
    { label: "Salata", value: "salata" },
    { label: "Tatlı", value: "tatlı" },
    { label: "Aperatif", value: "aperatif" },
  ];

  const difficulties = [
    { label: "Tümü", value: "all" },
    { label: "Kolay", value: "kolay" },
    { label: "Orta", value: "orta" },
    { label: "Zor", value: "zor" },
  ];

  // Debounced search function
  const debouncedSearch = useMemo(
    () =>
      debounce(async (term: string) => {
        setCurrentPage(1);
        await loadRecipes(1, term, filters);
      }, 500),
    [filters]
  );

  const loadRecipes = async (
    page: number = 1,
    search: string = "",
    currentFilters: FilterState = filters
  ) => {
    try {
      if (page === 1) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      let result;

      if (search.trim()) {
        result = await RecipeService.searchRecipesByName(search.trim(), page);
      } else if (
        currentFilters.category !== "all" ||
        currentFilters.difficulty !== "all"
      ) {
        result = await RecipeService.getRecipesByFilter(
          currentFilters.category,
          currentFilters.difficulty,
          page
        );
      } else {
        result = await RecipeService.getAllRecipes(page);
      }

      if (page === 1) {
        setRecipes(result.recipes);
      } else {
        setRecipes((prev) => [...prev, ...result.recipes]);
      }

      setTotalCount(result.totalCount);
      setHasMore(result.hasMore);
      setCurrentPage(page);
    } catch (error) {
      console.error("Load recipes error:", error);
      Alert.alert("Hata", "Tarifler yüklenirken bir hata oluştu.");
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
      setIsRefreshing(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadRecipes(1, searchTerm, filters);
  }, [searchTerm, filters]);

  const loadMore = useCallback(async () => {
    if (!isLoadingMore && hasMore) {
      await loadRecipes(currentPage + 1, searchTerm, filters);
    }
  }, [isLoadingMore, hasMore, currentPage, searchTerm, filters]);

  const handleSearch = useCallback(
    (text: string) => {
      setSearchTerm(text);
      debouncedSearch(text);
    },
    [debouncedSearch]
  );

  const applyFilters = useCallback(async () => {
    setShowFilters(false);
    setCurrentPage(1);
    await loadRecipes(1, searchTerm, filters);
  }, [searchTerm, filters]);

  const clearFilters = useCallback(() => {
    setFilters({ category: "all", difficulty: "all" });
  }, []);

  const onRecipePress = (recipe: Recipe) => {
    navigation.navigate("RecipeDetail", {
      recipeId: recipe.id,
      recipeName: recipe.name,
    });
  };

  useEffect(() => {
    loadRecipes();
  }, []);

  const renderRecipeItem = ({ item }: { item: Recipe }) => (
    <RecipeCard recipe={item} onPress={() => onRecipePress(item)} />
  );

  const renderListHeader = () => (
    <View style={styles.headerContainer}>
      {/* Search Bar */}
      <Card variant="default" size="md" style={styles.searchCard}>
        <Input
          placeholder="Tarif adında ara..."
          value={searchTerm}
          onChangeText={handleSearch}
          variant="filled"
          size="lg"
          leftIcon={
            <Ionicons name="search" size={20} color={colors.neutral[500]} />
          }
          rightIcon={
            searchTerm ? (
              <TouchableOpacity onPress={() => handleSearch("")}>
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={colors.neutral[500]}
                />
              </TouchableOpacity>
            ) : null
          }
        />
      </Card>

      {/* Filter Section */}
      <Card variant="default" size="md" style={styles.filterCard}>
        <View style={styles.filterHeader}>
          <Text variant="bodyLarge" weight="semibold">
            Filtreler
          </Text>
          <TouchableOpacity
            onPress={() => setShowFilters(!showFilters)}
            style={styles.filterToggle}
          >
            <Ionicons
              name={showFilters ? "chevron-up" : "chevron-down"}
              size={20}
              color={colors.primary[500]}
            />
          </TouchableOpacity>
        </View>

        {showFilters && (
          <View style={styles.filtersContainer}>
            {/* Category Filter */}
            <View style={styles.filterGroup}>
              <Text variant="body" weight="medium" style={styles.filterLabel}>
                Kategori
              </Text>
              <View style={styles.filterOptions}>
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category.value}
                    style={[
                      styles.filterOption,
                      filters.category === category.value &&
                        styles.filterOptionActive,
                    ]}
                    onPress={() =>
                      setFilters((prev) => ({
                        ...prev,
                        category: category.value,
                      }))
                    }
                  >
                    <Text
                      variant="bodySmall"
                      color={
                        filters.category === category.value
                          ? "primary"
                          : "secondary"
                      }
                      weight={
                        filters.category === category.value
                          ? "semibold"
                          : "medium"
                      }
                    >
                      {category.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Difficulty Filter */}
            <View style={styles.filterGroup}>
              <Text variant="body" weight="medium" style={styles.filterLabel}>
                Zorluk
              </Text>
              <View style={styles.filterOptions}>
                {difficulties.map((difficulty) => (
                  <TouchableOpacity
                    key={difficulty.value}
                    style={[
                      styles.filterOption,
                      filters.difficulty === difficulty.value &&
                        styles.filterOptionActive,
                    ]}
                    onPress={() =>
                      setFilters((prev) => ({
                        ...prev,
                        difficulty: difficulty.value,
                      }))
                    }
                  >
                    <Text
                      variant="bodySmall"
                      color={
                        filters.difficulty === difficulty.value
                          ? "primary"
                          : "secondary"
                      }
                      weight={
                        filters.difficulty === difficulty.value
                          ? "semibold"
                          : "medium"
                      }
                    >
                      {difficulty.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Filter Actions */}
            <View style={styles.filterActions}>
              <Button variant="outline" size="sm" onPress={clearFilters}>
                Temizle
              </Button>
              <Button variant="primary" size="sm" onPress={applyFilters}>
                Filtrele
              </Button>
            </View>
          </View>
        )}
      </Card>

      {/* Results Info */}
      <View style={styles.resultsInfo}>
        <Text variant="body" color="secondary">
          {totalCount > 0
            ? `${totalCount} tarif bulundu`
            : "Hiç tarif bulunamadı"}
        </Text>
      </View>
    </View>
  );

  const renderListFooter = () => {
    if (!isLoadingMore) return null;

    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color={colors.primary[500]} />
        <Text variant="body" color="secondary" style={styles.loadingText}>
          Daha fazla tarif yükleniyor...
        </Text>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons
        name="restaurant-outline"
        size={64}
        color={colors.neutral[300]}
      />
      <Text
        variant="h4"
        color="secondary"
        align="center"
        style={styles.emptyTitle}
      >
        {searchTerm ? "Aradığınız tarif bulunamadı" : "Henüz tarif eklenmemiş"}
      </Text>
      <Text
        variant="body"
        color="secondary"
        align="center"
        style={styles.emptySubtitle}
      >
        {searchTerm
          ? "Farklı anahtar kelimeler deneyin"
          : "Yakında lezzetli tarifler eklenecek"}
      </Text>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text variant="body" color="secondary" style={styles.loadingText}>
            Tarifler yükleniyor...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={recipes}
        renderItem={renderRecipeItem}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderListHeader}
        ListFooterComponent={renderListFooter}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[colors.primary[500]]}
            tintColor={colors.primary[500]}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.listContent,
          recipes.length === 0 && styles.listContentEmpty,
        ]}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  listContent: {
    padding: spacing[4],
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing[3],
  },
  loadingText: {
    marginLeft: spacing[2],
  },
  loadingFooter: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: spacing[4],
    gap: spacing[2],
  },

  // Header
  headerContainer: {
    marginBottom: spacing[4],
  },
  searchCard: {
    marginBottom: spacing[3],
  },
  filterCard: {
    marginBottom: spacing[3],
  },
  filterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing[2],
  },
  filterToggle: {
    padding: spacing[1],
  },
  filtersContainer: {
    gap: spacing[4],
  },
  filterGroup: {
    gap: spacing[2],
  },
  filterLabel: {
    marginBottom: spacing[1],
  },
  filterOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[2],
  },
  filterOption: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border.medium,
    backgroundColor: colors.background.primary,
  },
  filterOptionActive: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  filterActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing[3],
    marginTop: spacing[2],
  },
  resultsInfo: {
    alignItems: "center",
    paddingVertical: spacing[2],
  },

  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing[6],
    gap: spacing[4],
  },
  emptyTitle: {
    marginTop: spacing[4],
  },
  emptySubtitle: {
    maxWidth: 280,
  },
});

export default AllRecipesScreen;
