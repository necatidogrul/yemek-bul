import React, { useState, useRef } from "react";
import {
  View,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  Animated,
  Share,
} from "react-native";
import { Logger } from "../services/LoggerService";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { HomeStackParamList, FavoritesStackParamList } from "../../App";
import { Recipe } from "../types/Recipe";
import { SpeechService } from "../services/speechService";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useCreditContext } from "../contexts/CreditContext";

// UI Components
import { Button, Text } from "../components/ui";
import {
  useTheme,
  spacing,
  colors,
} from "../contexts/ThemeContext";
import { borderRadius, shadows } from "../theme/design-tokens";
import { FavoriteButton } from "../components/ui/FavoriteButton";
import PaywallModal from "../components/premium/PaywallModal";
import { CreditUpgradeModal } from "../components/modals/CreditUpgradeModal";
import { RecipeQAModal } from "../components/modals/RecipeQAModal";
import { usePremium } from "../contexts/PremiumContext";
import { useToast } from "../contexts/ToastContext";
import { useHaptics } from "../hooks/useHaptics";

// Services
import { OpenAIService } from "../services/openaiService";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

// Ortak route.params tipi tanımı
type RecipeDetailParams = {
  recipeId: string;
  recipeName: string;
  recipe?: Recipe;
  isAiGenerated?: boolean;
};

type RecipeDetailScreenProps = {
  navigation:
    | StackNavigationProp<HomeStackParamList, "RecipeDetail">
    | StackNavigationProp<FavoritesStackParamList, "RecipeDetail">;
  route: RouteProp<{ RecipeDetail: RecipeDetailParams }, "RecipeDetail">;
};

