/**
 * Resonance Body Map - Harmonic Lines
 * Visualizes energy flow from fundamental region to overtone regions
 */

import { FREQUENCY_REGIONS } from '../config.js';

export class HarmonicLines {
  /**
   * Create harmonic lines visualization
   * @param {string} containerSelector - CSS selector for container element
   */
  constructor(containerSelector) {
    this.container = document.querySelector(containerSelector);
    if (!this.container) {
      console.error(`HarmonicLines: Container not found: ${containerSelector}`);
      return;
    }
    
    // Store reference to frequency regions config
    this.regions = FREQUENCY_REGIONS;
    
    // Region order for fundamental detection
    this.regionOrder = ['root', 'sacral', 'solar', 'heart', 'throat', 'thirdEye', 'crown'];
    
    // Cache for region Y positions
    this.regionYCache = {};
    
    // Create SVG element
    this.svg = this.createSVG();
    
    // Create defs for gradients
    this.defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    this.svg.appendChild(this.defs);
    
    // Container for paths
    this.pathsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    this.svg.appendChild(this.pathsGroup);

    // Invalidate position cache on resize
    window.addEventListener('resize', () => this.clearCache());
  }
  
  /**
   * Create and append SVG element
   * @returns {SVGElement} The created SVG element
   */
  createSVG() {
    // Check if SVG already exists
    let svg = document.getElementById('harmonic-lines');
    
    if (!svg) {
      svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('id', 'harmonic-lines');
      svg.setAttribute('class', 'overlay-svg');
      this.container.appendChild(svg);
    }
    
    return svg;
  }
  
  /**
   * Update harmonic lines visualization
   * @param {Object} harmonicContributions - Harmonic contribution values per region
   * @param {Object} intensities - Intensity values per region
   * @param {Object} glowStates - Glow state data from GlowEngine
   */
  update(harmonicContributions, intensities, glowStates) {
    // Clear previous lines
    this.clear();
    
    // Find fundamental region (lowest region with intensity > 0.2)
    const fundamentalRegion = this.findFundamental(intensities);
    
    if (!fundamentalRegion) {
      return; // No valid fundamental, skip drawing
    }
    
    const fundamentalIndex = this.regionOrder.indexOf(fundamentalRegion);
    
    // Draw lines to higher regions with harmonic contributions > 0.1
    for (let i = fundamentalIndex + 1; i < this.regionOrder.length; i++) {
      const targetRegion = this.regionOrder[i];
      const contribution = harmonicContributions[targetRegion] || 0;
      
      if (contribution > 0.1) {
        this.drawLinePair(
          fundamentalRegion,
          targetRegion,
          contribution,
          glowStates
        );
      }
    }
  }
  
  /**
   * Find the fundamental region (lowest active region)
   * @param {Object} intensities - Region intensity values
   * @returns {string|null} Region name or null if none found
   */
  findFundamental(intensities) {
    for (const regionName of this.regionOrder) {
      const intensity = intensities[regionName] || 0;
      if (intensity > 0.2) {
        return regionName;
      }
    }
    return null;
  }
  
  /**
   * Draw a pair of mirrored curved lines between two regions
   * @param {string} sourceRegion - Source region name
   * @param {string} targetRegion - Target region name
   * @param {number} contribution - Harmonic contribution strength (0-1)
   * @param {Object} glowStates - Glow states for color information
   */
  drawLinePair(sourceRegion, targetRegion, contribution, glowStates) {
    const sourceY = this.getRegionY(sourceRegion);
    const targetY = this.getRegionY(targetRegion);
    
    if (sourceY === null || targetY === null) {
      return; // Can't draw if positions not available
    }
    
    const centerX = this.container.offsetWidth / 2;
    const midY = (sourceY + targetY) / 2;
    
    // Create gradient
    const gradientId = this.createGradient(sourceRegion, targetRegion, glowStates);
    
    // Right side line (bows rightward)
    const pathRight = this.createPath(
      centerX, sourceY,
      centerX, targetY,
      centerX + 25, midY,
      contribution,
      gradientId
    );
    this.pathsGroup.appendChild(pathRight);
    
    // Left side line (bows leftward)
    const pathLeft = this.createPath(
      centerX, sourceY,
      centerX, targetY,
      centerX - 25, midY,
      contribution,
      gradientId
    );
    this.pathsGroup.appendChild(pathLeft);
  }
  
