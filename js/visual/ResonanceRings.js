/**
 * Resonance Body Map - Resonance Bloom
 * Gentle expanding circles that bloom from chakra centers
 * Creates a soft, symmetrical pulse effect like ripples or a flower opening
 */

import { FREQUENCY_REGIONS } from '../config.js';

export class ResonanceRings {
  /**
   * Create resonance bloom visualization
   * @param {string} containerSelector - CSS selector for container element
   */
  constructor(containerSelector) {
    this.container = document.querySelector(containerSelector);
    if (!this.container) {
      console.error(`ResonanceRings: Container not found: ${containerSelector}`);
      return;
    }
    
    // Store reference to frequency regions config
    this.regions = FREQUENCY_REGIONS;
    
    // Cache for region center positions
    this.regionCenterCache = {};
    
    // Bloom configuration
    this.config = {
      maxRadius: 45,           // Maximum bloom radius
      minRadius: 2,            // Starting radius (dot)
      bloomDuration: 1800,     // How long each bloom takes to expand (ms)
      spawnInterval: 600,      // Time between spawning new blooms (ms)
      maxBlooms: 3,            // Max concurrent blooms per region
      strokeWidth: 1.5,        // Line thickness
      maxOpacity: 0.4          // Peak opacity
    };
    
    // Create SVG element
    this.svg = this.createSVG();
    
    // Track active blooms per region
    this.activeBlooms = {};
    
    // Track last spawn time per region
    this.lastSpawnTime = {};
    
    // Initialize for all regions
    for (const regionName of Object.keys(this.regions)) {
      this.activeBlooms[regionName] = [];
      this.lastSpawnTime[regionName] = 0;
    }

    // Invalidate position cache on resize
    this._resizeHandler = () => this.clearCache();
    window.addEventListener('resize', this._resizeHandler);
  }
  
  /**
   * Create and append SVG element
   * @returns {SVGElement} The created SVG element
   */
  createSVG() {
    // Check if SVG already exists
    let svg = document.getElementById('resonance-rings');
    
    if (!svg) {
      svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('id', 'resonance-rings');
      svg.setAttribute('class', 'overlay-svg');
      this.container.appendChild(svg);
    }
    
    return svg;
  }
  
  /**
   * Update resonance bloom visualization
   * @param {Object} resonanceValues - Resonance quality values per region (0-1)
   * @param {Object} intensities - Intensity values per region
   */
  update(resonanceValues, intensities) {
    if (!resonanceValues || !intensities) {
      return;
    }
    
    const now = performance.now();
    
    // Process each region
    for (const regionName of Object.keys(this.regions)) {
      const intensity = intensities[regionName] || 0;
      const resonance = resonanceValues[regionName] || 0;
      
      if (intensity > 0.15 && resonance > 0.1) {
        // Maybe spawn a new bloom
        this.maybeSpawnBloom(regionName, resonance, intensity, now);
      }
      
      // Update existing blooms
      this.updateBlooms(regionName, now);
    }
  }
  
  /**
   * Maybe spawn a new bloom for a region
   */
  maybeSpawnBloom(regionName, resonance, intensity, now) {
    const timeSinceLast = now - this.lastSpawnTime[regionName];
    
    // Spawn rate based on resonance (better resonance = faster spawning)
    const spawnInterval = this.config.spawnInterval / (0.5 + resonance * 0.5);
    
    if (timeSinceLast < spawnInterval) {
      return;
    }
    
    // Limit concurrent blooms
    if (this.activeBlooms[regionName].length >= this.config.maxBlooms) {
      return;
    }
    
    const center = this.getRegionCenter(regionName);
    if (!center) {
      return;
    }
    
    const regionConfig = this.regions[regionName];
    
    // Create bloom circle
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('class', 'resonance-bloom');
    circle.setAttribute('cx', center.x);
    circle.setAttribute('cy', center.y);
    circle.setAttribute('r', this.config.minRadius);
    circle.setAttribute('fill', 'none');
    circle.setAttribute('stroke', regionConfig.glowHex);
    circle.setAttribute('stroke-width', this.config.strokeWidth);
    circle.setAttribute('opacity', 0);
    
    this.svg.appendChild(circle);
    
    // Track bloom state
    this.activeBlooms[regionName].push({
      element: circle,
      startTime: now,
      resonance: resonance,
      intensity: intensity
    });
    
    this.lastSpawnTime[regionName] = now;
  }
  
