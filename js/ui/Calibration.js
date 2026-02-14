/**
 * Resonance Body Map - Calibration
 * Microphone sensitivity and noise floor calibration
 */

import { UI_CONFIG, AUDIO_CONFIG } from '../config.js';
import { clamp, MovingAverage } from '../utils/math.js';

export class Calibration {
  constructor(options = {}) {
    this.config = { 
      ...AUDIO_CONFIG, 
      ...UI_CONFIG, 
      ...options 
    };
    
    // Current calibration values
    this.gain = this.config.defaultGain || 1.0;
    this.noiseFloor = this.config.noiseFloor || -55;
    this.glowIntensity = 1.0;
    this.particlesEnabled = true;
    this.cascadeEnabled = true;
    this.cymaticsEnabled = true;
    this.cymaticsPosition = 'region';
    this.tunerEnabled = false;
    this.freqRefEnabled = false;
    this.colorTheme = 'default';
    this.vizPreset = 'standard';
    
    // Calibration state
    this.isCalibrating = false;
    this.calibrationProgress = 0;
    this.calibrationSamples = [];
    this.calibrationDuration = 3000; // ms
    this.calibrationStartTime = 0;
    
    // Level tracking
    this.levelHistory = new MovingAverage(30);
    this.peakLevel = -100;
    
    // Callbacks
    this.onCalibrationComplete = null;
    this.onSettingsChange = null;
  }
  
  /**
   * Start auto-calibration
   * Records ambient noise level for a period
   */
  startCalibration() {
    if (this.isCalibrating) return;
    
    this.isCalibrating = true;
    this.calibrationProgress = 0;
    this.calibrationSamples = [];
    this.calibrationStartTime = performance.now();
    
    console.log('Calibration started...');
    
    return new Promise((resolve) => {
      this.calibrationResolve = resolve;
    });
  }
  
  /**
   * Process a calibration sample
   * @param {number} levelDb - Current audio level in dB
   */
  processSample(levelDb) {
    if (!this.isCalibrating) return;
    
    const elapsed = performance.now() - this.calibrationStartTime;
    this.calibrationProgress = Math.min(elapsed / this.calibrationDuration, 1);
    
    // Collect sample
    this.calibrationSamples.push(levelDb);
    
    // Check if calibration is complete
    if (elapsed >= this.calibrationDuration) {
      this.finishCalibration();
    }
  }
  
  /**
   * Finish calibration and calculate optimal settings
   */
  finishCalibration() {
    if (!this.isCalibrating) return;
    
    this.isCalibrating = false;
    
    if (this.calibrationSamples.length < 10) {
      console.warn('Not enough calibration samples');
      if (this.calibrationResolve) {
        this.calibrationResolve({ success: false });
        this.calibrationResolve = null;
      }
      return;
    }
    
    // Calculate statistics
    const sorted = [...this.calibrationSamples].sort((a, b) => a - b);
    
    // Use median for robustness against outliers
    const median = sorted[Math.floor(sorted.length / 2)];
    
    // Calculate percentiles
    const p25 = sorted[Math.floor(sorted.length * 0.25)];
    const p75 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = p75 - p25; // Interquartile range
    
    // Calculate mean (for reference)
    const mean = this.calibrationSamples.reduce((a, b) => a + b, 0) / this.calibrationSamples.length;
    
    // Calculate standard deviation
    const variance = this.calibrationSamples.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / this.calibrationSamples.length;
    const stdDev = Math.sqrt(variance);
    
    // Set noise floor above ambient level
    // Use median + 2*stdDev or median + IQR, whichever is more conservative
    const suggestedNoiseFloor = Math.max(
      median + stdDev * 2,
      median + iqr * 1.5,
      median + 5 // Minimum 5dB above median
    );
    
    // Clamp to reasonable range
    this.noiseFloor = clamp(Math.round(suggestedNoiseFloor), -70, -30);
    
    // Suggest gain based on peak levels
    const maxLevel = sorted[sorted.length - 1];
    if (maxLevel < -50) {
      // Very quiet environment, suggest higher gain
      this.gain = clamp(this.gain * 1.5, 1.0, 2.5);
    } else if (maxLevel > -20) {
      // Loud environment, suggest lower gain
      this.gain = clamp(this.gain * 0.7, 0.5, 1.5);
    }
    
    const results = {
      success: true,
      noiseFloor: this.noiseFloor,
      gain: this.gain,
      stats: {
        median,
        mean,
        stdDev,
        min: sorted[0],
        max: sorted[sorted.length - 1],
        samples: this.calibrationSamples.length
      }
    };
    
    console.log('Calibration complete:', results);
    
    // Notify listeners
    if (this.onCalibrationComplete) {
      this.onCalibrationComplete(results);
    }
    
    if (this.calibrationResolve) {
      this.calibrationResolve(results);
      this.calibrationResolve = null;
    }
    
    // Emit settings change
    this.emitChange();
  }
  
