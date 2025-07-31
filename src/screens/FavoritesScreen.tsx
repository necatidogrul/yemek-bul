import React, { useState, useEffect } from "react";
import {
  View,
  FlatList,
  SafeAreaView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import { FavoritesStackParamList } from "../../App";
import { Recipe } from "../types/Recipe";
import { FavoritesService } from "../services/FavoritesService";

// UI Components
import { Button, Card, Text } from "../components/ui";
import { RecipeCard } from "../components/ui/RecipeCard";
import { colors, spacing, borderRadius } from "../theme/design-tokens";

type FavoritesScreenProps = {
  navigation: StackNavigationProp<FavoritesStackParamList, "FavoritesMain">;
};

const FavoritesScreen: React.FC<FavoritesScreenProps> = ({ navigation }) => {
  const [favorites, setFavorites] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      setIsLoading(true);
      const favoriteRecipes = await FavoritesService.getFavoriteRecipes();
      setFavorites(favoriteRecipes);
    } catch (error) {
      console.error("Error loading favorites:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecipePress = (recipe: Recipe) => {
    navigation.navigate("RecipeDetail", {
      recipeId: recipe.id,
      recipeName: recipe.name,
    });
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="heart-outline" size={64} color={colors.neutral[400]} />
      </View>
      <View style={styles.emptyContent}>
        <Text variant="h3" weight="bold" color="primary" align="center">
          Henüz Favori Tarifiniz Yok
        </Text>
        <Text
          variant="body"
          color="secondary"
          align="center"
          style={styles.emptyDescription}
        >
          Beğendiğiniz tarifleri favorilerinize ekleyerek buradan kolayca
          ulaşabilirsiniz. Kalp simgesine tıklayarak tarif ekleyebilirsiniz.
        </Text>
      </View>
      <Button
        variant="primary"
        size="lg"
        onPress={() =>
          navigation.navigate("RecipeDetail", {
            recipeId: "sample",
            recipeName: "Örnek Tarif",
          })
        }
        leftIcon={
          <Ionicons name="search" size={20} color={colors.neutral[0]} />
        }
        style={styles.exploreButton}
      >
        🍽️ Tarifleri Keşfet
      </Button>
    </View>
  );

  const renderHeader = () => (
    <Card variant="filled" size="lg" style={styles.headerCard}>
      <View style={styles.headerContent}>
        <View style={styles.headerIcon}>
          <Ionicons name="heart" size={28} color={colors.error[500]} />
        </View>
        <View style={styles.headerText}>
          <Text variant="h4" weight="bold" color="primary">
            Favori Tariflerim
          </Text>
          <Text variant="bodySmall" color="secondary">
            {favorites.length} adet favori tarifiniz var
          </Text>
        </View>
        {favorites.length > 0 && (
          <View style={styles.headerBadge}>
            <Text variant="caption" weight="bold" style={styles.badgeText}>
              {favorites.length}
            </Text>
          </View>
        )}
      </View>
    </Card>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <View style={styles.loadingContent}>
            <Text variant="h4" weight="semibold" color="primary" align="center">
              Favoriler Yükleniyor...
            </Text>
            <Text
              variant="body"
              color="secondary"
              align="center"
              style={{ marginTop: spacing[2] }}
            >
              Favori tarifleriniz getiriliyor
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (favorites.length === 0) {
    return (
      <SafeAreaView style={styles.container}>{renderEmptyState()}</SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={favorites}
        renderItem={({ item }) => (
          <View style={styles.recipeCardContainer}>
            <RecipeCard recipe={item} onPress={() => handleRecipePress(item)} />
          </View>
        )}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        refreshing={isLoading}
        onRefresh={loadFavorites}
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
    width: 120,
    height: 120,
    borderRadius: borderRadius.full,
    backgroundColor: colors.neutral[100],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[6],
  },
  emptyContent: {
    alignItems: "center",
    marginBottom: spacing[6],
    maxWidth: 300,
  },
  emptyDescription: {
    marginTop: spacing[3],
    lineHeight: 24,
  },
  exploreButton: {
    minWidth: 200,
  },
  listContent: {
    padding: spacing[4],
    paddingBottom: spacing[8],
  },
  headerCard: {
    marginBottom: spacing[6],
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: colors.error[50],
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
  },
  headerBadge: {
    backgroundColor: colors.error[500],
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: colors.neutral[0],
  },
  recipeCardContainer: {
    marginBottom: spacing[3],
  },
});

export default FavoritesScreen;
