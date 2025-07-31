import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';

// UI Components
import { Button, Card, Text } from '../components/ui';
import { colors, spacing, borderRadius } from '../theme/design-tokens';
import { usePremium } from '../contexts/PremiumContext';

interface PremiumScreenProps {
  navigation: StackNavigationProp<any>;
}

const PremiumScreen: React.FC<PremiumScreenProps> = ({ navigation }) => {
  const { isPremium, isLoading, purchasePremium, restorePurchases } = usePremium();
  const [isProcessing, setIsProcessing] = useState(false);

  // Eğer zaten premium ise geri dön
  useEffect(() => {
    if (isPremium && !isLoading) {
      navigation.goBack();
    }
  }, [isPremium, isLoading]);

  const handlePurchase = async () => {
    try {
      setIsProcessing(true);
      
      const success = await purchasePremium();
      
      if (success) {
        Alert.alert(
          '🎉 Tebrikler!',
          'Premium üyeliğiniz aktifleştirildi. Artık sınırsız favori tarif ekleyebilirsiniz!',
          [
            {
              text: 'Harika!',
              onPress: () => navigation.goBack(),
            }
          ]
        );
      } else {
        Alert.alert(
          '❌ Satın Alma Başarısız',
          'Satın alma işlemi tamamlanamadı. Lütfen tekrar deneyiniz.',
          [{ text: 'Tamam' }]
        );
      }
    } catch (error) {
      Alert.alert(
        '❌ Hata',
        'Bir hata oluştu. Lütfen daha sonra tekrar deneyiniz.',
        [{ text: 'Tamam' }]
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestore = async () => {
    try {
      setIsProcessing(true);
      
      const success = await restorePurchases();
      
      if (success) {
        Alert.alert(
          '✅ Satın Alımlar Geri Yüklendi',
          'Premium üyeliğiniz başarıyla geri yüklendi!',
          [
            {
              text: 'Harika!',
              onPress: () => navigation.goBack(),
            }
          ]
        );
      } else {
        Alert.alert(
          'ℹ️ Satın Alım Bulunamadı',
          'Bu hesapta premium üyelik bulunamadı.',
          [{ text: 'Tamam' }]
        );
      }
    } catch (error) {
      Alert.alert(
        '❌ Hata',
        'Satın alımlar geri yüklenirken hata oluştu.',
        [{ text: 'Tamam' }]
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const premiumFeatures = [
    {
      icon: 'heart',
      title: 'Sınırsız Favori Tarifler',
      description: 'İstediğiniz kadar tarifi favorilerinize ekleyin',
      color: colors.destructive[500],
    },
    {
      icon: 'folder',
      title: 'Özel Koleksiyonlar',
      description: 'Tariflerinizi kategorilere göre organize edin',
      color: colors.primary[500],
    },
    {
      icon: 'sparkles',
      title: 'Premium Tarif Önerileri',
      description: 'Size özel gelişmiş algoritma ile tarif önerileri',
      color: colors.warning[500],
    },
    {
      icon: 'flash',
      title: 'Gelişmiş Filtreleme',
      description: 'Daha detaylı arama ve filtreleme seçenekleri',
      color: colors.success[500],
    },
    {
      icon: 'sync',
      title: 'Bulut Senkronizasyonu',
      description: 'Verileriniz tüm cihazlarınızda senkronize',
      color: colors.info[500],
    },
    {
      icon: 'remove-circle',
      title: 'Reklamsız Deneyim',
      description: 'Hiç reklam görmeden kullanın',
      color: colors.neutral[600],
    },
  ];

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text variant="body" color="secondary" style={styles.loadingText}>
            Premium durumu kontrol ediliyor...
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
          <View style={styles.closeButtonContainer}>
            <Button
              variant="ghost"
              size="sm"
              onPress={() => navigation.goBack()}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={colors.neutral[600]} />
            </Button>
          </View>
          
          <View style={styles.headerContent}>
            <View style={styles.premiumBadge}>
              <Ionicons name="crown" size={32} color={colors.warning[600]} />
            </View>
            <Text variant="h1" weight="bold" align="center" color="primary">
              Premium'a Yükseltin
            </Text>
            <Text variant="body" align="center" color="secondary" style={styles.headerSubtitle}>
              Yemek Bulucu'nun tüm özelliklerinin keyfini çıkarın
            </Text>
          </View>
        </View>

        {/* Pricing Card */}
        <Card variant="elevated" size="lg" style={styles.pricingCard}>
          <View style={styles.pricingContent}>
            <View style={styles.priceContainer}>
              <Text variant="h2" weight="bold" color="primary">
                ₺29,99
              </Text>
              <Text variant="body" color="secondary">
                /ay
              </Text>
            </View>
            
            <View style={styles.trialInfo}>
              <Ionicons name="gift" size={20} color={colors.success[500]} />
              <Text variant="body" weight="semibold" color="success">
                İlk 3 gün ücretsiz!
              </Text>
            </View>
            
            <Text variant="caption" color="secondary" align="center" style={styles.renewalInfo}>
              İstediğiniz zaman iptal edebilirsiniz. Otomatik yenilenir.
            </Text>
          </View>
        </Card>

        {/* Features */}
        <View style={styles.featuresContainer}>
          <Text variant="h3" weight="semibold" style={styles.featuresTitle}>
            Premium Özellikler
          </Text>
          
          {premiumFeatures.map((feature, index) => (
            <Card key={index} variant="default" size="md" style={styles.featureCard}>
              <View style={styles.featureContent}>
                <View style={[styles.featureIcon, { backgroundColor: `${feature.color}20` }]}>
                  <Ionicons name={feature.icon as any} size={24} color={feature.color} />
                </View>
                
                <View style={styles.featureText}>
                  <Text variant="bodyLarge" weight="semibold" color="primary">
                    {feature.title}
                  </Text>
                  <Text variant="body" color="secondary">
                    {feature.description}
                  </Text>
                </View>
              </View>
            </Card>
          ))}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <Button
            variant="primary"
            size="lg"
            onPress={handlePurchase}
            disabled={isProcessing}
            fullWidth
            leftIcon={
              isProcessing ? (
                <ActivityIndicator size={20} color={colors.neutral[0]} />
              ) : (
                <Ionicons name="crown" size={20} />
              )
            }
            style={styles.purchaseButton}
          >
            {isProcessing ? 'İşlem yapılıyor...' : '👑 Premium'a Başla'}
          </Button>

          <Button
            variant="ghost"
            size="md"
            onPress={handleRestore}
            disabled={isProcessing}
            style={styles.restoreButton}
          >
            Satın Alımları Geri Yükle
          </Button>
        </View>

        {/* Legal Info */}
        <View style={styles.legalContainer}>
          <Text variant="caption" color="secondary" align="center" style={styles.legalText}>
            Satın alma işlemi ile{' '}
            <Text variant="caption" weight="semibold" color="primary">
              Kullanım Şartları
            </Text>
            {' '}ve{' '}
            <Text variant="caption" weight="semibold" color="primary">
              Gizlilik Politikası
            </Text>
            'nı kabul etmiş olursunuz.
          </Text>
        </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[4],
  },
  loadingText: {
    marginTop: spacing[2],
  },
  header: {
    padding: spacing[4],
    paddingBottom: spacing[6],
  },
  closeButtonContainer: {
    alignItems: 'flex-end',
    marginBottom: spacing[4],
  },
  closeButton: {
    padding: spacing[2],
  },
  headerContent: {
    alignItems: 'center',
    gap: spacing[3],
  },
  premiumBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.warning[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[2],
  },
  headerSubtitle: {
    lineHeight: 22,
    maxWidth: 280,
  },
  pricingCard: {
    margin: spacing[4],
    marginTop: 0,
  },
  pricingContent: {
    alignItems: 'center',
    gap: spacing[3],
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing[1],
  },
  trialInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    backgroundColor: colors.success[50],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: borderRadius.full,
  },
  renewalInfo: {
    lineHeight: 18,
    maxWidth: 250,
  },
  featuresContainer: {
    padding: spacing[4],
    paddingTop: spacing[2],
  },
  featuresTitle: {
    marginBottom: spacing[4],
  },
  featureCard: {
    marginBottom: spacing[3],
  },
  featureContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[4],
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
    gap: spacing[1],
  },
  actionContainer: {
    padding: spacing[4],
    gap: spacing[3],
  },
  purchaseButton: {
    elevation: 4,
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  restoreButton: {
    alignSelf: 'center',
  },
  legalContainer: {
    padding: spacing[4],
    paddingTop: spacing[2],
  },
  legalText: {
    lineHeight: 16,
    maxWidth: 300,
  },
});

export default PremiumScreen; 