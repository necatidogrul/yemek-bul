import React, { useState } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// UI Components
import { Text, Button, Card } from '../ui';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { spacing, borderRadius, shadows } from '../../theme/design-tokens';

// Types & Services
import { CREDIT_PACKAGES } from '../../types/Credit';
import { PREMIUM_TIERS } from '../../types/Premium';

interface CreditUpgradeModalProps {
  visible: boolean;
  onClose: () => void;
  onPurchaseCredits: (packageId: string) => Promise<void>;
  onUpgradePremium: (tierId: string, yearly?: boolean) => Promise<void>;
  trigger?: 'ai_limit' | 'search_limit' | 'recipe_limit' | 'favorites_blocked' | 'general';
  userId: string;
}

export const CreditUpgradeModal: React.FC<CreditUpgradeModalProps> = ({
  visible,
  onClose,
  onPurchaseCredits,
  onUpgradePremium,
  trigger = 'general',
}) => {
  const { colors } = useThemedStyles();
  const [activeTab, setActiveTab] = useState<'credits' | 'premium'>('credits');
  const [loading, setLoading] = useState<string | null>(null);

  const getTriggerContent = () => {
    switch (trigger) {
      case 'ai_limit':
        return {
          title: '🤖 AI Tarif Hakkın Bitti!',
          subtitle: 'Daha fazla AI tarif için kredi al',
          description: 'Yapay zeka ile özel tarifler oluşturmaya devam et',
          icon: 'sparkles',
          primaryColor: colors.primary[500],
        };
      case 'search_limit':
        return {
          title: '🔍 Günlük Arama Sınırı!',
          subtitle: 'Daha fazla arama yapmak için',
          description: 'Bugün 5 arama hakkını kullandın',
          icon: 'search',
          primaryColor: colors.warning[500],
        };
      case 'recipe_limit':
        return {
          title: '👀 Tarif Görüntüleme Sınırı!',
          subtitle: 'Daha fazla tarif görmek için',
          description: 'Bugün 5 tarif görüntüleme hakkını kullandın',
          icon: 'eye',
          primaryColor: colors.info[500],
        };
      case 'favorites_blocked':
        return {
          title: '❤️ Favoriler Premium Özellik!',
          subtitle: 'Tarifleri kaydetmek için',
          description: 'Favori tariflerini saklamak için premium gerekli',
          icon: 'heart',
          primaryColor: colors.error[500],
        };
      default:
        return {
          title: '🚀 Daha Fazla Özellik!',
          subtitle: "Yemek Bulucu'nun tüm gücünü keşfet",
          description: 'Premium özelliklere erişim sağla',
          icon: 'rocket',
          primaryColor: colors.primary[500],
        };
    }
  };

  const content = getTriggerContent();

  const handleCreditPurchase = async (packageId: string) => {
    try {
      setLoading(packageId);
      await onPurchaseCredits(packageId);
      onClose();
    } catch (error) {
      Alert.alert('Hata', 'Satın alma işlemi başarısız oldu');
    } finally {
      setLoading(null);
    }
  };

  const handlePremiumUpgrade = async (tierId: string, yearly = false) => {
    try {
      setLoading(tierId + (yearly ? '_yearly' : '_monthly'));
      await onUpgradePremium(tierId, yearly);
      onClose();
    } catch (error) {
      Alert.alert('Hata', 'Abonelik işlemi başarısız oldu');
    } finally {
      setLoading(null);
    }
  };

  const renderCreditPackages = () => (
    <View style={styles.packageGrid}>
      {CREDIT_PACKAGES.map((pkg, index) => (
        <Card
          key={pkg.id}
          variant="elevated"
          style={[
            styles.packageCard,
            pkg.popular ? styles.popularCard : {},
            {
              borderColor: pkg.popular ? colors.success[300] : colors.border.medium,
            },
          ]}
        >
          {pkg.popular && (
            <View style={[styles.popularBadge, { backgroundColor: colors.success[500] }]}>
              <Text variant="caption" weight="bold" style={{ color: 'white' }}>
                EN POPÜLER
              </Text>
            </View>
          )}

          <View style={styles.packageHeader}>
            <Text variant="h6" weight="bold" style={{ color: colors.text.primary }}>
              {pkg.name}
            </Text>
            <Text variant="body" style={{ color: colors.text.secondary }}>
              {pkg.credits} {pkg.bonusCredits && `+${pkg.bonusCredits}`} kredi
            </Text>
          </View>

          <View style={styles.priceContainer}>
            <Text variant="h4" weight="bold" style={{ color: content.primaryColor }}>
              ₺{pkg.price}
            </Text>
            <Text variant="caption" style={{ color: colors.text.secondary }}>
              ≈ ₺{(pkg.price / (pkg.credits + (pkg.bonusCredits || 0))).toFixed(1)}
              /kredi
            </Text>
            {pkg.bonusCredits && (
              <Text variant="caption" style={{ color: colors.success[600] }}>
                +{pkg.bonusCredits} bonus kredi!
              </Text>
            )}
          </View>

          <Text
            variant="caption"
            align="center"
            style={{
              color: colors.text.secondary,
              marginVertical: spacing[2],
            }}
          >
            {pkg.description}
          </Text>

          <Button
            variant="primary"
            size="sm"
            onPress={() => handleCreditPurchase(pkg.id)}
            loading={loading === pkg.id}
            style={{ marginTop: 'auto' }}
          >
            Kredi Al
          </Button>
        </Card>
      ))}
    </View>
  );

  const renderPremiumTiers = () => (
    <View style={styles.premiumContainer}>
      {PREMIUM_TIERS.map(tier => (
        <Card
          key={tier.id}
          variant="elevated"
          style={[
            styles.premiumCard,
            tier.popular ? styles.popularCard : {},
            {
              borderColor: tier.popular ? colors.primary[300] : colors.border.medium,
            },
          ]}
        >
          {tier.popular && (
            <View style={[styles.popularBadge, { backgroundColor: colors.primary[500] }]}>
              <Text variant="caption" weight="bold" style={{ color: 'white' }}>
                ÖNERİLEN
              </Text>
            </View>
          )}

          <View style={styles.tierHeader}>
            <Text variant="body" style={{ fontSize: 24 }}>
              {tier.badge}
            </Text>
            <View>
              <Text variant="h6" weight="bold" style={{ color: colors.text.primary }}>
                {tier.name}
              </Text>
              <Text variant="caption" style={{ color: colors.text.secondary }}>
                {tier.description}
              </Text>
            </View>
          </View>

          <View style={styles.premiumPricing}>
            <View style={styles.pricingOption}>
              <Text variant="h5" weight="bold" style={{ color: colors.primary[600] }}>
                ₺{tier.monthlyPrice}/ay
              </Text>
              <Button
                variant="outline"
                size="sm"
                onPress={() => handlePremiumUpgrade(tier.id, false)}
                loading={loading === tier.id + '_monthly'}
              >
                Aylık
              </Button>
            </View>

            {tier.yearlyPrice && (
              <View style={styles.pricingOption}>
                <View>
                  <Text variant="h5" weight="bold" style={{ color: colors.success[600] }}>
                    ₺{tier.yearlyPrice}/yıl
                  </Text>
                  <Text variant="caption" style={{ color: colors.success[600] }}>
                    2 ay ücretsiz!
                  </Text>
                </View>
                <Button
                  variant="primary"
                  size="sm"
                  onPress={() => handlePremiumUpgrade(tier.id, true)}
                  loading={loading === tier.id + '_yearly'}
                >
                  Yıllık
                </Button>
              </View>
            )}
          </View>

          <View style={styles.featuresList}>
            {tier.features.slice(0, 3).map(feature => (
              <View key={feature.id} style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success[500]} />
                <Text
                  variant="caption"
                  style={{
                    color: colors.text.secondary,
                    flex: 1,
                    marginLeft: spacing[2],
                  }}
                >
                  {feature.name}
                </Text>
              </View>
            ))}
          </View>
        </Card>
      ))}
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border.medium }]}>
          <View style={styles.headerContent}>
            <LinearGradient
              colors={[content.primaryColor + '20', content.primaryColor + '10']}
              style={styles.headerIcon}
            >
              <Ionicons name={content.icon as any} size={24} color={content.primaryColor} />
            </LinearGradient>

            <View style={styles.headerText}>
              <Text variant="h5" weight="bold" style={{ color: colors.text.primary }}>
                {content.title}
              </Text>
              <Text variant="body" style={{ color: colors.text.secondary }}>
                {content.subtitle}
              </Text>
            </View>
          </View>

          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>

        {/* Tab Navigation */}
        <View style={[styles.tabContainer, { backgroundColor: colors.surface.secondary }]}>
          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'credits' && {
                backgroundColor: colors.primary[500],
              },
            ]}
            onPress={() => setActiveTab('credits')}
          >
            <Text
              variant="bodySmall"
              weight="medium"
              style={{
                color: activeTab === 'credits' ? 'white' : colors.text.secondary,
              }}
            >
              💎 Kredi Paketleri
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.tab,
              activeTab === 'premium' && {
                backgroundColor: colors.primary[500],
              },
            ]}
            onPress={() => setActiveTab('premium')}
          >
            <Text
              variant="bodySmall"
              weight="medium"
              style={{
                color: activeTab === 'premium' ? 'white' : colors.text.secondary,
              }}
            >
              🚀 Premium Abonelik
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text
            variant="body"
            align="center"
            style={{
              color: colors.text.secondary,
              marginBottom: spacing[6],
              paddingHorizontal: spacing[4],
            }}
          >
            {content.description}
          </Text>

          {activeTab === 'credits' ? renderCreditPackages() : renderPremiumTiers()}

          <View style={styles.bottomSpacing} />
        </ScrollView>
      </View>
    </Modal>
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
    paddingVertical: spacing[4],
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  headerText: {
    flex: 1,
  },
  closeButton: {
    padding: spacing[2],
  },
  tabContainer: {
    flexDirection: 'row',
    margin: spacing[4],
    borderRadius: borderRadius.lg,
    padding: spacing[1],
  },
  tab: {
    flex: 1,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing[4],
  },
  packageGrid: {
    gap: spacing[4],
  },
  packageCard: {
    padding: spacing[4],
    borderWidth: 2,
    position: 'relative',
  },
  popularCard: {
    borderWidth: 2,
    ...shadows.md,
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    left: spacing[4],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: borderRadius.full,
    zIndex: 1,
  },
  packageHeader: {
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  priceContainer: {
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  premiumContainer: {
    gap: spacing[4],
  },
  premiumCard: {
    padding: spacing[4],
    borderWidth: 2,
    position: 'relative',
  },
  tierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[4],
    gap: spacing[3],
  },
  premiumPricing: {
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  pricingOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[2],
  },
  featuresList: {
    gap: spacing[2],
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bottomSpacing: {
    height: spacing[8],
  },
});

export default CreditUpgradeModal;
