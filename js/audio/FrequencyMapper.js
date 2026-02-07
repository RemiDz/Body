/**
 * Resonance Body Map - Frequency Mapper
 * Maps detected frequencies to body regions
 */

import { FREQUENCY_REGIONS, VISUAL_CONFIG } from '../config.js';
import { clamp, smoothstep, expDecay } from '../utils/math.js';

export class FrequencyMapper {
  constructor(options = {}) {
    this.regions = FREQUENCY_REGIONS;
    this.config = { ...VISUAL_CONFIG, ...options };
    
    // Current intensity values for each region (0-1)
    this.intensities = {};
    
    // Target intensities (what we're approaching)
    this.targetIntensities = {};
    
    // Resonance-based intensity tracking
    this.resonanceValues = {};
    this.harmonicContributions = {};
    
    // Hysteresis state for dominant region stability
    this.lastDominant = null;
    this.lastDominantTime = 0;
    this.dominantHistory = [];
    
    // Initialize all regions to 0
    this.reset();
  }
  
  /**
   * Reset all region intensities to 0
   */
  reset() {
    for (const regionName of Object.keys(this.regions)) {
      this.intensities[regionName] = 0;
      this.targetIntensities[regionName] = 0;
      this.resonanceValues[regionName] = 0;
      this.harmonicContributions[regionName] = 0;
    }
    this.lastDominant = null;
    this.lastDominantTime = 0;
    this.dominantHistory = [];
  }
  
  /**
   * Get neighboring regions for boundary blending
   * @param {string} regionName - Name of the region
   * @returns {Object} { prev, next } - neighbor region names or null
   */
  getNeighborRegions(regionName) {
    const order = ['root', 'sacral', 'solar', 'heart', 'throat', 'thirdEye', 'crown'];
    const i = order.indexOf(regionName);
    return {
      prev: i > 0 ? order[i - 1] : null,
      next: i < order.length - 1 ? order[i + 1] : null
    };
  }
  
  /**
   * Update region intensities based on audio analysis data
   * @param {Object} audioData - Data from AudioAnalyzer.analyze()
   * @param {number} deltaTime - Time since last update in ms (defaults to 16.67ms for 60fps)
   * @returns {Object} Current region intensities
   */
  update(audioData, deltaTime = 16.67) {
    // Reset targets and tracking values
    for (const regionName of Object.keys(this.regions)) {
      this.targetIntensities[regionName] = 0;
      this.resonanceValues[regionName] = 0;
      this.harmonicContributions[regionName] = 0;
    }

    if (audioData && audioData.isActive) {
      if (audioData.peaks) {
        for (const peak of audioData.peaks) {
          this.processPeak(peak);
        }
      }
      
      // Process harmonic profile if available
      if (audioData.harmonicProfile && audioData.dominantFrequency > 0) {
        this.processHarmonicProfile(audioData.harmonicProfile, audioData.dominantFrequency);
      }
    }

    const dt = Math.max(0, deltaTime) / 1000;
    const attackTau = Math.max(0.01, (this.config.attackTime || 100) / 1000);
    const decayTau = Math.max(0.01, (this.config.decayTime || 300) / 1000);

    for (const regionName of Object.keys(this.regions)) {
      const target = this.targetIntensities[regionName];
      const current = this.intensities[regionName];

      if (target > current) {
        // Smooth approach to target (time-based)
        this.intensities[regionName] = expDecay(current, target, 1 / attackTau, dt);
      } else {
        // Smooth decay toward 0 (time-based)
        this.intensities[regionName] = expDecay(current, 0, 1 / decayTau, dt);
      }

      this.intensities[regionName] = clamp(
        this.intensities[regionName],
        this.config.glowMinOpacity,
        this.config.glowMaxOpacity
      );
    }

    return { ...this.intensities };
  }
  