  /**
   * Cancel calibration
   */
  cancelCalibration() {
    if (!this.isCalibrating) return;
    
    this.isCalibrating = false;
    this.calibrationSamples = [];
    
    if (this.calibrationResolve) {
      this.calibrationResolve({ success: false, cancelled: true });
      this.calibrationResolve = null;
    }
  }
  
  /**
   * Set gain manually
   */
  setGain(value) {
    this.gain = clamp(value, this.config.gainRange[0], this.config.gainRange[1]);
    this.emitChange();
  }
  
  /**
   * Set noise floor manually
   */
  setNoiseFloor(value) {
    this.noiseFloor = clamp(value, -80, -20);
    this.emitChange();
  }
  
  /**
   * Set glow intensity
   */
  setGlowIntensity(value) {
    this.glowIntensity = clamp(value, 0.1, 3.0);
    this.emitChange();
  }
  
  /**
   * Set particles enabled
   */
  setParticlesEnabled(enabled) {
    this.particlesEnabled = enabled;
    this.emitChange();
  }
  
  /**
   * Set cascade enabled
   */
  setCascadeEnabled(enabled) {
    this.cascadeEnabled = enabled;
    this.emitChange();
  }
  
  /**
   * Set cymatics enabled
   */
  setCymaticsEnabled(enabled) {
    this.cymaticsEnabled = enabled;
    this.emitChange();
  }
  
  /**
   * Set cymatics position mode
   */
  setCymaticsPosition(mode) {
    this.cymaticsPosition = mode;
    this.emitChange();
  }
  
  /**
   * Set tuner enabled
   */
  setTunerEnabled(enabled) {
    this.tunerEnabled = enabled;
    this.emitChange();
  }
  
  /**
   * Set frequency reference enabled
   */
  setFreqRefEnabled(enabled) {
    this.freqRefEnabled = enabled;
    this.emitChange();
  }
  
  /**
   * Set color theme
   */
  setColorTheme(theme) {
    this.colorTheme = theme;
    this.emitChange();
  }
  
  /**
   * Set visualization preset
   */
  setVizPreset(preset) {
    this.vizPreset = preset;
    this.emitChange();
  }
  
  /**
   * Apply settings from object
   */
  applySettings(settings) {
    if (settings.gain !== undefined) {
      this.gain = clamp(settings.gain, this.config.gainRange[0], this.config.gainRange[1]);
    }
    
    if (settings.noiseFloor !== undefined) {
      this.noiseFloor = clamp(settings.noiseFloor, -80, -20);
    }
    
    if (settings.glowIntensity !== undefined) {
      this.glowIntensity = clamp(settings.glowIntensity, 0.1, 3.0);
    }
    
    if (settings.particlesEnabled !== undefined) {
      this.particlesEnabled = settings.particlesEnabled;
    }
    
    if (settings.cascadeEnabled !== undefined) {
      this.cascadeEnabled = settings.cascadeEnabled;
    }
    
    if (settings.cymaticsEnabled !== undefined) {
      this.cymaticsEnabled = settings.cymaticsEnabled;
    }
    
    if (settings.cymaticsPosition !== undefined) {
      this.cymaticsPosition = settings.cymaticsPosition;
    }
    
    if (settings.tunerEnabled !== undefined) {
      this.tunerEnabled = settings.tunerEnabled;
    }
    
    if (settings.freqRefEnabled !== undefined) {
      this.freqRefEnabled = settings.freqRefEnabled;
    }
    
    if (settings.colorTheme !== undefined) {
      this.colorTheme = settings.colorTheme;
    }
    
    if (settings.vizPreset !== undefined) {
      this.vizPreset = settings.vizPreset;
    }
    
    this.emitChange();
  }
  
