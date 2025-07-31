import React, { useState } from "react";
import {
  View,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

// UI Components
import { Button, Card, Text } from "../components/ui";
import { colors, spacing, borderRadius } from "../theme/design-tokens";

const { width } = Dimensions.get("window");

interface OnboardingScreenProps {
  onComplete: () => void;
}

const onboardingData = [
  {
    id: 1,
    title: "🥬 Malzemelerinizi Girin",
    subtitle: "Evde Ne Var?",
    description: "Evdeki malzemelerinizi yazın veya sesli olarak söyleyin. Uygulama sizin için en uygun tarifleri bulacak.",
    icon: "basket",
    color: colors.primary[500],
    bgColor: colors.primary[50],
  },
  {
    id: 2,
    title: "🍽️ Akıllı Tarif Önerileri",
    subtitle: "Sizin İçin Seçtik",
    description: "Mevcut malzemelerinizle yapabileceğiniz tarifleri görün. Eksik 1-2 malzemeyle yapılabilecekleri de keşfedin.",
    icon: "restaurant",
    color: colors.success[500],
    bgColor: colors.success[50],
  },
  {
    id: 3,
    title: "🎲 Karar Veremiyor Musunuz?",
    subtitle: "Şansınıza Bırakın",
    description: "Rastgele tarif önerisi alın! Bazen şans da güzel sonuçlar verir. Yeni lezzetler keşfedin.",
    icon: "dice",
    color: colors.warning[500],
    bgColor: colors.warning[50],
  },
  {
    id: 4,
    title: "❤️ Favorilerinizi Kaydedin",
    subtitle: "Sevdikleriniz Yanınızda",
    description: "Beğendiğiniz tarifleri favorilere ekleyin. İstediğiniz zaman kolayca erişin ve tekrar yapın.",
    icon: "heart",
    color: colors.destructive[500],
    bgColor: colors.destructive[50],
  },
];

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = () => {
    if (currentIndex < onboardingData.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      completeOnboarding();
    }
  };

  const handleSkip = () => {
    completeOnboarding();
  };

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem("onboarding_completed", "true");
      onComplete();
    } catch (error) {
      console.error("Onboarding completion error:", error);
      onComplete();
    }
  };

  const currentSlide = onboardingData[currentIndex];
  const isLastSlide = currentIndex === onboardingData.length - 1;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Skip Button */}
        {!isLastSlide && (
          <View style={styles.skipContainer}>
            <Button variant="ghost" size="sm" onPress={handleSkip}>
              <Text variant="body" color="secondary">
                Geç
              </Text>
            </Button>
          </View>
        )}

        {/* Main Content */}
        <View style={styles.slideContainer}>
          <Card variant="elevated" size="xl" style={[styles.slideCard, { backgroundColor: currentSlide.bgColor }]}>
            <View style={styles.iconContainer}>
              <View style={[styles.iconCircle, { backgroundColor: currentSlide.color }]}>
                <Ionicons name={currentSlide.icon as any} size={48} color={colors.neutral[0]} />
              </View>
            </View>

            <View style={styles.textContainer}>
              <Text variant="h2" weight="bold" align="center" color="primary" style={styles.title}>
                {currentSlide.title}
              </Text>
              
              <Text variant="h4" weight="semibold" align="center" color="accent" style={styles.subtitle}>
                {currentSlide.subtitle}
              </Text>

              <Text variant="body" align="center" color="secondary" style={styles.description}>
                {currentSlide.description}
              </Text>
            </View>
          </Card>
        </View>

        {/* Progress Indicators */}
        <View style={styles.progressContainer}>
          <View style={styles.dotsContainer}>
            {onboardingData.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  {
                    backgroundColor: index === currentIndex ? colors.primary[500] : colors.neutral[300],
                    width: index === currentIndex ? 24 : 8,
                  },
                ]}
              />
            ))}
          </View>
        </View>

        {/* Navigation Buttons */}
        <View style={styles.navigationContainer}>
          <Button
            variant="primary"
            size="lg"
            onPress={handleNext}
            fullWidth
            leftIcon={
              isLastSlide ? (
                <Ionicons name="checkmark-circle" size={20} />
              ) : (
                <Ionicons name="arrow-forward" size={20} />
              )
            }
          >
            {isLastSlide ? "🍳 Başlayalım!" : "Devam Et"}
          </Button>

          {!isLastSlide && (
            <View style={styles.stepInfo}>
              <Text variant="caption" color="secondary" align="center">
                {currentIndex + 1} / {onboardingData.length}
              </Text>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  content: {
    flex: 1,
    padding: spacing[4],
  },
  skipContainer: {
    alignItems: "flex-end",
    marginBottom: spacing[4],
  },
  slideContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  slideCard: {
    width: width - spacing[8],
    maxWidth: 400,
    padding: spacing[8],
    alignItems: "center",
  },
  iconContainer: {
    marginBottom: spacing[6],
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: colors.neutral[900],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  textContainer: {
    alignItems: "center",
    gap: spacing[3],
  },
  title: {
    marginBottom: spacing[1],
  },
  subtitle: {
    marginBottom: spacing[2],
  },
  description: {
    lineHeight: 24,
    maxWidth: 280,
  },
  progressContainer: {
    alignItems: "center",
    paddingVertical: spacing[6],
  },
  dotsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  dot: {
    height: 8,
    borderRadius: 4,
    transition: "all 0.3s ease",
  },
  navigationContainer: {
    gap: spacing[3],
  },
  stepInfo: {
    paddingTop: spacing[2],
  },
});

export default OnboardingScreen; 