// App Constants
export const APP_CONFIG = {
  name: 'YemekbulAI',
  version: '1.0.0',
  description: 'AI-powered recipe discovery app',
} as const;

// API Constants
export const API_ENDPOINTS = {
  // Add API endpoints here when needed
} as const;

// Storage Keys
export const STORAGE_KEYS = {
  USER_PREFERENCES: 'user_preferences',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  THEME_MODE: 'app_theme_mode',
} as const;

// Default Values
export const DEFAULT_VALUES = {
  COOKING_TIME: 30,
  SERVINGS: 4,
  DIFFICULTY: 'Orta',
} as const;
