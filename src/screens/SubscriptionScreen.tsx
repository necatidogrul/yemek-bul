import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  Linking,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";

import { Button, Card, Text } from "../components/ui";
import { colors, spacing, borderRadius } from "../theme/design-tokens";
import { usePremium } from "../contexts/PremiumContext";

interface SubscriptionScreenProps {
  navigation: StackNavigationProp<any>;
}

const SubscriptionScreen: React.FC<SubscriptionScreenProps> = ({
  navigation,
}) => {
  const {
    isPremium,
    isLoading,
    subscriptionInfo,
    availableOfferings,
    restorePurchases,
    refreshStatus,
    isInFreeTrial,
    getSubscriptionManagementURL,
  } = usePremium();

  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    navigation.setOptions({
      title: "👑 Premium Yönetimi",
    });
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshStatus();
    } catch (error) {
      Alert.alert("Hata", "Durum güncellenirken bir hata oluştu.");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRestorePurchases = async () => {
    try {
      const success = await restorePurchases();
      if (success) {
        Alert.alert(
          "✅ Başarılı",
          "Satın alımlarınız başarıyla geri yüklendi!",
          [{ text: "Tamam" }]
        );
      } else {
        Alert.alert(
          "ℹ️ Bilgi",
          "Bu hesapta aktif premium abonelik bulunamadı.",
          [{ text: "Tamam" }]
        );
      }
    } catch (error) {
      Alert.alert("Hata", "Satın alımlar geri yüklenirken bir hata oluştu.");
    }
  };

  const handleManageSubscription = async () => {
    try {
      const url = getSubscriptionManagementURL();
      const supported = await Linking.canOpenURL(url);

      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          "Bilgi",
          "Abonelik yönetimi için App Store uygulamasını açın.",
          [{ text: "Tamam" }]
        );
      }
    } catch (error) {
      Alert.alert("Hata", "Abonelik yönetimi açılırken bir hata oluştu.");
    }
  };

  const renderSubscriptionStatus = () => {
    if (!isPremium) {
      return (
        <Card variant="filled" size="lg" style={styles.statusCard}>
          <View style={styles.statusContent}>
            <View style={styles.statusIcon}>
              <Ionicons
                name="diamond-outline"
                size={32}
                color={colors.neutral[500]}
              />
            </View>
            <Text
              variant="headlineMedium"
              weight="bold"
              align="center"
              color="primary"
            >
              Premium Değilsiniz
            </Text>
            <Text
              variant="bodyMedium"
              align="center"
              color="secondary"
              style={styles.statusDescription}
            >
              Premium özeliklerden yararlanmak için abonelik satın alın.
            </Text>
          </View>
        </Card>
      );
    }

    return (
      <Card
        variant="elevated"
        size="lg"
        style={StyleSheet.flatten([styles.statusCard, styles.premiumCard])}
      >
        <View style={styles.statusContent}>
          <View style={[styles.statusIcon, styles.premiumIcon]}>
            <Ionicons name="diamond" size={32} color={colors.primary[500]} />
          </View>

          {isInFreeTrial ? (
            <>
              <Text
                variant="headlineMedium"
                weight="bold"
                align="center"
                color="primary"
              >
                🎁 Ücretsiz Deneme
              </Text>
              <Text
                variant="bodyMedium"
                align="center"
                color="secondary"
                style={styles.statusDescription}
              >
                Premium özelliklerini ücretsiz deniyorsunuz!
              </Text>
            </>
          ) : (
            <>
              <Text
                variant="headlineMedium"
                weight="bold"
                align="center"
                color="primary"
              >
                👑 Premium Aktif
              </Text>
              <Text
                variant="bodyMedium"
                align="center"
                color="secondary"
                style={styles.statusDescription}
              >
                Tüm premium özelliklerden yararlanabilirsiniz.
              </Text>
            </>
          )}

          {subscriptionInfo?.expirationDate && (
            <View style={styles.expirationInfo}>
              <Ionicons name="calendar" size={16} color={colors.neutral[600]} />
              <Text variant="labelSmall" color="secondary">
                {subscriptionInfo.willRenew ? "Yenilenir: " : "Bitiş: "}
                {subscriptionInfo.expirationDate
                  ? subscriptionInfo.expirationDate.toLocaleDateString("tr-TR")
                  : "Belirtilmemiş"}
              </Text>
            </View>
          )}
        </View>
      </Card>
    );
  };

  const renderSubscriptionDetails = () => {
    if (!subscriptionInfo || !isPremium) return null;

    return (
      <Card variant="default" size="lg" style={styles.detailsCard}>
        <Text
          variant="headlineSmall"
          weight="semibold"
          style={styles.sectionTitle}
        >
          📋 Abonelik Detayları
        </Text>

        <View style={styles.detailsList}>
          <View style={styles.detailItem}>
            <Text variant="bodyMedium" color="secondary">
              Durum:
            </Text>
            <Text variant="bodyMedium" weight="semibold" color="primary">
              {isInFreeTrial ? "Ücretsiz Deneme" : "Aktif"}
            </Text>
          </View>

          {subscriptionInfo.productIdentifier && (
            <View style={styles.detailItem}>
              <Text variant="bodyMedium" color="secondary">
                Plan:
              </Text>
              <Text variant="bodyMedium" weight="semibold" color="primary">
                {subscriptionInfo.productIdentifier.includes("monthly")
                  ? "Aylık"
                  : "Yıllık"}
              </Text>
            </View>
          )}

          <View style={styles.detailItem}>
            <Text variant="bodyMedium" color="secondary">
              Otomatik Yenileme:
            </Text>
            <Text
              variant="bodyMedium"
              weight="semibold"
              color={subscriptionInfo.willRenew ? "success" : "warning"}
            >
              {subscriptionInfo.willRenew ? "Açık" : "Kapalı"}
            </Text>
          </View>

          {subscriptionInfo.originalPurchaseDate && (
            <View style={styles.detailItem}>
              <Text variant="bodyMedium" color="secondary">
                Başlangıç:
              </Text>
              <Text variant="bodyMedium" weight="semibold" color="primary">
                {subscriptionInfo.originalPurchaseDate.toLocaleDateString(
                  "tr-TR"
                )}
              </Text>
            </View>
          )}

          <View style={styles.detailItem}>
            <Text variant="bodyMedium" color="secondary">
              Ortam:
            </Text>
            <Text variant="bodyMedium" weight="semibold" color="primary">
              {subscriptionInfo.isSandbox ? "Test" : "Canlı"}
            </Text>
          </View>
        </View>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text
            variant="bodyMedium"
            color="secondary"
            style={styles.loadingText}
          >
            Abonelik durumu kontrol ediliyor...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Button
            variant="ghost"
            size="sm"
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={20} color={colors.neutral[600]} />
          </Button>
        </View>

        {/* Subscription Status */}
        {renderSubscriptionStatus()}

        {/* Subscription Details */}
        {renderSubscriptionDetails()}

        {/* Quick Actions */}
        <Card variant="default" size="lg" style={styles.actionsCard}>
          <Text
            variant="headlineSmall"
            weight="semibold"
            style={styles.sectionTitle}
          >
            ⚡ Hızlı İşlemler
          </Text>

          <View style={styles.actionsList}>
            <Button
              variant="outline"
              size="lg"
              onPress={handleRefresh}
              fullWidth
              disabled={isRefreshing}
              leftIcon={
                isRefreshing ? (
                  <ActivityIndicator size={16} color={colors.primary[500]} />
                ) : (
                  <Ionicons name="refresh" size={16} />
                )
              }
            >
              Durumu Yenile
            </Button>

            <Button
              variant="outline"
              size="lg"
              onPress={handleRestorePurchases}
              fullWidth
              leftIcon={<Ionicons name="download" size={16} />}
            >
              Satın Alımları Geri Yükle
            </Button>

            {isPremium && (
              <Button
                variant="primary"
                size="lg"
                onPress={handleManageSubscription}
                fullWidth
                leftIcon={<Ionicons name="settings" size={16} />}
              >
                Aboneliği Yönet
              </Button>
            )}
          </View>
        </Card>

        {/* Help & Support */}
        <Card variant="filled" size="lg" style={styles.helpCard}>
          <View style={styles.helpContent}>
            <Ionicons name="help-circle" size={24} color={colors.info[500]} />
            <Text
              variant="bodyMedium"
              align="center"
              color="secondary"
              style={styles.helpText}
            >
              Abonelik ile ilgili sorunlarınız için destek ekibimizle iletişime
              geçebilirsiniz.
            </Text>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  content: {
    flex: 1,
  },
  header: {
    padding: spacing[4],
    alignItems: "flex-start",
  },
  backButton: {
    padding: spacing[2],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing[4],
  },
  loadingText: {
    marginTop: spacing[2],
  },
  statusCard: {
    margin: spacing[4],
    marginTop: 0,
  },
  premiumCard: {
    borderColor: colors.primary[200],
    borderWidth: 2,
    backgroundColor: colors.primary[50],
  },
  statusContent: {
    alignItems: "center",
    gap: spacing[3],
  },
  statusIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.neutral[100],
    alignItems: "center",
    justifyContent: "center",
  },
  premiumIcon: {
    backgroundColor: colors.primary[100],
  },
  statusDescription: {
    lineHeight: 22,
    maxWidth: 280,
  },
  expirationInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
    marginTop: spacing[2],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
  detailsCard: {
    margin: spacing[4],
  },
  sectionTitle: {
    marginBottom: spacing[4],
  },
  detailsList: {
    gap: spacing[3],
  },
  detailItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[100],
  },
  actionsCard: {
    margin: spacing[4],
  },
  actionsList: {
    gap: spacing[3],
  },
  helpCard: {
    margin: spacing[4],
    backgroundColor: colors.info[50],
    borderColor: colors.info[200],
    borderWidth: 1,
  },
  helpContent: {
    alignItems: "center",
    gap: spacing[3],
  },
  helpText: {
    lineHeight: 20,
    textAlign: "center",
  },
});

export default SubscriptionScreen;
