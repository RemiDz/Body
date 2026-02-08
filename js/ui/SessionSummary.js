/**
 * Resonance Body Map - Session Summary
 * Displays post-session heatmap and frequency history
 */

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

    // Fixed chakra order: root (bottom) to crown (top)
    const regionOrder = ['root', 'sacral', 'solar', 'heart', 'throat', 'thirdEye', 'crown'];
    const ordered = regionOrder
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

    // Build frequency sparkline as inline SVG
    const sparkline = this.buildSparkline(summary.frequencyHistory);

    this.overlay = document.createElement('div');
    this.overlay.className = 'overlay session-summary-overlay';
    this.overlay.innerHTML = `
      <div class="overlay-content session-summary-content">
        <h3 class="settings-title">Session Summary</h3>
        <p class="summary-duration">Duration: ${timeStr}</p>
        <div class="summary-bars">${bars}</div>
        ${sparkline ? `
        <div class="summary-sparkline-wrap">
          <p class="summary-spark-label">Frequency over time</p>
          ${sparkline}
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

    // Bind close
    this.overlay.querySelector('.summary-close-btn')
      .addEventListener('click', () => this.remove());

    // Bind export
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

    // Store summary for screenshot
    this._lastSummary = summary;
  }

  buildSparkline(history) {
    if (!history || history.length < 3) return '';

    const w = 300, h = 60, pad = 4;
    const maxT = history[history.length - 1].time;
    const maxF = Math.max(...history.map(p => p.frequency), 500);

    const points = history.map(p => {
      const x = pad + (p.time / maxT) * (w - pad * 2);
      const y = h - pad - (p.frequency / maxF) * (h - pad * 2);
      return `${x},${y}`;
    }).join(' ');

    return `<svg class="summary-sparkline" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      <polyline points="${points}" fill="none" stroke="var(--text-mid)" stroke-width="1.5" stroke-linejoin="round"/>
    </svg>`;
  }

  remove() {
    this.overlay?.remove();
    this.overlay = null;
  }
}
