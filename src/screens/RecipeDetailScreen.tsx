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
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  const [activeTab, setActiveTab] = useState<'ingredients' | 'instructions'>('ingredients');
  const [checkedIngredients, setCheckedIngredients] = useState<boolean[]>([]);
  const [imageLoading, setImageLoading] = useState(true);

  // Hooks
  const { colors } = useThemedStyles();
  const { showSuccess, showError } = useToast();
  const haptics = useHaptics();
  const { t, i18n } = useTranslation();
  const { isPremium } = usePremium();

  // Premium guards
  const aiQuestionGuard = usePremiumGuard({
    feature: 'unlimitedRecipes',
    title: 'AI Assistant',
  });

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;

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
  }, [recipeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initialize animations
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Initialize checked ingredients
  useEffect(() => {
    if (recipe?.ingredients) {
      setCheckedIngredients(new Array(recipe.ingredients.length).fill(false));
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
        language: i18n.language === 'tr' ? 'tr-TR' : 'en-US',
      });
    } catch (error) {
      Logger.error('Speech failed:', error);
    } finally {
      setIsPlaying(false);
    }
  };

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
            {t('app.loading')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background.primary }]}
    >
      <StatusBar barStyle='dark-content' />

      {/* Header */}
      <View
        style={[
          styles.header,
          { borderBottomColor: colors.border.light },
        ]}
      >
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons
            name='arrow-back'
            size={24}
            color={colors.text.primary}
          />
        </TouchableOpacity>

        <Text
          variant='headlineMedium'
          weight='semibold'
          numberOfLines={1}
          style={styles.headerTitle}
        >
          {recipe.name}
        </Text>

        <View style={styles.headerActions}>
          <FavoriteButton recipe={recipe} size='medium' />
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleShare}
          >
            <Ionicons
              name='share-outline'
              size={22}
              color={colors.text.primary}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Recipe Image */}
        <View style={styles.imageContainer}>
          {recipe.imageUrl ? (
            <>
              <Image
                source={{ uri: recipe.imageUrl }}
                style={styles.recipeImage}
                resizeMode='cover'
                onLoadStart={() => setImageLoading(true)}
                onLoadEnd={() => setImageLoading(false)}
              />
              {imageLoading && (
                <View style={styles.imageLoader}>
                  <ActivityIndicator size='large' color={colors.primary[500]} />
                </View>
              )}
            </>
          ) : (
            <View
              style={[
                styles.placeholderImage,
                { backgroundColor: colors.neutral[100] },
              ]}
            >
              <Ionicons
                name='restaurant'
                size={48}
                color={colors.neutral[400]}
              />
            </View>
          )}
        </View>

        {/* Recipe Info */}
        <Animated.View
          style={[styles.content, { opacity: fadeAnim }]}
        >
          {/* Quick Stats */}
          <View style={styles.statsContainer}>
            {recipe.cookingTime || recipe.preparationTime ? (
              <View
                style={[
                  styles.statItem,
                  { backgroundColor: colors.surface.primary },
                ]}
              >
                <Ionicons
                  name='time-outline'
                  size={20}
                  color={colors.primary[500]}
                />
                <Text variant='bodyMedium'>
                  {recipe.cookingTime || recipe.preparationTime || 30} {t('recipeDetailScreen.minutes')}
                </Text>
              </View>
            ) : null}

            {recipe.servings && (
              <View
                style={[
                  styles.statItem,
                  { backgroundColor: colors.surface.primary },
                ]}
              >
                <Ionicons
                  name='people-outline'
                  size={20}
                  color={colors.primary[500]}
                />
                <Text variant='bodyMedium'>
                  {recipe.servings} {t('recipeDetailScreen.servingsCount')}
                </Text>
              </View>
            )}

            {recipe.difficulty && (
              <View
                style={[
                  styles.statItem,
                  { backgroundColor: colors.surface.primary },
                ]}
              >
                <MaterialIcons
                  name='signal-cellular-alt'
                  size={20}
                  color={colors.primary[500]}
                />
                <Text variant='bodyMedium'>
                  {recipe.difficulty === 'kolay'
                    ? t('recipeDetailScreen.easy')
                    : recipe.difficulty === 'orta'
                      ? t('recipeDetailScreen.medium')
                      : t('recipeDetailScreen.hard')}
                </Text>
              </View>
            )}
          </View>

          {/* Description */}
          {recipe.description && (
            <View style={styles.descriptionContainer}>
              <Text variant='bodyLarge' color='secondary'>
                {recipe.description}
              </Text>
            </View>
          )}

          {/* Tabs */}
          <View
            style={[
              styles.tabContainer,
              { backgroundColor: colors.surface.primary },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'ingredients' && [
                  styles.activeTab,
                  { borderBottomColor: colors.primary[500] },
                ],
              ]}
              onPress={() => {
                setActiveTab('ingredients');
                haptics.selection();
              }}
            >
              <Text
                variant='labelLarge'
                weight={activeTab === 'ingredients' ? 'semibold' : 'normal'}
                color={activeTab === 'ingredients' ? 'primary' : 'secondary'}
              >
                {t('recipeDetailScreen.ingredients')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'instructions' && [
                  styles.activeTab,
                  { borderBottomColor: colors.primary[500] },
                ],
              ]}
              onPress={() => {
                setActiveTab('instructions');
                setCurrentStep(0);
                haptics.selection();
              }}
            >
              <Text
                variant='labelLarge'
                weight={activeTab === 'instructions' ? 'semibold' : 'normal'}
                color={activeTab === 'instructions' ? 'primary' : 'secondary'}
              >
                {t('recipeDetailScreen.instructions')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab Content */}
          <View style={styles.tabContent}>
            {/* Ingredients Tab */}
            {activeTab === 'ingredients' && (
              <View style={styles.ingredientsList}>
                {recipe.ingredients?.map((ingredient, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.ingredientItem,
                      {
                        backgroundColor: colors.surface.primary,
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
                        <Ionicons name='checkmark' size={14} color='white' />
                      )}
                    </View>
                    <Text
                      variant='bodyMedium'
                      style={{
                        ...styles.ingredientText,
                        ...(checkedIngredients[index] ? styles.checkedText : {}),
                      }}
                    >
                      {ingredient}
                    </Text>
                  </TouchableOpacity>
                ))}
                
                {/* AI Assistant Info */}
                <View
                  style={[
                    styles.aiInfoCard,
                    { 
                      backgroundColor: colors.primary[50],
                      borderColor: colors.primary[200],
                    },
                  ]}
                >
                  <MaterialIcons
                    name='tips-and-updates'
                    size={20}
                    color={colors.primary[600]}
                  />
                  <Text
                    variant='bodySmall'
                    style={{ 
                      flex: 1,
                      color: colors.primary[700],
                      marginLeft: spacing[2],
                    }}
                  >
                    {t('recipeDetailScreen.aiAssistantHint')}
                  </Text>
                </View>
              </View>
            )}

            {/* Instructions Tab */}
            {activeTab === 'instructions' && (
              <View style={styles.instructionsContainer}>
                {/* Step Counter */}
                <View
                  style={[
                    styles.stepHeader,
                    { backgroundColor: colors.primary[50] },
                  ]}
                >
                  <Text variant='labelMedium' color='primary'>
                    {t('recipeDetailScreen.step')} {currentStep + 1} / {recipe.instructions?.length || 0}
                  </Text>
                </View>

                {/* Current Step */}
                <View
                  style={[
                    styles.stepCard,
                    { backgroundColor: colors.surface.primary },
                  ]}
                >
                  <Text variant='bodyLarge' style={styles.stepText}>
                    {recipe.instructions?.[currentStep]}
                  </Text>

                  <TouchableOpacity
                    style={[
                      styles.audioButton,
                      { backgroundColor: colors.primary[50] },
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
                        name='volume-medium'
                        size={20}
                        color={colors.primary[500]}
                      />
                    )}
                  </TouchableOpacity>
                </View>

                {/* Step Navigation */}
                <View style={styles.stepNavigation}>
                  <TouchableOpacity
                    style={[
                      styles.navButton,
                      {
                        backgroundColor: colors.surface.primary,
                        opacity: currentStep === 0 ? 0.5 : 1,
                      },
                    ]}
                    onPress={previousStep}
                    disabled={currentStep === 0}
                  >
                    <Ionicons
                      name='chevron-back'
                      size={20}
                      color={
                        currentStep === 0
                          ? colors.neutral[400]
                          : colors.text.primary
                      }
                    />
                    <Text
                      variant='bodyMedium'
                      color={currentStep === 0 ? 'disabled' : 'primary'}
                    >
                      {t('recipeDetailScreen.previous')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.navButton,
                      {
                        backgroundColor:
                          currentStep === (recipe.instructions?.length || 0) - 1
                            ? colors.success[500]
                            : colors.primary[500],
                      },
                    ]}
                    onPress={
                      currentStep === (recipe.instructions?.length || 0) - 1
                        ? () => {
                            setCurrentStep(0);
                            showSuccess(t('recipeDetailScreen.recipeCongrats'));
                            haptics.notificationSuccess();
                          }
                        : nextStep
                    }
                  >
                    <Text
                      variant='bodyMedium'
                      weight='medium'
                      style={{ color: 'white' }}
                    >
                      {currentStep === (recipe.instructions?.length || 0) - 1
                        ? t('recipeDetailScreen.complete')
                        : t('recipeDetailScreen.next')}
                    </Text>
                    <Ionicons
                      name={
                        currentStep === (recipe.instructions?.length || 0) - 1
                          ? 'checkmark'
                          : 'chevron-forward'
                      }
                      size={20}
                      color='white'
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
                            index === currentStep
                              ? colors.primary[500]
                              : index < currentStep
                                ? colors.primary[200]
                                : colors.neutral[200],
                        },
                      ]}
                    />
                  ))}
                </View>

                {/* AI Assistant Info */}
                <View
                  style={[
                    styles.aiInfoCard,
                    { 
                      backgroundColor: colors.primary[50],
                      borderColor: colors.primary[200],
                    },
                  ]}
                >
                  <MaterialIcons
                    name='tips-and-updates'
                    size={20}
                    color={colors.primary[600]}
                  />
                  <Text
                    variant='bodySmall'
                    style={{ 
                      flex: 1,
                      color: colors.primary[700],
                      marginLeft: spacing[2],
                    }}
                  >
                    {t('recipeDetailScreen.aiAssistantHint')}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </Animated.View>
      </ScrollView>

      {/* AI Assistant Button */}
      <TouchableOpacity
        style={[
          styles.floatingButton,
          { backgroundColor: colors.primary[500] },
        ]}
        onPress={handleQAOpen}
      >
        <MaterialIcons name='assistant' size={24} color='white' />
        {!aiQuestionGuard.hasAccess && (
          <View style={styles.premiumBadge}>
            <Ionicons name='star' size={8} color='white' />
          </View>
        )}
      </TouchableOpacity>

      {/* QA Modal */}
      {showQAModal && (
        <RecipeQAModal
          visible={showQAModal}
          onClose={() => setShowQAModal(false)}
          recipe={recipe}
          onAskQuestion={handleAskQuestion}
        />
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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
  },
  headerButton: {
    padding: spacing[2],
  },
  headerTitle: {
    flex: 1,
    marginHorizontal: spacing[3],
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },

  // Content
  scrollContent: {
    paddingBottom: spacing[10],
  },
  content: {
    padding: spacing[5],
  },

  // Image
  imageContainer: {
    height: 240,
    position: 'relative',
  },
  recipeImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
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
    backgroundColor: 'rgba(255,255,255,0.8)',
  },

  // Stats
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
  },

  // Description
  descriptionContainer: {
    marginBottom: spacing[5],
  },

  // Tabs
  tabContainer: {
    flexDirection: 'row',
    borderRadius: borderRadius.base,
    marginBottom: spacing[5],
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing[3],
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomWidth: 2,
  },
  tabContent: {
    minHeight: 300,
  },

  // Ingredients
  ingredientsList: {
    gap: spacing[2],
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    borderRadius: borderRadius.base,
    borderWidth: 1,
    gap: spacing[3],
  },
  checkbox: {
    width: 20,
    height: 20,
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
  aiInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    marginTop: spacing[4],
    borderRadius: borderRadius.base,
    borderWidth: 1,
  },

  // Instructions
  instructionsContainer: {
    gap: spacing[4],
  },
  stepHeader: {
    alignSelf: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
  },
  stepCard: {
    padding: spacing[5],
    borderRadius: borderRadius.lg,
    ...shadows.sm,
    position: 'relative',
  },
  stepText: {
    lineHeight: 24,
    paddingRight: spacing[10],
  },
  audioButton: {
    position: 'absolute',
    top: spacing[4],
    right: spacing[4],
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNavigation: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.base,
    ...shadows.xs,
  },
  progressDots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // Floating Button
  floatingButton: {
    position: 'absolute',
    bottom: spacing[8],
    right: spacing[5],
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
  },
  premiumBadge: {
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