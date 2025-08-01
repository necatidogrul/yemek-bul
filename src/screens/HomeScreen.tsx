import React, { useState } from "react";
import {
  View,
  ScrollView,
  Alert,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { StackNavigationProp } from "@react-navigation/stack";
import { HomeStackParamList } from "../components/navigation/ThemedNavigators";
import { SpeechService } from "../services/speechService";
import { Ionicons } from "@expo/vector-icons";

// New UI Components
import { Button, Card, Input, Text } from "../components/ui";
import { spacing, borderRadius, shadows, getColors } from "../theme/design-tokens";
import { useThemedStyles } from "../hooks/useThemedStyles";
import PaywallModal from "../components/premium/PaywallModal";
import { usePremiumGuard } from "../hooks/usePremiumGuard";
import { usePremium } from "../contexts/PremiumContext";
import { useToast } from "../contexts/ToastContext";
import RevenueCatDebug from "../components/debug/RevenueCatDebug";
import { ThemeToggle } from "../components/theme/ThemeToggle";
import { useHaptics } from "../hooks/useHaptics";
import { useAccessibility } from "../hooks/useAccessibility";

type HomeScreenProps = {
  navigation: StackNavigationProp<HomeStackParamList, "HomeMain">;
};

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [ingredients, setIngredients] = useState<string>("");
  const [ingredientsList, setIngredientsList] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  const { colors } = useThemedStyles();
  const { isPremium } = usePremium();
  const { showSuccess, showError, showWarning, showInfo } = useToast();
  const haptics = useHaptics();
  const { announceForAccessibility, generateHint } = useAccessibility();
  const {
    showPaywall,
    currentFeature,
    paywallTitle,
    paywallDescription,
    checkSearchLimit,
    hidePaywall,
    incrementSearch,
  } = usePremiumGuard();

  const addIngredient = () => {
    const trimmedIngredient = ingredients.trim();
    if (trimmedIngredient && !ingredientsList.includes(trimmedIngredient)) {
      setIngredientsList([...ingredientsList, trimmedIngredient]);
      setIngredients("");
      showSuccess("Malzeme Eklendi", `${trimmedIngredient} listene eklendi`);
      // Accessibility announcement
      announceForAccessibility(`${trimmedIngredient} malzeme listesine eklendi`);
    } else if (ingredientsList.includes(trimmedIngredient)) {
      showWarning("Zaten Ekli", "Bu malzeme zaten listende mevcut");
      announceForAccessibility("Bu malzeme zaten listede mevcut");
    }
  };

  const removeIngredient = async (ingredient: string) => {
    setIngredientsList(ingredientsList.filter((item) => item !== ingredient));
    showInfo("Malzeme Çıkarıldı", `${ingredient} listeden çıkarıldı`);
    // Accessibility announcement
    announceForAccessibility(`${ingredient} listeden çıkarıldı`);
    // Light haptic feedback for removal  
    await haptics.selection();
  };

  const clearIngredients = () => {
    if (ingredientsList.length > 0) {
      setIngredientsList([]);
      showInfo("Liste Temizlendi", "Tüm malzemeler listeden çıkarıldı");
    }
  };

  const handleSpeechInput = async () => {
    if (isListening) return;

    setIsListening(true);
    // Haptic feedback for voice start
    await haptics.voiceStart();
    
    try {
      SpeechService.speak("Malzemelerinizi söyleyin");
      const spokenIngredients = await SpeechService.speechToText();

      if (spokenIngredients.length > 0) {
        const newIngredients = spokenIngredients.filter(
          (ingredient) => !ingredientsList.includes(ingredient)
        );
        setIngredientsList([...ingredientsList, ...newIngredients]);
        SpeechService.speak(`${newIngredients.join(", ")} malzemeleri eklendi`);
        showSuccess("Sesli Giriş Başarılı", `${newIngredients.length} malzeme eklendi`);
        // Success haptic feedback
        await haptics.voiceSuccess();
      } else {
        showWarning("Malzeme Algılanamadı", "Hiçbir malzeme algılanmadı. Tekrar deneyin.");
        // Warning haptic feedback
        await haptics.warning();
      }
    } catch (error) {
      showError("Sesli Giriş Hatası", "Sesli giriş sırasında bir hata oluştu.");
      // Error haptic feedback
      await haptics.voiceError();
    } finally {
      // Voice stop haptic feedback
      await haptics.voiceStop();
      setIsListening(false);
    }
  };

  const searchRecipes = async () => {
    if (ingredientsList.length === 0) {
      showWarning("Malzeme Gerekli", "Lütfen en az bir malzeme girin.");
      await haptics.warning();
      return;
    }

    // Check search limit for free users
    const canSearch = await checkSearchLimit();
    if (!canSearch) {
      return; // Paywall will be shown automatically
    }

    // Haptic feedback for search start
    await haptics.searchStart();

    // Increment search count for tracking
    await incrementSearch();
    
    navigation.navigate("RecipeResults", { ingredients: ingredientsList });
  };

  const renderIngredientChip = (ingredient: string, index: number) => (
    <TouchableOpacity
      key={index}
      style={styles.ingredientChip}
      onPress={() => removeIngredient(ingredient)}
      activeOpacity={0.7}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`${ingredient} malzemesi`}
      accessibilityHint={generateHint('remove_ingredient', 'Malzemeyi listeden çıkarmak için')}
      testID={`ingredient-chip-${ingredient.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <Text variant="bodySmall" color="accent" weight="medium">
        {ingredient}
      </Text>
      <Ionicons
        name="close-circle"
        size={18}
        color={colors.primary[400]}
        style={{ marginLeft: spacing[1] }}
      />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView 
      style={styles.container} 
      nativeID="home-screen"
      accessible={false} // Let child elements handle accessibility
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        accessibilityLabel="Ana sayfa içeriği"
        accessibilityHint="Malzeme eklemek ve yemek tarifleri aramak için aşağı kaydırın"
      >
        {/* Hero Section */}
        <Card variant="elevated" size="lg" style={styles.heroCard}>
          <View 
            style={styles.heroContent}
            accessible={true}
            accessibilityRole="header"
            accessibilityLabel="Yemek Bulucu Ana Başlık"
          >
            <View style={styles.heroIcon}>
              <Ionicons
                name="restaurant"
                size={32}
                color={colors.primary[500]}
              />
            </View>

            <Text
              variant="h3"
              align="center"
              weight="bold"
              style={styles.heroTitle}
              accessibilityHeading={true}
              accessibilityRole="header"
            >
              Evdeki Malzemelerle
            </Text>
            <Text 
              variant="h4" 
              color="accent" 
              align="center" 
              weight="medium"
              accessibilityHeading={true}
            >
              Neler Yapabilirsin?
            </Text>

            <Text
              variant="body"
              color="secondary"
              align="center"
              style={styles.heroSubtitle}
              accessibilityLabel="Malzemelerinizi girin, size özel yemek tarifleri keşfedin"
            >
              Malzemelerinizi girin, size özel yemek tarifleri keşfedin
            </Text>
          </View>
        </Card>

        {/* Input Section */}
        <Card variant="default" size="lg" style={styles.inputCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="add-circle" size={20} color={colors.primary[500]} />
            <Text variant="bodyLarge" weight="semibold">
              Malzemelerinizi Ekleyin
            </Text>
          </View>

          <Input
            placeholder="Örn: domates, soğan, peynir..."
            value={ingredients}
            onChangeText={setIngredients}
            variant="filled"
            size="lg"
            onSubmitEditing={addIngredient}
            nativeID="ingredient-input"
            rightIcon={
              <TouchableOpacity
                onPress={addIngredient}
                disabled={!ingredients.trim()}
                style={[
                  styles.addButton,
                  { opacity: ingredients.trim() ? 1 : 0.5 },
                ]}
              >
                <Ionicons name="add" size={20} color={colors.primary[500]} />
              </TouchableOpacity>
            }
            style={styles.input}
          />

          <Button
            variant={isListening ? "primary" : "outline"}
            size="lg"
            onPress={handleSpeechInput}
            disabled={isListening}
            fullWidth
            leftIcon={
              isListening ? (
                <ActivityIndicator size="small" color={colors.neutral[0]} />
              ) : (
                <Ionicons name="mic" size={20} />
              )
            }
            style={styles.voiceButton}
            accessibilityLabel={isListening ? "Sesli giriş dinleniyor" : "Sesli malzeme girişi"}
            accessibilityHint={generateHint('start_voice_input', 'Malzemelerinizi sesli olarak söyleyebilirsiniz')}
            accessibilityState={{ busy: isListening, disabled: isListening }}
            testID="voice-input-button"
          >
            {isListening ? "Dinleniyor..." : "🎤 Sesli Giriş"}
          </Button>
        </Card>

        {/* Ingredients List */}
        {ingredientsList.length > 0 && (
          <Card variant="default" size="lg" style={styles.ingredientsCard}>
            <View style={styles.ingredientsHeader}>
              <View style={styles.sectionHeader}>
                <Ionicons name="list" size={20} color={colors.success[500]} />
                <Text variant="bodyLarge" weight="semibold">
                  Malzemeleriniz
                </Text>
                <View style={styles.badge}>
                  <Text variant="caption" color="success" weight="semibold">
                    {ingredientsList.length}
                  </Text>
                </View>
              </View>

              <Button
                variant="ghost"
                size="sm"
                onPress={clearIngredients}
                style={styles.clearButton}
              >
                <Text variant="bodySmall" color="destructive">
                  Temizle
                </Text>
              </Button>
            </View>

            <View style={styles.ingredientsContainer}>
              {ingredientsList.map((ingredient, index) =>
                renderIngredientChip(ingredient, index)
              )}
            </View>

            <View style={styles.divider} />

            <Button
              variant="primary"
              size="lg"
              onPress={searchRecipes}
              disabled={isLoading}
              fullWidth
              nativeID="search-recipes-button"
              leftIcon={
                isLoading ? (
                  <ActivityIndicator size="small" color={colors.neutral[0]} />
                ) : (
                  <Ionicons name="search" size={20} />
                )
              }
              accessibilityLabel={isLoading ? "Yemek tarifleri aranıyor" : "Yemek tariflerini ara"}
              accessibilityHint={generateHint('search_recipes', `${ingredientsList.length} malzeme ile yemek tarifleri bulunacak`)}
              accessibilityState={{ busy: isLoading, disabled: isLoading }}
              testID="search-recipes-button"
            >
              {isLoading ? "Aranıyor..." : "🍽️ Yemek Önerilerini Görüntüle"}
            </Button>
          </Card>
        )}

        {/* Browse All Recipes Section */}
        <Card variant="default" size="lg" style={styles.browseCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="library" size={20} color={colors.secondary[500]} />
            <Text variant="bodyLarge" weight="semibold">
              Tüm Yemekleri Keşfet
            </Text>
          </View>

          <Text variant="body" color="secondary" style={styles.browseSubtitle}>
            Bütün tarif koleksiyonumuza göz atın ve aradığınızı bulun
          </Text>

          <Button
            variant="outline"
            size="lg"
            onPress={() => navigation.navigate("AllRecipes")}
            fullWidth
            leftIcon={<Ionicons name="library-outline" size={20} />}
            style={styles.browseButton}
            nativeID="random-recipe-button"
          >
            📚 Tüm Yemekleri Görüntüle
          </Button>
        </Card>

        {/* Tips Section */}
        <Card variant="filled" size="lg" style={styles.tipsCard}>
          <View style={styles.sectionHeader}>
            <Ionicons name="bulb" size={20} color={colors.warning[500]} />
            <Text variant="bodyLarge" weight="semibold">
              Kullanım İpuçları
            </Text>
          </View>

          <View style={styles.tipsContainer}>
            {[
              {
                icon: "checkmark-circle",
                text: "Evdeki mevcut malzemelerinizi tek tek girin",
                color: colors.success[500],
              },
              {
                icon: "mic",
                text: "Sesli giriş için mikrofon butonunu kullanın",
                color: colors.primary[500],
              },
              {
                icon: "add-circle",
                text: "Eksik 1-2 malzeme ile yapılabilecek tarifleri de gösteriyoruz",
                color: colors.warning[500],
              },
              {
                icon: "star",
                text: "En çok eşleşen tarifler üstte görünür",
                color: colors.secondary[500],
              },
            ].map((tip, index) => (
              <View key={index} style={styles.tipItem}>
                <Ionicons name={tip.icon as any} size={16} color={tip.color} />
                <Text
                  variant="bodySmall"
                  color="secondary"
                  style={styles.tipText}
                >
                  {tip.text}
                </Text>
              </View>
            ))}
          </View>
        </Card>
        
        {/* Debug Panel (Development Only) */}
        <RevenueCatDebug />
        
        {/* Dark Mode Toggle (Development Only) */}
        {__DEV__ && <ThemeToggle />}
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

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[4],
    paddingBottom: spacing[8],
  },

  // Hero Section
  heroCard: {
    marginBottom: spacing[6],
  },
  heroContent: {
    alignItems: "center",
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary[50],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[4],
  },
  heroTitle: {
    marginBottom: spacing[1],
  },
  heroSubtitle: {
    marginTop: spacing[3],
    maxWidth: 280,
  },

  // Input Section
  inputCard: {
    marginBottom: spacing[6],
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing[4],
    gap: spacing[2],
  },
  input: {
    marginBottom: spacing[4],
  },
  addButton: {
    padding: spacing[1],
  },
  voiceButton: {
    marginTop: spacing[2],
  },

  // Ingredients Section
  ingredientsCard: {
    marginBottom: spacing[6],
  },
  ingredientsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing[4],
  },
  badge: {
    backgroundColor: colors.success[100],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
  },
  clearButton: {
    paddingHorizontal: spacing[2],
  },
  ingredientsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  ingredientChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[200],
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.medium,
    marginVertical: spacing[4],
  },

  // Browse Section
  browseCard: {
    marginBottom: spacing[6],
  },
  browseSubtitle: {
    marginBottom: spacing[4],
  },
  browseButton: {
    marginTop: spacing[2],
  },

  // Tips Section
  tipsCard: {
    marginBottom: spacing[4],
  },
  tipsContainer: {
    gap: spacing[3],
  },
  tipItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[3],
  },
  tipText: {
    flex: 1,
    lineHeight: 20,
  },
});

const styles = createStyles(getColors(false)); // Using light theme as default for StyleSheet

export default HomeScreen;
