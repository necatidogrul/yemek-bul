import React, { useState, useEffect } from "react";
import { TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  colors,
  spacing,
  borderRadius,
  shadows,
} from "../../theme/design-tokens";
import { Logger } from '../../services/LoggerService';
import { Recipe } from "../../types/Recipe";
import { FavoritesService } from "../../services/FavoritesService";
import { CreditService } from "../../services/creditService";
import { RevenueCatService } from "../../services/RevenueCatService";
import { PremiumLimitsService } from "../../services/PremiumLimitsService";

interface FavoriteButtonProps {
  recipe: Recipe;
  size?: "small" | "medium" | "large";
  style?: any;
  onUpgradeRequired?: () => void;
}

export const FavoriteButton: React.FC<FavoriteButtonProps> = ({
  recipe,
  size = "medium",
  style,
  onUpgradeRequired,
}) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    checkFavoriteStatus();
  }, [recipe.id]);

  const checkFavoriteStatus = async () => {
    try {
      const favoriteStatus = await FavoritesService.isFavorite(recipe.id);
      setIsFavorite(favoriteStatus);
    } catch (error) {
      console.error("Error checking favorite status:", error);
    }
  };

  const toggleFavorite = async () => {
    if (isLoading) return;

    // Get current user ID
    const userId = RevenueCatService.getCurrentUserId() || 'anonymous';
    
    // Check if user is premium
    const isPremium = await RevenueCatService.isPremiumUser();
    
    if (isPremium) {
      // Premium user - check monthly limits
      try {
        if (isFavorite) {
          // Removing from favorites - no charge
          await toggleFavoriteAction();
        } else {
          // Adding to favorites - check premium limits
          const canAdd = await PremiumLimitsService.canAddFavorite(userId);
          if (!canAdd.canAdd) {
            // Monthly limit exceeded
            if (onUpgradeRequired) {
              onUpgradeRequired();
            }
            return;
          }
          
          await PremiumLimitsService.recordFavoriteUsage(userId);
          await toggleFavoriteAction();
        }
      } catch (error) {
        console.error('Premium favorite error:', error);
        if (onUpgradeRequired) {
          onUpgradeRequired();
        }
      }
    } else {
      // Free user - favorites are free to add/remove, but limited to 3
      if (isFavorite) {
        // Removing from favorites - always free
        await toggleFavoriteAction();
      } else {
        // Adding to favorites - check limit
        const limitCheck = await FavoritesService.canAddFavorite(false);
        if (!limitCheck.canAdd) {
          // Show upgrade modal for limit exceeded
          if (onUpgradeRequired) {
            onUpgradeRequired();
          }
          return;
        }
        
        await toggleFavoriteAction();
      }
    }
  };

  const toggleFavoriteAction = async () => {
    setIsLoading(true);
    try {
      // Check if user is premium to determine if we should apply limits
      const isPremium = await RevenueCatService.isPremiumUser();
      const result = await FavoritesService.toggleFavorite(recipe, isPremium);
      
      if (result.success) {
        setIsFavorite(result.isAdded || false);
      } else if (result.message) {
        Logger.warn('Favorite toggle failed:', result.message);
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case "small":
        return {
          container: { width: 32, height: 32 },
          icon: 20,
        };
      case "large":
        return {
          container: { width: 48, height: 48 },
          icon: 28,
        };
      default: // medium
        return {
          container: { width: 40, height: 40 },
          icon: 24,
        };
    }
  };

  const sizeStyles = getSizeStyles();

  return (
    <TouchableOpacity
      style={[
        styles.container,
        sizeStyles.container,
        {
          backgroundColor: isFavorite ? colors.error[500] : colors.neutral[0],
          borderColor: isFavorite ? colors.error[500] : colors.neutral[300],
        },
        style,
      ]}
      onPress={toggleFavorite}
      disabled={isLoading}
      activeOpacity={0.8}
    >
      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={isFavorite ? colors.neutral[0] : colors.error[500]}
        />
      ) : (
        <Ionicons
          name={isFavorite ? "heart" : "heart-outline"}
          size={sizeStyles.icon}
          color={isFavorite ? colors.neutral[0] : colors.error[500]}
        />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.full,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.sm,
  },
});