  /**
   * Create an SVG path element with quadratic Bezier curve
   * @param {number} startX - Start X coordinate
   * @param {number} startY - Start Y coordinate
   * @param {number} endX - End X coordinate
   * @param {number} endY - End Y coordinate
   * @param {number} controlX - Control point X coordinate
   * @param {number} controlY - Control point Y coordinate
   * @param {number} contribution - Line opacity multiplier
   * @param {string} gradientId - Gradient ID for stroke
   * @returns {SVGPathElement} The created path element
   */
  createPath(startX, startY, endX, endY, controlX, controlY, contribution, gradientId) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    
    // Build path data: M (move to start), Q (quadratic curve to end)
    const d = `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`;
    
    path.setAttribute('d', d);
    path.setAttribute('class', 'harmonic-line');
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', `url(#${gradientId})`);
    path.setAttribute('stroke-width', '2');
    path.setAttribute('stroke-opacity', contribution * 0.7);
    path.setAttribute('stroke-linecap', 'round');
    
    return path;
  }
  
  /**
   * Create a linear gradient for a line
   * @param {string} sourceRegion - Source region name
   * @param {string} targetRegion - Target region name
   * @param {Object} glowStates - Glow states for color information
   * @returns {string} Gradient ID
   */
  createGradient(sourceRegion, targetRegion, glowStates) {
    const gradientId = `gradient-${sourceRegion}-${targetRegion}`;
    
    // Check if gradient already exists
    const existing = this.defs.querySelector(`#${gradientId}`);
    if (existing) {
      return gradientId;
    }
    
    const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    gradient.setAttribute('id', gradientId);
    gradient.setAttribute('x1', '0%');
    gradient.setAttribute('y1', '0%');
    gradient.setAttribute('x2', '0%');
    gradient.setAttribute('y2', '100%');
    
    // Get colors from glow states or fall back to config
    const sourceColor = glowStates[sourceRegion]?.glowColor || this.regions[sourceRegion].glowHex;
    const targetColor = glowStates[targetRegion]?.glowColor || this.regions[targetRegion].glowHex;
    
    // Create gradient stops
    const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop1.setAttribute('offset', '0%');
    stop1.setAttribute('stop-color', sourceColor);
    
    const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop2.setAttribute('offset', '100%');
    stop2.setAttribute('stop-color', targetColor);
    
    gradient.appendChild(stop1);
    gradient.appendChild(stop2);
    this.defs.appendChild(gradient);
    
    return gradientId;
  }
  
  /**
   * Get the Y position of a region's center
   * @param {string} regionName - Name of the region
   * @returns {number|null} Y position or null if not found
   */
  getRegionY(regionName) {
    // Return cached value if available
    if (this.regionYCache[regionName] !== undefined) {
      return this.regionYCache[regionName];
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
      console.warn(`HarmonicLines: Energy element not found: ${elementId}`);
      return null;
    }
    
    // Get bounding rectangles
    const elementRect = element.getBoundingClientRect();
    const containerRect = this.container.getBoundingClientRect();
    
    // Calculate center Y position relative to container
    const centerY = elementRect.top + elementRect.height / 2 - containerRect.top;
    
    // Cache the position
    this.regionYCache[regionName] = centerY;
    
    return centerY;
  }
  
  /**
   * Clear all path elements and gradients
   */
  clear() {
    // Remove all paths
    while (this.pathsGroup.firstChild) {
      this.pathsGroup.removeChild(this.pathsGroup.firstChild);
    }
    // Remove all gradients to prevent DOM leak
    while (this.defs.firstChild) {
      this.defs.removeChild(this.defs.firstChild);
    }
  }
  
  /**
   * Clear the position cache (call on resize)
   */
  clearCache() {
    this.regionYCache = {};
  }
  
  /**
   * Destroy and clean up
   */
  destroy() {
    if (this.svg && this.svg.parentNode) {
      this.svg.parentNode.removeChild(this.svg);
    }
    this.regionYCache = {};
  }
}
