/**
 * Service Worker - Yemek Bulucu PWA
 *
 * Features:
 * - Offline caching
 * - Background sync
 * - Push notifications
 * - Cache strategies
 */

const CACHE_NAME = 'yemek-bulucu-v1.0.0';
const OFFLINE_CACHE = 'yemek-bulucu-offline-v1';
const RUNTIME_CACHE = 'yemek-bulucu-runtime-v1';

// Cache edilecek static dosyalar
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/offline.html',
];

// Cache edilecek API route'ları
const API_CACHE_PATTERNS = [
  /\/api\/recipes/,
  /\/api\/ingredients/,
  /\/api\/search/,
];

// Install event - ilk kurulum
self.addEventListener('install', event => {
  console.log('🚀 Service Worker: Installing...');

  event.waitUntil(
    Promise.all([
      // Static assets'leri cache'le
      caches.open(CACHE_NAME).then(cache => {
        console.log('📦 Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),

      // Offline page'i hazırla
      caches.open(OFFLINE_CACHE).then(cache => {
        return cache.add('/offline.html');
      }),
    ]).then(() => {
      console.log('✅ Service Worker: Installation complete');
      // Yeni SW'yi hemen aktifleştir
      return self.skipWaiting();
    })
  );
});

// Activate event - aktivasyon
self.addEventListener('activate', event => {
  console.log('🔄 Service Worker: Activating...');

  event.waitUntil(
    Promise.all([
      // Eski cache'leri temizle
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (
              cacheName !== CACHE_NAME &&
              cacheName !== OFFLINE_CACHE &&
              cacheName !== RUNTIME_CACHE
            ) {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),

      // Tüm client'ları kontrol et
      self.clients.claim(),
    ]).then(() => {
      console.log('✅ Service Worker: Activation complete');
    })
  );
});

// Fetch event - network istekleri
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Sadece GET isteklerini handle et
  if (request.method !== 'GET') {
    return;
  }

  // Same-origin istekleri handle et
  if (url.origin !== location.origin) {
    return;
  }

  event.respondWith(handleFetchRequest(request));
});

/**
 * Fetch request'i handle et
 */
async function handleFetchRequest(request) {
  const url = new URL(request.url);

  try {
    // 1. HTML pages - Network First (cache fallback)
    if (url.pathname === '/' || url.pathname.endsWith('.html')) {
      return await networkFirstStrategy(request, CACHE_NAME);
    }

    // 2. API calls - Cache First (network fallback)
    if (isAPIRequest(url.pathname)) {
      return await cacheFirstStrategy(request, RUNTIME_CACHE);
    }

    // 3. Static assets - Cache First
    if (isStaticAsset(url.pathname)) {
      return await cacheFirstStrategy(request, CACHE_NAME);
    }

    // 4. Images - Cache First (long term)
    if (isImageRequest(request)) {
      return await cacheFirstStrategy(request, RUNTIME_CACHE, {
        maxAge: 30 * 24 * 60 * 60 * 1000,
      }); // 30 gün
    }

    // 5. Default - Network First
    return await networkFirstStrategy(request, RUNTIME_CACHE);
  } catch (error) {
    console.error('❌ Fetch error:', error);

    // Offline fallback
    if (url.pathname === '/' || url.pathname.endsWith('.html')) {
      const offlineCache = await caches.open(OFFLINE_CACHE);
      return await offlineCache.match('/offline.html');
    }

    // API için offline response
    if (isAPIRequest(url.pathname)) {
      return new Response(
        JSON.stringify({
          error: 'Offline',
          message: 'Bu işlem için internet bağlantısı gerekli',
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    throw error;
  }
}

/**
 * Network First Strategy
 * Önce network'ten dene, başarısızsa cache'den al
 */
async function networkFirstStrategy(request, cacheName, options = {}) {
  const cache = await caches.open(cacheName);

  try {
    // Network'ten fetch et
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // Başarılı response'u cache'e kaydet
      const responseClone = networkResponse.clone();
      await cache.put(request, responseClone);

      console.log('🌐 Network First - from network:', request.url);
      return networkResponse;
    }

    throw new Error('Network response not ok');
  } catch (error) {
    // Network başarısız, cache'den dene
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      console.log('📦 Network First - from cache:', request.url);
      return cachedResponse;
    }

    throw error;
  }
}

/**
 * Cache First Strategy
 * Önce cache'den dene, yoksa network'ten al
 */
async function cacheFirstStrategy(request, cacheName, options = {}) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    console.log('📦 Cache First - from cache:', request.url);

    // Background'da network'ten güncelle (stale-while-revalidate)
    if (!options.skipBackgroundUpdate) {
      updateCacheInBackground(request, cache);
    }

    return cachedResponse;
  }

  // Cache'de yok, network'ten al
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const responseClone = networkResponse.clone();
      await cache.put(request, responseClone);

      console.log('🌐 Cache First - from network:', request.url);
      return networkResponse;
    }

    throw new Error('Network response not ok');
  } catch (error) {
    console.error('❌ Cache First failed:', request.url, error);
    throw error;
  }
}

