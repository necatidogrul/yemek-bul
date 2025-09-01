/**
 * Device Service
 *
 * Cihaz kimliği ve oturum yönetimi
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Application from 'expo-application';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from './LoggerService';

export class DeviceService {
  private static readonly DEVICE_ID_KEY = 'device_id';
  private static readonly SESSION_ID_KEY = 'session_id';

  /**
   * Cihaz ID'sini al veya oluştur
   */
  static async getDeviceId(): Promise<string> {
    try {
      let deviceId = await AsyncStorage.getItem(this.DEVICE_ID_KEY);

      if (!deviceId) {
        // Platform-specific device ID oluştur
        if (Platform.OS === 'ios') {
          // iOS için Application ID kullan
          try {
            const androidId = await Application.getAndroidId();
            deviceId = androidId || `ios_${uuidv4()}`;
          } catch {
            deviceId = `ios_${uuidv4()}`;
          }
        } else if (Platform.OS === 'android') {
          // Android için Application ID kullan
          try {
            const androidId = await Application.getAndroidId();
            deviceId = androidId || `android_${uuidv4()}`;
          } catch {
            deviceId = `android_${uuidv4()}`;
          }
        } else {
          // Web için UUID
          deviceId = `web_${uuidv4()}`;
        }

        // Storage'a kaydet
        if (deviceId) {
          await AsyncStorage.setItem(this.DEVICE_ID_KEY, deviceId);
          Logger.info(`🆕 Generated new device ID: ${deviceId}`);
        }
      } else {
        Logger.info(`📱 Found existing device ID: ${deviceId}`);
      }

      return deviceId || `fallback_${uuidv4()}`;
    } catch (error) {
      Logger.error('Failed to get device ID:', error);
      // Fallback UUID
      return `fallback_${uuidv4()}`;
    }
  }

  /**
   * Session ID al veya oluştur (günlük yenilenir)
   */
  static async getSessionId(): Promise<string> {
    try {
      const today = new Date().toDateString();
      const sessionKey = `${this.SESSION_ID_KEY}_${today}`;

      let sessionId = await AsyncStorage.getItem(sessionKey);

      if (!sessionId) {
        sessionId = `session_${Date.now()}_${uuidv4()}`;
        await AsyncStorage.setItem(sessionKey, sessionId);
        Logger.info(`🆕 Generated new session ID: ${sessionId}`);
      } else {
        Logger.info(`🔄 Found existing session ID: ${sessionId}`);
      }

      return sessionId;
    } catch (error) {
      Logger.error('Failed to get session ID:', error);
      return `session_${Date.now()}_${uuidv4()}`;
    }
  }

  /**
   * Cihaz bilgilerini al
   */
  static getDeviceInfo() {
    const platformInfo = Platform as any;
    return {
      platform: Platform.OS,
      version: Platform.Version,
      isDevice: platformInfo.isPad || platformInfo.isTV || false,
      brand: Platform.select({
        ios: 'iOS',
        android: 'Android',
        default: 'Unknown',
      }),
    };
  }

  /**
   * Cihaz tipini belirle
   */
  static getDeviceType(): 'phone' | 'tablet' | 'desktop' {
    const { width } = Platform.OS === 'web' 
      ? { width: window.innerWidth } 
      : { width: 375 }; // Default mobile width

    if (Platform.OS === 'web') {
      return width > 768 ? 'desktop' : 'phone';
    }

    const platformInfo = Platform as any;
    const isTablet = Platform.OS === 'ios' 
      ? platformInfo.isPad || false
      : width > 600;

    return isTablet ? 'tablet' : 'phone';
  }

  /**
   * Eski session ID'leri temizle
   */
  static async cleanOldSessions(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const sessionKeys = keys.filter(key =>
        key.startsWith(this.SESSION_ID_KEY)
      );

      const today = new Date().toDateString();
      const currentSessionKey = `${this.SESSION_ID_KEY}_${today}`;

      const oldSessionKeys = sessionKeys.filter(
        key => key !== currentSessionKey
      );

      if (oldSessionKeys.length > 0) {
        await AsyncStorage.multiRemove(oldSessionKeys);
        Logger.info(`🧹 Cleaned ${oldSessionKeys.length} old session IDs`);
      }
    } catch (error) {
      Logger.error('Failed to clean old sessions:', error);
    }
  }
}