  /**
   * Get current settings
   */
  getSettings() {
    return {
      gain: this.gain,
      noiseFloor: this.noiseFloor,
      glowIntensity: this.glowIntensity,
      particlesEnabled: this.particlesEnabled,
      cascadeEnabled: this.cascadeEnabled,
      cymaticsEnabled: this.cymaticsEnabled,
      cymaticsPosition: this.cymaticsPosition,
      tunerEnabled: this.tunerEnabled,
      freqRefEnabled: this.freqRefEnabled,
      colorTheme: this.colorTheme,
      vizPreset: this.vizPreset
    };
  }
  
  /**
   * Emit settings change event
   */
  emitChange() {
    if (this.onSettingsChange) {
      this.onSettingsChange(this.getSettings());
    }
  }
  
  /**
   * Update level tracking
   * @param {number} levelDb - Current audio level in dB
   */
  updateLevel(levelDb) {
    const smoothed = this.levelHistory.add(levelDb);
    
    if (levelDb > this.peakLevel) {
      this.peakLevel = levelDb;
    }
    
    // Slowly decay peak toward silence
    // Use time-based decay to be frame-rate independent
    const now = performance.now();
    const dt = this._lastUpdateTime ? (now - this._lastUpdateTime) / 16.67 : 1;
    this._lastUpdateTime = now;
    this.peakLevel = Math.max(this.peakLevel - 0.05 * dt, -100); // Lower bound (#32)
    
    // Process calibration sample if calibrating
    if (this.isCalibrating) {
      this.processSample(levelDb);
    }
    
    return {
      current: levelDb,
      smoothed,
      peak: this.peakLevel
    };
  }
  
  /**
   * Check if level is above noise floor
   */
  isAboveNoiseFloor(levelDb) {
    return levelDb > this.noiseFloor;
  }
  
  /**
   * Get calibration progress (0-1)
   */
  getCalibrationProgress() {
    return this.calibrationProgress;
  }
  
  /**
   * Check if calibration is in progress
   */
  isCalibrationInProgress() {
    return this.isCalibrating;
  }
  
  /**
   * Reset peak tracking
   */
  resetPeak() {
    this.peakLevel = -100;
    this.levelHistory.reset();
  }
  
  /**
   * Save settings to localStorage
   */
  saveSettings() {
    try {
      const settings = this.getSettings();
      localStorage.setItem('resonance-calibration', JSON.stringify(settings));
      console.log('Settings saved:', settings);
    } catch (e) {
      console.warn('Could not save settings:', e);
    }
  }
  
  /**
   * Load settings from localStorage
   */
  loadSettings() {
    try {
      const saved = localStorage.getItem('resonance-calibration');
      if (saved) {
        const settings = JSON.parse(saved);
        this.applySettings(settings);
        console.log('Settings loaded:', settings);
        return settings;
      }
    } catch (e) {
      console.warn('Could not load settings:', e);
    }
    return null;
  }
  
  /**
   * Reset to defaults
   */
  resetToDefaults() {
    this.gain = this.config.defaultGain || 1.0;
    this.noiseFloor = this.config.noiseFloor || -55;
    this.glowIntensity = 1.0;
    this.particlesEnabled = true;
    this.cascadeEnabled = true;
    this.cymaticsEnabled = true;
    this.cymaticsPosition = 'region';
    this.tunerEnabled = false;
    this.freqRefEnabled = false;
    this.colorTheme = 'default';
    this.vizPreset = 'standard';
    this.emitChange();
    this.saveSettings();
  }
}
