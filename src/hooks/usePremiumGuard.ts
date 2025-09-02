/**
 * Premium Guard Hook
 *
 * Premium özellikleri için koruma sağlar
 */

import React, { useCallback, useState, useEffect } from 'react';
import { usePremium } from '../contexts/PremiumContext';
import { PremiumFeature } from '../config/revenueCat';
import { useTranslation } from './useTranslation';

interface PremiumGuardOptions {
  feature: PremiumFeature;
  title?: string;
  onPremiumRequired?: () => void;
}

interface PremiumGuardResult {
  hasAccess: boolean;
  checkAccess: () => boolean;
  requirePremium: () => void;
  isPremium: boolean;
}

export const usePremiumGuard = (
  options: PremiumGuardOptions
): PremiumGuardResult => {
  const { feature, title, onPremiumRequired } = options;
  const { hasFeatureAccess, isPremium, showPaywall } = usePremium();
  const { t } = useTranslation();
  const [hasAccess, setHasAccess] = useState<boolean>(false);

  useEffect(() => {
    const checkFeatureAccess = async () => {
      const access = await hasFeatureAccess(feature);
      setHasAccess(access);
    };
    checkFeatureAccess();
  }, [feature, hasFeatureAccess]);

  const checkAccess = useCallback((): boolean => {
    return hasAccess;
  }, [hasAccess]);

  const requirePremium = useCallback(() => {
    if (hasAccess) {
      return; // Zaten premium erişimi var
    }

    // Custom callback varsa çalıştır
    if (onPremiumRequired) {
      onPremiumRequired();
      return;
    }

    // Paywall göster
    const featureName = getFeatureDisplayName(feature);
    const paywallTitle =
      title || t('premium.upgrade_for_feature', { feature: featureName });

    showPaywall(featureName, paywallTitle);
  }, [hasAccess, onPremiumRequired, showPaywall, title, feature, t]);

  return {
    hasAccess,
    checkAccess,
    requirePremium,
    isPremium,
  };
};

// Premium özelliklerinin display isimlerini getir
const getFeatureDisplayName = (feature: PremiumFeature): string => {
  const featureNames: Record<PremiumFeature, string> = {
    unlimitedRecipes: 'Sınırsız Tarif',
    advancedFilters: 'Gelişmiş Filtreler',
    exportRecipes: 'Tarif Dışa Aktarma',
    prioritySupport: 'Öncelikli Destek',
    noAds: 'Reklamı Kaldır',
    offlineMode: 'Çevrimdışı Mod',
    customMealPlans: 'Özel Yemek Planları',
    nutritionTracking: 'Beslenme Takibi',
  };

  return featureNames[feature] || feature;
};

// Premium özellik koruması için HOC
export const withPremiumGuard = <T extends object>(
  Component: React.ComponentType<T>,
  feature: PremiumFeature,
  fallbackComponent?: React.ComponentType<T>
) => {
  return (props: T) => {
    const [hasAccess, setHasAccess] = useState<boolean>(false);
    const { hasFeatureAccess } = usePremium();

    useEffect(() => {
      const checkAccess = async () => {
        const access = await hasFeatureAccess(feature);
        setHasAccess(access);
      };
      checkAccess();
    }, [feature, hasFeatureAccess]);

    if (!hasAccess && fallbackComponent) {
      const FallbackComponent = fallbackComponent;
      return React.createElement(FallbackComponent, props);
    }

    if (!hasAccess) {
      return null; // Premium erişim yok, hiçbir şey gösterme
    }

    return React.createElement(Component, props);
  };
};
