import React, { useState, useEffect } from 'react';
import {
  View,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Dimensions,
  StatusBar,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Logger } from '../services/LoggerService';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Animated as RNAnimated } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { HomeStackParamList } from '../components/navigation/ThemedNavigators';

// Services
import { OpenAIService } from '../services/openaiService';
import { RecipeService } from '../services/recipeService';
import { SpeechService } from '../services/speechService';
import { HistoryService } from '../services/historyService';
import { UserPreferencesService } from '../services/UserPreferencesService';
import { UsageLimitService } from '../services/UsageLimitService';
import { ErrorHandlingService } from '../services/ErrorHandlingService';
import { getCurrentLanguage } from '../locales';
import { useTranslation } from 'react-i18next';

// Components
import { Text } from '../components/ui';
import { AILoadingModal } from '../components/modals/AILoadingModal';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { useToast } from '../contexts/ToastContext';
import { useHaptics } from '../hooks/useHaptics';
import { usePremium } from '../contexts/PremiumContext';

// Theme
import { spacing, borderRadius, shadows } from '../theme/design-tokens';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

type ModernHomeScreenProps = {
  navigation: StackNavigationProp<HomeStackParamList, 'HomeMain'>;
  route: RouteProp<HomeStackParamList, 'HomeMain'>;
};

interface AIStage {
  stage: 'analyzing' | 'generating' | 'optimizing' | 'finalizing';
  progress: number;
}

const getSmartSuggestions = (t: any) => [
  {
    id: 'breakfast',
    name: t('home.suggestions.breakfast.name'),
    subtitle: t('home.suggestions.breakfast.subtitle'),
    icon: '🌅',
    color: '#F59E0B',
    mealTime: 'breakfast' as const,
    defaultIngredients: t('home.suggestions.breakfast.ingredients', {
      returnObjects: true,
    }) as string[],
    cookingTime: 15,
  },
  {
    id: 'lunch',
    name: t('home.suggestions.lunch.name'),
    subtitle: t('home.suggestions.lunch.subtitle'),
    icon: '☀️',
    color: '#EF4444',
    mealTime: 'lunch' as const,
    defaultIngredients: t('home.suggestions.lunch.ingredients', {
      returnObjects: true,
    }) as string[],
    cookingTime: 30,
  },
  {
    id: 'dinner',
    name: t('home.suggestions.dinner.name'),
    subtitle: t('home.suggestions.dinner.subtitle'),
    icon: '🌆',
    color: '#8B5CF6',
    mealTime: 'dinner' as const,
    defaultIngredients: t('home.suggestions.dinner.ingredients', {
      returnObjects: true,
    }) as string[],
    cookingTime: 45,
  },
  {
    id: 'snack',
    name: t('home.suggestions.snack.name'),
    subtitle: t('home.suggestions.snack.subtitle'),
    icon: '⚡',
    color: '#10B981',
    mealTime: 'snack' as const,
    defaultIngredients: t('home.suggestions.snack.ingredients', {
      returnObjects: true,
    }) as string[],
    cookingTime: 15,
  },
];