/**
 * Background'da cache'i güncelle
 */
async function updateCacheInBackground(request, cache) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
      console.log('🔄 Background cache update:', request.url);

      // Client'a cache güncellendiğini bildir
      broadcastToClients({
        type: 'CACHE_UPDATED',
        data: { url: request.url },
      });
    }
  } catch (error) {
    console.warn('⚠️ Background update failed:', request.url, error);
  }
}

/**
 * Helper functions
 */
function isAPIRequest(pathname) {
  return API_CACHE_PATTERNS.some(pattern => pattern.test(pathname));
}

function isStaticAsset(pathname) {
  return (
    pathname.includes('/static/') ||
    pathname.endsWith('.js') ||
    pathname.endsWith('.css') ||
    pathname.endsWith('.woff') ||
    pathname.endsWith('.woff2')
  );
}

function isImageRequest(request) {
  return (
    request.destination === 'image' ||
    request.url.includes('/images/') ||
    /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(request.url)
  );
}

/**
 * Client'lara mesaj gönder
 */
async function broadcastToClients(message) {
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage(message);
  });
}

// Message event - client'tan mesaj al
self.addEventListener('message', event => {
  const { type, data } = event.data;

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'BACKGROUND_SYNC':
      handleBackgroundSync();
      break;

    case 'REFRESH_STALE_CACHE':
      refreshStaleCache();
      break;

    case 'CLEAR_CACHE':
      clearAllCaches();
      break;

    default:
      console.log('📨 Unknown message type:', type);
  }
});

/**
 * Background sync handle et
 */
async function handleBackgroundSync() {
  try {
    console.log('🔄 Background sync started');

    // Offline queue'daki istekleri işle
    const offlineQueue = await getOfflineQueue();

    for (const queueItem of offlineQueue) {
      try {
        await processQueueItem(queueItem);
        await removeFromOfflineQueue(queueItem.id);
      } catch (error) {
        console.warn('⚠️ Queue item failed:', queueItem.id, error);
      }
    }

    broadcastToClients({
      type: 'SYNC_COMPLETED',
      data: { processed: offlineQueue.length },
    });

    console.log('✅ Background sync completed');
  } catch (error) {
    console.error('❌ Background sync failed:', error);
  }
}

/**
 * Stale cache'leri yenile
 */
async function refreshStaleCache() {
  try {
    console.log('🔄 Refreshing stale cache...');

    const cache = await caches.open(RUNTIME_CACHE);
    const requests = await cache.keys();

    // Her cache entry'yi background'da güncelle
    requests.forEach(request => {
      updateCacheInBackground(request, cache);
    });
  } catch (error) {
    console.warn('⚠️ Cache refresh failed:', error);
  }
}

/**
 * Tüm cache'leri temizle
 */
async function clearAllCaches() {
  try {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
    console.log('🗑️ All caches cleared');
  } catch (error) {
    console.error('❌ Cache clear failed:', error);
  }
}

// Helper functions for offline queue (simplified)
async function getOfflineQueue() {
  // Bu normalde IndexedDB'den gelir, basitleştirme için empty array
  return [];
}

async function processQueueItem(item) {
  // Queue item'ı işle (API call, etc.)
  console.log('Processing queue item:', item);
}

async function removeFromOfflineQueue(id) {
  // Queue'dan item'ı kaldır
  console.log('Removing from queue:', id);
}

// Background Sync event (experimental)
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    event.waitUntil(handleBackgroundSync());
  }
});

// Push event (notification)
self.addEventListener('push', event => {
  if (!event.data) return;

  const data = event.data.json();

  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    data: data.data,
    actions: data.actions || [
      { action: 'open', title: 'Aç' },
      { action: 'dismiss', title: 'Kapat' },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Notification click event
self.addEventListener('notificationclick', event => {
  event.notification.close();

  const { action, data } = event;

  if (action === 'open' || !action) {
    // App'i aç
    event.waitUntil(clients.openWindow(data?.url || '/'));
  }
});

console.log('🚀 Service Worker loaded successfully');
