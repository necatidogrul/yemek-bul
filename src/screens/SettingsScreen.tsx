import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Linking,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';

import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../contexts/LanguageContext';
import { usePremium } from '../contexts/PremiumContext';
import { RevenueCatService } from '../services/RevenueCatService';
import { UserPreferencesService, UserPreferences } from '../services/UserPreferencesService';
import PreferencesEditModal from '../components/settings/PreferencesEditModal';
import {
  typography,
  spacing,
  borderRadius,
  shadows,
} from '../theme/design-tokens';

const { width: screenWidth } = Dimensions.get('window');

export const SettingsScreen: React.FC = () => {
  const { colors, isDark, setThemeMode, actualTheme } = useTheme();
  const navigation = useNavigation();
  const { showSuccess, showError } = useToast();
  const { t } = useTranslation();
  const { changeLanguage, currentLanguage } = useLanguage();
  const { showPaywall } = usePremium();

  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];

  // Developer options state
  const [versionTapCount, setVersionTapCount] = useState(0);
  const [showDeveloperOptions, setShowDeveloperOptions] = useState(false);

  // Settings state
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [hapticFeedback, setHapticFeedback] = useState(true);
  const [isPremiumUser, setIsPremiumUser] = useState(false);
  const [premiumStatus, setPremiumStatus] = useState<any>(null);
  const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null);
  const [isEditingPreferences, setIsEditingPreferences] = useState(false);

  useEffect(() => {
    checkDeveloperMode();
    checkPremiumStatus();
    loadUserPreferences();
    startEntranceAnimation();
  }, []);

  const startEntranceAnimation = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const checkPremiumStatus = async () => {
    try {
      const status = await RevenueCatService.getPremiumStatus();
      setIsPremiumUser(status.isPremium && status.isActive);
      setPremiumStatus(status);
    } catch (error) {
      console.error('Premium status check failed:', error);
    }
  };

  const loadUserPreferences = async () => {
    try {
      const prefs = await UserPreferencesService.getUserPreferences();
      setUserPreferences(prefs);
      setNotificationsEnabled(prefs.notificationsEnabled);
    } catch (error) {
      console.error('Error loading user preferences:', error);
    }
  };

  const handleEditPreferences = () => {
    setIsEditingPreferences(true);
  };

  const savePreferences = async (prefs: Partial<UserPreferences>) => {
    try {
      await UserPreferencesService.saveUserPreferences(prefs);
      const updated = await UserPreferencesService.getUserPreferences();
      setUserPreferences(updated);
      showSuccess(t('success.preferencesUpdated'));
      setIsEditingPreferences(false);
    } catch (error) {
      console.error('Error saving preferences:', error);
      showError(t('error.failedToSavePreferences'));
    }
  };

  const checkDeveloperMode = () => {
    if (__DEV__) {
      setShowDeveloperOptions(true);
    }
  };

  // Professional version tap pattern
  const handleVersionTap = async () => {
    const newCount = versionTapCount + 1;
    setVersionTapCount(newCount);

    // Haptic feedback for each tap
    if (hapticFeedback) {
      await Haptics.selectionAsync();
    }

    // Reset counter after 3 seconds
    setTimeout(() => setVersionTapCount(0), 3000);

    // 10 taps = Show developer options
    if (newCount === 10) {
      if (hapticFeedback) {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );
      }

      setShowDeveloperOptions(true);
      showSuccess(t('success.developerOptionsEnabled'));
    }

    // 15 taps = Show debug information (development only)
    if (newCount === 15 && __DEV__) {
      if (hapticFeedback) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }

      Alert.alert(
        t('settings.debugInfo'),
        `${t('settings.environment')}: ${process.env.EXPO_PUBLIC_ENVIRONMENT || 'development'}
${t('settings.version')}: ${Constants.expoConfig?.version || 'unknown'}
Build: ${
          Constants.expoConfig?.ios?.buildNumber ||
          Constants.expoConfig?.android?.versionCode ||
          'unknown'
        }`,
        [{ text: 'OK' }]
      );
    }
  };

  const openPrivacyPolicy = () => {
    Linking.openURL('https://www.necatidogrul.dev/tr/cook-ai');
  };

  const openTermsOfService = () => {
    Linking.openURL('https://www.necatidogrul.dev/tr/cook-ai');
  };

  const handleContactSupport = () => {
    Linking.openURL(
      'mailto:necatidogrul7@gmail.com?subject=YemekbulAI - Destek Talebi&body=Merhaba,%0A%0ALütfen sorunuzu detaylıca açıklayınız:%0A%0A'
    );
  };

  const handleRateApp = () => {
    // iOS App Store rating
    const appStoreUrl =
      'https://apps.apple.com/app/idYOUR_APP_ID?action=write-review';
    Linking.openURL(appStoreUrl).catch(() => {
      showError(t('settings.appStoreFailed'));
    });
  };

  const handleShareApp = () => {
    const shareUrl = 'https://apps.apple.com/app/idYOUR_APP_ID';
    const message = `AI destekli tarif keşfi için YemekbulAI uygulamasını deneyin! ${shareUrl}`;

    // Web paylaşımı - gerçek uygulamada Share API kullanılabilir
    Linking.openURL(
      `mailto:?subject=YemekbulAI Tavsiyesi&body=${encodeURIComponent(message)}`
    );
  };

  const openAppStore = () => {
    const appStoreUrl = 'https://apps.apple.com/app/idYOUR_APP_ID';
    Linking.openURL(appStoreUrl);
  };

  const SettingItem = ({
    icon,
    title,
    subtitle,
    onPress,
    rightElement,
    showChevron = true,
    isDanger = false,
    isPremiumFeature = false,
    iconColor,
    iconBackground,
  }: {
    icon: string;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
    showChevron?: boolean;
    isDanger?: boolean;
    isPremiumFeature?: boolean;
    iconColor?: string;
    iconBackground?: string;
  }) => {
    const [pressAnim] = useState(new Animated.Value(1));

    const handlePressIn = () => {
      Animated.spring(pressAnim, {
        toValue: 0.95,
        useNativeDriver: true,
      }).start();
    };

    const handlePressOut = () => {
      Animated.spring(pressAnim, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    };

    const handlePress = async () => {
      if (hapticFeedback) {
        await Haptics.selectionAsync();
      }
      if (onPress) onPress();
    };

    return (
      <Animated.View style={{ transform: [{ scale: pressAnim }] }}>
        <TouchableOpacity
          style={[
            styles.settingItem,
            {
              backgroundColor: colors.current.surface,
              borderBottomColor: colors.border.light,
            },
            shadows.xs,
          ]}
          onPress={handlePress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={!onPress}
          activeOpacity={0.7}
        >
          <View style={styles.settingLeft}>
            <View
              style={[
                styles.iconContainer,
                {
                  backgroundColor:
                    iconBackground ||
                    (isDanger
                      ? colors.neutral[200]
                      : isPremiumFeature
                        ? colors.primary[100]
                        : colors.neutral[100]),
                },
              ]}
            >
              <Ionicons
                name={icon as any}
                size={22}
                color={
                  iconColor ||
                  (isDanger
                    ? colors.primary[700]
                    : isPremiumFeature
                      ? colors.primary[600]
                      : colors.text.secondary)
                }
              />
            </View>
            <View style={styles.textContainer}>
              <View style={styles.titleRow}>
                <Text
                  style={[
                    styles.settingTitle,
                    {
                      color: isDanger
                        ? colors.primary[700]
                        : colors.text.primary,
                    },
                  ]}
                >
                  {title}
                </Text>
                {isPremiumFeature && !isPremiumUser && (
                  <View style={styles.premiumBadge}>
                    <Text style={styles.premiumBadgeText}>PRO</Text>
                  </View>
                )}
              </View>
              {subtitle && (
                <Text
                  style={[
                    styles.settingSubtitle,
                    { color: colors.text.secondary },
                  ]}
                >
                  {subtitle}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.settingRight}>
            {rightElement}
            {showChevron && !rightElement && (
              <Ionicons
                name='chevron-forward'
                size={18}
                color={colors.text.secondary}
              />
            )}
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const SectionHeader = ({ title }: { title: string }) => (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>
        {title}
      </Text>
    </View>
  );

  const UserProfileHeader = () => (
    <View
      style={[
        styles.profileHeader,
        { backgroundColor: colors.current.surface },
      ]}
    >
      <LinearGradient
        colors={[colors.primary[500], colors.primary[600], colors.primary[700]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.profileGradient}
      >
        <View style={styles.avatarContainer}>
          <View
            style={[styles.avatar, { backgroundColor: colors.current.surface }]}
          >
            <Ionicons name='person' size={32} color={colors.primary[600]} />
          </View>
        </View>
        <View style={styles.profileInfo}>
          <Text style={[styles.profileName, { color: colors.neutral[0] }]}>
            {t('settings.profile.welcome')}
          </Text>
          <View style={styles.profileStatus}>
            {isPremiumUser ? (
              <View style={styles.premiumStatus}>
                <Ionicons name='star' size={16} color={colors.accent.gold} />
                <Text style={[styles.statusText, { color: colors.neutral[0] }]}>
                  {t('settings.profile.premiumMember')}
                </Text>
              </View>
            ) : (
              <Text
                style={[
                  styles.statusText,
                  { color: colors.neutral[0], opacity: 0.8 },
                ]}
              >
                {t('settings.profile.freeMember')}
              </Text>
            )}
          </View>
        </View>
      </LinearGradient>
    </View>
  );

  const PremiumCard = () => {
    if (isPremiumUser) {
      return (
        <View style={styles.premiumCardContainer}>
          <LinearGradient
            colors={[colors.success[400], colors.success[500]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.premiumCard}
          >
            <View style={styles.premiumCardContent}>
              <View style={styles.premiumCardIcon}>
                <Ionicons
                  name='checkmark-circle'
                  size={24}
                  color={colors.neutral[0]}
                />
              </View>
              <View style={styles.premiumCardText}>
                <Text
                  style={[
                    styles.premiumCardTitle,
                    { color: colors.neutral[0] },
                  ]}
                >
                  {t('settings.premium.active')}
                </Text>
                <Text
                  style={[
                    styles.premiumCardSubtitle,
                    { color: colors.neutral[0] },
                  ]}
                >
                  {t('settings.premium.allFeatures')}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>
      );
    }

    return (
      <TouchableOpacity
        style={styles.premiumCardContainer}
        activeOpacity={0.8}
        onPress={() => showPaywall()}
      >
        <LinearGradient
          colors={[
            colors.primary[400],
            colors.primary[500],
            colors.secondary[500],
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.premiumCard}
        >
          <View style={styles.premiumCardContent}>
            <View style={styles.premiumCardIcon}>
              <Ionicons name='diamond' size={24} color={colors.neutral[0]} />
            </View>
            <View style={styles.premiumCardText}>
              <Text
                style={[styles.premiumCardTitle, { color: colors.neutral[0] }]}
              >
                {t('settings.premium.upgrade')}
              </Text>
              <Text
                style={[
                  styles.premiumCardSubtitle,
                  { color: colors.neutral[0] },
                ]}
              >
                {t('settings.premium.description')}
              </Text>
            </View>
            <Ionicons
              name='arrow-forward'
              size={20}
              color={colors.neutral[0]}
            />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.current.background }]}
    >
      {/* Preferences Edit Modal */}
      {userPreferences && (
        <PreferencesEditModal
          visible={isEditingPreferences}
          onClose={() => setIsEditingPreferences(false)}
          preferences={userPreferences}
          onSave={savePreferences}
        />
      )}
      {/* Modern Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.current.surface,
            borderBottomColor: colors.border.light,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.backButtonContainer,
              { backgroundColor: colors.neutral[100] },
            ]}
          >
            <Ionicons name='arrow-back' size={22} color={colors.text.primary} />
          </View>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
          {t('settings.title')}
        </Text>
        <View style={styles.headerRight} />
      </View>

      <Animated.ScrollView
        style={[
          styles.content,
          {
            backgroundColor: colors.current.background,
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* User Profile Header */}
        <UserProfileHeader />

        {/* Premium Upgrade Card */}
        <PremiumCard />
        {/* Kişisel Tercihler */}
        <SectionHeader title={t('settings.preferences.title')} />
        <View style={styles.section}>
          {userPreferences && (
            <>
              <SettingItem
                icon='restaurant-outline'
                title={t('settings.preferences.dietary.title')}
                subtitle={userPreferences.dietaryRestrictions?.length > 0 
                  ? userPreferences.dietaryRestrictions.map(d => {
                      const dietaryKey = d.replace(/-/g, ''); // replace all hyphens
                      return t(`settings.preferences.dietary.${dietaryKey}` as any) || d;
                    }).join(', ') 
                  : t('settings.preferences.dietary.none')}
                iconColor={colors.success[600]}
                iconBackground={colors.success[100]}
                onPress={handleEditPreferences}
              />
              <SettingItem
                icon='warning-outline'
                title={t('settings.preferences.allergies.title')}
                subtitle={userPreferences.allergies?.length > 0 
                  ? userPreferences.allergies.map(a => {
                      return t(`settings.preferences.allergies.${a}` as any) || a;
                    }).join(', ') 
                  : t('settings.preferences.allergies.none')}
                iconColor={colors.error[600]}
                iconBackground={colors.error[100]}
                onPress={handleEditPreferences}
              />
              <SettingItem
                icon='earth-outline'
                title={t('settings.preferences.cuisine.title')}
                subtitle={userPreferences.cuisineTypes?.length > 0 
                  ? userPreferences.cuisineTypes.map(c => {
                      return t(`settings.preferences.cuisine.${c}` as any) || c;
                    }).join(', ') 
                  : t('settings.preferences.cuisine.none')}
                iconColor={colors.info[600]}
                iconBackground={colors.info[100]}
                onPress={handleEditPreferences}
              />
              <SettingItem
                icon='school-outline'
                title={t('settings.preferences.cookingLevel.title')}
                subtitle={t(`settings.preferences.cookingLevel.${userPreferences.cookingLevel || 'intermediate'}` as any)}
                iconColor={colors.warning[600]}
                iconBackground={colors.warning[100]}
                onPress={handleEditPreferences}
              />
            </>
          )}
        </View>

        {/* Uygulama Ayarları */}
        <SectionHeader title={t('settings.appSettings')} />
        <View style={styles.section}>
          <SettingItem
            icon='notifications-outline'
            title={t('settings.notifications.title')}
            subtitle={t('settings.notifications.subtitle')}
            iconColor={colors.info[600]}
            iconBackground={colors.info[100]}
            rightElement={
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{
                  false: colors.neutral[300],
                  true: colors.primary[300],
                }}
                thumbColor={
                  notificationsEnabled
                    ? colors.primary[600]
                    : colors.neutral[400]
                }
                ios_backgroundColor={colors.neutral[300]}
              />
            }
            showChevron={false}
          />
          <SettingItem
            icon='globe-outline'
            title={t('settings.language.title')}
            subtitle={currentLanguage === 'tr' ? t('settings.language.turkish') : t('settings.language.english')}
            iconColor={colors.secondary[600]}
            iconBackground={colors.secondary[100]}
            onPress={() => {
              const newLang = currentLanguage === 'tr' ? 'en' : 'tr';
              changeLanguage(newLang);
              showSuccess(t('settings.languageChanged'));
            }}
          />
        </View>

        {/* Görünüm Ayarları */}
        <SectionHeader title={t('settings.appearance')} />
        <View style={styles.section}>
          <SettingItem
            icon={isDark ? 'moon' : 'sunny'}
            title={t('settings.theme.title')}
            subtitle={isDark ? t('settings.theme.dark') : t('settings.theme.light')}
            iconColor={isDark ? colors.info[600] : colors.warning[600]}
            iconBackground={isDark ? colors.info[100] : colors.warning[100]}
            rightElement={
              <Switch
                value={isDark}
                onValueChange={value => {
                  setThemeMode(value ? 'dark' : 'light');
                }}
                trackColor={{
                  false: colors.neutral[300],
                  true: colors.primary[300],
                }}
                thumbColor={isDark ? colors.primary[600] : colors.neutral[400]}
                ios_backgroundColor={colors.neutral[300]}
              />
            }
            showChevron={false}
          />
          <SettingItem
            icon='phone-portrait-outline'
            title={t('settings.hapticFeedback.title')}
            subtitle={t('settings.hapticFeedback.subtitle')}
            iconColor={colors.primary[500]}
            iconBackground={colors.primary[100]}
            rightElement={
              <Switch
                value={hapticFeedback}
                onValueChange={setHapticFeedback}
                trackColor={{
                  false: colors.neutral[300],
                  true: colors.primary[300],
                }}
                thumbColor={
                  hapticFeedback ? colors.primary[600] : colors.neutral[400]
                }
                ios_backgroundColor={colors.neutral[300]}
              />
            }
            showChevron={false}
          />
        </View>

        {/* Destek ve Yardım */}
        <SectionHeader title={t('settings.support')} />
        <View style={styles.section}>
          <SettingItem
            icon='mail-outline'
            title={t('settings.contactUs.title')}
            subtitle={t('settings.contactUs.subtitle')}
            iconColor={colors.primary[600]}
            iconBackground={colors.primary[100]}
            onPress={handleContactSupport}
          />
          <SettingItem
            icon='star-outline'
            title={t('settings.rateApp.title')}
            subtitle={t('settings.rateApp.subtitle')}
            iconColor={colors.warning[600]}
            iconBackground={colors.warning[100]}
            onPress={handleRateApp}
          />
          <SettingItem
            icon='share-outline'
            title={t('settings.shareApp.title')}
            subtitle={t('settings.shareApp.subtitle')}
            iconColor={colors.secondary[600]}
            iconBackground={colors.secondary[100]}
            onPress={handleShareApp}
          />
        </View>

        {/* Yasal Bilgiler */}
        <SectionHeader title={t('settings.legal')} />
        <View style={styles.section}>
          <SettingItem
            icon='shield-checkmark-outline'
            title={t('settings.privacyPolicy.title')}
            subtitle={t('settings.privacyPolicy.subtitle')}
            iconColor={colors.info[600]}
            iconBackground={colors.info[100]}
            onPress={openPrivacyPolicy}
          />
          <SettingItem
            icon='document-text-outline'
            title={t('settings.termsOfService.title')}
            subtitle={t('settings.termsOfService.subtitle')}
            iconColor={colors.primary[600]}
            iconBackground={colors.primary[100]}
            onPress={openTermsOfService}
          />
          <SettingItem
            icon='storefront-outline'
            title={t('settings.appStore.title')}
            subtitle={t('settings.appStore.subtitle')}
            iconColor={colors.secondary[600]}
            iconBackground={colors.secondary[100]}
            onPress={openAppStore}
          />
        </View>

        {/* Uygulama Bilgileri */}
        <SectionHeader title={t('settings.app')} />
        <View style={[styles.section, styles.lastSection]}>
          <SettingItem
            icon='information-circle-outline'
            title='YemekbulAI'
            subtitle={`${t('settings.version')} ${Constants.expoConfig?.version || '1.0.0'} ${versionTapCount > 0 ? `(${versionTapCount}/10)` : ''}`}
            iconColor={colors.primary[600]}
            iconBackground={colors.primary[100]}
            onPress={handleVersionTap}
            showChevron={false}
          />
          <SettingItem
            icon='code-outline'
            title={t('settings.developer.title')}
            subtitle={t('settings.developer.name')}
            iconColor={colors.secondary[600]}
            iconBackground={colors.secondary[100]}
            onPress={() => Linking.openURL('https://necatidogrul.dev')}
            showChevron={false}
          />
        </View>

        {/* Bottom spacing */}
        <View style={{ height: spacing[16] }} />
      </Animated.ScrollView>
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
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    ...shadows.xs,
  },
  backButton: {
    padding: spacing[2],
  },
  backButtonContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: spacing[4],
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing[8],
  },
  profileHeader: {
    marginHorizontal: spacing[4],
    marginTop: spacing[4],
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    ...shadows.md,
  },
  profileGradient: {
    padding: spacing[6],
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    marginRight: spacing[4],
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: typography.fontSize.xl,
    fontWeight: '700',
    marginBottom: spacing[1],
  },
  profileStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  premiumStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: typography.fontSize.sm,
    marginLeft: spacing[1],
  },
  premiumCardContainer: {
    marginHorizontal: spacing[4],
    marginTop: spacing[4],
  },
  premiumCard: {
    borderRadius: borderRadius.xl,
    padding: spacing[5],
    ...shadows.md,
  },
  premiumCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  premiumCardIcon: {
    marginRight: spacing[4],
  },
  premiumCardText: {
    flex: 1,
  },
  premiumCardTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    marginBottom: spacing[0.5],
  },
  premiumCardSubtitle: {
    fontSize: typography.fontSize.sm,
    opacity: 0.9,
  },
  sectionHeader: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[8],
    paddingBottom: spacing[2],
  },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    letterSpacing: typography.letterSpacing.wide,
  },
  section: {
    marginHorizontal: spacing[4],
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    marginBottom: spacing[2],
  },
  lastSection: {
    marginBottom: 0,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 64,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  textContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[0.5],
  },
  settingTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: '500',
    lineHeight: typography.lineHeight.snug * typography.fontSize.base,
  },
  premiumBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[0.5],
    borderRadius: borderRadius.base,
    marginLeft: spacing[2],
  },
  premiumBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '700',
    color: '#000',
  },
  settingSubtitle: {
    fontSize: typography.fontSize.sm,
    lineHeight: typography.lineHeight.normal * typography.fontSize.sm,
    marginTop: spacing[0.5],
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing[3],
  },
});

export default SettingsScreen;
