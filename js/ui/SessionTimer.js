/**
 * Resonance Body Map - Session Timer
 * Displays elapsed time since listening started
 */

export class SessionTimer {
  constructor() {
    this.startTime = 0;
    this.isRunning = false;
    this.element = null;
    this.intervalId = null;
    this.createUI();
  }

  createUI() {
    this.element = document.createElement('div');
    this.element.className = 'session-timer';
    this.element.setAttribute('aria-label', 'Session duration');
    this.element.textContent = '0:00';
    this.element.style.opacity = '0';

    // Insert before controls
    const controls = document.querySelector('.controls');
    if (controls) {
      controls.parentNode.insertBefore(this.element, controls);
    }
  }

  start() {
    this.startTime = performance.now();
    this.isRunning = true;
    this.element.style.opacity = '1';
    this.intervalId = setInterval(() => this.tick(), 1000);
  }

  stop() {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  reset() {
    this.stop();
    this.element.textContent = '0:00';
    this.element.style.opacity = '0';
  }

  tick() {
    if (!this.isRunning) return;
    const elapsed = Math.floor((performance.now() - this.startTime) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    this.element.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  getElapsedSeconds() {
    if (!this.isRunning) return 0;
    return Math.floor((performance.now() - this.startTime) / 1000);
  }

  destroy() {
    this.stop();
    this.element?.remove();
  }
}
