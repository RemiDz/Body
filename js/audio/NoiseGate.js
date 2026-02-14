/**
 * Resonance Body Map - Noise Gate
 * Filters ambient noise and provides signal detection
 */

import { MovingAverage, PeakDetector, clamp } from '../utils/math.js';

export class NoiseGate {
  constructor(options = {}) {
    this.threshold = options.threshold || -55; // dB
    this.hysteresis = options.hysteresis || 5; // dB — wider to prevent chatter in reverberant rooms
    this.attackTime = options.attackTime || 10; // ms
    this.releaseTime = options.releaseTime || 100; // ms
    this.holdTime = options.holdTime || 50; // ms
    
    // State
    this.isOpen = false;
    this.gateOpenedTime = 0;        // When the gate first opened (for hold time)
    this.lastAboveThresholdTime = 0; // Last time signal was above close threshold
    this.lastCloseTime = 0;
    
    // Smoothing
    this.levelSmoother = new MovingAverage(5);
    this.peakDetector = new PeakDetector(0.95);
    
    // Noise floor estimation (ring buffer for O(1) insert - #31)
    this.noiseFloorEstimate = this.threshold;
    this.noiseFloorWindowSize = 100;
    this.noiseFloorSamples = new Float64Array(this.noiseFloorWindowSize);
    this._nfWriteIdx = 0;
    this._nfCount = 0;
    
    // Auto-calibration
    this.isCalibrating = false;
    this.calibrationSamples = [];
    this.calibrationDuration = 2000; // ms
    this.calibrationStartTime = 0;
  }
  
  /**
   * Process audio level and determine if signal should pass
   * @param {number} levelDb - Current audio level in dB
   * @returns {Object} Gate state and adjusted level
   */
  process(levelDb) {
    const now = performance.now();
    const smoothedLevel = this.levelSmoother.add(levelDb);
    
    // Update peak detection
    this.peakDetector.update(smoothedLevel);
    
    // Collect noise floor samples when signal is quiet
    if (smoothedLevel < this.threshold - 10) {
      this.updateNoiseFloor(smoothedLevel);
    }
    
    // Calibration mode
    if (this.isCalibrating) {
      this.calibrationSamples.push(smoothedLevel);
      
      if (now - this.calibrationStartTime >= this.calibrationDuration) {
        this.finishCalibration();
      }
    }
    
    // Gate logic with hysteresis
    const openThreshold = this.threshold;
    const closeThreshold = this.threshold - this.hysteresis;
    
    if (!this.isOpen) {
      // Check if we should open the gate
      if (smoothedLevel > openThreshold) {
        const timeSinceClose = now - this.lastCloseTime;
        
        // Apply attack time
        if (timeSinceClose >= this.attackTime) {
          this.isOpen = true;
          this.gateOpenedTime = now;
          this.lastAboveThresholdTime = now;
        }
      }
    } else {
      // Check if we should close the gate
      if (smoothedLevel < closeThreshold) {
        const timeSinceOpen = now - this.gateOpenedTime;
        
        // Apply hold time before checking release (prevents closing during brief dips)
        if (timeSinceOpen >= this.holdTime) {
          // Apply release time (measured from when signal last dropped below threshold)
          const timeBelowThreshold = now - this.lastAboveThresholdTime;
          if (timeBelowThreshold >= this.releaseTime) {
            this.isOpen = false;
            this.lastCloseTime = now;
          }
        }
      } else {
        // Signal is above close threshold — track for release timing
        this.lastAboveThresholdTime = now;
      }
    }
    
    // Calculate output level
    let outputLevel = smoothedLevel;
    
    if (!this.isOpen) {
      // Heavily attenuate when gate is closed
      outputLevel = Math.min(smoothedLevel, this.threshold - 20);
    }
    
    return {
      isOpen: this.isOpen,
      inputLevel: levelDb,
      smoothedLevel,
      outputLevel,
      noiseFloor: this.noiseFloorEstimate,
      peak: this.peakDetector.peak
    };
  }
  
  /**
   * Update noise floor estimate
   */
  updateNoiseFloor(level) {
    // Ring buffer insert - O(1) (#31)
    this.noiseFloorSamples[this._nfWriteIdx] = level;
    this._nfWriteIdx = (this._nfWriteIdx + 1) % this.noiseFloorWindowSize;
    if (this._nfCount < this.noiseFloorWindowSize) this._nfCount++;
    
    if (this._nfCount >= 10) {
      // Use median for robustness
      const slice = Array.from(this.noiseFloorSamples.subarray(0, this._nfCount));
      slice.sort((a, b) => a - b);
      const median = slice[Math.floor(slice.length / 2)];
      
      // Smooth update to noise floor estimate
      this.noiseFloorEstimate = this.noiseFloorEstimate * 0.95 + median * 0.05;
    }
  }
  
