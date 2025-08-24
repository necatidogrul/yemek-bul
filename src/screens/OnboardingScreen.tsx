import React, { useState, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  TouchableOpacity,
  Animated,
  StatusBar,
  Text as RNText,
  ScrollView,
  Platform,
} from "react-native";
import { Logger } from "../services/LoggerService";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";
import { UserPreferencesService } from "../services/UserPreferencesService";

// UI Components
import { LanguageSelector } from "../components/ui";
import { useTheme } from "../contexts/ThemeContext";
import { useToast } from "../contexts/ToastContext";
import { useHaptics } from "../hooks/useHaptics";
import { useTranslation } from "../hooks/useTranslation";

const { width, height } = Dimensions.get("window");

interface OnboardingScreenProps {
  onComplete: () => void;
}

interface OnboardingStep {
  id: number;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  type: "welcome" | "features" | "preferences" | "notifications" | "ready";
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
  const { t } = useTranslation();

  // Animations
  const fadeAnimation = useRef(new Animated.Value(1)).current;
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const progressAnimation = useRef(new Animated.Value(0)).current;
  const scaleAnimation = useRef(new Animated.Value(0.8)).current;

  // Modern onboarding steps
  const onboardingSteps: OnboardingStep[] = [
    {
      id: 0,
      title: "Hoş Geldin! 👋",
      subtitle: "AI destekli yemek bulucu ile tanış",
      icon: "restaurant",
      color: "#6366f1",
      type: "welcome",
    },
    {
      id: 1,
      title: "Akıllı Özellikler",
      subtitle: "Sesli komutlar ve AI arama ile kolay kullanım",
      icon: "flash",
      color: "#ec4899",
      type: "features",
    },
    {
      id: 2,
      title: "Tercihlerinizi Belirleyin",
      subtitle: "Size özel tarif deneyimi",
      icon: "heart",
      color: "#06b6d4",
      type: "preferences",
    },
    {
      id: 3,
      title: "Bildirimler",
      subtitle: "Günlük öneriler ve özel fırsatlar",
      icon: "notifications",
      color: "#10b981",
      type: "notifications",
    },
    {
      id: 4,
      title: "Her Şey Hazır! 🎉",
      subtitle: "Mutfak maceran başlasın",
      icon: "rocket",
      color: "#f59e0b",
      type: "ready",
    },
  ];

  // Preference options
  const cuisinePreferences = [
    { id: "turkish", emoji: "🇹🇷", label: "Türk Mutfağı" },
    { id: "italian", emoji: "🍝", label: "İtalyan Mutfağı" },
    { id: "asian", emoji: "🍜", label: "Asya Mutfağı" },
    { id: "healthy", emoji: "🥗", label: "Sağlıklı Yemekler" },
    { id: "dessert", emoji: "🍰", label: "Tatlılar" },
    { id: "fast", emoji: "⚡", label: "Hızlı Yemekler" },
  ];

  const skillLevels = [
    { id: "beginner", emoji: "🐣", label: "Başlangıç" },
    { id: "intermediate", emoji: "👨‍🍳", label: "Orta" },
    { id: "advanced", emoji: "⭐", label: "İleri" },
    { id: "expert", emoji: "👑", label: "Uzman" },
  ];

