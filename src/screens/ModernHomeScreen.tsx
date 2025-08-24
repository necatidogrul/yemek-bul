import React, { useState, useEffect } from "react";
import {
  View,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Dimensions,
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Logger } from "../services/LoggerService";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Animated as RNAnimated } from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { HomeStackParamList } from "../components/navigation/ThemedNavigators";

// Services
import { OpenAIService } from "../services/openaiService";
import { RecipeService } from "../services/recipeService";
import { SpeechService } from "../services/speechService";
import { HistoryService } from "../services/historyService";
import { UserPreferencesService } from "../services/UserPreferencesService";
import { getCurrentLanguage } from "../locales";

// Components
import { Text } from "../components/ui";
import { CreditDisplay } from "../components/ui/CreditDisplay";
import { CreditUpgradeModal } from "../components/modals/CreditUpgradeModal";
import { AILoadingModal } from "../components/modals/AILoadingModal";
import { useThemedStyles } from "../hooks/useThemedStyles";
import { useToast } from "../contexts/ToastContext";
import { useHaptics } from "../hooks/useHaptics";
import { usePremiumGuard } from "../hooks/usePremiumGuard";
import { useCreditContext } from "../contexts/CreditContext";
import { CREDIT_COSTS } from "../types/Credit";
import { RevenueCatService } from "../services/RevenueCatService";

// Theme
import { spacing, borderRadius, shadows } from "../theme/design-tokens";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

type ModernHomeScreenProps = {
  navigation: StackNavigationProp<HomeStackParamList, "HomeMain">;
  route: RouteProp<HomeStackParamList, "HomeMain">;
};

interface AIStage {
  stage: "analyzing" | "generating" | "optimizing" | "finalizing";
  progress: number;
}

const SMART_SUGGESTIONS = [
  {
    id: "breakfast",
    name: "Kahvaltı Öner",
    subtitle: "Hızlı başlat",
    icon: "🌅",
    color: "#F59E0B",
    mealTime: "breakfast" as const,
    defaultIngredients: ["yumurta", "peynir", "domates"],
    cookingTime: 15,
  },
  {
    id: "lunch",
    name: "Öğle Yemeği",
    subtitle: "Doyurucu tarif",
    icon: "☀️",
    color: "#EF4444",
    mealTime: "lunch" as const,
    defaultIngredients: ["tavuk", "pirinç", "sebze"],
    cookingTime: 30,
  },
  {
    id: "dinner",
    name: "Akşam Yemeği",
    subtitle: "Lezzetli akşam",
    icon: "🌆",
    color: "#8B5CF6",
    mealTime: "dinner" as const,
    defaultIngredients: ["et", "patates", "soğan"],
    cookingTime: 45,
  },
  {
    id: "snack",
    name: "Hızlı Tarif",
    subtitle: "15 dk hazır",
    icon: "⚡",
    color: "#10B981",
    mealTime: "snack" as const,
    defaultIngredients: ["makarna", "domates", "peynir"],
    cookingTime: 15,
  },
];

const POPULAR_INGREDIENTS = [
  { name: "Domates", icon: "🍅", color: "#EF4444" },
  { name: "Soğan", icon: "🧅", color: "#A855F7" },
  { name: "Peynir", icon: "🧀", color: "#F59E0B" },
  { name: "Yumurta", icon: "🥚", color: "#10B981" },
  { name: "Patates", icon: "🥔", color: "#8B5CF6" },
  { name: "Tavuk", icon: "🐔", color: "#F97316" },
];

