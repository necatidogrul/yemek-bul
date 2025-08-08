/**
 * Production Performance Monitoring Service
 * Tracks app performance, memory usage, and user experience metrics
 */

import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { Analytics } from './AnalyticsService';
import { Logger } from './LoggerService';

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
  success?: boolean;
}

interface AppPerformanceData {
  appStartTime: number;
  memoryUsage?: number;
  activeMetrics: Map<string, PerformanceMetric>;
  completedMetrics: PerformanceMetric[];
  deviceInfo?: any;
}

class PerformanceServiceClass {
  private performanceData: AppPerformanceData;
  private isEnabled = !__DEV__; // Disabled in development by default
  private maxMetricsHistory = 100;

  constructor() {
    this.performanceData = {
      appStartTime: Date.now(),
      activeMetrics: new Map(),
      completedMetrics: [],
    };

    this.initializePerformanceMonitoring();
  }

  private async initializePerformanceMonitoring() {
    if (!this.isEnabled) return;

    try {
      // Collect device performance baseline
      const deviceInfo = await this.collectDeviceInfo();
      this.performanceData.deviceInfo = deviceInfo;

      // Set up memory monitoring
      this.startMemoryMonitoring();

      // Track app startup performance
      this.trackAppStartup();

      Logger.info('Performance monitoring initialized', { deviceInfo });
    } catch (error) {
      Logger.error('Performance monitoring initialization failed', error);
    }
  }

  // ===============================
  // Core Performance Tracking
  // ===============================

