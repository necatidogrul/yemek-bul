import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Application from 'expo-application';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from './LoggerService';

export class DeviceService {
  private static DEVICE_ID_KEY = 'device_id';
  private static SESSION_ID_KEY = 'session_id';

  /**
   * Unique device ID al veya oluştur
   */
  static async getDeviceId(): Promise<string> {
    try {
      // Önce storage'dan kontrol et
      let deviceId = await AsyncStorage.getItem(this.DEVICE_ID_KEY);

      if (!deviceId) {
        // Platform-specific device ID oluştur
        if (Platform.OS === 'ios') {
          // iOS için Application ID kullan
          deviceId = Application.androidId || `ios_${uuidv4()}`;
        } else if (Platform.OS === 'android') {
          // Android için Application ID kullan
          deviceId = Application.androidId || `android_${uuidv4()}`;
        } else {
          // Web için UUID
          deviceId = `web_${uuidv4()}`;
        }

        // Storage'a kaydet
        await AsyncStorage.setItem(this.DEVICE_ID_KEY, deviceId);
        Logger.info(`🆕 Generated new device ID: ${deviceId}`);
      } else {
        Logger.info(`📱 Found existing device ID: ${deviceId}`);
      }

      return deviceId;
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
   * Device bilgilerini al
   */
  static getDeviceInfo() {
    return {
      platform: Platform.OS,
      version: Platform.Version,
      isDevice: Platform.isPad || Platform.isTV,
      brand: Platform.select({
        ios: 'iOS',
        android: 'Android',
        default: 'Unknown',
      }),
    };
  }
}
