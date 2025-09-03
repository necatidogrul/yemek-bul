import React, { useState, useRef, useEffect } from 'react';
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
  Image,
  ScrollView,
  Platform,
} from 'react-native';
import { Logger } from '../services/LoggerService';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { HomeStackParamList, FavoritesStackParamList } from '../../App';
import { Recipe } from '../types/Recipe';
import { SpeechService } from '../services/speechService';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

// UI Components
import { Button, Text } from '../components/ui';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { spacing } from '../theme/design-tokens';
import { borderRadius, shadows } from '../theme/design-tokens';
import { FavoriteButton } from '../components/ui/FavoriteButton';
import { RecipeQAModal } from '../components/modals/RecipeQAModal';
import { useToast } from '../contexts/ToastContext';
import { useHaptics } from '../hooks/useHaptics';
import { usePremiumGuard } from '../hooks/usePremiumGuard';
import { useTranslation } from '../hooks/useTranslation';

// Services
import { OpenAIService } from '../services/openaiService';
import { RecipeService } from '../services/recipeService';
import { UsageLimitService } from '../services/UsageLimitService';
import { usePremium } from '../contexts/PremiumContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Route params type
type RecipeDetailParams = {
  recipeId: string;
  recipeName: string;
  recipe?: Recipe;
  isAiGenerated?: boolean;
};

type RecipeDetailScreenProps = {
  navigation:
    | StackNavigationProp<HomeStackParamList, 'RecipeDetail'>
    | StackNavigationProp<FavoritesStackParamList, 'RecipeDetail'>;
  route: RouteProp<{ RecipeDetail: RecipeDetailParams }, 'RecipeDetail'>;
};

