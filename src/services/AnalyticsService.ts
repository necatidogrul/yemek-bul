/**
 * Production Analytics & Crash Reporting Service
 * Combines Firebase Analytics, Crashlytics, and custom tracking
 */

import DeviceInfo from 'react-native-device-info';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Logger } from '../services/LoggerService';
// import crashlytics from '@react-native-firebase/crashlytics';
// import analytics from '@react-native-firebase/analytics';
import { Platform } from 'react-native';

// Types
export interface UserProperties {
  userId?: string;
  favoriteCount?: number;
  lastActiveDate?: string;
  appVersion?: string;
  deviceType?: string;
  language?: string;
  // ASO tracking
  installSource?: string;
  firstSessionKeywords?: string[];
  organicInstall?: boolean;
}

export interface AnalyticsEvent {
  name: string;
  parameters?: Record<string, any>;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
}

interface CrashData {
  error: Error;
  userId?: string;
  context?: Record<string, any>;
  breadcrumbs?: string[];
}

class AnalyticsServiceClass {
  private isEnabled = true;
  private sessionId: string;
  private userId?: string;
  private breadcrumbs: string[] = [];
  private sessionStartTime = Date.now();

  constructor() {
    this.sessionId = Date.now().toString();
    this.initializeAnalytics();
  }

  private async initializeAnalytics() {
    try {
      // Set default user properties
      const deviceInfo = await this.getDeviceInfo();
      await this.setUserProperties(deviceInfo);

      // Enable/disable based on environment
      this.isEnabled = !__DEV__ || false; // Disable in development

      if (__DEV__) {
        Logger.info('📊 Analytics initialized (development mode)');
      }
    } catch (error) {
      Logger.warn('Analytics initialization failed:', error);
    }
  }

  // ===============================
  // User Management
  // ===============================

  async setUser(userId: string) {
    this.userId = userId;

    try {
      if (this.isEnabled) {
        // await analytics().setUserId(userId);
        // await crashlytics().setUserId(userId);

        this.logDebug('User ID set', { userId });
      }
    } catch (error) {
      Logger.warn('Failed to set user ID:', error);
    }
  }

  async setUserProperties(properties: Partial<UserProperties>) {
    try {
      if (this.isEnabled) {
        // await analytics().setUserProperties(properties);

        // Store locally for crash reporting
        await AsyncStorage.setItem(
          'user_properties',
          JSON.stringify(properties)
        );

        this.logDebug('User properties updated', properties);
      }
    } catch (error) {
      Logger.warn('Failed to set user properties:', error);
    }
  }

  // ===============================
  // Event Tracking
  // ===============================

  async trackEvent(eventName: string, parameters: Record<string, any> = {}) {
    try {
      if (!this.isEnabled) return;

      const eventData: AnalyticsEvent = {
        name: eventName,
        parameters: {
          ...parameters,
          platform: Platform.OS,
          app_version: await DeviceInfo.getVersion(),
          session_id: this.sessionId,
          user_id: this.userId,
        },
        timestamp: new Date(),
        userId: this.userId,
        sessionId: this.sessionId,
      };

      // await analytics().logEvent(eventName, eventData.parameters);

      // Store locally for debugging
      if (__DEV__) {
        Logger.info(`📊 Event: ${eventName}`, eventData.parameters);
      }

      this.addBreadcrumb(`Event: ${eventName}`);
    } catch (error) {
      Logger.warn('Failed to track event:', error);
    }
  }

  // ===============================
  // App Lifecycle Events
  // ===============================

  async trackAppLaunch() {
    await this.trackEvent('app_launch', {
      session_id: this.sessionId,
      launch_time: Date.now(),
    });
  }

  async trackAppBackground() {
    const sessionDuration = Date.now() - this.sessionStartTime;
    await this.trackEvent('app_background', {
      session_duration: sessionDuration,
      session_id: this.sessionId,
    });
  }

