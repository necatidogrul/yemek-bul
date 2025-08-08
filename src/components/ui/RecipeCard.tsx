import React, { memo } from "react";
import { TouchableOpacity, View, StyleSheet, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Recipe } from "../../types/Recipe";
import Card from "./Card";
import Text from "./Text";
import { FavoriteButton } from "./FavoriteButton";
import { OptimizedImage } from "./OptimizedImage";
import { useTheme } from "../../contexts/ThemeContext";
import { spacing, borderRadius, shadows } from "../../contexts/ThemeContext";

const { width: screenWidth } = Dimensions.get("window");

interface RecipeCardProps {
  recipe: Recipe;
  variant?: "default" | "compact" | "featured" | "grid";
  onPress: () => void;
}

const RecipeCardComponent: React.FC<RecipeCardProps> = ({
  recipe,
  variant = "default",
  onPress,
}) => {
  const { colors, spacing, borderRadius, elevation } = useTheme();

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty?.toLowerCase()) {
      case "easy":
      case "kolay":
        return colors.semantic.success;
      case "medium":
      case "orta":
        return colors.semantic.warning;
      case "hard":
      case "zor":
        return colors.semantic.error;
      default:
        return colors.neutral[400];
    }
  };

  const getDifficultyIcon = (difficulty?: string) => {
    switch (difficulty?.toLowerCase()) {
      case "easy":
      case "kolay":
        return "checkmark-circle";
      case "medium":
      case "orta":
        return "pause-circle";
      case "hard":
      case "zor":
        return "alert-circle";
      default:
        return "help-circle";
    }
  };

  const getMatchPercentage = () => {
    if (!recipe.matchingIngredients || !recipe.totalIngredients) return 0;
    return Math.round(
      (recipe.matchingIngredients / recipe.totalIngredients) * 100
    );
  };

  const getMatchColor = (percentage: number) => {
    if (percentage >= 80) return colors.semantic.success;
    if (percentage >= 60) return colors.semantic.warning;
    return colors.semantic.error;
  };

  const isCompact = variant === "compact";
  const isFeatured = variant === "featured";
  const isGrid = variant === "grid";
  const matchPercentage = getMatchPercentage();

  if (isGrid) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        style={styles.gridContainer}
      >
        <Card variant="elevated" size="md" style={styles.gridCard}>
          {/* Image Placeholder with Gradient */}
          <View style={styles.gridImageContainer}>
            <LinearGradient
              colors={[colors.primary[400], colors.primary[600]]}
              style={styles.gridImageGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="restaurant" size={32} color="white" />
            </LinearGradient>

            {/* Match Badge */}
            <View
              style={[
                styles.gridMatchBadge,
                { backgroundColor: getMatchColor(matchPercentage) },
              ]}
            >
              <Text
                variant="labelSmall"
                weight="600"
                style={{ color: "white" }}
              >
                %{matchPercentage}
              </Text>
            </View>

            {/* Favorite Button */}
            <View style={styles.gridFavoriteButton}>
              <FavoriteButton recipe={recipe} size="small" />
            </View>
          </View>

          {/* Content */}
          <View style={styles.gridContent}>
            <Text
              variant="bodyLarge"
              weight="semibold"
              numberOfLines={2}
              style={styles.gridTitle}
            >
              {recipe.name}
            </Text>

            {/* Stats Row */}
            <View style={styles.gridStats}>
              <View style={styles.gridStatItem}>
                <Ionicons
                  name="time-outline"
                  size={14}
                  color={colors.neutral[500]}
                />
                <Text variant="caption" color="secondary">
                  {recipe.cookingTime || "30"}dk
                </Text>
              </View>

              <View style={styles.gridStatItem}>
                <Ionicons
                  name="people-outline"
                  size={14}
                  color={colors.neutral[500]}
                />
                <Text variant="caption" color="secondary">
                  {recipe.servings || "4"}
                </Text>
              </View>
            </View>

            {/* Difficulty Badge */}
            {recipe.difficulty && (
              <View
                style={[
                  styles.gridDifficultyBadge,
                  {
                    backgroundColor: `${getDifficultyColor(
                      recipe.difficulty
                    )}20`,
                  },
                ]}
              >
                <Ionicons
                  name={getDifficultyIcon(recipe.difficulty) as any}
                  size={12}
                  color={getDifficultyColor(recipe.difficulty)}
                />
                <Text
                  variant="caption"
                  weight="medium"
                  style={{ color: getDifficultyColor(recipe.difficulty) }}
                >
                  {recipe.difficulty}
                </Text>
              </View>
            )}
          </View>
        </Card>
      </TouchableOpacity>
    );
  }

  if (isFeatured) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        <Card variant="elevated" size="lg" style={styles.featuredCard}>
          {/* Hero Image with Gradient Overlay */}
          <View style={styles.featuredImageContainer}>
            <LinearGradient
              colors={[colors.primary[500], colors.primary[700]]}
              style={styles.featuredImageGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="restaurant" size={48} color="white" />
            </LinearGradient>

            {/* Featured Badge */}
            <View style={styles.featuredBadge}>
              <Ionicons name="star" size={16} color="white" />
              <Text variant="caption" weight="bold" style={{ color: "white" }}>
                Öne Çıkan
              </Text>
            </View>

            {/* Match Score */}
            <View
              style={[
                styles.featuredMatchScore,
                { backgroundColor: getMatchColor(matchPercentage) },
              ]}
            >
              <Text variant="h6" weight="bold" style={{ color: "white" }}>
                %{matchPercentage}
              </Text>
              <Text variant="caption" style={{ color: "white" }}>
                Eşleşme
              </Text>
            </View>
          </View>

          {/* Content */}
          <View style={styles.featuredContent}>
            <View style={styles.featuredHeader}>
              <View style={styles.featuredTitleContainer}>
                <Text variant="h4" weight="bold" numberOfLines={2}>
                  {recipe.name}
                </Text>

                {recipe.difficulty && (
                  <View
                    style={[
                      styles.featuredDifficultyBadge,
                      {
                        backgroundColor: `${getDifficultyColor(
                          recipe.difficulty
                        )}20`,
                      },
                    ]}
                  >
                    <Ionicons
                      name={getDifficultyIcon(recipe.difficulty) as any}
                      size={16}
                      color={getDifficultyColor(recipe.difficulty)}
                    />
                    <Text
                      variant="bodySmall"
                      weight="medium"
                      style={{ color: getDifficultyColor(recipe.difficulty) }}
                    >
                      {recipe.difficulty}
                    </Text>
                  </View>
                )}
              </View>

              <FavoriteButton recipe={recipe} size="large" />
            </View>

            {/* Enhanced Stats */}
            <View style={styles.featuredStatsContainer}>
              <View style={styles.featuredStatCard}>
                <View
                  style={[
                    styles.featuredStatIcon,
                    { backgroundColor: colors.primary[50] },
                  ]}
                >
                  <Ionicons name="time" size={18} color={colors.primary[500]} />
                </View>
                <Text variant="bodySmall" weight="semibold">
                  {recipe.cookingTime || "30"} dk
                </Text>
                <Text variant="caption" color="secondary">
                  Hazırlık
                </Text>
              </View>

              <View style={styles.featuredStatCard}>
                <View
                  style={[
                    styles.featuredStatIcon,
                    { backgroundColor: colors.semantic.success[50] },
                  ]}
                >
                  <Ionicons
                    name="people"
                    size={18}
                    color={colors.semantic.success[500]}
                  />
                </View>
                <Text variant="bodySmall" weight="semibold">
                  {recipe.servings || "4"} kişi
                </Text>
                <Text variant="caption" color="secondary">
                  Porsiyon
                </Text>
              </View>

              <View style={styles.featuredStatCard}>
                <View
                  style={[
                    styles.featuredStatIcon,
                    { backgroundColor: colors.semantic.warning[50] },
                  ]}
                >
                  <Ionicons name="list" size={18} color={colors.warning[500]} />
                </View>
                <Text variant="bodySmall" weight="semibold">
                  {recipe.ingredients?.length || 0}
                </Text>
                <Text variant="caption" color="secondary">
                  Malzeme
                </Text>
              </View>
            </View>

            {/* Action Button */}
            <TouchableOpacity
              style={[
                styles.featuredActionButton,
                { backgroundColor: colors.primary[500] },
              ]}
              onPress={onPress}
              activeOpacity={0.8}
            >
              <Text
                variant="bodyLarge"
                weight="semibold"
                style={{ color: "white" }}
              >
                Tarifi İncele
              </Text>
              <Ionicons name="arrow-forward" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </Card>
      </TouchableOpacity>
    );
  }

  // Default and Compact variants
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Card
        variant="elevated"
        size={isCompact ? "md" : "lg"}
        style={[styles.card, isCompact ? styles.compactCard : {}]}
      >
        {/* Modern Header */}
        <View style={styles.header}>
          <View style={styles.titleSection}>
            <Text
              variant={isCompact ? "h6" : "h5"}
              weight="semibold"
              numberOfLines={2}
              style={styles.title}
            >
              {recipe.name}
            </Text>

            {/* Match Score Pill */}
            <View
              style={[
                styles.matchPill,
                { backgroundColor: `${getMatchColor(matchPercentage)}20` },
              ]}
            >
              <View
                style={[
                  styles.matchDot,
                  { backgroundColor: getMatchColor(matchPercentage) },
                ]}
              />
              <Text
                variant="caption"
                weight="bold"
                style={{ color: getMatchColor(matchPercentage) }}
              >
                %{matchPercentage} eşleşme
              </Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            <FavoriteButton
              recipe={recipe}
              size={isCompact ? "small" : "medium"}
            />
          </View>
        </View>

        {/* Image Container */}
        <View
          style={[
            styles.imageContainer,
            isCompact && styles.compactImageContainer,
          ]}
        >
          <LinearGradient
            colors={[colors.neutral[100], colors.neutral[200]]}
            style={styles.imageGradient}
          >
            <Ionicons
              name="image-outline"
              size={isCompact ? 28 : 36}
              color={colors.neutral[400]}
            />
          </LinearGradient>

          {/* Difficulty Badge on Image */}
          {recipe.difficulty && (
            <View
              style={[
                styles.imageDifficultyBadge,
                { backgroundColor: getDifficultyColor(recipe.difficulty) },
              ]}
            >
              <Ionicons
                name={getDifficultyIcon(recipe.difficulty) as any}
                size={12}
                color="white"
              />
              <Text variant="caption" weight="bold" style={{ color: "white" }}>
                {recipe.difficulty}
              </Text>
            </View>
          )}
        </View>

        {/* Enhanced Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <View
              style={[
                styles.statIconContainer,
                { backgroundColor: colors.primary[50] },
              ]}
            >
              <Ionicons
                name="time-outline"
                size={16}
                color={colors.primary[500]}
              />
            </View>
            <View style={styles.statTextContainer}>
              <Text variant="bodySmall" weight="semibold">
                {recipe.cookingTime || "30"} dk
              </Text>
              <Text variant="caption" color="secondary">
                Süre
              </Text>
            </View>
          </View>

          <View style={styles.statBox}>
            <View
              style={[
                styles.statIconContainer,
                { backgroundColor: colors.success[50] },
              ]}
            >
              <Ionicons
                name="people-outline"
                size={16}
                color={colors.success[500]}
              />
            </View>
            <View style={styles.statTextContainer}>
              <Text variant="bodySmall" weight="semibold">
                {recipe.servings || "4"} kişi
              </Text>
              <Text variant="caption" color="secondary">
                Porsiyon
              </Text>
            </View>
          </View>

          <View style={styles.statBox}>
            <View
              style={[
                styles.statIconContainer,
                { backgroundColor: colors.warning[50] },
              ]}
            >
              <Ionicons
                name="restaurant-outline"
                size={16}
                color={colors.semantic.warning[500]}
              />
            </View>
            <View style={styles.statTextContainer}>
              <Text variant="bodySmall" weight="semibold">
                {recipe.ingredients?.length || 0}
              </Text>
              <Text variant="caption" color="secondary">
                Malzeme
              </Text>
            </View>
          </View>
        </View>

        {/* Missing Ingredients Alert */}
        {recipe.missingIngredients && recipe.missingIngredients.length > 0 && (
          <View
            style={[
              styles.missingAlert,
              {
                backgroundColor: colors.semantic.warning[50],
                borderColor: colors.semantic.warning[200],
              },
            ]}
          >
            <View style={styles.missingHeader}>
              <Ionicons
                name="alert-circle"
                size={16}
                color={colors.semantic.warning[500]}
              />
              <Text
                variant="bodySmall"
                weight="medium"
                style={{ color: colors.warning[700] }}
              >
                {recipe.missingIngredients.length} eksik malzeme
              </Text>
            </View>
            <Text variant="caption" color="secondary" numberOfLines={1}>
              {recipe.missingIngredients.slice(0, 2).join(", ")}
              {recipe.missingIngredients.length > 2 && "..."}
            </Text>
          </View>
        )}

        {/* Action Button */}
        <TouchableOpacity
          style={[
            styles.actionButton,
            { backgroundColor: colors.primary[500] },
          ]}
          onPress={onPress}
          activeOpacity={0.8}
        >
          <Text
            variant="bodySmall"
            weight="semibold"
            style={{ color: "white" }}
          >
            Tarifi Görüntüle
          </Text>
          <Ionicons name="arrow-forward" size={16} color="white" />
        </TouchableOpacity>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // Base Styles
  card: {
    marginBottom: 16,
  },
  compactCard: {
    marginBottom: 12,
  },

  // Header Styles
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  titleSection: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    marginBottom: 4,
  },
  headerActions: {
    alignItems: "center",
  },

  // Match Score Pill
  matchPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    gap: 4,
  },
  matchDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  // Image Styles
  imageContainer: {
    height: 140,
    borderRadius: 12,
    marginBottom: 16,
    position: "relative",
    overflow: "hidden",
  },
  compactImageContainer: {
    height: 100,
  },
  imageGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  imageDifficultyBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    gap: 4,
  },

  // Stats Styles
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  statBox: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 8,
  },
  statIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  statTextContainer: {
    flex: 1,
  },

  // Missing Ingredients
  missingAlert: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  missingHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.tiny,
  },

  // Action Button
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    borderRadius: borderRadius.large,
    gap: spacing.sm,
  },

  // Grid Variant Styles
  gridContainer: {
    width: (screenWidth - spacing.lg * 3) / 2,
  },
  gridCard: {
    height: 240,
  },
  gridImageContainer: {
    height: 120,
    borderRadius: borderRadius.large,
    marginBottom: spacing.md,
    position: "relative",
    overflow: "hidden",
  },
  gridImageGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  gridMatchBadge: {
    position: "absolute",
    top: spacing.sm,
    left: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.tiny,
    borderRadius: 9999,
  },
  gridFavoriteButton: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
  },
  gridContent: {
    flex: 1,
  },
  gridTitle: {
    marginBottom: spacing.sm,
    lineHeight: 20,
  },
  gridStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  gridStatItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.tiny,
  },
  gridDifficultyBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.tiny,
    borderRadius: 9999,
    gap: spacing.tiny,
  },

  // Featured Variant Styles
  featuredCard: {
    marginBottom: spacing.xxl,
    overflow: "hidden",
  },
  featuredImageContainer: {
    height: 180,
    position: "relative",
    overflow: "hidden",
  },
  featuredImageGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  featuredBadge: {
    position: "absolute",
    top: spacing.md,
    left: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 9999,
    gap: spacing.tiny,
  },
  featuredMatchScore: {
    position: "absolute",
    top: spacing.md,
    right: spacing.md,
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.large,
  },
  featuredContent: {
    padding: spacing.xl,
  },
  featuredHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.xl,
  },
  featuredTitleContainer: {
    flex: 1,
    marginRight: spacing.md,
  },
  featuredDifficultyBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 9999,
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  featuredStatsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xl,
  },
  featuredStatCard: {
    alignItems: "center",
    flex: 1,
  },
  featuredStatIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  featuredActionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.large,
    gap: spacing.sm,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
});

// Memoized export for performance
export const RecipeCard = memo(RecipeCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.recipe.id === nextProps.recipe.id &&
    prevProps.variant === nextProps.variant &&
    prevProps.recipe.matchingIngredients ===
      nextProps.recipe.matchingIngredients
  );
});
