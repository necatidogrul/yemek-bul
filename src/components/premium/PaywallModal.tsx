/**
 * Paywall Modal Component
 *
 * Premium subscription satın alma ekranı
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import Modal from 'react-native-modal';
import { PurchasesPackage, PurchasesOffering } from 'react-native-purchases';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';

// Components
import Text from '../ui/Text';
import Button from '../ui/Button';

// Services & Hooks
import { RevenueCatService } from '../../services/RevenueCatService';
import { useTranslation } from '../../hooks/useTranslation';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { useToast } from '../../contexts/ToastContext';

// Theme
import { colors as designColors } from '../../theme/design-tokens';

interface PaywallModalProps {
  isVisible: boolean;
  onClose: () => void;
  onPurchaseSuccess?: () => void;
  title?: string;
  feature?: string;
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
  const [retryCount, setRetryCount] = useState(0);

  // Premium özellikler listesi
  const premiumFeatures: PremiumFeature[] = [
    {
      icon: 'infinite',
      title: t('premium.features.unlimited_recipes'),
      description: t('premium.features.unlimited_recipes_desc'),
    },
    {
      icon: 'filter',
      title: t('premium.features.advanced_filters'),
      description: t('premium.features.advanced_filters_desc'),
    },
    {
      icon: 'download',
      title: t('premium.features.export_recipes'),
      description: t('premium.features.export_recipes_desc'),
    },
    {
      icon: 'headset',
      title: t('premium.features.priority_support'),
      description: t('premium.features.priority_support_desc'),
    },
    {
      icon: 'ban',
      title: t('premium.features.no_ads'),
      description: t('premium.features.no_ads_desc'),
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
      console.log('🔄 Loading RevenueCat offerings...');

      // Expo Go kontrolü
      const isExpoGo = Constants.appOwnership === 'expo';
      if (isExpoGo) {
        console.warn('⚠️ Running in Expo Go - RevenueCat will not work');
        showToast({
          type: 'warning',
          title: "Premium özellikler Expo Go'da çalışmaz",
        });
        setOfferings([]);
        return;
      }

      // RevenueCat SDK'nın initialize edildiğinden emin ol
      try {
        console.log('⏳ Ensuring RevenueCat is initialized...');
        await RevenueCatService.initialize();
        console.log('✅ RevenueCat service ready');
      } catch (initError: any) {
        console.error('❌ RevenueCat init failed:', initError);

        // Retry logic - SDK'nın başlatılmasını bekle
        if (retryCount < 5) {
          setRetryCount(prev => prev + 1);
          console.log(`⏳ Waiting for SDK... (attempt ${retryCount + 1}/5)`);
          
          // Her denemede biraz daha bekle
          const delay = 1000 * (retryCount + 1);
          await new Promise(resolve => setTimeout(resolve, delay));
          return loadOfferings();
        }

        // Son deneme başarısız - kullanıcıya bilgi ver
        console.error('❌ RevenueCat could not be initialized after retries');
        throw new Error('RevenueCat başlatılamadı. Lütfen uygulamayı yeniden başlatın.');
      }

      // Offerings'leri yükle
      const availableOfferings = await RevenueCatService.getOfferings();
      console.log('📦 Offerings loaded:', {
        count: availableOfferings.length,
        offerings: availableOfferings.map(o => ({
          id: o.identifier,
          packages: o.availablePackages.length,
        })),
      });

      if (availableOfferings.length === 0) {
        showToast({
          type: 'warning',
          title: 'Henüz paket tanımlanmamış',
        });
        return;
      }

      setOfferings(availableOfferings);

      // Varsayılan olarak ilk package'ı seç
      if (availableOfferings[0]?.availablePackages?.length > 0) {
        // Önce monthly package'ı ara
        const monthlyPackage = availableOfferings[0].availablePackages.find(
          p =>
            p.identifier === '$rc_monthly' || p.identifier.includes('monthly')
        );

        const selectedPkg =
          monthlyPackage || availableOfferings[0].availablePackages[0];
        setSelectedPackage(selectedPkg);

        console.log('✅ Package selected:', {
          identifier: selectedPkg.identifier,
          productId: selectedPkg.product.identifier,
          price: selectedPkg.product.priceString,
        });
      }
    } catch (error) {
      console.error('❌ Failed to load offerings:', error);

      // Kullanıcıya anlamlı hata mesajı göster
      let errorMessage = 'Paketler yüklenemedi';

      if (error instanceof Error) {
        if (error.message.includes('No offerings available') || 
            error.message.includes('No offerings configured')) {
          errorMessage =
            'Premium paketler henüz yapılandırılmamış. Lütfen daha sonra tekrar deneyin.';
        } else if (error.message.includes('RevenueCat başlatılamadı')) {
          errorMessage = error.message;
        } else if (error.message.includes('configure') || 
                   error.message.includes('singleton') ||
                   error.message.includes('SDK not')) {
          errorMessage =
            'RevenueCat servisi başlatılamadı. Lütfen uygulamayı kapatıp yeniden açın.';
        } else if (error.message.includes('network')) {
          errorMessage = 'İnternet bağlantınızı kontrol edin.';
        }
        
        console.error('Error details:', error.message);
      }

      showToast({
        type: 'error',
        title: errorMessage,
      });

      // Development'ta detaylı hata göster
      if (__DEV__) {
        Alert.alert(
          'Debug: RevenueCat Error',
          error instanceof Error ? error.message : 'Unknown error',
          [
            { text: 'Tamam' },
            { text: 'Tekrar Dene', onPress: () => loadOfferings() },
          ]
        );
      }
    } finally {
      setLoading(false);
      setRetryCount(0);
    }
  };

  const handlePurchase = async () => {
    if (!selectedPackage) {
      showToast({
        type: 'error',
        title: t('premium.errors.no_package_selected'),
      });
      return;
    }

    try {
      setPurchasing(true);
      console.log('🛒 Starting purchase:', selectedPackage.identifier);

      const result = await RevenueCatService.purchasePackage(selectedPackage);

      if (result.success) {
        console.log('✅ Purchase successful');
        showToast({
          type: 'success',
          title: t('premium.success.purchase_completed'),
        });
        onPurchaseSuccess?.();
        onClose();
      } else if (result.userCancelled) {
        console.log('ℹ️ User cancelled purchase');
        // Sessiz geç
      } else {
        console.error('❌ Purchase failed:', result.error);
        showToast({
          type: 'error',
          title: result.error || t('premium.errors.purchase_failed'),
        });
      }
    } catch (error: any) {
      console.error('❌ Purchase error:', error);
      showToast({
        type: 'error',
        title: error.message || t('premium.errors.purchase_failed'),
      });
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestorePurchases = async () => {
    try {
      setRestoring(true);
      console.log('🔄 Restoring purchases...');

      const result = await RevenueCatService.restorePurchases();

      if (result.success) {
        const premiumStatus = await RevenueCatService.getPremiumStatus();

        if (premiumStatus.isPremium && premiumStatus.isActive) {
          console.log('✅ Premium restored successfully');
          showToast({
            type: 'success',
            title: t('premium.success.restore_completed'),
          });
          onPurchaseSuccess?.();
          onClose();
        } else {
          console.log('ℹ️ No active purchases found');
          showToast({
            type: 'info',
            title: t('premium.info.no_purchases_found'),
          });
        }
      } else {
        console.error('❌ Restore failed:', result.error);
        showToast({
          type: 'error',
          title: result.error || t('premium.errors.restore_failed'),
        });
      }
    } catch (error: any) {
      console.error('❌ Restore error:', error);
      showToast({
        type: 'error',
        title: error.message || t('premium.errors.restore_failed'),
      });
    } finally {
      setRestoring(false);
    }
  };

  const formatPrice = (packageItem: PurchasesPackage): string => {
    const { product } = packageItem;

    // Package type'a göre period belirle
    if (
      packageItem.identifier.includes('annual') ||
      packageItem.identifier.includes('yearly')
    ) {
      return `${product.priceString}/${t('premium.period.year')}`;
    } else if (packageItem.identifier.includes('lifetime')) {
      return product.priceString;
    }

    return `${product.priceString}/${t('premium.period.month')}`;
  };

  const getPackageTitle = (packageItem: PurchasesPackage): string => {
    if (
      packageItem.identifier.includes('annual') ||
      packageItem.identifier.includes('yearly')
    ) {
      return t('premium.yearly_subscription');
    } else if (packageItem.identifier.includes('lifetime')) {
      return t('premium.lifetime_purchase');
    }

    return t('premium.monthly_subscription');
  };

  if (loading) {
    return (
      <Modal isVisible={isVisible} style={styles.modal}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size='large' color={designColors.primary[500]} />
          <Text style={styles.loadingText}>{t('premium.loading_offers')}</Text>
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
            <Ionicons name='close' size={24} color='#1A1A1A' />
          </TouchableOpacity>
          <Text style={styles.title}>
            {title || t('premium.upgrade_to_premium')}
          </Text>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Özellik vurgusu */}
          {feature && (
            <View style={styles.featureHighlight}>
              <Text style={styles.featureText}>
                {t('premium.feature_unlock', { feature })}
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
          {offerings.length > 0 &&
            offerings[0].availablePackages.length > 0 && (
              <View style={styles.packagesContainer}>
                <Text style={styles.sectionTitle}>
                  {t('premium.choose_plan')}
                </Text>
                {offerings[0].availablePackages.map(packageItem => (
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
                        {getPackageTitle(packageItem)}
                      </Text>
                      <Text style={styles.packagePrice}>
                        {formatPrice(packageItem)}
                      </Text>
                    </View>
                    {selectedPackage?.identifier === packageItem.identifier && (
                      <Ionicons
                        name='checkmark-circle'
                        size={24}
                        color={designColors.primary[500]}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}

          {/* No offerings message */}
          {offerings.length === 0 && !loading && (
            <View style={styles.noOfferingsContainer}>
              <Ionicons name='alert-circle' size={48} color='#999' />
              <Text style={styles.noOfferingsText}>
                Premium paketler şu anda yükleniyor. Lütfen daha sonra tekrar
                deneyin.
              </Text>
              <TouchableOpacity
                onPress={loadOfferings}
                style={styles.retryButton}
              >
                <Text style={styles.retryText}>Tekrar Dene</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {/* Footer buttons */}
        <View style={styles.footer}>
          {selectedPackage && (
            <Button
              onPress={handlePurchase}
              disabled={!selectedPackage || purchasing || restoring}
              loading={purchasing}
              style={styles.purchaseButton}
            >
              {purchasing
                ? t('premium.purchasing')
                : t('premium.start_subscription')}
            </Button>
          )}

          <TouchableOpacity
            onPress={handleRestorePurchases}
            disabled={restoring || purchasing}
            style={styles.restoreButton}
          >
            <Text style={styles.restoreText}>
              {restoring
                ? t('premium.restoring')
                : t('premium.restore_purchases')}
            </Text>
          </TouchableOpacity>

          {/* Terms & Privacy */}
          <View style={styles.legalContainer}>
            <Text style={styles.legalText}>{t('premium.terms_agreement')}</Text>
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
      justifyContent: 'flex-end',
    },
    container: {
      backgroundColor: '#FFFFFF',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '90%',
      minHeight: '60%',
    },
    loadingContainer: {
      backgroundColor: '#FFFFFF',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: {
      marginTop: 16,
      color: '#666666',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: '#EEEEEE',
      position: 'relative',
    },
    closeButton: {
      position: 'absolute',
      right: 20,
      padding: 4,
    },
    title: {
      fontWeight: '600',
      fontSize: 18,
      color: '#1A1A1A',
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
      textAlign: 'center',
      fontWeight: '500',
      color: designColors.primary[700],
    },
    featuresContainer: {
      marginBottom: 32,
    },
    featureItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
    },
    featureIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: designColors.primary[50],
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 16,
    },
    featureContent: {
      flex: 1,
    },
    featureTitle: {
      fontWeight: '600',
      marginBottom: 4,
      fontSize: 16,
      color: '#1A1A1A',
    },
    featureDescription: {
      lineHeight: 20,
      color: '#666666',
      fontSize: 14,
    },
    packagesContainer: {
      marginBottom: 20,
    },
    sectionTitle: {
      marginBottom: 16,
      fontWeight: '600',
      fontSize: 16,
      color: '#1A1A1A',
    },
    packageItem: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: '#EEEEEE',
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
      fontWeight: '600',
      marginBottom: 4,
      fontSize: 16,
      color: '#1A1A1A',
    },
    packagePrice: {
      fontWeight: '700',
      fontSize: 18,
      color: designColors.primary[600],
    },
    footer: {
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: '#EEEEEE',
    },
    purchaseButton: {
      marginBottom: 16,
    },
    restoreButton: {
      alignItems: 'center',
      paddingVertical: 12,
      marginBottom: 16,
    },
    restoreText: {
      fontWeight: '500',
      color: designColors.primary[600],
    },
    legalContainer: {
      alignItems: 'center',
    },
    legalText: {
      textAlign: 'center',
      lineHeight: 16,
      fontSize: 12,
      color: '#666666',
    },
    noOfferingsContainer: {
      alignItems: 'center',
      padding: 40,
    },
    noOfferingsText: {
      textAlign: 'center',
      marginTop: 16,
      marginBottom: 24,
      color: '#666',
      fontSize: 16,
      lineHeight: 24,
    },
    retryButton: {
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 8,
      backgroundColor: designColors.primary[50],
    },
    retryText: {
      color: designColors.primary[600],
      fontWeight: '600',
    },
  });
