import React, { useState, useEffect, useRef } from 'react';
import { Logger } from '../../services/LoggerService';
import {
  View,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  TouchableOpacity,
  Animated,
  StatusBar,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { Text } from '../ui';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { useToast } from '../../contexts/ToastContext';
import { useHaptics } from '../../hooks/useHaptics';
import {
  OnboardingService,
  OnboardingStep,
  OnboardingProgress,
} from '../../services/OnboardingService';
import { spacing, borderRadius } from '../../theme/design-tokens';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface EnhancedOnboardingScreenProps {
  onComplete: () => void;
  onSkip?: () => void;
}

const cuisineOptions = [
  { id: 'turkish', emoji: '🇹🇷', label: 'Türk Mutfağı', color: '#EF4444' },
  { id: 'italian', emoji: '🍝', label: 'İtalyan', color: '#10B981' },
  { id: 'asian', emoji: '🍜', label: 'Asya Mutfağı', color: '#F59E0B' },
  { id: 'mediterranean', emoji: '🫒', label: 'Akdeniz', color: '#06B6D4' },
  { id: 'healthy', emoji: '🥗', label: 'Sağlıklı', color: '#84CC16' },
  { id: 'dessert', emoji: '🍰', label: 'Tatlılar', color: '#EC4899' },
  { id: 'fast', emoji: '⚡', label: 'Hızlı Tarifler', color: '#8B5CF6' },
  { id: 'vegan', emoji: '🌱', label: 'Vegan', color: '#22C55E' },
];

const skillLevels = [
  {
    id: 'başlangıç',
    emoji: '🐣',
    label: 'Başlangıç',
    description: 'Mutfakta yeniyim',
  },
  {
    id: 'orta',
    emoji: '👨‍🍳',
    label: 'Orta',
    description: 'Temel tarifleri yapabilirim',
  },
  {
    id: 'uzman',
    emoji: '⭐',
    label: 'Uzman',
    description: 'Karmaşık tarifler yapabilirim',
  },
];

export const EnhancedOnboardingScreen: React.FC<
  EnhancedOnboardingScreenProps
> = ({ onComplete, onSkip }) => {
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [selectedSkillLevel, setSelectedSkillLevel] = useState<string>('orta');
  const [isLoading, setIsLoading] = useState(true);

  const { colors } = useThemedStyles();
  const { showSuccess } = useToast();
  const haptics = useHaptics();

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(screenWidth)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    initializeOnboarding();
  }, []);

  useEffect(() => {
    if (steps.length > 0) {
      animateStepChange();
    }
  }, [currentStep, steps.length]);

  useEffect(() => {
    // Floating animation for icons
    const floatingAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    floatingAnimation.start();
    return () => floatingAnimation.stop();
  }, []);

  const initializeOnboarding = async () => {
    try {
      const [onboardingSteps, existingProgress] = await Promise.all([
        OnboardingService.getOnboardingSteps(),
        OnboardingService.getProgress(),
      ]);

      setSteps(onboardingSteps);

      if (existingProgress) {
        setProgress(existingProgress);
        setCurrentStep(existingProgress.currentStep);
        setSelectedCuisines(existingProgress.preferences.favoriteCategories);
        setSelectedSkillLevel(existingProgress.preferences.cookingLevel);
      } else {
        const newProgress = await OnboardingService.initializeProgress();
        setProgress(newProgress);
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Failed to initialize onboarding:', error);
      setIsLoading(false);
    }
  };

  const animateStepChange = () => {
    Animated.parallel([
      Animated.timing(progressAnim, {
        toValue: (currentStep + 1) / steps.length,
        duration: 600,
        useNativeDriver: false,
      }),
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  };

  const handleNext = async () => {
    const step = steps[currentStep];
    haptics.selection();

    // Save preferences if on preferences step
    if (step.type === 'preferences' && progress) {
      await OnboardingService.updatePreferences({
        favoriteCategories: selectedCuisines,
        cookingLevel: selectedSkillLevel as any,
      });
    }

    // Complete current step
    await OnboardingService.completeStep(step.id);

    if (currentStep < steps.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      await OnboardingService.setCurrentStep(nextStep);

      // Reset animations for next step
      slideAnim.setValue(screenWidth);
      scaleAnim.setValue(0.8);
    } else {
      // Complete onboarding
      await handleComplete();
    }
  };

  const handleSkip = async () => {
    const step = steps[currentStep];
    haptics.selection();

    if (step.skippable) {
      await OnboardingService.skipStep(step.id);

      if (currentStep < steps.length - 1) {
        const nextStep = currentStep + 1;
        setCurrentStep(nextStep);
        await OnboardingService.setCurrentStep(nextStep);
      } else {
        await handleComplete();
      }
    }
  };

  const handleComplete = async () => {
    try {
      await OnboardingService.completeOnboarding();
      showSuccess('Hoş geldin!', "Artık Yemek Bulucu'yu kullanmaya hazırsın!");
      haptics.success();
      onComplete();
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
    }
  };

  const toggleCuisineSelection = (cuisineId: string) => {
    haptics.selection();
    setSelectedCuisines(prev =>
      prev.includes(cuisineId)
        ? prev.filter(id => id !== cuisineId)
        : [...prev, cuisineId]
    );
  };

  const selectSkillLevel = (levelId: string) => {
    haptics.selection();
    setSelectedSkillLevel(levelId);
  };

  const renderWelcomeStep = (step: OnboardingStep) => (
    <View style={styles.stepContainer}>
      <Animated.View
        style={[
          styles.iconContainer,
          {
            transform: [
              { scale: scaleAnim },
              {
                translateY: floatAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -8],
                }),
              },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={step.gradient as [string, string]}
          style={styles.iconGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name={step.icon as any} size={64} color='white' />
        </LinearGradient>
      </Animated.View>

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <Text
          variant='h1'
          weight='bold'
          align='center'
          style={{ ...styles.title, color: colors.text.primary }}
        >
          {step.title}
        </Text>
        <Text
          variant='bodyLarge'
          align='center'
          style={{ ...styles.subtitle, color: colors.text.secondary }}
        >
          {step.subtitle}
        </Text>
        {step.description && (
          <Text
            variant='body'
            align='center'
            style={{ ...styles.description, color: colors.text.tertiary }}
          >
            {step.description}
          </Text>
        )}

        {step.tips && (
          <View style={styles.tipsContainer}>
            {step.tips.map((tip, index) => (
              <View
                key={index}
                style={[
                  styles.tipItem,
                  { backgroundColor: colors.surface.secondary },
                ]}
              >
                <Ionicons
                  name='checkmark-circle'
                  size={20}
                  color={step.color}
                />
                <Text
                  variant='bodySmall'
                  style={{
                    color: colors.text.secondary,
                    marginLeft: spacing[2],
                  }}
                >
                  {tip}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Animated.View>
    </View>
  );

  const renderFeatureStep = (step: OnboardingStep) => (
    <View style={styles.stepContainer}>
      <Animated.View
        style={[
          styles.iconContainer,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <LinearGradient
          colors={step.gradient as [string, string]}
          style={styles.iconGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Ionicons name={step.icon as any} size={64} color='white' />
        </LinearGradient>
      </Animated.View>

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        <Text
          variant='h2'
          weight='bold'
          align='center'
          style={{ ...styles.title, color: colors.text.primary }}
        >
          {step.title}
        </Text>
        <Text
          variant='bodyLarge'
          align='center'
          style={{ ...styles.subtitle, color: colors.text.secondary }}
        >
          {step.subtitle}
        </Text>

        {step.features && (
          <View style={styles.featuresContainer}>
            {step.features.map((feature, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.featureItem,
                  { backgroundColor: colors.surface.secondary },
                  {
                    opacity: fadeAnim,
                    transform: [
                      {
                        translateX: slideAnim.interpolate({
                          inputRange: [0, screenWidth],
                          outputRange: [0, screenWidth * 0.5],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <View
                  style={[
                    styles.featureIcon,
                    { backgroundColor: step.color + '20' },
                  ]}
                >
                  <Ionicons name='star' size={16} color={step.color} />
                </View>
                <Text
                  variant='bodyMedium'
                  style={{ color: colors.text.primary, marginLeft: spacing[3] }}
                >
                  {feature}
                </Text>
              </Animated.View>
            ))}
          </View>
        )}
      </Animated.View>
    </View>
  );

  const renderPreferencesStep = (step: OnboardingStep) => (
    <ScrollView
      style={styles.scrollContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.stepContainer}>
        <View style={styles.preferencesHeader}>
          <Ionicons name={step.icon as any} size={48} color={step.color} />
          <Text
            variant='h2'
            weight='bold'
            align='center'
            style={{ ...styles.title, color: colors.text.primary }}
          >
            {step.title}
          </Text>
          <Text
            variant='bodyLarge'
            align='center'
            style={{ ...styles.subtitle, color: colors.text.secondary }}
          >
            {step.subtitle}
          </Text>
        </View>

        {/* Cuisine Preferences */}
        <View style={styles.preferenceSection}>
          <Text
            variant='h4'
            weight='600'
            style={{ color: colors.text.primary, marginBottom: spacing[3] }}
          >
            Favori Mutfakların
          </Text>
          <View style={styles.cuisineGrid}>
            {cuisineOptions.map(cuisine => (
              <TouchableOpacity
                key={cuisine.id}
                style={[
                  styles.cuisineOption,
                  { backgroundColor: colors.surface.secondary },
                  selectedCuisines.includes(cuisine.id) && {
                    backgroundColor: cuisine.color + '20',
                    borderColor: cuisine.color,
                    borderWidth: 2,
                  },
                ]}
                onPress={() => toggleCuisineSelection(cuisine.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.cuisineEmoji}>{cuisine.emoji}</Text>
                <Text
                  variant='bodySmall'
                  weight={selectedCuisines.includes(cuisine.id) ? '600' : '400'}
                  style={{
                    color: selectedCuisines.includes(cuisine.id)
                      ? cuisine.color
                      : colors.text.secondary,
                    textAlign: 'center',
                  }}
                >
                  {cuisine.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Skill Level */}
        <View style={styles.preferenceSection}>
          <Text
            variant='h4'
            weight='600'
            style={{ color: colors.text.primary, marginBottom: spacing[3] }}
          >
            Mutfak Deneyimin
          </Text>
          <View style={styles.skillLevelContainer}>
            {skillLevels.map(level => (
              <TouchableOpacity
                key={level.id}
                style={[
                  styles.skillLevelOption,
                  { backgroundColor: colors.surface.secondary },
                  selectedSkillLevel === level.id && {
                    backgroundColor: step.color + '20',
                    borderColor: step.color,
                    borderWidth: 2,
                  },
                ]}
                onPress={() => selectSkillLevel(level.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.skillEmoji}>{level.emoji}</Text>
                <Text
                  variant='bodyMedium'
                  weight='600'
                  style={{
                    color:
                      selectedSkillLevel === level.id
                        ? step.color
                        : colors.text.primary,
                  }}
                >
                  {level.label}
                </Text>
                <Text
                  variant='caption'
                  style={{
                    color:
                      selectedSkillLevel === level.id
                        ? step.color
                        : colors.text.secondary,
                  }}
                >
                  {level.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );

  const renderCurrentStep = () => {
    if (isLoading || steps.length === 0) {
      return <View style={styles.loadingContainer} />;
    }

    const step = steps[currentStep];

    switch (step.type) {
      case 'welcome':
      case 'completion':
        return renderWelcomeStep(step);
      case 'feature-discovery':
      case 'tutorial':
        return renderFeatureStep(step);
      case 'preferences':
        return renderPreferencesStep(step);
      default:
        return renderWelcomeStep(step);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: colors.background.primary },
        ]}
      >
        <View style={styles.loadingContainer}>
          <Text variant='body' color='secondary'>
            Yükleniyor...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentStepData = steps[currentStep];

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background.primary }]}
    >
      <StatusBar
        barStyle='dark-content'
        backgroundColor={colors.background.primary}
      />

      {/* Progress Bar */}
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
                backgroundColor: currentStepData?.color || colors.primary[500],
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
        <Text
          variant='caption'
          style={{ color: colors.text.tertiary, marginTop: spacing[1] }}
        >
          {currentStep + 1} / {steps.length}
        </Text>
      </View>

      {/* Step Content */}
      <View style={styles.contentContainer}>{renderCurrentStep()}</View>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        <View style={styles.buttonRow}>
          {currentStepData?.skippable && (
            <TouchableOpacity
              style={[styles.skipButton, { borderColor: colors.neutral[300] }]}
              onPress={handleSkip}
              activeOpacity={0.7}
            >
              <Text
                variant='bodyMedium'
                weight='500'
                style={{ color: colors.text.secondary }}
              >
                Atla
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.nextButton,
              { flex: currentStepData?.skippable ? 1 : undefined },
            ]}
            onPress={handleNext}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={
                (currentStepData?.gradient || [
                  colors.primary[500],
                  colors.primary[600],
                ]) as [string, string]
              }
              style={styles.nextButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text
                variant='bodyMedium'
                weight='600'
                style={{ color: 'white' }}
              >
                {currentStep === steps.length - 1 ? 'Başla' : 'Devam'}
              </Text>
              <Ionicons name='arrow-forward' size={18} color='white' />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* Skip All Option */}
      {onSkip && currentStep === 0 && (
        <TouchableOpacity
          style={styles.skipAllButton}
          onPress={onSkip}
          activeOpacity={0.7}
        >
          <Text variant='caption' style={{ color: colors.text.tertiary }}>
            Daha sonra göster
          </Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    paddingHorizontal: spacing[6],
    paddingTop: spacing[4],
    alignItems: 'center',
  },
  progressTrack: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: spacing[6],
  },
  scrollContainer: {
    flex: 1,
  },
  stepContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[6],
  },
  iconContainer: {
    marginBottom: spacing[8],
  },
  iconGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  title: {
    marginBottom: spacing[3],
    textAlign: 'center',
  },
  subtitle: {
    marginBottom: spacing[4],
    textAlign: 'center',
    lineHeight: 24,
  },
  description: {
    marginBottom: spacing[6],
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing[2],
  },
  tipsContainer: {
    width: '100%',
    gap: spacing[2],
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    borderRadius: borderRadius.md,
  },
  featuresContainer: {
    width: '100%',
    gap: spacing[3],
    marginTop: spacing[4],
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    borderRadius: borderRadius.lg,
  },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preferencesHeader: {
    alignItems: 'center',
    marginBottom: spacing[6],
  },
  preferenceSection: {
    width: '100%',
    marginBottom: spacing[6],
  },
  cuisineGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  cuisineOption: {
    width: (screenWidth - spacing[6] * 2 - spacing[2] * 3) / 4,
    aspectRatio: 1,
    padding: spacing[2],
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cuisineEmoji: {
    fontSize: 24,
    marginBottom: spacing[1],
  },
  skillLevelContainer: {
    gap: spacing[3],
  },
  skillLevelOption: {
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  skillEmoji: {
    fontSize: 32,
    marginBottom: spacing[2],
  },
  actionContainer: {
    paddingHorizontal: spacing[6],
    paddingBottom: Platform.OS === 'ios' ? spacing[8] : spacing[6],
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  skipButton: {
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[6],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
  },
  nextButton: {
    minWidth: 160,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  nextButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[6],
    gap: spacing[2],
  },
  skipAllButton: {
    position: 'absolute',
    bottom: spacing[4],
    alignSelf: 'center',
    padding: spacing[2],
  },
});
