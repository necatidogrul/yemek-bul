import React, { useEffect, useState } from "react";
import {
  View,
  ScrollView,
  Alert,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { HomeStackParamList, FavoritesStackParamList } from "../../App";
import { Recipe } from "../types/Recipe";
import { RecipeService } from "../services/recipeService";
import { SpeechService } from "../services/speechService";
import { Ionicons } from "@expo/vector-icons";

// UI Components
import { Button, Card, Text } from "../components/ui";
import {
  colors,
  spacing,
  borderRadius,
  shadows,
  typography,
} from "../theme/design-tokens";
import { FavoriteButton } from "../components/ui/FavoriteButton";
import PaywallModal from "../components/premium/PaywallModal";
import { usePremiumGuard } from "../hooks/usePremiumGuard";
import { usePremium } from "../contexts/PremiumContext";

type RecipeDetailScreenProps = {
  navigation:
    | StackNavigationProp<HomeStackParamList, "RecipeDetail">
    | StackNavigationProp<FavoritesStackParamList, "RecipeDetail">;
  route:
    | RouteProp<HomeStackParamList, "RecipeDetail">
    | RouteProp<FavoritesStackParamList, "RecipeDetail">;
};

const RecipeDetailScreen: React.FC<RecipeDetailScreenProps> = ({
  navigation,
  route,
}) => {
  const { recipeId, recipeName } = route.params;
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [shoppingList, setShoppingList] = useState<string[]>([]);
  
  const { isPremium } = usePremium();
  const {
    showPaywall,
    currentFeature,
    paywallTitle,
    paywallDescription,
    checkRecipeViewLimit,
    hidePaywall,
    incrementRecipeView,
  } = usePremiumGuard();

  useEffect(() => {
    navigation.setOptions({ title: recipeName });
    checkAndLoadRecipe();
  }, []);
  
  const checkAndLoadRecipe = async () => {
    // Check if user can view this recipe (for free users)
    const canView = await checkRecipeViewLimit();
    if (canView) {
      await incrementRecipeView();
      loadRecipe();
    } else {
      // Paywall will be shown automatically
      // Navigate back after a short delay if user doesn't upgrade
      setTimeout(() => {
        if (!isPremium) {
          navigation.goBack();
        }
      }, 100);
    }
  };

  const loadRecipe = async () => {
    try {
      setIsLoading(true);
      const recipeData = await RecipeService.getRecipeById(recipeId);
      setRecipe(recipeData);
      if (recipeData?.missingIngredients) {
        setShoppingList(recipeData.missingIngredients);
      }
    } catch (error) {
      Alert.alert("Hata", "Tarif yüklenirken bir hata oluştu.");
      console.error("Load recipe error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const speakInstructions = () => {
    if (!recipe) return;

    setIsSpeaking(true);
    const instructionsText = recipe.instructions.join(". ");
    SpeechService.speak(
      `${recipe.name} tarifi. Malzemeler: ${recipe.ingredients.join(
        ", "
      )}. Yapılış: ${instructionsText}`
    );

    setTimeout(() => {
      setIsSpeaking(false);
    }, instructionsText.length * 100);
  };

  const addToShoppingList = (ingredient: string) => {
    if (!shoppingList.includes(ingredient)) {
      setShoppingList([...shoppingList, ingredient]);
      Alert.alert("Eklendi", `${ingredient} alışveriş listesine eklendi.`);
    }
  };

  const removeFromShoppingList = (ingredient: string) => {
    setShoppingList(shoppingList.filter((item) => item !== ingredient));
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case "kolay":
        return colors.success[500];
      case "orta":
        return colors.warning[500];
      case "zor":
        return colors.error[500];
      default:
        return colors.neutral[400];
    }
  };

  const getCategoryIcon = (category?: string) => {
    switch (category) {
      case "çorba":
        return "cafe-outline";
      case "ana_yemek":
        return "restaurant-outline";
      case "salata":
        return "leaf-outline";
      case "tatlı":
        return "ice-cream-outline";
      case "aperatif":
        return "wine-outline";
      default:
        return "restaurant-outline";
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <View style={styles.loadingTextContainer}>
            <Text variant="h4" weight="semibold" color="primary" align="center">
              Tarif Yükleniyor...
            </Text>
            <Text
              variant="body"
              color="secondary"
              align="center"
              style={{ marginTop: spacing[2] }}
            >
              {recipeName} tarifi hazırlanıyor
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!recipe) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <View style={styles.errorIconContainer}>
            <Ionicons
              name="alert-circle-outline"
              size={48}
              color={colors.neutral[400]}
            />
          </View>
          <View style={styles.loadingTextContainer}>
            <Text variant="h3" weight="bold" color="primary" align="center">
              Tarif Bulunamadı
            </Text>
            <Text
              variant="body"
              color="secondary"
              align="center"
              style={{ marginTop: spacing[2] }}
            >
              Bu tarif yüklenemedi. Lütfen tekrar deneyin.
            </Text>
          </View>
          <Button
            variant="outline"
            size="md"
            onPress={() => navigation.goBack()}
            leftIcon={
              <Ionicons
                name="arrow-back"
                size={18}
                color={colors.primary[500]}
              />
            }
            style={{ marginTop: spacing[6] }}
          >
            Geri Dön
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Hero Card */}
          <Card variant="elevated" size="lg" style={styles.heroCard}>
            {/* Image Placeholder */}
            <View style={styles.imageContainer}>
              <Ionicons
                name="image-outline"
                size={64}
                color={colors.primary[300]}
              />
              <View style={styles.difficultyBadge}>
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: getDifficultyColor(recipe.difficulty) },
                  ]}
                >
                  <Text
                    variant="caption"
                    color="primary"
                    weight="semibold"
                    style={{ color: colors.neutral[0] }}
                  >
                    {recipe.difficulty || "N/A"}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.heroContent}>
              {/* Title & Info */}
              <View style={styles.titleSection}>
                <View style={styles.titleRow}>
                  <View style={styles.titleContainer}>
                    <Text variant="h2" weight="bold" color="primary">
                      {recipe.name}
                    </Text>
                    {recipe.description && (
                      <Text
                        variant="body"
                        color="secondary"
                        style={{ marginTop: spacing[1] }}
                      >
                        {recipe.description}
                      </Text>
                    )}
                  </View>
                  <View style={styles.titleActions}>
                    <FavoriteButton recipe={recipe} size="large" />
                    <Ionicons
                      name={getCategoryIcon(recipe.category)}
                      size={32}
                      color={colors.primary[500]}
                    />
                  </View>
                </View>

                {/* Stats */}
                <View style={styles.statsContainer}>
                  {recipe.preparationTime && (
                    <View style={styles.statItem}>
                      <Ionicons
                        name="time-outline"
                        size={24}
                        color={colors.primary[500]}
                      />
                      <Text
                        variant="bodySmall"
                        weight="semibold"
                        color="primary"
                        style={{ marginTop: spacing[1] }}
                      >
                        {recipe.preparationTime} dk
                      </Text>
                      <Text variant="caption" color="muted">
                        Hazırlık
                      </Text>
                    </View>
                  )}

                  {recipe.servings && (
                    <View style={styles.statItem}>
                      <Ionicons
                        name="people-outline"
                        size={24}
                        color={colors.primary[500]}
                      />
                      <Text
                        variant="bodySmall"
                        weight="semibold"
                        color="primary"
                        style={{ marginTop: spacing[1] }}
                      >
                        {recipe.servings}
                      </Text>
                      <Text variant="caption" color="muted">
                        Kişilik
                      </Text>
                    </View>
                  )}

                  <View style={styles.statItem}>
                    <Ionicons
                      name="list-outline"
                      size={24}
                      color={colors.primary[500]}
                    />
                    <Text
                      variant="bodySmall"
                      weight="semibold"
                      color="primary"
                      style={{ marginTop: spacing[1] }}
                    >
                      {recipe.ingredients.length}
                    </Text>
                    <Text variant="caption" color="muted">
                      Malzeme
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.divider} />

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <Button
                  variant={isSpeaking ? "primary" : "outline"}
                  size="md"
                  onPress={speakInstructions}
                  disabled={isSpeaking}
                  leftIcon={
                    isSpeaking ? (
                      <ActivityIndicator
                        size="small"
                        color={colors.neutral[0]}
                      />
                    ) : (
                      <Ionicons
                        name="volume-high"
                        size={18}
                        color={colors.primary[500]}
                      />
                    )
                  }
                  style={{ flex: 1, marginRight: spacing[2] }}
                >
                  {isSpeaking ? "Okuyor..." : "🔊 Sesli Oku"}
                </Button>

                <Button
                  variant="primary"
                  size="md"
                  onPress={() => {
                    if (recipe.missingIngredients?.length) {
                      recipe.missingIngredients.forEach(addToShoppingList);
                      Alert.alert(
                        "Eklendi",
                        "Eksik malzemeler alışveriş listesine eklendi!"
                      );
                    } else {
                      Alert.alert("Bilgi", "Eksik malzeme bulunmuyor.");
                    }
                  }}
                  leftIcon={
                    <Ionicons
                      name="bag-add"
                      size={18}
                      color={colors.neutral[0]}
                    />
                  }
                  style={{ flex: 1, marginLeft: spacing[2] }}
                >
                  🛒 Alışveriş
                </Button>
              </View>
            </View>
          </Card>

          {/* Ingredients Section */}
          <Card variant="default" size="lg" style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View
                style={[
                  styles.sectionIcon,
                  { backgroundColor: colors.success[100] },
                ]}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={colors.success[600]}
                />
              </View>
              <View style={styles.sectionTitleContainer}>
                <Text variant="h4" weight="bold" color="primary">
                  Malzemeler
                </Text>
                <Text variant="bodySmall" color="secondary">
                  {recipe.ingredients.length} adet malzeme
                </Text>
              </View>
            </View>

            <View style={styles.ingredientsList}>
              {recipe.ingredients.map((ingredient, index) => (
                <View key={index} style={styles.ingredientItem}>
                  <Ionicons
                    name="ellipse"
                    size={8}
                    color={colors.success[500]}
                  />
                  <Text
                    variant="body"
                    color="primary"
                    style={styles.ingredientText}
                  >
                    {ingredient}
                  </Text>
                  <Pressable onPress={() => addToShoppingList(ingredient)}>
                    {({ pressed }) => (
                      <Ionicons
                        name="add-circle-outline"
                        size={20}
                        color={colors.primary[500]}
                        style={{ opacity: pressed ? 0.7 : 1 }}
                      />
                    )}
                  </Pressable>
                </View>
              ))}
            </View>
          </Card>

          {/* Instructions Section */}
          <Card variant="default" size="lg" style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View
                style={[
                  styles.sectionIcon,
                  { backgroundColor: colors.warning[100] },
                ]}
              >
                <Ionicons name="list" size={20} color={colors.warning[600]} />
              </View>
              <View style={styles.sectionTitleContainer}>
                <Text variant="h4" weight="bold" color="primary">
                  Yapılışı
                </Text>
                <Text variant="bodySmall" color="secondary">
                  Adım adım tarif
                </Text>
              </View>
            </View>

            <View style={styles.instructionsList}>
              {recipe.instructions.map((instruction, index) => (
                <View key={index} style={styles.instructionItem}>
                  <View style={styles.stepNumber}>
                    <Text
                      variant="bodySmall"
                      weight="bold"
                      style={{ color: colors.neutral[0] }}
                    >
                      {index + 1}
                    </Text>
                  </View>
                  <Text
                    variant="body"
                    color="primary"
                    style={styles.instructionText}
                  >
                    {instruction}
                  </Text>
                </View>
              ))}
            </View>
          </Card>

          {/* Missing Ingredients Section */}
          {recipe.missingIngredients &&
            recipe.missingIngredients.length > 0 && (
              <Card variant="default" size="lg" style={styles.sectionCard}>
                <View style={styles.sectionHeader}>
                  <View
                    style={[
                      styles.sectionIcon,
                      { backgroundColor: colors.warning[100] },
                    ]}
                  >
                    <Ionicons
                      name="alert-circle"
                      size={20}
                      color={colors.warning[600]}
                    />
                  </View>
                  <View style={styles.sectionTitleContainer}>
                    <Text variant="h4" weight="bold" color="primary">
                      Eksik Malzemeler
                    </Text>
                    <Text variant="bodySmall" color="secondary">
                      Bu malzemeleri almanız gerekiyor
                    </Text>
                  </View>
                </View>

                <View style={styles.missingIngredientsList}>
                  {recipe.missingIngredients.map((ingredient, index) => (
                    <View key={index} style={styles.missingIngredientItem}>
                      <Ionicons
                        name="bag-outline"
                        size={16}
                        color={colors.warning[600]}
                      />
                      <Text
                        variant="body"
                        color="warning"
                        style={styles.missingIngredientText}
                      >
                        {ingredient}
                      </Text>
                      <Pressable onPress={() => addToShoppingList(ingredient)}>
                        {({ pressed }) => (
                          <Button
                            size="sm"
                            variant="outline"
                            style={{
                              opacity: pressed ? 0.7 : 1,
                              borderColor: colors.warning[500],
                              paddingHorizontal: spacing[3],
                            }}
                          >
                            <Text
                              variant="bodySmall"
                              style={{ color: colors.warning[600] }}
                            >
                              Ekle
                            </Text>
                          </Button>
                        )}
                      </Pressable>
                    </View>
                  ))}
                </View>
              </Card>
            )}

          {/* Tips Section */}
          <View style={styles.tipContainer}>
            <View style={styles.tipHeader}>
              <Ionicons name="bulb" size={16} color={colors.primary[600]} />
              <Text variant="bodySmall" weight="semibold" color="accent">
                İpucu
              </Text>
            </View>
            <Text
              variant="caption"
              style={{ color: colors.primary[700], marginTop: spacing[1] }}
            >
              Sesli okuma özelliğini kullanarak tarifi eller serbest takip
              edebilirsiniz. Eksik malzemeleri alışveriş listesine
              ekleyebilirsiniz.
            </Text>
          </View>
        </View>
      </ScrollView>
      
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
  content: {
    padding: spacing[4],
    paddingBottom: spacing[8],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing[6],
  },
  loadingTextContainer: {
    marginTop: spacing[4],
    alignItems: "center",
  },
  errorIconContainer: {
    width: 96,
    height: 96,
    borderRadius: borderRadius.full,
    backgroundColor: colors.neutral[100],
    alignItems: "center",
    justifyContent: "center",
  },
  heroCard: {
    overflow: "hidden",
    marginBottom: spacing[4],
  },
  imageContainer: {
    height: 192,
    backgroundColor: colors.primary[50],
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  difficultyBadge: {
    position: "absolute",
    top: spacing[3],
    right: spacing[3],
  },
  badge: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
  },
  heroContent: {
    padding: spacing[5],
  },
  titleSection: {
    marginBottom: spacing[4],
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing[4],
  },
  titleContainer: {
    flex: 1,
    marginRight: spacing[3],
  },
  titleActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  statItem: {
    alignItems: "center",
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.medium,
    marginVertical: spacing[4],
  },
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
  },
  sectionCard: {
    marginBottom: spacing[4],
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing[4],
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing[3],
  },
  sectionTitleContainer: {
    flex: 1,
  },
  ingredientsList: {
    gap: spacing[2],
  },
  ingredientItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing[3],
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    gap: spacing[3],
  },
  ingredientText: {
    flex: 1,
  },
  instructionsList: {
    gap: spacing[3],
  },
  instructionItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: spacing[4],
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.lg,
    gap: spacing[4],
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: colors.primary[500],
    alignItems: "center",
    justifyContent: "center",
  },
  instructionText: {
    flex: 1,
    lineHeight: typography.fontSize.base * typography.lineHeight.relaxed,
  },
  missingIngredientsList: {
    gap: spacing[2],
  },
  missingIngredientItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing[3],
    backgroundColor: colors.warning[50],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.warning[200],
    gap: spacing[3],
  },
  missingIngredientText: {
    flex: 1,
    color: colors.warning[800],
  },
  tipContainer: {
    backgroundColor: colors.primary[50],
    padding: spacing[4],
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.primary[200],
  },
  tipHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
});

export default RecipeDetailScreen;
