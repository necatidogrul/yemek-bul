/**
 * Environment Configuration
 * 
 * Bu dosya development/test/production ortamları için
 * güvenli bir configuration sistemi sağlar.
 */

export type Environment = 'development' | 'testing' | 'production';

// Current environment detection
export const getCurrentEnvironment = (): Environment => {
  // Check if explicitly set for testing
  if (process.env.EXPO_PUBLIC_ENVIRONMENT === 'testing') {
    return 'testing';
  }
  
  // Check if in development
  if (__DEV__) {
    return 'development';
  }
  
  return 'production';
};

export const ENV = getCurrentEnvironment();

// Environment-specific configurations
export const CONFIG = {
  development: {
    // Development ortamı - tam test özgürlüğü
    initialCredits: 100,
    enableAdminFeatures: true,
    enableDebugLogs: true,
    mockServices: true,
    allowDebugMenu: true,
  },
  testing: {
    // Test ortamı - production koşulları simülasyonu
    initialCredits: 1,
    enableAdminFeatures: false, // ❌ Admin panel KAPALI
    enableDebugLogs: false,
    mockServices: false,
    allowDebugMenu: false,
  },
  production: {
    // Production ortamı - gerçek App Store
    initialCredits: 1,
    enableAdminFeatures: false, // ❌ Admin panel KAPALI
    enableDebugLogs: false,
    mockServices: false,
    allowDebugMenu: false,
  },
};

// Current environment config
export const CURRENT_CONFIG = CONFIG[ENV];

// Utility functions
export const isDevelopment = () => ENV === 'development';
export const isTesting = () => ENV === 'testing';
export const isProduction = () => ENV === 'production';

// Safe admin check - sadece development'da true
export const canShowAdminFeatures = () => {
  return ENV === 'development' && CURRENT_CONFIG.enableAdminFeatures;
};

// Debug logging helper
export const debugLog = (message: string, ...args: any[]) => {
  if (CURRENT_CONFIG.enableDebugLogs) {
    console.log(`[${ENV.toUpperCase()}] ${message}`, ...args);
  }
};

// Credit system helpers
export const getInitialCredits = () => CURRENT_CONFIG.initialCredits;
export const shouldUseMockServices = () => CURRENT_CONFIG.mockServices;

console.log(`🌍 Environment: ${ENV}`);
console.log(`⚙️ Config:`, CURRENT_CONFIG);