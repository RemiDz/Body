/**
 * Resonance Body Map - Service Worker
 * Offline caching that works on GitHub Pages (repo sub-path) and any hosted scope.
 */

const CACHE_NAME = 'resonance-v1.3.1';

// Build fully-qualified URLs relative to the SW registration scope.
const toScopeUrl = (path) => new URL(path, self.registration.scope).toString();

const ASSETS = [
  '',
  'index.html',
  'manifest.json',
  'css/themes.css',
  'css/styles.css',
  'css/animations.css',
  'js/config.js',
  'js/app.js',
  'js/audio/AudioAnalyzer.js',
  'js/audio/FrequencyMapper.js',
  'js/audio/NoiseGate.js',
  'js/visual/BodyRenderer.js',
  'js/visual/GlowEngine.js',
  'js/visual/ParticleSystem.js',
  'js/visual/AmbientEffects.js',
  'js/visual/HarmonicCascade.js',
  'js/visual/CymaticsOverlay.js',
  'js/visual/HarmonicLines.js',
  'js/visual/ResonanceRings.js',
  'js/visual/SpectrumArc.js',
  'js/ui/FrequencyDisplay.js',
  'js/ui/Controls.js',
  'js/ui/Calibration.js',
  'js/ui/WakeLock.js',
  'js/ui/SessionTimer.js',
  'js/ui/SessionRecorder.js',
  'js/ui/SessionSummary.js',
  'js/ui/Screenshot.js',
  'js/ui/FrequencyReference.js',
  'js/ui/InstrumentGuide.js',
  'js/ui/AudioFileInput.js',
  'js/utils/easing.js',
  'js/utils/math.js',
  'assets/body.svg',
  'assets/icon.svg'
].map(toScopeUrl);

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Skip cross-origin requests (e.g., Google Fonts)
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(event.request)
      .then((cached) => {
        if (cached) return cached;

        return fetch(event.request)
          .then((response) => {
            if (!response || response.status !== 200 || response.type !== 'basic') return response;

            const cloned = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
            return response;
          })
          .catch(() => {
            // Offline fallback for navigation
            if (event.request.destination === 'document') {
              return caches.match(toScopeUrl('index.html'));
            }
            return null;
          });
      })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