  /**
   * Start auto-calibration
   * Records ambient noise level for a period to set appropriate threshold
   */
  startCalibration() {
    // Resolve any existing pending calibration Promise before starting a new one (#5)
    if (this.calibrationResolve) {
      this.calibrationResolve({ noiseFloor: this.noiseFloorEstimate, threshold: this.threshold, cancelled: true });
      this.calibrationResolve = null;
    }
    
    this.isCalibrating = true;
    this.calibrationSamples = [];
    this.calibrationStartTime = performance.now();
    
    return new Promise((resolve) => {
      this.calibrationResolve = resolve;
      
      // Safety timeout to prevent hanging forever if animation loop stops (#4)
      this._calibrationTimeout = setTimeout(() => {
        if (this.isCalibrating) {
          this.finishCalibration();
        }
      }, this.calibrationDuration + 1000);
    });
  }
  
  /**
   * Finish calibration and set threshold
   */
  finishCalibration() {
    this.isCalibrating = false;
    if (this._calibrationTimeout) {
      clearTimeout(this._calibrationTimeout);
      this._calibrationTimeout = null;
    }
    
    if (this.calibrationSamples.length > 0) {
      // Calculate statistics
      const sorted = [...this.calibrationSamples].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      
      // Calculate standard deviation
      const mean = this.calibrationSamples.reduce((a, b) => a + b, 0) / this.calibrationSamples.length;
      const variance = this.calibrationSamples.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / this.calibrationSamples.length;
      const stdDev = Math.sqrt(variance);
      
      // Set threshold above noise floor (median + 2 standard deviations)
      const suggestedThreshold = median + Math.max(stdDev * 2, 5);
      
      // Clamp to reasonable range
      this.threshold = clamp(suggestedThreshold, -70, -30);
      this.noiseFloorEstimate = median;
      
      console.log(`Calibration complete. Noise floor: ${median.toFixed(1)}dB, Threshold: ${this.threshold.toFixed(1)}dB`);
    }
    
    if (this.calibrationResolve) {
      this.calibrationResolve({
        noiseFloor: this.noiseFloorEstimate,
        threshold: this.threshold
      });
      this.calibrationResolve = null;
    }
  }
  
  /**
   * Cancel calibration
   */
  cancelCalibration() {
    this.isCalibrating = false;
    this.calibrationSamples = [];
    if (this._calibrationTimeout) {
      clearTimeout(this._calibrationTimeout);
      this._calibrationTimeout = null;
    }
    
    if (this.calibrationResolve) {
      this.calibrationResolve({ noiseFloor: this.noiseFloorEstimate, threshold: this.threshold, cancelled: true });
      this.calibrationResolve = null;
    }
  }
  
  /**
   * Set threshold manually
   */
  setThreshold(dB) {
    this.threshold = clamp(dB, -80, -20);
  }
  
  /**
   * Get current threshold
   */
  getThreshold() {
    return this.threshold;
  }
  
  /**
   * Set hysteresis (difference between open and close threshold)
   */
  setHysteresis(dB) {
    this.hysteresis = clamp(dB, 1, 10);
  }
  
  /**
   * Set attack time
   */
  setAttackTime(ms) {
    this.attackTime = clamp(ms, 1, 100);
  }
  
  /**
   * Set release time
   */
  setReleaseTime(ms) {
    this.releaseTime = clamp(ms, 10, 500);
  }
  
  /**
   * Set hold time
   */
  setHoldTime(ms) {
    this.holdTime = clamp(ms, 0, 200);
  }
  
  /**
   * Reset gate state
   */
  reset() {
    // Cancel any in-progress calibration to avoid dangling Promises
    if (this.isCalibrating) {
      this.cancelCalibration();
    }
    
    this.isOpen = false;
    this.gateOpenedTime = 0;
    this.lastAboveThresholdTime = 0;
    this.lastCloseTime = 0;
    this.levelSmoother.reset();
    this.peakDetector.reset();
  }
  
  /**
   * Check if gate is currently open
   */
  isGateOpen() {
    return this.isOpen;
  }
}
