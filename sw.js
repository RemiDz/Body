/**
 * Resonance Body Map - Service Worker
 * Enables offline functionality as a PWA
 */

const CACHE_NAME = 'resonance-v1.2.0';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/themes.css',
  '/css/styles.css',
  '/css/animations.css',
  '/js/config.js',
  '/js/app.js',
  '/js/audio/AudioAnalyzer.js',
  '/js/audio/FrequencyMapper.js',
  '/js/audio/NoiseGate.js',
  '/js/visual/BodyRenderer.js',
  '/js/visual/GlowEngine.js',
  '/js/visual/ParticleSystem.js',
  '/js/visual/AmbientEffects.js',
  '/js/ui/FrequencyDisplay.js',
  '/js/ui/Controls.js',
  '/js/ui/Calibration.js',
  '/js/utils/easing.js',
  '/js/utils/math.js',
  '/assets/body.svg'
];

// Install event - cache all assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching app assets');
        return cache.addAll(ASSETS);
      })
      .then(() => self.skipWaiting())
      .catch((error) => {
        console.error('Error caching assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log('Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fall back to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;
  
  // Skip cross-origin requests (like Google Fonts)
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(event.request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone the response
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(() => {
            // If both cache and network fail, return a fallback
            if (event.request.destination === 'document') {
              return caches.match('/index.html');
            }
            return null;
          });
      })
  );
});

// Handle messages from the main app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
