import { Logger } from './LoggerService';

/**
 * Offline Service - Progressive Web App Features
 *
 * Features:
 * - Service Worker management
 * - Offline detection
 * - Background sync
 * - Push notifications
 * - App install prompt
 */

export class OfflineService {
  private static instance: OfflineService;
  private swRegistration: ServiceWorkerRegistration | null = null;
  private isAppInstallable = false;
  private deferredPrompt: any = null;

  private constructor() {
    this.initializeServiceWorker();
    this.setupEventListeners();
  }

  static getInstance(): OfflineService {
    if (!OfflineService.instance) {
      OfflineService.instance = new OfflineService();
    }
    return OfflineService.instance;
  }

  /**
   * Service Worker'ı başlat
   */
  private async initializeServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        Logger.info('🚀 Registering service worker...');

        this.swRegistration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        Logger.info('✅ Service Worker registered:', this.swRegistration.scope);

        // Service Worker güncellemelerini dinle
        this.swRegistration.addEventListener('updatefound', () => {
          Logger.info('🔄 Service Worker update found');
          const newWorker = this.swRegistration!.installing;

          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                Logger.info('✨ New Service Worker available');
                this.showUpdateAvailableNotification();
              }
            });
          }
        });
      } catch (error) {
        Logger.error('❌ Service Worker registration failed:', error);
      }
    } else {
      Logger.warn('⚠️ Service Worker not supported');
    }
  }

  /**
   * Event listener'ları kur
   */
  private setupEventListeners(): void {
    // Online/Offline durumunu dinle
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));

    // App install prompt'u dinle
    window.addEventListener('beforeinstallprompt', e => {
      Logger.info('📱 App install prompt available');
      e.preventDefault();
      this.deferredPrompt = e;
      this.isAppInstallable = true;
      this.showInstallButton();
    });

    // App install edilince
    window.addEventListener('appinstalled', () => {
      Logger.info('✅ App installed successfully');
      this.deferredPrompt = null;
      this.isAppInstallable = false;
      this.hideInstallButton();
    });

    // Visibility change (background/foreground)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        Logger.info('👀 App became visible - checking for updates');
        this.checkForUpdates();
        this.syncWhenOnline();
      }
    });
  }

  /**
   * Online durumuna geçince
   */
  private async handleOnline(): Promise<void> {
    Logger.info('🌐 App is online');

    // UI güncelle
    this.updateConnectionStatus(true);

    // Background sync başlat
    await this.syncWhenOnline();

    // Cache'i güncelle
    this.refreshStaleCache();
  }

  /**
   * Offline durumuna geçince
   */
  private handleOffline(): void {
    Logger.info('📱 App is offline');

    // UI güncelle
    this.updateConnectionStatus(false);

    // Offline notification göster
    this.showOfflineNotification();
  }

  /**
   * Online olunca sync yap
   */
  private async syncWhenOnline(): Promise<void> {
    if (!navigator.onLine) return;

    try {
      // Service Worker'a background sync mesajı gönder
      if (this.swRegistration && this.swRegistration.active) {
        this.swRegistration.active.postMessage({
          type: 'BACKGROUND_SYNC',
        });
      }

      // Local data'yı server'a sync et
      const userId = this.getCurrentUserId();
      if (userId) {
        const { RecipeService } = await import('./recipeService');
        await RecipeService.syncLocalDataToServer(userId);
      }
    } catch (error) {
      Logger.error('❌ Sync failed:', error);
    }
  }

  /**
   * Stale cache'i yenile
   */
  private refreshStaleCache(): void {
    // Service Worker'a cache refresh mesajı gönder
    if (this.swRegistration && this.swRegistration.active) {
      this.swRegistration.active.postMessage({
        type: 'REFRESH_STALE_CACHE',
      });
    }
  }

  /**
   * Güncellemeleri kontrol et
   */
  private async checkForUpdates(): Promise<void> {
    if (this.swRegistration) {
      try {
        await this.swRegistration.update();
        Logger.info('🔄 Checked for Service Worker updates');
      } catch (error) {
        Logger.warn('⚠️ Update check failed:', error);
      }
    }
  }

  /**
   * App install öner
   */
  async promptInstall(): Promise<boolean> {
    if (!this.isAppInstallable || !this.deferredPrompt) {
      return false;
    }

    try {
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;

      Logger.info('📱 Install prompt result:', outcome);

      this.deferredPrompt = null;
      this.isAppInstallable = false;

      return outcome === 'accepted';
    } catch (error) {
      Logger.error('❌ Install prompt failed:', error);
      return false;
    }
  }

  /**
   * Push notification izni iste
   */
  async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      Logger.warn('⚠️ Notifications not supported');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      Logger.info('🔔 Notification permission:', permission);
      return permission === 'granted';
    } catch (error) {
      Logger.error('❌ Notification permission request failed:', error);
      return false;
    }
  }

  /**
   * Local notification göster
   */
  showLocalNotification(title: string, options: NotificationOptions = {}): void {
    if (Notification.permission === 'granted') {
      const notification = new Notification(title, {
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-96x96.png',
        ...options,
      });

      // Auto close after 5 seconds
      setTimeout(() => notification.close(), 5000);
    }
  }

  /**
   * Service Worker'dan mesaj al
   */
  private setupServiceWorkerMessages(): void {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', event => {
        const { type, data } = event.data;

        switch (type) {
          case 'CACHE_UPDATED':
            Logger.info('📦 Cache updated:', data);
            this.showCacheUpdateNotification();
            break;

          case 'SYNC_COMPLETED':
            Logger.info('🔄 Background sync completed:', data);
            break;

          case 'OFFLINE_FALLBACK':
            Logger.info('📱 Using offline fallback:', data);
            break;

          default:
            Logger.info('📨 Service Worker message:', type, data);
        }
      });
    }
  }

  // UI Helper Methods
  private updateConnectionStatus(isOnline: boolean): void {
    const event = new CustomEvent('connectionStatusChanged', {
      detail: { isOnline },
    });
    window.dispatchEvent(event);
  }

  private showInstallButton(): void {
    const event = new CustomEvent('showInstallPrompt');
    window.dispatchEvent(event);
  }

  private hideInstallButton(): void {
    const event = new CustomEvent('hideInstallPrompt');
    window.dispatchEvent(event);
  }

  private showUpdateAvailableNotification(): void {
    this.showLocalNotification('Güncelleme Mevcut', {
      body: "Yemek Bulucu'nun yeni sürümü mevcut. Sayfayı yenileyin.",
      tag: 'app-update',
      requireInteraction: true,
    });
  }

  private showOfflineNotification(): void {
    this.showLocalNotification('Çevrimdışı Mod', {
      body: 'İnternet bağlantınız yok. Kaydedilmiş tarifler kullanılabilir.',
      tag: 'offline-mode',
    });
  }

  private showCacheUpdateNotification(): void {
    // Silent notification - sadece console log
    Logger.info('✨ Tarifler güncellendi');
  }

  private getCurrentUserId(): string | null {
    // Kullanıcı ID'sini localStorage'dan al
    try {
      const userSession = localStorage.getItem('user_session');
      return userSession ? JSON.parse(userSession).userId : null;
    } catch {
      return null;
    }
  }

  // Public API
  isOnline(): boolean {
    return navigator.onLine;
  }

  isInstallable(): boolean {
    return this.isAppInstallable;
  }

  async updateApp(): Promise<void> {
    if (this.swRegistration && this.swRegistration.waiting) {
      this.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  }

  async clearCache(): Promise<void> {
    if (this.swRegistration && this.swRegistration.active) {
      this.swRegistration.active.postMessage({ type: 'CLEAR_CACHE' });
    }
  }

  getConnectionStatus(): {
    isOnline: boolean;
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
  } {
    const connection =
      (navigator as any).connection ||
      (navigator as any).mozConnection ||
      (navigator as any).webkitConnection;

    return {
      isOnline: navigator.onLine,
      effectiveType: connection?.effectiveType,
      downlink: connection?.downlink,
      rtt: connection?.rtt,
    };
  }
}

// Export singleton instance
export const offlineService = OfflineService.getInstance();
