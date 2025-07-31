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
import { HomeStackParamList } from "../../App";
import { SpeechService } from "../services/speechService";
import { Ionicons } from "@expo/vector-icons";

// New UI Components
import { Button, Card, Input, Text } from "../components/ui";
import { colors, spacing, borderRadius, shadows } from "../theme/design-tokens";

type HomeScreenProps = {
  navigation: StackNavigationProp<HomeStackParamList, "HomeMain">;
};

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [ingredients, setIngredients] = useState<string>("");
  const [ingredientsList, setIngredientsList] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const addIngredient = () => {
    const trimmedIngredient = ingredients.trim();
    if (trimmedIngredient && !ingredientsList.includes(trimmedIngredient)) {
      setIngredientsList([...ingredientsList, trimmedIngredient]);
      setIngredients("");
    }
  };

  const removeIngredient = (ingredient: string) => {
    setIngredientsList(ingredientsList.filter((item) => item !== ingredient));
  };

  const clearIngredients = () => {
    setIngredientsList([]);
  };

  const handleSpeechInput = async () => {
    if (isListening) return;

    setIsListening(true);
    try {
      SpeechService.speak("Malzemelerinizi söyleyin");
      const spokenIngredients = await SpeechService.speechToText();

      if (spokenIngredients.length > 0) {
        const newIngredients = spokenIngredients.filter(
          (ingredient) => !ingredientsList.includes(ingredient)
        );
        setIngredientsList([...ingredientsList, ...newIngredients]);
        SpeechService.speak(`${newIngredients.join(", ")} malzemeleri eklendi`);
      } else {
        Alert.alert("Uyarı", "Hiçbir malzeme algılanmadı. Tekrar deneyin.");
      }
    } catch (error) {
      Alert.alert("Hata", "Sesli giriş sırasında bir hata oluştu.");
    } finally {
      setIsListening(false);
    }
  };

  const searchRecipes = () => {
    if (ingredientsList.length === 0) {
      Alert.alert("Uyarı", "Lütfen en az bir malzeme girin.");
      return;
    }

    navigation.navigate("RecipeResults", { ingredients: ingredientsList });
  };

  const renderIngredientChip = (ingredient: string, index: number) => (
    <TouchableOpacity
      key={index}
      style={styles.ingredientChip}
      onPress={() => removeIngredient(ingredient)}
      activeOpacity={0.7}
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
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <Card variant="elevated" size="lg" style={styles.heroCard}>
          <View style={styles.heroContent}>
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
            >
              Evdeki Malzemelerle
            </Text>
            <Text variant="h4" color="accent" align="center" weight="medium">
              Neler Yapabilirsin?
            </Text>

            <Text
              variant="body"
              color="secondary"
              align="center"
              style={styles.heroSubtitle}
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
              leftIcon={
                isLoading ? (
                  <ActivityIndicator size="small" color={colors.neutral[0]} />
                ) : (
                  <Ionicons name="search" size={20} />
                )
              }
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
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
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

export default HomeScreen;