  /**
   * Process a single frequency peak and update target intensities
   * Implements resonance-based intensity with boundary blending
   */
  processPeak(peak) {
    const { frequency, amplitude } = peak;
    
    if (frequency < 30 || frequency > 2000) return;
    
    // Find primary region
    let primary = null;
    for (const [regionName, config] of Object.entries(this.regions)) {
      if (frequency >= config.min && frequency < config.max) {
        primary = regionName;
        break;
      }
    }
    if (!primary) return;
    
    const cfg = this.regions[primary];
    const width = cfg.max - cfg.min;
    const center = cfg.center || (cfg.min + cfg.max) / 2;
    
    // Calculate resonance strength (Gaussian curve)
    const distance = Math.abs(frequency - center);
    const halfWidth = width / 2;
    const sigma = halfWidth * 0.7;
    const resonance = Math.exp(-(distance * distance) / (2 * sigma * sigma));
    
    // Track resonance value
    this.resonanceValues[primary] = Math.max(this.resonanceValues[primary], resonance);
    
    // Fixed-Hz boundary blend zone (perceptually consistent across regions)
    const blend = 20; // Hz
    let wPrimary = 1;
    
    const { prev, next } = this.getNeighborRegions(primary);
    
    // Blend with previous region near lower boundary
    if (prev && frequency < cfg.min + blend) {
      const t = smoothstep(cfg.min, cfg.min + blend, frequency);
      wPrimary = t;
      const wPrev = 1 - t;
      if (wPrev > 0.05) {
        const prevIntensity = amplitude * wPrev * resonance * this.config.glowIntensityMultiplier;
        this.targetIntensities[prev] = Math.max(this.targetIntensities[prev], prevIntensity);
      }
    }
    
    // Blend with next region near upper boundary
    if (next && frequency > cfg.max - blend) {
      const t = smoothstep(cfg.max - blend, cfg.max, frequency);
      wPrimary = Math.min(wPrimary, 1 - t);
      if (t > 0.05) {
        const nextIntensity = amplitude * t * resonance * this.config.glowIntensityMultiplier;
        this.targetIntensities[next] = Math.max(this.targetIntensities[next], nextIntensity);
      }
    }
    
    // Apply intensity to primary region
    const intensity = amplitude * wPrimary * resonance * this.config.glowIntensityMultiplier;
    this.targetIntensities[primary] = Math.max(this.targetIntensities[primary], intensity);
    
    // Handle harmonics - frequencies that span multiple regions
    this.processHarmonics(peak);
  }
  
  /**
   * Process harmonic relationships between frequencies
   * A fundamental note will have overtones that light up higher regions
   */
  processHarmonics(peak) {
    const { frequency, amplitude } = peak;
    
    // Only process harmonics for strong enough signals
    if (amplitude < 0.3) return;
    
    // Only process harmonics upward
    const harmonicRatios = [2, 3, 4, 5, 6];
    
    for (const ratio of harmonicRatios) {
      const relatedFreq = frequency * ratio;
      
      // Find region for related frequency
      for (const [regionName, config] of Object.entries(this.regions)) {
        if (relatedFreq >= config.min && relatedFreq < config.max) {
          // sqrt falloff better matches real instrument overtone strength
          const harmonicStrength = amplitude * (0.4 / Math.sqrt(ratio));
          
          if (harmonicStrength > 0.1) {
            this.targetIntensities[regionName] = Math.max(
              this.targetIntensities[regionName],
              harmonicStrength
            );
          }
        }
      }
    }
  }
  
  /**
   * Process harmonic profile for accurate harmonic cascading
   */
  processHarmonicProfile(harmonicProfile, fundamental) {
    if (!harmonicProfile || harmonicProfile.length === 0) return;
    
    for (const harmonic of harmonicProfile) {
      if (!harmonic.present || harmonic.amplitude < 0.1) continue;
      
      const freq = harmonic.frequency;
      
      for (const [regionName, config] of Object.entries(this.regions)) {
        if (freq >= config.min && freq < config.max) {
          const harmonicWeight = 1 / Math.sqrt(harmonic.harmonic);
          const contribution = harmonic.amplitude * harmonicWeight * 0.5;
          
          this.harmonicContributions[regionName] = Math.max(
            this.harmonicContributions[regionName],
            contribution
          );
          
          const intensity = contribution * this.config.glowIntensityMultiplier;
          this.targetIntensities[regionName] = Math.max(
            this.targetIntensities[regionName],
            intensity
          );
          
          break;
        }
      }
    }
  }
  
