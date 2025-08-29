import React, { useState, useEffect } from 'react';
import { TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  colors,
  spacing,
  borderRadius,
  shadows,
} from '../../theme/design-tokens';
import { Logger } from '../../services/LoggerService';
import { Recipe } from '../../types/Recipe';
import { FavoritesService } from '../../services/FavoritesService';

interface FavoriteButtonProps {
  recipe: Recipe;
  size?: 'small' | 'medium' | 'large';
  style?: any;
  onUpgradeRequired?: () => void;
}

export const FavoriteButton: React.FC<FavoriteButtonProps> = ({
  recipe,
  size = 'medium',
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
      console.error('Error checking favorite status:', error);
    }
  };

  const toggleFavorite = async () => {
    if (isLoading) return;

    await toggleFavoriteAction();
  };

  const toggleFavoriteAction = async () => {
    setIsLoading(true);
    try {
      const result = await FavoritesService.toggleFavorite(recipe);

      if (result.success) {
        setIsFavorite(result.isAdded || false);
      } else if (result.message) {
        Logger.warn('Favorite toggle failed:', result.message);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          container: { width: 32, height: 32 },
          icon: 20,
        };
      case 'large':
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
          size='small'
          color={isFavorite ? colors.neutral[0] : colors.error[500]}
        />
      ) : (
        <Ionicons
          name={isFavorite ? 'heart' : 'heart-outline'}
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
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
});
