/**
 * Resonance Body Map - Wake Lock
 * Prevents screen from dimming/sleeping during sessions
 * Uses the Screen Wake Lock API where available
 */

export class WakeLock {
  constructor() {
    this.wakeLock = null;
    this.isSupported = 'wakeLock' in navigator;
    this.isActive = false;
    this._released = false; // Track explicit release to prevent re-acquire race
  }

  async acquire() {
    if (!this.isSupported) return false;
    this._released = false;

    // Release existing sentinel before acquiring new one (#35)
    if (this.wakeLock) {
      try { await this.wakeLock.release(); } catch (_) {}
      this.wakeLock = null;
    }

    try {
      this.wakeLock = await navigator.wakeLock.request('screen');
      this.isActive = true;

      this.wakeLock.addEventListener('release', () => {
        this.isActive = false;
      });

      // Re-acquire on visibility change (tab switch back)
      document.addEventListener('visibilitychange', this._onVisibilityChange);

      console.log('Wake lock acquired');
      return true;
    } catch (err) {
      console.warn('Wake lock failed:', err);
      return false;
    }
  }

  async release() {
    this._released = true;
    document.removeEventListener('visibilitychange', this._onVisibilityChange);

    if (this.wakeLock) {
      try {
        await this.wakeLock.release();
      } catch (_) { /* already released */ }
      this.wakeLock = null;
      this.isActive = false;
    }
  }

  _onVisibilityChange = async () => {
    if (document.visibilityState === 'visible' && !this.isActive && !this._released) {
      await this.acquire();
    }
  };
}
