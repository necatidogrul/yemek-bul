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
  Text as RNText,
} from 'react-native';
import { Logger } from '../services/LoggerService';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { HomeStackParamList, FavoritesStackParamList } from '../../App';
import { Recipe } from '../types/Recipe';
import { SpeechService } from '../services/speechService';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// UI Components
import { Button, Text } from '../components/ui';
import { useTheme } from '../contexts/ThemeContext';
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

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Ortak route.params tipi tanımı
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
  // Tip güvenliği için route.params'ı kontrol ediyoruz
  const recipeId = route.params?.recipeId;
  const recipeName = route.params?.recipeName;
  const initialRecipe = route.params?.recipe as Recipe | undefined;
  const isAiGenerated = route.params?.isAiGenerated || false;
  
  // Recipe state - başlangıçta route'dan gelen recipe'yi kullan
  const [recipe, setRecipe] = useState<Recipe | undefined>(initialRecipe);
  const [isLoadingRecipe, setIsLoadingRecipe] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showQAModal, setShowQAModal] = useState(false);

  const [activeTab, setActiveTab] = useState<
    'ingredients' | 'instructions' | 'nutrition'
  >('ingredients');
  const [servingSize, setServingSize] = useState(recipe?.servings || 4);

  const { colors } = useTheme();
  const { showSuccess, showError } = useToast();
  const haptics = useHaptics();
  const { t } = useTranslation();

  // Premium export özelliği için guard
  const exportGuard = usePremiumGuard({
    feature: 'exportRecipes',
    title: 'Tarifleri PDF olarak dışa aktar',
  });

  // AI Soru-Cevap için premium guard
  const aiQuestionGuard = usePremiumGuard({
    feature: 'unlimitedRecipes',
    title: 'AI Soru-Cevap özelliği',
  });

  const scrollY = useRef(new Animated.Value(0)).current;
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [checkedIngredients, setCheckedIngredients] = useState<boolean[]>([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const imageScale = scrollY.interpolate({
    inputRange: [-200, 0],
    outputRange: [1.3, 1],
    extrapolate: 'clamp',
  });

  const heroImageOpacity = scrollY.interpolate({
    inputRange: [0, 300],
    outputRange: [1, 0.3],
    extrapolate: 'clamp',
  });

  const floatingButtonsScale = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.8],
    extrapolate: 'clamp',
  });

  // Load recipe if missing or incomplete
  useEffect(() => {
    const loadRecipeDetails = async () => {
      // Eğer recipe eksik veya instructions/ingredients yoksa yükle
      if (recipeId && (!recipe || !recipe.instructions || !recipe.ingredients)) {
        setIsLoadingRecipe(true);
        try {
          const fullRecipe = await RecipeService.getRecipeById(recipeId);
          if (fullRecipe) {
            setRecipe(fullRecipe);
          } else {
            // Recipe bulunamadı, mock data oluştur
            const mockRecipe: Recipe = {
              id: recipeId,
              name: recipeName || 'Tarif',
              ingredients: ['Malzeme bilgisi yükleniyor...'],
              instructions: ['Tarif adımları yükleniyor...'],
              cookingTime: 30,
              servings: 4,
              difficulty: 'orta',
            };
            setRecipe(mockRecipe);
          }
        } catch (error) {
          console.error('Failed to load recipe:', error);
          showError('Tarif detayları yüklenemedi');
        } finally {
          setIsLoadingRecipe(false);
        }
      }
    };

    loadRecipeDetails();
  }, [recipeId, recipeName]);

  // Initialize checked ingredients array
  useEffect(() => {
    if (recipe?.ingredients) {
      setCheckedIngredients(new Array(recipe.ingredients.length).fill(false));
    }
    
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
    
    // Shimmer animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [recipe?.ingredients, fadeAnim]);

  const toggleIngredient = (index: number) => {
    const newChecked = [...checkedIngredients];
    newChecked[index] = !newChecked[index];
    setCheckedIngredients(newChecked);
    haptics.selection();
  };

  // Beslenme bilgisi (nutrition) verileri
  const nutritionData = [
    {
      label: 'Kalori',
      value: '250',
      unit: 'kcal',
      color: colors.semantic.error,
    },
    { label: 'Protein', value: '15', unit: 'g', color: colors.primary[500] },
    {
      label: 'Karbonhidrat',
      value: '30',
      unit: 'g',
      color: colors.semantic.warning,
    },
    { label: 'Yağ', value: '10', unit: 'g', color: colors.warning[500] },
  ];

  const calculateScaledAmount = (
    originalAmount: string,
    originalServings: number
  ) => {
    const match = originalAmount.match(/(\d+(?:\.\d+)?)/);
    if (match) {
      const amount = parseFloat(match[1]);
      const scaledAmount = (amount * servingSize) / originalServings;
      return originalAmount.replace(match[1], scaledAmount.toString());
    }
    return originalAmount;
  };

  const shareRecipe = async () => {
    try {
      await Share.share({
        message: `${recipe?.name || 'Tarif'}\n\nMalzemeler:\n${
          recipe?.ingredients?.join('\n') || ''
        }\n\nHazırlık:\n${
          recipe?.instructions?.join('\n\n') || ''
        }\n\nYemek Bulucu ile paylaşıldı 🍽️`,
        title: recipe?.name || 'Tarif',
      });
    } catch (error) {
      Logger.error('Share failed:', error);
    }
  };

  // Premium export özelliği
  const handleExportToPDF = () => {
    if (!exportGuard.hasAccess) {
      exportGuard.requirePremium();
      return;
    }

    // TODO: PDF export implementasyonu
    showSuccess(t('success.pdfExportComingSoon'));
  };

  const startCooking = () => {
    setCurrentStep(0);
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
      await SpeechService.speak(recipe?.instructions?.[currentStep] || '', {
        language: 'tr-TR',
      });
    } catch (error) {
      Logger.error('Speech failed:', error);
    } finally {
      setIsPlaying(false);
    }
  };

  const handleQAOpen = () => {
    if (!aiQuestionGuard.hasAccess) {
      aiQuestionGuard.requirePremium();
      return;
    }
    setShowQAModal(true);
  };

  const handleAskQuestion = async (question: string): Promise<string> => {
    try {
      // Premium kontrolü
      if (!aiQuestionGuard.hasAccess) {
        aiQuestionGuard.requirePremium();
        throw new Error('Premium gerekli');
      }

      // OpenAI'a soru sor
      const answer = await OpenAIService.askRecipeQuestion(recipe, question);

      showSuccess(t('success.aiResponseReady'));
      return answer;
    } catch (error) {
      Logger.error('Recipe Q&A failed:', error);
      showError(t('errors.questionAnswerFailed'));
      throw error;
    }
  };

  const TabButton = ({
    id,
    title,
    isActive,
    onPress,
  }: {
    id: string;
    title: string;
    isActive: boolean;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      style={[
        styles.tabButton,
        {
          backgroundColor: isActive ? colors.primary[500] : 'transparent',
          borderColor: colors.primary[500],
        },
      ]}
      onPress={onPress}
    >
      <Text
        variant='labelMedium'
        weight='600'
        style={{ color: isActive ? 'white' : colors.primary[500] }}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );

  const renderIngredients = () => (
    <Animated.View style={[styles.contentSection, { opacity: fadeAnim }]}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleContainer}>
          <View style={[styles.sectionIcon, { backgroundColor: colors.primary[100] }]}>
            <Ionicons name='restaurant-outline' size={24} color={colors.primary[600]} />
          </View>
          <View>
            <Text variant='headlineSmall' weight='700'>
              Malzemeler
            </Text>
            <Text variant='bodySmall' color='secondary'>
              {recipe?.ingredients?.length || 0} malzeme • {servingSize} kişilik
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.servingSizeContainer}>
        <Text variant='labelLarge' weight='600'>
          Porsiyon Boyutu
        </Text>
        <View style={styles.servingSizeControls}>
          <TouchableOpacity
            style={[
              styles.servingButton,
              { 
                backgroundColor: colors.primary[100],
                opacity: servingSize > 1 ? 1 : 0.5 
              },
            ]}
            onPress={() => {
              if (servingSize > 1) {
                setServingSize(servingSize - 1);
                haptics.selection();
              }
            }}
            disabled={servingSize <= 1}
          >
            <Ionicons name='remove' size={20} color={colors.primary[600]} />
          </TouchableOpacity>

          <Animated.View
            style={[
              styles.servingDisplay, 
              { backgroundColor: colors.surface },
              { transform: [{ scale: fadeAnim }] }
            ]}
          >
            <Text
              variant='headlineSmall'
              weight='700'
              style={{ color: colors.primary[600] }}
            >
              {servingSize}
            </Text>
            <Text variant='labelSmall' color='secondary'>
              kişi
            </Text>
          </Animated.View>

          <TouchableOpacity
            style={[
              styles.servingButton,
              { backgroundColor: colors.primary[100] },
            ]}
            onPress={() => {
              setServingSize(servingSize + 1);
              haptics.selection();
            }}
          >
            <Ionicons name='add' size={20} color={colors.primary[600]} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.ingredientsList}>
        {recipe?.ingredients?.map((ingredient: string, index: number) => {
          const isChecked = checkedIngredients[index];
          return (
            <Animated.View
              key={index}
              style={[{
                transform: [{
                  translateY: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0]
                  })
                }],
                opacity: fadeAnim
              }]}
            >
              <TouchableOpacity
                style={[
                  styles.ingredientItem, 
                  { 
                    backgroundColor: isChecked ? colors.primary[50] : colors.surface,
                    borderColor: isChecked ? colors.primary[200] : colors.border.light,
                    borderWidth: 1,
                  }
                ]}
                onPress={() => toggleIngredient(index)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.ingredientNumber,
                    { 
                      backgroundColor: isChecked ? colors.primary[200] : colors.neutral[100],
                    },
                  ]}
                >
                  <Text
                    variant='labelMedium'
                    weight='600'
                    style={{ 
                      color: isChecked ? colors.primary[700] : colors.text.secondary,
                    }}
                  >
                    {index + 1}
                  </Text>
                </View>
                <Text 
                  variant='bodyMedium' 
                  style={{ 
                    flex: 1,
                    textDecorationLine: isChecked ? 'line-through' : 'none',
                    color: isChecked ? colors.text.secondary : colors.text.primary,
                  }}
                >
                  {calculateScaledAmount(ingredient, recipe?.servings || 4)}
                </Text>
                <Animated.View
                  style={[
                    styles.ingredientCheck,
                    { 
                      backgroundColor: isChecked ? colors.primary[500] : 'transparent',
                      borderColor: isChecked ? colors.primary[500] : colors.neutral[300],
                      transform: [{ scale: isChecked ? 1.1 : 1 }]
                    },
                  ]}
                >
                  {isChecked && (
                    <Ionicons
                      name='checkmark'
                      size={16}
                      color='white'
                    />
                  )}
                </Animated.View>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>
      
      <View style={[styles.progressContainer, { backgroundColor: colors.surface }]}>
        <View style={styles.progressHeader}>
          <Ionicons name='list-outline' size={20} color={colors.primary[500]} />
          <Text variant='labelMedium' weight='600'>
            İlerleme Durumu
          </Text>
        </View>
        <View style={styles.progressBar}>
          <Animated.View 
            style={[
              styles.progressFill,
              { 
                backgroundColor: colors.primary[500],
                width: `${(checkedIngredients.filter(Boolean).length / checkedIngredients.length) * 100}%`
              }
            ]} 
          />
        </View>
        <Text variant='labelSmall' color='secondary'>
          {checkedIngredients.filter(Boolean).length} / {checkedIngredients.length} malzeme hazırlandı
        </Text>
      </View>
    </Animated.View>
  );

  const renderInstructions = () => (
    <Animated.View style={[styles.contentSection, { opacity: fadeAnim }]}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleContainer}>
          <View style={[styles.sectionIcon, { backgroundColor: colors.primary[100] }]}>
            <Ionicons name='list' size={24} color={colors.primary[600]} />
          </View>
          <View>
            <Text variant='headlineSmall' weight='700'>
              Pişirme Adımları
            </Text>
            <Text variant='bodySmall' color='secondary'>
              Adım {currentStep + 1} / {recipe?.instructions?.length || 0}
            </Text>
          </View>
        </View>
        <View style={styles.cookingControls}>
          <TouchableOpacity
            style={[
              styles.controlButton,
              { 
                backgroundColor: isPlaying ? colors.primary[500] : colors.primary[100],
                ...shadows.md,
              },
            ]}
            onPress={playStepAudio}
            disabled={isPlaying}
          >
            {isPlaying ? (
              <ActivityIndicator size='small' color='white' />
            ) : (
              <Ionicons
                name='volume-high'
                size={20}
                color={colors.primary[600]}
              />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Step Progress Indicator */}
      <View style={[styles.stepProgressContainer, { backgroundColor: colors.surface }]}>
        <View style={styles.stepProgressBar}>
          {Array.from({ length: recipe?.instructions?.length || 0 }, (_, index) => (
            <Animated.View
              key={index}
              style={[
                styles.stepProgressDot,
                {
                  backgroundColor: index <= currentStep 
                    ? colors.primary[500] 
                    : colors.neutral[200],
                  transform: [{ 
                    scale: index === currentStep ? 1.2 : 1 
                  }]
                }
              ]}
            />
          ))}
        </View>
      </View>

      <Animated.View 
        style={[
          styles.stepCard, 
          { 
            backgroundColor: colors.surface,
            transform: [{ 
              translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [30, 0]
              })
            }]
          }
        ]}
      >
        <View style={styles.stepHeader}>
          <LinearGradient
            colors={[colors.primary[400], colors.primary[600]]}
            style={styles.stepNumber}
          >
            <Text
              variant='headlineSmall'
              weight='700'
              style={{ color: 'white' }}
            >
              {currentStep + 1}
            </Text>
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text variant='labelLarge' weight='600' color='primary'>
              Adım {currentStep + 1}
            </Text>
            <Text variant='labelSmall' color='secondary'>
              {recipe?.instructions?.length || 0} adımdan {currentStep + 1}.
            </Text>
          </View>
          <View style={[styles.timeEstimate, { backgroundColor: colors.warning[100] }]}>
            <Ionicons name='time-outline' size={16} color={colors.warning[600]} />
            <Text variant='labelSmall' style={{ color: colors.warning[600] }}>
              ~5dk
            </Text>
          </View>
        </View>

        <View style={styles.stepContentContainer}>
          <Text
            variant='bodyLarge'
            style={{ lineHeight: 32, color: colors.text.primary }}
          >
            {recipe?.instructions?.[currentStep]}
          </Text>
        </View>

        <View style={styles.stepNavigation}>
          <TouchableOpacity
            style={[
              styles.stepNavButton,
              {
                backgroundColor:
                  currentStep === 0
                    ? colors.neutral[100]
                    : colors.primary[100],
                opacity: currentStep === 0 ? 0.5 : 1,
                ...shadows.sm,
              },
            ]}
            onPress={previousStep}
            disabled={currentStep === 0}
          >
            <Ionicons
              name='chevron-back'
              size={20}
              color={
                currentStep === 0 ? colors.neutral[400] : colors.primary[600]
              }
            />
            <Text
              variant='labelMedium'
              weight='600'
              style={{
                color:
                  currentStep === 0
                    ? colors.neutral[400]
                    : colors.primary[600],
              }}
            >
              Önceki
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.stepNavButton,
              {
                backgroundColor:
                  currentStep === (recipe?.instructions?.length || 0) - 1
                    ? colors.semantic.success + '20'
                    : colors.primary[100],
                ...shadows.sm,
              },
            ]}
            onPress={nextStep}
            disabled={currentStep === (recipe?.instructions?.length || 0) - 1}
          >
            <Text
              variant='labelMedium'
              weight='600'
              style={{
                color:
                  currentStep === (recipe?.instructions?.length || 0) - 1
                    ? colors.semantic.success
                    : colors.primary[600],
              }}
            >
              {currentStep === (recipe?.instructions?.length || 0) - 1
                ? 'Tamamlandı'
                : 'Sonraki'}
            </Text>
            {currentStep < (recipe?.instructions?.length || 0) - 1 && (
              <Ionicons
                name='chevron-forward'
                size={20}
                color={colors.primary[600]}
              />
            )}
            {currentStep === (recipe?.instructions?.length || 0) - 1 && (
              <Ionicons
                name='checkmark-circle'
                size={20}
                color={colors.semantic.success}
              />
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Quick Start Button */}
      {currentStep === 0 && (
        <Animated.View style={{ opacity: fadeAnim }}>
          <LinearGradient
            colors={[colors.primary[500], colors.primary[600]]}
            style={styles.quickStartButton}
          >
            <TouchableOpacity
              style={styles.quickStartContent}
              onPress={startCooking}
            >
              <View style={styles.playIconContainer}>
                <Ionicons name='play' size={24} color='white' />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant='labelLarge' weight='700' style={{ color: 'white' }}>
                  Pişirmeye Başla
                </Text>
                <Text variant='bodySmall' style={{ color: 'rgba(255,255,255,0.8)' }}>
                  Sesli rehberlik ile adım adım ilerle
                </Text>
              </View>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      )}
    </Animated.View>
  );

  const renderNutrition = () => (
    <Animated.View style={[styles.contentSection, { opacity: fadeAnim }]}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleContainer}>
          <View style={[styles.sectionIcon, { backgroundColor: colors.info[100] }]}>
            <Ionicons name='fitness' size={24} color={colors.info[600]} />
          </View>
          <View>
            <Text variant='headlineSmall' weight='700'>
              Besin Değerleri
            </Text>
            <Text variant='bodySmall' color='secondary'>
              1 porsiyon bazında hesaplanmıştır
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.nutritionGrid}>
        {nutritionData.map((item, index) => {
          const animationDelay = index * 100;
          return (
            <Animated.View
              key={index}
              style={[
                {
                  transform: [{
                    translateY: fadeAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [30, 0]
                    })
                  }],
                  opacity: fadeAnim
                }
              ]}
            >
              <LinearGradient
                colors={[item.color + '10', item.color + '20']}
                style={[styles.nutritionCard, { backgroundColor: colors.surface }]}
              >
                <View style={styles.nutritionCardHeader}>
                  <LinearGradient
                    colors={[item.color + '20', item.color + '30']}
                    style={styles.nutritionIcon}
                  >
                    <View
                      style={[styles.nutritionDot, { backgroundColor: item.color }]}
                    />
                  </LinearGradient>
                  <Text variant='labelMedium' weight='600' color='secondary'>
                    {item.label}
                  </Text>
                </View>
                
                <View style={styles.nutritionValueContainer}>
                  <Text
                    variant='displaySmall'
                    weight='800'
                    style={{ color: item.color }}
                  >
                    {item.value}
                  </Text>
                  <Text 
                    variant='labelLarge' 
                    weight='600'
                    style={{ color: item.color, opacity: 0.8 }}
                  >
                    {item.unit}
                  </Text>
                </View>
                
                {/* Progress Bar */}
                <View style={styles.nutritionProgress}>
                  <View style={[styles.nutritionProgressBar, { backgroundColor: item.color + '20' }]}>
                    <Animated.View 
                      style={[
                        styles.nutritionProgressFill,
                        { 
                          backgroundColor: item.color,
                          width: fadeAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0%', `${Math.min(parseInt(item.value) / 100 * 80, 100)}%`]
                          })
                        }
                      ]}
                    />
                  </View>
                </View>
              </LinearGradient>
            </Animated.View>
          );
        })}
      </View>

      {/* Daily Values Summary */}
      <View style={[styles.dailyValuesSummary, { backgroundColor: colors.surface }]}>
        <View style={styles.summaryHeader}>
          <Ionicons name='bar-chart' size={20} color={colors.primary[500]} />
          <Text variant='labelLarge' weight='600'>
            Günlük Değerler
          </Text>
        </View>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <Text variant='bodySmall' color='secondary'>Kalori</Text>
            <Text variant='labelLarge' weight='600' style={{ color: colors.semantic.error }}>12%</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text variant='bodySmall' color='secondary'>Protein</Text>
            <Text variant='labelLarge' weight='600' style={{ color: colors.primary[500] }}>30%</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text variant='bodySmall' color='secondary'>Karb.</Text>
            <Text variant='labelLarge' weight='600' style={{ color: colors.semantic.warning }}>15%</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text variant='bodySmall' color='secondary'>Yağ</Text>
            <Text variant='labelLarge' weight='600' style={{ color: colors.warning[500] }}>18%</Text>
          </View>
        </View>
      </View>

      <View
        style={[styles.nutritionTips, { backgroundColor: colors.info[50] }]}
      >
        <View style={[styles.tipIcon, { backgroundColor: colors.info[100] }]}>
          <Ionicons
            name='information-circle'
            size={18}
            color={colors.info[600]}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant='labelMedium' weight='600' style={{ color: colors.info[700] }}>
            Besin Değerleri Hakkında
          </Text>
          <Text
            variant='bodySmall'
            color='secondary'
            style={{ lineHeight: 20, marginTop: spacing[2] }}
          >
            Bu değerler yaklaşık hesaplamalar olup, kullanılan malzemelerin markası ve özelliklerine göre değişebilir.
          </Text>
        </View>
      </View>
    </Animated.View>
  );

  // Recipe yoksa veya yükleniyorsa loading göster
  if (!recipe || isLoadingRecipe) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: colors.surface, marginBottom: 20 }]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name='arrow-back' size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <ActivityIndicator size='large' color={colors.primary[500]} />
          <Text variant='bodyMedium' color='secondary' style={{ marginTop: 20 }}>
            {isLoadingRecipe ? 'Tarif detayları yükleniyor...' : 'Tarif bilgisi eksik'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBar barStyle='light-content' />

      {/* Floating Header */}
      <Animated.View
        style={[
          styles.floatingHeader,
          { opacity: headerOpacity, backgroundColor: colors.background },
        ]}
      >
        <TouchableOpacity
          style={[styles.headerButton, { backgroundColor: colors.surface }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name='arrow-back' size={24} color={colors.text.primary} />
        </TouchableOpacity>

        <Text
          variant='headlineSmall'
          weight='600'
          numberOfLines={1}
          style={{ flex: 1, marginHorizontal: spacing[4] }}
        >
          {recipe?.name || 'Tarif'}
        </Text>

        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={[
              styles.headerButton, 
              { 
                backgroundColor: colors.surface,
                borderWidth: !exportGuard.hasAccess ? 2 : 0,
                borderColor: !exportGuard.hasAccess ? '#FFD700' : 'transparent',
              }
            ]}
            onPress={handleExportToPDF}
          >
            <Ionicons
              name='download-outline'
              size={24}
              color={
                exportGuard.hasAccess
                  ? colors.text.primary
                  : colors.text.secondary
              }
            />
            {!exportGuard.hasAccess && (
              <LinearGradient
                colors={['#FFD700', '#FFA500']}
                style={styles.premiumBadge}
              >
                <Ionicons name='star' size={12} color='white' />
              </LinearGradient>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: colors.surface }]}
            onPress={shareRecipe}
          >
            <Ionicons
              name='share-outline'
              size={24}
              color={colors.text.primary}
            />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={true}
        nestedScrollEnabled={true}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {/* Hero Image */}
        <Animated.View
          style={[
            styles.heroImage, 
            { 
              transform: [{ scale: imageScale }],
              opacity: heroImageOpacity,
            }
          ]}
        >
          {recipe?.imageUrl ? (
            <>
              <Image
                source={{ uri: recipe.imageUrl }}
                style={styles.recipeImage}
                resizeMode='cover'
                onLoadStart={() => setImageLoading(true)}
                onLoadEnd={() => setImageLoading(false)}
                onError={() => {
                  setImageError(true);
                  setImageLoading(false);
                }}
              />
              {imageLoading && (
                <View style={styles.imageLoader}>
                  <ActivityIndicator size='large' color='white' />
                </View>
              )}
              <LinearGradient
                colors={['rgba(0,0,0,0.4)', 'rgba(0,0,0,0.1)', 'rgba(0,0,0,0.6)']}
                style={styles.imageGradientOverlay}
                locations={[0, 0.5, 1]}
              />
            </>
          ) : (
            <LinearGradient
              colors={[
                colors.primary[400],
                colors.primary[600],
                colors.warning[500],
              ]}
              style={styles.imageGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.placeholderContent}>
                <Ionicons name='restaurant' size={80} color='white' />
                <Text style={styles.placeholderText}>Tarif Görseli</Text>
              </View>
            </LinearGradient>
          )}

          {/* Enhanced Overlay Controls */}
          <View style={styles.imageOverlay}>
            <View style={[styles.blurButton, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
              <TouchableOpacity
                style={styles.overlayButton}
                onPress={() => navigation.goBack()}
              >
                <Ionicons name='arrow-back' size={24} color='white' />
              </TouchableOpacity>
            </View>

            <Animated.View 
              style={[
                styles.overlayActions,
                { transform: [{ scale: floatingButtonsScale }] }
              ]}
            >
              <View style={[styles.blurButton, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                <TouchableOpacity
                  style={styles.overlayButton}
                  onPress={shareRecipe}
                >
                  <Ionicons name='share-outline' size={24} color='white' />
                </TouchableOpacity>
              </View>

              <View style={[styles.blurButton, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                <FavoriteButton
                  recipe={recipe || undefined}
                  size='large'
                  style={{ backgroundColor: 'transparent' }}
                />
              </View>
            </Animated.View>
          </View>

          {/* Recipe Badge */}
          {recipe?.difficulty && (
            <Animated.View 
              style={[
                styles.recipeBadge,
                { opacity: fadeAnim }
              ]}
            >
              <View style={[styles.badgeBlur, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
                <Ionicons
                  name={
                    recipe.difficulty === 'kolay'
                      ? 'checkmark-circle'
                      : recipe.difficulty === 'orta'
                        ? 'pause-circle'
                        : 'alert-circle'
                  }
                  size={16}
                  color={
                    recipe.difficulty === 'kolay'
                      ? colors.semantic.success
                      : recipe.difficulty === 'orta'
                        ? colors.semantic.warning
                        : colors.semantic.error
                  }
                />
                <Text style={{
                  ...styles.badgeText,
                  color: recipe.difficulty === 'kolay'
                    ? colors.success[500]
                    : recipe.difficulty === 'orta'
                      ? colors.warning[500]
                      : colors.semantic.error,
                }}>
                  {recipe.difficulty}
                </Text>
              </View>
            </Animated.View>
          )}
        </Animated.View>

        {/* Recipe Info */}
        <View style={styles.recipeInfo}>
          <View style={styles.recipeHeader}>
            <View style={styles.recipeTitleContainer}>
              <Text variant='displaySmall' weight='700'>
                {recipe?.name || 'Tarif'}
              </Text>

              {recipe?.difficulty && (
                <View
                  style={[
                    styles.difficultyBadge,
                    {
                      backgroundColor:
                        recipe?.difficulty === 'kolay'
                          ? colors.semantic.success + '20'
                          : recipe?.difficulty === 'orta'
                            ? colors.semantic.warning + '20'
                            : colors.semantic.error + '20',
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      recipe.difficulty === 'kolay'
                        ? 'checkmark-circle'
                        : recipe.difficulty === 'orta'
                          ? 'pause-circle'
                          : 'alert-circle'
                    }
                    size={16}
                    color={
                      recipe.difficulty === 'kolay'
                        ? colors.semantic.success
                        : recipe.difficulty === 'orta'
                          ? colors.semantic.warning
                          : colors.semantic.error
                    }
                  />
                  <Text
                    variant='labelMedium'
                    weight='600'
                    style={{
                      color:
                        recipe?.difficulty === 'kolay'
                          ? colors.semantic.success
                          : recipe?.difficulty === 'orta'
                            ? colors.semantic.warning
                            : colors.semantic.error,
                    }}
                  >
                    {recipe?.difficulty}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View
              style={[styles.statCard, { backgroundColor: colors.primary[50] }]}
            >
              <Ionicons name='time' size={20} color={colors.primary[500]} />
              <Text
                variant='labelLarge'
                weight='600'
                style={{ color: colors.primary[600] }}
              >
                {recipe?.cookingTime || '30'}dk
              </Text>
              <Text variant='labelSmall' color='secondary'>
                Süre
              </Text>
            </View>

            <View
              style={[
                styles.statCard,
                { backgroundColor: colors.primary[50] },
              ]}
            >
              <Ionicons name='people' size={20} color={colors.primary[500]} />
              <Text
                variant='labelLarge'
                weight='600'
                style={{ color: colors.primary[600] }}
              >
                {servingSize} kişi
              </Text>
              <Text variant='labelSmall' color='secondary'>
                Porsiyon
              </Text>
            </View>

            <View
              style={[
                styles.statCard,
                { backgroundColor: colors.semantic.warning + '20' },
              ]}
            >
              <Ionicons
                name='restaurant'
                size={20}
                color={colors.semantic.warning}
              />
              <Text
                variant='labelLarge'
                weight='600'
                style={{ color: colors.semantic.warning }}
              >
                {recipe?.ingredients?.length || 0}
              </Text>
              <Text variant='labelSmall' color='secondary'>
                Malzeme
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <LinearGradient
              colors={[
                !aiQuestionGuard.hasAccess ? '#FFD700' : colors.primary[400], 
                !aiQuestionGuard.hasAccess ? '#FFA500' : colors.primary[600]
              ]}
              style={[styles.primaryActionButton]}
            >
              <TouchableOpacity
                style={styles.primaryActionContent}
                onPress={handleQAOpen}
              >
                <View style={styles.aiIconContainer}>
                  <Ionicons name='chatbubble-ellipses' size={24} color='white' />
                  <View style={styles.aiIndicator}>
                    <Animated.View style={[
                      styles.aiDot,
                      {
                        opacity: shimmerAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.3, 1]
                        })
                      }
                    ]} />
                  </View>
                  {!aiQuestionGuard.hasAccess && (
                    <View style={styles.premiumOverlay}>
                      <Ionicons name='star' size={12} color='white' />
                    </View>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant='labelLarge' weight='700' style={{ color: 'white' }}>
                    AI Soru-Cevap {!aiQuestionGuard.hasAccess && '⭐'}
                  </Text>
                  <Text variant='bodySmall' style={{ color: 'rgba(255,255,255,0.8)' }}>
                    {aiQuestionGuard.hasAccess 
                      ? 'Tarif hakkında her şeyi sor' 
                      : 'Premium özellik - Sınırsız soru'}
                  </Text>
                </View>
              </TouchableOpacity>
            </LinearGradient>

            <View style={styles.secondaryActions}>
              <TouchableOpacity
                style={[styles.iconButton, { backgroundColor: colors.surface }]}
                onPress={shareRecipe}
              >
                <Ionicons
                  name='share-outline'
                  size={24}
                  color={colors.text.primary}
                />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.iconButton, 
                  { 
                    backgroundColor: !exportGuard.hasAccess ? '#FFD70020' : colors.surface,
                    borderWidth: !exportGuard.hasAccess ? 1 : 0,
                    borderColor: !exportGuard.hasAccess ? '#FFD700' : 'transparent',
                  }
                ]}
                onPress={handleExportToPDF}
              >
                <Ionicons
                  name='download-outline'
                  size={24}
                  color={!exportGuard.hasAccess ? '#FFD700' : colors.text.primary}
                />
                {!exportGuard.hasAccess && (
                  <View style={styles.premiumMicro}>
                    <Ionicons name='star' size={8} color='#FFD700' />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Tabs */}
          <View style={styles.tabContainer}>
            <TabButton
              id='ingredients'
              title='Malzemeler'
              isActive={activeTab === 'ingredients'}
              onPress={() => setActiveTab('ingredients')}
            />
            <TabButton
              id='instructions'
              title='Tarif'
              isActive={activeTab === 'instructions'}
              onPress={() => setActiveTab('instructions')}
            />
            <TabButton
              id='nutrition'
              title='Besin Değeri'
              isActive={activeTab === 'nutrition'}
              onPress={() => setActiveTab('nutrition')}
            />
          </View>

          {/* Tab Content */}
          {activeTab === 'ingredients' && renderIngredients()}
          {activeTab === 'instructions' && renderInstructions()}
          {activeTab === 'nutrition' && renderNutrition()}

          {/* Bottom Spacing */}
          <View style={{ height: spacing[20] }} />
        </View>
      </Animated.ScrollView>

      {/* Modals */}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100,
  },

  // Floating Header
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingTop: StatusBar.currentHeight || 44,
    paddingBottom: spacing[4],
    zIndex: 100,
    ...shadows.md,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    position: 'relative',
    justifyContent: 'center',
    ...shadows.sm,
  },
  premiumBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    ...shadows.md,
  },

  // Hero Image
  heroImage: {
    height: screenHeight * 0.45,
    position: 'relative',
    overflow: 'hidden',
  },
  recipeImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  imageGradient: {
    flex: 1,
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageGradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
  placeholderContent: {
    alignItems: 'center',
    gap: spacing[5],
  },
  placeholderText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    opacity: 0.8,
  },
  blurButton: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  recipeBadge: {
    position: 'absolute',
    bottom: spacing[6],
    left: spacing[5],
  },
  badgeBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.full,
    gap: spacing[3],
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing[4],
    paddingTop: (StatusBar.currentHeight || 44) + spacing[4],
  },
  overlayButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayActions: {
    flexDirection: 'row',
    gap: spacing[3],
  },

  // Recipe Info
  recipeInfo: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: borderRadius.md,
    borderTopRightRadius: borderRadius.md,
    marginTop: -spacing[5],
    paddingHorizontal: spacing[5],
    paddingTop: spacing[6],
  },
  recipeHeader: {
    marginBottom: spacing[5],
  },
  recipeTitleContainer: {
    gap: spacing[3],
  },
  difficultyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    gap: spacing[2],
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    gap: spacing[3],
    marginBottom: spacing[6],
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing[5],
    borderRadius: borderRadius.lg,
    gap: spacing[2],
  },

  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    gap: spacing[4],
    marginBottom: spacing[6],
  },
  primaryActionButton: {
    flex: 1,
    borderRadius: borderRadius.xl,
    ...shadows.lg,
  },
  primaryActionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[5],
    gap: spacing[4],
  },
  aiIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  aiIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#00FF88',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'white',
  },
  secondaryActions: {
    flexDirection: 'column',
    gap: spacing[3],
  },
  iconButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    ...shadows.sm,
  },
  premiumMicro: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  premiumOverlay: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'white',
    ...shadows.md,
  },

  // Tabs
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: borderRadius.lg,
    padding: spacing[2],
    marginBottom: spacing[6],
    ...shadows.sm,
  },
  tabButton: {
    flex: 1,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.base,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },

  // Content Section
  contentSection: {
    gap: spacing[5],
  },
  
  // Section Header
  sectionHeader: {
    marginBottom: spacing[5],
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
  },
  sectionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Progress Container
  progressContainer: {
    padding: spacing[5],
    borderRadius: borderRadius.lg,
    marginTop: spacing[5],
    ...shadows.sm,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: borderRadius.full,
    marginBottom: spacing[3],
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: borderRadius.full,
    ...shadows.xs,
  },

  // Serving Size
  servingSizeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[5],
  },
  servingSizeControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  servingButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  servingDisplay: {
    alignItems: 'center',
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[4],
    borderRadius: borderRadius.lg,
    minWidth: 80,
    ...shadows.md,
  },

  // Ingredients
  ingredientsList: {
    gap: spacing[3],
  },
  ingredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[5],
    borderRadius: borderRadius.lg,
    gap: spacing[4],
    ...shadows.md,
    marginVertical: spacing[2],
    transform: [{ scale: 1 }],
  },
  ingredientNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ingredientCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },

  // Cooking Mode
  cookingModeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cookingControls: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepProgressContainer: {
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    marginBottom: spacing[5],
    ...shadows.sm,
  },
  stepProgressBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepProgressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginHorizontal: 2,
  },
  stepCard: {
    padding: spacing[6],
    borderRadius: borderRadius.xl,
    ...shadows.lg,
    marginVertical: spacing[4],
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
    marginBottom: spacing[5],
  },
  stepNumber: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  timeEstimate: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    gap: spacing[2],
  },
  stepContentContainer: {
    backgroundColor: 'rgba(0,0,0,0.05)',
    padding: spacing[5],
    borderRadius: borderRadius.lg,
    marginBottom: spacing[5],
  },
  stepNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing[4],
  },
  stepNavButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[5],
    borderRadius: borderRadius.lg,
    gap: spacing[3],
  },
  quickStartButton: {
    borderRadius: borderRadius.xl,
    marginTop: spacing[5],
    ...shadows.lg,
  },
  quickStartContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[5],
    gap: spacing[4],
  },
  playIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Nutrition
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[4],
    marginBottom: spacing[6],
  },
  nutritionCard: {
    width: (screenWidth - spacing[5] * 2 - spacing[4]) / 2,
    padding: spacing[5],
    borderRadius: borderRadius.xl,
    ...shadows.lg,
    overflow: 'hidden',
  },
  nutritionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[4],
  },
  nutritionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nutritionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  nutritionValueContainer: {
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  nutritionProgress: {
    width: '100%',
  },
  nutritionProgressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  nutritionProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  dailyValuesSummary: {
    padding: spacing[5],
    borderRadius: borderRadius.lg,
    marginBottom: spacing[5],
    ...shadows.sm,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  nutritionTips: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing[5],
    borderRadius: borderRadius.lg,
    gap: spacing[4],
    ...shadows.sm,
  },
  tipIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  
  // Loading state
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[6],
  },
});

export default RecipeDetailScreen;
