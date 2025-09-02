import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ViewStyle,
  Image,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import Text from './Text';
import Button from './Button';
import Card from './Card';
import { spacing, borderRadius } from '../../theme/design-tokens';

const { width: screenWidth } = Dimensions.get('window');

export type EmptyStateType =
  | 'no-recipes'
  | 'no-favorites'
  | 'no-search-results'
  | 'no-ingredients'
  | 'no-history'
  | 'offline'
  | 'error'
  | 'no-suggestions';

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
    gradient: string[];
    tips: string[];
    secondaryIcons: (keyof typeof Ionicons.glyphMap)[];
  }
> = {
  'no-recipes': {
    icon: 'restaurant-outline',
    title: 'Henüz Tarif Yok',
    description:
      'Tarif koleksiyonumuz güncelleniyor. Yakında yeni tarifler eklenecek!',
    color: 'primary',
    gradient: ['#F59E0B', '#FCD34D'],
    tips: [
      'Binlerce tarif keşfetmeyi bekliyor',
      'Her damak zevkine uygun tarifler',
    ],
    secondaryIcons: ['nutrition-outline', 'timer-outline'],
  },
  'no-favorites': {
    icon: 'heart-outline',
    title: 'Henüz Favori Tarifiniz Yok',
    description:
      'Beğendiğiniz tarifleri favorilerinize ekleyerek kolayca bulabilirsiniz.',
    color: 'secondary',
    gradient: ['#FF6B6B', '#FF8E8E'],
    tips: [
      'Beğendiğin tarifleri ❤️ butonuna tıklayarak kaydet',
      'Favorilerin her zaman elinin altında olsun',
      'En sevdiğin tarifleri arkadaşlarınla paylaş',
    ],
    secondaryIcons: ['star-outline', 'bookmark-outline'],
  },
  'no-search-results': {
    icon: 'search-outline',
    title: 'Sonuç Bulunamadı',
    description:
      'Bu malzemelerle eşleşen tarif bulunamadı. Farklı malzemeler deneyebilirsiniz.',
    color: 'warning',
    gradient: ['#06B6D4', '#67E8F9'],
    tips: ['Farklı malzemeler deneyin', 'Arama filtrelerini değiştirin'],
    secondaryIcons: ['funnel-outline', 'refresh-outline'],
  },
  'no-ingredients': {
    icon: 'add-circle-outline',
    title: 'Malzeme Eklemediniz',
    description:
      'Mutfağınızdaki malzemeleri ekleyerek size uygun tarifleri bulabilirsiniz.',
    color: 'primary',
    gradient: ['#8B5CF6', '#A78BFA'],
    tips: ['Elindeki malzemeleri ekle', 'AI sana en uygun tarifleri önersin'],
    secondaryIcons: ['basket-outline', 'sparkles-outline'],
  },
  'no-history': {
    icon: 'time-outline',
    title: 'Henüz Geçmiş Yok',
    description: 'Tarif aradıktan sonra geçmişin burada görünecek.',
    color: 'secondary',
    gradient: ['#8B5CF6', '#A78BFA'],
    tips: [
      'Aradığın tarifler burada saklanır',
      'Geçmiş aramalarını tekrar kullanabilirsin',
      'Daha önce keşfettiğin tariflere kolayca dön',
    ],
    secondaryIcons: ['document-text-outline', 'arrow-back-outline'],
  },
  offline: {
    icon: 'cloud-offline-outline',
    title: 'İnternet Bağlantısı Yok',
    description: 'İnternet bağlantınızı kontrol edin ve tekrar deneyin.',
    color: 'error',
    gradient: ['#6B7280', '#9CA3AF'],
    tips: ['WiFi veya mobil veriye bağlanın', 'Bağlantınızı kontrol edin'],
    secondaryIcons: ['wifi-outline', 'cellular-outline'],
  },
  error: {
    icon: 'alert-circle-outline',
    title: 'Bir Hata Oluştu',
    description: 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.',
    color: 'error',
    gradient: ['#EF4444', '#F87171'],
    tips: ['Uygulamayı yeniden başlatın', 'Daha sonra tekrar deneyin'],
    secondaryIcons: ['refresh-outline', 'warning-outline'],
  },
  'no-suggestions': {
    icon: 'bulb-outline',
    title: 'Öneri Bulunamadı',
    description:
      'Şu anda size özel öneri oluşturamadık. Daha sonra tekrar deneyin.',
    color: 'secondary',
    gradient: ['#10B981', '#34D399'],
    tips: ['Daha fazla tarif keşfedin', 'Tercihlerinizi güncelleyin'],
    secondaryIcons: ['settings-outline', 'trending-up-outline'],
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
  const [floatAnim] = useState(new Animated.Value(0));
  const [tipIndex, setTipIndex] = useState(0);

  const config = EMPTY_STATE_CONFIG[type];
  const usedTitle = title || config.title;
  const usedDescription = description || config.description;
  const usedIcon = icon || config.icon;

  useEffect(() => {
    // Floating animation
    const floatingAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    floatingAnimation.start();

    // Tips cycling
    if (config.tips.length > 0) {
      const tipInterval = setInterval(() => {
        setTipIndex(prev => (prev + 1) % config.tips.length);
      }, 4000);
      return () => clearInterval(tipInterval);
    }

    return () => floatingAnimation.stop();
  }, [type]);

  const translateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });

  if (compact) {
    return (
      <View
        style={[
          styles.compactContainer,
          { backgroundColor: colors.surface.secondary },
          style,
        ]}
      >
        <View
          style={[
            styles.compactIconContainer,
            { backgroundColor: config.gradient[0] + '20' },
          ]}
        >
          <Ionicons
            name={usedIcon as any}
            size={24}
            color={config.gradient[0]}
          />
        </View>
        <View style={styles.compactContent}>
          <Text
            variant='bodyMedium'
            weight='600'
            style={{ color: colors.text.primary }}
          >
            {usedTitle}
          </Text>
          <Text variant='bodySmall' style={{ color: colors.text.secondary }}>
            {usedDescription}
          </Text>
        </View>
        {actions.length > 0 && (
          <Button
            variant={actions[0].variant || 'primary'}
            size='sm'
            onPress={actions[0].onPress}
            leftIcon={
              actions[0].icon ? (
                <Ionicons name={actions[0].icon as any} size={16} />
              ) : undefined
            }
            style={styles.compactButton}
          >
            {actions[0].label}
          </Button>
        )}
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.background.primary },
        style,
      ]}
    >
      {/* Background Icons */}
      <View style={styles.backgroundIcons}>
        {config.secondaryIcons.map((iconName, index) => (
          <Animated.View
            key={index}
            style={[
              styles.backgroundIcon,
              {
                opacity: 0.08,
                transform: [
                  {
                    translateY: floatAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -5 * (index + 1)],
                    }),
                  },
                ],
              },
              {
                top: `${20 + index * 15}%`,
                left: `${10 + index * 20}%`,
              },
            ]}
          >
            <Ionicons name={iconName} size={32} color={config.gradient[0]} />
          </Animated.View>
        ))}
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Icon with Animation */}
        <Animated.View
          style={[
            styles.iconContainer,
            {
              transform: [{ translateY }],
            },
          ]}
        >
          <LinearGradient
            colors={config.gradient as [string, string]}
            style={styles.iconGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name={usedIcon as any} size={48} color='white' />
          </LinearGradient>

          {/* Pulse Ring */}
          <Animated.View
            style={[
              styles.pulseRing,
              {
                borderColor: config.gradient[0] + '40',
                transform: [
                  {
                    scale: floatAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.2],
                    }),
                  },
                ],
                opacity: floatAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.6, 0.2],
                }),
              },
            ]}
          />
        </Animated.View>

        {/* Title and Description */}
        <Text
          variant='h3'
          weight='bold'
          align='center'
          style={{ ...styles.title, color: colors.text.primary }}
        >
          {usedTitle}
        </Text>

        <Text
          variant='body'
          color='secondary'
          align='center'
          style={styles.description}
        >
          {usedDescription}
        </Text>

        {/* Tips */}
        {config.tips.length > 0 && (
          <View
            style={[
              styles.tipContainer,
              { backgroundColor: colors.surface.secondary },
            ]}
          >
            <Ionicons
              name='bulb-outline'
              size={16}
              color={config.gradient[0]}
            />
            <Text
              variant='caption'
              style={{
                color: colors.text.secondary,
                flex: 1,
                marginLeft: spacing[2],
              }}
            >
              {config.tips[tipIndex]}
            </Text>
          </View>
        )}

        {/* Actions */}
        {actions.length > 0 && (
          <View style={styles.actionsContainer}>
            {actions.map((action, index) => (
              <Button
                key={index}
                variant={action.variant || 'primary'}
                onPress={action.onPress}
                leftIcon={
                  action.icon ? (
                    <Ionicons name={action.icon as any} size={16} />
                  ) : undefined
                }
                style={styles.actionButton}
              >
                {action.label}
              </Button>
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[6],
    position: 'relative',
  },
  backgroundIcons: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backgroundIcon: {
    position: 'absolute',
  },
  content: {
    alignItems: 'center',
    maxWidth: screenWidth * 0.8,
    zIndex: 1,
  },
  iconContainer: {
    position: 'relative',
    marginBottom: spacing[6],
  },
  iconGradient: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  pulseRing: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    borderRadius: 56,
    borderWidth: 2,
  },
  title: {
    marginBottom: spacing[3],
  },
  description: {
    lineHeight: 22,
    marginBottom: spacing[4],
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.lg,
    padding: spacing[3],
    marginBottom: spacing[6],
    maxWidth: '100%',
  },
  actionsContainer: {
    gap: spacing[3],
    width: '100%',
  },
  actionButton: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  // Compact styles
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    marginHorizontal: spacing[3],
    borderRadius: borderRadius.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  compactIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  compactContent: {
    flex: 1,
  },
  compactButton: {
    marginLeft: spacing[2],
  },
});

// Preset empty states for common scenarios
export const NoRecipesEmpty: React.FC<{ onRefresh?: () => void }> = ({
  onRefresh,
}) => (
  <EmptyState
    type='no-recipes'
    actions={
      onRefresh
        ? [{ label: 'Yenile', onPress: onRefresh, icon: 'refresh' }]
        : []
    }
  />
);

export const NoFavoritesEmpty: React.FC<{ onExplore?: () => void }> = ({
  onExplore,
}) => (
  <EmptyState
    type='no-favorites'
    actions={
      onExplore
        ? [
            {
              label: 'Tarifleri Keşfet',
              onPress: onExplore,
              icon: 'compass-outline',
            },
          ]
        : []
    }
  />
);

export const NoSearchResultsEmpty: React.FC<{
  searchTerm?: string;
  onClearSearch?: () => void;
  onBrowseAll?: () => void;
}> = ({ searchTerm, onClearSearch, onBrowseAll }) => (
  <EmptyState
    type='no-search-results'
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

export const OfflineEmpty: React.FC<{ onRetry?: () => void }> = ({
  onRetry,
}) => (
  <EmptyState
    type='offline'
    actions={
      onRetry
        ? [{ label: 'Tekrar Dene', onPress: onRetry, icon: 'refresh' }]
        : []
    }
  />
);

export const ErrorEmpty: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => (
  <EmptyState
    type='error'
    actions={
      onRetry
        ? [{ label: 'Tekrar Dene', onPress: onRetry, icon: 'refresh' }]
        : []
    }
  />
);