  // Animations
  useEffect(() => {
    Animated.parallel([
      Animated.timing(progressAnimation, {
        toValue: (currentStep + 1) / onboardingSteps.length,
        duration: 800,
        useNativeDriver: false,
      }),
      Animated.spring(slideAnimation, {
        toValue: 0,
        friction: 8,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnimation, {
        toValue: 1,
        friction: 8,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [currentStep]);

  const handleNext = async () => {
    const step = onboardingSteps[currentStep];
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (step.type === "notifications") {
      await requestNotificationPermission();
    }

    if (currentStep < onboardingSteps.length - 1) {
      // Slide out animation
      Animated.sequence([
        Animated.timing(slideAnimation, {
          toValue: -width,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnimation, {
          toValue: 0.3,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnimation, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      setCurrentStep(currentStep + 1);
    } else {
      await completeOnboarding();
    }
  };

  const handleSkip = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
        showSuccess("Bildirimler açıldı! 🔔");
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

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showSuccess("Hoş geldin! 🎉");
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
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

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

  // Render step content
  const renderStepContent = (step: OnboardingStep) => {
    switch (step.type) {
      case "features":
        return (
          <View style={styles.featuresContainer}>
            <View style={styles.featureCard}>
              <View
                style={[
                  styles.featureIcon,
                  { backgroundColor: step.color + "15" },
                ]}
              >
                <Ionicons name="search" size={28} color={step.color} />
              </View>
              <View style={styles.featureContent}>
                <RNText
                  style={[styles.featureTitle, { color: colors.text.primary }]}
                >
                  AI Arama
                </RNText>
                <RNText
                  style={[styles.featureDesc, { color: colors.text.secondary }]}
                >
                  Malzemelerinizi yazın, AI size mükemmel tarifleri bulsun
                </RNText>
              </View>
            </View>

            <View style={styles.featureCard}>
              <View
                style={[
                  styles.featureIcon,
                  { backgroundColor: step.color + "15" },
                ]}
              >
                <Ionicons name="mic" size={28} color={step.color} />
              </View>
              <View style={styles.featureContent}>
                <RNText
                  style={[styles.featureTitle, { color: colors.text.primary }]}
                >
                  Sesli Komutlar
                </RNText>
                <RNText
                  style={[styles.featureDesc, { color: colors.text.secondary }]}
                >
                  "Mercimek çorbası yapmak istiyorum" deyin, tarifi bulun
                </RNText>
              </View>
            </View>

            <View style={styles.featureCard}>
              <View
                style={[
                  styles.featureIcon,
                  { backgroundColor: step.color + "15" },
                ]}
              >
                <Ionicons name="heart" size={28} color={step.color} />
              </View>
              <View style={styles.featureContent}>
                <RNText
                  style={[styles.featureTitle, { color: colors.text.primary }]}
                >
                  Kişisel Favoriler
                </RNText>
                <RNText
                  style={[styles.featureDesc, { color: colors.text.secondary }]}
                >
                  Beğendiğiniz tarifleri kaydedin, her zaman erişin
                </RNText>
              </View>
            </View>
          </View>
        );

      case "preferences":
        return (
          <ScrollView
            style={styles.preferencesScrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.preferencesContent}
          >
            <View style={styles.preferencesContainer}>
              <View style={styles.sectionContainer}>
                <RNText
                  style={[styles.sectionTitle, { color: colors.text.primary }]}
                >
                  Favori Mutfakların
                </RNText>
                <View style={styles.preferencesGrid}>
                  {cuisinePreferences.map((pref) => {
                    const isSelected = preferences.favoriteCategories.includes(
                      pref.id
                    );
                    return (
                      <TouchableOpacity
                        key={pref.id}
                        style={[
                          styles.preferenceChip,
                          {
                            backgroundColor: isSelected
                              ? step.color
                              : colors.surface,
                            borderColor: isSelected
                              ? step.color
                              : colors.neutral[200],
                          },
                        ]}
                        onPress={() =>
                          togglePreference("favoriteCategories", pref.id)
                        }
                      >
                        <RNText style={{ fontSize: 20 }}>{pref.emoji}</RNText>
                        <RNText
                          style={[
                            styles.preferenceLabel,
                            {
                              color: isSelected ? "white" : colors.text.primary,
                            },
                          ]}
                        >
                          {pref.label}
                        </RNText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.sectionContainer}>
                <RNText
                  style={[styles.sectionTitle, { color: colors.text.primary }]}
                >
                  Mutfak Deneyimin
                </RNText>
                <View style={styles.skillGrid}>
                  {skillLevels.map((skill) => {
                    const isSelected = preferences.cookingLevel === skill.id;
                    return (
                      <TouchableOpacity
                        key={skill.id}
                        style={[
                          styles.skillChip,
                          {
                            backgroundColor: isSelected
                              ? step.color
                              : colors.surface,
                            borderColor: isSelected
                              ? step.color
                              : colors.neutral[200],
                          },
                        ]}
                        onPress={() =>
                          togglePreference("cookingLevel", skill.id)
                        }
                      >
                        <RNText style={{ fontSize: 18 }}>{skill.emoji}</RNText>
                        <RNText
                          style={[
                            styles.skillLabel,
                            {
                              color: isSelected ? "white" : colors.text.primary,
                            },
                          ]}
                        >
                          {skill.label}
                        </RNText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
          </ScrollView>
        );

      case "notifications":
        return (
          <View style={styles.notificationContainer}>
            <View
              style={[
                styles.notificationCard,
                { borderColor: step.color + "30" },
              ]}
            >
              <View
                style={[
                  styles.notificationIcon,
                  { backgroundColor: step.color + "15" },
                ]}
              >
                <Ionicons name="calendar" size={32} color={step.color} />
              </View>
              <RNText
                style={[
                  styles.notificationTitle,
                  { color: colors.text.primary },
                ]}
              >
                Günlük Öneriler
              </RNText>
              <RNText
                style={[
                  styles.notificationDesc,
                  { color: colors.text.secondary },
                ]}
              >
                Her sabah senin için özel seçilmiş tarifler
              </RNText>
            </View>
            <View
              style={[
                styles.notificationCard,
                { borderColor: step.color + "30" },
              ]}
            >
              <View
                style={[
                  styles.notificationIcon,
                  { backgroundColor: step.color + "15" },
                ]}
              >
                <Ionicons name="star" size={32} color={step.color} />
              </View>
              <RNText
                style={[
                  styles.notificationTitle,
                  { color: colors.text.primary },
                ]}
              >
                Özel İndirimler
              </RNText>
              <RNText
                style={[
                  styles.notificationDesc,
                  { color: colors.text.secondary },
                ]}
              >
                Yeni özellikler ve fırsatlardan ilk sen haberdar ol
              </RNText>
            </View>
          </View>
        );

      case "ready":
        return (
          <View style={styles.readyContainer}>
            <View
              style={[styles.readyCard, { borderColor: step.color + "30" }]}
            >
              <View
                style={[
                  styles.readyIcon,
                  { backgroundColor: step.color + "15" },
                ]}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={48}
                  color={step.color}
                />
              </View>
              <RNText
                style={[styles.readyTitle, { color: colors.text.primary }]}
              >
                Her Şey Hazır!
              </RNText>
              <RNText
                style={[styles.readyDesc, { color: colors.text.secondary }]}
              >
                AI ile desteklenen mutfak maceran başlasın
              </RNText>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

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
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View
            style={[styles.appLogo, { backgroundColor: currentStepData.color }]}
          >
            <Ionicons name="restaurant" size={24} color="white" />
          </View>
          <RNText style={[styles.appName, { color: colors.text.primary }]}>
            Yemek Bulucu
          </RNText>
        </View>

        <View style={styles.headerRight}>
          <LanguageSelector variant="button" />
          {!isLastStep && (
            <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
              <RNText
                style={[styles.skipText, { color: colors.text.secondary }]}
              >
                Geç
              </RNText>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Progress */}
      <View style={styles.progressContainer}>
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
                backgroundColor: currentStepData.color,
                width: progressAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0%", "100%"],
                }),
              },
            ]}
          />
        </View>
        <RNText style={[styles.progressText, { color: colors.text.secondary }]}>
          {currentStep + 1} / {onboardingSteps.length}
        </RNText>
      </View>

      {/* Main Content */}
      <Animated.View
        style={[
          styles.contentContainer,
          {
            opacity: fadeAnimation,
            transform: [
              { translateX: slideAnimation },
              { scale: scaleAnimation },
            ],
          },
        ]}
      >
        {/* Icon */}
        <View style={styles.iconContainer}>
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: currentStepData.color },
            ]}
          >
            <Ionicons
              name={currentStepData.icon as any}
              size={48}
              color="white"
            />
          </View>
        </View>

        {/* Text Content */}
        <View style={styles.textContainer}>
          <RNText style={[styles.title, { color: colors.text.primary }]}>
            {currentStepData.title}
          </RNText>
          <RNText style={[styles.subtitle, { color: colors.text.secondary }]}>
            {currentStepData.subtitle}
          </RNText>
        </View>

        {/* Dynamic Content */}
        <View style={styles.dynamicContent}>
          {renderStepContent(currentStepData)}
        </View>
      </Animated.View>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            {
              backgroundColor: canProceed
                ? currentStepData.color
                : colors.neutral[300],
              opacity: canProceed ? 1 : 0.6,
            },
          ]}
          onPress={handleNext}
          disabled={!canProceed}
        >
          <RNText style={styles.continueText}>
            {isLastStep ? "Başla" : "Devam Et"}
          </RNText>
          <Ionicons
            name={isLastStep ? "rocket" : "arrow-forward"}
            size={20}
            color="white"
          />
        </TouchableOpacity>

        {currentStepData.type === "preferences" && !canProceed && (
          <RNText style={[styles.hintText, { color: colors.text.secondary }]}>
            Devam etmek için mutfak deneyimini seç
          </RNText>
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
    paddingTop: Platform.OS === "ios" ? 0 : 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  appLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  appName: {
    fontSize: 18,
    fontWeight: "700",
  },
  skipButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  skipText: {
    fontSize: 14,
    fontWeight: "600",
  },

  // Progress
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
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
  progressText: {
    fontSize: 12,
    fontWeight: "600",
  },

  // Content
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },

  // Text
  textContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 20,
  },

  // Dynamic Content
  dynamicContent: {
    flex: 1,
  },

  // Features
  featuresContainer: {
    gap: 16,
  },
  featureCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  featureIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
  },

  // Preferences
  preferencesScrollView: {
    flex: 1,
  },
  preferencesContent: {
    paddingBottom: 20,
  },
  preferencesContainer: {
    gap: 32,
  },
  sectionContainer: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  preferencesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "center",
  },
  preferenceChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 2,
    gap: 8,
    minWidth: 120,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  preferenceLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  skillGrid: {
    flexDirection: "row",
    gap: 12,
  },
  skillChip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  skillLabel: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },

  // Notifications
  notificationContainer: {
    gap: 16,
  },
  notificationCard: {
    alignItems: "center",
    padding: 24,
    borderRadius: 20,
    gap: 16,
    borderWidth: 2,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  notificationIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  notificationTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  notificationDesc: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },

  // Ready
  readyContainer: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  readyCard: {
    alignItems: "center",
    padding: 40,
    borderRadius: 24,
    gap: 20,
    borderWidth: 2,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 5,
  },
  readyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  readyTitle: {
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
  },
  readyDesc: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
  },

  // Footer
  footer: {
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 40 : 20,
    alignItems: "center",
    gap: 12,
  },
  continueButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 28,
    gap: 8,
    minWidth: 200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  continueText: {
    fontSize: 16,
    fontWeight: "700",
    color: "white",
  },
  hintText: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
  },
});

export default OnboardingScreen;
