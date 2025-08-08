import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Animated,
  Share,
} from "react-native";
import { Logger } from "../services/LoggerService";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { StackNavigationProp } from "@react-navigation/stack";
import * as Haptics from "expo-haptics";

// UI Components
import { Button, Card, Text } from "../components/ui";
import { useTheme, colors } from "../contexts/ThemeContext";
import { spacing, borderRadius } from "../theme/design-tokens";
import { usePremium } from "../contexts/PremiumContext";
import { useToast } from "../contexts/ToastContext";
import { useHaptics } from "../hooks/useHaptics";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

interface PremiumScreenProps {
  navigation: StackNavigationProp<any>;
}

interface PremiumFeature {
  id: string;
  icon: string;
  title: string;
  description: string;
  gradient: string[];
  badge?: string;
}

interface PricingPlan {
  id: string;
  name: string;
  price: string;
  period: string;
  originalPrice?: string;
  discount?: string;
  popular?: boolean;
  features: string[];
}

const PremiumScreen: React.FC<PremiumScreenProps> = ({ navigation }) => {
  const { isPremium, isLoading, purchasePremium, restorePurchases } =
    usePremium();
  const { colors } = useTheme();
  const { showSuccess, showError, showInfo } = useToast();
  const haptics = useHaptics();

  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("monthly");
  const [activeFeature, setActiveFeature] = useState(0);

  const scrollY = useRef(new Animated.Value(0)).current;
  const featureCarouselRef = useRef<ScrollView>(null);
  const planAnimations = useRef({
    monthly: new Animated.Value(1),
    yearly: new Animated.Value(0.95),
  }).current;

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const heroScale = scrollY.interpolate({
    inputRange: [-100, 0],
    outputRange: [1.2, 1],
    extrapolate: "clamp",
  });

  // Premium features data
  const premiumFeatures: PremiumFeature[] = [
    {
      id: "1",
      icon: "infinite",
      title: "Sınırsız AI Tarif Üretimi",
      description:
        "İstediğiniz kadar AI ile tarif oluşturun, kredi sınırı yok!",
      gradient: [colors.primary[500], colors.primary[600]],
      badge: "Popüler",
    },
    {
      id: "2",
      icon: "heart",
      title: "Sınırsız Favori Tarifler",
      description:
        "İstediğiniz kadar tarifi favorilerinize ekleyin ve organize edin",
      gradient: [colors.semantic.error, colors.semantic.error + "CC"],
    },
    {
      id: "3",
      icon: "cloud-upload",
      title: "Bulut Senkronizasyonu",
      description: "Tüm tarifleriniz ve ayarlarınız cihazlar arası senkronize",
      gradient: [colors.secondary[500], colors.secondary[600]],
    },
    {
      id: "4",
      icon: "sparkles",
      title: "Premium Tarif Koleksiyonları",
      description: "Özel şef tariflerine ve premium içeriklere erişim",
      gradient: [colors.accent.gold, colors.accent.gold + "CC"],
      badge: "Yeni",
    },
    {
      id: "5",
      icon: "analytics",
      title: "Gelişmiş Beslenme Analizi",
      description: "Detaylı kalori hesaplama ve beslenme önerileri",
      gradient: [colors.semantic.success, colors.semantic.success + "CC"],
    },
    {
      id: "6",
      icon: "shield-checkmark",
      title: "Reklamsız Premium Deneyim",
      description: "Hiç reklam görmeden kesintisiz kullanım keyfini yaşayın",
      gradient: [colors.semantic.info, colors.semantic.info + "CC"],
    },
  ];

  // Pricing plans
  const pricingPlans: PricingPlan[] = [
    {
      id: "monthly",
      name: "Aylık",
      price: "₺39,99",
      period: "/ay",
      features: [
        "Tüm premium özellikler",
        "7 gün ücretsiz deneme",
        "İstediğin zaman iptal et",
      ],
    },
    {
      id: "yearly",
      name: "Yıllık",
      price: "₺299,99",
      period: "/yıl",
      originalPrice: "₺479,88",
      discount: "%37 İndirim",
      popular: true,
      features: [
        "Tüm premium özellikler",
        "2 ay ücretsiz",
        "En uygun fiyat",
        "Öncelikli destek",
      ],
    },
  ];

  // Auto-scroll feature carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveFeature((prev) => {
        const nextIndex = (prev + 1) % premiumFeatures.length;
        featureCarouselRef.current?.scrollTo({
          x: nextIndex * (screenWidth - 24 * 2),
          animated: true,
        });
        return nextIndex;
      });
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // Plan selection animation
  useEffect(() => {
    Animated.parallel([
      Animated.spring(planAnimations.monthly, {
        toValue: selectedPlan === "monthly" ? 1 : 0.95,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.spring(planAnimations.yearly, {
        toValue: selectedPlan === "yearly" ? 1 : 0.95,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
    ]).start();
  }, [selectedPlan]);

  // Redirect if already premium
  useEffect(() => {
    if (isPremium && !isLoading) {
      showSuccess("Zaten Premium üyesiniz! 🎉");
      navigation.goBack();
    }
  }, [isPremium, isLoading]);

  const handlePurchase = async (planId: string) => {
    try {
      setIsProcessing(true);
      await haptics.success();

      Logger.info(`Starting purchase for plan: ${planId}`);
      const success = await purchasePremium();

      if (success) {
        await haptics.success();
        showSuccess("🎉 Premium üyeliğiniz aktifleştirildi!");
        setTimeout(() => navigation.goBack(), 1500);
      } else {
        await haptics.error();
        showError("Satın alma işlemi tamamlanamadı");
      }
    } catch (error) {
      Logger.error("Purchase failed:", error);
      await haptics.error();
      showError("Bir hata oluştu, tekrar deneyiniz");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestore = async () => {
    try {
      setIsProcessing(true);
      await haptics.selection();

      Logger.info("Starting purchase restoration");
      const success = await restorePurchases();

      if (success) {
        await haptics.success();
        showSuccess("✅ Premium üyeliğiniz geri yüklendi!");
        setTimeout(() => navigation.goBack(), 1500);
      } else {
        showInfo("Bu hesapta premium üyelik bulunamadı");
      }
    } catch (error) {
      Logger.error("Restore failed:", error);
      await haptics.error();
      showError("Satın alımlar geri yüklenirken hata oluştu");
    } finally {
      setIsProcessing(false);
    }
  };

  const shareApp = async () => {
    try {
      await Share.share({
        message:
          "🍽️ Yemek Bulucu Premium ile binlerce tarife erişim sağla!\n\nİndir ve keşfet!",
        title: "Yemek Bulucu Premium",
      });
    } catch (error) {
      Logger.error("Share failed:", error);
    }
  };

  const selectPlan = async (planId: string) => {
    setSelectedPlan(planId);
    await haptics.selection();
  };

  const renderFeatureCarousel = () => (
    <View style={styles.featureCarousel}>
      <ScrollView
        ref={featureCarouselRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(
            event.nativeEvent.contentOffset.x / (screenWidth - 24 * 2)
          );
          setActiveFeature(index);
        }}
        scrollEventThrottle={16}
      >
        {premiumFeatures.map((feature) => (
          <View
            key={feature.id}
            style={[styles.featureSlide, { width: screenWidth - 24 * 2 }]}
          >
            <LinearGradient
              colors={[
                feature.gradient[0],
                feature.gradient[1] || feature.gradient[0],
              ]}
              style={styles.featureCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {feature.badge && (
                <View
                  style={[
                    styles.featureBadge,
                    { backgroundColor: colors.accent.gold },
                  ]}
                >
                  <Text
                    variant="labelSmall"
                    weight="700"
                    style={{ color: "white" }}
                  >
                    {feature.badge}
                  </Text>
                </View>
              )}

              <View style={styles.featureIcon}>
                <Ionicons name={feature.icon as any} size={48} color="white" />
              </View>

              <View style={styles.featureContent}>
                <Text
                  variant="headlineSmall"
                  weight="700"
                  style={{ color: "white", textAlign: "center" }}
                >
                  {feature.title}
                </Text>
                <Text
                  variant="bodyMedium"
                  style={{
                    color: "rgba(255,255,255,0.9)",
                    textAlign: "center",
                    lineHeight: 22,
                  }}
                >
                  {feature.description}
                </Text>
              </View>
            </LinearGradient>
          </View>
        ))}
      </ScrollView>

      {/* Feature Indicators */}
      <View style={styles.featureIndicators}>
        {premiumFeatures.map((_, index) => (
          <View
            key={index}
            style={[
              styles.featureIndicator,
              {
                backgroundColor:
                  activeFeature === index
                    ? colors.primary[500]
                    : colors.neutral[300],
                width: activeFeature === index ? 24 : 8,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );

  const renderPricingPlan = (plan: PricingPlan) => (
    <Animated.View
      key={plan.id}
      style={[
        styles.pricingPlan,
        {
          transform: [
            { scale: planAnimations[plan.id as keyof typeof planAnimations] },
          ],
          backgroundColor:
            selectedPlan === plan.id ? colors.primary[500] : colors.surface,
          borderColor:
            selectedPlan === plan.id
              ? colors.primary[500]
              : colors.neutral[300],
        },
      ]}
    >
      <TouchableOpacity
        style={styles.planContent}
        onPress={() => selectPlan(plan.id)}
        activeOpacity={0.8}
      >
        {plan.popular && (
          <View
            style={[
              styles.popularBadge,
              { backgroundColor: colors.accent.gold },
            ]}
          >
            <Ionicons name="star" size={12} color="white" />
            <Text variant="labelSmall" weight="700" style={{ color: "white" }}>
              En Popüler
            </Text>
          </View>
        )}

        {plan.discount && (
          <View
            style={[
              styles.discountBadge,
              { backgroundColor: colors.semantic.error },
            ]}
          >
            <Text variant="labelSmall" weight="700" style={{ color: "white" }}>
              {plan.discount}
            </Text>
          </View>
        )}

        <View style={styles.planHeader}>
          <Text
            variant="headlineSmall"
            weight="700"
            style={{
              color: selectedPlan === plan.id ? "white" : colors.text.primary,
            }}
          >
            {plan.name}
          </Text>

          <View style={styles.priceContainer}>
            {plan.originalPrice && (
              <Text
                variant="bodyMedium"
                style={{
                  textDecorationLine: "line-through",
                  color:
                    selectedPlan === plan.id
                      ? "rgba(255,255,255,0.7)"
                      : colors.text.secondary,
                }}
              >
                {plan.originalPrice}
              </Text>
            )}
            <View style={styles.currentPrice}>
              <Text
                variant="displaySmall"
                weight="700"
                style={{
                  color:
                    selectedPlan === plan.id ? "white" : colors.primary[600],
                }}
              >
                {plan.price}
              </Text>
              <Text
                variant="bodySmall"
                style={{
                  color:
                    selectedPlan === plan.id
                      ? "rgba(255,255,255,0.8)"
                      : colors.text.secondary,
                }}
              >
                {plan.period}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.planFeatures}>
          {plan.features.map((feature, index) => (
            <View key={index} style={styles.planFeature}>
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={
                  selectedPlan === plan.id ? "white" : colors.semantic.success
                }
              />
              <Text
                variant="bodySmall"
                style={{
                  color:
                    selectedPlan === plan.id
                      ? "rgba(255,255,255,0.9)"
                      : colors.text.secondary,
                  flex: 1,
                }}
              >
                {feature}
              </Text>
            </View>
          ))}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  if (isLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
          <Text
            variant="bodyMedium"
            color="secondary"
            style={{ marginTop: 16 }}
          >
            Premium durumu kontrol ediliyor...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <StatusBar barStyle="light-content" />

      {/* Floating Header */}
      <Animated.View
        style={[
          styles.floatingHeader,
          { opacity: headerOpacity, backgroundColor: colors.background },
        ]}
      >
        <TouchableOpacity
          style={[styles.headerButton, { backgroundColor: colors.surface }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>

        <Text
          variant="headlineSmall"
          weight="600"
          style={{ flex: 1, textAlign: "center" }}
        >
          Premium Üyelik
        </Text>

        <TouchableOpacity
          style={[styles.headerButton, { backgroundColor: colors.surface }]}
          onPress={shareApp}
        >
          <Ionicons
            name="share-outline"
            size={24}
            color={colors.text.primary}
          />
        </TouchableOpacity>
      </Animated.View>

      <Animated.ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {/* Hero Section */}
        <Animated.View
          style={[styles.heroSection, { transform: [{ scale: heroScale }] }]}
        >
          <LinearGradient
            colors={[
              colors.primary[400],
              colors.primary[600],
              colors.secondary[500],
            ]}
            style={styles.heroGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Close Button */}
            <TouchableOpacity
              style={[
                styles.closeButton,
                { backgroundColor: "rgba(0,0,0,0.3)" },
              ]}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>

            {/* Hero Content */}
            <View style={styles.heroContent}>
              <View style={styles.crownContainer}>
                <LinearGradient
                  colors={[colors.accent.gold, colors.accent.gold + "CC"]}
                  style={styles.crownIcon}
                >
                  <Ionicons name="diamond" size={48} color="white" />
                </LinearGradient>
              </View>

              <Text
                variant="displayMedium"
                weight="700"
                style={styles.heroTitle}
              >
                Premium'a{"\n"}Yükseltin
              </Text>

              <Text
                variant="headlineSmall"
                weight="500"
                style={styles.heroSubtitle}
              >
                Sınırsız tarif keşfinin kapılarını açın
              </Text>

              <View style={styles.heroStats}>
                <View style={styles.heroStat}>
                  <Text
                    variant="headlineLarge"
                    weight="700"
                    style={styles.statNumber}
                  >
                    ∞
                  </Text>
                  <Text variant="labelSmall" style={styles.statLabel}>
                    AI Tarif
                  </Text>
                </View>
                <View style={styles.heroStat}>
                  <Text
                    variant="headlineLarge"
                    weight="700"
                    style={styles.statNumber}
                  >
                    ∞
                  </Text>
                  <Text variant="labelSmall" style={styles.statLabel}>
                    Favori
                  </Text>
                </View>
                <View style={styles.heroStat}>
                  <Text
                    variant="headlineLarge"
                    weight="700"
                    style={styles.statNumber}
                  >
                    0
                  </Text>
                  <Text variant="labelSmall" style={styles.statLabel}>
                    Reklam
                  </Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Content Container */}
        <View style={styles.contentContainer}>
          {/* Feature Carousel */}
          <View style={styles.sectionContainer}>
            <Text
              variant="headlineSmall"
              weight="600"
              style={styles.sectionTitle}
            >
              Premium Özellikler
            </Text>
            {renderFeatureCarousel()}
          </View>

          {/* Pricing Plans */}
          <View style={styles.sectionContainer}>
            <Text
              variant="headlineSmall"
              weight="600"
              style={styles.sectionTitle}
            >
              Planınızı Seçin
            </Text>

            <View style={styles.pricingContainer}>
              {pricingPlans.map(renderPricingPlan)}
            </View>

            {/* Trial Info */}
            <View
              style={[
                styles.trialInfo,
                { backgroundColor: colors.semantic.success + "20" },
              ]}
            >
              <Ionicons name="gift" size={20} color={colors.semantic.success} />
              <Text
                variant="bodyMedium"
                weight="600"
                style={{ color: colors.semantic.success }}
              >
                İlk 7 gün ücretsiz deneme!
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionContainer}>
            <Button
              variant="primary"
              size="lg"
              onPress={() => handlePurchase(selectedPlan)}
              disabled={isProcessing}
              fullWidth
              leftIcon={
                isProcessing ? (
                  <ActivityIndicator size={20} color="white" />
                ) : (
                  <Ionicons name="diamond" size={20} color="white" />
                )
              }
              style={StyleSheet.flatten([
                styles.purchaseButton,
                { backgroundColor: colors.primary[500] },
              ])}
            >
              {isProcessing
                ? "İşlem yapılıyor..."
                : `${
                    (
                      pricingPlans.find(
                        (p) => p.id === selectedPlan
                      ) as PricingPlan
                    )?.price
                  } ile Premium'a Başla`}
            </Button>

            <TouchableOpacity
              style={styles.restoreButton}
              onPress={handleRestore}
              disabled={isProcessing}
            >
              <Text variant="labelMedium" weight="500" color="secondary">
                Satın Alımları Geri Yükle
              </Text>
            </TouchableOpacity>
          </View>

          {/* Benefits Summary */}
          <View
            style={[
              styles.benefitsContainer,
              { backgroundColor: colors.primary[50] },
            ]}
          >
            <Text
              variant="labelLarge"
              weight="600"
              style={{ marginBottom: 12, color: colors.primary[700] }}
            >
              Premium ile Neler Kazanıyorsunuz?
            </Text>

            <View style={styles.benefitsList}>
              {[
                "✨ Sınırsız AI tarif üretimi",
                "❤️ Sınırsız favori tarif",
                "☁️ Bulut senkronizasyonu",
                "🎯 Premium tarif koleksiyonları",
                "📊 Detaylı beslenme analizi",
                "🚫 Tamamen reklamsız deneyim",
              ].map((benefit, index) => (
                <Text
                  key={index}
                  variant="bodySmall"
                  style={{
                    color: colors.primary[600],
                    marginBottom: 4,
                  }}
                >
                  {benefit}
                </Text>
              ))}
            </View>
          </View>

          {/* Legal Info */}
          <View style={styles.legalContainer}>
            <Text
              variant="labelSmall"
              color="secondary"
              align="center"
              style={styles.legalText}
            >
              Satın alma işlemi ile{" "}
              <Text
                variant="labelSmall"
                weight="600"
                style={{ color: colors.primary[500] }}
              >
                Kullanım Şartları
              </Text>{" "}
              ve{" "}
              <Text
                variant="labelSmall"
                weight="600"
                style={{ color: colors.primary[500] }}
              >
                Gizlilik Politikası
              </Text>
              'nı kabul etmiş olursunuz.
            </Text>

            <Text
              variant="labelSmall"
              color="secondary"
              align="center"
              style={StyleSheet.flatten([styles.legalText, { marginTop: 8 }])}
            >
              İstediğiniz zaman iptal edebilir, App Store ayarlarınızdan
              yönetebilirsiniz.
            </Text>
          </View>

          {/* Bottom Spacing */}
          <View style={{ height: spacing[64] }} />
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },

  // Floating Header
  floatingHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: StatusBar.currentHeight || 44,
    paddingBottom: 16,
    zIndex: 100,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },

  // Hero Section
  heroSection: {
    height: screenHeight * 0.55,
    position: "relative",
  },
  heroGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  closeButton: {
    position: "absolute",
    top: (StatusBar.currentHeight || 44) + 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  heroContent: {
    alignItems: "center",
    gap: 20,
  },
  crownContainer: {
    marginBottom: 16,
  },
  crownIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  heroTitle: {
    color: "white",
    textAlign: "center",
    lineHeight: 48,
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.9)",
    textAlign: "center",
    maxWidth: 280,
    lineHeight: 28,
  },
  heroStats: {
    flexDirection: "row",
    gap: 24,
    marginTop: 16,
  },
  heroStat: {
    alignItems: "center",
    gap: 8,
  },
  statNumber: {
    color: "white",
  },
  statLabel: {
    color: "rgba(255,255,255,0.8)",
  },

  // Content
  contentContainer: {
    flex: 1,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    marginTop: -20,
    paddingTop: 24,
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    textAlign: "center",
    marginBottom: 20,
    paddingHorizontal: 24,
  },

  // Feature Carousel
  featureCarousel: {
    alignItems: "center",
  },
  featureSlide: {
    paddingHorizontal: 16,
  },
  featureCard: {
    height: 200,
    borderRadius: 12,
    justifyContent: "space-between",
    alignItems: "center",
    padding: 24,
    position: "relative",
    overflow: "hidden",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  featureBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
  },
  featureIcon: {
    marginBottom: 16,
  },
  featureContent: {
    alignItems: "center",
    gap: 12,
  },
  featureIndicators: {
    flexDirection: "row",
    gap: 8,
    marginTop: 20,
  },
  featureIndicator: {
    height: 4,
    borderRadius: 2,
  },

  // Pricing
  pricingContainer: {
    paddingHorizontal: 24,
    gap: 16,
  },
  pricingPlan: {
    borderRadius: 16,
    borderWidth: 2,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    position: "relative",
  },
  planContent: {
    padding: 20,
  },
  popularBadge: {
    position: "absolute",
    top: -1,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    gap: 4,
  },
  discountBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
  },
  planHeader: {
    alignItems: "center",
    marginBottom: 20,
    marginTop: 16,
  },
  priceContainer: {
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  currentPrice: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  planFeatures: {
    gap: 12,
  },
  planFeature: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  // Trial Info
  trialInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginHorizontal: 24,
    marginTop: 20,
    paddingVertical: 16,
    borderRadius: 16,
  },

  // Actions
  actionContainer: {
    paddingHorizontal: 24,
    gap: 16,
    marginBottom: 24,
  },
  purchaseButton: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
    shadowColor: colors.primary[500],
  },
  restoreButton: {
    alignSelf: "center",
    paddingVertical: 16,
  },

  // Benefits
  benefitsContainer: {
    marginHorizontal: 24,
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
  },
  benefitsList: {
    gap: 8,
  },

  // Legal
  legalContainer: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  legalText: {
    lineHeight: 18,
  },
});

export default PremiumScreen;
