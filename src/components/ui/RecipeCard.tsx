import React, { memo } from "react";
import { TouchableOpacity, View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Recipe } from "../../types/Recipe";
import { Card, Text, FavoriteButton } from "./index";
import { OptimizedImage } from "./OptimizedImage";
import { colors, spacing, borderRadius } from "../../theme/design-tokens";
import { useThemedStyles } from "../../hooks/useThemedStyles";

interface RecipeCardProps {
  recipe: Recipe;
  variant?: "default" | "compact";
  onPress: () => void;
}

const RecipeCardComponent: React.FC<RecipeCardProps> = ({
  recipe,
  variant = "default",
  onPress,
}) => {
  const { colors } = useThemedStyles();
  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty?.toLowerCase()) {
      case "easy":
      case "kolay":
        return colors.success[500];
      case "medium":
      case "orta":
        return colors.warning[500];
      case "hard":
      case "zor":
        return colors.error[500];
      default:
        return colors.neutral[400];
    }
  };

  const getMatchPercentage = () => {
    if (!recipe.matchingIngredients || !recipe.totalIngredients) return 0;
    return Math.round(
      (recipe.matchingIngredients / recipe.totalIngredients) * 100
    );
  };

  const isCompact = variant === "compact";

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card
        variant="default"
        size={isCompact ? "md" : "lg"}
        style={
          isCompact ? { ...styles.card, ...styles.compactCard } : styles.card
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text
              variant={isCompact ? "bodyLarge" : "h4"}
              weight="semibold"
              numberOfLines={2}
            >
              {recipe.name}
            </Text>

            {recipe.difficulty && (
              <View
                style={[
                  styles.difficultyBadge,
                  {
                    backgroundColor:
                      getDifficultyColor(recipe.difficulty) + "20",
                  },
                ]}
              >
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

          <View style={styles.headerActions}>
            <FavoriteButton
              recipe={recipe}
              size={isCompact ? "small" : "medium"}
            />
            <View style={styles.matchContainer}>
              <Text variant="caption" color="muted">
                Eşleşme
              </Text>
              <Text variant="bodySmall" weight="bold" color="accent">
                %{getMatchPercentage()}
              </Text>
            </View>
          </View>
        </View>

        {/* Image Placeholder */}
        <View
          style={[styles.imagePlaceholder, isCompact && styles.compactImage]}
        >
          <Ionicons
            name="image-outline"
            size={isCompact ? 24 : 32}
            color={colors.neutral[400]}
          />
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Ionicons
              name="time-outline"
              size={16}
              color={colors.primary[500]}
            />
            <Text variant="caption" color="secondary">
              {recipe.cookingTime || "30"} dk
            </Text>
          </View>

          <View style={styles.statItem}>
            <Ionicons
              name="people-outline"
              size={16}
              color={colors.primary[500]}
            />
            <Text variant="caption" color="secondary">
              {recipe.servings || "4"} kişi
            </Text>
          </View>

          <View style={styles.statItem}>
            <Ionicons
              name="list-outline"
              size={16}
              color={colors.primary[500]}
            />
            <Text variant="caption" color="secondary">
              {recipe.ingredients?.length || 0} malzeme
            </Text>
          </View>
        </View>

        {/* Ingredients Preview */}
        {!isCompact && recipe.ingredients && (
          <View style={styles.ingredientsPreview}>
            <Text
              variant="caption"
              color="muted"
              style={styles.ingredientsLabel}
            >
              Ana Malzemeler:
            </Text>
            <Text variant="bodySmall" color="secondary" numberOfLines={2}>
              {recipe.ingredients.slice(0, 3).join(", ")}
              {recipe.ingredients.length > 3 && "..."}
            </Text>
          </View>
        )}

        {/* Missing Ingredients */}
        {recipe.missingIngredients && recipe.missingIngredients.length > 0 && (
          <View style={styles.missingContainer}>
            <View style={styles.missingHeader}>
              <Ionicons
                name="add-circle-outline"
                size={14}
                color={colors.warning[500]}
              />
              <Text variant="caption" color="warning" weight="medium">
                Eksik Malzemeler ({recipe.missingIngredients.length})
              </Text>
            </View>
            <Text variant="caption" color="secondary" numberOfLines={1}>
              {recipe.missingIngredients.slice(0, 2).join(", ")}
              {recipe.missingIngredients.length > 2 && "..."}
            </Text>
          </View>
        )}

        {/* Action Button */}
        <TouchableOpacity style={styles.actionButton} onPress={onPress}>
          <Text variant="bodySmall" color="accent" weight="semibold">
            Tarifi Görüntüle
          </Text>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={colors.primary[500]}
          />
        </TouchableOpacity>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing[4],
  },
  compactCard: {
    marginBottom: spacing[3],
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing[3],
  },

  titleContainer: {
    flex: 1,
    marginRight: spacing[3],
  },

  difficultyBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
    marginTop: spacing[1],
  },

  headerActions: {
    alignItems: "center",
    gap: spacing[2],
  },

  matchContainer: {
    alignItems: "center",
    backgroundColor: colors.primary[50],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.md,
  },

  imagePlaceholder: {
    height: 120,
    backgroundColor: colors.neutral[100],
    borderRadius: borderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[3],
  },
  compactImage: {
    height: 80,
  },

  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: spacing[3],
    paddingVertical: spacing[2],
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
  },

  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
  },

  ingredientsPreview: {
    marginBottom: spacing[3],
  },

  ingredientsLabel: {
    marginBottom: spacing[1],
  },

  missingContainer: {
    backgroundColor: colors.warning[50],
    padding: spacing[3],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.warning[200],
    marginBottom: spacing[3],
  },

  missingHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
    marginBottom: spacing[1],
  },

  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing[3],
    backgroundColor: colors.primary[50],
    borderRadius: borderRadius.md,
    gap: spacing[1],
  },
});

// Memoized export for performance
export const RecipeCard = memo(RecipeCardComponent, (prevProps, nextProps) => {
  // Custom comparison function for better performance
  return (
    prevProps.recipe.id === nextProps.recipe.id &&
    prevProps.variant === nextProps.variant &&
    prevProps.recipe.matchingIngredients === nextProps.recipe.matchingIngredients
  );
});
