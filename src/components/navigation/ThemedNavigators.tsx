import React from 'react';
import { View, Platform, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { spacing, borderRadius } from '../../theme/design-tokens';
import { useTranslation } from 'react-i18next';

// Screens
import ModernHomeScreen from '../../screens/ModernHomeScreen';
import { IngredientsScreen } from '../../screens/IngredientsScreen';
import RecipeDetailScreen from '../../screens/RecipeDetailScreen';
import RecipeResultsScreen from '../../screens/RecipeResultsScreen';
import FavoritesScreen from '../../screens/FavoritesScreen';
import AllRecipesScreen from '../../screens/AllRecipesScreen';
import HistoryScreen from '../../screens/HistoryScreen';
import SettingsScreen from '../../screens/SettingsScreen';

// Navigation Types
export type HomeStackParamList = {
  HomeMain:
    | {
        prefillIngredients?: string[];
        shouldGenerateRecipes?: boolean;
      }
    | undefined;
  IngredientsSelect: undefined;
  RecipeResults: {
    ingredients: string[];
    aiRecipes?: any[];
    fromHistory?: boolean;
  };
  RecipeDetail: {
    recipeId: string;
    recipeName: string;
    recipe?: any;
    isAiGenerated?: boolean;
  };
  AllRecipes: undefined;
  History: undefined;
  Settings: undefined;
};

export type FavoritesStackParamList = {
  FavoritesMain: undefined;
  RecipeDetail: {
    recipeId: string;
    recipeName: string;
    recipe?: any;
    isAiGenerated?: boolean;
  };
};

export type HistoryStackParamList = {
  HistoryMain: undefined;
  RecipeResults: {
    ingredients: string[];
    aiRecipes?: any[];
    fromHistory?: boolean;
  };
  RecipeDetail: {
    recipeId: string;
    recipeName: string;
    recipe?: any;
    isAiGenerated?: boolean;
  };
};

export type SettingsStackParamList = {
  SettingsMain: undefined;
};

export type TabParamList = {
  HomeTab: undefined;
  HistoryTab: undefined;
  FavoritesTab: undefined;
  SettingsTab: undefined;
};

const HomeStack = createStackNavigator<HomeStackParamList>();
const FavoritesStack = createStackNavigator<FavoritesStackParamList>();
const HistoryStack = createStackNavigator<HistoryStackParamList>();
const SettingsStack = createStackNavigator<SettingsStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// Home Stack Navigator
export function HomeStackScreen() {
  const { colors } = useThemedStyles();

  return (
    <HomeStack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: {
          backgroundColor: colors.background.primary,
        },
      }}
    >
      <HomeStack.Screen name='HomeMain' component={ModernHomeScreen} />
      <HomeStack.Screen name='IngredientsSelect' component={IngredientsScreen} />
      <HomeStack.Screen name='RecipeResults' component={RecipeResultsScreen} />
      <HomeStack.Screen name='RecipeDetail' component={RecipeDetailScreen} />
      <HomeStack.Screen name='AllRecipes' component={AllRecipesScreen} />
      <HomeStack.Screen name='History' component={HistoryScreen} />
      <HomeStack.Screen name='Settings' component={SettingsScreen} />
    </HomeStack.Navigator>
  );
}

// History Stack Navigator
export function HistoryStackScreen() {
  const { colors } = useThemedStyles();

  return (
    <HistoryStack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: {
          backgroundColor: colors.background.primary,
        },
      }}
    >
      <HistoryStack.Screen name='HistoryMain' component={HistoryScreen} />
      <HistoryStack.Screen name='RecipeResults' component={RecipeResultsScreen} />
      <HistoryStack.Screen name='RecipeDetail' component={RecipeDetailScreen} />
    </HistoryStack.Navigator>
  );
}

// Settings Stack Navigator
export function SettingsStackScreen() {
  const { colors } = useThemedStyles();

  return (
    <SettingsStack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: {
          backgroundColor: colors.background.primary,
        },
      }}
    >
      <SettingsStack.Screen name='SettingsMain' component={SettingsScreen} />
    </SettingsStack.Navigator>
  );
}

// Favorites Stack Navigator
export function FavoritesStackScreen() {
  const { colors } = useThemedStyles();

  return (
    <FavoritesStack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: {
          backgroundColor: colors.background.primary,
        },
      }}
    >
      <FavoritesStack.Screen name='FavoritesMain' component={FavoritesScreen} />
      <FavoritesStack.Screen name='RecipeDetail' component={RecipeDetailScreen} />
    </FavoritesStack.Navigator>
  );
}

// Minimal Tab Bar Component
const MinimalTabBar = ({ state, descriptors, navigation }: any) => {
  const { colors } = useThemedStyles();
  
  return (
    <View style={[styles.tabBarContainer, { 
      backgroundColor: colors.surface.primary,
      borderTopColor: colors.border.light,
    }]}>
      <View style={styles.tabBarContent}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const label =
            options.tabBarLabel !== undefined
              ? options.tabBarLabel
              : options.title !== undefined
                ? options.title
                : route.name;

          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          let iconName: keyof typeof Ionicons.glyphMap;
          if (route.name === 'HomeTab') {
            iconName = isFocused ? 'home' : 'home-outline';
          } else if (route.name === 'HistoryTab') {
            iconName = isFocused ? 'time' : 'time-outline';
          } else if (route.name === 'FavoritesTab') {
            iconName = isFocused ? 'heart' : 'heart-outline';
          } else if (route.name === 'SettingsTab') {
            iconName = isFocused ? 'settings' : 'settings-outline';
          } else {
            iconName = 'help-outline';
          }

          return (
            <TouchableOpacity
              key={index}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              testID={options.tabBarTestID}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tabButton}
              activeOpacity={0.7}
            >
              <Ionicons
                name={iconName}
                size={24}
                color={isFocused ? colors.primary[500] : colors.text.secondary}
                style={styles.tabIcon}
              />
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isFocused ? colors.primary[500] : colors.text.secondary,
                    fontWeight: isFocused ? '600' : '400',
                  }
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

// Main Tab Navigator
export function MainTabNavigator() {
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      tabBar={props => <MinimalTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen
        name='HomeTab'
        component={HomeStackScreen}
        options={{
          tabBarLabel: t('navigation.home'),
        }}
      />
      <Tab.Screen
        name='HistoryTab'
        component={HistoryStackScreen}
        options={{
          tabBarLabel: t('navigation.history'),
        }}
      />
      <Tab.Screen
        name='FavoritesTab'
        component={FavoritesStackScreen}
        options={{
          tabBarLabel: t('navigation.favorites'),
        }}
      />
      <Tab.Screen
        name='SettingsTab'
        component={SettingsStackScreen}
        options={{
          tabBarLabel: t('navigation.settings'),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    borderTopWidth: 1,
    paddingTop: spacing[2],
    paddingBottom: Platform.OS === 'ios' ? spacing[6] : spacing[3],
  },
  tabBarContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[2],
  },
  tabIcon: {
    marginBottom: spacing[1],
  },
  tabLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
});