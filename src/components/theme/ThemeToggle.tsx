import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import Text from '../ui/Text';
import Card from '../ui/Card';
import { spacing, borderRadius } from '../../theme/design-tokens';

interface ThemeToggleProps {
  showLabels?: boolean;
  variant?: 'compact' | 'full';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  showLabels = true, 
  variant = 'full' 
}) => {
  const { themeMode, setThemeMode } = useTheme();
  const { colors, isDark } = useThemedStyles();
  
  const themes = [
    {
      mode: 'light' as const,
      icon: 'sunny-outline' as const,
      label: 'Açık',
      description: 'Açık tema',
    },
    {
      mode: 'dark' as const,
      icon: 'moon-outline' as const,
      label: 'Koyu',
      description: 'Koyu tema',
    },
    {
      mode: 'system' as const,
      icon: 'phone-portrait-outline' as const,
      label: 'Sistem',
      description: 'Sistem ayarını takip et',
    },
  ];

  const handleThemeChange = async (mode: typeof themeMode) => {
    await setThemeMode(mode);
  };

  if (variant === 'compact') {
    return (
      <TouchableOpacity
        style={[
          styles.compactButton,
          { 
            backgroundColor: colors.surface.secondary,
            borderColor: colors.border.medium,
          }
        ]}
        onPress={() => {
          const nextMode = themeMode === 'light' ? 'dark' : 
                          themeMode === 'dark' ? 'system' : 'light';
          handleThemeChange(nextMode);
        }}
        activeOpacity={0.7}
      >
        <Ionicons
          name={themes.find(t => t.mode === themeMode)?.icon || 'sunny-outline'}
          size={20}
          color={colors.text.primary}
        />
      </TouchableOpacity>
    );
  }

  return (
    <Card variant="default" size="lg" style={styles.container}>
      <View style={styles.header}>
        <Ionicons 
          name="color-palette" 
          size={20} 
          color={colors.primary[500]} 
        />
        <Text variant="bodyLarge" weight="semibold">
          Tema Seçimi
        </Text>
      </View>

      <View style={styles.themesContainer}>
        {themes.map((theme) => {
          const isSelected = themeMode === theme.mode;
          
          return (
            <TouchableOpacity
              key={theme.mode}
              style={[
                styles.themeOption,
                {
                  backgroundColor: isSelected 
                    ? colors.primary[50] 
                    : colors.surface.secondary,
                  borderColor: isSelected 
                    ? colors.primary[200] 
                    : colors.border.light,
                },
                isDark && isSelected && {
                  backgroundColor: colors.primary[900],
                  borderColor: colors.primary[700],
                }
              ]}
              onPress={() => handleThemeChange(theme.mode)}
              activeOpacity={0.7}
            >
              <View style={styles.themeIconContainer}>
                <Ionicons
                  name={theme.icon}
                  size={24}
                  color={isSelected ? colors.primary[600] : colors.text.secondary}
                />
                {isSelected && (
                  <View style={[styles.selectedBadge, { backgroundColor: colors.primary[500] }]}>
                    <Ionicons name="checkmark-outline" size={12} color={colors.text.inverse} />
                  </View>
                )}
              </View>
              
              {showLabels && (
                <View style={styles.themeLabels}>
                  <Text 
                    variant="bodyMedium" 
                    weight="medium"
                    style={{
                      color: isSelected ? colors.primary[700] : colors.text.primary
                    }}
                  >
                    {theme.label}
                  </Text>
                  <Text 
                    variant="caption" 
                    style={{
                      color: isSelected ? colors.primary[600] : colors.text.secondary
                    }}
                  >
                    {theme.description}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing[4],
  },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  
  themesContainer: {
    gap: spacing[3],
  },
  
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    borderRadius: borderRadius.lg,
    borderWidth: 2,
  },
  
  themeIconContainer: {
    position: 'relative',
    marginRight: spacing[3],
  },
  
  selectedBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  themeLabels: {
    flex: 1,
  },
  
  compactButton: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});