const RecipeDetailScreen: React.FC<RecipeDetailScreenProps> = ({
  navigation,
  route,
}) => {
  // Route params
  const recipeId = route.params?.recipeId;
  const recipeName = route.params?.recipeName;
  const initialRecipe = route.params?.recipe as Recipe | undefined;
  const isAiGenerated = route.params?.isAiGenerated || false;

  // State
  const [recipe, setRecipe] = useState<Recipe | undefined>(initialRecipe);
  const [isLoadingRecipe, setIsLoadingRecipe] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showQAModal, setShowQAModal] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'ingredients' | 'instructions' | 'nutrition'
  >('ingredients');
  const [servingSize, setServingSize] = useState(recipe?.servings || 4);
  const [checkedIngredients, setCheckedIngredients] = useState<boolean[]>([]);
  const [imageLoading, setImageLoading] = useState(true);
  const [isCookingMode, setIsCookingMode] = useState(false);

  // Hooks
  const { colors } = useThemedStyles();
  const { showSuccess, showError } = useToast();
  const haptics = useHaptics();
  const { t } = useTranslation();
  const { isPremium } = usePremium();

  // Premium guards
  const exportGuard = usePremiumGuard({
    feature: 'exportRecipes',
    title: 'PDF Export',
  });

  const aiQuestionGuard = usePremiumGuard({
    feature: 'unlimitedRecipes',
    title: 'AI Assistant',
  });

  // Animations
  const scrollY = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  // Interpolations
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 150],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const imageScale = scrollY.interpolate({
    inputRange: [-100, 0, 100],
    outputRange: [1.5, 1, 0.9],
    extrapolate: 'clamp',
  });

  const imageOpacity = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // Load recipe if needed
  useEffect(() => {
    const loadRecipeDetails = async () => {
      if (
        recipeId &&
        (!recipe || !recipe.instructions || !recipe.ingredients)
      ) {
        setIsLoadingRecipe(true);
        try {
          const fullRecipe = await RecipeService.getRecipeById(recipeId);
          if (fullRecipe) {
            setRecipe(fullRecipe);
          }
        } catch (error) {
          Logger.error('Failed to load recipe:', error);
          showError(t('errors.recipe'));
        } finally {
          setIsLoadingRecipe(false);
        }
      }
    };

    loadRecipeDetails();
  }, [recipeId]);

  // Initialize animations
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        delay: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 20,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Initialize checked ingredients
  useEffect(() => {
    if (recipe?.ingredients) {
      setCheckedIngredients(new Array(recipe.ingredients.length).fill(false));
      setServingSize(recipe.servings || 4);
    }
  }, [recipe]);

  // Handlers
  const handleShare = async () => {
    try {
      await Share.share({
        message: `${recipe?.name}\n\n${t('recipe.ingredients')}:\n${recipe?.ingredients?.join('\n')}\n\n${t('recipe.instructions')}:\n${recipe?.instructions?.join('\n\n')}`,
        title: recipe?.name,
      });
      haptics.notificationSuccess();
    } catch (error) {
      Logger.error('Share failed:', error);
    }
  };

  const handleExportPDF = () => {
    if (!exportGuard.hasAccess) {
      exportGuard.requirePremium();
      return;
    }
    showSuccess(t('success.pdfExportComingSoon'));
    haptics.notificationSuccess();
  };

  const handleQAOpen = () => {
    if (!aiQuestionGuard.hasAccess) {
      aiQuestionGuard.requirePremium();
      return;
    }
    setShowQAModal(true);
    haptics.selection();
  };

  const handleAskQuestion = async (question: string): Promise<string> => {
    try {
      if (!aiQuestionGuard.hasAccess) {
        aiQuestionGuard.requirePremium();
        throw new Error('Premium required');
      }

      const canMakeRequest = await UsageLimitService.canMakeRequest(
        isPremium,
        'question'
      );

      if (!canMakeRequest) {
        const limitStatus = await UsageLimitService.checkLimitStatus(isPremium);
        if (limitStatus.isDailyLimitReached) {
          showError(t('errors.dailyLimitReached'));
        } else if (limitStatus.isMonthlyLimitReached) {
          showError(t('errors.monthlyLimitReached'));
        } else {
          showError(t('errors.insufficientQuota', { required: 2 }));
        }
        throw new Error('Limit reached');
      }

      const answer = await OpenAIService.askRecipeQuestion(recipe, question);
      await UsageLimitService.useRequest(isPremium, 'question');

      const remaining = await UsageLimitService.getRemainingRequests(isPremium);
      showSuccess(
        isPremium
          ? t('success.aiResponseWithQuota', {
              dailyRemaining: remaining.daily,
              monthlyRemaining: remaining.monthly,
            })
          : t('success.aiResponseWithDailyQuota', {
              remaining: remaining.daily,
            })
      );

      return answer;
    } catch (error: any) {
      Logger.error('Recipe Q&A failed:', error);
      if (
        error?.message !== 'Limit reached' &&
        error?.message !== 'Premium required'
      ) {
        showError(t('errors.questionAnswerFailed'));
      }
      throw error;
    }
  };

  const toggleIngredient = (index: number) => {
    const newChecked = [...checkedIngredients];
    newChecked[index] = !newChecked[index];
    setCheckedIngredients(newChecked);
    haptics.selection();
  };

  const startCooking = () => {
    setIsCookingMode(true);
    setCurrentStep(0);
    setActiveTab('instructions');
    haptics.notificationSuccess();
    showSuccess(t('success.cookingStarted'));
  };

  const nextStep = () => {
    if (currentStep < (recipe?.instructions?.length || 0) - 1) {
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
    if (!recipe?.instructions?.[currentStep]) return;

    setIsPlaying(true);
    try {
      await SpeechService.speak(recipe.instructions[currentStep], {
        language: 'tr-TR',
      });
    } catch (error) {
      Logger.error('Speech failed:', error);
    } finally {
      setIsPlaying(false);
    }
  };

  // Calculate nutrition values
  const nutritionData = [
    {
      label: 'Kalori',
      value: 280,
      unit: 'kcal',
      color: colors.semantic.error,
      icon: 'fire',
    },
    {
      label: 'Protein',
      value: 18,
      unit: 'g',
      color: colors.primary[500],
      icon: 'dumbbell',
    },
    {
      label: 'Karbonhidrat',
      value: 35,
      unit: 'g',
      color: colors.semantic.warning,
      icon: 'grain',
    },
    {
      label: 'Yağ',
      value: 12,
      unit: 'g',
      color: colors.info[500],
      icon: 'water',
    },
  ];

  // Loading state
  if (!recipe || isLoadingRecipe) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: colors.background.primary },
        ]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size='large' color={colors.primary[500]} />
          <Text
            variant='bodyLarge'
            color='secondary'
            style={{ marginTop: spacing[4] }}
          >
            {t('common.loading')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: colors.background.primary }]}
    >
      <StatusBar barStyle='dark-content' />

      {/* Fixed Header */}
      <Animated.View
        style={[
          styles.fixedHeader,
          {
            backgroundColor: colors.background.primary,
            opacity: headerOpacity,
            borderBottomColor: colors.border.light,
          },
        ]}
      >
        <SafeAreaView style={styles.headerSafeArea}>
          <View style={styles.headerContent}>
            <TouchableOpacity
              style={[styles.headerButton, { backgroundColor: colors.surface }]}
              onPress={() => navigation.goBack()}
            >
              <Ionicons
                name='arrow-back'
                size={24}
                color={colors.text.primary}
              />
            </TouchableOpacity>

            <Text
              variant='headlineLarge'
              weight='bold'
              numberOfLines={1}
              style={{
                flex: 1,
                textAlign: 'center',
                marginHorizontal: spacing[3],
              }}
            >
              {recipe.name}
            </Text>

            <View style={styles.headerActions}>
              <FavoriteButton recipe={recipe} size='medium' />
            </View>
          </View>
        </SafeAreaView>
      </Animated.View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        bounces={true}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >
        {/* Hero Section */}
        <Animated.View
          style={[
            styles.heroSection,
            {
              transform: [{ scale: imageScale }],
              opacity: imageOpacity,
            },
          ]}
        >
          {recipe.imageUrl ? (
            <>
              <Image
                source={{ uri: recipe.imageUrl }}
                style={styles.heroImage}
                resizeMode='cover'
                onLoadStart={() => setImageLoading(true)}
                onLoadEnd={() => setImageLoading(false)}
              />
              {imageLoading && (
                <View style={styles.imageLoader}>
                  <ActivityIndicator size='large' color='white' />
                </View>
              )}
            </>
          ) : (
            <LinearGradient
              colors={[colors.primary[400], colors.primary[600]]}
              style={styles.heroImage}
            >
              <Ionicons name='restaurant' size={80} color='white' />
            </LinearGradient>
          )}

          {/* Gradient Overlay */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles.gradientOverlay}
          />

          {/* Hero Content */}
          <View style={styles.heroContent}>
            <TouchableOpacity
              style={[
                styles.floatingButton,
                { backgroundColor: 'rgba(255,255,255,0.2)' },
              ]}
              onPress={() => navigation.goBack()}
            >
              <BlurView intensity={80} style={styles.blurButton}>
                <Ionicons name='arrow-back' size={24} color='white' />
              </BlurView>
            </TouchableOpacity>

            <View style={styles.heroInfo}>
              <Animated.View
                style={{
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                }}
              >
                <Text
                  variant='displaySmall'
                  weight='bold'
                  style={styles.heroTitle}
                >
                  {recipe.name}
                </Text>

                <View style={styles.heroStats}>
                  <View style={styles.statChip}>
                    <Ionicons name='time-outline' size={16} color='white' />
                    <Text variant='labelMedium' style={styles.statText}>
                      {recipe.cookingTime || recipe.preparationTime || 30} dk
                    </Text>
                  </View>

                  <View style={styles.statChip}>
                    <Ionicons name='people-outline' size={16} color='white' />
                    <Text variant='labelMedium' style={styles.statText}>
                      {recipe.servings || 4} kişilik
                    </Text>
                  </View>

                  {recipe.difficulty && (
                    <View
                      style={[
                        styles.statChip,
                        {
                          backgroundColor:
                            recipe.difficulty === 'kolay'
                              ? 'rgba(76, 175, 80, 0.3)'
                              : recipe.difficulty === 'orta'
                                ? 'rgba(255, 152, 0, 0.3)'
                                : 'rgba(244, 67, 54, 0.3)',
                        },
                      ]}
                    >
                      <Text variant='labelMedium' style={styles.statText}>
                        {recipe.difficulty}
                      </Text>
                    </View>
                  )}
                </View>
              </Animated.View>
            </View>
          </View>
        </Animated.View>

        {/* Content Container */}
        <View
          style={[
            styles.contentContainer,
            { backgroundColor: colors.background.primary },
          ]}
        >
          {/* Quick Actions */}
          <Animated.View
            style={[
              styles.quickActions,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
              },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.actionCard,
                { backgroundColor: colors.primary[500] },
              ]}
              onPress={startCooking}
            >
              <LinearGradient
                colors={[colors.primary[400], colors.primary[600]]}
                style={styles.actionCardGradient}
              >
                <Ionicons name='play-circle' size={32} color='white' />
                <Text
                  variant='labelLarge'
                  weight='semibold'
                  style={{ color: 'white' }}
                >
                  Pişirmeye Başla
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.surface }]}
              onPress={handleQAOpen}
            >
              <View style={styles.actionCardContent}>
                <View style={styles.aiIndicator}>
                  <MaterialCommunityIcons
                    name='robot'
                    size={24}
                    color={colors.primary[500]}
                  />
                  {!aiQuestionGuard.hasAccess && (
                    <View style={styles.premiumBadge}>
                      <Ionicons name='star' size={10} color='white' />
                    </View>
                  )}
                </View>
                <Text variant='labelMedium' weight='medium' color='primary'>
                  AI Asistan
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionCard, { backgroundColor: colors.surface }]}
              onPress={handleShare}
            >
              <View style={styles.actionCardContent}>
                <Ionicons
                  name='share-outline'
                  size={24}
                  color={colors.text.primary}
                />
                <Text variant='labelMedium' weight='medium'>
                  Paylaş
                </Text>
              </View>
            </TouchableOpacity>
          </Animated.View>

          {/* Tab Navigation */}
          <View
            style={[styles.tabContainer, { backgroundColor: colors.surface }]}
          >
            {['ingredients', 'instructions', 'nutrition'].map(tab => (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.tab,
                  activeTab === tab && [
                    styles.activeTab,
                    { backgroundColor: colors.primary[100] },
                  ],
                ]}
                onPress={() => {
                  setActiveTab(tab as any);
                  haptics.selection();
                }}
              >
                <Ionicons
                  name={
                    tab === 'ingredients'
                      ? 'basket-outline'
                      : tab === 'instructions'
                        ? 'list-outline'
                        : 'nutrition-outline'
                  }
                  size={20}
                  color={
                    activeTab === tab
                      ? colors.primary[500]
                      : colors.text.secondary
                  }
                />
                <Text
                  variant='labelMedium'
                  weight={activeTab === tab ? 'semibold' : 'normal'}
                  color={activeTab === tab ? 'primary' : 'secondary'}
                >
                  {tab === 'ingredients'
                    ? 'Malzemeler'
                    : tab === 'instructions'
                      ? 'Yapılışı'
                      : 'Besin Değeri'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tab Content */}
          <Animated.View
            style={[
              styles.tabContent,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Ingredients Tab */}
            {activeTab === 'ingredients' && (
              <View style={styles.section}>
                {/* Serving Adjuster */}
                <View
                  style={[
                    styles.servingAdjuster,
                    { backgroundColor: colors.surface },
                  ]}
                >
                  <Text variant='headlineMedium' weight='semibold'>
                    Porsiyon Sayısı
                  </Text>
                  <View style={styles.servingControls}>
                    <TouchableOpacity
                      style={[
                        styles.servingButton,
                        { backgroundColor: colors.primary[100] },
                      ]}
                      onPress={() =>
                        servingSize > 1 && setServingSize(servingSize - 1)
                      }
                      disabled={servingSize <= 1}
                    >
                      <Ionicons
                        name='remove'
                        size={20}
                        color={colors.primary[500]}
                      />
                    </TouchableOpacity>
                    <Text
                      variant='headlineLarge'
                      weight='bold'
                      style={{ minWidth: 40, textAlign: 'center' }}
                    >
                      {servingSize}
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.servingButton,
                        { backgroundColor: colors.primary[100] },
                      ]}
                      onPress={() => setServingSize(servingSize + 1)}
                    >
                      <Ionicons
                        name='add'
                        size={20}
                        color={colors.primary[500]}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Ingredients List */}
                <View style={styles.ingredientsList}>
                  {recipe.ingredients?.map((ingredient, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.ingredientItem,
                        {
                          backgroundColor: checkedIngredients[index]
                            ? colors.primary[50]
                            : colors.surface,
                          borderColor: checkedIngredients[index]
                            ? colors.primary[200]
                            : colors.border.light,
                        },
                      ]}
                      onPress={() => toggleIngredient(index)}
                    >
                      <View
                        style={[
                          styles.checkbox,
                          {
                            backgroundColor: checkedIngredients[index]
                              ? colors.primary[500]
                              : 'transparent',
                            borderColor: checkedIngredients[index]
                              ? colors.primary[500]
                              : colors.border.medium,
                          },
                        ]}
                      >
                        {checkedIngredients[index] && (
                          <Ionicons name='checkmark' size={16} color='white' />
                        )}
                      </View>
                      <Text
                        variant='bodyLarge'
                        style={[
                          styles.ingredientText,
                          checkedIngredients[index] ? styles.checkedText : null,
                        ].filter(Boolean)}
                      >
                        {ingredient}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Progress Indicator */}
                <View
                  style={[
                    styles.progressCard,
                    { backgroundColor: colors.surface },
                  ]}
                >
                  <View style={styles.progressHeader}>
                    <Text variant='labelLarge' weight='medium'>
                      Hazırlık İlerlemesi
                    </Text>
                    <Text variant='labelMedium' color='secondary'>
                      {checkedIngredients.filter(Boolean).length}/
                      {checkedIngredients.length}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.progressBar,
                      { backgroundColor: colors.neutral[100] },
                    ]}
                  >
                    <View
                      style={[
                        styles.progressFill,
                        {
                          backgroundColor: colors.primary[500],
                          width: `${(checkedIngredients.filter(Boolean).length / checkedIngredients.length) * 100}%`,
                        },
                      ]}
                    />
                  </View>
                </View>
              </View>
            )}

            {/* Instructions Tab */}
            {activeTab === 'instructions' && (
              <View style={styles.section}>
                {isCookingMode ? (
                  <>
                    {/* Cooking Mode Header */}
                    <View
                      style={[
                        styles.cookingHeader,
                        { backgroundColor: colors.primary[50] },
                      ]}
                    >
                      <View style={styles.cookingInfo}>
                        <Text
                          variant='headlineMedium'
                          weight='bold'
                          color='primary'
                        >
                          Pişirme Modu
                        </Text>
                        <Text variant='labelMedium' color='secondary'>
                          Adım {currentStep + 1} /{' '}
                          {recipe.instructions?.length || 0}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[
                          styles.exitButton,
                          { backgroundColor: colors.semantic.error },
                        ]}
                        onPress={() => {
                          setIsCookingMode(false);
                          haptics.selection();
                        }}
                      >
                        <Ionicons name='close' size={20} color='white' />
                      </TouchableOpacity>
                    </View>

                    {/* Current Step */}
                    <View
                      style={[
                        styles.stepCard,
                        { backgroundColor: colors.surface },
                      ]}
                    >
                      <View style={styles.stepNumber}>
                        <Text
                          variant='displaySmall'
                          weight='bold'
                          color='primary'
                        >
                          {currentStep + 1}
                        </Text>
                      </View>
                      <Text variant='bodyLarge' style={styles.stepText}>
                        {recipe.instructions?.[currentStep]}
                      </Text>

                      <View style={styles.stepActions}>
                        <TouchableOpacity
                          style={[
                            styles.audioButton,
                            { backgroundColor: colors.primary[100] },
                          ]}
                          onPress={playStepAudio}
                          disabled={isPlaying}
                        >
                          {isPlaying ? (
                            <ActivityIndicator
                              size='small'
                              color={colors.primary[500]}
                            />
                          ) : (
                            <Ionicons
                              name='volume-high'
                              size={24}
                              color={colors.primary[500]}
                            />
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Step Navigation */}
                    <View style={styles.stepNavigation}>
                      <TouchableOpacity
                        style={[
                          styles.navButton,
                          {
                            backgroundColor:
                              currentStep === 0
                                ? colors.neutral[100]
                                : colors.primary[100],
                            opacity: currentStep === 0 ? 0.5 : 1,
                          },
                        ]}
                        onPress={previousStep}
                        disabled={currentStep === 0}
                      >
                        <Ionicons
                          name='chevron-back'
                          size={24}
                          color={
                            currentStep === 0
                              ? colors.neutral[400]
                              : colors.primary[500]
                          }
                        />
                        <Text
                          variant='labelLarge'
                          weight='medium'
                          color={currentStep === 0 ? 'disabled' : 'primary'}
                        >
                          Önceki
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.navButton,
                          {
                            backgroundColor:
                              currentStep ===
                              (recipe.instructions?.length || 0) - 1
                                ? colors.semantic.success + '20'
                                : colors.primary[500],
                          },
                        ]}
                        onPress={
                          currentStep === (recipe.instructions?.length || 0) - 1
                            ? () => {
                                setIsCookingMode(false);
                                showSuccess('Tebrikler! Tarif tamamlandı 🎉');
                                haptics.notificationSuccess();
                              }
                            : nextStep
                        }
                      >
                        <Text
                          variant='labelLarge'
                          weight='medium'
                          style={{
                            color:
                              currentStep ===
                              (recipe.instructions?.length || 0) - 1
                                ? colors.semantic.success
                                : 'white',
                          }}
                        >
                          {currentStep ===
                          (recipe.instructions?.length || 0) - 1
                            ? 'Tamamla'
                            : 'Sonraki'}
                        </Text>
                        <Ionicons
                          name={
                            currentStep ===
                            (recipe.instructions?.length || 0) - 1
                              ? 'checkmark-circle'
                              : 'chevron-forward'
                          }
                          size={24}
                          color={
                            currentStep ===
                            (recipe.instructions?.length || 0) - 1
                              ? colors.semantic.success
                              : 'white'
                          }
                        />
                      </TouchableOpacity>
                    </View>

                    {/* Progress Dots */}
                    <View style={styles.progressDots}>
                      {recipe.instructions?.map((_, index) => (
                        <View
                          key={index}
                          style={[
                            styles.dot,
                            {
                              backgroundColor:
                                index <= currentStep
                                  ? colors.primary[500]
                                  : colors.neutral[200],
                              width: index === currentStep ? 24 : 8,
                            },
                          ]}
                        />
                      ))}
                    </View>
                  </>
                ) : (
                  <>
                    {/* Instructions List */}
                    <View style={styles.instructionsList}>
                      {recipe.instructions?.map((instruction, index) => (
                        <View
                          key={index}
                          style={[
                            styles.instructionItem,
                            { backgroundColor: colors.surface },
                          ]}
                        >
                          <View
                            style={[
                              styles.instructionNumber,
                              { backgroundColor: colors.primary[100] },
                            ]}
                          >
                            <Text
                              variant='headlineMedium'
                              weight='bold'
                              color='primary'
                            >
                              {index + 1}
                            </Text>
                          </View>
                          <Text
                            variant='bodyLarge'
                            style={styles.instructionText}
                          >
                            {instruction}
                          </Text>
                        </View>
                      ))}
                    </View>

                    {/* Start Cooking Button */}
                    <TouchableOpacity
                      style={[
                        styles.startCookingButton,
                        { backgroundColor: colors.primary[500] },
                      ]}
                      onPress={startCooking}
                    >
                      <LinearGradient
                        colors={[colors.primary[400], colors.primary[600]]}
                        style={styles.startCookingGradient}
                      >
                        <Ionicons name='play-circle' size={28} color='white' />
                        <Text
                          variant='headlineMedium'
                          weight='bold'
                          style={{ color: 'white' }}
                        >
                          Adım Adım Pişirme Modunu Başlat
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}

            {/* Nutrition Tab */}
            {activeTab === 'nutrition' && (
              <View style={styles.section}>
                <View style={styles.nutritionGrid}>
                  {nutritionData.map((item, index) => (
                    <View
                      key={index}
                      style={[
                        styles.nutritionCard,
                        { backgroundColor: colors.surface },
                      ]}
                    >
                      <View
                        style={[
                          styles.nutritionIcon,
                          { backgroundColor: item.color + '20' },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name={item.icon as any}
                          size={24}
                          color={item.color}
                        />
                      </View>
                      <Text
                        variant='displaySmall'
                        weight='bold'
                        style={{ color: item.color }}
                      >
                        {item.value}
                      </Text>
                      <Text variant='labelMedium' color='secondary'>
                        {item.unit}
                      </Text>
                      <Text variant='labelSmall' weight='medium'>
                        {item.label}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Daily Values */}
                <View
                  style={[
                    styles.dailyValuesCard,
                    { backgroundColor: colors.surface },
                  ]}
                >
                  <Text
                    variant='headlineMedium'
                    weight='semibold'
                    style={{ marginBottom: spacing[4] }}
                  >
                    Günlük Değerler (%)
                  </Text>
                  {nutritionData.map((item, index) => (
                    <View key={index} style={styles.dailyValueRow}>
                      <Text variant='bodyMedium'>{item.label}</Text>
                      <View style={styles.dailyValueBarContainer}>
                        <View
                          style={[
                            styles.dailyValueBar,
                            { backgroundColor: colors.neutral[100] },
                          ]}
                        >
                          <View
                            style={[
                              styles.dailyValueFill,
                              {
                                backgroundColor: item.color,
                                width: `${Math.min((item.value / 200) * 100, 100)}%`,
                              },
                            ]}
                          />
                        </View>
                        <Text
                          variant='labelSmall'
                          weight='medium'
                          style={{ marginLeft: spacing[2] }}
                        >
                          {Math.round((item.value / 200) * 100)}%
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>

                {/* Nutrition Info */}
                <View
                  style={[
                    styles.infoCard,
                    { backgroundColor: colors.info[50] },
                  ]}
                >
                  <Ionicons
                    name='information-circle'
                    size={20}
                    color={colors.info[500]}
                  />
                  <Text
                    variant='bodySmall'
                    color='secondary'
                    style={{ flex: 1, marginLeft: spacing[2] }}
                  >
                    Besin değerleri yaklaşık hesaplamalardır ve kullanılan
                    malzemelere göre değişebilir.
                  </Text>
                </View>
              </View>
            )}
          </Animated.View>
        </View>
      </Animated.ScrollView>

      {/* Bottom Action Bar */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border.light,
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.bottomAction, { backgroundColor: colors.surface }]}
          onPress={handleExportPDF}
        >
          <Ionicons
            name='document-text-outline'
            size={24}
            color={
              exportGuard.hasAccess
                ? colors.text.primary
                : colors.text.secondary
            }
          />
          {!exportGuard.hasAccess && (
            <View style={styles.bottomBadge}>
              <Ionicons name='star' size={10} color='white' />
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.bottomMainAction}>
          <FavoriteButton recipe={recipe} size='large' style={{ flex: 1 }} />
        </View>

        <TouchableOpacity
          style={[styles.bottomAction, { backgroundColor: colors.surface }]}
          onPress={handleShare}
        >
          <Ionicons
            name='share-social-outline'
            size={24}
            color={colors.text.primary}
          />
        </TouchableOpacity>
      </View>

      {/* QA Modal */}
      {showQAModal && (
        <RecipeQAModal
          visible={showQAModal}
          onClose={() => setShowQAModal(false)}
          recipe={recipe}
          onAskQuestion={handleAskQuestion}
        />
      )}
    </View>
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

  // Fixed Header
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    borderBottomWidth: 1,
  },
  headerSafeArea: {
    paddingTop: Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },

  // Hero Section
  heroSection: {
    height: SCREEN_HEIGHT * 0.4,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageLoader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '70%',
  },
  heroContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing[5],
    justifyContent: 'space-between',
  },
  floatingButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    marginTop: Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0,
  },
  blurButton: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroInfo: {
    marginBottom: spacing[4],
  },
  heroTitle: {
    color: 'white',
    marginBottom: spacing[3],
  },
  heroStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: borderRadius.full,
  },
  statText: {
    color: 'white',
  },

  // Content Container
  contentContainer: {
    marginTop: -spacing[8],
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingTop: spacing[6],
    minHeight: SCREEN_HEIGHT * 0.7,
  },

  // Quick Actions
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: spacing[5],
    marginBottom: spacing[5],
    gap: spacing[3],
  },
  actionCard: {
    flex: 1,
    height: 80,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.md,
  },
  actionCardGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
  },
  actionCardContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
  },
  aiIndicator: {
    position: 'relative',
  },
  premiumBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Tabs
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: spacing[5],
    marginBottom: spacing[4],
    padding: spacing[1],
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.base,
  },
  activeTab: {
    ...shadows.xs,
  },
  tabContent: {
    paddingHorizontal: spacing[5],
  },

  // Section
  section: {
    marginBottom: spacing[10],
  },

  // Serving Adjuster
  servingAdjuster: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[5],
    marginBottom: spacing[4],
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  servingControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
  },
  servingButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Ingredients
  ingredientsList: {
    gap: spacing[3],
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing[3],
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ingredientText: {
    flex: 1,
  },
  checkedText: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },

  // Progress
  progressCard: {
    padding: spacing[5],
    marginTop: spacing[4],
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing[3],
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },

  // Instructions
  instructionsList: {
    gap: spacing[4],
  },
  instructionItem: {
    flexDirection: 'row',
    padding: spacing[5],
    borderRadius: borderRadius.lg,
    gap: spacing[4],
    ...shadows.sm,
  },
  instructionNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionText: {
    flex: 1,
    lineHeight: 24,
  },
  startCookingButton: {
    marginTop: spacing[5],
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.lg,
  },
  startCookingGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
    paddingVertical: spacing[5],
  },

  // Cooking Mode
  cookingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
    marginBottom: spacing[4],
    borderRadius: borderRadius.lg,
  },
  cookingInfo: {
    gap: spacing[1],
  },
  exitButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCard: {
    padding: spacing[6],
    marginBottom: spacing[4],
    borderRadius: borderRadius.lg,
    ...shadows.md,
  },
  stepNumber: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
    alignSelf: 'center',
  },
  stepText: {
    lineHeight: 28,
    textAlign: 'center',
    marginBottom: spacing[5],
  },
  stepActions: {
    alignItems: 'center',
  },
  audioButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  stepNavigation: {
    flexDirection: 'row',
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[4],
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  progressDots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },

  // Nutrition
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  nutritionCard: {
    width: (SCREEN_WIDTH - spacing[5] * 2 - spacing[3]) / 2,
    alignItems: 'center',
    padding: spacing[5],
    borderRadius: borderRadius.lg,
    gap: spacing[2],
    ...shadows.sm,
  },
  nutritionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dailyValuesCard: {
    padding: spacing[5],
    marginBottom: spacing[4],
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  dailyValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[3],
  },
  dailyValueBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: spacing[4],
  },
  dailyValueBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  dailyValueFill: {
    height: '100%',
    borderRadius: 3,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    borderRadius: borderRadius.lg,
  },

  // Bottom Bar
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    borderTopWidth: 1,
    ...shadows.lg,
  },
  bottomAction: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bottomMainAction: {
    flex: 1,
    marginHorizontal: spacing[4],
  },
  bottomBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default RecipeDetailScreen;
