import React from 'react';
import { View, StyleSheet, ViewStyle, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import Text from './Text';
import Button from './Button';
import Card from './Card';
import { spacing, borderRadius } from '../../theme/design-tokens';

export type EmptyStateType =
  | 'no-recipes'
  | 'no-favorites'
  | 'no-search-results'
  | 'no-ingredients'
  | 'offline'
  | 'error'
  | 'no-suggestions'


interface EmptyStateAction {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'outline' | 'ghost';
  icon?: keyof typeof Ionicons.glyphMap;
}

interface EmptyStateProps {
  type: EmptyStateType;
  title?: string;
  description?: string;
  icon?: keyof typeof Ionicons.glyphMap | string;
  illustration?: any; // For custom images
  actions?: EmptyStateAction[];
  style?: ViewStyle;
  compact?: boolean;
}

const EMPTY_STATE_CONFIG: Record<
  EmptyStateType,
  {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    description: string;
    color: 'primary' | 'secondary' | 'warning' | 'error';
  }
> = {
  'no-recipes': {
    icon: 'restaurant-outline',
    title: 'Henüz Tarif Yok',
    description: 'Tarif koleksiyonumuz güncelleniyor. Yakında yeni tarifler eklenecek!',
    color: 'primary',
  },
  'no-favorites': {
    icon: 'heart-outline',
    title: 'Henüz Favori Tarifiniz Yok',
    description: 'Beğendiğiniz tarifleri favorilerinize ekleyerek kolayca bulabilirsiniz.',
    color: 'secondary',
  },
  'no-search-results': {
    icon: 'search-outline',
    title: 'Sonuç Bulunamadı',
    description: 'Bu malzemelerle eşleşen tarif bulunamadı. Farklı malzemeler deneyebilirsiniz.',
    color: 'warning',
  },
  'no-ingredients': {
    icon: 'add-circle-outline',
    title: 'Malzeme Eklemediniz',
    description: 'Mutfağınızdaki malzemeleri ekleyerek size uygun tarifleri bulabilirsiniz.',
    color: 'primary',
  },
  offline: {
    icon: 'cloud-offline-outline',
    title: 'İnternet Bağlantısı Yok',
    description: 'İnternet bağlantınızı kontrol edin ve tekrar deneyin.',
    color: 'error',
  },
  error: {
    icon: 'alert-circle-outline',
    title: 'Bir Hata Oluştu',
    description: 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.',
    color: 'error',
  },
  'no-suggestions': {
    icon: 'bulb-outline',
    title: 'Öneri Bulunamadı',
    description: 'Şu anda size özel öneri oluşturamadık. Daha sonra tekrar deneyin.',
    color: 'secondary',
  },

};

export const EmptyState: React.FC<EmptyStateProps> = ({
  type,
  title,
  description,
  icon,
  illustration,
  actions = [],
  style,
  compact = false,
}) => {
  const { colors } = useThemedStyles();

  const config = EMPTY_STATE_CONFIG[type];
  const finalTitle = title || config.title;
  const finalDescription = description || config.description;
  const finalIcon = icon || config.icon;

  const getColorScheme = () => {
    switch (config.color) {
      case 'primary':
        return {
          iconBg: colors.primary[100],
          iconColor: colors.primary[600],
          titleColor: colors.text.primary,
          descColor: colors.text.secondary,
        };
      case 'secondary':
        return {
          iconBg: colors.secondary[100],
          iconColor: colors.secondary[600],
          titleColor: colors.text.primary,
          descColor: colors.text.secondary,
        };
      case 'warning':
        return {
          iconBg: colors.warning[100],
          iconColor: colors.warning[600],
          titleColor: colors.text.primary,
          descColor: colors.text.secondary,
        };
      case 'error':
        return {
          iconBg: colors.error[100],
          iconColor: colors.error[600],
          titleColor: colors.text.primary,
          descColor: colors.text.secondary,
        };
      default:
        return {
          iconBg: colors.neutral[100],
          iconColor: colors.neutral[600],
          titleColor: colors.text.primary,
          descColor: colors.text.secondary,
        };
    }
  };

  const colorScheme = getColorScheme();

  const containerStyle = compact ? styles.compactContainer : styles.container;
  const iconSize = compact ? 40 : 64;
  const iconContainerSize = compact ? 60 : 96;

  return (
    <View style={[containerStyle, style]}>
      <Card variant="default" size={compact ? 'md' : 'lg'} style={styles.card}>
        {/* Icon or Illustration */}
        {illustration ? (
          <View style={[styles.illustrationContainer, { height: compact ? 120 : 160 }]}>
            <Image source={illustration} style={styles.illustration} resizeMode="contain" />
          </View>
        ) : (
          <View
            style={[
              styles.iconContainer,
              {
                width: iconContainerSize,
                height: iconContainerSize,
                borderRadius: iconContainerSize / 2,
                backgroundColor: colorScheme.iconBg,
              },
            ]}
          >
            <Ionicons name={finalIcon as any} size={iconSize} color={colorScheme.iconColor} />
          </View>
        )}

        {/* Content */}
        <View style={styles.content}>
          <Text
            variant={compact ? 'bodyLarge' : 'h3'}
            weight="bold"
            align="center"
            style={{ color: colorScheme.titleColor, marginBottom: spacing[2] }}
          >
            {finalTitle}
          </Text>

          <Text
            variant={compact ? 'bodySmall' : 'body'}
            align="center"
            style={{
              color: colorScheme.descColor,
              lineHeight: compact ? 18 : 22,
              maxWidth: compact ? 250 : 300,
            }}
          >
            {finalDescription}
          </Text>
        </View>

        {/* Actions */}
        {actions.length > 0 && (
          <View style={[styles.actions, compact && styles.compactActions]}>
            {actions.map((action, index) => (
              <Button
                key={index}
                variant={action.variant || 'primary'}
                size={compact ? 'md' : 'lg'}
                onPress={action.onPress}
                leftIcon={action.icon ? <Ionicons name={action.icon} size={16} /> : undefined}
                style={
                  [styles.actionButton, actions.length === 1 ? styles.singleAction : {}] as any
                }
              >
                {action.label}
              </Button>
            ))}
          </View>
        )}
      </Card>
    </View>
  );
};

// Preset empty states for common scenarios
export const NoRecipesEmpty: React.FC<{ onRefresh?: () => void }> = ({ onRefresh }) => (
  <EmptyState
    type="no-recipes"
    actions={onRefresh ? [{ label: 'Yenile', onPress: onRefresh, icon: 'refresh' }] : []}
  />
);

export const NoFavoritesEmpty: React.FC<{ onExplore?: () => void }> = ({ onExplore }) => (
  <EmptyState
    type="no-favorites"
    actions={onExplore ? [{ label: 'Tarifleri Keşfet', onPress: onExplore, icon: 'compass' }] : []}
  />
);

export const NoSearchResultsEmpty: React.FC<{
  searchTerm?: string;
  onClearSearch?: () => void;
  onBrowseAll?: () => void;
}> = ({ searchTerm, onClearSearch, onBrowseAll }) => (
  <EmptyState
    type="no-search-results"
    description={
      searchTerm
        ? `"${searchTerm}" için sonuç bulunamadı. Farklı kelimeler deneyebilirsiniz.`
        : 'Bu malzemelerle eşleşen tarif bulunamadı. Farklı malzemeler deneyebilirsiniz.'
    }
    actions={[
      ...(onClearSearch
        ? [
            {
              label: 'Aramayı Temizle',
              onPress: onClearSearch,
              variant: 'outline' as const,
              icon: 'close-circle' as const,
            },
          ]
        : []),
      ...(onBrowseAll
        ? [
            {
              label: 'Tüm Tariflere Bak',
              onPress: onBrowseAll,
              icon: 'library' as const,
            },
          ]
        : []),
    ]}
  />
);

export const OfflineEmpty: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => (
  <EmptyState
    type="offline"
    actions={onRetry ? [{ label: 'Tekrar Dene', onPress: onRetry, icon: 'refresh' }] : []}
  />
);

export const ErrorEmpty: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => (
  <EmptyState
    type="error"
    actions={onRetry ? [{ label: 'Tekrar Dene', onPress: onRetry, icon: 'refresh' }] : []}
  />
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[6],
  },

  compactContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  },

  card: {
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
  },

  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
  },

  illustrationContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[4],
  },

  illustration: {
    width: '80%',
    height: '100%',
  },

  content: {
    alignItems: 'center',
    marginBottom: spacing[6],
  },

  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
    justifyContent: 'center',
  },

  compactActions: {
    marginTop: spacing[2],
  },

  actionButton: {
    minWidth: 120,
  },

  singleAction: {
    minWidth: 160,
  },
});
