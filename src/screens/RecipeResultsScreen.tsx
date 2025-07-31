import React, { useEffect, useState } from "react";
import {
  View,
  FlatList,
  Alert,
  SafeAreaView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { HomeStackParamList } from "../../App";
import { Recipe, RecipeSearchResult } from "../types/Recipe";
import { RecipeService } from "../services/recipeService";
import { Ionicons } from "@expo/vector-icons";
import { RecipeCard } from "../components/ui/RecipeCard";
import { SuggestionCard } from "../components/ui/SuggestionCard";

// UI Components
import { Button, Card, Text } from "../components/ui";
import { colors, spacing, borderRadius, shadows } from "../theme/design-tokens";

type RecipeResultsScreenProps = {
  navigation: StackNavigationProp<HomeStackParamList, "RecipeResults">;
  route: RouteProp<HomeStackParamList, "RecipeResults">;
};

const RecipeResultsScreen: React.FC<RecipeResultsScreenProps> = ({
  navigation,
  route,
}) => {
  const { ingredients } = route.params;
  const [searchResults, setSearchResults] = useState<RecipeSearchResult | null>(
    null
  );
  const [suggestions, setSuggestions] = useState<
    {
      ingredient: string;
      recipes: string[];
      priority: number;
    }[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [randomRecipe, setRandomRecipe] = useState<Recipe | null>(null);
  const [showRandomSuggestion, setShowRandomSuggestion] = useState(false);

  useEffect(() => {
    searchRecipes();
  }, []);

  const searchRecipes = async () => {
    try {
      setIsLoading(true);

      // Tarifleri ara
      const results = await RecipeService.searchRecipesByIngredients({
        ingredients,
        maxMissingIngredients: 8,
      });
      setSearchResults(results);

      // Önerileri al
      const ingredientSuggestions = await RecipeService.getSuggestedIngredients(
        ingredients
      );
      setSuggestions(ingredientSuggestions);
    } catch (error) {
      Alert.alert("Hata", "Tarifler aranırken bir hata oluştu.");
      console.error("Search error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const suggestRandomRecipe = () => {
    if (!searchResults) return;

    const { exactMatches, nearMatches } = searchResults;

    if (exactMatches.length === 0 && nearMatches.length === 0) return;

    let selectedRecipe: Recipe;

    // Ağırlıklı rastgele seçim: Tam eşleşenlere %70 şans, yakın eşleşenlere %30 şans
    if (exactMatches.length > 0 && nearMatches.length > 0) {
      const shouldPickExactMatch = Math.random() < 0.7;

      if (shouldPickExactMatch) {
        const randomIndex = Math.floor(Math.random() * exactMatches.length);
        selectedRecipe = exactMatches[randomIndex];
      } else {
        const randomIndex = Math.floor(Math.random() * nearMatches.length);
        selectedRecipe = nearMatches[randomIndex];
      }
    } else if (exactMatches.length > 0) {
      // Sadece tam eşleşenler varsa
      const randomIndex = Math.floor(Math.random() * exactMatches.length);
      selectedRecipe = exactMatches[randomIndex];
    } else {
      // Sadece yakın eşleşenler varsa
      const randomIndex = Math.floor(Math.random() * nearMatches.length);
      selectedRecipe = nearMatches[randomIndex];
    }

    setRandomRecipe(selectedRecipe);
    setShowRandomSuggestion(true);

    // Biraz animasyon etkisi için kısa gecikme
    setTimeout(() => {
      navigation.navigate("RecipeDetail", {
        recipeId: selectedRecipe.id,
        recipeName: selectedRecipe.name,
      });
      // State'i temizle
      setShowRandomSuggestion(false);
      setRandomRecipe(null);
    }, 1500);
  };

  const getSectionColors = (colorScheme: string) => {
    switch (colorScheme) {
      case "success":
        return {
          bg: colors.success[100],
          icon: colors.success[600],
          badge: colors.success[500],
        };
      case "warning":
        return {
          bg: colors.warning[100],
          icon: colors.warning[600],
          badge: colors.warning[500],
        };
      default:
        return {
          bg: colors.primary[100],
          icon: colors.primary[600],
          badge: colors.primary[500],
        };
    }
  };

  const renderSectionHeader = (
    title: string,
    count: number,
    icon: string,
    colorScheme: string = "primary"
  ) => {
    const sectionColors = getSectionColors(colorScheme);

    return (
      <Card variant="default" size="md" style={styles.sectionHeader}>
        <View style={styles.sectionHeaderContent}>
          <View
            style={[styles.sectionIcon, { backgroundColor: sectionColors.bg }]}
          >
            <Ionicons name={icon as any} size={24} color={sectionColors.icon} />
          </View>
          <View style={styles.sectionInfo}>
            <Text variant="h4" weight="bold" color="primary">
              {title}
            </Text>
            <Text variant="bodySmall" color="muted">
              {count} sonuç bulundu
            </Text>
          </View>
          <View
            style={[
              styles.sectionBadge,
              { backgroundColor: sectionColors.badge },
            ]}
          >
            <Text
              variant="bodySmall"
              weight="semibold"
              style={{ color: colors.neutral[0] }}
            >
              {count}
            </Text>
          </View>
        </View>
      </Card>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons
          name="restaurant-outline"
          size={48}
          color={colors.neutral[400]}
        />
      </View>
      <View style={styles.emptyContent}>
        <Text variant="h3" weight="bold" color="primary" align="center">
          Tarif Bulunamadı
        </Text>
        <Text
          variant="body"
          color="secondary"
          align="center"
          style={styles.emptyDescription}
        >
          Bu malzemelerle yapılabilecek tarif bulunamadı. Farklı malzemeler
          deneyebilirsiniz.
        </Text>
      </View>
      <Button
        variant="outline"
        size="md"
        onPress={() => navigation.goBack()}
        leftIcon={
          <Ionicons name="arrow-back" size={18} color={colors.primary[500]} />
        }
      >
        Geri Dön
      </Button>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <View style={styles.loadingContent}>
            <Text variant="h4" weight="semibold" color="primary" align="center">
              Tarifler Aranıyor...
            </Text>
            <Text
              variant="body"
              color="secondary"
              align="center"
              style={{ marginTop: spacing[2] }}
            >
              Malzemelerinize uygun en iyi tarifleri buluyoruz
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const allRecipes = searchResults
    ? [...searchResults.exactMatches, ...searchResults.nearMatches]
    : [];

  if (
    !searchResults ||
    (searchResults.exactMatches.length === 0 &&
      searchResults.nearMatches.length === 0)
  ) {
    return (
      <SafeAreaView style={styles.container}>{renderEmptyState()}</SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with ingredients */}
      <Card variant="default" size="md" style={styles.ingredientsHeader}>
        <View style={styles.ingredientsContent}>
          <View style={styles.ingredientsTitle}>
            <Ionicons name="search" size={16} color={colors.primary[500]} />
            <Text
              variant="caption"
              weight="semibold"
              color="muted"
              style={styles.ingredientsLabel}
            >
              ARAMA YAPILAN MALZEMELER
            </Text>
          </View>
          <Text variant="body" color="primary" style={styles.ingredientsText}>
            {ingredients.map((ingredient, index) => (
              <React.Fragment key={index}>
                <Text variant="body" weight="semibold" color="accent">
                  {ingredient}
                </Text>
                {index < ingredients.length - 1 && (
                  <Text variant="body" color="muted">
                    {" • "}
                  </Text>
                )}
              </React.Fragment>
            ))}
          </Text>
        </View>
      </Card>

      {/* Random Recipe Suggestion */}
      {allRecipes.length > 0 && (
        <Card variant="filled" size="md" style={styles.randomSuggestionCard}>
          <View style={styles.randomSuggestionContent}>
            <View style={styles.randomSuggestionHeader}>
              <Ionicons name="sparkles" size={20} color={colors.warning[600]} />
              <Text variant="bodyLarge" weight="semibold" color="primary">
                Karar Veremiyor musunuz?
              </Text>
            </View>
            <Text
              variant="body"
              color="secondary"
              style={styles.randomSuggestionDesc}
            >
              Size rastgele bir tarif önerelim! Bazen şans da güzel sonuçlar
              verir.
            </Text>

            {showRandomSuggestion && randomRecipe ? (
              <View style={styles.randomRecipePreview}>
                <View style={styles.randomRecipeInfo}>
                  <Ionicons
                    name="restaurant"
                    size={16}
                    color={colors.success[600]}
                  />
                  <Text variant="body" weight="semibold" color="success">
                    {randomRecipe.name} öneriliyor...
                  </Text>
                </View>
                <ActivityIndicator size="small" color={colors.success[500]} />
              </View>
            ) : (
              <Button
                variant="primary"
                size="md"
                onPress={suggestRandomRecipe}
                leftIcon={<Ionicons name="dice" size={18} />}
                style={styles.randomSuggestionButton}
              >
                🎲 Bana Bir Yemek Öner
              </Button>
            )}
          </View>
        </Card>
      )}

      <FlatList
        data={allRecipes}
        renderItem={({ item, index }) => (
          <View style={styles.recipeCardContainer}>
            <RecipeCard
              recipe={item}
              variant={
                searchResults.exactMatches.includes(item)
                  ? "default"
                  : "compact"
              }
              onPress={() =>
                navigation.navigate("RecipeDetail", {
                  recipeId: item.id,
                  recipeName: item.name,
                })
              }
            />
          </View>
        )}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={() => (
          <View style={styles.sectionsContainer}>
            {/* Exact Matches Section */}
            {searchResults.exactMatches.length > 0 && (
              <>
                {renderSectionHeader(
                  "Hemen Yapabilirsiniz",
                  searchResults.exactMatches.length,
                  "checkmark-circle",
                  "success"
                )}
                {searchResults.nearMatches.length > 0 && (
                  <View style={{ height: spacing[2] }} />
                )}
              </>
            )}

            {/* Near Matches Section */}
            {searchResults.nearMatches.length > 0 &&
              renderSectionHeader(
                searchResults.exactMatches.length > 0
                  ? "Şunu Alırsan Bunları da Yapabilirsin"
                  : "Önerilen Tarifler",
                searchResults.nearMatches.length,
                "add-circle",
                "warning"
              )}
          </View>
        )}
        ListFooterComponent={() => (
          <View style={styles.footerContainer}>
            {/* Suggestions Section */}
            {suggestions.length > 0 && (
              <>
                <View style={styles.divider} />
                <Card
                  variant="default"
                  size="md"
                  style={styles.suggestionsHeader}
                >
                  <View style={styles.suggestionsHeaderContent}>
                    <View
                      style={[
                        styles.sectionIcon,
                        { backgroundColor: colors.primary[100] },
                      ]}
                    >
                      <Ionicons
                        name="bulb"
                        size={20}
                        color={colors.primary[600]}
                      />
                    </View>
                    <View style={styles.sectionInfo}>
                      <Text variant="h4" weight="bold" color="primary">
                        Önerilen Malzemeler
                      </Text>
                      <Text variant="bodySmall" color="secondary">
                        Bu malzemeleri alarak daha fazla tarif yapabilirsiniz
                      </Text>
                    </View>
                  </View>
                </Card>

                <FlatList
                  data={suggestions}
                  renderItem={({ item }) => (
                    <SuggestionCard
                      ingredient={item.ingredient}
                      recipes={item.recipes}
                      priority={item.priority}
                      onPress={() => {
                        // TODO: Alışveriş listesine ekleme fonksiyonu
                        Alert.alert(
                          "Özellik Geliştiriliyor",
                          `${item.ingredient} alışveriş listesine ekleme özelliği yakında!`
                        );
                      }}
                    />
                  )}
                  keyExtractor={(item) => item.ingredient}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{
                    paddingHorizontal: spacing[4],
                  }}
                />
              </>
            )}

            {/* Footer Info */}
            <View style={styles.infoContainer}>
              <View style={styles.infoHeader}>
                <Ionicons
                  name="information-circle"
                  size={16}
                  color={colors.primary[600]}
                />
                <Text variant="bodySmall" weight="semibold" color="accent">
                  Bilgi
                </Text>
              </View>
              <Text
                variant="caption"
                style={{
                  color: colors.primary[700],
                  marginTop: spacing[1],
                }}
              >
                Tarifler malzeme eşleşme oranına göre sıralanmıştır. En çok
                eşleşen tarifler üstte görünür.
              </Text>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing[6],
  },
  loadingContent: {
    marginTop: spacing[4],
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing[8],
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: borderRadius.full,
    backgroundColor: colors.neutral[100],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[4],
  },
  emptyContent: {
    alignItems: "center",
    marginBottom: spacing[4],
  },
  emptyDescription: {
    marginTop: spacing[2],
    maxWidth: 280,
  },
  ingredientsHeader: {
    margin: spacing[4],
    marginBottom: 0,
  },
  ingredientsContent: {
    gap: spacing[2],
  },
  ingredientsTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  ingredientsLabel: {
    textTransform: "uppercase",
  },
  ingredientsText: {
    flexWrap: "wrap",
  },
  sectionsContainer: {
    padding: spacing[4],
    paddingBottom: spacing[2],
    gap: spacing[3],
  },
  sectionHeader: {
    marginBottom: spacing[2],
  },
  sectionHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
  },
  sectionIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionInfo: {
    flex: 1,
  },
  sectionBadge: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
  },
  recipeCardContainer: {
    paddingHorizontal: spacing[4],
  },
  footerContainer: {
    gap: spacing[4],
    padding: spacing[4],
    paddingBottom: spacing[8],
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.medium,
    marginVertical: spacing[2],
  },
  suggestionsHeader: {
    marginBottom: spacing[3],
  },
  suggestionsHeaderContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
  },
  infoContainer: {
    backgroundColor: colors.primary[50],
    padding: spacing[4],
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.primary[200],
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },

  // Random Suggestion Styles
  randomSuggestionCard: {
    margin: spacing[4],
    marginTop: spacing[3],
    marginBottom: spacing[2],
  },
  randomSuggestionContent: {
    gap: spacing[3],
  },
  randomSuggestionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  randomSuggestionDesc: {
    lineHeight: 20,
  },
  randomSuggestionButton: {
    alignSelf: "flex-start",
  },
  randomRecipePreview: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.success[50],
    padding: spacing[3],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.success[200],
  },
  randomRecipeInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
});

export default RecipeResultsScreen;
