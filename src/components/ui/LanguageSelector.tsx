import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTranslation } from '../../hooks/useTranslation';
import { useTheme } from '../../contexts/ThemeContext';
import Button from './Button';
import Card from './Card';
import Text from './Text';
import { borderRadius, spacing } from '../../theme/design-tokens';

interface LanguageSelectorProps {
  variant?: 'button' | 'card';
  showModal?: boolean;
  onModalToggle?: (show: boolean) => void;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  variant = 'button',
  showModal = false,
  onModalToggle,
}) => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { currentLanguage, changeLanguage, availableLanguages, isLoading } =
    useLanguage();
  const [modalVisible, setModalVisible] = useState(showModal);

  const currentLang = availableLanguages.find(
    lang => lang.code === currentLanguage
  );

  const handleModalToggle = (show: boolean) => {
    setModalVisible(show);
    onModalToggle?.(show);
  };

  const handleLanguageSelect = async (languageCode: string) => {
    if (languageCode !== currentLanguage) {
      await changeLanguage(languageCode);
    }
    handleModalToggle(false);
  };

  const renderLanguageItem = ({
    item,
  }: {
    item: (typeof availableLanguages)[0];
  }) => {
    const isSelected = item.code === currentLanguage;

    return (
      <TouchableOpacity
        style={[
          styles.languageItem,
          {
            backgroundColor: isSelected ? colors.primary[50] : colors.surface,
            borderColor: isSelected ? colors.primary[500] : colors.neutral[200],
          },
        ]}
        onPress={() => handleLanguageSelect(item.code)}
        disabled={isLoading}
      >
        <View style={styles.languageInfo}>
          <Text
            variant='labelLarge'
            weight='600'
            style={{
              color: isSelected ? colors.primary[700] : colors.text.primary,
            }}
          >
            {item.nativeName}
          </Text>
          <Text variant='labelSmall' color='secondary'>
            {item.name}
          </Text>
        </View>

        {isSelected && (
          <Ionicons
            name='checkmark-circle'
            size={24}
            color={colors.primary[500]}
          />
        )}
      </TouchableOpacity>
    );
  };

  if (variant === 'card') {
    return (
      <>
        <Card variant='outlined' style={styles.card}>
          <TouchableOpacity
            style={styles.cardContent}
            onPress={() => handleModalToggle(true)}
            disabled={isLoading}
          >
            <View style={styles.cardLeft}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: colors.primary[100] },
                ]}
              >
                <Ionicons
                  name='language'
                  size={20}
                  color={colors.primary[500]}
                />
              </View>
              <View>
                <Text variant='labelLarge' weight='600'>
                  Dil / Language
                </Text>
                <Text variant='labelSmall' color='secondary'>
                  {currentLang?.nativeName || 'Türkçe'}
                </Text>
              </View>
            </View>

            <Ionicons
              name='chevron-forward'
              size={20}
              color={colors.text.secondary}
            />
          </TouchableOpacity>
        </Card>

        <Modal
          visible={modalVisible}
          animationType='slide'
          presentationStyle='pageSheet'
          onRequestClose={() => handleModalToggle(false)}
        >
          <SafeAreaView
            style={[styles.modal, { backgroundColor: colors.background }]}
          >
            {/* Header */}
            <View
              style={[
                styles.modalHeader,
                { borderBottomColor: colors.neutral[200] },
              ]}
            >
              <Text variant='headlineSmall' weight='600'>
                Dil Seçimi / Language
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => handleModalToggle(false)}
              >
                <Ionicons
                  name='close'
                  size={24}
                  color={colors.text.secondary}
                />
              </TouchableOpacity>
            </View>

            {/* Language List */}
            <FlatList
              data={availableLanguages}
              renderItem={renderLanguageItem}
              keyExtractor={item => item.code}
              style={styles.languageList}
              contentContainerStyle={styles.languageListContent}
              showsVerticalScrollIndicator={false}
            />
          </SafeAreaView>
        </Modal>
      </>
    );
  }

  // Button variant
  return (
    <>
      <Button
        variant='ghost'
        size='sm'
        onPress={() => handleModalToggle(true)}
        disabled={isLoading}
        leftIcon={
          <Ionicons name='language' size={16} color={colors.primary[500]} />
        }
      >
        {currentLang?.code.toUpperCase() || 'TR'}
      </Button>

      <Modal
        visible={modalVisible}
        animationType='slide'
        presentationStyle='pageSheet'
        onRequestClose={() => handleModalToggle(false)}
      >
        <SafeAreaView
          style={[styles.modal, { backgroundColor: colors.background }]}
        >
          {/* Header */}
          <View
            style={[
              styles.modalHeader,
              { borderBottomColor: colors.neutral[200] },
            ]}
          >
            <Text variant='headlineSmall' weight='600'>
              {t('app.name')} - Language
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => handleModalToggle(false)}
            >
              <Ionicons name='close' size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          {/* Language List */}
          <FlatList
            data={availableLanguages}
            renderItem={renderLanguageItem}
            keyExtractor={item => item.code}
            style={styles.languageList}
            contentContainerStyle={styles.languageListContent}
            showsVerticalScrollIndicator={false}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  // Card variant
  card: {
    marginBottom: spacing[4],
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Modal
  modal: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: spacing[2],
  },

  // Language list
  languageList: {
    flex: 1,
  },
  languageListContent: {
    padding: spacing[4],
    gap: spacing[2],
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
  },
  languageInfo: {
    flex: 1,
  },
});

export default LanguageSelector;
