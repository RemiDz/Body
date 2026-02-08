/**
 * Resonance Body Map - Session Summary
 * Displays post-session heatmap and frequency history
 */

import { FREQUENCY_REGIONS } from '../config.js';

// Region order bottom-to-top for stacking (root drawn first / bottom layer)
const REGION_STACK = ['root', 'sacral', 'solar', 'heart', 'throat', 'thirdEye', 'crown'];
// Display order: crown at top of list
const DISPLAY_ORDER = [...REGION_STACK].reverse();

export class SessionSummary {
  constructor() {
    this.overlay = null;
  }

  show(summary) {
    this.remove();

    const dur = summary.totalDurationMs;
    const mins = Math.floor(dur / 60000);
    const secs = Math.floor((dur % 60000) / 1000);
    const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;

    const ordered = DISPLAY_ORDER
      .filter(name => summary.regions[name])
      .map(name => [name, summary.regions[name]]);

    const bars = ordered.map(([, r]) => {
      const pct = r.activationPercent;
      return `
        <div class="summary-bar-row">
          <div class="summary-bar-id">
            <span class="summary-chakra-icon" style="background:${r.color}"></span>
            <span class="summary-bar-label" style="color:${r.glowColor}">${r.label}</span>
          </div>
          <div class="summary-bar-track">
            <div class="summary-bar-fill" style="width:${pct}%;background:${r.color}"></div>
          </div>
          <span class="summary-bar-value">${pct}%</span>
        </div>`;
    }).join('');

    const timeline = this.buildTimeline(summary.frequencyHistory, summary.totalDurationMs);

    this.overlay = document.createElement('div');
    this.overlay.className = 'overlay session-summary-overlay';
    this.overlay.innerHTML = `
      <div class="overlay-content session-summary-content">
        <h3 class="settings-title">Session Summary</h3>
        <p class="summary-duration">Duration: ${timeStr}</p>
        <div class="summary-bars">${bars}</div>
        ${timeline ? `
        <div class="summary-sparkline-wrap">
          <p class="summary-spark-label">Region activity over time</p>
          ${timeline}
        </div>` : ''}
        <div class="summary-actions">
          <button class="btn btn-primary summary-close-btn">
            <span class="btn-text">Close</span>
          </button>
          <button class="btn summary-export-btn">
            <span class="btn-text">Export JSON</span>
          </button>
        </div>
      </div>`;

    document.body.appendChild(this.overlay);

    this.overlay.querySelector('.summary-close-btn')
      .addEventListener('click', () => this.remove());

    this.overlay.querySelector('.summary-export-btn')
      .addEventListener('click', () => {
        const blob = new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `resonance-session-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      });

    this._lastSummary = summary;
  }

  /**
   * Build a stacked region activity timeline.
   * Each region gets a horizontal color band whose opacity reflects intensity over time.
   */
  buildTimeline(history, totalDurationMs) {
    if (!history || history.length < 3) return '';
    // Check if region data is available (new recorder format)
    if (!history[0].regions) return this.buildLegacySparkline(history);

    const w = 300, h = 100, pad = 2;
    const bandH = (h - pad * 2) / REGION_STACK.length;
    const maxT = history[history.length - 1].time || 1;

    let svg = `<svg class="summary-sparkline" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" style="height:${h}px">`;

    // Draw each region as a horizontal band with varying opacity columns
    DISPLAY_ORDER.forEach((regionName, bandIdx) => {
      const cfg = FREQUENCY_REGIONS[regionName];
      if (!cfg) return;
      const y = pad + bandIdx * bandH;

      // Draw intensity as small rectangles across time
      const colW = Math.max(1, (w - pad * 2) / history.length);

      for (let i = 0; i < history.length; i++) {
        const sample = history[i];
        const intensity = sample.regions[regionName] || 0;
        if (intensity < 0.05) continue;

        const x = pad + (sample.time / maxT) * (w - pad * 2);
        const alpha = Math.min(1, intensity * 1.5);

        svg += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(colW + 0.5).toFixed(1)}" height="${bandH.toFixed(1)}" fill="${cfg.colorHex}" opacity="${alpha.toFixed(2)}" rx="0.5"/>`;
      }
    });

    // Draw region labels on the left
    DISPLAY_ORDER.forEach((regionName, bandIdx) => {
      const cfg = FREQUENCY_REGIONS[regionName];
      if (!cfg) return;
      const y = pad + bandIdx * bandH + bandH / 2;
      svg += `<text x="${pad + 2}" y="${y + 1}" fill="${cfg.glowHex}" font-size="5" font-family="var(--font-body)" dominant-baseline="middle" opacity="0.7">${cfg.label}</text>`;
    });

    // Draw subtle time markers
    const numMarkers = Math.min(5, Math.floor(totalDurationMs / 5000) + 1);
    for (let i = 1; i < numMarkers; i++) {
      const x = pad + (i / numMarkers) * (w - pad * 2);
      svg += `<line x1="${x.toFixed(1)}" y1="${pad}" x2="${x.toFixed(1)}" y2="${h - pad}" stroke="rgba(255,255,255,0.08)" stroke-width="0.5"/>`;
    }

    // Time labels at start and end
    const endMins = Math.floor(totalDurationMs / 60000);
    const endSecs = Math.floor((totalDurationMs % 60000) / 1000);
    const endLabel = `${endMins}:${endSecs.toString().padStart(2, '0')}`;
    svg += `<text x="${pad + 1}" y="${h - 1}" fill="var(--text-dim)" font-size="4.5" font-family="var(--font-body)">0:00</text>`;
    svg += `<text x="${w - pad - 1}" y="${h - 1}" fill="var(--text-dim)" font-size="4.5" font-family="var(--font-body)" text-anchor="end">${endLabel}</text>`;

    svg += '</svg>';
    return svg;
  }

  /** Fallback for sessions recorded before region snapshots were added */
  buildLegacySparkline(history) {
    if (!history || history.length < 3) return '';

    const w = 300, h = 60, pad = 4;
    const maxT = history[history.length - 1].time;
    const maxF = Math.max(...history.map(p => p.frequency), 500);

    // Color each segment by which region the frequency falls in
    let svg = `<svg class="summary-sparkline" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">`;

    for (let i = 1; i < history.length; i++) {
      const prev = history[i - 1];
      const curr = history[i];
      const x1 = pad + (prev.time / maxT) * (w - pad * 2);
      const y1 = h - pad - (prev.frequency / maxF) * (h - pad * 2);
      const x2 = pad + (curr.time / maxT) * (w - pad * 2);
      const y2 = h - pad - (curr.frequency / maxF) * (h - pad * 2);

      const color = this.getFrequencyColor(curr.frequency);
      svg += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${color}" stroke-width="2" stroke-linecap="round" opacity="0.8"/>`;
    }

    svg += '</svg>';
    return svg;
  }

  getFrequencyColor(freq) {
    for (const cfg of Object.values(FREQUENCY_REGIONS)) {
      if (freq >= cfg.min && freq < cfg.max) return cfg.colorHex;
    }
    return 'rgba(255,255,255,0.3)';
  }

  remove() {
    this.overlay?.remove();
    this.overlay = null;
  }
}
