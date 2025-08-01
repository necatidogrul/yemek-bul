import { useState, useCallback } from 'react';
import UsageLimitService from '../services/UsageLimitService';
import { usePremium } from '../contexts/PremiumContext';

export type PremiumFeature = 
  | 'recipe_limit' 
  | 'search_limit' 
  | 'favorites' 
  | 'ai_chat' 
  | 'filters' 
  | 'menu_planner'
  | 'nutrition_analysis'
  | 'offline_recipes'
  | 'general';

interface UsePremiumGuardReturn {
  showPaywall: boolean;
  currentFeature: PremiumFeature | null;
  paywallTitle?: string;
  paywallDescription?: string;
  checkRecipeViewLimit: () => Promise<boolean>;
  checkSearchLimit: () => Promise<boolean>;
  checkPremiumFeature: (feature: PremiumFeature, title?: string, description?: string) => boolean;
  hidePaywall: () => void;
  incrementRecipeView: () => Promise<void>;
  incrementSearch: () => Promise<void>;
}

export const usePremiumGuard = (): UsePremiumGuardReturn => {
  const { isPremium } = usePremium();
  const [showPaywall, setShowPaywall] = useState(false);
  const [currentFeature, setCurrentFeature] = useState<PremiumFeature | null>(null);
  const [paywallTitle, setPaywallTitle] = useState<string | undefined>();
  const [paywallDescription, setPaywallDescription] = useState<string | undefined>();

  /**
   * Check if user can view more recipes
   * @returns true if can view, false if should show paywall
   */
  const checkRecipeViewLimit = useCallback(async (): Promise<boolean> => {
    if (isPremium) return true;

    const { canView } = await UsageLimitService.canViewRecipe(isPremium);
    
    if (!canView) {
      setCurrentFeature('recipe_limit');
      setPaywallTitle(undefined);
      setPaywallDescription(undefined);
      setShowPaywall(true);
      return false;
    }

    return true;
  }, [isPremium]);

  /**
   * Check if user can perform more searches
   * @returns true if can search, false if should show paywall
   */
  const checkSearchLimit = useCallback(async (): Promise<boolean> => {
    if (isPremium) return true;

    const { canSearch } = await UsageLimitService.canPerformSearch(isPremium);
    
    if (!canSearch) {
      setCurrentFeature('search_limit');
      setPaywallTitle(undefined);
      setPaywallDescription(undefined);
      setShowPaywall(true);
      return false;
    }

    return true;
  }, [isPremium]);

  /**
   * Check if user can access premium feature
   * @param feature - The premium feature to check
   * @param title - Custom paywall title
   * @param description - Custom paywall description
   * @returns true if can access, false if should show paywall
   */
  const checkPremiumFeature = useCallback((
    feature: PremiumFeature,
    title?: string,
    description?: string
  ): boolean => {
    if (isPremium) return true;

    setCurrentFeature(feature);
    setPaywallTitle(title);
    setPaywallDescription(description);
    setShowPaywall(true);
    return false;
  }, [isPremium]);

  /**
   * Hide the paywall modal
   */
  const hidePaywall = useCallback(() => {
    setShowPaywall(false);
    setCurrentFeature(null);
    setPaywallTitle(undefined);
    setPaywallDescription(undefined);
  }, []);

  /**
   * Increment recipe view count and check limit
   */
  const incrementRecipeView = useCallback(async (): Promise<void> => {
    if (!isPremium) {
      await UsageLimitService.incrementRecipeView();
    }
  }, [isPremium]);

  /**
   * Increment search count and check limit
   */
  const incrementSearch = useCallback(async (): Promise<void> => {
    if (!isPremium) {
      await UsageLimitService.incrementSearch();
    }
  }, [isPremium]);

  return {
    showPaywall,
    currentFeature,
    paywallTitle,
    paywallDescription,
    checkRecipeViewLimit,
    checkSearchLimit,
    checkPremiumFeature,
    hidePaywall,
    incrementRecipeView,
    incrementSearch,
  };
};

export default usePremiumGuard;