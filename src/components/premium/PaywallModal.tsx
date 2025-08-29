/**
 * Paywall Modal Component
 *
 * Premium subscription satın alma ekranı
 */

import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from "react-native";
import Modal from "react-native-modal";
import { PurchasesPackage, PurchasesOffering } from "react-native-purchases";
import { Ionicons } from "@expo/vector-icons";

// Components
import Text from "../ui/Text";
import Button from "../ui/Button";

// Services & Hooks
import { RevenueCatService } from "../../services/RevenueCatService";
import { useTranslation } from "../../hooks/useTranslation";
import { useThemedStyles } from "../../hooks/useThemedStyles";
import { useToast } from "../../contexts/ToastContext";

// Theme
import { colors as designColors } from "../../theme/design-tokens";

interface PaywallModalProps {
  isVisible: boolean;
  onClose: () => void;
  onPurchaseSuccess?: () => void;
  title?: string;
  feature?: string; // Hangi özellik için gösterildiği
}

interface PremiumFeature {
  icon: string;
  title: string;
  description: string;
}

export const PaywallModal: React.FC<PaywallModalProps> = ({
  isVisible,
  onClose,
  onPurchaseSuccess,
  title,
  feature,
}) => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const styles = createStyles();

  // State
  const [loading, setLoading] = useState(false);
  const [offerings, setOfferings] = useState<PurchasesOffering[]>([]);
  const [selectedPackage, setSelectedPackage] =
    useState<PurchasesPackage | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  // Premium özellikler listesi
  const premiumFeatures: PremiumFeature[] = [
    {
      icon: "infinite",
      title: t("premium.features.unlimited_recipes"),
      description: t("premium.features.unlimited_recipes_desc"),
    },
    {
      icon: "filter",
      title: t("premium.features.advanced_filters"),
      description: t("premium.features.advanced_filters_desc"),
    },
    {
      icon: "download",
      title: t("premium.features.export_recipes"),
      description: t("premium.features.export_recipes_desc"),
    },
    {
      icon: "headset",
      title: t("premium.features.priority_support"),
      description: t("premium.features.priority_support_desc"),
    },
    {
      icon: "ban",
      title: t("premium.features.no_ads"),
      description: t("premium.features.no_ads_desc"),
    },
  ];

  // Component mount'ta offerings'leri yükle
  useEffect(() => {
    if (isVisible) {
      loadOfferings();
    }
  }, [isVisible]);

  const loadOfferings = async () => {
    try {
      setLoading(true);
      const availableOfferings = await RevenueCatService.getOfferings();
      setOfferings(availableOfferings);

      // Varsayılan olarak monthly package'ı seç
      if (
        availableOfferings.length > 0 &&
        availableOfferings[0].availablePackages.length > 0
      ) {
        const monthlyPackage = availableOfferings[0].availablePackages.find(
          (p) => p.identifier === "$rc_monthly"
        );
        setSelectedPackage(
          monthlyPackage || availableOfferings[0].availablePackages[0]
        );
      }
    } catch (error) {
      console.error("Failed to load offerings:", error);
      showToast({ type: "error", title: t("premium.errors.load_offerings") });
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!selectedPackage) {
      showToast({
        type: "error",
        title: t("premium.errors.no_package_selected"),
      });
      return;
    }

    try {
      setPurchasing(true);
      const result = await RevenueCatService.purchasePackage(selectedPackage);

      if (result.success) {
        showToast({
          type: "success",
          title: t("premium.success.purchase_completed"),
        });
        onPurchaseSuccess?.();
        onClose();
      } else if (result.userCancelled) {
        // Kullanıcı iptal etti, sessiz geç
        return;
      } else {
        showToast({
          type: "error",
          title: result.error || t("premium.errors.purchase_failed"),
        });
      }
    } catch (error: any) {
      console.error("Purchase error:", error);
      showToast({
        type: "error",
        title: error.message || t("premium.errors.purchase_failed"),
      });
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestorePurchases = async () => {
    try {
      setRestoring(true);
      const result = await RevenueCatService.restorePurchases();

      if (result.success) {
        const premiumStatus = RevenueCatService.getPremiumStatus();
        if (premiumStatus.isPremium && premiumStatus.isActive) {
          showToast({
            type: "success",
            title: t("premium.success.restore_completed"),
          });
          onPurchaseSuccess?.();
          onClose();
        } else {
          showToast({
            type: "info",
            title: t("premium.info.no_purchases_found"),
          });
        }
      } else {
        showToast({
          type: "error",
          title: result.error || t("premium.errors.restore_failed"),
        });
      }
    } catch (error: any) {
      console.error("Restore error:", error);
      showToast({
        type: "error",
        title: error.message || t("premium.errors.restore_failed"),
      });
    } finally {
      setRestoring(false);
    }
  };

  const formatPrice = (packageItem: PurchasesPackage): string => {
    const { product } = packageItem;
    return `${product.priceString}/${t("premium.period.month")}`;
  };

  if (loading) {
    return (
      <Modal isVisible={isVisible} style={styles.modal}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={designColors.primary[500]} />
          <Text style={styles.loadingText}>{t("premium.loading_offers")}</Text>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      style={styles.modal}
      propagateSwipe
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={styles.title}>
            {title || t("premium.upgrade_to_premium")}
          </Text>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Özellik vurgusu */}
          {feature && (
            <View style={styles.featureHighlight}>
              <Text style={styles.featureText}>
                {t("premium.feature_unlock", { feature })}
              </Text>
            </View>
          )}

          {/* Premium özellikler listesi */}
          <View style={styles.featuresContainer}>
            {premiumFeatures.map((premiumFeature, index) => (
              <View key={index} style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <Ionicons
                    name={premiumFeature.icon as any}
                    size={24}
                    color={designColors.primary[500]}
                  />
                </View>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>
                    {premiumFeature.title}
                  </Text>
                  <Text style={styles.featureDescription}>
                    {premiumFeature.description}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Package seçimi */}
          {offerings.length > 0 && (
            <View style={styles.packagesContainer}>
              <Text style={styles.sectionTitle}>
                {t("premium.choose_plan")}
              </Text>
              {offerings[0].availablePackages.map((packageItem, index) => (
                <TouchableOpacity
                  key={packageItem.identifier}
                  style={[
                    styles.packageItem,
                    selectedPackage?.identifier === packageItem.identifier &&
                      styles.selectedPackage,
                  ]}
                  onPress={() => setSelectedPackage(packageItem)}
                >
                  <View style={styles.packageInfo}>
                    <Text style={styles.packageTitle}>
                      {t("premium.monthly_subscription")}
                    </Text>
                    <Text style={styles.packagePrice}>
                      {formatPrice(packageItem)}
                    </Text>
                  </View>
                  {selectedPackage?.identifier === packageItem.identifier && (
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color={designColors.primary[500]}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Footer buttons */}
        <View style={styles.footer}>
          <Button
            onPress={handlePurchase}
            disabled={!selectedPackage || purchasing || restoring}
            loading={purchasing}
            style={styles.purchaseButton}
          >
            {purchasing
              ? t("premium.purchasing")
              : t("premium.start_free_trial")}
          </Button>

          <TouchableOpacity
            onPress={handleRestorePurchases}
            disabled={restoring || purchasing}
            style={styles.restoreButton}
          >
            <Text style={styles.restoreText}>
              {restoring
                ? t("premium.restoring")
                : t("premium.restore_purchases")}
            </Text>
          </TouchableOpacity>

          {/* Terms & Privacy */}
          <View style={styles.legalContainer}>
            <Text style={styles.legalText}>{t("premium.terms_agreement")}</Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = () =>
  StyleSheet.create({
    modal: {
      margin: 0,
      justifyContent: "flex-end",
    },
    container: {
      backgroundColor: "#FFFFFF",
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: "90%",
      minHeight: "60%",
    },
    loadingContainer: {
      backgroundColor: "#FFFFFF",
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    loadingText: {
      marginTop: 16,
      color: "#666666",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: "#EEEEEE",
      position: "relative",
    },
    closeButton: {
      position: "absolute",
      right: 20,
      padding: 4,
    },
    title: {
      fontWeight: "600",
      fontSize: 18,
      color: "#1A1A1A",
    },
    content: {
      flex: 1,
      padding: 20,
    },
    featureHighlight: {
      backgroundColor: designColors.primary[50],
      padding: 16,
      borderRadius: 12,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: designColors.primary[200],
    },
    featureText: {
      textAlign: "center",
      fontWeight: "500",
      color: designColors.primary[700],
    },
    featuresContainer: {
      marginBottom: 32,
    },
    featureItem: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 20,
    },
    featureIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: designColors.primary[50],
      alignItems: "center",
      justifyContent: "center",
      marginRight: 16,
    },
    featureContent: {
      flex: 1,
    },
    featureTitle: {
      fontWeight: "600",
      marginBottom: 4,
      fontSize: 16,
      color: "#1A1A1A",
    },
    featureDescription: {
      lineHeight: 20,
      color: "#666666",
      fontSize: 14,
    },
    packagesContainer: {
      marginBottom: 20,
    },
    sectionTitle: {
      marginBottom: 16,
      fontWeight: "600",
      fontSize: 16,
      color: "#1A1A1A",
    },
    packageItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 16,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: "#EEEEEE",
      marginBottom: 12,
    },
    selectedPackage: {
      borderColor: designColors.primary[500],
      backgroundColor: designColors.primary[50],
    },
    packageInfo: {
      flex: 1,
    },
    packageTitle: {
      fontWeight: "600",
      marginBottom: 4,
      fontSize: 16,
      color: "#1A1A1A",
    },
    packagePrice: {
      fontWeight: "700",
      fontSize: 18,
      color: designColors.primary[600],
    },
    footer: {
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: "#EEEEEE",
    },
    purchaseButton: {
      marginBottom: 16,
    },
    restoreButton: {
      alignItems: "center",
      paddingVertical: 12,
      marginBottom: 16,
    },
    restoreText: {
      fontWeight: "500",
      color: designColors.primary[600],
    },
    legalContainer: {
      alignItems: "center",
    },
    legalText: {
      textAlign: "center",
      lineHeight: 16,
      fontSize: 12,
      color: "#666666",
    },
  });