  async trackScreenView(screenName: string, previousScreen?: string) {
    await this.trackEvent('screen_view', {
      screen_name: screenName,
      previous_screen: previousScreen,
    });
  }

  // ===============================
  // Recipe & Food Events
  // ===============================

  async trackRecipeSearch(ingredients: string[], resultCount: number) {
    await this.trackEvent('recipe_search', {
      ingredient_count: ingredients.length,
      ingredients: ingredients.join(','),
      result_count: resultCount,
      search_type: 'ingredient_based',
    });
  }

  async trackAIRecipeGeneration(ingredients: string[], success: boolean) {
    await this.trackEvent('ai_recipe_generation', {
      ingredient_count: ingredients.length,
      ingredients: ingredients.join(','),
      success,
      generation_method: 'openai_gpt',
    });
  }

  async trackRecipeView(
    recipeId: string,
    source: 'ai' | 'database' | 'community'
  ) {
    await this.trackEvent('recipe_view', {
      recipe_id: recipeId,
      recipe_source: source,
    });
  }

  async trackRecipeFavorite(recipeId: string, action: 'add' | 'remove') {
    await this.trackEvent('recipe_favorite', {
      recipe_id: recipeId,
      action,
    });
  }

  // ===============================
  // User Engagement Events
  // ===============================

  async trackFeatureUsage(
    featureName: string,
    usageData: Record<string, any> = {}
  ) {
    await this.trackEvent('feature_usage', {
      feature_name: featureName,
      ...usageData,
    });
  }

  async trackSearchHistory(action: 'view' | 'clear' | 'repeat_search') {
    await this.trackEvent('search_history', { action });
  }

  // ASO Keyword Tracking
  async trackKeywordUsage(keywords: string[], resultCount: number, successful: boolean) {
    await this.trackEvent('aso_keyword_usage', {
      keywords: keywords.join(','),
      result_count: resultCount,
      successful,
      search_method: 'ingredient_input'
    });
  }

  async trackPopularSearchTerms(term: string, frequency: number) {
    await this.trackEvent('popular_search_terms', {
      search_term: term,
      frequency
    });
  }

  async trackVoiceCommand(success: boolean, command?: string) {
    await this.trackEvent('voice_command', {
      success,
      command_type: command,
    });
  }

  async trackOfflineUsage(feature: string, cacheHit: boolean) {
    await this.trackEvent('offline_usage', {
      feature,
      cache_hit: cacheHit,
    });
  }

  // ===============================
  // Error & Crash Reporting
  // ===============================

  reportError(error: Error, context: Record<string, any> = {}) {
    try {
      const crashData: CrashData = {
        error,
        userId: this.userId,
        context: {
          ...context,
          platform: Platform.OS,
          session_id: this.sessionId,
          breadcrumbs: this.breadcrumbs.slice(-10), // Last 10 breadcrumbs
        },
      };

      if (this.isEnabled) {
        // await crashlytics().recordError(error);
        // await crashlytics().setAttributes(crashData.context);
      }

      // Development logging
      if (__DEV__) {
        Logger.error('🚨 Error reported:', {
          message: error.message,
          stack: error.stack,
          context: crashData.context,
        });
      }

      this.addBreadcrumb(`Error: ${error.message}`);
    } catch (reportError) {
      Logger.warn('Failed to report error:', reportError);
    }
  }

  reportNonFatalError(message: string, details: Record<string, any> = {}) {
    const error = new Error(message);
    this.reportError(error, { ...details, fatal: false });
  }

  // ===============================
  // Performance Monitoring
  // ===============================

  async trackPerformance(
    operation: string,
    duration: number,
    success: boolean,
    details: Record<string, any> = {}
  ) {
    await this.trackEvent('performance_metric', {
      operation,
      duration_ms: duration,
      success,
      ...details,
    });
  }

