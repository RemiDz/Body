/**
 * Resonance Body Map - Frequency Reference Overlay
 * Shows frequency boundaries and note markers for each region
 * Also provides a tuner mode with cents sharp/flat indicator
 */

import { FREQUENCY_REGIONS } from '../config.js';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const A4 = 440;
const A4_MIDI = 69;

export class FrequencyReference {
  constructor() {
    this.regions = FREQUENCY_REGIONS;
    this.overlay = null;
    this.tunerElement = null;
    this.isReferenceVisible = false;
    this.isTunerMode = false;
  }

  toggleReference() {
    this.isReferenceVisible = !this.isReferenceVisible;
    if (this.isReferenceVisible) {
      this.showReference();
    } else {
      this.hideReference();
    }
  }

  showReference() {
    this.hideReference();
    this.overlay = document.createElement('div');
    this.overlay.className = 'freq-reference-overlay';

    const rows = Object.entries(this.regions).reverse().map(([, cfg]) => {
      return `<div class="freq-ref-row">
        <span class="freq-ref-color" style="background:${cfg.colorHex}"></span>
        <span class="freq-ref-label">${cfg.label}</span>
        <span class="freq-ref-range">${cfg.min}–${cfg.max} Hz</span>
        <span class="freq-ref-note">${cfg.note}</span>
      </div>`;
    }).join('');

    this.overlay.innerHTML = rows;
    document.getElementById('app')?.appendChild(this.overlay);
    this.isReferenceVisible = true;
  }

  hideReference() {
    this.overlay?.remove();
    this.overlay = null;
    this.isReferenceVisible = false;
  }

  // ---- Tuner Mode ----

  enableTuner() {
    if (this.tunerElement) return;
    this.isTunerMode = true;

    this.tunerElement = document.createElement('div');
    this.tunerElement.className = 'tuner-display';
    this.tunerElement.innerHTML = `
      <div class="tuner-note">--</div>
      <div class="tuner-cents-bar">
        <div class="tuner-cents-marker"></div>
        <div class="tuner-cents-center"></div>
      </div>
      <div class="tuner-cents-value">0 cents</div>
    `;

    const freqDisplay = document.getElementById('frequencyDisplay');
    if (freqDisplay) {
      freqDisplay.parentNode.insertBefore(this.tunerElement, freqDisplay.nextSibling);
    }
  }

  disableTuner() {
    this.isTunerMode = false;
    this.tunerElement?.remove();
    this.tunerElement = null;
  }

  toggleTuner() {
    if (this.isTunerMode) {
      this.disableTuner();
    } else {
      this.enableTuner();
    }
    return this.isTunerMode;
  }

  /**
   * Update tuner display with current frequency
   */
  updateTuner(frequency) {
    if (!this.isTunerMode || !this.tunerElement || frequency <= 0) return;

    const midi = 12 * Math.log2(frequency / A4) + A4_MIDI;
    const nearestMidi = Math.round(midi);
    const cents = Math.round((midi - nearestMidi) * 100);

    const noteIndex = ((nearestMidi % 12) + 12) % 12;
    const octave = Math.floor(nearestMidi / 12) - 1;
    const noteName = NOTE_NAMES[noteIndex] + octave;

    const noteEl = this.tunerElement.querySelector('.tuner-note');
    const markerEl = this.tunerElement.querySelector('.tuner-cents-marker');
    const centsEl = this.tunerElement.querySelector('.tuner-cents-value');

    if (noteEl) noteEl.textContent = noteName;
    if (centsEl) {
      const sign = cents > 0 ? '+' : '';
      centsEl.textContent = `${sign}${cents} cents`;
    }
    if (markerEl) {
      // Map -50..+50 cents to 0%..100% position
      const pct = 50 + cents;
      markerEl.style.left = `${Math.max(0, Math.min(100, pct))}%`;

      // Color: green when in tune, yellow/red when off
      const absCents = Math.abs(cents);
      if (absCents <= 5) {
        markerEl.style.background = '#00ff88';
      } else if (absCents <= 15) {
        markerEl.style.background = '#ffcc00';
      } else {
        markerEl.style.background = '#ff4455';
      }
    }
  }

  destroy() {
    this.hideReference();
    this.disableTuner();
  }
}
