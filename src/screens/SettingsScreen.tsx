import React, { useState, useEffect } from "react";
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import Constants from "expo-constants";
import * as Haptics from "expo-haptics";

import { useTheme } from "../contexts/ThemeContext";
import { useToast } from "../contexts/ToastContext";
import { useTranslation } from "../hooks/useTranslation";

export const SettingsScreen: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { showSuccess, showError } = useToast();
  const { t, changeLanguage, currentLanguage } = useTranslation();

  // Developer options state
  const [versionTapCount, setVersionTapCount] = useState(0);
  const [showDeveloperOptions, setShowDeveloperOptions] = useState(false);

  // Settings state
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hapticFeedback, setHapticFeedback] = useState(true);

  useEffect(() => {
    checkDeveloperMode();
  }, []);

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
      showSuccess("Developer options enabled");
    }

    // 15 taps = Show debug information (development only)
    if (newCount === 15 && __DEV__) {
      if (hapticFeedback) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }

      Alert.alert(
        "Debug Information",
        `Environment: ${process.env.EXPO_PUBLIC_ENVIRONMENT || "development"}
Version: ${Constants.expoConfig?.version || "unknown"}
Build: ${
          Constants.expoConfig?.ios?.buildNumber ||
          Constants.expoConfig?.android?.versionCode ||
          "unknown"
        }`,
        [{ text: "OK" }]
      );
    }
  };

  const openPrivacyPolicy = () => {
    Linking.openURL("https://your-domain.com/privacy-policy");
  };

  const openTermsOfService = () => {
    Linking.openURL("https://your-domain.com/terms-of-service");
  };

  const handleContactSupport = () => {
    Linking.openURL("mailto:support@yemekbulucu.com?subject=Support Request");
  };

  const SettingItem = ({
    icon,
    title,
    subtitle,
    onPress,
    rightElement,
    showChevron = true,
    isDanger = false,
  }: {
    icon: string;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    rightElement?: React.ReactNode;
    showChevron?: boolean;
    isDanger?: boolean;
  }) => (
    <TouchableOpacity
      style={[
        styles.settingItem,
        {
          backgroundColor: colors.neutral[50],
          borderBottomColor: colors.neutral[200],
        },
      ]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.settingLeft}>
        <View
          style={[
            styles.iconContainer,
            {
              backgroundColor: isDanger
                ? colors.semantic.error + "30"
                : colors.primary[200],
            },
          ]}
        >
          <Ionicons
            name={icon as any}
            size={20}
            color={isDanger ? colors.semantic.error : colors.primary[600]}
          />
        </View>
        <View style={styles.textContainer}>
          <Text
            style={[
              styles.settingTitle,
              { color: isDanger ? colors.semantic.error : colors.text.primary },
            ]}
          >
            {title}
          </Text>
          {subtitle && (
            <Text
              style={[styles.settingSubtitle, { color: colors.text.secondary }]}
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
            name="chevron-forward"
            size={20}
            color={colors.text.secondary}
          />
        )}
      </View>
    </TouchableOpacity>
  );

  const SectionHeader = ({ title }: { title: string }) => (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: colors.text.secondary }]}>
        {title.toUpperCase()}
      </Text>
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.neutral[200] }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary }]}>
          Settings
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Account Settings */}
        <SectionHeader title="Account" />
        <View style={styles.section}>
          <SettingItem
            icon="person-outline"
            title="Profile"
            subtitle="Manage your profile information"
            onPress={() => {
              /* Navigate to profile */
            }}
          />
          <SettingItem
            icon="notifications-outline"
            title="Notifications"
            subtitle="Push notifications and alerts"
            rightElement={
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{
                  false: colors.neutral[300],
                  true: colors.primary[200],
                }}
                thumbColor={
                  notificationsEnabled
                    ? colors.primary[600]
                    : colors.neutral[400]
                }
              />
            }
            showChevron={false}
          />
          <SettingItem
            icon="language-outline"
            title="Language"
            subtitle={currentLanguage === "tr" ? "Türkçe" : "English"}
            onPress={() => {
              const newLang = currentLanguage === "tr" ? "en" : "tr";
              changeLanguage(newLang);
              showSuccess(
                `Language changed to ${newLang === "tr" ? "Türkçe" : "English"}`
              );
            }}
          />
        </View>

        {/* App Settings */}
        <SectionHeader title="App Settings" />
        <View style={styles.section}>
          <SettingItem
            icon="volume-high-outline"
            title="Sound Effects"
            subtitle="App sounds and feedback"
            rightElement={
              <Switch
                value={soundEnabled}
                onValueChange={setSoundEnabled}
                trackColor={{
                  false: colors.neutral[300],
                  true: colors.primary[200],
                }}
                thumbColor={
                  soundEnabled ? colors.primary[600] : colors.neutral[400]
                }
              />
            }
            showChevron={false}
          />
          <SettingItem
            icon="phone-portrait-outline"
            title="Haptic Feedback"
            subtitle="Vibration feedback"
            rightElement={
              <Switch
                value={hapticFeedback}
                onValueChange={setHapticFeedback}
                trackColor={{
                  false: colors.neutral[300],
                  true: colors.primary[200],
                }}
                thumbColor={
                  hapticFeedback ? colors.primary[600] : colors.neutral[400]
                }
              />
            }
            showChevron={false}
          />
        </View>

        {/* Developer Options (Hidden - Only shown after version taps) */}
        {showDeveloperOptions && __DEV__ && (
          <>
            <SectionHeader title="Developer Tools" />
            <View style={styles.section}>
              <SettingItem
                icon="code-outline"
                title="Development Mode"
                subtitle={`Environment: ${
                  process.env.EXPO_PUBLIC_ENVIRONMENT || "development"
                }`}
                onPress={() => showSuccess("Debug tools activated")}
              />
              <SettingItem
                icon="bug-outline"
                title="Debug Logs"
                subtitle="View application debug information"
                onPress={() =>
                  Alert.alert(
                    "Debug Info",
                    `Environment: ${process.env.EXPO_PUBLIC_ENVIRONMENT}\nVersion: ${Constants.expoConfig?.version}`
                  )
                }
              />
            </View>
          </>
        )}

        {/* Support */}
        <SectionHeader title="Support" />
        <View style={styles.section}>
          <SettingItem
            icon="help-circle-outline"
            title="Help Center"
            subtitle="FAQs and guides"
            onPress={() => {
              /* Navigate to help */
            }}
          />
          <SettingItem
            icon="mail-outline"
            title="Contact Support"
            subtitle="Get help from our team"
            onPress={handleContactSupport}
          />
          <SettingItem
            icon="star-outline"
            title="Rate App"
            subtitle="Leave a review"
            onPress={() => {
              /* Open app store */
            }}
          />
        </View>

        {/* Legal */}
        <SectionHeader title="Legal" />
        <View style={styles.section}>
          <SettingItem
            icon="document-text-outline"
            title="Privacy Policy"
            onPress={openPrivacyPolicy}
          />
          <SettingItem
            icon="document-outline"
            title="Terms of Service"
            onPress={openTermsOfService}
          />
        </View>

        {/* About */}
        <SectionHeader title="About" />
        <View style={[styles.section, styles.lastSection]}>
          <TouchableOpacity
            style={[
              styles.settingItem,
              { backgroundColor: colors.neutral[50], borderBottomWidth: 0 },
            ]}
            onPress={handleVersionTap}
          >
            <View style={styles.settingLeft}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: colors.neutral[200] },
                ]}
              >
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color={colors.text.secondary}
                />
              </View>
              <View style={styles.textContainer}>
                <Text
                  style={[styles.settingTitle, { color: colors.text.primary }]}
                >
                  Version
                </Text>
                <Text
                  style={[
                    styles.settingSubtitle,
                    { color: colors.text.secondary },
                  ]}
                >
                  {Constants.expoConfig?.version || "1.0.0"}
                  {versionTapCount > 0 && ` (${versionTapCount}/10)`}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Bottom spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 12,
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 32,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  section: {
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: "hidden",
  },
  lastSection: {
    marginBottom: 0,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "500",
  },
  settingSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  settingRight: {
    flexDirection: "row",
    alignItems: "center",
  },
});

export default SettingsScreen;