  startTimer(operation: string): () => Promise<void> {
    const startTime = Date.now();

    return async (success = true, details: Record<string, any> = {}) => {
      const duration = Date.now() - startTime;
      await this.trackPerformance(operation, duration, success, details);
    };
  }

  // ===============================
  // Breadcrumbs & Debugging
  // ===============================

  addBreadcrumb(message: string) {
    const timestamp = new Date().toISOString().substr(11, 12);
    const breadcrumb = `${timestamp}: ${message}`;

    this.breadcrumbs.push(breadcrumb);

    // Keep only last 50 breadcrumbs
    if (this.breadcrumbs.length > 50) {
      this.breadcrumbs = this.breadcrumbs.slice(-50);
    }

    if (this.isEnabled) {
      // await crashlytics().log(breadcrumb);
    }
  }

  // ===============================
  // Device Information
  // ===============================

  private async getDeviceInfo(): Promise<Partial<UserProperties>> {
    try {
      const [version, deviceType, systemVersion] = await Promise.all([
        DeviceInfo.getVersion(),
        DeviceInfo.getDeviceType(),
        DeviceInfo.getSystemVersion(),
      ]);

      return {
        appVersion: version,
        deviceType: deviceType,
        language: Platform.OS === 'ios' ? 'tr' : 'tr', // Default to Turkish
      };
    } catch (error) {
      Logger.warn('Failed to get device info:', error);
      return {};
    }
  }

  // ===============================
  // A/B Testing Support
  // ===============================

  async getRemoteConfig(key: string, defaultValue: any): Promise<any> {
    try {
      // TODO: Implement Firebase Remote Config
      // const config = await remoteConfig().getValue(key);
      // return config.asString() || defaultValue;

      return defaultValue;
    } catch (error) {
      Logger.warn('Failed to get remote config:', error);
      return defaultValue;
    }
  }

  // ===============================
  // Debug & Development
  // ===============================

  private logDebug(message: string, data?: any) {
    if (__DEV__) {
      Logger.info(`📊 Analytics: ${message}`, data || '');
    }
  }

  // Get debug information
  getDebugInfo(): object {
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      sessionDuration: Date.now() - this.sessionStartTime,
      breadcrumbCount: this.breadcrumbs.length,
      isEnabled: this.isEnabled,
      lastBreadcrumbs: this.breadcrumbs.slice(-5),
    };
  }

  // Manual session control
  startNewSession() {
    this.sessionId = Date.now().toString();
    this.sessionStartTime = Date.now();
    this.breadcrumbs = [];
    this.addBreadcrumb('New session started');
  }

  // ===============================
  // Privacy Controls
  // ===============================

  async enableAnalytics() {
    this.isEnabled = true;
    await AsyncStorage.setItem('analytics_enabled', 'true');
    // await analytics().setAnalyticsCollectionEnabled(true);
    this.logDebug('Analytics enabled');
  }

  async disableAnalytics() {
    this.isEnabled = false;
    await AsyncStorage.setItem('analytics_enabled', 'false');
    // await analytics().setAnalyticsCollectionEnabled(false);
    this.logDebug('Analytics disabled');
  }

  async isAnalyticsEnabled(): Promise<boolean> {
    try {
      const enabled = await AsyncStorage.getItem('analytics_enabled');
      return enabled !== 'false'; // Default to enabled
    } catch {
      return true;
    }
  }
}

// Singleton instance
export const Analytics = new AnalyticsServiceClass();

// Convenience functions for easy usage
export const trackEvent = (name: string, params?: Record<string, any>) =>
  Analytics.trackEvent(name, params);
export const trackScreen = (screenName: string, previousScreen?: string) =>
  Analytics.trackScreenView(screenName, previousScreen);
export const reportError = (error: Error, context?: Record<string, any>) =>
  Analytics.reportError(error, context);
export const addBreadcrumb = (message: string) =>
  Analytics.addBreadcrumb(message);
