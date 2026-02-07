/**
 * Resonance Body Map - Session Recorder
 * Records region activations over time for post-session review
 */

import { FREQUENCY_REGIONS } from '../config.js';

export class SessionRecorder {
  constructor() {
    this.regions = FREQUENCY_REGIONS;
    this.isRecording = false;
    this.startTime = 0;

    // Accumulated activation time (ms) per region
    this.activationTime = {};
    // Peak intensity per region
    this.peakIntensity = {};
    // Frequency history (sampled every 500ms)
    this.frequencyHistory = [];
    this.lastSampleTime = 0;
    this.sampleInterval = 500; // ms

    this.reset();
  }

  reset() {
    for (const name of Object.keys(this.regions)) {
      this.activationTime[name] = 0;
      this.peakIntensity[name] = 0;
    }
    this.frequencyHistory = [];
    this.lastSampleTime = 0;
  }

  start() {
    this.reset();
    this.startTime = performance.now();
    this.isRecording = true;
  }

  stop() {
    this.isRecording = false;
  }

  /**
   * Called each frame with current intensities and frequency
   */
  record(intensities, dominantFrequency, deltaTime) {
    if (!this.isRecording) return;

    const now = performance.now();

    // Accumulate activation time
    for (const [name, intensity] of Object.entries(intensities)) {
      if (intensity > 0.15) {
        this.activationTime[name] += deltaTime;
      }
      if (intensity > this.peakIntensity[name]) {
        this.peakIntensity[name] = intensity;
      }
    }

    // Sample frequency history
    if (now - this.lastSampleTime >= this.sampleInterval) {
      this.frequencyHistory.push({
        time: now - this.startTime,
        frequency: dominantFrequency || 0
      });
      this.lastSampleTime = now;
    }
  }

  /**
   * Get session summary data
   */
  getSummary() {
    const totalTime = performance.now() - this.startTime;
    const regionNames = Object.keys(this.regions);

    // Calculate percentages
    const summary = {};
    for (const name of regionNames) {
      summary[name] = {
        label: this.regions[name].label,
        color: this.regions[name].colorHex,
        glowColor: this.regions[name].glowHex,
        activationMs: this.activationTime[name],
        activationPercent: totalTime > 0
          ? Math.round((this.activationTime[name] / totalTime) * 100)
          : 0,
        peakIntensity: Math.round(this.peakIntensity[name] * 100)
      };
    }

    return {
      totalDurationMs: totalTime,
      regions: summary,
      frequencyHistory: this.frequencyHistory
    };
  }

  /**
   * Export session as JSON
   */
  exportJSON() {
    return JSON.stringify(this.getSummary(), null, 2);
  }
}
