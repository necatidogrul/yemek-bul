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
} from "react-native";
import { Logger } from "../services/LoggerService";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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
  const scaleAnimation = useRef(new Animated.Value(1)).current;
  const progressAnimation = useRef(new Animated.Value(0)).current;

  // Clean, professional onboarding steps
  const onboardingSteps: OnboardingStep[] = [
    {
      id: 0,
      title: "Yemek Bulucu'ya Hoş Geldin! 👋",
      subtitle: "AI ile mutfakta harikalar yaratmaya hazır mısın?",
      icon: "restaurant",
      color: "#6366f1",
      type: "welcome",
    },
    {
      id: 1,
      title: "AI Destekli Tarif Arama ⚡",
      subtitle: "Malzemelerini söyle, mükemmel tarifleri keşfet",
      icon: "flash",
      color: "#ec4899", 
      type: "features",
    },
    {
      id: 2,
      title: "Seni Tanıyalım 💜",
      subtitle: "Tercihlerini seç, kişisel deneyimin başlasın",
      icon: "heart",
      color: "#06b6d4",
      type: "preferences",
    },
    {
      id: 3,
      title: "Günlük İlham 🔔",
      subtitle: "Her gün yeni tariflerle sürprizlerle dolu",
      icon: "notifications",
      color: "#10b981",
      type: "notifications",
    },
    {
      id: 4,
      title: "Hadi Başlayalım! 🚀",
      subtitle: "Mutfak maceran şimdi başlıyor",
      icon: "rocket",
      color: "#f59e0b",
      type: "ready",
    },
  ];

  // Quick preference options
  const quickPreferences = [
    { id: "turkish", emoji: "🇹🇷", label: "Türk" },
    { id: "italian", emoji: "🍝", label: "İtalyan" },
    { id: "asian", emoji: "🍜", label: "Asya" },
    { id: "healthy", emoji: "🥗", label: "Sağlıklı" },
    { id: "dessert", emoji: "🍰", label: "Tatlı" },
    { id: "fast", emoji: "⚡", label: "Hızlı" },
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
        duration: 600,
        useNativeDriver: false,
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
      // Smooth transition
      Animated.sequence([
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

  const togglePreference = async (category: keyof UserPreferences, value: string) => {
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
            <View style={styles.featureItem}>
              <View style={[styles.featureIcon, { backgroundColor: step.color + "20" }]}>
                <Ionicons name="search" size={24} color={step.color} />
              </View>
              <View style={styles.featureText}>
                <RNText style={styles.featureTitle}>AI Tarif Arama</RNText>
                <RNText style={styles.featureDesc}>Malzemelerinle akıllı eşleştirme</RNText>
              </View>
            </View>

            <View style={styles.featureItem}>
              <View style={[styles.featureIcon, { backgroundColor: step.color + "20" }]}>
                <Ionicons name="mic" size={24} color={step.color} />
              </View>
              <View style={styles.featureText}>
                <RNText style={styles.featureTitle}>Sesli Komutlar</RNText>
                <RNText style={styles.featureDesc}>Elleriniz meşgulken sesle arama</RNText>
              </View>
            </View>

            <View style={styles.featureItem}>
              <View style={[styles.featureIcon, { backgroundColor: step.color + "20" }]}>
                <Ionicons name="heart" size={24} color={step.color} />
              </View>
              <View style={styles.featureText}>
                <RNText style={styles.featureTitle}>Kişisel Favoriler</RNText>
                <RNText style={styles.featureDesc}>Sevdiklerinizi kaydedin</RNText>
              </View>
            </View>
          </View>
        );

      case "preferences":
        return (
          <View style={styles.preferencesContainer}>
            <View style={styles.sectionContainer}>
              <RNText style={styles.sectionTitle}>Favori Mutfakların</RNText>
              <View style={styles.preferencesGrid}>
                {quickPreferences.map((pref) => {
                  const isSelected = preferences.favoriteCategories.includes(pref.id);
                  return (
                    <TouchableOpacity
                      key={pref.id}
                      style={[
                        styles.preferenceChip,
                        {
                          backgroundColor: isSelected ? step.color : colors.surface,
                          borderColor: isSelected ? step.color : colors.neutral[300],
                        },
                      ]}
                      onPress={() => togglePreference("favoriteCategories", pref.id)}
                    >
                      <RNText style={{ fontSize: 18 }}>{pref.emoji}</RNText>
                      <RNText style={[
                        styles.preferenceLabel,
                        { color: isSelected ? "white" : colors.text.primary }
                      ]}>
                        {pref.label}
                      </RNText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.sectionContainer}>
              <RNText style={styles.sectionTitle}>Mutfak Deneyimin</RNText>
              <View style={styles.skillGrid}>
                {skillLevels.map((skill) => {
                  const isSelected = preferences.cookingLevel === skill.id;
                  return (
                    <TouchableOpacity
                      key={skill.id}
                      style={[
                        styles.skillChip,
                        {
                          backgroundColor: isSelected ? step.color : colors.surface,
                          borderColor: isSelected ? step.color : colors.neutral[300],
                        },
                      ]}
                      onPress={() => togglePreference("cookingLevel", skill.id)}
                    >
                      <RNText style={{ fontSize: 16 }}>{skill.emoji}</RNText>
                      <RNText style={[
                        styles.skillLabel,
                        { color: isSelected ? "white" : colors.text.primary }
                      ]}>
                        {skill.label}
                      </RNText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        );

      case "notifications":
        return (
          <View style={styles.notificationContainer}>
            <View style={[styles.notificationCard, { borderColor: step.color }]}>
              <Ionicons name="calendar" size={32} color={step.color} />
              <RNText style={styles.notificationTitle}>Günlük Öneriler</RNText>
              <RNText style={styles.notificationDesc}>
                Her sabah senin için özel seçilmiş tarifler
              </RNText>
            </View>
            <View style={[styles.notificationCard, { borderColor: step.color }]}>
              <Ionicons name="star" size={32} color={step.color} />
              <RNText style={styles.notificationTitle}>Özel İndirimler</RNText>
              <RNText style={styles.notificationDesc}>
                Yeni özellikler ve fırsatlardan ilk sen haberdar ol
              </RNText>
            </View>
          </View>
        );

      case "ready":
        return (
          <View style={styles.readyContainer}>
            <View style={[styles.readyCard, { borderColor: step.color }]}>
              <Ionicons name="checkmark-circle" size={48} color={step.color} />
              <RNText style={styles.readyTitle}>Her Şey Hazır!</RNText>
              <RNText style={styles.readyDesc}>
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
  const canProceed = currentStepData.type !== "preferences" || preferences.cookingLevel !== "";

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.appLogo, { backgroundColor: currentStepData.color }]}>
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
              <RNText style={[styles.skipText, { color: colors.text.secondary }]}>
                Atla
              </RNText>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Progress */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressTrack, { backgroundColor: colors.neutral[200] }]}>
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
          { opacity: fadeAnimation, transform: [{ scale: scaleAnimation }] },
        ]}
      >
        {/* Icon */}
        <View style={styles.iconContainer}>
          <View style={[styles.iconCircle, { backgroundColor: currentStepData.color }]}>
            <Ionicons name={currentStepData.icon as any} size={48} color="white" />
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
              backgroundColor: canProceed ? currentStepData.color : colors.neutral[300],
              opacity: canProceed ? 1 : 0.6,
            },
          ]}
          onPress={handleNext}
          disabled={!canProceed}
        >
          <RNText style={styles.continueText}>
            {isLastStep ? "Başlayalım! 🚀" : "Devam Et"}
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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },

  // Text
  textContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
    lineHeight: 30,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 22,
  },

  // Dynamic Content
  dynamicContent: {
    flex: 1,
  },

  // Features
  featuresContainer: {
    gap: 20,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
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
    opacity: 0.7,
  },

  // Preferences
  preferencesContainer: {
    gap: 24,
  },
  sectionContainer: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
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
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    gap: 8,
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
    borderRadius: 16,
    gap: 12,
    borderWidth: 2,
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
    opacity: 0.8,
  },

  // Ready
  readyContainer: {
    alignItems: "center",
  },
  readyCard: {
    alignItems: "center",
    padding: 32,
    borderRadius: 20,
    gap: 16,
    borderWidth: 2,
  },
  readyTitle: {
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
  },
  readyDesc: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
    opacity: 0.8,
  },

  // Footer
  footer: {
    padding: 20,
    paddingBottom: 40,
    alignItems: "center",
    gap: 12,
  },
  continueButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 25,
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