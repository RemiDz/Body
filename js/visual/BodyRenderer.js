/**
 * Resonance Body Map - Body Renderer
 * Manipulates the SVG body visualization
 */

import { FREQUENCY_REGIONS, UI_CONFIG } from '../config.js';
import { clamp } from '../utils/math.js';

export class BodyRenderer {
  constructor(containerElement, options = {}) {
    this.container = containerElement;
    this.config = { ...UI_CONFIG, ...options };
    this.regions = FREQUENCY_REGIONS;
    
    this.svgElement = null;
    this.energyLayer = null;
    this.organsLayer = null;
    
    // Cache element references
    this.energyElements = {};
    this.organElements = {};
    
    this.isLoaded = false;
    this.isIdleAnimating = false;
    
    // Callbacks
    this.onLoad = null;
    this.onError = null;
  }
  
  /**
   * Load and inject the body SVG
   */
  async load(svgPath = null) {
    const path = svgPath || this.config.bodySvgPath;
    
    try {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`Failed to load SVG: ${response.status}`);
      }
      
      const svgText = await response.text();
      
      // Create a temporary container to parse SVG
      const temp = document.createElement('div');
      temp.innerHTML = svgText;
      
      this.svgElement = temp.querySelector('svg');
      if (!this.svgElement) {
        throw new Error('No SVG element found in file');
      }
      
      // Add to DOM
      this.container.innerHTML = '';
      this.container.appendChild(this.svgElement);
      
      // Cache layer references
      this.energyLayer = this.svgElement.querySelector('#energy-layer');
      this.organsLayer = this.svgElement.querySelector('#organs-layer');
      
      // Cache individual element references for performance
      this.cacheElements();
      
      this.isLoaded = true;
      
      // Start idle breathing animation on load - makes body feel alive
      this.startIdleAnimation();
      
      if (this.onLoad) {
        this.onLoad();
      }
      
