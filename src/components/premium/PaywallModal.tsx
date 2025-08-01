import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Text } from '../ui';
import { colors, spacing, borderRadius } from '../../theme/design-tokens';
import { usePremium } from '../../contexts/PremiumContext';
import UsageLimitService from '../../services/UsageLimitService';

const { width, height } = Dimensions.get('window');

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  feature: 'recipe_limit' | 'search_limit' | 'favorites' | 'ai_chat' | 'filters' | 'general';
  title?: string;
  description?: string;
}

const FEATURE_CONTENT = {
  recipe_limit: {
    title: '📖 Günlük Tarif Limitiniz Doldu',
    description: 'Bugün için ücretsiz tarif görüntüleme hakkınız bitti. Premium ile sınırsız tarif keşfedin!',
    icon: '📚',
  },
  search_limit: {
    title: '🔍 Günlük Arama Limitiniz Doldu', 
    description: 'Bugün için ücretsiz arama hakkınız bitti. Premium ile sınırsız arama yapın!',
    icon: '🔎',
  },
  favorites: {
    title: '❤️ Favoriler Premium Özellik',
    description: 'Sevdiğiniz tarifleri favorilere almak ve koleksiyonlar oluşturmak premium özelliğidir.',
    icon: '⭐',
  },
  ai_chat: {
    title: '🤖 AI Yemek Asistanı Premium',
    description: 'AI asistanımızla sohbet edip kişisel tarif önerileri almak premium özelliğidir.',
    icon: '🧠',
  },
  filters: {
    title: '🔍 Gelişmiş Filtreler Premium',
    description: 'Diyet, alerji ve zorluk seviyesine göre detaylı filtreleme premium özelliğidir.',
    icon: '⚙️',
  },
  general: {
    title: '👑 Premium\'a Geçin',
    description: 'Yemek Bulucu\'nun tüm özelliklerinin keyfini çıkarın!',
    icon: '🌟',
  },
};

