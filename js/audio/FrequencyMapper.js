/**
 * Resonance Body Map - Frequency Mapper
 * Maps detected frequencies to body regions
 */

import { FREQUENCY_REGIONS, VISUAL_CONFIG } from '../config.js';
import { clamp, approach } from '../utils/math.js';

export class FrequencyMapper {
  constructor(options = {}) {
    this.regions = FREQUENCY_REGIONS;
    this.config = { ...VISUAL_CONFIG, ...options };
    
    // Current intensity values for each region (0-1)
    this.intensities = {};
    
    // Target intensities (what we're approaching)
    this.targetIntensities = {};
    
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
    }
  }
  
  /**
   * Update region intensities based on audio analysis data
   * @param {Object} audioData - Data from AudioAnalyzer.analyze()
   * @returns {Object} Current region intensities
   */
  update(audioData) {
    // Reset targets
    for (const regionName of Object.keys(this.regions)) {
      this.targetIntensities[regionName] = 0;
    }
    
    if (audioData && audioData.isActive && audioData.peaks) {
      // Process each peak
      for (const peak of audioData.peaks) {
        this.processPeak(peak);
      }
    }
    
    // Smooth transition to target values
    const decayRate = this.config.glowDecayRate;
    const attackRate = 1 - (this.config.attackTime / 1000); // Faster attack
    
    for (const regionName of Object.keys(this.regions)) {
      const target = this.targetIntensities[regionName];
      const current = this.intensities[regionName];
      
      if (target > current) {
        // Attack - fast rise
        this.intensities[regionName] = approach(current, target, attackRate);
      } else {
        // Decay - slow fall
        this.intensities[regionName] = current * decayRate;
      }
      
      // Clamp to valid range
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
   */
  processPeak(peak) {
    const { frequency, amplitude } = peak;
    
    // Find which region(s) this frequency belongs to
    for (const [regionName, config] of Object.entries(this.regions)) {
      if (frequency >= config.min && frequency < config.max) {
        // Calculate position within region (for intensity falloff at edges)
        const regionCenter = (config.min + config.max) / 2;
        const regionWidth = config.max - config.min;
        const distanceFromCenter = Math.abs(frequency - regionCenter);
        const normalizedDistance = distanceFromCenter / (regionWidth / 2);
        
        // Apply soft falloff at edges
        const edgeFalloff = 1 - (normalizedDistance * 0.3);
        
        // Calculate final intensity for this peak
        const intensity = amplitude * edgeFalloff * this.config.glowIntensityMultiplier;
        
        // Update target if this peak is stronger
        this.targetIntensities[regionName] = Math.max(
          this.targetIntensities[regionName],
          intensity
        );
      }
    }
    
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
    
    // Check if this might be a harmonic of a lower fundamental
    // Common harmonics: 2x, 3x, 4x, 5x, 6x, etc.
    const harmonicRatios = [0.5, 2, 3, 4, 5, 6];
    
    for (const ratio of harmonicRatios) {
      const relatedFreq = frequency * ratio;
      
      // Find region for related frequency
      for (const [regionName, config] of Object.entries(this.regions)) {
        if (relatedFreq >= config.min && relatedFreq < config.max) {
          // Harmonics are weaker than fundamentals
          const harmonicStrength = amplitude * (0.3 / ratio);
          
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
   * Get the dominant region (highest intensity)
   */
  getDominantRegion() {
    let maxIntensity = 0;
    let dominantRegion = null;
    
    for (const [regionName, intensity] of Object.entries(this.intensities)) {
      if (intensity > maxIntensity) {
        maxIntensity = intensity;
        dominantRegion = regionName;
      }
    }
    
    if (maxIntensity < this.config.peakThreshold) {
      return null;
    }
    
    return {
      name: dominantRegion,
      intensity: maxIntensity,
      config: this.regions[dominantRegion]
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