export const ModernHomeScreen: React.FC<ModernHomeScreenProps> = ({
  navigation,
  route,
}) => {
  // State
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [inputText, setInputText] = useState("");
  const [showAIModal, setShowAIModal] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [creditModalTrigger, setCreditModalTrigger] = useState<
    "ai_limit" | "general"
  >("general");
  const [aiStage, setAiStage] = useState<AIStage>({
    stage: "analyzing",
    progress: 0,
  });
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  // Removed dropdown - always show advanced mode
  const showAdvancedMode = true;

  // Hooks
  const { colors } = useThemedStyles();
  const { showSuccess, showError, showWarning } = useToast();
  const haptics = useHaptics();
  const { checkSearchLimit } = usePremiumGuard();
  const { userCredits, canAfford, deductCredits, addCredits } =
    useCreditContext();

  // Animations
  const searchScale = new RNAnimated.Value(1);
  const inputScale = new RNAnimated.Value(1);
  const headerOpacity = new RNAnimated.Value(1);

  // RevenueCat integration
  const handleCreditPurchase = async (packageId: string) => {
    try {
      const result = await RevenueCatService.purchaseCredits(packageId);
      if (result.success) {
        showSuccess(`${packageId} paketi başarıyla satın alındı!`);
        // Credits will be automatically updated via the context
      } else {
        showError(result.error || "Bilinmeyen hata oluştu");
      }
    } catch (error) {
      Logger.error("[ModernHomeScreen] Credit purchase failed:", error);
      showError("Satın alma işlemi başarısız oldu");
    }
  };

  const handlePremiumUpgrade = async (tierId: string, yearly = false) => {
    try {
      const result = await RevenueCatService.purchasePremium(tierId);
      if (result.success) {
        showSuccess("Premium aboneliğiniz başarıyla etkinleştirildi!");
      } else {
        showError(result.error || "Bilinmeyen hata oluştu");
      }
    } catch (error) {
      Logger.error("[ModernHomeScreen] Premium upgrade failed:", error);
      showError("Abonelik işlemi başarısız oldu");
    }
  };

  // Animation helpers
  const animateScale = (animatedValue: RNAnimated.Value, toValue: number) => {
    RNAnimated.spring(animatedValue, {
      toValue,
      useNativeDriver: true,
    }).start();
  };

  // Handle prefilled ingredients from history
  React.useEffect(() => {
    if (route.params?.prefillIngredients) {
      setIngredients(route.params.prefillIngredients);
      showSuccess("Geçmişten malzemeler eklendi");
    }
  }, [route.params?.prefillIngredients]);

  // Add ingredient
  const addIngredient = (ingredient: string) => {
    const trimmed = ingredient.trim().toLowerCase();
    if (trimmed && !ingredients.includes(trimmed)) {
      setIngredients((prev) => [...prev, trimmed]);
      setInputText("");
      setShowSuggestions(false);
      haptics.selection();
      showSuccess(`${ingredient} listene eklendi`);
    } else if (ingredients.includes(trimmed)) {
      showWarning("Bu malzeme zaten listende");
    }
  };

  // Remove ingredient
  const removeIngredient = (ingredient: string) => {
    setIngredients((prev) => prev.filter((item) => item !== ingredient));
    haptics.selection();
  };

  // Handle input change
  const handleInputChange = async (text: string) => {
    setInputText(text);

    if (text.trim().length > 1) {
      try {
        const suggestions = await RecipeService.getIngredientSuggestions(
          text.trim(),
          6
        );
        setSuggestions(suggestions);
        setShowSuggestions(suggestions.length > 0);
      } catch (error) {
        console.warn("Suggestions failed:", error);
      }
    } else {
      setShowSuggestions(false);
    }
  };

  // Smart suggestion tap handler
  const handleSmartSuggestion = async (
    suggestion: (typeof SMART_SUGGESTIONS)[0]
  ) => {
    // Set the ingredients for display
    setIngredients(suggestion.defaultIngredients);

    // Start AI generation immediately with smart defaults
    await generateAIRecipesWithSmartDefaults(suggestion);
  };

  // Smart AI Recipe Generation with defaults
  const generateAIRecipesWithSmartDefaults = async (
    suggestion: (typeof SMART_SUGGESTIONS)[0]
  ) => {
    // Check if user can afford AI recipe generation
    if (!canAfford("recipe_generation")) {
      setCreditModalTrigger("ai_limit");
      setShowCreditModal(true);
      return;
    }

    const canSearch = await checkSearchLimit();
    if (!canSearch) return;

    // Start animations
    animateScale(searchScale, 0.95);
    setTimeout(() => {
      animateScale(searchScale, 1);
    }, 150);

    // Deduct credits BEFORE making API call
    const creditDeducted = await deductCredits(
      "recipe_generation",
      `AI tarif üretimi - ${suggestion.name}`
    );

    if (!creditDeducted) {
      showError("Kredi düşürülemedi", "Lütfen tekrar deneyin");
      return;
    }

    setShowAIModal(true);
    haptics.voiceStart();

    try {
      // Stage 1: Analyzing
      setAiStage({ stage: "analyzing", progress: 0 });
      await new Promise((resolve) => setTimeout(resolve, 800));
      setAiStage({ stage: "analyzing", progress: 25 });

      // Stage 2: Generating
      setAiStage({ stage: "generating", progress: 30 });

      // Kullanıcı tercihlerini al
      const userPreferences = await UserPreferencesService.getUserPreferences();

      // Tarif geçmişi sayısını al (basit implementation)
      const recipeHistory = await HistoryService.getStats()
        .then((stats) => stats.totalRequests || 0)
        .catch(() => 0);

      const aiResponse = await OpenAIService.generateRecipes({
        ingredients: suggestion.defaultIngredients,
        language: getCurrentLanguage() as 'tr' | 'en',
        mealTime: suggestion.mealTime,
        userProfile: {
          dietaryRestrictions: userPreferences.dietaryRestrictions || [],
          favoriteCategories: userPreferences.favoriteCategories || [],
          cookingLevel: userPreferences.cookingLevel || "orta",
          recipeHistory: recipeHistory,
        },
        preferences: {
          difficulty:
            userPreferences.cookingLevel === "başlangıç"
              ? "kolay"
              : userPreferences.cookingLevel === "uzman"
              ? "zor"
              : "orta",
          servings: 2,
          cookingTime: suggestion.cookingTime,
        },
      });

      // Stage 3: Optimizing
      setAiStage({ stage: "optimizing", progress: 75 });
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Stage 4: Finalizing
      setAiStage({ stage: "finalizing", progress: 95 });
      await new Promise((resolve) => setTimeout(resolve, 300));
      setAiStage({ stage: "finalizing", progress: 100 });

      await new Promise((resolve) => setTimeout(resolve, 500));
      setShowAIModal(false);

      if (aiResponse.recipes && aiResponse.recipes.length > 0) {
        haptics.success();
        showSuccess(
          "Tarifler Hazır!",
          `${aiResponse.recipes.length} AI tarif önerisi oluşturuldu`
        );

        // Navigate to results
        navigation.navigate("RecipeResults", {
          ingredients: suggestion.defaultIngredients,
          aiRecipes: aiResponse.recipes,
        });
      } else {
        showWarning("Tarif Bulunamadı", "Bu malzemeler için tarif üretilemedi");
      }
    } catch (error: any) {
      setShowAIModal(false);

      // Refund credits on API failure
      try {
        await addCredits(1, "AI tarif üretimi başarısız - kredi iade");
      } catch (refundError) {
        Logger.error("Failed to refund credits:", refundError);
      }

      showError(
        "AI Hatası",
        "Tarif üretilirken bir hata oluştu (Kredi iade edildi)"
      );
      haptics.error();
    }
  };

  // AI Recipe Generation
  const generateAIRecipes = async (
    customIngredients?: string[],
    customMealTime?: string
  ) => {
    const useIngredients = customIngredients || ingredients;
    const useMealTime = customMealTime || "lunch"; // Default to lunch

    if (useIngredients.length === 0) {
      showWarning("Malzeme Gerekli", "Lütfen en az bir malzeme ekleyin");
      return;
    }

    // Check if user can afford AI recipe generation
    if (!canAfford("recipe_generation")) {
      setCreditModalTrigger("ai_limit");
      setShowCreditModal(true);
      return;
    }

    const canSearch = await checkSearchLimit();
    if (!canSearch) return;

    // Start animations
    animateScale(searchScale, 0.95);
    setTimeout(() => {
      animateScale(searchScale, 1);
    }, 150);

    // Deduct credits BEFORE making API call
    const creditDeducted = await deductCredits(
      "recipe_generation",
      `AI tarif üretimi - ${ingredients.join(", ")}`
    );

    if (!creditDeducted) {
      showError("Kredi düşürülemedi", "Lütfen tekrar deneyin");
      return;
    }

    setShowAIModal(true);
    haptics.voiceStart();

    try {
      // Stage 1: Analyzing
      setAiStage({ stage: "analyzing", progress: 0 });
      await new Promise((resolve) => setTimeout(resolve, 800));
      setAiStage({ stage: "analyzing", progress: 25 });

      // Stage 2: Generating
      setAiStage({ stage: "generating", progress: 30 });

      // Kullanıcı tercihlerini al
      const userPreferences = await UserPreferencesService.getUserPreferences();

      // Tarif geçmişi sayısını al (basit implementation)
      const recipeHistory = await HistoryService.getStats()
        .then((stats) => stats.totalRequests || 0)
        .catch(() => 0);

      const aiResponse = await OpenAIService.generateRecipes({
        ingredients: useIngredients,
        language: getCurrentLanguage() as 'tr' | 'en',
        mealTime: useMealTime as "breakfast" | "lunch" | "dinner" | "snack",
        userProfile: {
          dietaryRestrictions: userPreferences.dietaryRestrictions || [],
          favoriteCategories: userPreferences.favoriteCategories || [],
          cookingLevel: userPreferences.cookingLevel || "orta",
          recipeHistory: recipeHistory,
        },
        preferences: {
          difficulty:
            userPreferences.cookingLevel === "başlangıç"
              ? "kolay"
              : userPreferences.cookingLevel === "uzman"
              ? "zor"
              : "orta",
          servings: 2,
          cookingTime:
            useMealTime === "breakfast"
              ? 15
              : useMealTime === "lunch"
              ? 30
              : 45,
        },
      });

      // Stage 3: Optimizing
      setAiStage({ stage: "optimizing", progress: 75 });
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Stage 4: Finalizing
      setAiStage({ stage: "finalizing", progress: 95 });
      await new Promise((resolve) => setTimeout(resolve, 300));
      setAiStage({ stage: "finalizing", progress: 100 });

      await new Promise((resolve) => setTimeout(resolve, 500));
      setShowAIModal(false);

      if (aiResponse.recipes && aiResponse.recipes.length > 0) {
        // Credits already deducted above - just show success

        haptics.success();
        showSuccess(
          "Tarifler Hazır!",
          `${aiResponse.recipes.length} AI tarif önerisi oluşturuldu`
        );

        // Save to history
        await HistoryService.saveRequest({
          ingredients: useIngredients,
          preferences: {
            difficulty: "kolay",
            servings: 2,
            cookingTime: 30,
          },
          results: {
            count: aiResponse.recipes.length,
            recipes: aiResponse.recipes.map((recipe) => ({
              id: recipe.id || `ai_${Date.now()}_${Math.random()}`,
              name: recipe.name,
              difficulty: recipe.difficulty,
              cookingTime: recipe.cookingTime,
            })),
          },
          success: true,
        });

        // Navigate to results
        navigation.navigate("RecipeResults", {
          ingredients: useIngredients,
          aiRecipes: aiResponse.recipes,
        });
      } else {
        showWarning("Tarif Bulunamadı", "Bu malzemeler için tarif üretilemedi");

        // Save failed attempt to history
        await HistoryService.saveRequest({
          ingredients: useIngredients,
          preferences: {
            difficulty: "kolay",
            servings: 2,
            cookingTime: 30,
          },
          results: {
            count: 0,
            recipes: [],
          },
          success: false,
        });
      }
    } catch (error: any) {
      console.error("AI Generation Error:", error);
      setShowAIModal(false);

      // Refund credits on API failure
      try {
        await addCredits(1, "AI tarif üretimi başarısız - kredi iade");
        Logger.info("Credits refunded due to AI generation failure");
      } catch (refundError) {
        Logger.error("Failed to refund credits:", refundError);
      }

      let errorMessage = "Tarif üretilirken bir hata oluştu";
      if (error.message?.includes("API key")) {
        errorMessage = "OpenAI API anahtarı bulunamadı";
      } else if (error.message?.includes("quota")) {
        errorMessage = "API kotası doldu. Lütfen daha sonra tekrar deneyin";
      }

      showError("AI Hatası", errorMessage + " (Kredi iade edildi)");
      haptics.error();

      // Save error to history
      await HistoryService.saveRequest({
        ingredients: useIngredients,
        preferences: {
          difficulty: "kolay",
          servings: 2,
          cookingTime: 30,
        },
        results: {
          count: 0,
          recipes: [],
        },
        success: false,
        error: errorMessage,
      });

      // Fallback to normal search
      navigation.navigate("RecipeResults", { ingredients: useIngredients });
    }
  };

  // Popular ingredient press
  const handlePopularIngredientPress = (ingredient: string) => {
    animateScale(inputScale, 0.95);
    setTimeout(() => {
      animateScale(inputScale, 1);
      addIngredient(ingredient);
    }, 100);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background.primary }]}
    >
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />

      {/* Compact Header */}
      <View style={styles.compactHeader}>
        <View style={styles.compactHeaderContent}>
          <View style={styles.compactHeaderLeft}>
            <Ionicons name="restaurant" size={24} color={colors.primary[500]} />
            <Text
              variant="headlineSmall"
              weight="bold"
              style={{ color: colors.text.primary }}
            >
              Yemek Bulucu
            </Text>
          </View>
          <CreditDisplay
            compact={true}
            onPress={() => {
              setCreditModalTrigger("general");
              setShowCreditModal(true);
            }}
          />
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={true}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={styles.mainContent}>
            {/* Welcome Section */}
            <View style={styles.welcomeSection}>
              <Text
                variant="displaySmall"
                weight="bold"
                style={{ color: colors.text.primary }}
              >
                Ne pişirmek istersin?
              </Text>
              <Text
                variant="bodyLarge"
                color="secondary"
                style={{ marginTop: 8 }}
              >
                Tek dokunuşla AI tarif önerisi al
              </Text>
            </View>

            {/* Smart Suggestions Grid - 2x2 */}
            <View style={styles.smartSuggestionGrid}>
              {SMART_SUGGESTIONS.map((suggestion) => (
                <TouchableOpacity
                  key={suggestion.id}
                  style={[styles.suggestionCard]}
                  onPress={() => handleSmartSuggestion(suggestion)}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[suggestion.color, suggestion.color + "E6"]}
                    style={styles.suggestionGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.suggestionIcon}>{suggestion.icon}</Text>
                    <Text
                      variant="bodyLarge"
                      weight="600"
                      style={{ color: "white", textAlign: "center" }}
                    >
                      {suggestion.name}
                    </Text>
                    <Text
                      variant="labelSmall"
                      style={{
                        color: "rgba(255,255,255,0.9)",
                        textAlign: "center",
                      }}
                    >
                      {suggestion.subtitle}
                    </Text>
                    <View style={styles.aiIndicator}>
                      <Ionicons name="sparkles" size={14} color="white" />
                      <Text
                        variant="labelSmall"
                        style={{ color: "white", marginLeft: 4 }}
                      >
                        AI
                      </Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>

            {/* Custom Input Section Header */}
            <View style={styles.customInputSection}>
              <View
                style={[
                  styles.customInputHeader,
                  { backgroundColor: colors.surface?.primary || "#fff" },
                ]}
              >
                <View style={styles.customInputContent}>
                  <Ionicons
                    name="create-outline"
                    size={24}
                    color={colors.primary[500]}
                  />
                  <View style={styles.customInputText}>
                    <Text
                      variant="bodyLarge"
                      weight="600"
                      style={{ color: colors.text.primary }}
                    >
                      Özel Tarif Oluştur
                    </Text>
                    <Text variant="labelMedium" color="secondary">
                      Kendi malzemelerinle tarif bul
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Advanced Mode - Always shown */}
            <View
              style={[
                styles.advancedInputSection,
                { backgroundColor: colors.neutral[50] },
              ]}
            >
              <Text
                variant="bodyLarge"
                weight="600"
                style={{ marginBottom: 16, color: colors.text.primary }}
              >
                Malzemelerinizi ekleyin
              </Text>

              {/* Compact Input */}
              <View style={styles.compactInputContainer}>
                <View
                  style={[
                    styles.compactTextInput,
                    { borderColor: colors.neutral[300] },
                  ]}
                >
                  <Ionicons
                    name="restaurant-outline"
                    size={20}
                    color={colors.neutral[400]}
                  />
                  <TextInput
                    style={[styles.inputField, { color: colors.text.primary }]}
                    placeholder="Malzeme ekle..."
                    placeholderTextColor={colors.neutral[400]}
                    value={inputText}
                    onChangeText={handleInputChange}
                    onSubmitEditing={() => addIngredient(inputText)}
                    returnKeyType="done"
                  />
                  {inputText.length > 0 && (
                    <TouchableOpacity
                      onPress={() => addIngredient(inputText)}
                      style={[
                        styles.quickAddButton,
                        { backgroundColor: colors.primary[500] },
                      ]}
                    >
                      <Ionicons name="add" size={18} color="#fff" />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Quick Popular Ingredients */}
                <View style={styles.quickIngredients}>
                  {POPULAR_INGREDIENTS.slice(0, 4).map((item) => (
                    <TouchableOpacity
                      key={item.name}
                      style={[
                        styles.quickIngredientTag,
                        { backgroundColor: colors.surface?.primary || "#fff" },
                      ]}
                      onPress={() => addIngredient(item.name)}
                    >
                      <Text style={{ fontSize: 16 }}>{item.icon}</Text>
                      <Text
                        variant="labelSmall"
                        style={{ color: colors.text.primary }}
                      >
                        {item.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Added Ingredients Display */}
                {ingredients.length > 0 && (
                  <View style={styles.addedIngredients}>
                    <View style={styles.addedIngredientsHeader}>
                      <Text
                        variant="labelMedium"
                        weight="600"
                        style={{ color: colors.text.primary }}
                      >
                        Eklenen ({ingredients.length})
                      </Text>
                      <TouchableOpacity onPress={() => setIngredients([])}>
                        <Text
                          variant="labelSmall"
                          style={{ color: colors.error[500] }}
                        >
                          Temizle
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.ingredientChips}>
                      {ingredients.map((ingredient) => (
                        <TouchableOpacity
                          key={ingredient}
                          style={[
                            styles.ingredientChip,
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
                            size={12}
                            color={colors.primary[700]}
                          />
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Generate Button */}
                    <TouchableOpacity
                      style={[styles.generateButton]}
                      onPress={() => generateAIRecipes()}
                      activeOpacity={0.8}
                    >
                      <LinearGradient
                        colors={["#8B5CF6", "#A855F7"]}
                        style={styles.generateButtonGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <Ionicons name="sparkles" size={20} color="white" />
                        <Text
                          variant="bodyMedium"
                          weight="600"
                          style={{ color: "white" }}
                        >
                          AI Tarif Üret
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Bottom Spacing */}
          <View style={{ height: 120 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* AI Loading Modal */}
      <AILoadingModal
        visible={showAIModal}
        onClose={() => setShowAIModal(false)}
        stage={aiStage.stage}
        progress={aiStage.progress}
      />

      {/* Credit Upgrade Modal */}
      <CreditUpgradeModal
        visible={showCreditModal}
        onClose={() => setShowCreditModal(false)}
        onPurchaseCredits={handleCreditPurchase}
        onUpgradePremium={handlePremiumUpgrade}
        trigger={creditModalTrigger}
        userId={userCredits?.userId || "temp_user"}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: Platform.OS === "ios" ? 150 : 120,
  },

  // Compact Header
  compactHeader: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  compactHeaderContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  compactHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
  },

  // Main Content
  mainContent: {
    flex: 1,
    paddingHorizontal: spacing[4],
  },
  welcomeSection: {
    paddingTop: spacing[6],
    paddingBottom: spacing[6],
    alignItems: "center",
  },

  // Smart Suggestions Grid
  smartSuggestionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[3],
    marginBottom: spacing[6],
  },
  suggestionCard: {
    width: (screenWidth - spacing[4] * 2 - spacing[3]) / 2,
    aspectRatio: 1.1,
    borderRadius: borderRadius.xl,
    overflow: "hidden",
    ...shadows.lg,
  },
  suggestionGradient: {
    flex: 1,
    padding: spacing[4],
    justifyContent: "space-between",
    alignItems: "center",
    position: "relative",
  },
  suggestionIcon: {
    fontSize: 36,
    marginBottom: spacing[2],
  },
  aiIndicator: {
    position: "absolute",
    top: spacing[2],
    right: spacing[2],
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.3)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },

  // Custom Input Section
  customInputSection: {
    marginBottom: spacing[4],
  },
  customInputHeader: {
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  customInputContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing[4],
    gap: spacing[3],
  },
  customInputText: {
    flex: 1,
  },

  // Advanced Input
  advancedInputSection: {
    borderRadius: borderRadius.lg,
    padding: spacing[4],
    ...shadows.sm,
  },
  compactInputContainer: {
    gap: spacing[3],
  },
  compactTextInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    gap: spacing[2],
  },
  inputField: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
  },
  quickAddButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  quickIngredients: {
    flexDirection: "row",
    gap: spacing[2],
  },
  quickIngredientTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing[2],
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    gap: 4,
    ...shadows.sm,
  },
  addedIngredients: {
    gap: spacing[3],
  },
  addedIngredientsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ingredientChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  ingredientChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing[2],
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    gap: 6,
  },
  generateButton: {
    borderRadius: borderRadius.lg,
    overflow: "hidden",
    ...shadows.md,
  },
  generateButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing[3],
    gap: spacing[2],
  },
  header: {
    paddingTop: spacing[6],
    paddingBottom: spacing[8],
    paddingHorizontal: spacing[6],
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing[4],
  },
  headerText: {
    flex: 1,
  },
  inputSection: {
    margin: spacing[4],
    padding: spacing[6],
    borderRadius: borderRadius.xl,
    ...shadows.lg,
  },
  sectionTitle: {
    marginBottom: spacing[4],
  },
  inputContainer: {
    position: "relative",
  },
  textInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 2,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[3],
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  suggestionsContainer: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    borderRadius: borderRadius.lg,
    marginTop: 8,
    padding: 8,
    ...shadows.md,
    zIndex: 1000,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: borderRadius.md,
  },
  popularSection: {
    paddingHorizontal: spacing[4],
    marginBottom: spacing[6],
  },
  popularGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[3],
  },
  popularItem: {
    alignItems: "center",
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    minWidth: (screenWidth - spacing[4] * 2 - spacing[3] * 2) / 3,
    ...shadows.sm,
    position: "relative",
  },
  popularEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  popularDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  ingredientsSection: {
    margin: spacing[4],
    padding: spacing[6],
    borderRadius: borderRadius.xl,
    ...shadows.lg,
  },
  ingredientsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing[4],
  },
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing[3],
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    gap: spacing[1],
  },
  ingredientsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: spacing[6],
  },
  removeButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  aiButton: {
    borderRadius: borderRadius.xl,
    overflow: "hidden",
    ...shadows.xl,
  },
  aiButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing[5],
    paddingHorizontal: spacing[6],
    gap: spacing[3],
    position: "relative",
  },
  aiButtonBadge: {
    position: "absolute",
    top: 8,
    right: spacing[3],
    backgroundColor: "#fff",
    paddingHorizontal: 8,
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
  },
  quickActions: {
    flexDirection: "row",
    paddingHorizontal: spacing[4],
    gap: spacing[4],
  },
  quickActionCard: {
    flex: 1,
    alignItems: "center",
    padding: spacing[5],
    borderRadius: borderRadius.xl,
    ...shadows.md,
  },
  quickActionGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[3],
  },

  // Smart Suggestions
  smartSection: {
    marginHorizontal: spacing[4],
    marginBottom: spacing[6],
    padding: spacing[6],
    borderRadius: borderRadius.xl,
    ...shadows.lg,
  },
  smartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing[6],
  },
  advancedToggle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.sm,
  },
  smartGrid: {
    gap: spacing[4],
  },
  smartCard: {
    borderRadius: borderRadius.lg,
    overflow: "hidden",
    ...shadows.md,
  },
  smartCardGradient: {
    padding: spacing[5],
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
    minHeight: 80,
  },
  smartCardIcon: {
    marginRight: spacing[4],
  },
  smartCardContent: {
    flex: 1,
  },
  smartCardBadge: {
    position: "absolute",
    top: spacing[2],
    right: spacing[2],
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  // Smart Suggestions (duplicate removed)

  // Meal Time Selector
  mealTimeSection: {
    marginHorizontal: spacing[4],
    marginBottom: spacing[6],
    padding: spacing[6],
    borderRadius: borderRadius.xl,
    ...shadows.md,
  },
  mealTimeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: spacing[3],
  },
  mealTimeCard: {
    width: (screenWidth - spacing[4] * 2 - spacing[6] * 2 - spacing[3]) / 2,
    aspectRatio: 1.2,
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.sm,
    position: "relative",
  },
  mealTimeIcon: {
    marginBottom: spacing[2],
  },
  checkmark: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default ModernHomeScreen;
