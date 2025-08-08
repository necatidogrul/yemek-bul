import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Dimensions,
  StatusBar,
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

const POPULAR_INGREDIENTS = [
  { name: "Domates", icon: "🍅", color: "#EF4444" },
  { name: "Soğan", icon: "🧅", color: "#A855F7" },
  { name: "Peynir", icon: "🧀", color: "#F59E0B" },
  { name: "Yumurta", icon: "🥚", color: "#10B981" },
  { name: "Patates", icon: "🥔", color: "#8B5CF6" },
  { name: "Tavuk", icon: "🐔", color: "#F97316" },
];

const MEAL_TIMES = [
  { id: 'breakfast', name: 'Kahvaltı', icon: '🌅', color: '#F59E0B', time: 'morning' },
  { id: 'lunch', name: 'Öğle', icon: '☀️', color: '#EF4444', time: 'noon' },
  { id: 'dinner', name: 'Akşam', icon: '🌆', color: '#8B5CF6', time: 'evening' },
  { id: 'snack', name: 'Atıştırmalık', icon: '🍿', color: '#10B981', time: 'anytime' },
] as const;

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
  const [selectedMealTime, setSelectedMealTime] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack' | null>(null);

  // Hooks
  const { colors } = useThemedStyles();
  const { showSuccess, showError, showWarning } = useToast();
  const haptics = useHaptics();
  const { checkSearchLimit } = usePremiumGuard();
  const { userCredits, canAfford, deductCredits, addCredits } = useCreditContext();

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
      const result = await RevenueCatService.purchasePremium();
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

  // AI Recipe Generation
  const generateAIRecipes = async () => {
    if (ingredients.length === 0) {
      showWarning("Malzeme Gerekli", "Lütfen en az bir malzeme ekleyin");
      return;
    }
    
    if (!selectedMealTime) {
      showWarning("Öğün Seçimi", "Lütfen hangi öğün için tarif aradığınızı seçin");
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
      const recipeHistory = await HistoryService.getStats().then(stats => stats.totalRequests || 0).catch(() => 0);
      
      const aiResponse = await OpenAIService.generateRecipes({
        ingredients,
        mealTime: selectedMealTime!,
        userProfile: {
          dietaryRestrictions: userPreferences.dietaryRestrictions || [],
          favoriteCategories: userPreferences.favoriteCategories || [],
          cookingLevel: userPreferences.cookingLevel || 'orta',
          recipeHistory: recipeHistory,
        },
        preferences: {
          difficulty: userPreferences.cookingLevel === 'başlangıç' ? 'kolay' : 
                     userPreferences.cookingLevel === 'uzman' ? 'zor' : 'orta',
          servings: 2,
          cookingTime: selectedMealTime === 'breakfast' ? 15 : 
                      selectedMealTime === 'lunch' ? 30 : 45,
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
          ingredients,
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
          ingredients,
          aiRecipes: aiResponse.recipes,
        });
      } else {
        showWarning("Tarif Bulunamadı", "Bu malzemeler için tarif üretilemedi");

        // Save failed attempt to history
        await HistoryService.saveRequest({
          ingredients,
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
        ingredients,
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
      navigation.navigate("RecipeResults", { ingredients });
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

      {/* Header */}
      <RNAnimated.View style={{ opacity: headerOpacity }}>
        <LinearGradient
          colors={["#1a1a2e", "#16213e", "#0f3460"]}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIcon}>
                <Ionicons name="restaurant" size={28} color="#fff" />
              </View>
              <View style={styles.headerText}>
                <Text
                  variant="headlineMedium"
                  weight="bold"
                  style={{ color: "#fff" }}
                >
                  Yemek Bulucu
                </Text>
                <Text
                  variant="bodyMedium"
                  style={{ color: "rgba(255,255,255,0.8)" }}
                >
                  AI ile akıllı tarif önerileri
                </Text>
              </View>
            </View>

            <View style={styles.headerRight}>
              <CreditDisplay
                compact={true}
                onPress={() => {
                  setCreditModalTrigger("general");
                  setShowCreditModal(true);
                }}
              />
            </View>
          </View>
        </LinearGradient>
      </RNAnimated.View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Meal Time Selector */}
        <RNAnimated.View style={{ transform: [{ scale: inputScale }] }}>
          <View
            style={[
              styles.mealTimeSection,
              { backgroundColor: colors.neutral[50] },
            ]}
          >
            <Text
              variant="headlineSmall"
              weight="semibold"
              style={styles.sectionTitle}
            >
              Hangi öğün için tarif arıyorsun?
            </Text>
            
            <View style={styles.mealTimeGrid}>
              {MEAL_TIMES.map((mealTime) => {
                const isSelected = selectedMealTime === mealTime.id;
                return (
                  <TouchableOpacity
                    key={mealTime.id}
                    style={[
                      styles.mealTimeCard,
                      {
                        backgroundColor: isSelected 
                          ? mealTime.color + '20' 
                          : colors.surface?.primary || '#fff',
                        borderColor: isSelected 
                          ? mealTime.color 
                          : colors.neutral?.[300] || '#ddd',
                        borderWidth: isSelected ? 2 : 1,
                      },
                    ]}
                    onPress={() => {
                      setSelectedMealTime(mealTime.id);
                      haptics.impactLight();
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={{ ...styles.mealTimeIcon, fontSize: 32 }}>
                      {mealTime.icon}
                    </Text>
                    <Text
                      variant="bodyLarge"
                      weight="600"
                      style={{
                        color: isSelected ? mealTime.color : colors.text.primary,
                        textAlign: 'center',
                      }}
                    >
                      {mealTime.name}
                    </Text>
                    {isSelected && (
                      <View style={[
                        styles.checkmark,
                        { backgroundColor: mealTime.color }
                      ]}>
                        <Ionicons name="checkmark" size={12} color="white" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </RNAnimated.View>

        {/* Input Section */}
        <RNAnimated.View style={{ transform: [{ scale: inputScale }] }}>
          <View
            style={[
              styles.inputSection,
              { backgroundColor: colors.neutral[50] },
            ]}
          >
            <Text
              variant="headlineSmall"
              weight="semibold"
              style={styles.sectionTitle}
            >
              Malzemelerinizi Girin
            </Text>

            <View style={styles.inputContainer}>
              <View
                style={[
                  styles.textInputContainer,
                  { borderColor: colors.neutral[200] },
                ]}
              >
                <Ionicons name="search" size={20} color={colors.neutral[400]} />
                <TextInput
                  style={[styles.textInput, { color: colors.neutral[900] }]}
                  placeholder="Örn: domates, soğan, peynir..."
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
                      styles.addButton,
                      { backgroundColor: colors.primary[500] },
                    ]}
                  >
                    <Ionicons name="add" size={18} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Suggestions */}
              {showSuggestions && (
                <View
                  style={[
                    styles.suggestionsContainer,
                    { backgroundColor: colors.neutral[50] },
                  ]}
                >
                  {suggestions.map((suggestion, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.suggestionItem}
                      onPress={() => addIngredient(suggestion)}
                    >
                      <Ionicons
                        name="add-circle-outline"
                        size={16}
                        color={colors.primary[500]}
                      />
                      <Text variant="bodyMedium" style={{ marginLeft: 8 }}>
                        {suggestion}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
        </RNAnimated.View>

        {/* Popular Ingredients */}
        <View style={styles.popularSection}>
          <Text
            variant="bodyLarge"
            weight="semibold"
            style={styles.sectionTitle}
          >
            Popüler Malzemeler
          </Text>
          <View style={styles.popularGrid}>
            {POPULAR_INGREDIENTS.map((item, index) => (
              <TouchableOpacity
                key={item.name}
                style={[
                  styles.popularItem,
                  { backgroundColor: colors.neutral[50] },
                ]}
                onPress={() => handlePopularIngredientPress(item.name)}
                activeOpacity={0.7}
              >
                <Text style={styles.popularEmoji}>{item.icon}</Text>
                <Text variant="bodySmall" weight="medium">
                  {item.name}
                </Text>
                <View
                  style={[styles.popularDot, { backgroundColor: item.color }]}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Added Ingredients */}
        {ingredients.length > 0 && (
          <View
            style={[
              styles.ingredientsSection,
              { backgroundColor: colors.neutral[50] },
            ]}
          >
            <View style={styles.ingredientsHeader}>
              <Text variant="bodyLarge" weight="semibold">
                Eklenen Malzemeler ({ingredients.length})
              </Text>
              <TouchableOpacity
                onPress={() => setIngredients([])}
                style={[
                  styles.clearButton,
                  { backgroundColor: colors.error[50] },
                ]}
              >
                <Ionicons
                  name="trash-outline"
                  size={16}
                  color={colors.error[500]}
                />
                <Text variant="labelSmall" color="error" weight="medium">
                  Temizle
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.ingredientsList}>
              {ingredients.map((ingredient, index) => (
                <View
                  key={ingredient}
                  style={[
                    styles.ingredientChip,
                    { backgroundColor: colors.primary[50] },
                  ]}
                >
                  <Text variant="bodySmall" color="accent" weight="medium">
                    {ingredient}
                  </Text>
                  <TouchableOpacity
                    onPress={() => removeIngredient(ingredient)}
                    style={styles.removeButton}
                  >
                    <Ionicons
                      name="close"
                      size={16}
                      color={colors.primary[400]}
                    />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* AI Generate Button */}
            <RNAnimated.View style={{ transform: [{ scale: searchScale }] }}>
              <TouchableOpacity
                style={[styles.aiButton]}
                onPress={generateAIRecipes}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={["#8B5CF6", "#A855F7", "#C084FC"]}
                  style={styles.aiButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="sparkles" size={24} color="#fff" />
                  <Text
                    variant="bodyLarge"
                    weight="bold"
                    style={{ color: "#fff" }}
                  >
                    AI ile Tarif Üret
                  </Text>
                  <View style={styles.aiButtonBadge}>
                    <Text
                      variant="labelSmall"
                      weight="bold"
                      style={{ color: "#8B5CF6" }}
                    >
                      BETA
                    </Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </RNAnimated.View>
          </View>
        )}

        {/* Quick Actions */}
        <RNAnimated.View style={{ opacity: headerOpacity }}>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[
                styles.quickActionCard,
                { backgroundColor: colors.neutral[50] },
              ]}
              onPress={() => {
                // @ts-ignore - Navigate to tab
                navigation.getParent()?.navigate("HistoryTab");
              }}
            >
              <LinearGradient
                colors={["#8B5CF6", "#7C3AED"]}
                style={styles.quickActionGradient}
              >
                <Ionicons name="time" size={24} color="#fff" />
              </LinearGradient>
              <Text variant="bodyLarge" weight="semibold">
                Geçmiş
              </Text>
              <Text variant="labelSmall" color="secondary">
                Arama geçmişi
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.quickActionCard,
                { backgroundColor: colors.neutral[50] },
              ]}
              onPress={() => {
                // @ts-ignore - Navigate to tab
                navigation.getParent()?.navigate("FavoritesTab");
              }}
            >
              <LinearGradient
                colors={["#EF4444", "#DC2626"]}
                style={styles.quickActionGradient}
              >
                <Ionicons name="heart" size={24} color="#fff" />
              </LinearGradient>
              <Text variant="bodyLarge" weight="semibold">
                Favorilerim
              </Text>
              <Text variant="labelSmall" color="secondary">
                Kayıtlı tarifler
              </Text>
            </TouchableOpacity>
          </View>
        </RNAnimated.View>
      </ScrollView>

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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing[8],
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
  ingredientChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing[3],
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    gap: 8,
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