      return true;
      
    } catch (error) {
      console.error('BodyRenderer load error:', error);
      
      if (this.onError) {
        this.onError(error);
      }
      
      return false;
    }
  }
  
  /**
   * Cache DOM element references for performance
   */
  cacheElements() {
    // Cache energy region elements
    for (const regionName of Object.keys(this.regions)) {
      const elementId = this.regions[regionName].energyElement;
      const element = this.svgElement.querySelector(`#${elementId}`);
      if (element) {
        this.energyElements[regionName] = element;
      }
    }
    
    // Cache organ elements
    for (const [regionName, config] of Object.entries(this.regions)) {
      this.organElements[regionName] = [];
      
      for (const organId of config.organs) {
        const element = this.svgElement.querySelector(`#${organId}`);
        if (element) {
          this.organElements[regionName].push(element);
        }
      }
    }
  }
  
  /**
   * Set intensity for a single region
   * @param {string} regionName - Name of the region (root, sacral, etc.)
   * @param {number} intensity - Intensity value 0-1
   */
  setRegionIntensity(regionName, intensity) {
    if (!this.isLoaded) return;
    
    const clampedIntensity = clamp(intensity, 0, 1);
    const config = this.regions[regionName];
    
    if (!config) return;
    
    // Update energy layer glow
    const energyEl = this.energyElements[regionName];
    if (energyEl) {
      energyEl.style.opacity = clampedIntensity;
    }
    
    // Update organ elements
    const organs = this.organElements[regionName];
    if (organs) {
      for (const organ of organs) {
        this.updateOrganElement(organ, clampedIntensity, config);
      }
    }
  }
  
  /**
   * Set all region intensities at once
   * @param {Object} intensityMap - Map of region names to intensities
   */
  setAllRegions(intensityMap) {
    if (!this.isLoaded) return;
    
    for (const [regionName, intensity] of Object.entries(intensityMap)) {
      this.setRegionIntensity(regionName, intensity);
    }
  }
  
  /**
   * Update a single organ element's visual state
   */
  updateOrganElement(element, intensity, regionConfig) {
    if (!element) return;
    
    if (intensity > 0.05) {
      // Active state - increase fill opacity and add glow
      const fillOpacity = 0.05 + intensity * 0.4;
      const strokeOpacity = 0.15 + intensity * 0.5;
      
      element.style.fillOpacity = fillOpacity;
      element.style.strokeOpacity = strokeOpacity;
      
      // Apply glow using drop-shadow (more performant than filter)
      const glowSize = Math.round(intensity * 15);
      const glowColor = regionConfig.glowHex;
      element.style.filter = `drop-shadow(0 0 ${glowSize}px ${glowColor})`;
    } else {
      // Inactive state - reset to default
      element.style.fillOpacity = '';
      element.style.strokeOpacity = '';
      element.style.filter = '';
    }
  }
  
  /**
   * Start idle breathing animation
   */
  startIdleAnimation() {
    if (this.isIdleAnimating || !this.isLoaded) return;
    
    this.isIdleAnimating = true;
    this.container.classList.add('idle-breathing');
    
    // Make energy layer visible for breathing effect
    if (this.energyLayer) {
      this.energyLayer.style.opacity = '1';
    }
  }
  
  /**
   * Stop idle breathing animation
   */
  stopIdleAnimation() {
    if (!this.isIdleAnimating) return;
    
    this.isIdleAnimating = false;
    this.container.classList.remove('idle-breathing');
  }
  
  /**
   * Reset all visuals to default state
   */
  reset() {
    if (!this.isLoaded) return;
    
    this.stopIdleAnimation();
    
    // Reset all energy elements
    for (const element of Object.values(this.energyElements)) {
      if (element) {
        element.style.opacity = '0';
      }
    }
    
    // Reset all organ elements
    for (const organs of Object.values(this.organElements)) {
      for (const organ of organs) {
        organ.style.fillOpacity = '';
        organ.style.strokeOpacity = '';
        organ.style.filter = '';
      }
    }
  }
  
  /**
   * Get bounding box for a region (for particle spawning)
   */
  getRegionBounds(regionName) {
    const energyEl = this.energyElements[regionName];
    if (!energyEl || !this.svgElement) return null;
    
    // Get SVG viewBox
    const viewBox = this.svgElement.viewBox.baseVal;
    const svgRect = this.svgElement.getBoundingClientRect();
    
    // Get element bounding box in SVG coordinates
    const bbox = energyEl.getBBox();
    
    // Calculate scale factors
    const scaleX = svgRect.width / viewBox.width;
    const scaleY = svgRect.height / viewBox.height;
    
    // Convert to screen coordinates
    return {
      x: svgRect.left + bbox.x * scaleX,
      y: svgRect.top + bbox.y * scaleY,
      width: bbox.width * scaleX,
      height: bbox.height * scaleY,
      centerX: svgRect.left + (bbox.x + bbox.width / 2) * scaleX,
      centerY: svgRect.top + (bbox.y + bbox.height / 2) * scaleY
    };
  }
  
  /**
   * Get center point of the entire body SVG (for global effects)
   */
  getBodyCenter() {
    if (!this.svgElement) return null;
    
    const rect = this.svgElement.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
  }
  
  /**
   * Apply a global effect to the body (e.g., full-body glow)
   */
  setGlobalGlow(intensity, color = '#ffffff') {
    if (!this.svgElement) return;
    
    if (intensity > 0.05) {
      const glowSize = Math.round(intensity * 30);
      this.svgElement.style.filter = `drop-shadow(0 0 ${glowSize}px ${color})`;
    } else {
      this.svgElement.style.filter = '';
    }
  }
  
  /**
   * Show all regions briefly for testing/preview
   */
  async testAnimation() {
    if (!this.isLoaded) return;
    
    const regionNames = Object.keys(this.regions);
    
    for (const regionName of regionNames) {
      // Fade in
      for (let i = 0; i <= 10; i++) {
        this.setRegionIntensity(regionName, i / 10);
        await new Promise(r => setTimeout(r, 30));
      }
      
      // Hold
      await new Promise(r => setTimeout(r, 200));
      
      // Fade out
      for (let i = 10; i >= 0; i--) {
        this.setRegionIntensity(regionName, i / 10);
        await new Promise(r => setTimeout(r, 30));
      }
    }
  }
  
  /**
   * Check if SVG is loaded
   */
  isReady() {
    return this.isLoaded;
  }
  
  /**
   * Destroy and clean up
   */
  destroy() {
    this.reset();
    this.container.innerHTML = '';
    this.svgElement = null;
    this.energyLayer = null;
    this.organsLayer = null;
    this.energyElements = {};
    this.organElements = {};
    this.isLoaded = false;
  }
}
