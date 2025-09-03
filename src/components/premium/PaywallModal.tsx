/**
 * Paywall Modal Component
 *
 * Premium subscription satın alma ekranı
 */

import React, { useState, useEffect } from 'react';
import { Logger } from '../../services/LoggerService';
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
      icon: 'filter-outline',
      title: t('premium.features.advanced_filters'),
      description: t('premium.features.advanced_filters_desc'),
    },
    {
      icon: 'download-outline',
      title: t('premium.features.export_recipes'),
      description: t('premium.features.export_recipes_desc'),
    },
    {
      icon: 'close-circle-outline',
      title: t('premium.features.no_ads'),
      description: t('premium.features.no_ads_desc'),
    },
    {
      icon: 'cloud-offline-outline',
      title: t('premium.features.offline_mode'),
      description: t('premium.features.offline_mode_desc'),
    },
    {
      icon: 'restaurant-outline',
      title: t('premium.features.custom_meal_plans'),
      description: t('premium.features.custom_meal_plans_desc'),
    },
    {
      icon: 'fitness-outline',
      title: t('premium.features.nutrition_tracking'),
      description: t('premium.features.nutrition_tracking_desc'),
    },
    {
      icon: 'chatbubbles-outline',
      title: t('premium.features.priority_support'),
      description: t('premium.features.priority_support_desc'),
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
        throw new Error(
          'RevenueCat başlatılamadı. Lütfen uygulamayı yeniden başlatın.'
        );
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

      // Tüm offerings'lerden paketleri topla ve monthly'yi bul
      const allPackages = availableOfferings.flatMap(offering => offering.availablePackages);
      
      if (allPackages.length > 0) {
        // Önce monthly package'ı ara
        const monthlyPackage = allPackages.find(
          p => {
            const id = p.identifier.toLowerCase();
            const productId = p.product.identifier.toLowerCase();
            return (
              id === '$rc_monthly' || 
              id.includes('monthly') || 
              id.includes('month') ||
              productId.includes('monthly') || 
              productId.includes('month')
            );
          }
        );

        const selectedPkg = monthlyPackage || allPackages[0];
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
        if (
          error.message.includes('No offerings available') ||
          error.message.includes('No offerings configured')
        ) {
          errorMessage =
            'Premium paketler henüz yapılandırılmamış. Lütfen daha sonra tekrar deneyin.';
        } else if (error.message.includes('RevenueCat başlatılamadı')) {
          errorMessage = error.message;
        } else if (
          error.message.includes('configure') ||
          error.message.includes('singleton') ||
          error.message.includes('SDK not')
        ) {
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
    const identifier = packageItem.identifier.toLowerCase();

    // Package type'a göre period belirle
    if (identifier.includes('weekly')) {
      return `${product.priceString}/${t('premium.period.week')}`;
    } else if (identifier.includes('annual') || identifier.includes('yearly')) {
      return `${product.priceString}/${t('premium.period.year')}`;
    } else if (identifier.includes('lifetime')) {
      return `${product.priceString} ${t('premium.period.once')}`;
    } else if (
      identifier.includes('three_month') ||
      identifier.includes('3month')
    ) {
      return `${product.priceString}/3 ${t('premium.period.months')}`;
    } else if (
      identifier.includes('six_month') ||
      identifier.includes('6month')
    ) {
      return `${product.priceString}/6 ${t('premium.period.months')}`;
    }

    return `${product.priceString}/${t('premium.period.month')}`;
  };

  const getPackageTitle = (packageItem: PurchasesPackage): string => {
    const identifier = packageItem.identifier.toLowerCase();

    if (identifier.includes('weekly')) {
      return t('premium.weekly_trial');
    } else if (identifier.includes('annual') || identifier.includes('yearly')) {
      return t('premium.yearly_subscription');
    } else if (identifier.includes('lifetime')) {
      return t('premium.lifetime_purchase');
    } else if (
      identifier.includes('three_month') ||
      identifier.includes('3month')
    ) {
      return t('premium.three_month_subscription');
    } else if (
      identifier.includes('six_month') ||
      identifier.includes('6month')
    ) {
      return t('premium.six_month_subscription');
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
      onBackButtonPress={onClose}
      style={styles.modal}
      animationIn='slideInUp'
      animationOut='slideOutDown'
      backdropOpacity={0.5}
      useNativeDriver={true}
      hideModalContentWhileAnimating={true}
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
          {/* Kompakt Hero Section */}
          <View style={styles.compactHero}>
            <View style={styles.premiumBadge}>
              <Ionicons name='star' size={16} color='#FFD700' />
              <Text style={styles.premiumBadgeText}>PREMIUM</Text>
            </View>
            <Text style={styles.compactTitle}>
              {title || t('premium.upgrade_to_premium')}
            </Text>
          </View>

          {/* Package seçimi - EN ÜSTTE */}
          {offerings.length > 0 && (
              <View style={styles.packagesContainer}>
                <Text style={styles.sectionTitle}>
                  {t('premium.choose_plan')}
                </Text>
                {/* Tüm offerings'lerden paketleri topla */}
                {offerings.flatMap(offering => offering.availablePackages).map((packageItem, index) => {
                  const isSelected =
                    selectedPackage?.identifier === packageItem.identifier;
                  const identifier = packageItem.identifier.toLowerCase();
                  const isPopular =
                    identifier.includes('annual') ||
                    identifier.includes('yearly') ||
                    identifier.includes('six_month');
                  const isBestValue =
                    identifier.includes('annual') ||
                    identifier.includes('yearly');

                  return (
                    <TouchableOpacity
                      key={packageItem.identifier}
                      style={[
                        styles.packageItem,
                        isSelected && styles.selectedPackage,
                        isPopular && styles.popularPackage,
                      ]}
                      onPress={() => setSelectedPackage(packageItem)}
                    >
                      {isPopular && (
                        <View style={styles.popularBadge}>
                          <Text style={styles.popularBadgeText}>
                            {isBestValue ? 'EN İYİ DEĞER' : 'POPÜLER'}
                          </Text>
                        </View>
                      )}

                      <View style={styles.packageContent}>
                        <View style={styles.packageInfo}>
                          <Text style={styles.packageTitle}>
                            {getPackageTitle(packageItem)}
                          </Text>
                          <Text style={styles.packagePrice}>
                            {formatPrice(packageItem)}
                          </Text>
                          {isPopular && (
                            <Text style={styles.savingsText}>
                              {t('premium.save_percentage', {
                                percentage: '60',
                              })}
                            </Text>
                          )}
                        </View>

                        <View
                          style={[
                            styles.selectionIndicator,
                            isSelected && styles.selectionIndicatorSelected,
                          ]}
                        >
                          {isSelected ? (
                            <Ionicons
                              name='checkmark-circle'
                              size={24}
                              color={designColors.primary[600]}
                            />
                          ) : (
                            <View style={styles.selectionCircle} />
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

          {/* Özellik vurgusu */}
          {feature && (
            <View style={styles.featureHighlight}>
              <Ionicons
                name='sparkles'
                size={18}
                color={designColors.primary[600]}
              />
              <Text style={styles.featureText}>
                {t('premium.feature_unlock', { feature })}
              </Text>
            </View>
          )}

          {/* Premium özellikler listesi - KISALTILMIŞ */}
          <View style={styles.featuresContainer}>
            <Text style={styles.featuresTitle}>
              {t('premium.what_you_get')}
            </Text>
            <View style={styles.featuresGrid}>
              {premiumFeatures.slice(0, 4).map((premiumFeature, index) => (
                <View key={index} style={styles.compactFeatureItem}>
                  <View style={styles.compactFeatureIcon}>
                    <Ionicons
                      name={premiumFeature.icon as any}
                      size={18}
                      color={designColors.primary[600]}
                    />
                  </View>
                  <Text style={styles.compactFeatureTitle}>
                    {premiumFeature.title}
                  </Text>
                </View>
              ))}
            </View>
            <Text style={styles.moreFeatures}>
              +{premiumFeatures.length - 4} daha fazla özellik
            </Text>
          </View>

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
      justifyContent: 'center',
    },
    container: {
      backgroundColor: '#FFFFFF',
      flex: 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 10,
    },
    loadingContainer: {
      backgroundColor: '#FFFFFF',
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 40,
    },
    loadingText: {
      marginTop: 16,
      color: '#666666',
      fontSize: 16,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 20,
      paddingTop: 60,
      paddingBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: '#F0F0F0',
      position: 'relative',
      backgroundColor: '#FFFFFF',
    },
    closeButton: {
      position: 'absolute',
      right: 20,
      top: 60,
      padding: 8,
      borderRadius: 20,
      backgroundColor: '#F5F5F5',
      zIndex: 1,
    },
    title: {
      fontWeight: '700',
      fontSize: 20,
      color: '#1A1A1A',
    },
    content: {
      flex: 1,
      paddingHorizontal: 20,
    },

    // Kompakt Hero Section
    compactHero: {
      alignItems: 'center',
      paddingVertical: 16,
      marginBottom: 16,
    },
    compactTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: '#1A1A1A',
      textAlign: 'center',
      marginTop: 8,
    },
    premiumBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255, 215, 0, 0.1)',
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: 'rgba(255, 215, 0, 0.3)',
    },
    premiumBadgeText: {
      marginLeft: 6,
      fontWeight: '700',
      fontSize: 12,
      color: '#B8860B',
      letterSpacing: 1,
    },

    // Feature Highlight
    featureHighlight: {
      backgroundColor: designColors.primary[50],
      padding: 18,
      borderRadius: 16,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: designColors.primary[200],
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    featureText: {
      textAlign: 'center',
      fontWeight: '600',
      color: designColors.primary[700],
      fontSize: 15,
      marginLeft: 8,
    },

    // Features Section - Kompakt
    featuresContainer: {
      marginBottom: 24,
    },
    featuresTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: '#1A1A1A',
      marginBottom: 16,
      textAlign: 'center',
    },
    featuresGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    compactFeatureItem: {
      width: '48%',
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FAFAFA',
      padding: 12,
      borderRadius: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: '#F0F0F0',
    },
    compactFeatureIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: designColors.primary[100],
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    compactFeatureTitle: {
      fontWeight: '600',
      fontSize: 13,
      color: '#1A1A1A',
      flex: 1,
      lineHeight: 18,
    },
    moreFeatures: {
      textAlign: 'center',
      fontSize: 14,
      color: designColors.primary[600],
      fontWeight: '600',
      fontStyle: 'italic',
    },
    featureItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 18,
      backgroundColor: '#FAFAFA',
      padding: 16,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#F0F0F0',
    },
    featureIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: designColors.primary[100],
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    featureContent: {
      flex: 1,
    },
    featureTitle: {
      fontWeight: '600',
      marginBottom: 4,
      fontSize: 16,
      color: '#1A1A1A',
      lineHeight: 22,
    },
    featureDescription: {
      lineHeight: 20,
      color: '#666666',
      fontSize: 14,
    },
    checkmark: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: designColors.success[100],
      alignItems: 'center',
      justifyContent: 'center',
    },

    // Packages Section - Daha prominent
    packagesContainer: {
      marginBottom: 24,
      paddingHorizontal: 4,
    },
    sectionTitle: {
      marginBottom: 20,
      fontWeight: '700',
      fontSize: 20,
      color: '#1A1A1A',
      textAlign: 'center',
    },
    packageItem: {
      borderRadius: 16,
      borderWidth: 2,
      borderColor: '#E0E0E0',
      marginBottom: 16,
      overflow: 'hidden',
      position: 'relative',
      backgroundColor: '#FFFFFF',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    selectedPackage: {
      borderColor: designColors.primary[500],
      backgroundColor: designColors.primary[50],
      shadowColor: designColors.primary[500],
      shadowOpacity: 0.15,
    },
    popularPackage: {
      borderColor: '#FFD700',
      backgroundColor: '#FFFDF0',
      shadowColor: '#FFD700',
      shadowOpacity: 0.2,
    },
    popularBadge: {
      position: 'absolute',
      top: 0,
      right: 0,
      backgroundColor: '#FFD700',
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderBottomLeftRadius: 12,
      zIndex: 1,
    },
    popularBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      color: '#B8860B',
      letterSpacing: 0.5,
    },
    packageContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 20,
    },
    packageInfo: {
      flex: 1,
    },
    packageTitle: {
      fontWeight: '600',
      marginBottom: 6,
      fontSize: 18,
      color: '#1A1A1A',
    },
    packagePrice: {
      fontWeight: '800',
      fontSize: 22,
      color: designColors.primary[600],
      marginBottom: 4,
    },
    savingsText: {
      fontSize: 13,
      fontWeight: '600',
      color: designColors.success[600],
      backgroundColor: designColors.success[50],
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
      alignSelf: 'flex-start',
      marginTop: 4,
    },
    selectionIndicator: {
      marginLeft: 16,
    },
    selectionIndicatorSelected: {
      // No additional styles needed
    },
    selectionCircle: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: '#CCCCCC',
      backgroundColor: 'transparent',
    },
    footer: {
      padding: 20,
      paddingBottom: 40,
      borderTopWidth: 2,
      borderTopColor: designColors.primary[100],
      backgroundColor: '#FFFFFF',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 5,
    },
    purchaseButton: {
      marginBottom: 16,
      paddingVertical: 16,
      backgroundColor: designColors.primary[600],
      shadowColor: designColors.primary[600],
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
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
