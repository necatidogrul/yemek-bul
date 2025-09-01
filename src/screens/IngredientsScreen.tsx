import React, { useState } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { HomeStackParamList } from '../components/navigation/ThemedNavigators';

// Components
import { Text } from '../components/ui';
import { useThemedStyles } from '../hooks/useThemedStyles';
import { useHaptics } from '../hooks/useHaptics';
import { useToast } from '../contexts/ToastContext';

// Services
import { OpenAIService } from '../services/openaiService';

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
  const { colors } = useThemedStyles();
  const haptics = useHaptics();
  const { showSuccess, showWarning } = useToast();

  const addIngredient = (ingredient: string) => {
    const trimmed = ingredient.trim().toLowerCase();
    if (trimmed && !ingredients.includes(trimmed)) {
      setIngredients(prev => [...prev, trimmed]);
      setInputText('');
      haptics.selection();
    } else if (ingredients.includes(trimmed)) {
      showWarning('Bu malzeme zaten eklendi');
    }
  };

  const removeIngredient = (ingredient: string) => {
    setIngredients(prev => prev.filter(item => item !== ingredient));
    haptics.selection();
  };

  const handleSubmit = () => {
    if (ingredients.length === 0) {
      showWarning('En az bir malzeme ekleyin');
      return;
    }
    haptics.success();
    showSuccess(`${ingredients.length} malzeme ile tarif aranıyor`);
    
    // Navigate back to home with ingredients
    navigation.navigate('HomeMain', { 
      prefillIngredients: ingredients,
      shouldGenerateRecipes: true 
    });
  };

  const handleClose = () => {
    haptics.selection();
    navigation.goBack();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background.primary }]}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface.primary }]}>
        <TouchableOpacity onPress={handleClose} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text variant="headlineSmall" weight="bold" style={{ color: colors.text.primary }}>
            Malzeme Seç
          </Text>
          <Text variant="bodySmall" color="secondary">
            Evindeki malzemeleri ekle
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          style={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Search Input */}
          <View style={[styles.inputSection, { backgroundColor: colors.neutral[50] }]}>
            <View style={[styles.inputContainer, { borderColor: colors.neutral[200] }]}>
              <Ionicons name="search" size={20} color={colors.neutral[400]} />
              <TextInput
                style={[styles.input, { color: colors.text.primary }]}
                placeholder="Malzeme ara veya ekle..."
                placeholderTextColor={colors.neutral[400]}
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={() => addIngredient(inputText)}
                returnKeyType="done"
              />
              {inputText.length > 0 && (
                <TouchableOpacity
                  onPress={() => addIngredient(inputText)}
                  style={[styles.addButton, { backgroundColor: colors.primary[500] }]}
                >
                  <Ionicons name="add" size={18} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Selected Ingredients */}
          {ingredients.length > 0 && (
            <View style={styles.selectedSection}>
              <View style={styles.sectionHeader}>
                <Text variant="labelLarge" weight="600" style={{ color: colors.text.primary }}>
                  Seçilen Malzemeler ({ingredients.length})
                </Text>
                <TouchableOpacity onPress={() => setIngredients([])}>
                  <Text variant="labelSmall" style={{ color: colors.primary[500] }}>
                    Temizle
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.selectedIngredients}>
                {ingredients.map((ingredient, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.selectedIngredientChip, { backgroundColor: colors.primary[100] }]}
                    onPress={() => removeIngredient(ingredient)}
                  >
                    <Text variant="labelSmall" weight="500" style={{ color: colors.primary[700] }}>
                      {ingredient}
                    </Text>
                    <Ionicons name="close-circle" size={16} color={colors.primary[500]} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Suggested Ingredients */}
          <View style={styles.suggestionsSection}>
            <Text variant="labelLarge" weight="600" style={{ color: colors.text.primary, marginBottom: spacing[3] }}>
              Önerilen Malzemeler
            </Text>
            <View style={styles.suggestionsGrid}>
              {SUGGESTED_INGREDIENTS.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.suggestionChip, 
                    { 
                      backgroundColor: ingredients.includes(item.name.toLowerCase()) 
                        ? colors.primary[100] 
                        : colors.background.secondary,
                      borderColor: ingredients.includes(item.name.toLowerCase())
                        ? colors.primary[300]
                        : colors.neutral[200],
                    }
                  ]}
                  onPress={() => addIngredient(item.name)}
                >
                  <Text style={styles.suggestionIcon}>{item.icon}</Text>
                  <Text 
                    variant="labelSmall" 
                    style={{ 
                      color: ingredients.includes(item.name.toLowerCase()) 
                        ? colors.primary[700] 
                        : colors.text.primary,
                      textAlign: 'center'
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
      <View style={[styles.footer, { backgroundColor: colors.background.primary }]}>
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={ingredients.length === 0}
        >
          <LinearGradient
            colors={
              ingredients.length > 0 
                ? [colors.primary[500], colors.primary[600]]
                : [colors.neutral[300], colors.neutral[400]]
            }
            style={styles.submitGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons 
              name="sparkles" 
              size={20} 
              color="#fff" 
            />
            <Text variant="bodyLarge" weight="600" style={{ color: '#fff' }}>
              Tarif Bul ({ingredients.length})
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