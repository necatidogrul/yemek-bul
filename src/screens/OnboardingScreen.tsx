import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  TouchableOpacity,
  Animated,
  StatusBar,
  Text as RNText,
  Platform,
} from 'react-native';
import { Logger } from '../services/LoggerService';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { UserPreferencesService } from '../services/UserPreferencesService';

// UI Components
import { LanguageSelector } from '../components/ui';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { useHaptics } from '../hooks/useHaptics';
import { useTranslation } from '../hooks/useTranslation';

const { width, height } = Dimensions.get('window');

interface OnboardingScreenProps {
  onComplete: () => void;
}

interface OnboardingStep {
  id: number;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  gradient: string[];
  type: 'welcome' | 'features' | 'preferences' | 'ready';
}

interface UserPreferences {
  favoriteCategories: string[];
  cookingLevel: string;
  notifications: boolean;
}

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [preferences, setPreferences] = useState<UserPreferences>({
    favoriteCategories: [],
    cookingLevel: '',
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
  const pulseAnimation = useRef(new Animated.Value(1)).current;

  // Optimized onboarding steps - 4 sayfa
  const onboardingSteps: OnboardingStep[] = [
    {
      id: 0,
      title: 'Hoş Geldin! 👋',
      subtitle: 'AI destekli yemek bulucu ile tanış',
      icon: 'restaurant',
      color: '#6366f1',
      gradient: ['#6366f1', '#8b5cf6'],
      type: 'welcome',
    },
    {
      id: 1,
      title: 'Akıllı Özellikler',
      subtitle: 'Sesli komutlar ve AI arama ile kolay kullanım',
      icon: 'flash',
      color: '#ec4899',
      gradient: ['#ec4899', '#f97316'],
      type: 'features',
    },
    {
      id: 2,
      title: 'Tercihlerinizi Belirleyin',
      subtitle: 'Size özel tarif deneyimi',
      icon: 'heart',
      color: '#06b6d4',
      gradient: ['#06b6d4', '#10b981'],
      type: 'preferences',
    },
    {
      id: 3,
      title: 'Her Şey Hazır! 🎉',
      subtitle: 'Mutfak maceran başlasın',
      icon: 'rocket',
      color: '#f59e0b',
      gradient: ['#f59e0b', '#ef4444'],
      type: 'ready',
    },
  ];

  // Compact preference options
  const cuisinePreferences = [
    { id: 'turkish', emoji: '🇹🇷', label: 'Türk' },
    { id: 'italian', emoji: '🍝', label: 'İtalyan' },
    { id: 'asian', emoji: '🍜', label: 'Asya' },
    { id: 'healthy', emoji: '🥗', label: 'Sağlıklı' },
    { id: 'dessert', emoji: '🍰', label: 'Tatlı' },
    { id: 'fast', emoji: '⚡', label: 'Hızlı' },
  ];

  const skillLevels = [
    { id: 'beginner', emoji: '🐣', label: 'Başlangıç' },
    { id: 'intermediate', emoji: '👨‍🍳', label: 'Orta' },
    { id: 'advanced', emoji: '⭐', label: 'İleri' },
  ];

  // Pulse animation for interactive elements
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // Step animations
  useEffect(() => {
    Animated.parallel([
      Animated.timing(progressAnimation, {
        toValue: (currentStep + 1) / onboardingSteps.length,
        duration: 600,
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

    if (step.type === 'ready') {
      await requestNotificationPermission();
      await completeOnboarding();
      return;
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
    }
  };

  const handleSkip = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    completeOnboarding();
  };

  const requestNotificationPermission = async () => {
    if (__DEV__) {
      Logger.info('Notifications disabled in development');
      return;
    }

    try {
      const { status } = await Notifications.requestPermissionsAsync();
      setPreferences(prev => ({
        ...prev,
        notifications: status === 'granted',
      }));

      if (status === 'granted') {
        showSuccess(t('success.notificationsEnabled'));
      }
    } catch (error) {
      Logger.error('Notification permission error:', error);
      showError(t('errors.notificationPermissionDenied'));
    }
  };

  const completeOnboarding = async () => {
    try {
      await UserPreferencesService.saveUserPreferences({
        ...preferences,
        onboardingCompleted: true,
      });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showSuccess(t('success.onboardingWelcome'));
      onComplete();
    } catch (error) {
      Logger.error('Onboarding completion error:', error);
      onComplete();
    }
  };

  const togglePreference = async (
    category: keyof UserPreferences,
    value: string
  ) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (category === 'cookingLevel') {
      setPreferences(prev => ({ ...prev, [category]: value }));
    } else if (Array.isArray(preferences[category])) {
      const currentValues = preferences[category] as string[];
      const newValues = currentValues.includes(value)
        ? currentValues.filter(item => item !== value)
        : [...currentValues, value];

      setPreferences(prev => ({ ...prev, [category]: newValues }));
    }
  };

  // Render step content - Compact and scroll-free
  const renderStepContent = (step: OnboardingStep) => {
    switch (step.type) {
      case 'features':
        return (
          <View style={styles.featuresContainer}>
            <View style={styles.featureRow}>
              <View
                style={[
                  styles.featureCard,
                  { backgroundColor: step.color + '15' },
                ]}
              >
                <Ionicons name='search' size={24} color={step.color} />
                <RNText
                  style={[styles.featureTitle, { color: colors.text.primary }]}
                >
                  AI Arama
                </RNText>
              </View>
              <View
                style={[
                  styles.featureCard,
                  { backgroundColor: step.color + '15' },
                ]}
              >
                <Ionicons name='mic' size={24} color={step.color} />
                <RNText
                  style={[styles.featureTitle, { color: colors.text.primary }]}
                >
                  Sesli Komut
                </RNText>
              </View>
            </View>
            <View style={styles.featureRow}>
              <View
                style={[
                  styles.featureCard,
                  { backgroundColor: step.color + '15' },
                ]}
              >
                <Ionicons name='heart' size={24} color={step.color} />
                <RNText
                  style={[styles.featureTitle, { color: colors.text.primary }]}
                >
                  Favoriler
                </RNText>
              </View>
              <View
                style={[
                  styles.featureCard,
                  { backgroundColor: step.color + '15' },
                ]}
              >
                <Ionicons name='star' size={24} color={step.color} />
                <RNText
                  style={[styles.featureTitle, { color: colors.text.primary }]}
                >
                  Öneriler
                </RNText>
              </View>
            </View>
          </View>
        );

      case 'preferences':
        return (
          <View style={styles.preferencesContainer}>
            <View style={styles.preferencesSection}>
              <RNText
                style={[styles.sectionTitle, { color: colors.text.primary }]}
              >
                Favori Mutfaklar
              </RNText>
              <View style={styles.preferencesGrid}>
                {cuisinePreferences.map(pref => {
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
                        togglePreference('favoriteCategories', pref.id)
                      }
                    >
                      <RNText style={{ fontSize: 16 }}>{pref.emoji}</RNText>
                      <RNText
                        style={[
                          styles.preferenceLabel,
                          { color: isSelected ? 'white' : colors.text.primary },
                        ]}
                      >
                        {pref.label}
                      </RNText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.preferencesSection}>
              <RNText
                style={[styles.sectionTitle, { color: colors.text.primary }]}
              >
                Mutfak Deneyimi
              </RNText>
              <View style={styles.skillGrid}>
                {skillLevels.map(skill => {
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
                      onPress={() => togglePreference('cookingLevel', skill.id)}
                    >
                      <RNText style={{ fontSize: 16 }}>{skill.emoji}</RNText>
                      <RNText
                        style={[
                          styles.skillLabel,
                          { color: isSelected ? 'white' : colors.text.primary },
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
        );

      case 'ready':
        return (
          <View style={styles.readyContainer}>
            <Animated.View
              style={[
                styles.readyCard,
                {
                  transform: [{ scale: pulseAnimation }],
                  borderColor: step.color + '30',
                },
              ]}
            >
              <View
                style={[
                  styles.readyIcon,
                  { backgroundColor: step.color + '15' },
                ]}
              >
                <Ionicons
                  name='checkmark-circle'
                  size={40}
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
            </Animated.View>
          </View>
        );

      default:
        return null;
    }
  };

  const currentStepData = onboardingSteps[currentStep];
  const isLastStep = currentStep === onboardingSteps.length - 1;
  const canProceed =
    currentStepData.type !== 'preferences' || preferences.cookingLevel !== '';

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBar barStyle='dark-content' backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View
            style={[styles.appLogo, { backgroundColor: currentStepData.color }]}
          >
            <Ionicons name='restaurant' size={20} color='white' />
          </View>
          <RNText style={[styles.appName, { color: colors.text.primary }]}>
            Yemek Bulucu
          </RNText>
        </View>

        <View style={styles.headerRight}>
          <LanguageSelector variant='button' />
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
                  outputRange: ['0%', '100%'],
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
              size={40}
              color='white'
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
            {isLastStep ? 'Başla' : 'Devam Et'}
          </RNText>
          <Ionicons
            name={isLastStep ? 'rocket' : 'arrow-forward'}
            size={18}
            color='white'
          />
        </TouchableOpacity>

        {currentStepData.type === 'preferences' && !canProceed && (
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 0 : 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  appLogo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  appName: {
    fontSize: 16,
    fontWeight: '700',
  },
  skipButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  skipText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Progress
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Content
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },

  // Text
  textContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
    lineHeight: 30,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },

  // Dynamic Content
  dynamicContent: {
    flex: 1,
    justifyContent: 'center',
  },

  // Features - Compact grid
  featuresContainer: {
    gap: 12,
  },
  featureRow: {
    flexDirection: 'row',
    gap: 12,
  },
  featureCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  featureTitle: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Preferences - Compact layout
  preferencesContainer: {
    gap: 20,
  },
  preferencesSection: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  preferencesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  preferenceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    gap: 6,
    minWidth: 80,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  preferenceLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  skillGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  skillChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  skillLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Ready
  readyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  readyCard: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 20,
    gap: 16,
    borderWidth: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  readyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readyTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  readyDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Footer
  footer: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    alignItems: 'center',
    gap: 8,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 24,
    gap: 6,
    minWidth: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  continueText: {
    fontSize: 15,
    fontWeight: '700',
    color: 'white',
  },
  hintText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
});

export default OnboardingScreen;
