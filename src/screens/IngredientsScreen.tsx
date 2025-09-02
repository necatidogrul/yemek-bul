import React, { useState, useEffect } from 'react';
import { Logger } from '../services/LoggerService';
import {
  View,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  StatusBar,
  Alert,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { HomeStackParamList } from '../components/navigation/ThemedNavigators';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';

// Components
import { Text } from '../components/ui';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { useHaptics } from '../hooks/useHaptics';
import { useToast } from '../contexts/ToastContext';
import { usePremium } from '../contexts/PremiumContext';

// Services
import { OpenAIService } from '../services/openaiService';
import { UsageLimitService } from '../services/UsageLimitService';

// Theme
import { spacing, borderRadius, shadows } from '../theme/design-tokens';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

type IngredientsScreenProps = {
  navigation: StackNavigationProp<HomeStackParamList, 'IngredientsSelect'>;
};

const SUGGESTED_INGREDIENTS = [
  { name: 'Domates', icon: '🍅' },
  { name: 'Soğan', icon: '🧅' },
  { name: 'Peynir', icon: '🧀' },
  { name: 'Yumurta', icon: '🥚' },
  { name: 'Patates', icon: '🥔' },
  { name: 'Tavuk', icon: '🍗' },
  { name: 'Et', icon: '🥩' },
  { name: 'Biber', icon: '🌶️' },
  { name: 'Süt', icon: '🥛' },
  { name: 'Un', icon: '🌾' },
  { name: 'Yağ', icon: '🧈' },
  { name: 'Salça', icon: '🥫' },
];

export const IngredientsScreen: React.FC<IngredientsScreenProps> = ({
  navigation,
}) => {
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [inputText, setInputText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [remainingCredits, setRemainingCredits] = useState<{daily: number, monthly?: number}>({ daily: 1 });
  const { colors } = useThemedStyles();
  const haptics = useHaptics();
  const { showWarning } = useToast();
  const { isPremium, showPaywall } = usePremium();

  // Kredi durumunu kontrol et
  useEffect(() => {
    const checkCredits = async () => {
      const remaining = await UsageLimitService.getRemainingRequests(isPremium);
      setRemainingCredits(remaining);
    };
    checkCredits();
  }, [isPremium]);

  const addIngredient = (ingredient: string) => {
    const trimmed = ingredient.trim().toLowerCase();
    if (trimmed && !ingredients.includes(trimmed)) {
      setIngredients(prev => [...prev, trimmed]);
      setInputText('');
      haptics.selection();
    } else if (ingredients.includes(trimmed)) {
      haptics.error();
      // Visual feedback from ingredient list is enough
    }
  };

  const removeIngredient = (ingredient: string) => {
    setIngredients(prev => prev.filter(item => item !== ingredient));
    haptics.selection();
  };

  const toggleIngredient = (ingredient: string) => {
    const trimmed = ingredient.trim().toLowerCase();
    if (ingredients.includes(trimmed)) {
      // Malzeme zaten seçili, kaldır
      removeIngredient(trimmed);
    } else {
      // Malzeme seçili değil, ekle
      addIngredient(ingredient);
    }
  };

  const handleSubmit = async () => {
    if (ingredients.length === 0) {
      showWarning('En az bir malzeme ekleyin');
      return;
    }

    // Kredi kontrolü
    if (!isPremium && remainingCredits.daily <= 0) {
      showPaywall(
        'Tarif Arama',
        'Tarif aramak için premium üyelik gerekir veya günlük limitiniz dolmuş.'
      );
      return;
    }

    // Log ingredients screen tarif arama başlatması
    console.log('📝 Ingredients screen recipe generation started:', {
      ingredients: ingredients,
      ingredientCount: ingredients.length,
      isPremium,
      remainingCredits,
      timestamp: new Date().toISOString(),
    });

    // Tüm kullanıcılar için kullanımı güncelle
    await UsageLimitService.useRequest(isPremium);
    const newRemainingCredits = await UsageLimitService.getRemainingRequests(isPremium);
    setRemainingCredits(newRemainingCredits);
    
    // Log kredi kullanımı
    console.log('💳 Credit used for ingredients screen:', {
      ingredients: ingredients,
      ingredientCount: ingredients.length,
      creditsRemaining: newRemainingCredits,
      timestamp: new Date().toISOString(),
      isPremium,
    });

    haptics.success();
    // Navigation provides feedback, no need for toast

    // Navigate back to home with ingredients
    navigation.navigate('HomeMain', {
      prefillIngredients: ingredients,
      shouldGenerateRecipes: true,
    });
  };

  const handleClose = () => {
    haptics.selection();
    navigation.goBack();
  };

  const requestCameraPermissions = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Kamera İzni Gerekli',
        'Bu özelliği kullanmak için kamera erişimine izin vermelisiniz.',
        [{ text: 'Tamam' }]
      );
      return false;
    }
    return true;
  };

  const analyzeImages = async (imageUris: string[]) => {
    try {
      setIsAnalyzing(true);

      // Log fotoğraf analizi başlatması
      console.log('📝 Image analysis started:', {
        imageCount: imageUris.length,
        isPremium,
        remainingCredits,
        timestamp: new Date().toISOString(),
      });

      // Çoklu fotoğraf analizi
      const detectedIngredients =
        imageUris.length === 1
          ? await OpenAIService.analyzeIngredientImage(imageUris[0])
          : await OpenAIService.analyzeIngredientImages(imageUris);

      if (detectedIngredients && detectedIngredients.length > 0) {
        // Tüm kullanıcılar için kullanımı güncelle
        await UsageLimitService.useRequest(isPremium);
        const newRemainingCredits = await UsageLimitService.getRemainingRequests(isPremium);
        setRemainingCredits(newRemainingCredits);
        
        // Log kredi kullanımı
        console.log('💳 Credit used for image analysis:', {
          imageCount: imageUris.length,
          detectedIngredients: detectedIngredients,
          creditsRemaining: newRemainingCredits,
          timestamp: new Date().toISOString(),
          isPremium,
        });

        // Tespit edilen malzemeleri ekle
        const newIngredients = [...ingredients];
        detectedIngredients.forEach(ingredient => {
          const trimmed = ingredient.toLowerCase();
          if (!newIngredients.includes(trimmed)) {
            newIngredients.push(trimmed);
          }
        });
        setIngredients(newIngredients);

        haptics.success();
        // Visual addition of ingredients is feedback enough
      } else {
        showWarning('Fotoğraflarda malzeme tespit edilemedi');
      }
    } catch (error) {
      console.error('Fotoğraf analizi hatası:', error);
      showWarning('Fotoğraf analiz edilemedi, tekrar deneyin');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const takeFridgePhoto = async () => {
    const hasPermission = await requestCameraPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const newImageUri = result.assets[0].uri;
        const updatedImages = [...selectedImages, newImageUri];
        setSelectedImages(updatedImages);

        haptics.selection();

        // Hemen analiz et
        await analyzeImages(updatedImages);
      }
    } catch (error) {
      console.error('Kamera hatası:', error);
      showWarning('Kamera açılamadı');
    }
  };

  const pickFridgePhotos = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 5, // Maksimum 5 resim
      });

      if (!result.canceled && result.assets.length > 0) {
        const newImageUris = result.assets.map(asset => asset.uri);
        const updatedImages = [...selectedImages, ...newImageUris].slice(0, 5); // Maksimum 5 resim
        setSelectedImages(updatedImages);

        haptics.selection();

        // Hemen analiz et
        await analyzeImages(updatedImages);
      }
    } catch (error) {
      console.error('Galeri hatası:', error);
      showWarning('Galeri açılamadı');
    }
  };

  const removeImage = (imageUri: string) => {
    const updatedImages = selectedImages.filter(uri => uri !== imageUri);
    setSelectedImages(updatedImages);
    haptics.selection();
  };

  const clearImages = () => {
    setSelectedImages([]);
    haptics.selection();
  };

  const showPhotoOptions = () => {
    // Kredi kontrolü
    if (!isPremium && remainingCredits.daily <= 0) {
      showPaywall(
        'Buzdolabı Fotoğrafı',
        'Buzdolabı fotoğrafı analizini kullanmak için premium üyelik gerekir.'
      );
      return;
    }

    Alert.alert(
      'Buzdolabı Fotoğrafları',
      selectedImages.length > 0
        ? `${selectedImages.length} fotoğraf seçildi. Daha fazla eklemek istiyorsunuz?`
        : 'Buzdolabınızın fotoğraflarını nasıl eklemek istiyorsunuz?',
      [
        { text: 'İptal', style: 'cancel' },
        ...(selectedImages.length > 0
          ? [
              {
                text: 'Fotoğrafları Temizle',
                onPress: clearImages,
                style: 'destructive' as const,
              },
            ]
          : []),
        { text: 'Kamera ile Çek', onPress: takeFridgePhoto },
        { text: 'Galeriden Seç (Çoklu)', onPress: pickFridgePhotos },
      ]
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background.primary }]}
    >
      <StatusBar barStyle='light-content' backgroundColor='#1a1a2e' />

      {/* Header */}
      <View
        style={[styles.header, { backgroundColor: colors.surface.primary }]}
      >
        <TouchableOpacity onPress={handleClose} style={styles.backButton}>
          <Ionicons name='arrow-back' size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text
            variant='headlineSmall'
            weight='bold'
            style={{ color: colors.text.primary }}
          >
            Malzeme Seç
          </Text>
          <Text variant='bodySmall' color='secondary'>
            Evindeki malzemeleri ekle
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.creditCounter,
            { backgroundColor: isPremium ? colors.success[100] : colors.primary[100] },
          ]}
          onPress={() => {
            if (!isPremium) {
              showPaywall('Kredi Bilgisi', 'Premium üyelikle sınırsız kullanım');
            }
          }}
          activeOpacity={0.7}
        >
          <Ionicons 
            name={isPremium ? 'star' : 'diamond'} 
            size={14} 
            color={isPremium ? colors.success[600] : colors.primary[600]} 
          />
          <Text
            variant='labelMedium'
            weight='600'
            style={{ color: isPremium ? colors.success[600] : colors.primary[600], fontSize: 12 }}
          >
            {isPremium ? 
              `G: ${remainingCredits.daily} | A: ${remainingCredits.monthly || 0}` : 
              remainingCredits.daily
            }
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps='handled'
        >
          {/* Search Input */}
          <View
            style={[
              styles.inputSection,
              { backgroundColor: colors.neutral[50] },
            ]}
          >
            <View
              style={[
                styles.inputContainer,
                { borderColor: colors.neutral[200] },
              ]}
            >
              <Ionicons name='search' size={20} color={colors.neutral[400]} />
              <TextInput
                style={[styles.input, { color: colors.text.primary }]}
                placeholder='Malzeme ara veya ekle...'
                placeholderTextColor={colors.neutral[400]}
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={() => addIngredient(inputText)}
                returnKeyType='done'
              />
              {inputText.length > 0 && (
                <TouchableOpacity
                  onPress={() => addIngredient(inputText)}
                  style={[
                    styles.addButton,
                    { backgroundColor: colors.primary[500] },
                  ]}
                >
                  <Ionicons name='add' size={18} color='#fff' />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Fridge Photo Button */}
          <View style={styles.fridgePhotoSection}>
            <TouchableOpacity
              style={[
                styles.fridgePhotoButton,
                {
                  backgroundColor: colors.background.secondary,
                  borderColor: 
                    !isPremium && remainingCredits.daily <= 0
                      ? colors.neutral[300]
                      : colors.primary[200],
                  opacity: 
                    isAnalyzing || (!isPremium && remainingCredits.daily <= 0)
                      ? 0.6
                      : 1,
                },
              ]}
              onPress={showPhotoOptions}
              disabled={isAnalyzing || (!isPremium && remainingCredits.daily <= 0)}
            >
              <LinearGradient
                colors={
                  !isPremium && remainingCredits.daily <= 0
                    ? [colors.neutral[200], colors.neutral[100]]
                    : [colors.primary[100], colors.primary[50]]
                }
                style={styles.fridgePhotoGradient}
              >
                <View style={styles.fridgePhotoIcon}>
                  <Ionicons
                    name={
                      isAnalyzing
                        ? 'hourglass'
                        : !isPremium && remainingCredits.daily <= 0
                        ? 'lock-closed'
                        : 'camera'
                    }
                    size={24}
                    color={
                      !isPremium && remainingCredits.daily <= 0
                        ? colors.neutral[500]
                        : colors.primary[600]
                    }
                  />
                </View>
                <View style={styles.fridgePhotoText}>
                  <Text
                    variant='bodyMedium'
                    weight='600'
                    style={{
                      color:
                        !isPremium && remainingCredits.daily <= 0
                          ? colors.neutral[600]
                          : colors.primary[700],
                    }}
                  >
                    {isAnalyzing
                      ? 'Fotoğraflar Analiz Ediliyor...'
                      : !isPremium && remainingCredits.daily <= 0
                      ? 'Premium Özellik - Kilit'
                      : selectedImages.length > 0
                      ? `${selectedImages.length} Fotoğraf Seçildi - Daha Ekle`
                      : 'Buzdolabının Fotoğrafını Çek'}
                  </Text>
                  <Text variant='bodySmall' color='secondary'>
                    {!isPremium && remainingCredits.daily <= 0
                      ? 'Premium üyelik ile kullanılabilir'
                      : 'AI ile otomatik malzeme tespit et'}
                  </Text>
                </View>
                <Ionicons
                  name='chevron-forward'
                  size={20}
                  color={
                    !isPremium && remainingCredits.daily <= 0
                      ? colors.neutral[400]
                      : colors.primary[500]
                  }
                />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Selected Images */}
          {selectedImages.length > 0 && (
            <View style={styles.selectedImagesSection}>
              <View style={styles.sectionHeader}>
                <Text
                  variant='labelLarge'
                  weight='600'
                  style={{ color: colors.text.primary }}
                >
                  Seçilen Fotoğraflar ({selectedImages.length})
                </Text>
                <TouchableOpacity onPress={clearImages}>
                  <Text
                    variant='labelSmall'
                    style={{ color: colors.primary[500] }}
                  >
                    Temizle
                  </Text>
                </TouchableOpacity>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.imageScrollView}
              >
                <View style={styles.imageContainer}>
                  {selectedImages.map((imageUri, index) => (
                    <View key={index} style={styles.imageWrapper}>
                      <Image
                        source={{ uri: imageUri }}
                        style={styles.selectedImage}
                      />
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => removeImage(imageUri)}
                      >
                        <Ionicons
                          name='close-circle'
                          size={20}
                          color={colors.error[500]}
                        />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Selected Ingredients */}
          {ingredients.length > 0 && (
            <View style={styles.selectedSection}>
              <View style={styles.sectionHeader}>
                <Text
                  variant='labelLarge'
                  weight='600'
                  style={{ color: colors.text.primary }}
                >
                  Seçilen Malzemeler ({ingredients.length})
                </Text>
                <TouchableOpacity onPress={() => setIngredients([])}>
                  <Text
                    variant='labelSmall'
                    style={{ color: colors.primary[500] }}
                  >
                    Temizle
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.selectedIngredients}>
                {ingredients.map((ingredient, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.selectedIngredientChip,
                      { backgroundColor: colors.primary[100] },
                    ]}
                    onPress={() => removeIngredient(ingredient)}
                  >
                    <Text
                      variant='labelSmall'
                      weight='500'
                      style={{ color: colors.primary[700] }}
                    >
                      {ingredient}
                    </Text>
                    <Ionicons
                      name='close-circle'
                      size={16}
                      color={colors.primary[500]}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Suggested Ingredients */}
          <View style={styles.suggestionsSection}>
            <Text
              variant='labelLarge'
              weight='600'
              style={{ color: colors.text.primary, marginBottom: spacing[3] }}
            >
              Önerilen Malzemeler
            </Text>
            <View style={styles.suggestionsGrid}>
              {SUGGESTED_INGREDIENTS.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.suggestionChip,
                    {
                      backgroundColor: ingredients.includes(
                        item.name.toLowerCase()
                      )
                        ? colors.primary[100]
                        : colors.background.secondary,
                      borderColor: ingredients.includes(item.name.toLowerCase())
                        ? colors.primary[300]
                        : colors.neutral[200],
                    },
                  ]}
                  onPress={() => toggleIngredient(item.name)}
                >
                  <Text style={styles.suggestionIcon}>{item.icon}</Text>
                  <Text
                    variant='labelSmall'
                    style={{
                      color: ingredients.includes(item.name.toLowerCase())
                        ? colors.primary[700]
                        : colors.text.primary,
                      textAlign: 'center',
                    }}
                  >
                    {item.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Submit Button */}
      <View
        style={[styles.footer, { backgroundColor: colors.background.primary }]}
      >
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={
            ingredients.length === 0 || (!isPremium && remainingCredits.daily <= 0)
          }
        >
          <LinearGradient
            colors={
              ingredients.length > 0 && (isPremium || remainingCredits.daily > 0)
                ? [colors.primary[500], colors.primary[600]]
                : [colors.neutral[300], colors.neutral[400]]
            }
            style={styles.submitGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons
              name={
                !isPremium && remainingCredits.daily <= 0 ? 'lock-closed' : 'sparkles'
              }
              size={20}
              color='#fff'
            />
            <Text variant='bodyLarge' weight='600' style={{ color: '#fff' }}>
              {!isPremium && remainingCredits.daily <= 0
                ? 'Premium Gerekli'
                : `Tarif Bul (${ingredients.length})`}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    ...shadows.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  creditCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
    gap: spacing[1],
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  inputSection: {
    padding: spacing[4],
    margin: spacing[4],
    borderRadius: borderRadius.lg,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    gap: spacing[2],
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: spacing[1],
  },
  addButton: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedSection: {
    paddingHorizontal: spacing[4],
    marginTop: spacing[2],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  selectedIngredients: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  selectedIngredientChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    gap: spacing[2],
  },
  suggestionsSection: {
    paddingHorizontal: spacing[4],
    marginTop: spacing[6],
  },
  suggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  suggestionChip: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    minWidth: (screenWidth - spacing[4] * 2 - spacing[2] * 3) / 4,
    gap: spacing[1],
  },
  suggestionIcon: {
    fontSize: 20,
  },
  fridgePhotoSection: {
    paddingHorizontal: spacing[4],
    marginTop: spacing[2],
  },
  fridgePhotoButton: {
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    overflow: 'hidden',
    ...shadows.sm,
  },
  fridgePhotoGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    gap: spacing[3],
  },
  fridgePhotoIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  fridgePhotoText: {
    flex: 1,
  },
  selectedImagesSection: {
    paddingHorizontal: spacing[4],
    marginTop: spacing[4],
  },
  imageScrollView: {
    marginTop: spacing[2],
  },
  imageContainer: {
    flexDirection: 'row',
    gap: spacing[2],
    paddingRight: spacing[4],
  },
  imageWrapper: {
    position: 'relative',
  },
  selectedImage: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
    backgroundColor: '#f0f0f0',
  },
  removeImageButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: 'white',
    borderRadius: borderRadius.full,
    ...shadows.sm,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing[4],
    paddingBottom: Platform.OS === 'ios' ? spacing[6] : spacing[4],
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
    ...shadows.md,
  },
  submitButton: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[4],
    gap: spacing[2],
  },
});