  startTracking(operationName: string, metadata: Record<string, any> = {}): string {
    const trackingId = `${operationName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const metric: PerformanceMetric = {
      name: operationName,
      startTime: performance.now(),
      metadata: {
        ...metadata,
        trackingId,
        timestamp: new Date().toISOString(),
      },
    };

    this.performanceData.activeMetrics.set(trackingId, metric);

    if (__DEV__) {
      Logger.debug(`Performance tracking started: ${operationName}`, { trackingId });
    }

    return trackingId;
  }

  endTracking(trackingId: string, success = true, additionalMetadata: Record<string, any> = {}): PerformanceMetric | null {
    const metric = this.performanceData.activeMetrics.get(trackingId);
    
    if (!metric) {
      Logger.warn('Performance tracking end called for non-existent tracking ID', { trackingId });
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - metric.startTime;

    const completedMetric: PerformanceMetric = {
      ...metric,
      endTime,
      duration,
      success,
      metadata: {
        ...metric.metadata,
        ...additionalMetadata,
        endTimestamp: new Date().toISOString(),
      },
    };

    // Remove from active tracking
    this.performanceData.activeMetrics.delete(trackingId);

    // Add to completed metrics
    this.performanceData.completedMetrics.push(completedMetric);

    // Keep only recent metrics
    if (this.performanceData.completedMetrics.length > this.maxMetricsHistory) {
      this.performanceData.completedMetrics = this.performanceData.completedMetrics.slice(-this.maxMetricsHistory);
    }

    // Report to analytics
    if (this.isEnabled) {
      Analytics.trackPerformance(metric.name, duration, success, completedMetric.metadata);
    }

    if (__DEV__) {
      const emoji = success ? '✅' : '❌';
      const color = duration > 1000 ? '🐌' : duration > 500 ? '🟡' : '⚡';
      Logger.debug(`${emoji} ${color} Performance: ${metric.name} completed in ${duration.toFixed(2)}ms`, {
        trackingId,
        success,
        duration,
      });
    }

    // Alert for slow operations
    if (duration > 2000 && success) {
      Logger.warn(`Slow operation detected: ${metric.name}`, { duration, trackingId });
    }

    return completedMetric;
  }

  // ===============================
  // Convenience Methods
  // ===============================

  async measureAsync<T>(
    operationName: string, 
    operation: () => Promise<T>, 
    metadata: Record<string, any> = {}
  ): Promise<T> {
    const trackingId = this.startTracking(operationName, metadata);
    
    try {
      const result = await operation();
      this.endTracking(trackingId, true, { resultType: typeof result });
      return result;
    } catch (error) {
      this.endTracking(trackingId, false, { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  measureSync<T>(
    operationName: string, 
    operation: () => T, 
    metadata: Record<string, any> = {}
  ): T {
    const trackingId = this.startTracking(operationName, metadata);
    
    try {
      const result = operation();
      this.endTracking(trackingId, true, { resultType: typeof result });
      return result;
    } catch (error) {
      this.endTracking(trackingId, false, { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  // ===============================
  // App-Specific Performance Tracking
  // ===============================

  // Recipe Search Performance
  async trackRecipeSearch(operation: () => Promise<any>, ingredientCount: number): Promise<any> {
    return this.measureAsync('recipe_search', operation, { 
      ingredient_count: ingredientCount 
    });
  }

  // AI Recipe Generation Performance
  async trackAIGeneration(operation: () => Promise<any>, tokenCount?: number): Promise<any> {
    return this.measureAsync('ai_recipe_generation', operation, { 
      estimated_tokens: tokenCount 
    });
  }

  // Database Query Performance
  async trackDatabaseQuery(operation: () => Promise<any>, queryType: string): Promise<any> {
    return this.measureAsync('database_query', operation, { 
      query_type: queryType 
    });
  }

  // Screen Loading Performance
  trackScreenLoad(screenName: string): () => void {
    const trackingId = this.startTracking('screen_load', { screen_name: screenName });
    
    return (success = true) => {
      this.endTracking(trackingId, success);
    };
  }

  // Image Loading Performance
  trackImageLoad(imageUri: string, size?: { width: number; height: number }): () => void {
    const trackingId = this.startTracking('image_load', { 
      image_uri: imageUri,
      image_size: size 
    });
    
    return (success = true) => {
      this.endTracking(trackingId, success);
    };
  }

  // ===============================
  // Memory Monitoring
  // ===============================

  private startMemoryMonitoring() {
    if (!this.isEnabled || Platform.OS !== 'android') return;

    // Monitor memory every 30 seconds
    const memoryInterval = setInterval(async () => {
      try {
        const memoryUsage = await this.getCurrentMemoryUsage();
        this.performanceData.memoryUsage = memoryUsage;

        // Alert on high memory usage
        if (memoryUsage > 100) { // 100MB threshold
          Logger.warn('High memory usage detected', { memoryUsage: `${memoryUsage}MB` });
          
          if (this.isEnabled) {
            Analytics.trackEvent('high_memory_usage', {
              memory_usage_mb: memoryUsage,
              active_metrics: this.performanceData.activeMetrics.size,
            });
          }
        }
      } catch (error) {
        Logger.error('Memory monitoring failed', error);
        clearInterval(memoryInterval);
      }
    }, 30000);

    // Clear interval after 30 minutes to prevent memory leaks
    setTimeout(() => clearInterval(memoryInterval), 30 * 60 * 1000);
  }

  private async getCurrentMemoryUsage(): Promise<number> {
    try {
      // This would need a native module for accurate memory usage
      // For now, return estimated usage
      const baseMemory = 50; // Base app memory in MB
      const metricMemory = this.performanceData.completedMetrics.length * 0.1;
      return baseMemory + metricMemory;
    } catch (error) {
      return 0;
    }
  }

  // ===============================
  // Device Performance Info
  // ===============================

  private async collectDeviceInfo(): Promise<any> {
    try {
      const [
        deviceType,
        totalMemory,
        systemVersion,
        buildNumber,
        isTablet,
      ] = await Promise.all([
        DeviceInfo.getDeviceType(),
        DeviceInfo.getTotalMemory().catch(() => 0),
        DeviceInfo.getSystemVersion(),
        DeviceInfo.getBuildNumber(),
        DeviceInfo.isTablet(),
      ]);

      return {
        deviceType,
        totalMemoryMB: Math.round(totalMemory / (1024 * 1024)),
        systemVersion,
        buildNumber,
        isTablet,
        platform: Platform.OS,
        platformVersion: Platform.Version,
      };
    } catch (error) {
      Logger.error('Failed to collect device info', error);
      return {};
    }
  }

  // ===============================
  // App Startup Performance
  // ===============================

  private trackAppStartup() {
    const startupTime = Date.now() - this.performanceData.appStartTime;
    
    if (this.isEnabled) {
      Analytics.trackEvent('app_startup_time', {
        startup_time_ms: startupTime,
        cold_start: true, // Assume cold start for now
      });
    }

    Logger.info('App startup completed', { startupTimeMs: startupTime });
  }

  // ===============================
  // Performance Reports
  // ===============================

  getPerformanceReport(): {
    summary: any;
    slowOperations: PerformanceMetric[];
    recentMetrics: PerformanceMetric[];
    activeTracking: number;
  } {
    const completedMetrics = this.performanceData.completedMetrics;
    const slowOperations = completedMetrics
      .filter(metric => metric.duration && metric.duration > 1000)
      .sort((a, b) => (b.duration || 0) - (a.duration || 0))
      .slice(0, 10);

    const avgDuration = completedMetrics.length > 0
      ? completedMetrics.reduce((sum, metric) => sum + (metric.duration || 0), 0) / completedMetrics.length
      : 0;

    const successRate = completedMetrics.length > 0
      ? completedMetrics.filter(metric => metric.success !== false).length / completedMetrics.length
      : 0;

    return {
      summary: {
        totalOperations: completedMetrics.length,
        averageDurationMs: Math.round(avgDuration),
        successRate: Math.round(successRate * 100),
        slowOperationCount: slowOperations.length,
        memoryUsageMB: this.performanceData.memoryUsage,
        uptimeMs: Date.now() - this.performanceData.appStartTime,
      },
      slowOperations,
      recentMetrics: completedMetrics.slice(-10),
      activeTracking: this.performanceData.activeMetrics.size,
    };
  }

  // Export performance data for debugging
  exportPerformanceData(): string {
    const report = this.getPerformanceReport();
    const deviceInfo = this.performanceData.deviceInfo;
    
    const exportData = {
      timestamp: new Date().toISOString(),
      appVersion: '1.0.0', // TODO: Get from package.json
      deviceInfo,
      performanceReport: report,
    };

    return JSON.stringify(exportData, null, 2);
  }

  // ===============================
  // Configuration
  // ===============================

  enablePerformanceTracking() {
    this.isEnabled = true;
    Logger.info('Performance tracking enabled');
  }

  disablePerformanceTracking() {
    this.isEnabled = false;
    Logger.info('Performance tracking disabled');
  }

  isPerformanceTrackingEnabled(): boolean {
    return this.isEnabled;
  }

  // Clear performance data (for privacy/memory management)
  clearPerformanceData() {
    this.performanceData.completedMetrics = [];
    this.performanceData.activeMetrics.clear();
    Logger.info('Performance data cleared');
  }

  // ===============================
  // React Navigation Performance
  // ===============================

  // Track navigation performance
  trackNavigation(routeName: string, params?: any): () => void {
    const trackingId = this.startTracking('navigation', { 
      route_name: routeName,
      params: params ? Object.keys(params) : undefined,
    });
    
    return (success = true) => {
      this.endTracking(trackingId, success);
    };
  }
}

// Singleton instance
export const PerformanceMonitor = new PerformanceServiceClass();

// Convenience functions
export const measureAsync = <T>(name: string, operation: () => Promise<T>, metadata?: Record<string, any>) =>
  PerformanceMonitor.measureAsync(name, operation, metadata);

export const measureSync = <T>(name: string, operation: () => T, metadata?: Record<string, any>) =>
  PerformanceMonitor.measureSync(name, operation, metadata);

export const trackScreen = (screenName: string) => PerformanceMonitor.trackScreenLoad(screenName);

export const trackNavigation = (routeName: string, params?: any) => 
  PerformanceMonitor.trackNavigation(routeName, params);