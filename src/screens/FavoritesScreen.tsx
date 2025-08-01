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
import { Button, Card, Text, NoFavoritesEmpty, Loading } from "../components/ui";
import { RecipeCard } from "../components/ui/RecipeCard";
import { PullToRefresh } from "../components/ui/PullToRefresh";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
import { useOptimizedFlatList } from "../hooks/useOptimizedFlatList";
import { spacing, borderRadius, colors } from "../theme/design-tokens";
import { useThemedStyles } from "../hooks/useThemedStyles";
import PaywallModal from "../components/premium/PaywallModal";
import { usePremiumGuard } from "../hooks/usePremiumGuard";
import { usePremium } from "../contexts/PremiumContext";

type FavoritesScreenProps = {
  navigation: StackNavigationProp<FavoritesStackParamList, "FavoritesMain">;
};

const FavoritesScreen: React.FC<FavoritesScreenProps> = ({ navigation }) => {
  const [favorites, setFavorites] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Pull-to-refresh hook'unu kullan
  const pullToRefresh = usePullToRefresh({
    onRefresh: async () => {
      await loadFavorites();
    },
    enabled: true,
    hapticFeedback: true,
    refreshingText: 'Favoriler yenileniyor...',
    pullToRefreshText: 'Favorileri yenilemek için aşağı çekin',
    releaseToRefreshText: 'Favorileri yenilemek için bırakın',
  });

  // FlatList performance optimizasyonları
  const flatListOptimizations = useOptimizedFlatList<Recipe>({
    estimatedItemSize: 200, // Default RecipeCard yüksekliği
    enableGetItemLayout: false,
    keyExtractor: (item) => item.id,
    viewabilityConfig: {
      itemVisiblePercentThreshold: 50,
      minimumViewTime: 100,
    },
  });
  
  const { colors } = useThemedStyles();
  const { isPremium } = usePremium();
  const {
    showPaywall,
    currentFeature,
    paywallTitle,
    paywallDescription,
    checkPremiumFeature,
    hidePaywall,
  } = usePremiumGuard();

  useEffect(() => {
    checkAccessAndLoadFavorites();
  }, [isPremium]);
  
  const checkAccessAndLoadFavorites = async () => {
    if (!checkPremiumFeature('favorites')) {
      return; // Paywall will be shown automatically
    }
    loadFavorites();
  };

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

  const handleExploreRecipes = () => {
    // Navigate to all recipes screen  
    navigation.getParent()?.navigate('AllRecipesTab');
  };

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

  // Show loading state
  if (isLoading && favorites.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background.secondary }]}>
        <Loading size="large" text="Favoriler yükleniyor..." />
      </SafeAreaView>
    );
  }

  // Show empty state if no favorites
  if (!isLoading && favorites.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background.secondary }]}>
        <NoFavoritesEmpty onExplore={handleExploreRecipes} />
        
        {/* Premium Paywall Modal */}
        {currentFeature && (
          <PaywallModal
            visible={showPaywall}
            onClose={hidePaywall}
            feature={currentFeature}
            title={paywallTitle}
            description={paywallDescription}
          />
        )}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.secondary }]}>
      <FlatList
        data={favorites}
        renderItem={flatListOptimizations.createRenderItem(({ item }) => (
          <View style={styles.recipeCardContainer}>
            <RecipeCard recipe={item} onPress={() => handleRecipePress(item)} />
          </View>
        ))}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <PullToRefresh
            refreshing={pullToRefresh.isRefreshing || isLoading}
            onRefresh={pullToRefresh.handleRefresh}
            accessibilityLabel="Favoriler listesini yenilemek için aşağı çekin"
            title={pullToRefresh.refreshText}
          />
        }
        // Performance optimizations
        {...flatListOptimizations.optimizedProps}
      />
      
      {/* Premium Paywall Modal */}
      {currentFeature && (
        <PaywallModal
          visible={showPaywall}
          onClose={hidePaywall}
          feature={currentFeature}
          title={paywallTitle}
          description={paywallDescription}
        />
      )}
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
