/**
 * Mobile Offline Service - React Native
 *
 * Features:
 * - Background app state management
 * - Network connectivity monitoring
 * - Background sync when app becomes active
 * - Push notifications (React Native)
 * - App state persistence
 */

import { AppState, AppStateStatus, Platform, InteractionManager } from 'react-native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface QueueItem {
  id: string;
  [key: string]: any;
}

export class MobileOfflineService {
  private static instance: MobileOfflineService;
  private appStateSubscription: any = null;
  private networkSubscription: any = null;
  private isOnline: boolean = true;
  private appState: AppStateStatus = 'active';

  private constructor() {
    this.initializeService();
  }

  static getInstance(): MobileOfflineService {
    if (!MobileOfflineService.instance) {
      MobileOfflineService.instance = new MobileOfflineService();
    }
    return MobileOfflineService.instance;
  }

  /**
   * Service'i başlat
   */
  private async initializeService(): Promise<void> {
    try {
      console.log('🚀 Initializing mobile offline service...');

      // Network monitoring başlat
      await this.setupNetworkMonitoring();

      // App state monitoring başlat
      this.setupAppStateMonitoring();

      // Push notifications setup
      this.setupPushNotifications();

      // Background job setup
      this.setupBackgroundJobs();

      console.log('✅ Mobile offline service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize mobile offline service:', error);
    }
  }

  /**
   * Network monitoring kur
   */
  private async setupNetworkMonitoring(): Promise<void> {
    // İlk network durumunu al
    const netInfo = await NetInfo.fetch();
    this.isOnline = netInfo.isConnected === true && netInfo.isInternetReachable === true;

    console.log('📶 Initial network state:', this.isOnline ? 'Online' : 'Offline');

    // Network değişikliklerini dinle
    this.networkSubscription = NetInfo.addEventListener((state: NetInfoState) => {
      const wasOnline = this.isOnline;
      this.isOnline = state.isConnected === true && state.isInternetReachable === true;

      console.log('📶 Network state changed:', this.isOnline ? 'Online' : 'Offline');

      if (!wasOnline && this.isOnline) {
        // Offline'dan online'a geçtik
        this.handleBecameOnline();
      } else if (wasOnline && !this.isOnline) {
        // Online'dan offline'a geçtik
        this.handleBecameOffline();
      }
    });
  }

  /**
   * App state monitoring kur
   */
  private setupAppStateMonitoring(): void {
    this.appStateSubscription = AppState.addEventListener('change', nextAppState => {
      const previousState = this.appState;
      this.appState = nextAppState;

      console.log('📱 App state changed:', previousState, '->', nextAppState);

      if (previousState === 'background' && nextAppState === 'active') {
        // App background'dan active'e geçti
        this.handleAppBecameActive();
      } else if (previousState === 'active' && nextAppState === 'background') {
        // App active'den background'a geçti
        this.handleAppBecameBackground();
      }
    });
  }

  /**
   * Push notifications kur
   */
  private setupPushNotifications(): void {
    // Push notification desteği kaldırıldı
    console.log('⚠️ Push notifications not supported');
  }

  /**
   * Background jobs kur
   */
  private setupBackgroundJobs(): void {
    // Platform'a göre background işlemleri
    if (Platform.OS === 'ios') {
      // iOS'ta AppState değişimlerini dinleyerek sync yapalım
      AppState.addEventListener('change', nextState => {
        if (nextState === 'active') {
          InteractionManager.runAfterInteractions(() => {
            this.performBackgroundSync();
          });
        }
      });
    } else {
      // Android'de setInterval ile periyodik sync yapalım
      setInterval(() => {
        if (this.isOnline && this.appState === 'active') {
          this.performBackgroundSync();
        }
      }, 30 * 60 * 1000); // 30 dakika
    }
  }

  /**
   * Online durumuna geçince
   */
  private async handleBecameOnline(): Promise<void> {
    console.log('🌐 App became online');

    try {
      // Offline queue'yu sync et
      await this.syncOfflineQueue();

      // Stale cache'leri güncelle
      await this.refreshStaleCache();

      // Kullanıcıya bildir
      this.showLocalNotification('🌐 Online', {
        body: 'İnternet bağlantısı geri geldi. Veriler güncelleniyor...',
        autoCancel: true,
      });
    } catch (error) {
      console.error('❌ Failed to handle online state:', error);
    }
  }

  /**
   * Offline durumuna geçince
   */
  private handleBecameOffline(): void {
    console.log('📱 App became offline');

    // Kullanıcıya bildir
    this.showLocalNotification('📱 Offline Mod', {
      body: 'İnternet bağlantısı yok. Kaydedilmiş tarifler kullanılabilir.',
      autoCancel: false,
    });
  }

  /**
   * App active durumuna geçince
   */
  private async handleAppBecameActive(): Promise<void> {
    console.log('👀 App became active');

    if (this.isOnline) {
      // Online'sa data'ları güncelle
      await this.syncWhenActive();
    }
  }

