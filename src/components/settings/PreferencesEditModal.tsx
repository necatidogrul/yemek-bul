import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Platform,
  Dimensions,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { UserPreferences } from '../../services/UserPreferencesService';
import {
  typography,
  spacing,
  borderRadius,
  shadows,
} from '../../theme/design-tokens';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface PreferencesEditModalProps {
  visible: boolean;
  onClose: () => void;
  preferences: UserPreferences;
  onSave: (prefs: Partial<UserPreferences>) => void;
}

const dietaryOptions = [
  { id: 'vegan', label: 'Vegan' },
  { id: 'vegetarian', label: 'Vejetaryen' },
  { id: 'gluten-free', label: 'Glutensiz' },
  { id: 'lactose-free', label: 'Laktozsuz' },
  { id: 'keto', label: 'Keto' },
  { id: 'paleo', label: 'Paleo' },
  { id: 'halal', label: 'Helal' },
  { id: 'kosher', label: 'Koşer' },
];

const allergyOptions = [
  { id: 'nuts', label: 'Fındık/Kuruyemiş' },
  { id: 'milk', label: 'Süt' },
  { id: 'eggs', label: 'Yumurta' },
  { id: 'wheat', label: 'Buğday' },
  { id: 'soy', label: 'Soya' },
  { id: 'fish', label: 'Balık' },
  { id: 'shellfish', label: 'Kabuklu Deniz Ürünleri' },
  { id: 'sesame', label: 'Susam' },
];

const cuisineOptions = [
  { id: 'turkish', label: 'Türk' },
  { id: 'italian', label: 'İtalyan' },
  { id: 'chinese', label: 'Çin' },
  { id: 'japanese', label: 'Japon' },
  { id: 'mexican', label: 'Meksika' },
  { id: 'indian', label: 'Hint' },
  { id: 'french', label: 'Fransız' },
  { id: 'mediterranean', label: 'Akdeniz' },
  { id: 'thai', label: 'Tayland' },
  { id: 'korean', label: 'Kore' },
];

const cookingLevelOptions = [
  { id: 'beginner', label: 'Başlangıç' },
  { id: 'intermediate', label: 'Orta' },
  { id: 'advanced', label: 'İleri' },
  { id: 'chef', label: 'Şef' },
];