const RecipeDetailScreen: React.FC<RecipeDetailScreenProps> = ({
  navigation,
  route,
}) => {
  // Tip güvenliği için route.params'ı kontrol ediyoruz
  const recipeId = route.params.recipeId;
  const recipeName = route.params.recipeName;
  const recipe = route.params.recipe as Recipe;
  const isAiGenerated = route.params.isAiGenerated || false;
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showQAModal, setShowQAModal] = useState(false);
  const [showCreditUpgrade, setShowCreditUpgrade] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [creditModalTrigger, setCreditModalTrigger] = useState<"ai_limit" | "general">("general");
  const [activeTab, setActiveTab] = useState<
    "ingredients" | "instructions" | "nutrition"
  >("ingredients");
  const [servingSize, setServingSize] = useState(recipe.servings || 4);

  const { colors, spacing } = useTheme();
  const { userCredits, canAfford, deductCredits } = useCreditContext();
  usePremium();
  const { showSuccess, showError } = useToast();
  const haptics = useHaptics();

  const scrollY = useRef(new Animated.Value(0)).current;
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const imageScale = scrollY.interpolate({
    inputRange: [-100, 0],
    outputRange: [1.2, 1],
    extrapolate: "clamp",
  });

  // Beslenme bilgisi (nutrition) verileri
  const nutritionData = [
    {
      label: "Kalori",
      value: "250",
      unit: "kcal",
      color: colors.semantic.error,
    },
    { label: "Protein", value: "15", unit: "g", color: colors.primary[500] },
    {
      label: "Karbonhidrat",
      value: "30",
      unit: "g",
      color: colors.semantic.warning,
    },
    { label: "Yağ", value: "10", unit: "g", color: colors.secondary[500] },
  ];

  const calculateScaledAmount = (
    originalAmount: string,
    originalServings: number
  ) => {
    const match = originalAmount.match(/(\d+(?:\.\d+)?)/);
    if (match) {
      const amount = parseFloat(match[1]);
      const scaledAmount = (amount * servingSize) / originalServings;
      return originalAmount.replace(match[1], scaledAmount.toString());
    }
    return originalAmount;
  };

  const shareRecipe = async () => {
    try {
      await Share.share({
        message: `${recipe.name}\n\nMalzemeler:\n${recipe.ingredients?.join(
          "\n"
        )}\n\nHazırlık:\n${recipe.instructions?.join(
          "\n\n"
        )}\n\nYemek Bulucu ile paylaşıldı 🍽️`,
        title: recipe.name,
      });
    } catch (error) {
      Logger.error("Share failed:", error);
    }
  };

  const startCooking = () => {
    setCurrentStep(0);
    haptics.notificationSuccess();
    showSuccess("Pişirme başladı! 👨‍🍳");
  };

  const nextStep = () => {
    if (currentStep < (recipe.instructions?.length || 0) - 1) {
      setCurrentStep(currentStep + 1);
      haptics.lightImpact();
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      haptics.lightImpact();
    }
  };

  const playStepAudio = async () => {
    if (!recipe.instructions?.[currentStep]) return;

    setIsPlaying(true);
    try {
      await SpeechService.speak(recipe.instructions[currentStep], {
        language: "tr-TR",
      });
    } catch (error) {
      Logger.error("Speech failed:", error);
    } finally {
      setIsPlaying(false);
    }
  };

  const handleQAOpen = () => {
    if (!canAfford("recipe_qa")) {
      setShowCreditUpgrade(true);
      return;
    }
    setShowQAModal(true);
  };

  const handleAskQuestion = async (question: string): Promise<string> => {
    try {
      if (!canAfford("recipe_qa")) {
        throw new Error("Yetersiz kredi");
      }

      // Krediyi düşür
      await deductCredits("recipe_qa");

      // OpenAI'a soru sor
      const answer = await OpenAIService.askRecipeQuestion(recipe, question);
      
      showSuccess("🤖 AI cevabı hazır!");
      return answer;
    } catch (error) {
      Logger.error("Recipe Q&A failed:", error);
      showError("Soru yanıtlanırken hata oluştu");
      throw error;
    }
  };

  const TabButton = ({
    id,
    title,
    isActive,
    onPress,
  }: {
    id: string;
    title: string;
    isActive: boolean;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      style={[
        styles.tabButton,
        {
          backgroundColor: isActive ? colors.primary[500] : "transparent",
          borderColor: colors.primary[500],
        },
      ]}
      onPress={onPress}
    >
      <Text
        variant="labelMedium"
        weight="600"
        style={{ color: isActive ? "white" : colors.primary[500] }}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );

  const renderIngredients = () => (
    <View style={styles.contentSection}>
      <View style={styles.servingSizeContainer}>
        <Text variant="labelLarge" weight="600">
          Porsiyon Boyutu
        </Text>
        <View style={styles.servingSizeControls}>
          <TouchableOpacity
            style={[
              styles.servingButton,
              { backgroundColor: colors.primary[100] },
            ]}
            onPress={() => servingSize > 1 && setServingSize(servingSize - 1)}
          >
            <Ionicons name="remove" size={20} color={colors.primary[600]} />
          </TouchableOpacity>

          <View
            style={[styles.servingDisplay, { backgroundColor: colors.surface }]}
          >
            <Text
              variant="headlineSmall"
              weight="700"
              style={{ color: colors.primary[600] }}
            >
              {servingSize}
            </Text>
            <Text variant="labelSmall" color="secondary">
              kişi
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.servingButton,
              { backgroundColor: colors.primary[100] },
            ]}
            onPress={() => setServingSize(servingSize + 1)}
          >
            <Ionicons name="add" size={20} color={colors.primary[600]} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.ingredientsList}>
        {recipe.ingredients?.map((ingredient: string, index: number) => (
          <View
            key={index}
            style={[styles.ingredientItem, { backgroundColor: colors.surface }]}
          >
            <View
              style={[
                styles.ingredientNumber,
                { backgroundColor: colors.primary[100] },
              ]}
            >
              <Text
                variant="labelMedium"
                weight="600"
                style={{ color: colors.primary[600] }}
              >
                {index + 1}
              </Text>
            </View>
            <Text variant="bodyMedium" style={{ flex: 1 }}>
              {calculateScaledAmount(ingredient, recipe.servings || 4)}
            </Text>
            <View
              style={[
                styles.ingredientCheck,
                { borderColor: colors.primary[300] },
              ]}
            >
              <Ionicons
                name="checkmark"
                size={16}
                color={colors.primary[500]}
              />
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  const renderInstructions = () => (
    <View style={styles.contentSection}>
      <View style={styles.cookingModeHeader}>
        <Text variant="headlineSmall" weight="600">
          Pişirme Adımları
        </Text>
        <View style={styles.cookingControls}>
          <TouchableOpacity
            style={[
              styles.controlButton,
              { backgroundColor: colors.primary[100] },
            ]}
            onPress={playStepAudio}
            disabled={isPlaying}
          >
            {isPlaying ? (
              <ActivityIndicator size="small" color={colors.primary[600]} />
            ) : (
              <Ionicons
                name="volume-high"
                size={20}
                color={colors.primary[600]}
              />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.stepCard, { backgroundColor: colors.surface }]}>
        <View style={styles.stepHeader}>
          <View
            style={[
              styles.stepNumber,
              { backgroundColor: colors.primary[500] },
            ]}
          >
            <Text
              variant="headlineSmall"
              weight="700"
              style={{ color: "white" }}
            >
              {currentStep + 1}
            </Text>
          </View>
          <Text variant="labelMedium" color="secondary">
            {recipe.instructions?.length || 0} adımdan {currentStep + 1}.
          </Text>
        </View>

        <Text
          variant="bodyLarge"
          style={{ lineHeight: 28, marginVertical: spacing.lg }}
        >
          {recipe.instructions?.[currentStep]}
        </Text>

        <View style={styles.stepNavigation}>
          <TouchableOpacity
            style={[
              styles.stepNavButton,
              {
                backgroundColor:
                  currentStep === 0
                    ? colors.neutral[200]
                    : colors.secondary[100],
                opacity: currentStep === 0 ? 0.5 : 1,
              },
            ]}
            onPress={previousStep}
            disabled={currentStep === 0}
          >
            <Ionicons
              name="chevron-back"
              size={20}
              color={
                currentStep === 0 ? colors.neutral[400] : colors.secondary[600]
              }
            />
            <Text
              variant="labelMedium"
              weight="600"
              style={{
                color:
                  currentStep === 0
                    ? colors.neutral[400]
                    : colors.secondary[600],
              }}
            >
              Önceki
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.stepNavButton,
              {
                backgroundColor:
                  currentStep === (recipe.instructions?.length || 0) - 1
                    ? colors.semantic.success + "20"
                    : colors.primary[100],
              },
            ]}
            onPress={nextStep}
            disabled={currentStep === (recipe.instructions?.length || 0) - 1}
          >
            <Text
              variant="labelMedium"
              weight="600"
              style={{
                color:
                  currentStep === (recipe.instructions?.length || 0) - 1
                    ? colors.semantic.success
                    : colors.primary[600],
              }}
            >
              {currentStep === (recipe.instructions?.length || 0) - 1
                ? "Tamamlandı"
                : "Sonraki"}
            </Text>
            {currentStep < (recipe.instructions?.length || 0) - 1 && (
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.primary[600]}
              />
            )}
            {currentStep === (recipe.instructions?.length || 0) - 1 && (
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={colors.semantic.success}
              />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {currentStep === 0 && (
        <Button
          variant="primary"
          size="lg"
          onPress={startCooking}
          fullWidth
          leftIcon={<Ionicons name="play" size={20} color="white" />}
          style={{ marginTop: spacing.lg }}
        >
          Pişirmeye Başla
        </Button>
      )}
    </View>
  );

  const renderNutrition = () => (
    <View style={styles.contentSection}>
      <Text
        variant="headlineSmall"
        weight="600"
        style={{ marginBottom: spacing.lg }}
      >
        Besin Değerleri (1 Porsiyon)
      </Text>

      <View style={styles.nutritionGrid}>
        {nutritionData.map((item, index) => (
          <View
            key={index}
            style={[styles.nutritionCard, { backgroundColor: colors.surface }]}
          >
            <View
              style={[
                styles.nutritionIcon,
                { backgroundColor: item.color + "20" },
              ]}
            >
              <View
                style={[styles.nutritionDot, { backgroundColor: item.color }]}
              />
            </View>
            <Text
              variant="headlineMedium"
              weight="700"
              style={{ color: item.color }}
            >
              {item.value}
            </Text>
            <Text variant="labelSmall" style={{ color: item.color }}>
              {item.unit}
            </Text>
            <Text variant="labelMedium" weight="500" color="secondary">
              {item.label}
            </Text>
          </View>
        ))}
      </View>

      <View
        style={[styles.nutritionTips, { backgroundColor: colors.primary[50] }]}
      >
        <Ionicons
          name="information-circle"
          size={20}
          color={colors.primary[500]}
        />
        <Text
          variant="bodySmall"
          color="secondary"
          style={{ flex: 1, lineHeight: 20 }}
        >
          Besin değerleri yaklaşık değerlerdir ve kullanılan malzemelere göre
          değişebilir.
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBar barStyle="light-content" />

      {/* Floating Header */}
      <Animated.View
        style={[
          styles.floatingHeader,
          { opacity: headerOpacity, backgroundColor: colors.background },
        ]}
      >
        <TouchableOpacity
          style={[styles.headerButton, { backgroundColor: colors.surface }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>

        <Text
          variant="headlineSmall"
          weight="600"
          numberOfLines={1}
          style={{ flex: 1, marginHorizontal: spacing.md }}
        >
          {recipe.name}
        </Text>

        <TouchableOpacity
          style={[styles.headerButton, { backgroundColor: colors.surface }]}
          onPress={shareRecipe}
        >
          <Ionicons
            name="share-outline"
            size={24}
            color={colors.text.primary}
          />
        </TouchableOpacity>
      </Animated.View>

      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
        nestedScrollEnabled={true}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {/* Hero Image */}
        <Animated.View
          style={[styles.heroImage, { transform: [{ scale: imageScale }] }]}
        >
          <LinearGradient
            colors={[
              colors.primary[400],
              colors.primary[600],
              colors.secondary[500],
            ]}
            style={styles.imageGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="restaurant" size={80} color="white" />
          </LinearGradient>

          {/* Overlay Controls */}
          <View style={styles.imageOverlay}>
            <TouchableOpacity
              style={[
                styles.overlayButton,
                { backgroundColor: "rgba(0,0,0,0.3)" },
              ]}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>

            <View style={styles.overlayActions}>
              <TouchableOpacity
                style={[
                  styles.overlayButton,
                  { backgroundColor: "rgba(0,0,0,0.3)" },
                ]}
                onPress={shareRecipe}
              >
                <Ionicons name="share-outline" size={24} color="white" />
              </TouchableOpacity>

              <FavoriteButton
                recipe={recipe}
                size="large"
                style={{ backgroundColor: "rgba(0,0,0,0.3)" }}
              />
            </View>
          </View>
        </Animated.View>

        {/* Recipe Info */}
        <View style={styles.recipeInfo}>
          <View style={styles.recipeHeader}>
            <View style={styles.recipeTitleContainer}>
              <Text variant="displaySmall" weight="700">
                {recipe.name}
              </Text>

              {recipe.difficulty && (
                <View
                  style={[
                    styles.difficultyBadge,
                    {
                      backgroundColor:
                        recipe.difficulty === "kolay"
                          ? colors.semantic.success + "20"
                          : recipe.difficulty === "orta"
                          ? colors.semantic.warning + "20"
                          : colors.semantic.error + "20",
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      recipe.difficulty === "kolay"
                        ? "checkmark-circle"
                        : recipe.difficulty === "orta"
                        ? "pause-circle"
                        : "alert-circle"
                    }
                    size={16}
                    color={
                      recipe.difficulty === "kolay"
                        ? colors.semantic.success
                        : recipe.difficulty === "orta"
                        ? colors.semantic.warning
                        : colors.semantic.error
                    }
                  />
                  <Text
                    variant="labelMedium"
                    weight="600"
                    style={{
                      color:
                        recipe.difficulty === "kolay"
                          ? colors.semantic.success
                          : recipe.difficulty === "orta"
                          ? colors.semantic.warning
                          : colors.semantic.error,
                    }}
                  >
                    {recipe.difficulty}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View
              style={[styles.statCard, { backgroundColor: colors.primary[50] }]}
            >
              <Ionicons name="time" size={20} color={colors.primary[500]} />
              <Text
                variant="labelLarge"
                weight="600"
                style={{ color: colors.primary[600] }}
              >
                {recipe.cookingTime || "30"}dk
              </Text>
              <Text variant="labelSmall" color="secondary">
                Süre
              </Text>
            </View>

            <View
              style={[
                styles.statCard,
                { backgroundColor: colors.secondary[50] },
              ]}
            >
              <Ionicons name="people" size={20} color={colors.secondary[500]} />
              <Text
                variant="labelLarge"
                weight="600"
                style={{ color: colors.secondary[600] }}
              >
                {servingSize} kişi
              </Text>
              <Text variant="labelSmall" color="secondary">
                Porsiyon
              </Text>
            </View>

            <View
              style={[
                styles.statCard,
                { backgroundColor: colors.semantic.warning + "20" },
              ]}
            >
              <Ionicons
                name="restaurant"
                size={20}
                color={colors.semantic.warning}
              />
              <Text
                variant="labelLarge"
                weight="600"
                style={{ color: colors.semantic.warning }}
              >
                {recipe.ingredients?.length || 0}
              </Text>
              <Text variant="labelSmall" color="secondary">
                Malzeme
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <Button
              variant="primary"
              size="lg"
              onPress={handleQAOpen}
              leftIcon={
                <Ionicons name="chatbubble-ellipses" size={20} color="white" />
              }
              style={{ flex: 1 }}
            >
              AI Soru-Cevap
            </Button>

            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: colors.surface }]}
              onPress={shareRecipe}
            >
              <Ionicons
                name="share-outline"
                size={24}
                color={colors.text.primary}
              />
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={styles.tabContainer}>
            <TabButton
              id="ingredients"
              title="Malzemeler"
              isActive={activeTab === "ingredients"}
              onPress={() => setActiveTab("ingredients")}
            />
            <TabButton
              id="instructions"
              title="Tarif"
              isActive={activeTab === "instructions"}
              onPress={() => setActiveTab("instructions")}
            />
            <TabButton
              id="nutrition"
              title="Besin Değeri"
              isActive={activeTab === "nutrition"}
              onPress={() => setActiveTab("nutrition")}
            />
          </View>

          {/* Tab Content */}
          {activeTab === "ingredients" && renderIngredients()}
          {activeTab === "instructions" && renderInstructions()}
          {activeTab === "nutrition" && renderNutrition()}

          {/* Bottom Spacing */}
          <View style={{ height: spacing.xxxl }} />
        </View>
      </Animated.ScrollView>

      {/* Modals */}
      <PaywallModal visible={false} onClose={() => {}} feature="general" />

      {showCreditUpgrade && (
        <CreditUpgradeModal
          visible={showCreditUpgrade}
          onClose={() => setShowCreditUpgrade(false)}
          onPurchaseCredits={() => Promise.resolve()}
          onUpgradePremium={() => Promise.resolve()}
          trigger="general"
          userId="user123"
        />
      )}

      {showQAModal && (
        <RecipeQAModal
          visible={showQAModal}
          onClose={() => setShowQAModal(false)}
          recipe={recipe}
          onAskQuestion={handleAskQuestion}
          onUpgradeRequired={() => {
            setCreditModalTrigger("ai_limit");
            setShowCreditModal(true);
          }}
          canUseQA={canAfford("recipe_qa")}
          creditsRemaining={userCredits?.remainingCredits}
        />
      )}

      {showCreditModal && (
        <CreditUpgradeModal
          visible={showCreditModal}
          onClose={() => setShowCreditModal(false)}
          trigger={creditModalTrigger}
          userId={userCredits?.userId || "anonymous"}
          onPurchaseCredits={async (packageId: string) => {
            // Credit purchase logic would go here
            console.log('Purchasing credits:', packageId);
          }}
          onUpgradePremium={async (tierId: string, yearly?: boolean) => {
            // Premium upgrade logic would go here
            console.log('Upgrading to premium:', tierId, yearly);
          }}
        />
      )}
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
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },

  // Floating Header
  floatingHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingTop: StatusBar.currentHeight || 44,
    paddingBottom: spacing.md,
    zIndex: 100,
    ...shadows.md,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.sm,
  },

  // Hero Image
  heroImage: {
    height: screenHeight * 0.4,
    position: "relative",
  },
  imageGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  imageOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: spacing.md,
    paddingTop: (StatusBar.currentHeight || 44) + spacing.md,
  },
  overlayButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  overlayActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },

  // Recipe Info
  recipeInfo: {
    flex: 1,
    backgroundColor: colors.light.background,
    borderTopLeftRadius: borderRadius.md,
    borderTopRightRadius: borderRadius.md,
    marginTop: -spacing.lg,
    paddingHorizontal: spacing.component.section.paddingX,
    paddingTop: spacing.xl,
  },
  recipeHeader: {
    marginBottom: spacing.lg,
  },
  recipeTitleContainer: {
    gap: spacing.sm,
  },
  difficultyBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },

  // Stats Row
  statsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    gap: spacing.xs,
  },

  // Action Buttons
  actionButtons: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  iconButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.sm,
  },

  // Tabs
  tabContainer: {
    flexDirection: "row",
    backgroundColor: colors.light.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xs,
    marginBottom: spacing.xl,
    ...shadows.sm,
  },
  tabButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.base,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },

  // Content Section
  contentSection: {
    gap: spacing.lg,
  },

  // Serving Size
  servingSizeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  servingSizeControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  servingButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  servingDisplay: {
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.base,
    minWidth: 60,
    ...shadows.sm,
  },

  // Ingredients
  ingredientsList: {
    gap: spacing.sm,
  },
  ingredientItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderRadius: borderRadius.base,
    gap: spacing.sm,
    ...shadows.sm,
  },
  ingredientNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  ingredientCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },

  // Cooking Mode
  cookingModeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cookingControls: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  stepCard: {
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  stepNumber: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNavigation: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  stepNavButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    borderRadius: borderRadius.base,
    gap: spacing.xs,
  },

  // Nutrition
  nutritionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  nutritionCard: {
    width:
      (screenWidth - spacing.component.section.paddingX * 2 - spacing.sm) / 2,
    alignItems: "center",
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  nutritionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  nutritionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  nutritionTips: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: spacing.md,
    borderRadius: borderRadius.base,
    gap: spacing.sm,
  },
});

export default RecipeDetailScreen;
