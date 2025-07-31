import React, { useState, useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors } from "./src/theme/design-tokens";

// Contexts
import { PremiumProvider } from "./src/contexts/PremiumContext";

// Screens
import HomeScreen from "./src/screens/HomeScreen";
import RecipeDetailScreen from "./src/screens/RecipeDetailScreen";
import RecipeResultsScreen from "./src/screens/RecipeResultsScreen";
import FavoritesScreen from "./src/screens/FavoritesScreen";
import AllRecipesScreen from "./src/screens/AllRecipesScreen";
import OnboardingScreen from "./src/screens/OnboardingScreen";
import PremiumScreen from "./src/screens/PremiumScreen";

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

// For backward compatibility
export type RootStackParamList = HomeStackParamList;

const HomeStack = createStackNavigator<HomeStackParamList>();
const FavoritesStack = createStackNavigator<FavoritesStackParamList>();
const AllRecipesStack = createStackNavigator<AllRecipesStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

// Home Stack Navigator
function HomeStackScreen() {
  return (
    <HomeStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.primary[500],
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: colors.neutral[0],
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
function AllRecipesStackScreen() {
  return (
    <AllRecipesStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.primary[500],
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: colors.neutral[0],
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
function FavoritesStackScreen() {
  return (
    <FavoritesStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.primary[500],
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: colors.neutral[0],
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

export default function App(): JSX.Element {
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState<boolean | null>(null);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const completed = await AsyncStorage.getItem("onboarding_completed");
      setIsOnboardingCompleted(completed === "true");
    } catch (error) {
      console.error("Onboarding check error:", error);
      setIsOnboardingCompleted(false);
    }
  };

  const handleOnboardingComplete = () => {
    setIsOnboardingCompleted(true);
  };

  // Loading durumu
  if (isOnboardingCompleted === null) {
    return <></>;
  }

  // Onboarding göster
  if (!isOnboardingCompleted) {
    return (
      <SafeAreaProvider>
        <OnboardingScreen onComplete={handleOnboardingComplete} />
        <StatusBar style="light" />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <PremiumProvider>
        <NavigationContainer>
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
              tabBarInactiveTintColor: colors.neutral[400],
              tabBarStyle: {
                backgroundColor: colors.neutral[0],
                borderTopColor: colors.neutral[200],
                borderTopWidth: 1,
                paddingBottom: 4,
                paddingTop: 4,
                height: 60,
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
        </NavigationContainer>
      </PremiumProvider>
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}