  /**
   * App background durumuna geçince
   */
  private async handleAppBecameBackground(): Promise<void> {
    console.log('📱 App went to background');

    // App state'i kaydet
    await this.saveAppState();

    // Background işlemleri (eğer online'sa)
    if (this.isOnline) {
      if (Platform.OS === 'ios') {
        // iOS'ta bir sonraki app state değişiminde sync yapılacak
        console.log('iOS background handling: next app state change will trigger sync');
      } else {
        // Android'de setInterval ile devam ediyor
        console.log('Android background handling: periodic sync continues');
      }
    }
  }

  /**
   * Background sync işlemleri
   */
  private async performBackgroundSync(): Promise<void> {
    try {
      console.log('🔄 Performing background sync...');

      if (!this.isOnline) {
        console.log('📱 Offline - skipping background sync');
        return;
      }

      // Offline queue'yu sync et
      await this.syncOfflineQueue();

      // User'ın son activity'sini kaydet
      await AsyncStorage.setItem('@yemek_bulucu:last_sync', Date.now().toString());

      console.log('✅ Background sync completed');
    } catch (error) {
      console.error('❌ Background sync failed:', error);
    }
  }

  /**
   * App active olunca sync
   */
  private async syncWhenActive(): Promise<void> {
    try {
      // Son sync zamanını kontrol et
      const lastSync = await AsyncStorage.getItem('@yemek_bulucu:last_sync');
      const timeSinceSync = Date.now() - (lastSync ? parseInt(lastSync) : 0);

      // 5 dakikadan fazla geçmişse sync yap
      if (timeSinceSync > 5 * 60 * 1000) {
        console.log('🔄 Syncing data after becoming active...');

        const userId = await this.getCurrentUserId();
        if (userId) {
          const { RecipeService } = await import('./recipeService');
          await RecipeService.syncLocalDataToServer(userId);
        }
      }
    } catch (error) {
      console.error('❌ Active sync failed:', error);
    }
  }

  /**
   * Offline queue'yu sync et
   */
  private async syncOfflineQueue(): Promise<void> {
    try {
      const { MobileStorageService } = await import('./localStorageService');
      const queue = await MobileStorageService.getOfflineQueue();

      for (const item of queue) {
        try {
          await this.processQueueItem(item);
          // Başarılı item'ı queue'dan kaldır
          await this.removeFromQueue(item.id);
        } catch (error) {
          console.warn('⚠️ Queue item failed:', item.id, error);
        }
      }
    } catch (error) {
      console.error('❌ Offline queue sync failed:', error);
    }
  }

  /**
   * Stale cache'leri yenile
   */
  private async refreshStaleCache(): Promise<void> {
    try {
      console.log('🔄 Refreshing stale cache...');

      const { MobileStorageService } = await import('./localStorageService');
      // Cache refresh logic burada implement edilecek
    } catch (error) {
      console.warn('⚠️ Cache refresh failed:', error);
    }
  }

  /**
   * Local notification göster
   */
  showLocalNotification(title: string, options: any = {}): void {
    // Push notification desteği kaldırıldı
    console.log('⚠️ Local notifications not supported:', { title, options });
  }

  // Push notification desteği kaldırıldı

  /**
   * App state'i kaydet
   */
  private async saveAppState(): Promise<void> {
    try {
      const appState = {
        lastActiveTime: Date.now(),
        appVersion: '1.0.0',
        backgroundTime: Date.now(),
      };

      await AsyncStorage.setItem('@yemek_bulucu:app_state', JSON.stringify(appState));
    } catch (error) {
      console.warn('⚠️ Failed to save app state:', error);
    }
  }

  /**
   * Current user ID al
   */
  private async getCurrentUserId(): Promise<string | null> {
    try {
      const userSession = await AsyncStorage.getItem('@yemek_bulucu:user_session');
      return userSession ? JSON.parse(userSession).userId : null;
    } catch {
      return null;
    }
  }

  /**
   * Queue item'ı işle
   */
  private async processQueueItem(item: QueueItem): Promise<void> {
    // Queue item processing logic
    console.log('Processing queue item:', item);
  }

  /**
   * Item'ı queue'dan kaldır
   */
  private async removeFromQueue(itemId: string): Promise<void> {
    // Queue removal logic
    console.log('Removing from queue:', itemId);
  }

  // Public API

  /**
   * Network durumu
   */
  getNetworkState(): boolean {
    return this.isOnline;
  }

  /**
   * App durumu
   */
  getAppState(): AppStateStatus {
    return this.appState;
  }

  /**
   * Manuel sync tetikle
   */
  async triggerSync(): Promise<void> {
    if (this.isOnline) {
      await this.performBackgroundSync();
    }
  }

  /**
   * Service'i temizle
   */
  cleanup(): void {
    if (this.networkSubscription) {
      this.networkSubscription();
    }

    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }

    // Background işlemleri temizle
    if (Platform.OS === 'ios') {
      AppState.addEventListener('change', () => {}).remove();
    }
  }
}

// Export singleton instance
export const mobileOfflineService = MobileOfflineService.getInstance();
