import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

// UI Components
import Text from "./Text";
import {
  colors,
  spacing,
  borderRadius,
  shadows,
} from "../../theme/design-tokens";

interface SuggestionCardProps {
  ingredient: string;
  recipes: string[];
  priority: number;
  onPress?: () => void;
}

export const SuggestionCard: React.FC<SuggestionCardProps> = ({
  ingredient,
  recipes,
  priority,
  onPress,
}) => {
  const getIngredientIcon = (ingredient: string) => {
    const lowerIngredient = ingredient.toLowerCase();

    if (lowerIngredient.includes("domates")) return "nutrition-outline";
    if (lowerIngredient.includes("soğan")) return "leaf-outline";
    if (lowerIngredient.includes("biber")) return "flame-outline";
    if (lowerIngredient.includes("peynir")) return "cube-outline";
    if (lowerIngredient.includes("et") || lowerIngredient.includes("tavuk"))
      return "restaurant-outline";
    if (lowerIngredient.includes("yumurta")) return "ellipse-outline";
    if (lowerIngredient.includes("süt")) return "cafe-outline";
    if (lowerIngredient.includes("un") || lowerIngredient.includes("makarna"))
      return "layers-outline";

    return "add-circle-outline";
  };

  const getPriorityColors = (priority: number) => {
    if (priority >= 10)
      return {
        bg: colors.success[100],
        icon: colors.success[600],
        badge: colors.success[500],
        action: colors.success[50],
        actionBorder: colors.success[200],
        actionText: colors.success[700],
      };
    if (priority >= 5)
      return {
        bg: colors.warning[100],
        icon: colors.warning[600],
        badge: colors.warning[500],
        action: colors.warning[50],
        actionBorder: colors.warning[200],
        actionText: colors.warning[700],
      };
    return {
      bg: colors.primary[100],
      icon: colors.primary[600],
      badge: colors.primary[500],
      action: colors.primary[50],
      actionBorder: colors.primary[200],
      actionText: colors.primary[700],
    };
  };

  const priorityColors = getPriorityColors(priority);

  return (
    <Pressable onPress={onPress}>
      {({ pressed }) => (
        <View
          style={[
            styles.card,
            {
              opacity: pressed ? 0.8 : 1,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: priorityColors.bg },
              ]}
            >
              <Ionicons
                name={getIngredientIcon(ingredient) as any}
                size={24}
                color={priorityColors.icon}
              />
            </View>

            <View style={styles.headerContent}>
              <View style={styles.titleRow}>
                <Text
                  variant="body"
                  weight="bold"
                  color="primary"
                  style={styles.ingredientTitle}
                >
                  {ingredient}
                </Text>
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: priorityColors.badge },
                  ]}
                >
                  <Text
                    variant="caption"
                    weight="semibold"
                    style={{ color: colors.neutral[0] }}
                  >
                    +{recipes.length}
                  </Text>
                </View>
              </View>

              <Text variant="caption" color="muted">
                {recipes.length} yeni tarif
              </Text>
            </View>
          </View>

          {/* Açıklama */}
          <View style={styles.description}>
            <Text variant="caption" color="secondary" align="center">
              Bu malzemeyi alarak{" "}
              <Text variant="caption" weight="bold" color="primary">
                {recipes.length}
              </Text>{" "}
              yeni tarif yapabilirsiniz
            </Text>
          </View>

          {/* Tarif Örnekleri */}
          <View style={styles.recipesSection}>
            <Text
              variant="caption"
              weight="semibold"
              color="muted"
              style={styles.recipesTitle}
            >
              YAPABİLECEĞİNİZ YEMEKLER
            </Text>

            <View style={styles.recipesList}>
              {recipes.slice(0, 3).map((recipe, index) => (
                <View key={index} style={styles.recipeItem}>
                  <Ionicons
                    name="checkmark-circle"
                    size={12}
                    color={colors.success[500]}
                  />
                  <Text
                    variant="caption"
                    color="secondary"
                    numberOfLines={1}
                    style={styles.recipeText}
                  >
                    {recipe}
                  </Text>
                </View>
              ))}

              {recipes.length > 3 && (
                <View style={styles.recipeItem}>
                  <Ionicons
                    name="ellipsis-horizontal"
                    size={12}
                    color={colors.neutral[400]}
                  />
                  <Text variant="caption" color="muted" style={styles.moreText}>
                    +{recipes.length - 3} tane daha...
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Action Button */}
          <View
            style={[
              styles.actionButton,
              {
                backgroundColor: priorityColors.action,
                borderColor: priorityColors.actionBorder,
              },
            ]}
          >
            <Ionicons
              name="bag-add-outline"
              size={16}
              color={priorityColors.icon}
            />
            <Text
              variant="bodySmall"
              weight="semibold"
              style={{ color: priorityColors.actionText }}
            >
              Alışveriş Listesine Ekle
            </Text>
          </View>
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface.primary,
    borderRadius: borderRadius.xl,
    width: 280,
    marginRight: spacing[3],
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border.light,
    ...shadows.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing[3],
    gap: spacing[3],
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  headerContent: {
    flex: 1,
    gap: spacing[1],
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ingredientTitle: {
    flex: 1,
  },
  badge: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
  },
  description: {
    backgroundColor: colors.background.secondary,
    padding: spacing[3],
    borderRadius: borderRadius.lg,
    marginBottom: spacing[3],
  },
  recipesSection: {
    marginBottom: spacing[3],
    gap: spacing[2],
  },
  recipesTitle: {
    textTransform: "uppercase",
  },
  recipesList: {
    gap: spacing[1],
  },
  recipeItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  recipeText: {
    flex: 1,
  },
  moreText: {
    fontStyle: "italic",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing[2],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing[2],
  },
});
