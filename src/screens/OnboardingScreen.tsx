import React, { useState, useRef } from "react";
import {
  View,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  FlatList,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { UserPreferencesService } from "../services/UserPreferencesService";

// UI Components
import { Button, Card, Text } from "../components/ui";
import { colors, spacing, borderRadius } from "../theme/design-tokens";

const { width } = Dimensions.get("window");

interface OnboardingScreenProps {
  onComplete: () => void;
}

interface OnboardingSlide {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  color: string;
  bgColor: string;
  type?: 'intro' | 'preferences' | 'permissions' | 'tour';
}

interface LocalUserPreferences {
  dietaryRestrictions: string[];
  allergies: string[];
  cuisineTypes: string[];
  cookingExperience: string;
}

const onboardingData: OnboardingSlide[] = [
  {
    id: 1,
    title: "🍳 Yemek Bulucu'ya Hoş Geldiniz",
    subtitle: "Akıllı Tarif Asistanınız",
    description: "Evdeki malzemelerinizle ne pişirebileceğinizi keşfedin. AI destekli tarif önerileriyle mutfakta yeni deneyimler yaşayın.",
    icon: "home",
    color: colors.primary[500],
    bgColor: colors.primary[50],
    type: 'intro',
  },
  {
    id: 2,
    title: "👤 Kendinizi Tanıtın",
    subtitle: "Size Özel Deneyim",
    description: "Beslenme tercihlerinizi ve mutfak deneyiminizi paylaşın. Size en uygun tarifleri önerelim.",
    icon: "person",
    color: colors.success[500],
    bgColor: colors.success[50],
    type: 'preferences',
  },
  {
    id: 3,
    title: "🔔 Günlük Tarif Önerileri",
    subtitle: "Hiçbir Fırsatı Kaçırmayın",
    description: "Size özel tarif önerilerini ve günlük ipuçlarını kaçırmamak için bildirimlere izin verin.",
    icon: "notifications",
    color: colors.warning[500],
    bgColor: colors.warning[50],
    type: 'permissions',
  },
  {
    id: 4,
    title: "🚀 Hazırsınız!",
    subtitle: "Yemek Maceranız Başlıyor",
    description: "Artık malzemelerinizi girip harika tarifleri keşfetmeye başlayabilirsiniz. İyi eğlenceler!",
    icon: "rocket",
    color: colors.primary[600],
    bgColor: colors.primary[50],
    type: 'tour',
  },
];

const dietaryOptions = [
  { id: 'vegetarian', label: '🥗 Vejeteryan', icon: 'leaf' },
  { id: 'vegan', label: '🌱 Vegan', icon: 'flower' },
  { id: 'gluten-free', label: '🌾 Glutensiz', icon: 'ban' },
  { id: 'dairy-free', label: '🥛 Sütsüz', icon: 'close-circle' },
  { id: 'low-carb', label: '🥩 Düşük Karbonhidrat', icon: 'fitness' },
  { id: 'keto', label: '🥑 Ketojenik', icon: 'flash' },
];

const cuisineOptions = [
  { id: 'turkish', label: '🇹🇷 Türk Mutfağı', icon: 'flag' },
  { id: 'mediterranean', label: '🇬🇷 Akdeniz', icon: 'sunny' },
  { id: 'asian', label: '🍜 Asya', icon: 'restaurant' },
  { id: 'italian', label: '🍝 İtalyan', icon: 'pizza' },
  { id: 'mexican', label: '🌮 Meksika', icon: 'flame' },
  { id: 'indian', label: '🍛 Hint', icon: 'leaf' },
];

const experienceOptions = [
  { id: 'beginner', label: '🔰 Yeni Başlayan', icon: 'school' },
  { id: 'intermediate', label: '👨‍🍳 Orta Seviye', icon: 'restaurant' },
  { id: 'advanced', label: '⭐ İleri Seviye', icon: 'star' },
  { id: 'expert', label: '👑 Uzman', icon: 'trophy' },
];

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userPreferences, setUserPreferences] = useState<LocalUserPreferences>({
    dietaryRestrictions: [],
    allergies: [],
    cuisineTypes: [],
    cookingExperience: '',
  });
  const flatListRef = useRef<FlatList>(null);

  const handleNext = async () => {
    const currentSlide = onboardingData[currentIndex];
    
    // Handle different slide types
    if (currentSlide.type === 'permissions') {
      await requestNotificationPermission();
    }
    
    if (currentIndex < onboardingData.length - 1) {
      setCurrentIndex(currentIndex + 1);
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      completeOnboarding();
    }
  };

  const handleSkip = () => {
    completeOnboarding();
  };

  const requestNotificationPermission = async () => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus === 'granted') {
        // Configure notification behavior
        await Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
          }),
        });
      }
    } catch (error) {
      console.error('Notification permission error:', error);
    }
  };

  const completeOnboarding = async () => {
    try {
      await UserPreferencesService.saveUserPreferences({
        ...userPreferences,
        onboardingCompleted: true,
        notificationsEnabled: true, // Set based on permission result
      });
      onComplete();
    } catch (error) {
      console.error("Onboarding completion error:", error);
      onComplete();
    }
  };

  const togglePreference = (category: keyof LocalUserPreferences, value: string) => {
    if (category === 'cookingExperience') {
      setUserPreferences(prev => ({ ...prev, [category]: value }));
    } else {
      setUserPreferences(prev => ({
        ...prev,
        [category]: prev[category].includes(value)
          ? prev[category].filter(item => item !== value)
          : [...prev[category], value]
      }));
    }
  };

  const renderPreferencesContent = () => {
    return (
      <View style={styles.preferencesContainer}>
        <Text variant="h4" weight="semibold" color="primary" style={styles.sectionTitle}>
          🍽️ Beslenme Tercihleri
        </Text>
        <View style={styles.optionsGrid}>
          {dietaryOptions.map(option => (
            <Button
              key={option.id}
              variant={userPreferences.dietaryRestrictions.includes(option.id) ? "primary" : "outline"}
              size="sm"
              onPress={() => togglePreference('dietaryRestrictions', option.id)}
              style={styles.optionButton}
            >
              <Text variant="caption" color={userPreferences.dietaryRestrictions.includes(option.id) ? "primary-foreground" : "secondary"}>
                {option.label}
              </Text>
            </Button>
          ))}
        </View>

        <Text variant="h4" weight="semibold" color="primary" style={styles.sectionTitle}>
          🌍 Favori Mutfaklar
        </Text>
        <View style={styles.optionsGrid}>
          {cuisineOptions.map(option => (
            <Button
              key={option.id}
              variant={userPreferences.cuisineTypes.includes(option.id) ? "primary" : "outline"}
              size="sm"
              onPress={() => togglePreference('cuisineTypes', option.id)}
              style={styles.optionButton}
            >
              <Text variant="caption" color={userPreferences.cuisineTypes.includes(option.id) ? "primary-foreground" : "secondary"}>
                {option.label}
              </Text>
            </Button>
          ))}
        </View>

        <Text variant="h4" weight="semibold" color="primary" style={styles.sectionTitle}>
          👨‍🍳 Mutfak Deneyimi
        </Text>
        <View style={styles.experienceContainer}>
          {experienceOptions.map(option => (
            <Button
              key={option.id}
              variant={userPreferences.cookingExperience === option.id ? "primary" : "outline"}
              size="md"
              onPress={() => togglePreference('cookingExperience', option.id)}
              style={styles.experienceButton}
              fullWidth
            >
              <Text variant="body" color={userPreferences.cookingExperience === option.id ? "primary-foreground" : "secondary"}>
                {option.label}
              </Text>
            </Button>
          ))}
        </View>
      </View>
    );
  };

  const renderSlide = ({ item, index }: { item: OnboardingSlide; index: number }) => {
    const isPreferencesSlide = item.type === 'preferences';
    
    return (
      <View style={[styles.slideWrapper, { width }]}>
        <Card variant="elevated" size="xl" style={[styles.slideCard, { backgroundColor: item.bgColor }]}>
          <View style={styles.iconContainer}>
            <View style={[styles.iconCircle, { backgroundColor: item.color }]}>
              <Ionicons name={item.icon as any} size={48} color={colors.neutral[0]} />
            </View>
          </View>

          <View style={styles.textContainer}>
            <Text variant="h2" weight="bold" align="center" color="primary" style={styles.title}>
              {item.title}
            </Text>
            
            <Text variant="h4" weight="semibold" align="center" color="accent" style={styles.subtitle}>
              {item.subtitle}
            </Text>

            <Text variant="body" align="center" color="secondary" style={styles.description}>
              {item.description}
            </Text>
          </View>

          {isPreferencesSlide && renderPreferencesContent()}
        </Card>
      </View>
    );
  };

  const currentSlide = onboardingData[currentIndex];
  const isLastSlide = currentIndex === onboardingData.length - 1;
  const canProceed = currentSlide.type !== 'preferences' || userPreferences.cookingExperience !== '';

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
          <FlatList
            ref={flatListRef}
            data={onboardingData}
            renderItem={renderSlide}
            keyExtractor={(item) => item.id.toString()}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEnabled={false}
            onMomentumScrollEnd={(event) => {
              const newIndex = Math.round(event.nativeEvent.contentOffset.x / width);
              setCurrentIndex(newIndex);
            }}
          />
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
            disabled={!canProceed}
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
  },
  slideWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  slideCard: {
    width: width - spacing[8],
    maxWidth: 400,
    padding: spacing[6],
    alignItems: "center",
    maxHeight: '80%',
  },
  iconContainer: {
    marginBottom: spacing[4],
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
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
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  title: {
    marginBottom: spacing[1],
  },
  subtitle: {
    marginBottom: spacing[2],
  },
  description: {
    lineHeight: 22,
    maxWidth: 300,
  },
  preferencesContainer: {
    width: '100%',
    maxHeight: 300,
  },
  sectionTitle: {
    marginBottom: spacing[3],
    marginTop: spacing[2],
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  optionButton: {
    minWidth: 100,
    flexGrow: 1,
  },
  experienceContainer: {
    gap: spacing[2],
  },
  experienceButton: {
    justifyContent: 'center',
  },
  progressContainer: {
    alignItems: "center",
    paddingVertical: spacing[4],
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