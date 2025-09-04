/**
 * Premium Paywall Modal - Minimal & Conversion-Focused
 *
 * Kısa, net ve satın almaya odaklı tasarım
 */

import React, { useState, useEffect, useRef } from 'react';
import { Logger } from '../../services/LoggerService';
import {
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import Modal from 'react-native-modal';
import { PurchasesPackage, PurchasesOffering } from 'react-native-purchases';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';

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

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface PaywallModalProps {
  isVisible: boolean;
  onClose: () => void;
  onPurchaseSuccess?: () => void;
  title?: string;
  feature?: string;
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

  // Animation refs
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  // State
  const [loading, setLoading] = useState(false);
  const [offerings, setOfferings] = useState<PurchasesOffering[]>([]);
  const [selectedPackage, setSelectedPackage] =
    useState<PurchasesPackage | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Entrance animations
  useEffect(() => {
    if (isVisible) {
      loadOfferings();
      startAnimations();
    }
  }, [isVisible]);

  const startAnimations = () => {
    // Entrance animation
    Animated.spring(slideAnim, {
      toValue: 1,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();

    // Pulse animation for CTA
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const loadOfferings = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading RevenueCat offerings...');

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

      try {
        await RevenueCatService.initialize();
      } catch (initError: any) {
        if (retryCount < 2) {
          setRetryCount(prev => prev + 1);
          const delay = 1000 * (retryCount + 1);
          await new Promise(resolve => setTimeout(resolve, delay));
          return loadOfferings();
        }
        throw new Error('RevenueCat başlatılamadı.');
      }

      const availableOfferings = await RevenueCatService.getOfferings();
      if (availableOfferings.length === 0) {
        showToast({ type: 'warning', title: 'Henüz paket tanımlanmamış' });
        return;
      }

      setOfferings(availableOfferings);

      // Varsayılan paket seç (aylık tercih)
      const allPackages = availableOfferings.flatMap(
        offering => offering.availablePackages
      );
      if (allPackages.length > 0) {
        const monthlyPackage = allPackages.find(p =>
          p.identifier.toLowerCase().includes('monthly')
        );
        setSelectedPackage(monthlyPackage || allPackages[0]);
      }
    } catch (error) {
      console.error('❌ Failed to load offerings:', error);
      showToast({ type: 'error', title: 'Paketler yüklenemedi' });
    } finally {
      setLoading(false);
      setRetryCount(0);
    }
  };

  const handlePurchase = async () => {
    if (!selectedPackage) {
      showToast({ type: 'error', title: 'Lütfen bir paket seçin' });
      return;
    }

    try {
      setPurchasing(true);
      const result = await RevenueCatService.purchasePackage(selectedPackage);

      if (result.success) {
        showToast({ type: 'success', title: 'Premium aktif! 🎉' });
        onPurchaseSuccess?.();
        onClose();
      } else if (!result.userCancelled) {
        showToast({
          type: 'error',
          title: result.error || 'Satın alma başarısız',
        });
      }
    } catch (error: any) {
      showToast({ type: 'error', title: error.message || 'Bir hata oluştu' });
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestorePurchases = async () => {
    try {
      setRestoring(true);
      const result = await RevenueCatService.restorePurchases();

      if (result.success) {
        const premiumStatus = await RevenueCatService.getPremiumStatus();
        if (premiumStatus.isPremium && premiumStatus.isActive) {
          showToast({ type: 'success', title: 'Premium geri yüklendi! 🎉' });
          onPurchaseSuccess?.();
          onClose();
        } else {
          showToast({ type: 'info', title: 'Aktif satın alma bulunamadı' });
        }
      } else {
        showToast({ type: 'error', title: 'Geri yükleme başarısız' });
      }
    } catch (error: any) {
      showToast({ type: 'error', title: 'Bir hata oluştu' });
    } finally {
      setRestoring(false);
    }
  };

  const formatPrice = (packageItem: PurchasesPackage): string => {
    const { product } = packageItem;
    const identifier = packageItem.identifier.toLowerCase();

    if (identifier.includes('annual') || identifier.includes('yearly')) {
      return `${product.priceString}/yıl`;
    }
    return `${product.priceString}/ay`;
  };

  const getPackageTitle = (packageItem: PurchasesPackage): string => {
    const identifier = packageItem.identifier.toLowerCase();
    if (identifier.includes('annual') || identifier.includes('yearly'))
      return 'Yıllık Plan';
    return 'Aylık Plan';
  };

  const getDiscountPercentage = (packageItem: PurchasesPackage): number => {
    const identifier = packageItem.identifier.toLowerCase();
    if (identifier.includes('annual') || identifier.includes('yearly'))
      return 60;
    return 0;
  };

  if (loading) {
    return (
      <Modal isVisible={isVisible} style={styles.modal}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size='large' color={designColors.primary[500]} />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
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
      backdropOpacity={1}
      useNativeDriver={true}
      hideModalContentWhileAnimating={true}
    >
      <Animated.View
        style={[
          styles.container,
          {
            transform: [
              {
                translateY: slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0],
                }),
              },
            ],
          },
        ]}
      >
        {/* Close button */}
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Ionicons name='close' size={24} color='#666' />
        </TouchableOpacity>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <LinearGradient
            colors={[designColors.primary[500], designColors.primary[600]]}
            style={styles.headerGradient}
          >
            <View style={styles.headerContent}>
              <View style={styles.iconContainer}>
                <Ionicons name='diamond' size={24} color='white' />
              </View>
              <Text style={styles.headerTitle}>Premium'a Yükselt</Text>
              <Text style={styles.headerSubtitle}>
                Sınırsız tarif üretimine geç
              </Text>
            </View>
          </LinearGradient>

          {/* Plan Comparison */}
          <View style={styles.comparisonSection}>
            <Text style={styles.comparisonTitle}>Hangi Plan Sana Uygun?</Text>

            <View style={styles.comparisonRow}>
              <TouchableOpacity
                style={[
                  styles.weeklyColumn,
                  selectedPackage?.identifier
                    .toLowerCase()
                    .includes('weekly') && styles.selectedPlanCard,
                ]}
                onPress={() => {
                  const weeklyPackage = offerings
                    .flatMap(o => o.availablePackages)
                    .find(p => p.identifier.toLowerCase().includes('weekly'));
                  if (weeklyPackage) setSelectedPackage(weeklyPackage);
                }}
              >
                <View style={styles.weeklyHeader}>
                  <Ionicons
                    name='calendar'
                    size={20}
                    color={designColors.secondary[600]}
                  />
                  <Text style={styles.weeklyTitle}>Haftalık</Text>
                  {selectedPackage?.identifier
                    .toLowerCase()
                    .includes('weekly') && (
                    <View style={styles.selectedIndicator}>
                      <Ionicons
                        name='checkmark-circle'
                        size={20}
                        color={designColors.primary[600]}
                      />
                    </View>
                  )}
                </View>
                <View style={styles.priceRow}>
                  <Text style={styles.weeklyPrice}>
                    {offerings.length > 0
                      ? offerings
                          .flatMap(o => o.availablePackages)
                          .find(p =>
                            p.identifier.toLowerCase().includes('weekly')
                          )?.product.priceString || '₺9.99'
                      : '₺9.99'}
                  </Text>
                  <Text style={styles.pricePeriod}>/hafta</Text>
                </View>
                <View style={styles.benefitItem}>
                  <Ionicons
                    name='checkmark-circle'
                    size={14}
                    color={designColors.success[600]}
                  />
                  <Text style={styles.benefitText}>10 tarif/gün</Text>
                </View>
                <View style={styles.benefitItem}>
                  <Ionicons
                    name='checkmark-circle'
                    size={14}
                    color={designColors.success[600]}
                  />
                  <Text style={styles.benefitText}>20 tarif/hafta limit</Text>
                </View>
                <View style={styles.benefitItem}>
                  <Ionicons
                    name='checkmark-circle'
                    size={14}
                    color={designColors.success[600]}
                  />
                  <Text style={styles.benefitText}>Gelişmiş AI önerileri</Text>
                </View>
                <Text style={styles.planNote}>Esnek deneme için</Text>
              </TouchableOpacity>

              <View style={styles.vsIcon}>
                <Text style={styles.vsText}>VS</Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.monthlyColumn,
                  selectedPackage?.identifier
                    .toLowerCase()
                    .includes('monthly') && styles.selectedPlanCard,
                ]}
                onPress={() => {
                  const monthlyPackage = offerings
                    .flatMap(o => o.availablePackages)
                    .find(p => p.identifier.toLowerCase().includes('monthly'));
                  if (monthlyPackage) setSelectedPackage(monthlyPackage);
                }}
              >
                <View style={styles.monthlyHeaderWrapper}>
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularText}>POPÜLER</Text>
                  </View>
                  <View style={styles.monthlyHeader}>
                    <Ionicons
                      name='diamond'
                      size={20}
                      color={designColors.primary[600]}
                    />
                    <Text style={styles.monthlyTitle}>Aylık Plan</Text>
                    {selectedPackage?.identifier
                      .toLowerCase()
                      .includes('monthly') && (
                      <View style={styles.selectedIndicator}>
                        <Ionicons
                          name='checkmark-circle'
                          size={20}
                          color={designColors.primary[600]}
                        />
                      </View>
                    )}
                  </View>
                </View>
                <View style={styles.priceRow}>
                  <Text style={styles.monthlyPrice}>
                    {offerings.length > 0
                      ? offerings
                          .flatMap(o => o.availablePackages)
                          .find(p =>
                            p.identifier.toLowerCase().includes('monthly')
                          )?.product.priceString || '₺19.99'
                      : '₺19.99'}
                  </Text>
                  <Text style={styles.pricePeriod}>/ay</Text>
                </View>
                <View style={styles.benefitItem}>
                  <Ionicons
                    name='checkmark-circle'
                    size={14}
                    color={designColors.success[600]}
                  />
                  <Text style={styles.benefitText}>10 tarif/gün</Text>
                </View>
                <View style={styles.benefitItem}>
                  <Ionicons
                    name='checkmark-circle'
                    size={14}
                    color={designColors.success[600]}
                  />
                  <Text style={styles.benefitText}>150 tarif/ay limit</Text>
                </View>
                <View style={styles.benefitItem}>
                  <Ionicons
                    name='checkmark-circle'
                    size={14}
                    color={designColors.success[600]}
                  />
                  <Text style={styles.benefitText}>Gelişmiş AI önerileri</Text>
                </View>
                <View style={styles.benefitItem}>
                  <Ionicons
                    name='checkmark-circle'
                    size={14}
                    color={designColors.success[600]}
                  />
                  <Text style={styles.benefitText}>Tüm filtreler</Text>
                </View>
                <Text style={styles.planNote}>En çok tercih edilen</Text>
              </TouchableOpacity>
            </View>

            {/* Plan Details */}
            <View style={styles.planDetailsSection}>
              <Text style={styles.detailsTitle}>Premium Avantajları</Text>
              <View style={styles.detailsGrid}>
                <View style={styles.detailItem}>
                  <Ionicons
                    name='restaurant'
                    size={16}
                    color={designColors.primary[600]}
                  />
                  <Text style={styles.detailText}>
                    Günlük 10 tarif üretimi (Free: sadece 1)
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Ionicons
                    name='calendar'
                    size={16}
                    color={designColors.primary[600]}
                  />
                  <Text style={styles.detailText}>
                    Haftalık: 20 tarif, Aylık: 150 tarif limiti
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Ionicons
                    name='sparkles'
                    size={16}
                    color={designColors.primary[600]}
                  />
                  <Text style={styles.detailText}>
                    Gelişmiş AI algoritması ve kişisel öneriler
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Ionicons
                    name='filter'
                    size={16}
                    color={designColors.primary[600]}
                  />
                  <Text style={styles.detailText}>
                    Tüm beslenme filtreleri (vegan, glutensiz, vb.)
                  </Text>
                </View>
                <View style={styles.detailItem}>
                  <Ionicons
                    name='headset'
                    size={16}
                    color={designColors.primary[600]}
                  />
                  <Text style={styles.detailText}>
                    Öncelikli müşteri desteği
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Sticky CTA Footer */}
        <View style={styles.footer}>
          {selectedPackage && (
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <TouchableOpacity
                onPress={handlePurchase}
                disabled={purchasing || restoring}
                style={[
                  styles.ctaButton,
                  purchasing && styles.ctaButtonDisabled,
                ]}
              >
                <LinearGradient
                  colors={[
                    designColors.primary[500],
                    designColors.primary[600],
                  ]}
                  style={styles.ctaGradient}
                >
                  {purchasing ? (
                    <View style={styles.ctaContent}>
                      <ActivityIndicator size={20} color='white' />
                      <Text style={styles.ctaText}>İşleniyor...</Text>
                    </View>
                  ) : (
                    <View style={styles.ctaContent}>
                      <Ionicons name='rocket' size={20} color='white' />
                      <Text style={styles.ctaText}>Premium'a Başla!</Text>
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          )}

          <TouchableOpacity
            onPress={handleRestorePurchases}
            disabled={restoring || purchasing}
            style={styles.restoreButton}
          >
            <Text style={styles.restoreText}>
              {restoring ? 'Geri yükleniyor...' : 'Satın Almaları Geri Yükle'}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
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
      shadowRadius: 12,
      elevation: 20,
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
    content: {
      flex: 1,
    },
    closeButton: {
      position: 'absolute',
      right: 16,
      top: 16,
      padding: 8,
      borderRadius: 20,
      backgroundColor: 'rgba(0,0,0,0.05)',
      zIndex: 1000,
    },

    // Header
    headerGradient: {
      paddingHorizontal: 20,
      paddingVertical: 16,
      paddingTop: 30,
      alignItems: 'center',
    },
    headerContent: {
      alignItems: 'center',
    },
    iconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: '900',
      color: 'white',
      marginBottom: 4,
      textAlign: 'center',
    },
    headerSubtitle: {
      fontSize: 13,
      color: 'rgba(255,255,255,0.9)',
      textAlign: 'center',
    },

    // Comparison Section
    comparisonSection: {
      padding: 20,
      backgroundColor: '#F8FAFC',
    },
    comparisonTitle: {
      fontSize: 20,
      fontWeight: '800',
      color: '#1A1A1A',
      textAlign: 'center',
      marginBottom: 20,
    },
    comparisonRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 24,
    },
    weeklyColumn: {
      flex: 1,
      backgroundColor: 'white',
      borderRadius: 16,
      padding: 16,
      borderWidth: 2,
      borderColor: designColors.secondary[300],
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
      minHeight: 200,
    },
    monthlyColumn: {
      flex: 1,
      backgroundColor: designColors.primary[50],
      borderRadius: 16,
      padding: 16,
      borderWidth: 2,
      borderColor: designColors.primary[400],
      position: 'relative',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
      minHeight: 200,
    },
    selectedPlanCard: {
      borderColor: designColors.primary[600],
      borderWidth: 3,
      backgroundColor: designColors.primary[100],
      shadowOpacity: 0.2,
      elevation: 6,
    },
    selectedIndicator: {
      position: 'absolute',
      right: 8,
      top: 8,
    },
    vsIcon: {
      marginHorizontal: 16,
      marginTop: 20,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: designColors.warning[500],
      alignItems: 'center',
      justifyContent: 'center',
    },
    vsText: {
      fontSize: 12,
      fontWeight: '800',
      color: 'white',
    },
    weeklyHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    weeklyTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: designColors.secondary[700],
      marginLeft: 6,
    },
    monthlyHeaderWrapper: {
      position: 'relative',
      marginBottom: 8,
    },
    monthlyHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    monthlyTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: designColors.primary[700],
      marginLeft: 6,
    },
    popularBadge: {
      position: 'absolute',
      right: -12,
      top: -12,
      backgroundColor: designColors.warning[500],
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 3,
      zIndex: 1,
    },
    popularText: {
      fontSize: 9,
      fontWeight: '800',
      color: 'white',
      letterSpacing: 0.5,
    },
    priceRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      marginBottom: 12,
    },
    weeklyPrice: {
      fontSize: 20,
      fontWeight: '900',
      color: designColors.secondary[600],
    },
    monthlyPrice: {
      fontSize: 20,
      fontWeight: '900',
      color: designColors.primary[600],
    },
    pricePeriod: {
      fontSize: 12,
      color: '#666',
      marginLeft: 2,
    },
    benefitItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6,
    },
    benefitText: {
      fontSize: 11,
      color: designColors.success[700],
      marginLeft: 6,
      fontWeight: '600',
      flex: 1,
    },
    planNote: {
      fontSize: 10,
      color: '#666',
      fontStyle: 'italic',
      textAlign: 'center',
      marginTop: 8,
    },
    planDetailsSection: {
      backgroundColor: 'white',
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: '#E5E7EB',
    },
    detailsTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: '#1A1A1A',
      marginBottom: 12,
      textAlign: 'center',
    },
    detailsGrid: {
      gap: 10,
    },
    detailItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 4,
    },
    detailText: {
      fontSize: 13,
      color: '#374151',
      marginLeft: 8,
      flex: 1,
      lineHeight: 18,
    },

    // Packages Section
    packagesSection: {
      padding: 20,
    },
    packagesTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: '#1A1A1A',
      textAlign: 'center',
      marginBottom: 20,
    },
    packagesContainer: {
      gap: 12,
    },
    packageCard: {
      backgroundColor: 'white',
      borderRadius: 16,
      borderWidth: 2,
      borderColor: '#E5E7EB',
      position: 'relative',
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    selectedPackageCard: {
      borderColor: designColors.primary[500],
      backgroundColor: designColors.primary[50],
    },
    popularPackageCard: {
      borderColor: designColors.warning[400],
      backgroundColor: '#FFFBEB',
    },
    discountBadge: {
      position: 'absolute',
      top: 0,
      right: 0,
      backgroundColor: designColors.warning[500],
      paddingHorizontal: 16,
      paddingVertical: 6,
      borderBottomLeftRadius: 16,
    },
    discountText: {
      fontSize: 11,
      fontWeight: '800',
      color: 'white',
      letterSpacing: 0.5,
    },
    packageContent: {
      padding: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    packageLeft: {
      flex: 1,
    },
    packageTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: '#1A1A1A',
      marginBottom: 4,
    },
    packagePrice: {
      fontSize: 24,
      fontWeight: '900',
      color: designColors.primary[600],
      marginBottom: 4,
    },
    savingsText: {
      fontSize: 13,
      fontWeight: '600',
      color: designColors.warning[600],
    },
    selectionIndicator: {
      marginLeft: 16,
    },
    selectedCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: designColors.primary[600],
      alignItems: 'center',
      justifyContent: 'center',
    },
    unselectedCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: '#CCC',
    },

    // Social Proof
    socialProofSection: {
      padding: 20,
      backgroundColor: '#F8FAFC',
    },
    socialProofRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
    },
    socialProofItem: {
      alignItems: 'center',
    },
    socialProofNumber: {
      fontSize: 18,
      fontWeight: '800',
      color: designColors.primary[600],
    },
    socialProofLabel: {
      fontSize: 12,
      color: '#666',
      marginTop: 2,
    },

    // Footer
    footer: {
      padding: 16,
      paddingBottom: 20,
      backgroundColor: 'white',
      borderTopWidth: 1,
      borderTopColor: '#F1F5F9',
    },
    ctaButton: {
      marginBottom: 12,
      borderRadius: 16,
      overflow: 'hidden',
      shadowColor: designColors.primary[600],
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 12,
      elevation: 8,
    },
    ctaButtonDisabled: {
      opacity: 0.7,
    },
    ctaGradient: {
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ctaContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    ctaText: {
      fontSize: 18,
      fontWeight: '800',
      color: 'white',
    },
    restoreButton: {
      alignItems: 'center',
      paddingVertical: 8,
      marginBottom: 8,
    },
    restoreText: {
      fontSize: 14,
      fontWeight: '500',
      color: designColors.primary[600],
    },
    guaranteeSection: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    guaranteeText: {
      fontSize: 12,
      color: designColors.success[600],
      fontWeight: '600',
    },
  });
