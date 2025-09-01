import React from 'react';
import { View, Platform, TouchableOpacity, Text } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemedStyles } from '../../hooks/useThemedStyles';
import { shadows, borderRadius } from '../../theme/design-tokens';
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
  HomeMain: { 
    prefillIngredients?: string[];
    shouldGenerateRecipes?: boolean;
  } | undefined;
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

// Modern Header Component
const ModernHeader = ({ title, colors }: { title: string; colors: any }) => {
  return (
    <LinearGradient
      colors={[colors.primary[500], colors.primary[600]]}
      style={{
        paddingTop: Platform.OS === 'ios' ? 50 : 25,
        paddingBottom: 15,
        paddingHorizontal: 20,
        borderBottomLeftRadius: borderRadius.lg,
        borderBottomRightRadius: borderRadius.lg,
        ...shadows.lg,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            backgroundColor: 'rgba(255,255,255,0.2)',
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
          }}
        >
          <Ionicons
            name={
              title.includes('Ana Sayfa')
                ? 'home'
                : title.includes('Tarif')
                  ? 'restaurant'
                  : title.includes('Tüm')
                    ? 'library'
                    : title.includes('Favori')
                      ? 'heart'
                      : 'apps'
            }
            size={20}
            color='white'
          />
        </View>
        <Text
          style={{
            color: 'white',
            fontSize: 20,
            fontWeight: '700',
            textAlign: 'center',
          }}
        >
          {title.replace(/[🍳📝👨‍🍳📚❤️👑]/g, '').trim()}
        </Text>
      </View>
    </LinearGradient>
  );
};

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
        cardStyleInterpolator: ({ current, layouts }) => {
          return {
            cardStyle: {
              transform: [
                {
                  translateX: current.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [layouts.screen.width, 0],
                  }),
                },
              ],
            },
            overlayStyle: {
              opacity: current.progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.5],
              }),
            },
          };
        },
      }}
    >
      <HomeStack.Screen
        name='HomeMain'
        component={ModernHomeScreen}
        options={{
          headerShown: false,
        }}
      />
      <HomeStack.Screen
        name='IngredientsSelect'
        component={IngredientsScreen}
        options={{
          headerShown: false,
        }}
      />
      <HomeStack.Screen
        name='RecipeResults'
        component={RecipeResultsScreen}
        options={{
          headerShown: false,
        }}
      />
      <HomeStack.Screen
        name='RecipeDetail'
        component={RecipeDetailScreen}
        options={{
          headerShown: false,
        }}
      />
      <HomeStack.Screen
        name='AllRecipes'
        component={AllRecipesScreen}
        options={{
          headerShown: false,
        }}
      />
      <HomeStack.Screen
        name='History'
        component={HistoryScreen}
        options={{
          headerShown: false,
        }}
      />

      <HomeStack.Screen
        name='Settings'
        component={SettingsScreen}
        options={{
          headerShown: false,
        }}
      />
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
        cardStyleInterpolator: ({ current, layouts }) => {
          return {
            cardStyle: {
              transform: [
                {
                  translateX: current.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [layouts.screen.width, 0],
                  }),
                },
              ],
            },
            overlayStyle: {
              opacity: current.progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.5],
              }),
            },
          };
        },
      }}
    >
      <HistoryStack.Screen
        name='HistoryMain'
        component={HistoryScreen}
        options={{
          headerShown: false,
        }}
      />
      <HistoryStack.Screen
        name='RecipeResults'
        component={RecipeResultsScreen}
        options={{
          headerShown: false,
        }}
      />
      <HistoryStack.Screen
        name='RecipeDetail'
        component={RecipeDetailScreen}
        options={{
          headerShown: false,
        }}
      />
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
      <SettingsStack.Screen
        name='SettingsMain'
        component={SettingsScreen}
        options={{
          headerShown: false,
        }}
      />
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
        cardStyleInterpolator: ({ current, layouts }) => {
          return {
            cardStyle: {
              transform: [
                {
                  translateX: current.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [layouts.screen.width, 0],
                  }),
                },
              ],
            },
            overlayStyle: {
              opacity: current.progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.5],
              }),
            },
          };
        },
      }}
    >
      <FavoritesStack.Screen
        name='FavoritesMain'
        component={FavoritesScreen}
        options={{
          headerShown: false,
        }}
      />
      <FavoritesStack.Screen
        name='RecipeDetail'
        component={RecipeDetailScreen}
        options={{
          headerShown: false,
        }}
      />
    </FavoritesStack.Navigator>
  );
}

// Modern Tab Bar Component
const ModernTabBar = ({ state, descriptors, navigation, colors }: any) => {
  return (
    <View
      style={{
        backgroundColor: colors.surface.primary,
        borderTopLeftRadius: borderRadius.xl,
        borderTopRightRadius: borderRadius.xl,
        ...shadows.lg,
        paddingBottom: Platform.OS === 'ios' ? 25 : 10,
        paddingTop: 15,
        paddingHorizontal: 20,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-around',
          alignItems: 'center',
        }}
      >
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

          let iconName: keyof typeof Ionicons.glyphMap;
          let gradientColors: string[];

          if (route.name === 'HomeTab') {
            iconName = 'home';
            gradientColors = [colors.primary[500], colors.primary[600]];
          } else if (route.name === 'HistoryTab') {
            iconName = 'time';
            gradientColors = [colors.secondary[500], colors.secondary[600]];
          } else if (route.name === 'FavoritesTab') {
            iconName = 'heart';
            gradientColors = [colors.error[500], colors.error[600]];
          } else if (route.name === 'SettingsTab') {
            iconName = 'settings';
            gradientColors = [colors.neutral[500], colors.neutral[600]];
          } else {
            iconName = 'help-outline';
            gradientColors = [colors.neutral[500], colors.neutral[600]];
          }

          return (
            <TouchableOpacity
              key={index}
              onPress={onPress}
              style={{
                alignItems: 'center',
                paddingVertical: 8,
                paddingHorizontal: 16,
                borderRadius: borderRadius.lg,
                backgroundColor: isFocused
                  ? `${gradientColors[0]}15`
                  : 'transparent',
                minWidth: 70,
              }}
              activeOpacity={0.8}
            >
              {isFocused ? (
                <LinearGradient
                  colors={[gradientColors[0], gradientColors[1]] as any}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 4,
                    ...shadows.md,
                  }}
                >
                  <Ionicons name={iconName} size={22} color='white' />
                </LinearGradient>
              ) : (
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 4,
                    backgroundColor: colors.neutral[100],
                  }}
                >
                  <Ionicons
                    name={iconName}
                    size={20}
                    color={colors.text.tertiary}
                  />
                </View>
              )}
              <Text
                style={{
                  color: isFocused ? gradientColors[0] : colors.text.tertiary,
                  fontSize: 11,
                  fontWeight: isFocused ? '700' : '500',
                  textAlign: 'center',
                }}
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
  const { colors } = useThemedStyles();
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      tabBar={props => <ModernTabBar {...props} colors={colors} />}
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