export const PreferencesEditModal: React.FC<PreferencesEditModalProps> = ({
  visible,
  onClose,
  preferences,
  onSave,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { showSuccess } = useToast();

  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [cuisineTypes, setCuisineTypes] = useState<string[]>([]);
  const [cookingLevel, setCookingLevel] = useState<string>('');

  useEffect(() => {
    if (preferences) {
      setDietaryRestrictions(preferences.dietaryRestrictions || []);
      setAllergies(preferences.allergies || []);
      setCuisineTypes(preferences.cuisineTypes || []);
      setCookingLevel(preferences.cookingLevel || 'intermediate');
    }
  }, [preferences]);

  const toggleOption = (array: string[], setArray: Function, value: string) => {
    Haptics.selectionAsync();
    if (array.includes(value)) {
      setArray(array.filter(item => item !== value));
    } else {
      setArray([...array, value]);
    }
  };

  const handleSave = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave({
      dietaryRestrictions,
      allergies,
      cuisineTypes,
      cookingLevel,
    });
  };

  const OptionButton = ({
    option,
    selected,
    onPress,
  }: {
    option: { id: string; label: string };
    selected: boolean;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      style={[
        styles.optionButton,
        {
          backgroundColor: selected ? colors.primary[100] : colors.neutral[100],
          borderColor: selected ? colors.primary[500] : colors.border.light,
          borderWidth: selected ? 2 : 1,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.optionText,
          {
            color: selected ? colors.primary[700] : colors.text.primary,
            fontWeight: selected ? '600' : '400',
          },
        ]}
      >
        {option.label}
      </Text>
      {selected && (
        <Ionicons
          name='checkmark-circle'
          size={18}
          color={colors.primary[600]}
          style={styles.checkIcon}
        />
      )}
    </TouchableOpacity>
  );

  const SectionTitle = ({ title, icon }: { title: string; icon: string }) => (
    <View style={styles.sectionTitleContainer}>
      <Ionicons
        name={icon as any}
        size={20}
        color={colors.text.secondary}
        style={styles.sectionIcon}
      />
      <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
        {title}
      </Text>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType='slide'
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        {Platform.OS === 'ios' && (
          <BlurView intensity={80} style={StyleSheet.absoluteFillObject} />
        )}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: colors.current.surface,
              },
              shadows.xl,
            ]}
          >
            {/* Header */}
            <View
              style={[
                styles.header,
                { borderBottomColor: colors.border.light },
              ]}
            >
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name='close' size={24} color={colors.text.primary} />
              </TouchableOpacity>
              <Text
                style={[styles.headerTitle, { color: colors.text.primary }]}
              >
                Tercihlerimi Düzenle
              </Text>
              <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
                <Text
                  style={[
                    styles.saveButtonText,
                    { color: colors.primary[600] },
                  ]}
                >
                  Kaydet
                </Text>
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView
              style={styles.scrollView}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {/* Beslenme Tercihleri */}
              <View style={styles.section}>
                <SectionTitle
                  title='Beslenme Tercihleri'
                  icon='restaurant-outline'
                />
                <View style={styles.optionGrid}>
                  {dietaryOptions.map(option => (
                    <OptionButton
                      key={option.id}
                      option={option}
                      selected={dietaryRestrictions.includes(option.id)}
                      onPress={() =>
                        toggleOption(
                          dietaryRestrictions,
                          setDietaryRestrictions,
                          option.id
                        )
                      }
                    />
                  ))}
                </View>
              </View>

              {/* Alerjiler */}
              <View style={styles.section}>
                <SectionTitle title='Alerjiler' icon='warning-outline' />
                <View style={styles.optionGrid}>
                  {allergyOptions.map(option => (
                    <OptionButton
                      key={option.id}
                      option={option}
                      selected={allergies.includes(option.id)}
                      onPress={() =>
                        toggleOption(allergies, setAllergies, option.id)
                      }
                    />
                  ))}
                </View>
              </View>

              {/* Mutfak Tercihleri */}
              <View style={styles.section}>
                <SectionTitle title='Favori Mutfaklar' icon='earth-outline' />
                <View style={styles.optionGrid}>
                  {cuisineOptions.map(option => (
                    <OptionButton
                      key={option.id}
                      option={option}
                      selected={cuisineTypes.includes(option.id)}
                      onPress={() =>
                        toggleOption(cuisineTypes, setCuisineTypes, option.id)
                      }
                    />
                  ))}
                </View>
              </View>

              {/* Yemek Deneyimi */}
              <View style={styles.section}>
                <SectionTitle title='Yemek Deneyimi' icon='school-outline' />
                <View style={styles.levelContainer}>
                  {cookingLevelOptions.map(option => (
                    <TouchableOpacity
                      key={option.id}
                      style={[
                        styles.levelButton,
                        {
                          backgroundColor:
                            cookingLevel === option.id
                              ? colors.primary[500]
                              : colors.neutral[100],
                          borderColor:
                            cookingLevel === option.id
                              ? colors.primary[600]
                              : colors.border.light,
                        },
                      ]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setCookingLevel(option.id);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.levelText,
                          {
                            color:
                              cookingLevel === option.id
                                ? colors.neutral[0]
                                : colors.text.primary,
                            fontWeight:
                              cookingLevel === option.id ? '600' : '400',
                          },
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: screenHeight * 0.85,
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    paddingBottom: Platform.OS === 'ios' ? spacing[8] : spacing[4],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: spacing[2],
  },
  saveButton: {
    padding: spacing[2],
  },
  saveButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: spacing[4],
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: spacing[4],
  },
  section: {
    paddingHorizontal: spacing[4],
    marginBottom: spacing[6],
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  sectionIcon: {
    marginRight: spacing[2],
  },
  sectionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing[1],
  },
  optionButton: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
    margin: spacing[1],
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionText: {
    fontSize: typography.fontSize.sm,
  },
  checkIcon: {
    marginLeft: spacing[1],
  },
  levelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  levelButton: {
    flex: 1,
    paddingVertical: spacing[3],
    borderRadius: borderRadius.lg,
    marginHorizontal: spacing[1],
    alignItems: 'center',
    borderWidth: 2,
  },
  levelText: {
    fontSize: typography.fontSize.sm,
  },
});

export default PreferencesEditModal;
