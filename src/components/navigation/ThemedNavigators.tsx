import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useThemedStyles } from '../../hooks/useThemedStyles';

// Screens
import HomeScreen from '../../screens/HomeScreen';
import RecipeDetailScreen from '../../screens/RecipeDetailScreen';
import RecipeResultsScreen from '../../screens/RecipeResultsScreen';
import FavoritesScreen from '../../screens/FavoritesScreen';
import AllRecipesScreen from '../../screens/AllRecipesScreen';
import PremiumScreen from '../../screens/PremiumScreen';

// Navigation Types
export type HomeStackParamList = {
  HomeMain: undefined;
  RecipeResults: { ingredients: string[] };
  RecipeDetail: { recipeId: string; recipeName: string };
  AllRecipes: undefined;
  Premium: undefined;
};

export type FavoritesStackParamList = {
  FavoritesMain: undefined;
  RecipeDetail: { recipeId: string; recipeName: string };
  Premium: undefined;
};

export type AllRecipesStackParamList = {
  AllRecipesMain: undefined;
  RecipeDetail: { recipeId: string; recipeName: string };
  Premium: undefined;
};

export type TabParamList = {
  HomeTab: undefined;
  AllRecipesTab: undefined;
  FavoritesTab: undefined;
};

const HomeStack = createStackNavigator<HomeStackParamList>();
const FavoritesStack = createStackNavigator<FavoritesStackParamList>();
const AllRecipesStack = createStackNavigator<AllRecipesStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// Home Stack Navigator
export function HomeStackScreen() {
  const { colors } = useThemedStyles();
  
  return (
    <HomeStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.primary[500],
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: colors.text.inverse,
        headerTitleStyle: {
          fontWeight: "600",
          fontSize: 18,
        },
        headerTitleAlign: "center",
        cardStyle: {
          backgroundColor: colors.background.secondary,
        },
      }}
    >
      <HomeStack.Screen
        name="HomeMain"
        component={HomeScreen}
        options={{
          title: "🍳 Yemek Bulucu",
        }}
      />
      <HomeStack.Screen
        name="RecipeResults"
        component={RecipeResultsScreen}
        options={{
          title: "📝 Önerilen Yemekler",
        }}
      />
      <HomeStack.Screen
        name="RecipeDetail"
        component={RecipeDetailScreen}
        options={{
          title: "👨‍🍳 Tarif Detayı",
        }}
      />
      <HomeStack.Screen
        name="AllRecipes"
        component={AllRecipesScreen}
        options={{
          title: "📚 Tüm Yemekler",
        }}
      />
      <HomeStack.Screen
        name="Premium"
        component={PremiumScreen}
        options={{
          title: "👑 Premium",
          presentation: "modal",
        }}
      />
    </HomeStack.Navigator>
  );
}

// All Recipes Stack Navigator
export function AllRecipesStackScreen() {
  const { colors } = useThemedStyles();
  
  return (
    <AllRecipesStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.primary[500],
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: colors.text.inverse,
        headerTitleStyle: {
          fontWeight: "600",
          fontSize: 18,
        },
        headerTitleAlign: "center",
        cardStyle: {
          backgroundColor: colors.background.secondary,
        },
      }}
    >
      <AllRecipesStack.Screen
        name="AllRecipesMain"
        component={AllRecipesScreen}
        options={{
          title: "📚 Tüm Yemekler",
        }}
      />
      <AllRecipesStack.Screen
        name="RecipeDetail"
        component={RecipeDetailScreen}
        options={{
          title: "👨‍🍳 Tarif Detayı",
        }}
      />
      <AllRecipesStack.Screen
        name="Premium"
        component={PremiumScreen}
        options={{
          title: "👑 Premium",
          presentation: "modal",
        }}
      />
    </AllRecipesStack.Navigator>
  );
}

// Favorites Stack Navigator
export function FavoritesStackScreen() {
  const { colors } = useThemedStyles();
  
  return (
    <FavoritesStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.primary[500],
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: colors.text.inverse,
        headerTitleStyle: {
          fontWeight: "600",
          fontSize: 18,
        },
        headerTitleAlign: "center",
        cardStyle: {
          backgroundColor: colors.background.secondary,
        },
      }}
    >
      <FavoritesStack.Screen
        name="FavoritesMain"
        component={FavoritesScreen}
        options={{
          title: "❤️ Favori Tariflerim",
        }}
      />
      <FavoritesStack.Screen
        name="RecipeDetail"
        component={RecipeDetailScreen}
        options={{
          title: "👨‍🍳 Tarif Detayı",
        }}
      />
      <FavoritesStack.Screen
        name="Premium"
        component={PremiumScreen}
        options={{
          title: "👑 Premium",
          presentation: "modal",
        }}
      />
    </FavoritesStack.Navigator>
  );
}

// Main Tab Navigator
export function MainTabNavigator() {
  const { colors } = useThemedStyles();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === "HomeTab") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "AllRecipesTab") {
            iconName = focused ? "library" : "library-outline";
          } else if (route.name === "FavoritesTab") {
            iconName = focused ? "heart" : "heart-outline";
          } else {
            iconName = "help-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary[500],
        tabBarInactiveTintColor: colors.text.tertiary,
        tabBarStyle: {
          backgroundColor: colors.surface.primary,
          borderTopColor: colors.border.light,
          borderTopWidth: 1,
          paddingBottom: 4,
          paddingTop: 4,
          height: 60,
          nativeID: 'bottom-tabs',
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStackScreen}
        options={{
          tabBarLabel: "Ana Sayfa",
        }}
      />
      <Tab.Screen
        name="AllRecipesTab"
        component={AllRecipesStackScreen}
        options={{
          tabBarLabel: "Tüm Yemekler",
        }}
      />
      <Tab.Screen
        name="FavoritesTab"
        component={FavoritesStackScreen}
        options={{
          tabBarLabel: "Favoriler",
        }}
      />
    </Tab.Navigator>
  );
}