export const ModernHomeScreen: React.FC<ModernHomeScreenProps> = ({
  navigation,
  route,
}) => {
  const { t } = useTranslation();
  // State
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiStage, setAiStage] = useState<AIStage>({
    stage: 'analyzing',
    progress: 0,
  });
  const [remainingRequests, setRemainingRequests] = useState<number>(2);

  // Hooks
  const { colors } = useThemedStyles();
  const { showError, showWarning } = useToast();
  const haptics = useHaptics();
  const { isPremium, showPaywall } = usePremium();

  // Get localized suggestions
  const SMART_SUGGESTIONS = getSmartSuggestions(t);

  // Animations
  const searchScale = new RNAnimated.Value(1);
  const inputScale = new RNAnimated.Value(1);
  const headerOpacity = new RNAnimated.Value(1);

  // Animation helpers
  const animateScale = (animatedValue: RNAnimated.Value, toValue: number) => {
    RNAnimated.spring(animatedValue, {
      toValue,
      useNativeDriver: true,
    }).start();
  };

  // Load remaining requests on mount
  React.useEffect(() => {
    const loadRemainingRequests = async () => {
      console.log('🔋 Loading remaining requests, isPremium:', isPremium);

      if (!isPremium) {
        const remaining = await UsageLimitService.getRemainingRequests();
        console.log('🔋 Remaining requests from service:', remaining);
        setRemainingRequests(remaining);
      } else {
        // Premium kullanıcı için unlimited
        setRemainingRequests(999);
      }
    };
    loadRemainingRequests();
  }, [isPremium]);

  // Handle prefilled ingredients from history or IngredientsScreen
  React.useEffect(() => {
    if (route.params?.prefillIngredients) {
      setIngredients(route.params.prefillIngredients);

      if (route.params?.shouldGenerateRecipes) {
        // From IngredientsScreen - start recipe generation
        haptics.success();
        generateAIRecipes(route.params.prefillIngredients);
      } else {
        // From history - just haptic feedback
        haptics.light();
      }
    }
  }, [route.params?.prefillIngredients, route.params?.shouldGenerateRecipes]);

  // Smart suggestion tap handler
  const handleSmartSuggestion = async (
    suggestion: ReturnType<typeof getSmartSuggestions>[0]
  ) => {
    // Log kategori tıklanması
    console.log('📝 Smart suggestion selected:', {
      category: suggestion.id,
      mealTime: suggestion.mealTime,
      ingredients: suggestion.defaultIngredients,
      isPremium,
      remainingRequests,
      timestamp: new Date().toISOString(),
    });

    // Set the ingredients for display
    setIngredients(suggestion.defaultIngredients);

    // Start AI generation immediately with smart defaults
    await generateAIRecipesWithSmartDefaults(suggestion);
  };

  // Smart AI Recipe Generation with defaults
  const generateAIRecipesWithSmartDefaults = async (
    suggestion: ReturnType<typeof getSmartSuggestions>[0]
  ) => {
    // Check usage limit for non-premium users
    if (!isPremium) {
      const canMakeRequest = await UsageLimitService.canMakeRequest();
      if (!canMakeRequest) {
        showPaywall();
        return;
      }
    }

    // Start animations
    animateScale(searchScale, 0.95);
    setTimeout(() => {
      animateScale(searchScale, 1);
    }, 150);

    setShowAIModal(true);
    haptics.voiceStart();

    try {
      // Stage 1: Analyzing
      setAiStage({ stage: 'analyzing', progress: 0 });
      await new Promise(resolve => setTimeout(resolve, 800));
      setAiStage({ stage: 'analyzing', progress: 25 });

      // Stage 2: Generating
      setAiStage({ stage: 'generating', progress: 30 });

      // Kullanıcı tercihlerini al
      const userPreferences = await UserPreferencesService.getUserPreferences();

      // Tarif geçmişi sayısını al (basit implementation)
      const recipeHistory = await HistoryService.getStats()
        .then(stats => stats.totalRequests || 0)
        .catch(() => 0);

      const aiResponse = await OpenAIService.generateRecipes({
        ingredients: suggestion.defaultIngredients,
        language: getCurrentLanguage() as 'tr' | 'en',
        mealTime: suggestion.mealTime,
        userProfile: {
          dietaryRestrictions: userPreferences.dietaryRestrictions || [],
          favoriteCategories: userPreferences.favoriteCategories || [],
          cookingLevel: userPreferences.cookingLevel || 'orta',
          recipeHistory: recipeHistory,
        },
        preferences: {
          difficulty:
            userPreferences.cookingLevel === 'başlangıç'
              ? 'kolay'
              : userPreferences.cookingLevel === 'uzman'
                ? 'zor'
                : 'orta',
          servings: 2,
          cookingTime: suggestion.cookingTime,
        },
      });

      // Stage 3: Optimizing
      setAiStage({ stage: 'optimizing', progress: 75 });
      await new Promise(resolve => setTimeout(resolve, 500));

      // Stage 4: Finalizing
      setAiStage({ stage: 'finalizing', progress: 95 });
      await new Promise(resolve => setTimeout(resolve, 300));
      setAiStage({ stage: 'finalizing', progress: 100 });

      await new Promise(resolve => setTimeout(resolve, 500));
      setShowAIModal(false);

      if (aiResponse.recipes && aiResponse.recipes.length > 0) {
        // Use request for non-premium users and update remaining count
        if (!isPremium) {
          await UsageLimitService.useRequest();
          const remaining = await UsageLimitService.getRemainingRequests();
          setRemainingRequests(remaining);
          
          // Log kredi kullanımı
          console.log('💳 Credit used for smart suggestion:', {
            category: suggestion.id,
            mealTime: suggestion.mealTime,
            creditsRemaining: remaining,
            recipesGenerated: aiResponse.recipes.length,
            timestamp: new Date().toISOString(),
          });
        }

        haptics.success();
        // Success feedback through navigation - no need for toast
        navigation.navigate('RecipeResults', {
          ingredients: suggestion.defaultIngredients,
          aiRecipes: aiResponse.recipes,
        });
      } else {
        // Show warning only for critical case where no recipes found
        showWarning(
          t('messages.noRecipeFound'),
          t('messages.noRecipeFoundDescription')
        );
      }
    } catch (error: any) {
      setShowAIModal(false);

      // Improved error handling for smart suggestions
      let appError;
      if (
        error.message?.includes('fetch') ||
        error.message?.includes('network')
      ) {
        appError = ErrorHandlingService.getNetworkError(error);
      } else if (error.message?.includes('API key')) {
        appError = ErrorHandlingService.createError(
          'auth',
          'OpenAI API anahtarı bulunamadı'
        );
      } else if (
        error.message?.includes('quota') ||
        error.message?.includes('429')
      ) {
        appError = ErrorHandlingService.getAPIError(
          { status: 429 } as Response,
          error
        );
      } else {
        appError = ErrorHandlingService.getGenericError(error);
      }

      showError(
        ErrorHandlingService['errorMessages'][appError.type]?.title ||
          t('messages.aiError'),
        appError.userMessage || appError.message,
        {
          duration: 8000,
          actionLabel: appError.retryable ? 'Tekrar Dene' : undefined,
          onAction: appError.retryable
            ? () => generateAIRecipesWithSmartDefaults(suggestion)
            : undefined,
        }
      );
      haptics.error();
    }
  };

  // AI Recipe Generation
  const generateAIRecipes = async (
    customIngredients?: string[],
    customMealTime?: string
  ) => {
    const useIngredients = customIngredients || ingredients;
    const useMealTime = customMealTime || 'lunch'; // Default to lunch

    if (useIngredients.length === 0) {
      showWarning(
        t('messages.ingredientRequired'),
        t('messages.ingredientRequiredDescription')
      );
      return;
    }

    // Log normal AI recipe generation başlatması
    console.log('📝 Normal AI recipe generation started:', {
      ingredients: useIngredients,
      ingredientCount: useIngredients.length,
      mealTime: useMealTime,
      source: customIngredients ? 'ingredients-screen' : 'manual-input',
      isPremium,
      remainingRequests,
      timestamp: new Date().toISOString(),
    });

    // Check usage limit for non-premium users
    if (!isPremium) {
      const canMakeRequest = await UsageLimitService.canMakeRequest();
      if (!canMakeRequest) {
        showPaywall();
        return;
      }
    }

    // Start animations
    animateScale(searchScale, 0.95);
    setTimeout(() => {
      animateScale(searchScale, 1);
    }, 150);

    setShowAIModal(true);
    haptics.voiceStart();

    try {
      // Stage 1: Analyzing
      setAiStage({ stage: 'analyzing', progress: 0 });
      await new Promise(resolve => setTimeout(resolve, 800));
      setAiStage({ stage: 'analyzing', progress: 25 });

      // Stage 2: Generating
      setAiStage({ stage: 'generating', progress: 30 });

      // Kullanıcı tercihlerini al
      const userPreferences = await UserPreferencesService.getUserPreferences();

      // Tarif geçmişi sayısını al (basit implementation)
      const recipeHistory = await HistoryService.getStats()
        .then(stats => stats.totalRequests || 0)
        .catch(() => 0);

      const aiResponse = await OpenAIService.generateRecipes({
        ingredients: useIngredients,
        language: getCurrentLanguage() as 'tr' | 'en',
        mealTime: useMealTime as 'breakfast' | 'lunch' | 'dinner' | 'snack',
        userProfile: {
          dietaryRestrictions: userPreferences.dietaryRestrictions || [],
          favoriteCategories: userPreferences.favoriteCategories || [],
          cookingLevel: userPreferences.cookingLevel || 'orta',
          recipeHistory: recipeHistory,
        },
        preferences: {
          difficulty:
            userPreferences.cookingLevel === 'başlangıç'
              ? 'kolay'
              : userPreferences.cookingLevel === 'uzman'
                ? 'zor'
                : 'orta',
          servings: 2,
          cookingTime:
            useMealTime === 'breakfast'
              ? 15
              : useMealTime === 'lunch'
                ? 30
                : 45,
        },
      });

      // Stage 3: Optimizing
      setAiStage({ stage: 'optimizing', progress: 75 });
      await new Promise(resolve => setTimeout(resolve, 500));

      // Stage 4: Finalizing
      setAiStage({ stage: 'finalizing', progress: 95 });
      await new Promise(resolve => setTimeout(resolve, 300));
      setAiStage({ stage: 'finalizing', progress: 100 });

      await new Promise(resolve => setTimeout(resolve, 500));
      setShowAIModal(false);

      if (aiResponse.recipes && aiResponse.recipes.length > 0) {
        // Use request for non-premium users and update remaining count
        if (!isPremium) {
          await UsageLimitService.useRequest();
          const remaining = await UsageLimitService.getRemainingRequests();
          setRemainingRequests(remaining);
          
          // Log kredi kullanımı (ingredients screen'den gelenleri)
          console.log('💳 Credit used for normal AI generation:', {
            ingredients: useIngredients,
            ingredientCount: useIngredients.length,
            mealTime: useMealTime,
            source: customIngredients ? 'ingredients-screen' : 'manual-input',
            creditsRemaining: remaining,
            recipesGenerated: aiResponse.recipes.length,
            timestamp: new Date().toISOString(),
          });
        }

        haptics.success();
        // Success indicated by navigation - no toast needed

        // Save to history
        const startTime = Date.now();
        await HistoryService.saveRequest(
          {
            ingredients: useIngredients,
            preferences: {
              difficulty: 'kolay',
              servings: 2,
              cookingTime: 30,
            },
            results: {
              count: aiResponse.recipes.length,
              recipes: aiResponse.recipes.map(recipe => ({
                id: recipe.id || `ai_${Date.now()}_${Math.random()}`,
                name: recipe.name,
                difficulty: recipe.difficulty,
                cookingTime: recipe.cookingTime,
                // Premium için ek bilgiler
                ...(isPremium && {
                  servings: recipe.servings,
                  ingredients: recipe.ingredients,
                  instructions: recipe.instructions,
                  imageUrl: recipe.imageUrl,
                }),
              })),
            },
            success: true,
            requestDetails: isPremium
              ? {
                  tokenUsed: aiResponse.totalTokensUsed || 0,
                  responseTime: Date.now() - startTime,
                  model: 'gpt-3.5-turbo',
                  requestType: 'ai' as const,
                }
              : undefined,
            userContext: {
              isPremium,
              userId: 'user_' + Date.now(),
            },
          },
          isPremium
        );

        // Navigate to results
        navigation.navigate('RecipeResults', {
          ingredients: useIngredients,
          aiRecipes: aiResponse.recipes,
        });
      } else {
        showWarning(
          t('messages.noRecipeFound'),
          t('messages.noRecipeFoundDescription')
        );

        // Save failed attempt to history
        await HistoryService.saveRequest(
          {
            ingredients: useIngredients,
            preferences: {
              difficulty: 'kolay',
              servings: 2,
              cookingTime: 30,
            },
            results: {
              count: 0,
              recipes: [],
            },
            success: false,
            userContext: {
              isPremium,
              userId: 'user_' + Date.now(),
            },
          },
          isPremium
        );
      }
    } catch (error: any) {
      console.error('AI Generation Error:', error);
      setShowAIModal(false);

      // Improved error handling
      let appError;
      if (
        error.message?.includes('fetch') ||
        error.message?.includes('network')
      ) {
        appError = ErrorHandlingService.getNetworkError(error);
      } else if (error.message?.includes('API key')) {
        appError = ErrorHandlingService.createError(
          'auth',
          'OpenAI API anahtarı bulunamadı'
        );
      } else if (
        error.message?.includes('quota') ||
        error.message?.includes('429')
      ) {
        appError = ErrorHandlingService.getAPIError(
          { status: 429 } as Response,
          error
        );
      } else if (error.message?.includes('timeout')) {
        appError = ErrorHandlingService.getNetworkError(error);
      } else {
        appError = ErrorHandlingService.getGenericError(error);
      }

      showError(
        ErrorHandlingService['errorMessages'][appError.type]?.title ||
          'AI Hatası',
        appError.userMessage || appError.message,
        {
          duration: 8000,
          actionLabel: appError.retryable ? 'Tekrar Dene' : undefined,
          onAction: appError.retryable
            ? () => generateAIRecipes(useIngredients, useMealTime)
            : undefined,
        }
      );
      haptics.error();

      // Save error to history
      await HistoryService.saveRequest(
        {
          ingredients: useIngredients,
          preferences: {
            difficulty: 'kolay',
            servings: 2,
            cookingTime: 30,
          },
          results: {
            count: 0,
            recipes: [],
          },
          success: false,
          error: appError.message,
          userContext: {
            isPremium,
            userId: 'user_' + Date.now(),
          },
        },
        isPremium
      );

      // Fallback to normal search
      navigation.navigate('RecipeResults', { ingredients: useIngredients });
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background.primary }]}
    >
      <StatusBar barStyle='light-content' backgroundColor='#1a1a2e' />

      {/* Compact Header */}
      <View style={styles.compactHeader}>
        <View style={styles.compactHeaderContent}>
          <View style={styles.compactHeaderLeft}>
            <Ionicons name='restaurant' size={20} color={colors.primary[500]} />
            <Text
              variant='bodyLarge'
              weight='bold'
              style={{ color: colors.text.primary }}
            >
              {t('app.name')}
            </Text>
          </View>

          {/* Credit Counter */}
          {!isPremium && (
            <TouchableOpacity
              style={[
                styles.creditCounter,
                { backgroundColor: colors.primary[100] },
              ]}
              onPress={() => showPaywall()}
              activeOpacity={0.7}
            >
              <Ionicons name='diamond' size={14} color={colors.primary[600]} />
              <Text
                variant='labelSmall'
                weight='600'
                style={{ color: colors.primary[600], fontSize: 12 }}
              >
                {remainingRequests}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? -20 : 0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
          keyboardShouldPersistTaps='handled'
          keyboardDismissMode='interactive'
        >
          <View style={styles.mainContent}>
            {/* Welcome Section */}
            <View style={styles.welcomeSection}>
              <Text
                variant='headlineMedium'
                weight='bold'
                style={{
                  color: colors.text.primary,
                  fontSize: screenWidth < 380 ? 24 : 28,
                }}
              >
                {t('home.welcomeTitle')}
              </Text>
              <Text
                variant='bodyMedium'
                color='secondary'
                style={{ marginTop: 4 }}
              >
                {t('home.welcomeSubtitle')}
              </Text>
            </View>

            {/* Smart Suggestions Grid - 2x2 */}
            <View style={styles.smartSuggestionGrid}>
              {SMART_SUGGESTIONS.map(suggestion => (
                <TouchableOpacity
                  key={suggestion.id}
                  style={[styles.suggestionCard]}
                  onPress={() => handleSmartSuggestion(suggestion)}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[suggestion.color, suggestion.color + 'CC']}
                    style={styles.suggestionGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.suggestionIcon}>{suggestion.icon}</Text>
                    <Text
                      variant='bodyMedium'
                      weight='600'
                      style={{
                        color: 'white',
                        textAlign: 'center',
                        fontSize: screenWidth < 380 ? 14 : 15,
                      }}
                    >
                      {suggestion.name}
                    </Text>
                    <Text
                      variant='labelSmall'
                      style={{
                        color: 'rgba(255,255,255,0.85)',
                        textAlign: 'center',
                        fontSize: screenWidth < 380 ? 11 : 12,
                      }}
                    >
                      {suggestion.subtitle}
                    </Text>
                    <View style={styles.aiIndicator}>
                      <Ionicons name='sparkles' size={12} color='white' />
                      <Text
                        variant='labelSmall'
                        style={{ color: 'white', marginLeft: 2, fontSize: 10 }}
                      >
                        AI
                      </Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>

            {/* Kendi Malzemelerinle Oluştur Button */}
            <TouchableOpacity
              style={styles.customCreateButton}
              onPress={() => {
                console.log('🔥 Kendi malzemelerinle oluştur pressed!');
                haptics.selection();
                navigation.navigate('IngredientsSelect');
              }}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#6366F1', '#8B5CF6']}
                style={styles.customCreateGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.customCreateLeft}>
                  <Ionicons name='create-outline' size={24} color='white' />
                </View>
                <View style={styles.customCreateContent}>
                  <Text
                    variant='bodyLarge'
                    weight='600'
                    style={{ color: 'white' }}
                  >
                    {t('home.customCreate.title')}
                  </Text>
                  <Text
                    variant='bodySmall'
                    style={{ color: 'rgba(255,255,255,0.85)', marginTop: 2 }}
                  >
                    {t('home.customCreate.subtitle')}
                  </Text>
                </View>
                <Ionicons
                  name='chevron-forward'
                  size={20}
                  color='rgba(255,255,255,0.8)'
                />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Bottom Spacing */}
          <View style={{ height: 80 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* AI Loading Modal */}
      <AILoadingModal
        visible={showAIModal}
        onClose={() => setShowAIModal(false)}
        stage={aiStage.stage}
        progress={aiStage.progress}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: Platform.OS === 'ios' ? 90 : 70,
  },

  // Compact Header
  compactHeader: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.03)',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  compactHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  compactHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  creditCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[2],
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    gap: 4,
  },

  // Main Content
  mainContent: {
    flex: 1,
    paddingHorizontal: spacing[3],
  },
  welcomeSection: {
    paddingTop: screenHeight < 700 ? spacing[3] : spacing[4],
    paddingBottom: screenHeight < 700 ? spacing[3] : spacing[4],
    alignItems: 'center',
  },

  // Smart Suggestions Grid
  smartSuggestionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginBottom: screenHeight < 700 ? spacing[3] : spacing[4],
  },
  suggestionCard: {
    width: (screenWidth - spacing[3] * 2 - spacing[2]) / 2,
    height: screenHeight < 700 ? 90 : 100,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.md,
  },
  suggestionGradient: {
    flex: 1,
    padding: spacing[3],
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  suggestionIcon: {
    fontSize: 28,
    marginBottom: spacing[1],
  },
  aiIndicator: {
    position: 'absolute',
    top: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },

  // Custom Create Button
  customCreateButton: {
    marginBottom: spacing[4],
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.lg,
  },
  customCreateGradient: {
    padding: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  customCreateLeft: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customCreateContent: {
    flex: 1,
  },
  customCardBadge: {
    position: 'absolute',
    top: spacing[2],
    right: spacing[2],
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },

  header: {
    paddingTop: spacing[6],
    paddingBottom: spacing[8],
    paddingHorizontal: spacing[6],
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[4],
  },
  headerText: {
    flex: 1,
  },
  inputSection: {
    margin: spacing[4],
    padding: spacing[6],
    borderRadius: borderRadius.xl,
    ...shadows.lg,
  },
  sectionTitle: {
    marginBottom: spacing[4],
  },
  inputContainer: {
    position: 'relative',
  },
  textInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[3],
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    borderRadius: borderRadius.lg,
    marginTop: 8,
    padding: 8,
    ...shadows.md,
    zIndex: 1000,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: borderRadius.md,
  },
  popularSection: {
    paddingHorizontal: spacing[4],
    marginBottom: spacing[6],
  },
  popularGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
  },
  popularItem: {
    alignItems: 'center',
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    minWidth: (screenWidth - spacing[4] * 2 - spacing[3] * 2) / 3,
    ...shadows.sm,
    position: 'relative',
  },
  popularEmoji: {
    fontSize: 24,
    marginBottom: 8,
  },
  popularDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  ingredientsSection: {
    margin: spacing[4],
    padding: spacing[6],
    borderRadius: borderRadius.xl,
    ...shadows.lg,
  },
  ingredientsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    gap: spacing[1],
  },
  ingredientsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing[6],
  },
  removeButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiButton: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.xl,
  },
  aiButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[5],
    paddingHorizontal: spacing[6],
    gap: spacing[3],
    position: 'relative',
  },
  aiButtonBadge: {
    position: 'absolute',
    top: 8,
    right: spacing[3],
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: spacing[1],
    borderRadius: borderRadius.sm,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: spacing[4],
    gap: spacing[4],
  },
  quickActionCard: {
    flex: 1,
    alignItems: 'center',
    padding: spacing[5],
    borderRadius: borderRadius.xl,
    ...shadows.md,
  },
  quickActionGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[3],
  },

  // Smart Suggestions
  smartSection: {
    marginHorizontal: spacing[4],
    marginBottom: spacing[6],
    padding: spacing[6],
    borderRadius: borderRadius.xl,
    ...shadows.lg,
  },
  smartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[6],
  },
  advancedToggle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  smartGrid: {
    gap: spacing[4],
  },
  smartCard: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    ...shadows.md,
  },
  smartCardGradient: {
    padding: spacing[5],
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    minHeight: 80,
  },
  smartCardIcon: {
    marginRight: spacing[4],
  },
  smartCardContent: {
    flex: 1,
  },
  smartCardBadge: {
    position: 'absolute',
    top: spacing[2],
    right: spacing[2],
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Smart Suggestions (duplicate removed)

  // Meal Time Selector
  mealTimeSection: {
    marginHorizontal: spacing[4],
    marginBottom: spacing[6],
    padding: spacing[6],
    borderRadius: borderRadius.xl,
    ...shadows.md,
  },
  mealTimeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: spacing[3],
  },
  mealTimeCard: {
    width: (screenWidth - spacing[4] * 2 - spacing[6] * 2 - spacing[3]) / 2,
    aspectRatio: 1.2,
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
    position: 'relative',
  },
  mealTimeIcon: {
    marginBottom: spacing[2],
  },
  checkmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ModernHomeScreen;
