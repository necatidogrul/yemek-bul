import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserPreferences {
  dietaryRestrictions: string[];
  allergies: string[];
  cuisineTypes: string[];
  cookingExperience: string;
  notificationsEnabled: boolean;
  onboardingCompleted: boolean;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  dietaryRestrictions: [],
  allergies: [],
  cuisineTypes: [],
  cookingExperience: '',
  notificationsEnabled: false,
  onboardingCompleted: false,
};

const STORAGE_KEYS = {
  USER_PREFERENCES: 'user_preferences',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  FIRST_TIME_TOUR: 'first_time_tour_completed',
} as const;

export class UserPreferencesService {
  /**
   * Get user preferences from storage
   */
  static async getUserPreferences(): Promise<UserPreferences> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
      const onboardingCompleted = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
      
      if (stored) {
        try {
          const preferences = JSON.parse(stored);
          return {
            ...DEFAULT_PREFERENCES,
            ...preferences,
            onboardingCompleted: onboardingCompleted === 'true',
          };
        } catch (parseError) {
          console.warn('Invalid user preferences stored, using defaults:', parseError);
          return {
            ...DEFAULT_PREFERENCES,
            onboardingCompleted: onboardingCompleted === 'true',
          };
        }
      }
      
      return {
        ...DEFAULT_PREFERENCES,
        onboardingCompleted: onboardingCompleted === 'true',
      };
    } catch (error) {
      console.error('Error getting user preferences:', error);
      // Even if there's an error, check onboarding status separately
      try {
        const onboardingCompleted = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
        return {
          ...DEFAULT_PREFERENCES,
          onboardingCompleted: onboardingCompleted === 'true',
        };
      } catch (onboardingError) {
        console.error('Error checking onboarding status:', onboardingError);
        return DEFAULT_PREFERENCES;
      }
    }
  }

  /**
   * Save user preferences to storage
   */
  static async saveUserPreferences(preferences: Partial<UserPreferences>): Promise<void> {
    try {
      const current = await this.getUserPreferences();
      const updated = { ...current, ...preferences };
      
      await AsyncStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(updated));
      
      if (preferences.onboardingCompleted !== undefined) {
        await AsyncStorage.setItem(
          STORAGE_KEYS.ONBOARDING_COMPLETED, 
          preferences.onboardingCompleted.toString()
        );
      }
    } catch (error) {
      console.error('Error saving user preferences:', error);
      throw error;
    }
  }

  /**
   * Check if user has completed first-time tour
   */
  static async hasCompletedFirstTimeTour(): Promise<boolean> {
    try {
      const completed = await AsyncStorage.getItem(STORAGE_KEYS.FIRST_TIME_TOUR);
      return completed === 'true';
    } catch (error) {
      console.error('Error checking first time tour status:', error);
      return false;
    }
  }

  /**
   * Mark first-time tour as completed
   */
  static async markFirstTimeTourCompleted(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.FIRST_TIME_TOUR, 'true');
    } catch (error) {
      console.error('Error marking first time tour completed:', error);
      throw error;
    }
  }

  /**
   * Reset all user preferences and onboarding status (for testing/debugging)
   */
  static async resetAllPreferences(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.USER_PREFERENCES,
        STORAGE_KEYS.ONBOARDING_COMPLETED,
        STORAGE_KEYS.FIRST_TIME_TOUR,
      ]);
    } catch (error) {
      console.error('Error resetting preferences:', error);
      throw error;
    }
  }

  /**
   * Get dietary restrictions for recipe filtering
   */
  static async getDietaryRestrictions(): Promise<string[]> {
    const preferences = await this.getUserPreferences();
    return preferences.dietaryRestrictions;
  }

  /**
   * Get preferred cuisine types
   */
  static async getPreferredCuisines(): Promise<string[]> {
    const preferences = await this.getUserPreferences();
    return preferences.cuisineTypes;
  }

  /**
   * Get cooking experience level
   */
  static async getCookingExperience(): Promise<string> {
    const preferences = await this.getUserPreferences();
    return preferences.cookingExperience;
  }

  /**
   * Check if notifications are enabled
   */
  static async areNotificationsEnabled(): Promise<boolean> {
    const preferences = await this.getUserPreferences();
    return preferences.notificationsEnabled;
  }
}

export default UserPreferencesService;