const PaywallModal: React.FC<PaywallModalProps> = ({
  visible,
  onClose,
  feature,
  title,
  description,
}) => {
  const { 
    isPremium, 
    purchasePremium, 
    isLoading, 
    availableOfferings,
    isInFreeTrial,
    subscriptionInfo 
  } = usePremium();
  const [isProcessing, setIsProcessing] = useState(false);
  const [usageStats, setUsageStats] = useState<any>(null);
  const [timeUntilReset, setTimeUntilReset] = useState('');
  const [selectedPackage, setSelectedPackage] = useState<string | undefined>();

  const content = FEATURE_CONTENT[feature];
  const displayTitle = title || content.title;
  const displayDescription = description || content.description;

  useEffect(() => {
    if (visible) {
      loadUsageStats();
      updateTimeUntilReset();
      const interval = setInterval(updateTimeUntilReset, 60000); // Update every minute
      return () => clearInterval(interval);
    }
  }, [visible]);

  const loadUsageStats = async () => {
    try {
      const stats = await UsageLimitService.getUsageStats(isPremium);
      setUsageStats(stats);
    } catch (error) {
      console.error('Error loading usage stats:', error);
    }
  };

  const updateTimeUntilReset = () => {
    const time = UsageLimitService.getTimeUntilReset();
    setTimeUntilReset(time);
  };

  const handlePurchase = async () => {
    try {
      setIsProcessing(true);
      const success = await purchasePremium(selectedPackage);
      
      if (success) {
        onClose();
      }
    } catch (error) {
      console.error('Purchase error:', error);
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Get best package to display (monthly by default)
  const getBestPackage = () => {
    if (availableOfferings.length === 0) return null;
    
    const packages = availableOfferings[0].packages;
    const monthlyPackage = packages.find(pkg => pkg.packageType === 'MONTHLY');
    const yearlyPackage = packages.find(pkg => pkg.packageType === 'ANNUAL');
    
    return monthlyPackage || packages[0] || null;
  };
  
  const bestPackage = getBestPackage();

  const premiumFeatures = [
    {
      icon: 'infinite',
      title: 'Sınırsız Tarif Görüntüleme',
      description: 'İstediğiniz kadar tarif keşfedin',
    },
    {
      icon: 'heart',
      title: 'Favoriler & Koleksiyonlar',
      description: 'Sevdiğiniz tarifleri kaydedin',
    },
    {
      icon: 'chatbubbles',
      title: 'AI Yemek Asistanı',
      description: 'Kişisel tarif önerileri alın',
    },
    {
      icon: 'options',
      title: 'Gelişmiş Filtreler',
      description: 'Diyet ve alerji bazlı arama',
    },
    {
      icon: 'calendar',
      title: 'Menü Planlayıcı',
      description: 'Haftalık menülerinizi planlayın',
    },
    {
      icon: 'remove-circle',
      title: 'Reklamsız Deneyim',
      description: 'Hiç reklam görmeden kullanın',
    },
  ];

  if (isPremium) {
    return null; // Don't show paywall to premium users
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.neutral[600]} />
          </TouchableOpacity>
          
          <View style={styles.headerContent}>
            <Text style={styles.iconText}>{content.icon}</Text>
            <Text variant="h2" weight="bold" align="center" color="primary">
              {displayTitle}
            </Text>
            <Text variant="body" align="center" color="secondary" style={styles.headerDescription}>
              {displayDescription}
            </Text>
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Usage Stats Card */}
          {usageStats && (feature === 'recipe_limit' || feature === 'search_limit') && (
            <Card variant="filled" size="lg" style={styles.usageCard}>
              <View style={styles.usageHeader}>
                <Ionicons name="analytics" size={20} color={colors.warning[600]} />
                <Text variant="bodyLarge" weight="semibold">
                  Bugünkü Kullanımınız
                </Text>
              </View>
              
              <View style={styles.usageStats}>
                <View style={styles.usageStat}>
                  <Text variant="h3" weight="bold" color="primary">
                    {usageStats.recipeViewsUsed}
                  </Text>
                  <Text variant="caption" color="secondary">
                    / {usageStats.recipeViewsLimit} tarif
                  </Text>
                </View>
                
                <View style={styles.usageDivider} />
                
                <View style={styles.usageStat}>
                  <Text variant="h3" weight="bold" color="primary">
                    {usageStats.searchesUsed}
                  </Text>
                  <Text variant="caption" color="secondary">
                    / {usageStats.searchesLimit} arama
                  </Text>
                </View>
              </View>

              <View style={styles.resetInfo}>
                <Ionicons name="time" size={16} color={colors.neutral[500]} />
                <Text variant="caption" color="secondary">
                  Sınırlar {timeUntilReset} sonra yenilenecek
                </Text>
              </View>
            </Card>
          )}

          {/* Pricing Card */}
          {bestPackage && (
            <Card variant="elevated" size="lg" style={styles.pricingCard}>
              {!isInFreeTrial && (
                <View style={styles.pricingBadge}>
                  <Text variant="caption" weight="bold" color="success">
                    🎁 İlk 7 gün ücretsiz!
                  </Text>
                </View>
              )}
              
              <View style={styles.pricingContent}>
                <Text variant="h1" weight="bold" color="primary" align="center">
                  {bestPackage.product.priceString}
                </Text>
                <Text variant="body" color="secondary" align="center">
                  /{bestPackage.packageType === 'MONTHLY' ? 'ay' : 'yıl'} - İstediğin zaman iptal et
                </Text>
                
                {availableOfferings[0].packages.length > 1 && (
                  <View style={styles.packageSelector}>
                    {availableOfferings[0].packages.map((pkg) => (
                      <TouchableOpacity
                        key={pkg.identifier}
                        style={[
                          styles.packageOption,
                          selectedPackage === pkg.identifier && styles.packageOptionSelected
                        ]}
                        onPress={() => setSelectedPackage(pkg.identifier)}
                      >
                        <Text 
                          variant="caption" 
                          color={selectedPackage === pkg.identifier ? "primary-foreground" : "secondary"}
                          weight="semibold"
                        >
                          {pkg.product.priceString}/{pkg.packageType === 'MONTHLY' ? 'ay' : 'yıl'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </Card>
          )}

          {/* Features List */}
          <View style={styles.featuresContainer}>
            <Text variant="h3" weight="semibold" style={styles.featuresTitle}>
              Premium ile Neler Kazanırsın?
            </Text>

            {premiumFeatures.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <Ionicons 
                    name={feature.icon as any} 
                    size={20} 
                    color={colors.primary[500]} 
                  />
                </View>
                <View style={styles.featureContent}>
                  <Text variant="bodyLarge" weight="semibold" color="primary">
                    {feature.title}
                  </Text>
                  <Text variant="body" color="secondary">
                    {feature.description}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <Button
            variant="primary"
            size="lg"
            onPress={handlePurchase}
            disabled={isProcessing || isLoading}
            fullWidth
            leftIcon={
              isProcessing ? (
                <ActivityIndicator size={20} color={colors.neutral[0]} />
              ) : (
                <Ionicons name="diamond" size={20} />
              )
            }
          >
            {isProcessing ? 'İşlem yapılıyor...' : isInFreeTrial ? '👑 Premium Devam Et' : '👑 Premium\'a Başla'}
          </Button>

          <Button
            variant="ghost"
            size="md"
            onPress={onClose}
            style={styles.laterButton}
          >
            Şimdi Değil
          </Button>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    padding: spacing[4],
    paddingBottom: spacing[6],
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: spacing[2],
    marginBottom: spacing[2],
  },
  headerContent: {
    alignItems: 'center',
    gap: spacing[3],
  },
  iconText: {
    fontSize: 48,
    marginBottom: spacing[2],
  },
  headerDescription: {
    lineHeight: 22,
    maxWidth: width - spacing[8],
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing[4],
  },
  usageCard: {
    marginBottom: spacing[4],
    backgroundColor: colors.warning[50],
    borderColor: colors.warning[200],
    borderWidth: 1,
  },
  usageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  usageStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: spacing[3],
  },
  usageStat: {
    alignItems: 'center',
  },
  usageDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.neutral[300],
  },
  resetInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[1],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
  pricingCard: {
    marginBottom: spacing[6],
    alignItems: 'center',
  },
  pricingBadge: {
    backgroundColor: colors.success[100],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
    marginBottom: spacing[4],
  },
  pricingContent: {
    alignItems: 'center',
    gap: spacing[1],
  },
  packageSelector: {
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: spacing[3],
  },
  packageOption: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.neutral[300],
    backgroundColor: colors.neutral[0],
  },
  packageOptionSelected: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[500],
  },
  featuresContainer: {
    marginBottom: spacing[6],
  },
  featuresTitle: {
    marginBottom: spacing[4],
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureContent: {
    flex: 1,
    gap: spacing[1],
  },
  actionContainer: {
    padding: spacing[4],
    gap: spacing[3],
  },
  laterButton: {
    alignSelf: 'center',
  },
});

export default PaywallModal;