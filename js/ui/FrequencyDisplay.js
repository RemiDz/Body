/**
 * Resonance Body Map - Frequency Display
 * Shows dominant frequency and region label
 */

import { FREQUENCY_REGIONS, VISUAL_CONFIG } from '../config.js';
import { clamp, lerp, MovingAverage } from '../utils/math.js';

export class FrequencyDisplay {
  constructor(options = {}) {
    this.config = { ...VISUAL_CONFIG, ...options };
    this.regions = FREQUENCY_REGIONS;
    
    // DOM elements
    this.container = document.getElementById('frequencyDisplay');
    this.valueElement = document.getElementById('freqValue');
    this.numberElement = this.valueElement?.querySelector('.freq-number');
    this.regionElement = document.getElementById('freqRegion');
    
    // State
    this.currentFrequency = 0;
    this.displayedFrequency = 0;
    this.currentColor = 'rgba(255, 255, 255, 0.9)';
    this.currentGlow = 'none';
    this.isVisible = false;
    
    // Smoothing
    this.frequencySmoother = new MovingAverage(5);
    
    // Animation
    this.animationFrame = null;
    this.lastUpdateTime = 0;
  }
  
  /**
   * Update display with new frequency data
   * @param {number} frequency - Dominant frequency in Hz
   * @param {number} amplitude - Signal amplitude (0-1)
   * @param {string} color - Color hex for display
   * @param {string} regionLabel - Optional region label
   */
  update(frequency, amplitude, color = null, regionLabel = null) {
    // Smooth frequency for display
    const smoothedFreq = this.frequencySmoother.add(frequency);
    
    // Update target frequency
    this.currentFrequency = smoothedFreq;
    
    // Determine if we should show the display
    const shouldShow = frequency > 0 && amplitude > 0.1;
    
    if (shouldShow !== this.isVisible) {
      this.setVisibility(shouldShow);
    }
    
    if (shouldShow) {
      // Update color
      if (color) {
        this.setColor(color, amplitude);
      } else {
        // Auto-determine color from frequency
        const region = this.getRegionForFrequency(frequency);
        if (region) {
          this.setColor(region.config.glowHex, amplitude);
          regionLabel = regionLabel || region.config.label;
        }
      }
      
      // Update region label
      if (regionLabel && this.regionElement) {
        this.regionElement.textContent = regionLabel;
        this.regionElement.classList.add('visible');
      }
      
      // Animate number transition
      this.animateNumber();
    } else {
      // Hide region label
      if (this.regionElement) {
        this.regionElement.classList.remove('visible');
      }
    }
  }
  
  /**
   * Animate the displayed number towards current frequency
   */
  animateNumber() {
    const target = Math.round(this.currentFrequency);
    const current = this.displayedFrequency;
    
    // Smooth interpolation
    const diff = target - current;
    
    if (Math.abs(diff) < 1) {
      this.displayedFrequency = target;
    } else {
      // Faster interpolation for larger differences
      const speed = Math.min(Math.abs(diff) * 0.2, 50);
      this.displayedFrequency = current + Math.sign(diff) * speed;
    }
    
    // Update DOM
    if (this.numberElement) {
      this.numberElement.textContent = Math.round(this.displayedFrequency);
    }
  }
  
  /**
   * Set visibility with animation
   */
  setVisibility(visible) {
    this.isVisible = visible;
    
    if (this.valueElement) {
      if (visible) {
        this.valueElement.classList.add('visible');
      } else {
        this.valueElement.classList.remove('visible');
        this.frequencySmoother.reset();
      }
    }
  }
  
  /**
   * Set display color and glow
   */
  setColor(color, intensity = 1) {
    this.currentColor = color;
    
    if (this.valueElement) {
      this.valueElement.style.color = color;
      
      // Calculate glow based on intensity
      const glowSize = Math.round(intensity * 30);
      const glow = `0 0 ${glowSize}px ${color}, 0 0 ${glowSize * 1.5}px ${color}`;
      this.valueElement.style.textShadow = glow;
    }
  }
  
  /**
   * Get region for a frequency
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
   * Set frequency directly (for testing)
   */
  setFrequency(frequency) {
    this.currentFrequency = frequency;
    this.displayedFrequency = frequency;
    
    if (this.numberElement) {
      this.numberElement.textContent = Math.round(frequency);
    }
    
    if (frequency > 0) {
      this.setVisibility(true);
      const region = this.getRegionForFrequency(frequency);
      if (region) {
        this.setColor(region.config.glowHex, 1);
        if (this.regionElement) {
          this.regionElement.textContent = region.config.label;
          this.regionElement.classList.add('visible');
        }
      }
    }
  }
  
  /**
   * Hide the display
   */
  hide() {
    this.setVisibility(false);
    this.currentFrequency = 0;
    
    if (this.regionElement) {
      this.regionElement.classList.remove('visible');
    }
  }
  
  /**
   * Reset to initial state
   */
  reset() {
    this.hide();
    this.displayedFrequency = 0;
    this.frequencySmoother.reset();
    
    if (this.valueElement) {
      this.valueElement.style.color = '';
      this.valueElement.style.textShadow = '';
    }
    
    if (this.numberElement) {
      this.numberElement.textContent = '---';
    }
    
    if (this.regionElement) {
      this.regionElement.textContent = '';
    }
  }
  
  /**
   * Test animation
   */
  async testAnimation() {
    const testFrequencies = [65, 130, 262, 349, 440, 523, 698, 880, 1046];
    
    for (const freq of testFrequencies) {
      const region = this.getRegionForFrequency(freq);
      this.update(freq, 0.8, region?.config.glowHex, region?.config.label);
      await new Promise(r => setTimeout(r, 500));
    }
    
    this.hide();
  }
}
