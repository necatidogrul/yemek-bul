import React, { useState, useEffect, useRef } from "react";
import {
  View,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  FlatList,
  Animated,
} from "react-native";
import { Logger } from "../services/LoggerService";
import { StackNavigationProp } from "@react-navigation/stack";
import { HomeStackParamList } from "../components/navigation/ThemedNavigators";
import { SpeechService } from "../services/speechService";
import { RecipeService } from "../services/recipeService";
import { OpenAIService } from "../services/openaiService";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useCreditContext } from "../contexts/CreditContext";

// New UI Components
import { Button, Card, Input, Text } from "../components/ui";
import { useTheme } from "../contexts/ThemeContext";
import PaywallModal from "../components/premium/PaywallModal";
import { usePremiumGuard } from "../hooks/usePremiumGuard";
import { usePremium } from "../contexts/PremiumContext";
import { useToast } from "../contexts/ToastContext";
import { useHaptics } from "../hooks/useHaptics";
import { useAccessibility } from "../hooks/useAccessibility";
import { borderRadius } from "../theme/design-tokens";
import { useTranslation } from "../hooks/useTranslation";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

type HomeScreenProps = {
  navigation: StackNavigationProp<HomeStackParamList, "HomeMain">;
};

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [ingredients, setIngredients] = useState<string>("");
  const [ingredientsList, setIngredientsList] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [featuredRecipes, setFeaturedRecipes] = useState<any[]>([]);
  const [popularIngredients, setPopularIngredients] = useState<string[]>([
    "🍅 Domates",
    "🧅 Soğan",
    "🥕 Havuç",
    "🥒 Salatalık",
    "🧄 Sarımsak",
    "🥔 Patates",
    "🌶️ Biber",
    "🥬 Marul",
    "🍋 Limon",
    "🧀 Peynir",
  ]);

  const { colors, typography, spacing } = useTheme();
  const { userCredits } = useCreditContext();
  const { isPremium } = usePremium();
  const { showSuccess, showError, showWarning, showInfo } = useToast();
  const haptics = useHaptics();
  const { announceForAccessibility } = useAccessibility();
  const { t, formatCredits, formatRecipesFound, formatSearchWithCount } = useTranslation();

  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  // Quick ingredient suggestions
  const quickIngredients = [
    { name: "Tavuk", icon: "🐔", color: colors.primary[500] },
    { name: "Et", icon: "🥩", color: colors.semantic.error },
    { name: "Balık", icon: "🐟", color: colors.secondary[500] },
    { name: "Makarna", icon: "🍝", color: colors.semantic.warning },
    { name: "Pirinç", icon: "🍚", color: colors.primary[400] },
    { name: "Sebze", icon: "🥬", color: colors.semantic.success },
  ];

  const handleIngredientChange = (text: string) => {
    setIngredients(text);
  };

  const addIngredient = async () => {
    if (ingredients.trim()) {
      const newIngredient = ingredients.trim();
      if (!ingredientsList.includes(newIngredient)) {
        setIngredientsList([...ingredientsList, newIngredient]);
        await haptics.selection();
      }
      setIngredients("");
    }
  };

  const removeIngredient = async (ingredient: string) => {
    setIngredientsList(ingredientsList.filter((item) => item !== ingredient));
    await haptics.selection();
  };

  const addQuickIngredient = async (ingredient: string) => {
    if (!ingredientsList.includes(ingredient)) {
      setIngredientsList([...ingredientsList, ingredient]);
      await haptics.selection();
    }
  };

  const searchRecipes = async () => {
    if (ingredientsList.length === 0) {
      showWarning(t("errors.minIngredients"));
      return;
    }

    if (!userCredits || userCredits.remainingCredits < 1) {
      showError(t("credits.insufficient"));
      return;
    }

    setIsLoading(true);
    try {
      await haptics.buttonPress();

      const recipes = await OpenAIService.generateRecipes({
        ingredients: ingredientsList,
      });

      if (recipes && recipes.recipes && recipes.recipes.length > 0) {
        showSuccess(formatRecipesFound(recipes.recipes.length));
        navigation.navigate("RecipeResults", {
          ingredients: ingredientsList,
          aiRecipes: recipes.recipes,
        });
      } else {
        showWarning(t("errors.noRecipesFound"));
      }
    } catch (error) {
      Logger.error("Recipe search failed:", error);
      showError(t("errors.search"));
    } finally {
      setIsLoading(false);
    }
  };

  const startVoiceInput = async () => {
    setIsListening(true);
    await haptics.voiceStart();

    try {
      const result = await SpeechService.startListening();
      if (typeof result === "string") {
        setIngredients(result);
      }
    } catch (error) {
      showError(t("errors.voice"));
    } finally {
      setIsListening(false);
    }
  };

  useEffect(() => {
    // Load featured recipes
    const loadFeaturedRecipes = async () => {
      try {
        const recipes = await RecipeService.getAllRecipes();
        setFeaturedRecipes(recipes.recipes.slice(0, 6));
      } catch (error) {
        Logger.error("Failed to load featured recipes:", error);
      }
    };

    loadFeaturedRecipes();
  }, []);

  const renderQuickIngredient = ({
    item,
    index,
  }: {
    item: any;
    index: number;
  }) => (
    <TouchableOpacity
      style={[styles.quickIngredientCard, { backgroundColor: colors.surface }]}
      onPress={() => addQuickIngredient(item.name)}
      activeOpacity={0.8}
    >
      <View
        style={[
          styles.quickIngredientIcon,
          { backgroundColor: item.color + "20" },
        ]}
      >
        <Text variant="headlineLarge">{item.icon}</Text>
      </View>
      <Text variant="labelMedium" weight="600" style={{ color: item.color }}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const renderFeaturedRecipe = ({
    item,
    index,
  }: {
    item: any;
    index: number;
  }) => (
    <TouchableOpacity
      style={[styles.featuredRecipeCard, { backgroundColor: colors.surface }]}
      onPress={() =>
        navigation.navigate("RecipeDetail", {
          recipeId: item.id,
          recipeName: item.name,
          recipe: item,
        })
      }
      activeOpacity={0.9}
    >
      <LinearGradient
        colors={[colors.primary[400], colors.primary[600]]}
        style={styles.featuredRecipeImage}
      >
        <Ionicons name="restaurant" size={32} color="white" />
      </LinearGradient>

      <View style={styles.featuredRecipeContent}>
        <Text variant="labelLarge" weight="600" numberOfLines={2}>
          {item.name}
        </Text>
        <View style={styles.featuredRecipeStats}>
          <View style={styles.featuredRecipeStat}>
            <Ionicons
              name="time-outline"
              size={12}
              color={colors.text.secondary}
            />
            <Text variant="labelSmall" color="secondary">
              {item.cookingTime || "30"}dk
            </Text>
          </View>
          <View style={styles.featuredRecipeStat}>
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
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <Animated.ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {/* Modern Hero Section */}
        <Animated.View style={[styles.heroSection, { opacity: headerOpacity }]}>
          <LinearGradient
            colors={[
              colors.primary[500],
              colors.primary[700],
              colors.secondary[600],
            ]}
            style={styles.heroGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.heroContent}>
              <View style={styles.heroHeader}>
                <View style={styles.welcomeText}>
                  <Text
                    variant="labelLarge"
                    style={{ color: "rgba(255,255,255,0.8)" }}
                  >
                    {t("home.greeting")}
                  </Text>
                  <Text
                    variant="displaySmall"
                    weight="700"
                    style={{ color: "white" }}
                  >
                    {t("home.question")}
                  </Text>
                </View>

                <View style={styles.creditDisplay}>
                  <View
                    style={[
                      styles.creditBadge,
                      { backgroundColor: "rgba(255,255,255,0.2)" },
                    ]}
                  >
                    <Ionicons name="diamond" size={16} color="white" />
                    <Text
                      variant="labelMedium"
                      weight="600"
                      style={{ color: "white" }}
                    >
                      {userCredits?.remainingCredits || 0}
                    </Text>
                  </View>
                </View>
              </View>

              <Text
                variant="bodyLarge"
                style={{
                  color: "rgba(255,255,255,0.9)",
                  textAlign: "center",
                  marginTop: 16,
                }}
              >
                {t("home.description")}
              </Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Modern Search Section */}
        <View
          style={[styles.searchSection, { backgroundColor: colors.background }]}
        >
          <Card variant="elevated" size="lg" style={styles.searchCard}>
            <View style={styles.searchHeader}>
              <Ionicons name="search" size={24} color={colors.primary[500]} />
              <View style={styles.searchHeaderText}>
                <Text variant="headlineSmall" weight="600">
                  {t("home.searchTitle")}
                </Text>
                <Text variant="bodySmall" color="secondary">
                  {t("home.searchSubtitle")}
                </Text>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Input
                placeholder={t("home.searchPlaceholder")}
                value={ingredients}
                onChangeText={handleIngredientChange}
                onSubmitEditing={addIngredient}
                returnKeyType="done"
                style={styles.searchInput}
                leftIcon={
                  <Ionicons
                    name="restaurant-outline"
                    size={20}
                    color={colors.text.secondary}
                  />
                }
                rightIcon={
                  <TouchableOpacity
                    onPress={startVoiceInput}
                    style={[
                      styles.voiceButton,
                      {
                        backgroundColor: isListening
                          ? colors.primary[500]
                          : colors.primary[100],
                      },
                    ]}
                  >
                    <Ionicons
                      name={isListening ? "stop" : "mic"}
                      size={20}
                      color={isListening ? "white" : colors.primary[500]}
                    />
                  </TouchableOpacity>
                }
              />
            </View>

            {/* Ingredient Tags */}
            {ingredientsList.length > 0 && (
              <View style={styles.ingredientTags}>
                <Text
                  variant="labelMedium"
                  weight="500"
                  style={{ marginBottom: 8 }}
                >
                  {t("home.addedIngredients")}
                </Text>
                <View style={styles.tagsContainer}>
                  {ingredientsList.map((ingredient, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.ingredientTag,
                        { backgroundColor: colors.primary[100] },
                      ]}
                      onPress={() => removeIngredient(ingredient)}
                    >
                      <Text
                        variant="labelSmall"
                        style={{ color: colors.primary[700] }}
                      >
                        {ingredient}
                      </Text>
                      <Ionicons
                        name="close"
                        size={14}
                        color={colors.primary[700]}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Search Button */}
            <Button
              variant="primary"
              size="lg"
              onPress={searchRecipes}
              loading={isLoading}
              disabled={ingredientsList.length === 0}
              fullWidth
              leftIcon={<Ionicons name="search" size={20} color="white" />}
              style={{ marginTop: 16 }}
            >
              {isLoading
                ? t("home.searching")
                : formatSearchWithCount(ingredientsList.length)}
            </Button>
          </Card>
        </View>

        {/* Quick Ingredients */}
        <View style={styles.quickSection}>
          <View style={styles.sectionHeader}>
            <Text variant="headlineSmall" weight="600">
              {t("home.quickAdd")}
            </Text>
            <Text variant="bodySmall" color="secondary">
              {t("home.popularIngredients")}
            </Text>
          </View>

          <FlatList
            data={quickIngredients}
            renderItem={renderQuickIngredient}
            keyExtractor={(item, index) => index.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickIngredientsContainer}
          />
        </View>

        {/* Featured Recipes */}
        <View style={styles.featuredSection}>
          <View style={styles.sectionHeader}>
            <Text variant="headlineSmall" weight="600">
              {t("home.featuredRecipes")}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate("AllRecipes")}>
              <Text
                variant="labelMedium"
                style={{ color: colors.primary[500] }}
              >
                {t("home.seeAll")}
              </Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={featuredRecipes}
            renderItem={renderFeaturedRecipe}
            keyExtractor={(item, index) => index.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.featuredRecipesContainer}
          />
        </View>

        {/* Action Cards */}
        <View style={styles.actionSection}>
          <View style={styles.actionCards}>
            <TouchableOpacity
              style={[
                styles.actionCard,
                { backgroundColor: colors.secondary[50] },
              ]}
              onPress={() => navigation.navigate("AllRecipes")}
            >
              <LinearGradient
                colors={[colors.secondary[400], colors.secondary[600]]}
                style={styles.actionCardIcon}
              >
                <Ionicons name="library" size={28} color="white" />
              </LinearGradient>
              <Text variant="labelLarge" weight="600">
                {t("home.allRecipes")}
              </Text>
              <Text variant="labelSmall" color="secondary">
                {t("home.discoverRecipes")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionCard,
                { backgroundColor: colors.semantic.error + "20" },
              ]}
              onPress={() => navigation.getParent()?.navigate("FavoritesTab")}
            >
              <LinearGradient
                colors={[colors.semantic.error, colors.semantic.error]}
                style={styles.actionCardIcon}
              >
                <Ionicons name="heart" size={28} color="white" />
              </LinearGradient>
              <Text variant="labelLarge" weight="600">
                {t("home.favorites")}
              </Text>
              <Text variant="labelSmall" color="secondary">
                {t("home.likedRecipes")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: 48 }} />
      </Animated.ScrollView>

      <PaywallModal visible={false} onClose={() => {}} feature="general" />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },

  // Hero Section
  heroSection: {
    height: screenHeight * 0.35,
  },
  heroGradient: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  heroContent: {
    flex: 1,
    justifyContent: "center",
  },
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  welcomeText: {
    flex: 1,
  },
  creditDisplay: {
    alignItems: "flex-end",
  },
  creditBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    gap: 8,
  },

  // Search Section
  searchSection: {
    marginTop: -24,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  searchCard: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  searchHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  searchHeaderText: {
    marginLeft: 16,
    flex: 1,
  },
  inputContainer: {
    marginBottom: 16,
  },
  searchInput: {
    borderRadius: borderRadius.md,
  },
  voiceButton: {
    padding: 8,
    borderRadius: borderRadius.sm,
  },

  // Ingredient Tags
  ingredientTags: {
    marginBottom: 16,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  ingredientTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    gap: 8,
  },

  // Quick Section
  quickSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  quickIngredientsContainer: {
    paddingRight: 20,
  },
  quickIngredientCard: {
    alignItems: "center",
    padding: 16,
    marginRight: 12,
    borderRadius: borderRadius.lg,
    minWidth: 80,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  quickIngredientIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },

  // Featured Section
  featuredSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  featuredRecipesContainer: {
    paddingRight: 20,
  },
  featuredRecipeCard: {
    width: 160,
    marginRight: 16,
    borderRadius: borderRadius.lg,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  featuredRecipeImage: {
    height: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  featuredRecipeContent: {
    padding: 16,
  },
  featuredRecipeStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  featuredRecipeStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },

  // Action Section
  actionSection: {
    paddingHorizontal: 16,
  },
  actionCards: {
    flexDirection: "row",
    gap: 16,
  },
  actionCard: {
    flex: 1,
    alignItems: "center",
    padding: 20,
    borderRadius: borderRadius.lg,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  actionCardIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
});

export default HomeScreen;