  /**
   * Get the dominant region (highest intensity) with improved stability
   * Uses hysteresis and dominant history tracking to prevent flickering
   */
  getDominantRegion() {
    const now = performance.now();
    
    let maxIntensity = 0;
    let dominant = null;
    
    for (const [regionName, intensity] of Object.entries(this.intensities)) {
      if (intensity > maxIntensity) {
        maxIntensity = intensity;
        dominant = regionName;
      }
    }
    
    const peakThreshold = this.config.peakThreshold ?? 0.2;
    if (maxIntensity < peakThreshold) {
      return null;
    }
    
    // Update history
    this.dominantHistory.push({ region: dominant, time: now, intensity: maxIntensity });
    this.dominantHistory = this.dominantHistory.filter(h => now - h.time < 500);
    
    // Count occurrences in history
    const counts = {};
    for (const h of this.dominantHistory) {
      counts[h.region] = (counts[h.region] || 0) + 1;
    }
    
    // Hysteresis: prevent rapid toggling between regions
    const HOLD_MS = 400;          // Minimum time before switching
    const SWITCH_MARGIN = 1.25;   // New region must be 25% stronger to switch
    
    if (this.lastDominant && dominant !== this.lastDominant) {
      const cur = this.intensities[this.lastDominant] || 0;
      const cand = this.intensities[dominant] || 0;
      
      const recentlySwitched = (now - this.lastDominantTime) < HOLD_MS;
      const notStrongEnough = cand < cur * SWITCH_MARGIN;
      const notFrequentEnough = counts[dominant] < this.dominantHistory.length * 0.6;
      
      if (recentlySwitched || (notStrongEnough && notFrequentEnough)) {
        // Keep previous dominant - not strong enough or too soon to switch
        dominant = this.lastDominant;
        maxIntensity = cur;
      } else {
        // Switch to new dominant
        this.lastDominant = dominant;
        this.lastDominantTime = now;
      }
    } else {
      // First dominant or same as before
      this.lastDominant = dominant;
      this.lastDominantTime = now;
    }
    
    return {
      name: dominant,
      intensity: maxIntensity,
      resonance: this.resonanceValues[dominant] || 0,
      harmonicContribution: this.harmonicContributions[dominant] || 0,
      config: this.regions[dominant]
    };
  }
  
  /**
   * Get all active regions (above threshold)
   */
  getActiveRegions(threshold = 0.1) {
    const active = [];
    
    for (const [regionName, intensity] of Object.entries(this.intensities)) {
      if (intensity > threshold) {
        active.push({
          name: regionName,
          intensity,
          config: this.regions[regionName]
        });
      }
    }
    
    // Sort by intensity (highest first)
    active.sort((a, b) => b.intensity - a.intensity);
    
    return active;
  }
  
  /**
   * Get region info for a specific frequency
   */
  getRegionForFrequency(frequency) {
    for (const [regionName, config] of Object.entries(this.regions)) {
      if (frequency >= config.min && frequency < config.max) {
        return { name: regionName, config };
      }
    }
    return null;
  }
  
  /**
   * Interpolate color for a frequency (blend between regions at boundaries)
   */
  getColorForFrequency(frequency) {
    const region = this.getRegionForFrequency(frequency);
    if (!region) return '#ffffff';
    return region.config.colorHex;
  }
  
  /**
   * Get glow color for a frequency
   */
  getGlowColorForFrequency(frequency) {
    const region = this.getRegionForFrequency(frequency);
    if (!region) return '#ffffff';
    return region.config.glowHex;
  }
  
  /**
   * Check if any region is active
   */
  isAnyActive(threshold = 0.1) {
    for (const intensity of Object.values(this.intensities)) {
      if (intensity > threshold) return true;
    }
    return false;
  }
  
  /**
   * Get total energy across all regions
   */
  getTotalEnergy() {
    let total = 0;
    for (const intensity of Object.values(this.intensities)) {
      total += intensity;
    }
    return total;
  }
  
  /**
   * Set glow intensity multiplier
   */
  setGlowIntensity(multiplier) {
    this.config.glowIntensityMultiplier = clamp(multiplier, 0.1, 3.0);
  }
  
  /**
   * Set decay rate
   */
  setDecayRate(rate) {
    this.config.glowDecayRate = clamp(rate, 0.5, 0.99);
  }
}