  /**
   * Update all blooms for a region
   */
  updateBlooms(regionName, now) {
    const blooms = this.activeBlooms[regionName];
    
    for (let i = blooms.length - 1; i >= 0; i--) {
      const bloom = blooms[i];
      const elapsed = now - bloom.startTime;
      const progress = elapsed / this.config.bloomDuration;
      
      if (progress >= 1) {
        // Bloom complete - remove it
        if (bloom.element.parentNode) {
          bloom.element.parentNode.removeChild(bloom.element);
        }
        blooms.splice(i, 1);
        continue;
      }
      
      // Calculate current radius - eased expansion
      const easedProgress = this.easeOutQuad(progress);
      const radius = this.config.minRadius + 
        (this.config.maxRadius - this.config.minRadius) * easedProgress;
      
      // Calculate opacity - fade in then fade out
      // Peak at 30% progress, then fade out
      let opacity;
      if (progress < 0.3) {
        // Fade in
        opacity = (progress / 0.3) * this.config.maxOpacity * bloom.resonance;
      } else {
        // Fade out
        const fadeProgress = (progress - 0.3) / 0.7;
        opacity = this.config.maxOpacity * bloom.resonance * (1 - fadeProgress);
      }
      
      // Apply to element
      bloom.element.setAttribute('r', radius);
      bloom.element.setAttribute('opacity', Math.max(0, opacity));
      
      // Subtle stroke width change - thinner as it expands
      const strokeWidth = this.config.strokeWidth * (1 - easedProgress * 0.5);
      bloom.element.setAttribute('stroke-width', Math.max(0.5, strokeWidth));
    }
  }
  
  /**
   * Easing function - smooth deceleration
   */
  easeOutQuad(t) {
    return 1 - (1 - t) * (1 - t);
  }
  
  /**
   * Get the center position of a region
   * @param {string} regionName - Name of the region
   * @returns {Object|null} {x, y} position or null if not found
   */
  getRegionCenter(regionName) {
    // Return cached value if available
    if (this.regionCenterCache[regionName]) {
      return this.regionCenterCache[regionName];
    }
    
    // Get region config
    const regionConfig = this.regions[regionName];
    if (!regionConfig) {
      return null;
    }
    
    // Find the energy element
    const elementId = regionConfig.energyElement;
    const element = document.getElementById(elementId);
    
    if (!element) {
      console.warn(`ResonanceRings: Energy element not found: ${elementId}`);
      return null;
    }
    
    // Get bounding rectangles
    const elementRect = element.getBoundingClientRect();
    const containerRect = this.container.getBoundingClientRect();
    
    // Calculate center position relative to container
    const centerX = elementRect.left + elementRect.width / 2 - containerRect.left;
    const centerY = elementRect.top + elementRect.height / 2 - containerRect.top;
    
    const center = { x: centerX, y: centerY };
    
    // Cache the position
    this.regionCenterCache[regionName] = center;
    
    return center;
  }
  
  /**
   * Clear all blooms
   */
  clear() {
    for (const regionName of Object.keys(this.activeBlooms)) {
      for (const bloom of this.activeBlooms[regionName]) {
        if (bloom.element.parentNode) {
          bloom.element.parentNode.removeChild(bloom.element);
        }
      }
      this.activeBlooms[regionName] = [];
    }
  }
  
  /**
   * Clear the position cache (call on resize)
   */
  clearCache() {
    this.regionCenterCache = {};
  }
  
  /**
   * Destroy and clean up
   */
  destroy() {
    this.clear();
    
    if (this._resizeHandler) {
      window.removeEventListener('resize', this._resizeHandler);
      this._resizeHandler = null;
    }
    
    if (this.svg && this.svg.parentNode) {
      this.svg.parentNode.removeChild(this.svg);
    }
    
    this.activeBlooms = {};
    this.regionCenterCache = {};
  }
}
