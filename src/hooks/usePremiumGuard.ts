/**
 * Premium Guard Hook
 *
 * Premium özellikleri için koruma sağlar
 */

import React, { useCallback } from 'react';
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

  const hasAccess = hasFeatureAccess(feature);

  const checkAccess = useCallback((): boolean => {
    return hasFeatureAccess(feature);
  }, [feature, hasFeatureAccess]);

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
    const { hasAccess } = usePremiumGuard({ feature });

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
