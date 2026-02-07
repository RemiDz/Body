/**
 * Resonance Body Map - Instrument Guide
 * Interactive reference showing common sound healing instruments,
 * their frequency ranges, and which body regions they activate.
 */

import { INSTRUMENT_REFERENCE, FREQUENCY_REGIONS } from '../config.js';

export class InstrumentGuide {
  constructor() {
    this.overlay = null;
    this.isVisible = false;
  }

  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  show() {
    this.hide();

    const instruments = [
      {
        name: 'Monochord',
        freq: `${INSTRUMENT_REFERENCE.monochord.fundamental} Hz (C2)`,
        regions: 'Root → Crown (rich overtones)',
        desc: INSTRUMENT_REFERENCE.monochord.description
      },
      {
        name: 'Crystal Bowls',
        freq: '262–494 Hz',
        regions: 'Solar Plexus → Third Eye',
        desc: 'Tuned to specific notes; each bowl targets a region'
      },
      {
        name: 'Singing Bowls (Large)',
        freq: '150–300 Hz',
        regions: 'Sacral → Solar Plexus',
        desc: 'Deep resonant tones with strong harmonics'
      },
      {
        name: 'Singing Bowls (Medium)',
        freq: '250–500 Hz',
        regions: 'Solar Plexus → Throat',
        desc: 'Versatile range for heart-centered work'
      },
      {
        name: 'Singing Bowls (Small)',
        freq: '400–800 Hz',
        regions: 'Heart → Third Eye',
        desc: 'Higher pitched, bright tones'
      },
      {
        name: 'Didgeridoo',
        freq: '60–80 Hz',
        regions: 'Root',
        desc: 'Deep drone with complex overtone spectrum'
      },
      {
        name: 'Gong',
        freq: '50–1500 Hz',
        regions: 'Full spectrum',
        desc: INSTRUMENT_REFERENCE.gong.description
      },
      {
        name: 'Tuning Fork 128 Hz',
        freq: '128 Hz',
        regions: 'Sacral',
        desc: 'Precise single frequency'
      },
      {
        name: 'Tuning Fork 256 Hz',
        freq: '256 Hz',
        regions: 'Solar Plexus',
        desc: 'Middle C octave equivalent'
      },
      {
        name: 'Tuning Fork 512 Hz',
        freq: '512 Hz',
        regions: 'Throat / Third Eye',
        desc: 'Higher octave, clear tone'
      }
    ];

    const rows = instruments.map(inst => `
      <div class="guide-row">
        <div class="guide-name">${inst.name}</div>
        <div class="guide-freq">${inst.freq}</div>
        <div class="guide-regions">${inst.regions}</div>
        <div class="guide-desc">${inst.desc}</div>
      </div>
    `).join('');

    // Region reference
    const regionRef = Object.entries(FREQUENCY_REGIONS).map(([, cfg]) => `
      <span class="guide-region-chip" style="border-color:${cfg.colorHex};color:${cfg.glowHex}">
        ${cfg.label} ${cfg.min}–${cfg.max} Hz
      </span>
    `).join('');

    this.overlay = document.createElement('div');
    this.overlay.className = 'overlay instrument-guide-overlay';
    this.overlay.innerHTML = `
      <div class="overlay-content instrument-guide-content">
        <div class="settings-header">
          <h3 class="settings-title">Instrument Guide</h3>
          <button class="btn btn-icon btn-close guide-close-btn" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="guide-region-chips">${regionRef}</div>
        <div class="guide-list">${rows}</div>
      </div>`;

    document.body.appendChild(this.overlay);
    this.isVisible = true;

    this.overlay.querySelector('.guide-close-btn')
      .addEventListener('click', () => this.hide());

    // Close on background tap
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.hide();
    });
  }

  hide() {
    this.overlay?.remove();
    this.overlay = null;
    this.isVisible = false;
  }

  destroy() {
    this.hide();
  }
}
