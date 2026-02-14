/**
 * Resonance Body Map - Glow Engine
 * Calculates and applies multi-layer glow effects
 */

import { VISUAL_CONFIG, FREQUENCY_REGIONS } from '../config.js';
import { clamp, lerp } from '../utils/math.js';
import { easeOutQuad, easeInOutSine } from '../utils/easing.js';

export class GlowEngine {
  constructor(options = {}) {
    this.config = { ...VISUAL_CONFIG, ...options };
    this.regions = FREQUENCY_REGIONS;
    
    // Current glow states
    this.glowStates = {};
    
    // Interpolation targets
    this.targetStates = {};
    
    // Initialize states for all regions
    for (const regionName of Object.keys(this.regions)) {
      this.glowStates[regionName] = {
        intensity: 0,
        color: this.regions[regionName].colorHex,
        glowColor: this.regions[regionName].glowHex,
        pulsePhase: 0
      };
      
      this.targetStates[regionName] = {
        intensity: 0
      };
    }
    
    // Animation state
    this.lastUpdateTime = 0;
    this.isAnimating = false;
  }
  
  /**
   * Update glow states based on frequency mapper intensities
   * @param {Object} intensities - Region intensity map from FrequencyMapper
   * @param {number} deltaTime - Time since last update in ms
   */
  update(intensities, deltaTime) {
    if (!intensities) return; // Guard against null/undefined
    const dt = deltaTime / 1000; // Convert to seconds
    
    for (const [regionName, targetIntensity] of Object.entries(intensities)) {
      const state = this.glowStates[regionName];
      if (!state) continue;
      
      // Apply GlowEngine's own intensity multiplier (#26)
      const multiplier = this.config.glowIntensityMultiplier || 1;
      state.intensity = clamp(targetIntensity * multiplier, 0, 1);
      
      // Update pulse phase for subtle animation
      if (state.intensity > 0.1) {
        state.pulsePhase = (state.pulsePhase + dt * 2) % (Math.PI * 2);
      }
    }
  }
  
  /**
   * Calculate CSS styles for a region's glow effect
   * @param {string} regionName - Name of the region
   * @returns {Object} CSS style properties
   */
  getGlowStyles(regionName) {
    const state = this.glowStates[regionName];
    if (!state || state.intensity < 0.01) {
      return {
        opacity: 0,
        filter: 'none',
        transform: 'scale(1)'
      };
    }
    
    const config = this.regions[regionName];
    
    // Multiplier already applied in update() (#26)
    const scaledIntensity = state.intensity;
    
    // Add subtle pulse variation
    const pulseAmount = Math.sin(state.pulsePhase) * 0.05;
    const effectiveIntensity = clamp(scaledIntensity + pulseAmount, 0, 1);
    
    // Calculate blur sizes based on scaled intensity
    const coreBlur = this.config.glowCore.blur * scaledIntensity;
    const midBlur = this.config.glowMid.blur * scaledIntensity;
    const ambientBlur = this.config.glowAmbient.blur * scaledIntensity;
    
    // Build filter string with multiple layers
    const filters = [];
    
    if (scaledIntensity > 0.3) {
      // Core glow (tight, bright)
      filters.push(`drop-shadow(0 0 ${coreBlur}px ${config.glowHex})`);
    }
    
    if (scaledIntensity > 0.2) {
      // Mid glow
      filters.push(`drop-shadow(0 0 ${midBlur}px ${config.colorHex})`);
    }
    
    // Ambient glow (always visible when active)
    filters.push(`drop-shadow(0 0 ${ambientBlur}px ${config.colorHex})`);
    
    return {
      opacity: effectiveIntensity,
      filter: filters.join(' '),
      transform: `scale(${1 + effectiveIntensity * 0.05})`
    };
  }
  
