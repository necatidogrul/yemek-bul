import React, { useState, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  FlatList,
  TouchableOpacity,
  Animated,
  StatusBar,
  Easing,
  ScrollView,
} from "react-native";
import { Logger } from "../services/LoggerService";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Notifications from "expo-notifications";
import { UserPreferencesService } from "../services/UserPreferencesService";

// UI Components
import { Button, Card, Text } from "../components/ui";
import { useTheme } from "../contexts/ThemeContext";
import { useToast } from "../contexts/ToastContext";
import { useHaptics } from "../hooks/useHaptics";

const { width, height } = Dimensions.get("window");

interface OnboardingScreenProps {
  onComplete: () => void;
}

interface OnboardingStep {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  gradient: string[];
  type: "welcome" | "features" | "preferences" | "notifications" | "ready";
  action?: string;
}

interface UserPreferences {
  dietaryRestrictions: string[];
  allergies: string[];
  favoriteCategories: string[];
  cookingLevel: string;
  notifications: boolean;
}

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [preferences, setPreferences] = useState<UserPreferences>({
    dietaryRestrictions: [],
    allergies: [],
    favoriteCategories: [],
    cookingLevel: "",
    notifications: true,
  });

  const { colors } = useTheme();
  const { showSuccess, showError } = useToast();
  const haptics = useHaptics();

  const flatListRef = useRef<FlatList>(null);
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const progressAnimation = useRef(new Animated.Value(0)).current;

  // Modern onboarding steps
  const onboardingSteps: OnboardingStep[] = [
    {
      id: 0,
      title: "Yemek Bulucu'ya\nHoş Geldiniz! 👋",
      subtitle: "AI destekli tarif asistanınız",
      description:
        "Evinizdeki malzemelerle binlerce lezzetli tarif keşfedin. Akıllı öneriler ve kişisel deneyim sizi bekliyor!",
      icon: "restaurant",
      gradient: [colors.primary[400], colors.primary[600]],
      type: "welcome",
    },
    {
      id: 1,
      title: "Özelliklerimizi\nKeşfedin 🚀",
      subtitle: "Güçlü araçlarla kolay pişirme",
      description:
        "AI tarif üretimi, sesli arama, malzeme eşleştirme ve daha fazlası ile mutfak deneyiminizi geliştirin.",
      icon: "sparkles",
      gradient: [colors.secondary[400], colors.secondary[600]],
      type: "features",
    },
    {
      id: 2,
      title: "Tercihlerinizi\nBelirleyin 🍽️",
      subtitle: "Size özel tarif deneyimi",
      description:
        "Beslenme tercihleri, favori mutfaklar ve deneyim seviyenizi seçerek kişisel öneriler alın.",
      icon: "heart",
      gradient: [colors.primary[500], colors.secondary[500]],
      type: "preferences",
    },
    {
      id: 3,
      title: "Bildirimlere\nİzin Verin 🔔",
      subtitle: "Günlük lezzet önerileri",
      description:
        "Yeni tarifler, mevsimlik öneriler ve mutfak ipuçları için bildirim izni verin.",
      icon: "notifications",
      gradient: [colors.semantic.warning, colors.primary[500]],
      type: "notifications",
      action: "Bildirimleri Aç",
    },
    {
      id: 4,
      title: "Her Şey\nHazır! ✨",
      subtitle: "Lezzet yolculuğu başlıyor",
      description:
        "Artık binlerce tarife erişebilir, AI ile yeni lezzetler keşfedebilir ve mutfak ustası olabilirsiniz!",
      icon: "checkmark-circle",
      gradient: [colors.semantic.success, colors.primary[500]],
      type: "ready",
      action: "Başlayalım!",
    },
  ];

  // Preference options
  const dietaryOptions = [
    {
      id: "vegetarian",
      label: "Vejeteryan",
      icon: "🥬",
      color: colors.semantic.success,
    },
    { id: "vegan", label: "Vegan", icon: "🌱", color: colors.semantic.success },
    {
      id: "gluten-free",
      label: "Glutensiz",
      icon: "🌾",
      color: colors.semantic.warning,
    },
    {
      id: "dairy-free",
      label: "Laktoz İnt.",
      icon: "🥛",
      color: colors.secondary[500],
    },
    { id: "keto", label: "Ketojenik", icon: "🥑", color: colors.primary[500] },
    {
      id: "low-carb",
      label: "Az Karbonhidrat",
      icon: "🥩",
      color: colors.semantic.error,
    },
  ];

  const categoryOptions = [
    {
      id: "turkish",
      label: "Türk Mutfağı",
      icon: "🇹🇷",
      color: colors.semantic.error,
    },
    {
      id: "italian",
      label: "İtalyan",
      icon: "🍝",
      color: colors.semantic.success,
    },
    { id: "asian", label: "Asya", icon: "🍜", color: colors.semantic.warning },
    {
      id: "mediterranean",
      label: "Akdeniz",
      icon: "🫒",
      color: colors.primary[500],
    },
    {
      id: "dessert",
      label: "Tatlılar",
      icon: "🍰",
      color: colors.secondary[500],
    },
    {
      id: "healthy",
      label: "Sağlıklı",
      icon: "🥗",
      color: colors.semantic.success,
    },
  ];

  const levelOptions = [
    {
      id: "beginner",
      label: "Yeni Başlayan",
      icon: "🔰",
      description: "Basit ve kolay tarifler",
    },
    {
      id: "intermediate",
      label: "Orta Seviye",
      icon: "👨‍🍳",
      description: "Orta zorlukta lezzetler",
    },
    {
      id: "advanced",
      label: "İleri Seviye",
      icon: "⭐",
      description: "Karmaşık ve özel tarifler",
    },
    {
      id: "expert",
      label: "Uzman",
      icon: "👑",
      description: "Profesyonel seviye",
    },
  ];

  // Animations
  useEffect(() => {
    Animated.timing(progressAnimation, {
      toValue: (currentStep + 1) / onboardingSteps.length,
      duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [currentStep]);

  // Handler functions
  const handleNext = async () => {
    const step = onboardingSteps[currentStep];

    // Handle specific step actions
    if (step.type === "notifications") {
      await requestNotificationPermission();
    }

    if (currentStep < onboardingSteps.length - 1) {
      await haptics.selection();
      setCurrentStep(currentStep + 1);

      // Animate to next slide
      flatListRef.current?.scrollToIndex({
        index: currentStep + 1,
        animated: true,
      });
    } else {
      await completeOnboarding();
    }
  };

  const handleSkip = async () => {
    await haptics.selection();
    completeOnboarding();
  };

  const requestNotificationPermission = async () => {
    if (__DEV__) {
      Logger.info("Notifications disabled in development");
      return;
    }

    try {
      const { status } = await Notifications.requestPermissionsAsync();
      setPreferences((prev) => ({
        ...prev,
        notifications: status === "granted",
      }));

      if (status === "granted") {
        showSuccess("Bildirimler açıldı!");
      }
    } catch (error) {
      Logger.error("Notification permission error:", error);
      showError("Bildirim izni alınamadı");
    }
  };

  const completeOnboarding = async () => {
    try {
      await UserPreferencesService.saveUserPreferences({
        ...preferences,
        onboardingCompleted: true,
      });

      await haptics.success();
      showSuccess("Hoş geldiniz! 🎉");
      onComplete();
    } catch (error) {
      Logger.error("Onboarding completion error:", error);
      onComplete();
    }
  };

  const togglePreference = async (
    category: keyof UserPreferences,
    value: string
  ) => {
    await haptics.selection();

    if (category === "cookingLevel") {
      setPreferences((prev) => ({ ...prev, [category]: value }));
    } else if (Array.isArray(preferences[category])) {
      const currentValues = preferences[category] as string[];
      const newValues = currentValues.includes(value)
        ? currentValues.filter((item) => item !== value)
        : [...currentValues, value];

      setPreferences((prev) => ({ ...prev, [category]: newValues }));
    }
  };

  // Render functions
  const renderFeatureHighlights = () => {
    const features = [
      {
        icon: "search",
        title: "AI Tarif Arama",
        desc: "Malzemelerinizle akıllı eşleştirme",
      },
      {
        icon: "mic",
        title: "Sesli Komutlar",
        desc: "Elleriniz meşgulken sesle arama",
      },
      {
        icon: "heart",
        title: "Kişisel Favoriler",
        desc: "Sevdiklerinizi kaydedin",
      },
      {
        icon: "time",
        title: "Hızlı Tarifler",
        desc: "15-30 dakikada hazır yemekler",
      },
    ];

    return (
      <View style={styles.featuresGrid}>
        {features.map((feature, index) => (
          <View
            key={index}
            style={[styles.featureCard, { backgroundColor: colors.surface }]}
          >
            <View
              style={[
                styles.featureIcon,
                { backgroundColor: colors.primary[100] },
              ]}
            >
              <Ionicons
                name={feature.icon as any}
                size={24}
                color={colors.primary[600]}
              />
            </View>
            <Text variant="labelLarge" weight="600">
              {feature.title}
            </Text>
            <Text variant="labelSmall" color="secondary" align="center">
              {feature.desc}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  const renderPreferences = () => (
    <View style={styles.preferencesContainer}>
      {/* Dietary Restrictions */}
      <View style={styles.preferenceSection}>
        <Text variant="headlineSmall" weight="600" style={{ marginBottom: 16 }}>
          Beslenme Tercihleri
        </Text>
        <View style={styles.optionsGrid}>
          {dietaryOptions.map((option) => {
            const isSelected = preferences.dietaryRestrictions.includes(
              option.id
            );
            return (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionCard,
                  {
                    backgroundColor: isSelected
                      ? option.color + "20"
                      : colors.surface,
                    borderColor: isSelected
                      ? option.color
                      : colors.neutral[300],
                  },
                ]}
                onPress={() =>
                  togglePreference("dietaryRestrictions", option.id)
                }
              >
                <Text variant="headlineLarge">{option.icon}</Text>
                <Text
                  variant="labelMedium"
                  weight="600"
                  style={{
                    color: isSelected ? option.color : colors.text.primary,
                  }}
                >
                  {option.label}
                </Text>
                {isSelected && (
                  <View
                    style={[
                      styles.checkmark,
                      { backgroundColor: option.color },
                    ]}
                  >
                    <Ionicons name="checkmark" size={12} color="white" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Favorite Categories */}
      <View style={styles.preferenceSection}>
        <Text variant="headlineSmall" weight="600" style={{ marginBottom: 16 }}>
          Favori Mutfaklar
        </Text>
        <View style={styles.optionsGrid}>
          {categoryOptions.map((option) => {
            const isSelected = preferences.favoriteCategories.includes(
              option.id
            );
            return (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionCard,
                  {
                    backgroundColor: isSelected
                      ? option.color + "20"
                      : colors.surface,
                    borderColor: isSelected
                      ? option.color
                      : colors.neutral[300],
                  },
                ]}
                onPress={() =>
                  togglePreference("favoriteCategories", option.id)
                }
              >
                <Text variant="headlineLarge">{option.icon}</Text>
                <Text
                  variant="labelMedium"
                  weight="600"
                  style={{
                    color: isSelected ? option.color : colors.text.primary,
                  }}
                >
                  {option.label}
                </Text>
                {isSelected && (
                  <View
                    style={[
                      styles.checkmark,
                      { backgroundColor: option.color },
                    ]}
                  >
                    <Ionicons name="checkmark" size={12} color="white" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Cooking Level */}
      <View style={styles.preferenceSection}>
        <Text variant="headlineSmall" weight="600" style={{ marginBottom: 16 }}>
          Mutfak Deneyimi
        </Text>
        <View style={styles.levelOptions}>
          {levelOptions.map((option) => {
            const isSelected = preferences.cookingLevel === option.id;
            return (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.levelCard,
                  {
                    backgroundColor: isSelected
                      ? colors.primary[50]
                      : colors.surface,
                    borderColor: isSelected
                      ? colors.primary[500]
                      : colors.neutral[300],
                  },
                ]}
                onPress={() => togglePreference("cookingLevel", option.id)}
              >
                <View style={styles.levelHeader}>
                  <Text variant="headlineMedium">{option.icon}</Text>
                  <Text
                    variant="labelLarge"
                    weight="600"
                    style={{
                      color: isSelected
                        ? colors.primary[600]
                        : colors.text.primary,
                    }}
                  >
                    {option.label}
                  </Text>
                </View>
                <Text variant="labelSmall" color="secondary">
                  {option.description}
                </Text>
                {isSelected && (
                  <View
                    style={[
                      styles.checkmark,
                      { backgroundColor: colors.primary[500] },
                    ]}
                  >
                    <Ionicons name="checkmark" size={12} color="white" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );

  const renderStep = ({ item }: { item: OnboardingStep }) => (
    <View style={[styles.stepContainer, { width }]}>
      {/* Background Gradient */}
      <LinearGradient
        colors={[item.gradient[0], item.gradient[1], "transparent"]}
        style={styles.stepBackground}
        locations={[0, 0.6, 1]}
      />

      <ScrollView
        style={styles.stepScrollView}
        contentContainerStyle={styles.stepContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Hero Icon */}
        <View style={styles.heroSection}>
          <LinearGradient
            colors={[item.gradient[0], item.gradient[1]]}
            style={styles.heroIcon}
          >
            <Ionicons name={item.icon as any} size={64} color="white" />
          </LinearGradient>
        </View>

        {/* Text Content */}
        <View style={styles.textSection}>
          <Text
            variant="displaySmall"
            weight="700"
            align="center"
            style={styles.stepTitle}
          >
            {item.title}
          </Text>

          <Text
            variant="headlineSmall"
            weight="500"
            align="center"
            style={styles.stepSubtitle}
          >
            {item.subtitle}
          </Text>

          <Text
            variant="bodyLarge"
            align="center"
            color="secondary"
            style={styles.stepDescription}
          >
            {item.description}
          </Text>
        </View>

        {/* Dynamic Content */}
        <View style={styles.dynamicContent}>
          {item.type === "features" && renderFeatureHighlights()}
          {item.type === "preferences" && (
            <Card variant="elevated" style={styles.preferencesCard}>
              {renderPreferences()}
            </Card>
          )}
          {item.type === "notifications" && (
            <View style={styles.notificationFeatures}>
              <View
                style={[
                  styles.notificationCard,
                  { backgroundColor: colors.surface },
                ]}
              >
                <Ionicons
                  name="calendar"
                  size={32}
                  color={colors.primary[500]}
                />
                <Text variant="labelLarge" weight="600">
                  Günlük Öneriler
                </Text>
                <Text variant="labelSmall" color="secondary" align="center">
                  Her gün size özel tarif önerileri
                </Text>
              </View>
              <View
                style={[
                  styles.notificationCard,
                  { backgroundColor: colors.surface },
                ]}
              >
                <Ionicons name="time" size={32} color={colors.secondary[500]} />
                <Text variant="labelLarge" weight="600">
                  Mevsimlik Hatırlatmalar
                </Text>
                <Text variant="labelSmall" color="secondary" align="center">
                  Sezona uygun malzeme önerileri
                </Text>
              </View>
            </View>
          )}
          {item.type === "ready" && (
            <View style={styles.readyFeatures}>
              <LinearGradient
                colors={[colors.semantic.success + "20", colors.primary[50]]}
                style={styles.readyCard}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={48}
                  color={colors.semantic.success}
                />
                <Text variant="headlineSmall" weight="600">
                  Tüm Özellikler Aktif!
                </Text>
                <Text variant="bodyMedium" color="secondary" align="center">
                  AI arama, kişisel öneriler ve bildirimlerle tam deneyim
                </Text>
              </LinearGradient>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );

  const currentStepData = onboardingSteps[currentStep];
  const isLastStep = currentStep === onboardingSteps.length - 1;
  const canProceed =
    currentStepData.type !== "preferences" || preferences.cookingLevel !== "";

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <View style={styles.headerLeft}>
          <LinearGradient
            colors={[colors.primary[500], colors.primary[600]]}
            style={styles.appLogo}
          >
            <Ionicons name="restaurant" size={24} color="white" />
          </LinearGradient>
          <Text variant="headlineSmall" weight="700">
            Yemek Bulucu
          </Text>
        </View>

        {!isLastStep && (
          <TouchableOpacity
            style={[styles.skipButton, { backgroundColor: colors.surface }]}
            onPress={handleSkip}
          >
            <Text variant="labelMedium" weight="500" color="secondary">
              Geç
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Progress Bar */}
      <View
        style={[
          styles.progressContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <View
          style={[
            styles.progressTrack,
            { backgroundColor: colors.neutral[200] },
          ]}
        >
          <Animated.View
            style={[
              styles.progressFill,
              {
                backgroundColor: colors.primary[500],
                width: progressAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0%", "100%"],
                }),
              },
            ]}
          />
        </View>
        <Text variant="labelSmall" color="secondary">
          {currentStep + 1} / {onboardingSteps.length}
        </Text>
      </View>

      {/* Steps */}
      <FlatList
        ref={flatListRef}
        data={onboardingSteps}
        renderItem={renderStep}
        keyExtractor={(item) => item.id.toString()}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        style={styles.stepsContainer}
      />

      {/* Footer */}
      <View style={[styles.footer, { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            {
              backgroundColor: canProceed
                ? colors.primary[500]
                : colors.neutral[300],
              opacity: canProceed ? 1 : 0.6,
            },
          ]}
          onPress={handleNext}
          disabled={!canProceed}
        >
          <Text variant="headlineSmall" weight="700" style={{ color: "white" }}>
            {currentStepData.action || (isLastStep ? "Tamamla" : "Devam Et")}
          </Text>
          <Ionicons
            name={isLastStep ? "checkmark-circle" : "arrow-forward"}
            size={24}
            color="white"
          />
        </TouchableOpacity>

        {currentStepData.type === "preferences" && !canProceed && (
          <Text
            variant="labelSmall"
            color="secondary"
            align="center"
            style={{ marginTop: 12 }}
          >
            Devam etmek için deneyim seviyenizi seçin
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  appLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  skipButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 9999,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },

  // Progress
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    marginRight: 16,
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },

  // Steps
  stepsContainer: {
    flex: 1,
  },
  stepContainer: {
    flex: 1,
    position: "relative",
  },
  stepScrollView: {
    flex: 1,
  },
  stepBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.1,
  },
  stepContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
    justifyContent: "space-between",
    minHeight: height * 0.6, // Minimum height to ensure proper layout
  },

  // Hero Section
  heroSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  heroIcon: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },

  // Text Section
  textSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  stepTitle: {
    marginBottom: 16,
    lineHeight: 44,
  },
  stepSubtitle: {
    marginBottom: 16,
  },
  stepDescription: {
    lineHeight: 28,
  },

  // Dynamic Content
  dynamicContent: {
    flex: 1,
  },

  // Features Grid
  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    justifyContent: "center",
  },
  featureCard: {
    width: (width - 24 * 2 - 16) / 2,
    alignItems: "center",
    padding: 20,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  featureIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },

  // Preferences
  preferencesCard: {
    padding: 20,
  },
  preferencesContainer: {
    gap: 24,
  },
  preferenceSection: {
    gap: 16,
  },
  optionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  optionCard: {
    minWidth: (width - 24 * 4) / 3,
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    position: "relative",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  levelOptions: {
    gap: 16,
  },
  levelCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    position: "relative",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  levelHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 8,
  },
  checkmark: {
    position: "absolute",
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  // Notifications
  notificationFeatures: {
    flexDirection: "row",
    gap: 16,
  },
  notificationCard: {
    flex: 1,
    alignItems: "center",
    padding: 20,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },

  // Ready Features
  readyFeatures: {
    alignItems: "center",
  },
  readyCard: {
    alignItems: "center",
    padding: 24,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },

  // Footer
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
});

export default OnboardingScreen;
