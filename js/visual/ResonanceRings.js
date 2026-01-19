/**
 * Resonance Body Map - Resonance Rings
 * Circular rings showing resonance quality (how close to ideal center frequency)
 */

import { FREQUENCY_REGIONS } from '../config.js';

export class ResonanceRings {
  /**
   * Create resonance rings visualization
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
    
    // Ring configuration
    this.ringRadius = 35;
    this.circumference = 2 * Math.PI * this.ringRadius;
    
    // Create SVG element
    this.svg = this.createSVG();
    
    // Track active rings
    this.activeRings = {};
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
   * Update resonance rings visualization
   * @param {Object} resonanceValues - Resonance quality values per region (0-1)
   * @param {Object} intensities - Intensity values per region
   */
  update(resonanceValues, intensities) {
    if (!resonanceValues || !intensities) {
      return;
    }
    
    // Process each region
    for (const regionName of Object.keys(this.regions)) {
      const intensity = intensities[regionName] || 0;
      const resonance = resonanceValues[regionName] || 0;
      
      if (intensity <= 0.15) {
        // Hide ring if intensity too low
        this.hideRing(regionName);
      } else {
        // Show/update ring
        this.renderRing(regionName, resonance, intensity);
      }
    }
  }
  
  /**
   * Render or update a resonance ring for a region
   * @param {string} regionName - Name of the region
   * @param {number} resonance - Resonance quality value (0-1)
   * @param {number} intensity - Region intensity
   */
  renderRing(regionName, resonance, intensity) {
    const center = this.getRegionCenter(regionName);
    if (!center) {
      return;
    }
    
    const regionConfig = this.regions[regionName];
    
    // Get or create circle element
    let circle = this.activeRings[regionName];
    if (!circle) {
      circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('class', 'resonance-ring');
      circle.setAttribute('data-region', regionName);
      circle.setAttribute('fill', 'none');
      this.svg.appendChild(circle);
      this.activeRings[regionName] = circle;
    }
    
    // Position
    circle.setAttribute('cx', center.x);
    circle.setAttribute('cy', center.y);
    circle.setAttribute('r', this.ringRadius);
    
    // Stroke color
    circle.setAttribute('stroke', regionConfig.glowHex);
    
    // Stroke width: interpolate from 3px to 6px based on resonance
    const strokeWidth = 3 + (resonance * 3);
    circle.setAttribute('stroke-width', strokeWidth);
    
    // Stroke opacity based on resonance
    const strokeOpacity = resonance * 0.8;
    circle.setAttribute('stroke-opacity', strokeOpacity);
    
    // Partial ring using stroke-dasharray
    const arcLength = this.circumference * resonance;
    circle.setAttribute('stroke-dasharray', `${arcLength} ${this.circumference}`);
    
    // Start from top of circle
    const dashOffset = this.circumference * 0.25;
    circle.setAttribute('stroke-dashoffset', dashOffset);
    
    // Opacity for overall visibility
    circle.setAttribute('opacity', 1);
    
    // High resonance effect
    if (resonance > 0.85) {
      circle.classList.add('resonance-high');
    } else {
      circle.classList.remove('resonance-high');
    }
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
   * Hide a specific ring
   * @param {string} regionName - Name of the region
   */
  hideRing(regionName) {
    const circle = this.activeRings[regionName];
    if (circle) {
      // Fade out with CSS transition
      circle.setAttribute('opacity', 0);
      
      // Remove from DOM after transition
      setTimeout(() => {
        if (circle.parentNode && circle.getAttribute('opacity') === '0') {
          circle.parentNode.removeChild(circle);
          delete this.activeRings[regionName];
        }
      }, 300);
    }
  }
  
  /**
   * Clear all rings
   */
  clear() {
    for (const regionName of Object.keys(this.activeRings)) {
      this.hideRing(regionName);
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
    
    if (this.svg && this.svg.parentNode) {
      this.svg.parentNode.removeChild(this.svg);
    }
    
    this.activeRings = {};
    this.regionCenterCache = {};
  }
}