  /**
   * Get color for frequency display based on active regions
   * Blends colors when multiple regions are active
   */
  getDisplayColor() {
    let totalWeight = 0;
    let r = 0, g = 0, b = 0;
    
    for (const [regionName, state] of Object.entries(this.glowStates)) {
      if (state.intensity > 0.1) {
        const weight = state.intensity;
        const color = this.hexToRgb(state.glowColor);
        
        r += color.r * weight;
        g += color.g * weight;
        b += color.b * weight;
        totalWeight += weight;
      }
    }
    
    if (totalWeight > 0) {
      r = Math.round(r / totalWeight);
      g = Math.round(g / totalWeight);
      b = Math.round(b / totalWeight);
      return `rgb(${r}, ${g}, ${b})`;
    }
    
    return 'rgba(255, 255, 255, 0.9)';
  }
  
  /**
   * Get text shadow for frequency display
   */
  getDisplayGlow() {
    const color = this.getDisplayColor();
    const maxIntensity = Math.max(...Object.values(this.glowStates).map(s => s.intensity));
    
    if (maxIntensity < 0.1) {
      return 'none';
    }
    
    const glowSize = Math.round(maxIntensity * 30);
    return `0 0 ${glowSize}px ${color}, 0 0 ${glowSize * 2}px ${color}`;
  }
  
  /**
   * Get most active region
   */
  getDominantRegion() {
    let maxIntensity = 0;
    let dominantRegion = null;
    
    for (const [regionName, state] of Object.entries(this.glowStates)) {
      if (state.intensity > maxIntensity) {
        maxIntensity = state.intensity;
        dominantRegion = regionName;
      }
    }
    
    if (maxIntensity < 0.15) {
      return null;
    }
    
    return {
      name: dominantRegion,
      intensity: maxIntensity,
      config: this.regions[dominantRegion]
    };
  }
  
  /**
   * Check if any region is glowing
   */
  isAnyGlowing(threshold = 0.1) {
    for (const state of Object.values(this.glowStates)) {
      if (state.intensity > threshold) {
        return true;
      }
    }
    return false;
  }
  
  /**
   * Get total glow energy
   */
  getTotalEnergy() {
    let total = 0;
    for (const state of Object.values(this.glowStates)) {
      total += state.intensity;
    }
    return total;
  }
  
  /**
   * Set global intensity multiplier
   */
  setIntensityMultiplier(multiplier) {
    this.config.glowIntensityMultiplier = clamp(multiplier, 0.1, 3.0);
  }
  
  /**
   * Reset all glow states
   */
  reset() {
    for (const regionName of Object.keys(this.glowStates)) {
      this.glowStates[regionName].intensity = 0;
      this.glowStates[regionName].pulsePhase = 0;
      this.targetStates[regionName].intensity = 0;
    }
  }
  
  /**
   * Convert hex color to RGB
   */
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 255, g: 255, b: 255 };
  }
  
  /**
   * Convert RGB to hex
   */
  rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }
  
  /**
   * Interpolate between two colors
   */
  lerpColor(color1, color2, t) {
    const c1 = this.hexToRgb(color1);
    const c2 = this.hexToRgb(color2);
    
    return this.rgbToHex(
      Math.round(lerp(c1.r, c2.r, t)),
      Math.round(lerp(c1.g, c2.g, t)),
      Math.round(lerp(c1.b, c2.b, t))
    );
  }
  
  /**
   * Create pulsing effect for idle state
   */
  createIdlePulse(time) {
    const result = {};
    const regionNames = Object.keys(this.regions);
    
    for (let i = 0; i < regionNames.length; i++) {
      const regionName = regionNames[i];
      
      // Staggered phase for wave effect (root to crown)
      const phase = time / 4000 + (i * 0.5);
      const pulse = (Math.sin(phase * Math.PI * 2) + 1) / 2;
      
      // Very subtle breathing
      result[regionName] = lerp(
        this.config.breathMinOpacity || 0.02,
        this.config.breathMaxOpacity || 0.05,
        easeInOutSine(pulse)
      );
    }
    
    return result;
  }
}
