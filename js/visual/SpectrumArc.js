/**
 * Resonance Body Map - Spectrum Arc
 * Frequency spectrum analyzer following body silhouette as an aura
 */

import { FREQUENCY_REGIONS, AUDIO_CONFIG } from '../config.js';

export class SpectrumArc {
  /**
   * Create spectrum arc visualization
   * @param {string} containerSelector - CSS selector for container element
   * @param {Object} audioAnalyzer - AudioAnalyzer instance for accessing frequency data
   */
  constructor(containerSelector, audioAnalyzer) {
    // Initialize all properties first to prevent broken state (#25)
    this.audioAnalyzer = audioAnalyzer;
    this.regions = FREQUENCY_REGIONS;
    this.audioConfig = AUDIO_CONFIG;
    this.numBands = 64;
    this.smoothedData = new Array(this.numBands).fill(0);
    this.smoothingFactor = 0.85;
    this.baseThickness = 8;
    this.arcOffset = 15;
    this.svg = null;
    this.rightPath = null;
    this.leftPath = null;
    this.regionYPositions = {};
    
    this.container = document.querySelector(containerSelector);
    if (!this.container) {
      console.error(`SpectrumArc: Container not found: ${containerSelector}`);
      return;
    }
    
    // Create SVG element
    this.svg = this.createSVG();
    
    // Create paths
    this.createPaths();
    
    // Cache region Y positions
    this.cacheRegionPositions();
    
    // Listen for resize to invalidate cached positions (#22)
    this._resizeHandler = () => this.clearCache();
    window.addEventListener('resize', this._resizeHandler);
  }
  
  /**
   * Create and append SVG element
   * @returns {SVGElement} The created SVG element
   */
  createSVG() {
    let svg = document.getElementById('spectrum-arc');
    
    if (!svg) {
      svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('id', 'spectrum-arc');
      svg.setAttribute('class', 'overlay-svg');
      this.container.appendChild(svg);
    }
    
    return svg;
  }
  
  /**
   * Cache region Y positions for arc path generation
   */
  cacheRegionPositions() {
    const regionOrder = ['root', 'sacral', 'solar', 'heart', 'throat', 'thirdEye', 'crown'];
    
    for (const regionName of regionOrder) {
      const regionConfig = this.regions[regionName];
      const element = document.getElementById(regionConfig.energyElement);
      
      if (element) {
        const elementRect = element.getBoundingClientRect();
        const containerRect = this.container.getBoundingClientRect();
        const centerY = elementRect.top + elementRect.height / 2 - containerRect.top;
        this.regionYPositions[regionName] = centerY;
      }
    }
  }
  
  /**
   * Get arc points for the body silhouette
   * @returns {Array} Array of {x, y} points
   */
  getArcPoints() {
    const centerX = this.container.offsetWidth / 2;
    const positions = this.regionYPositions;
    
    // If positions aren't cached yet, return empty
    if (Object.keys(positions).length === 0) {
      return { right: [], left: [] };
    }

    // Right side arc points (from bottom to top)
    // Only include points for regions that have been cached
    const rightPoints = [
      { x: centerX + 45, y: positions.root, region: 'root' },
      { x: centerX + 50, y: positions.sacral, region: 'sacral' },
      { x: centerX + 55, y: positions.solar, region: 'solar' },
      { x: centerX + 50, y: positions.heart, region: 'heart' },
      { x: centerX + 35, y: positions.throat, region: 'throat' },
      { x: centerX + 30, y: positions.thirdEye, region: 'thirdEye' },
      { x: centerX + 25, y: positions.crown, region: 'crown' }
    ].filter(p => p.y !== undefined && p.y !== null);
    
    // Left side mirrors the right
    const leftPoints = rightPoints.map(p => ({
      x: centerX - (p.x - centerX),
      y: p.y
    }));
    
    return { right: rightPoints, left: leftPoints };
  }
  
  /**
   * Create path elements for the arcs
   */
  createPaths() {
    // Clear any existing children (prevents duplicate defs on reconstruction)
    while (this.svg.firstChild) {
      this.svg.removeChild(this.svg.firstChild);
    }

    // Create gradient
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const gradient = this.createGradient();
    defs.appendChild(gradient);
    this.svg.appendChild(defs);
    
    // Right path
    this.rightPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    this.rightPath.setAttribute('class', 'spectrum-arc-path');
    this.rightPath.setAttribute('stroke', 'url(#spectrum-gradient)');
    this.rightPath.setAttribute('stroke-width', this.baseThickness);
    this.rightPath.setAttribute('fill', 'none');
    this.svg.appendChild(this.rightPath);
    
    // Left path
    this.leftPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    this.leftPath.setAttribute('class', 'spectrum-arc-path');
    this.leftPath.setAttribute('stroke', 'url(#spectrum-gradient)');
    this.leftPath.setAttribute('stroke-width', this.baseThickness);
    this.leftPath.setAttribute('fill', 'none');
    this.svg.appendChild(this.leftPath);
  }
  
  /**
   * Create gradient for the spectrum arc
   * @returns {SVGLinearGradientElement} Gradient element
   */
  createGradient() {
    const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    gradient.setAttribute('id', 'spectrum-gradient');
    gradient.setAttribute('x1', '0%');
    gradient.setAttribute('y1', '100%');
    gradient.setAttribute('x2', '0%');
    gradient.setAttribute('y2', '0%');
    
    // Add stops for each region (bottom to top)
    const regionOrder = ['root', 'sacral', 'solar', 'heart', 'throat', 'thirdEye', 'crown'];
    const totalRange = this.audioConfig.maxFrequency - this.audioConfig.minFrequency;
    
    for (const regionName of regionOrder) {
      const region = this.regions[regionName];
      const offset = ((region.min - this.audioConfig.minFrequency) / totalRange) * 100;
      
      const stop = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
      stop.setAttribute('offset', `${offset}%`);
      stop.setAttribute('stop-color', region.colorHex);
      stop.setAttribute('stop-opacity', '0.4');
      gradient.appendChild(stop);
    }
    
    return gradient;
  }
  
  /**
   * Interpolate position along arc path
   * @param {Array} points - Array of {x, y} points
   * @param {number} t - Position along path (0-1)
   * @returns {Object} {x, y} position
   */
  interpolateArcPosition(points, t) {
    const totalSegments = points.length - 1;
    const segment = Math.floor(t * totalSegments);
    const segmentT = (t * totalSegments) - segment;
    
    if (segment >= totalSegments) {
      return points[points.length - 1];
    }
    
    const p1 = points[segment];
    const p2 = points[segment + 1];
    
    return {
      x: p1.x + (p2.x - p1.x) * segmentT,
      y: p1.y + (p2.y - p1.y) * segmentT
    };
  }
  
  /**
   * Update spectrum arc visualization
   * @param {Object} audioData - Audio analysis data
   */
  update(audioData) {
    if (!this.container || !this.svg) return; // Guard if constructor failed
    if (!audioData || !audioData.isActive || !this.audioAnalyzer) {
      this.fadeOut();
      return;
    }
    
    // Lazily re-cache positions if they were empty at construction time
    if (Object.keys(this.regionYPositions).length === 0) {
      this.cacheRegionPositions();
    }
    
    // Get frequency range data
    const frequencyData = this.audioAnalyzer.getFrequencyRange(
      this.audioConfig.minFrequency,
      this.audioConfig.maxFrequency
    );
    
    if (!frequencyData || frequencyData.length === 0) {
      this.fadeOut();
      return;
    }
    
    // Downsample to 64 bands with logarithmic spacing
    const bands = this.downsampleFrequencyData(frequencyData);
    
    // Apply temporal smoothing
    for (let i = 0; i < this.numBands; i++) {
      this.smoothedData[i] = this.smoothedData[i] * this.smoothingFactor + 
                             bands[i] * (1 - this.smoothingFactor);
    }
    
    // Calculate average amplitude for overall opacity
    const avgAmplitude = this.smoothedData.reduce((sum, val) => sum + val, 0) / this.numBands;
    
    // Update paths
    this.updatePaths(avgAmplitude);
    
    // Fade in
    this.svg.style.opacity = Math.min(avgAmplitude * 2, 1);
  }
  
  /**
   * Downsample frequency data to specified number of bands
   * @param {Array} frequencyData - Raw frequency data
   * @returns {Array} Downsampled band amplitudes
   */
  downsampleFrequencyData(frequencyData) {
    const bands = new Array(this.numBands).fill(0);
    
    if (frequencyData.length === 0) return bands;
    
    // Logarithmic spacing for better frequency resolution
    const minLog = Math.log(this.audioConfig.minFrequency);
    const maxLog = Math.log(this.audioConfig.maxFrequency);
    const logRange = maxLog - minLog;
    
    for (let i = 0; i < this.numBands; i++) {
      const t = i / (this.numBands - 1);
      const logFreq = minLog + t * logRange;
      const targetFreq = Math.exp(logFreq);
      
      // Find closest frequency in data
      let closestIdx = 0;
      let minDiff = Math.abs(frequencyData[0].frequency - targetFreq);
      
      for (let j = 1; j < frequencyData.length; j++) {
        const diff = Math.abs(frequencyData[j].frequency - targetFreq);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = j;
        }
      }
      
      bands[i] = frequencyData[closestIdx].amplitude;
    }
    
    return bands;
  }
  
  /**
   * Update path elements based on smoothed data
   * @param {number} avgAmplitude - Average amplitude for opacity
   */
  updatePaths(avgAmplitude) {
    const arcPoints = this.getArcPoints();
    
    // Build path data
    const rightPathData = this.buildPathData(arcPoints.right);
    const leftPathData = this.buildPathData(arcPoints.left);
    
    this.rightPath.setAttribute('d', rightPathData);
    this.leftPath.setAttribute('d', leftPathData);
    
    // Update opacity based on amplitude
    const opacity = Math.max(0.3, Math.min(1, avgAmplitude * 1.5));
    this.rightPath.setAttribute('opacity', opacity);
    this.leftPath.setAttribute('opacity', opacity);
    
    // Add glow effect for higher amplitudes
    if (avgAmplitude > 0.5) {
      const glowSize = Math.round(avgAmplitude * 10);
      const filter = `drop-shadow(0 0 ${glowSize}px rgba(255,255,255,0.3))`;
      this.rightPath.style.filter = filter;
      this.leftPath.style.filter = filter;
    } else {
      this.rightPath.style.filter = 'none';
      this.leftPath.style.filter = 'none';
    }
  }
  
  /**
   * Build SVG path data from points
   * @param {Array} points - Array of {x, y} points
   * @returns {string} SVG path data
   */
  buildPathData(points) {
    if (points.length === 0) return '';
    
    let pathData = `M ${points[0].x} ${points[0].y}`;
    
    // Use smooth curves between points
    for (let i = 1; i < points.length; i++) {
      const p = points[i];
      
      if (i === 1) {
        // First segment - simple line
        pathData += ` L ${p.x} ${p.y}`;
      } else {
        // Smooth curve using quadratic bezier
        const prev = points[i - 1];
        const controlX = (prev.x + p.x) / 2;
        const controlY = (prev.y + p.y) / 2;
        pathData += ` Q ${controlX} ${controlY} ${p.x} ${p.y}`;
      }
    }
    
    return pathData;
  }
  
  /**
   * Fade out the visualization
   */
  fadeOut() {
    if (this.svg) {
      this.svg.style.opacity = '0';
    }
  }
  
  /**
   * Clear all data and fade out
   */
  clear() {
    this.smoothedData.fill(0);
    this.fadeOut();
  }
  
  /**
   * Clear cached positions (call on resize)
   */
  clearCache() {
    this.regionYPositions = {};
    this.cacheRegionPositions();
  }
  
  /**
   * Destroy and clean up
   */
  destroy() {
    this.clear();
    
    // Remove resize listener (#22)
    if (this._resizeHandler) {
      window.removeEventListener('resize', this._resizeHandler);
      this._resizeHandler = null;
    }
    
    if (this.svg && this.svg.parentNode) {
      this.svg.parentNode.removeChild(this.svg);
    }
    
    this.smoothedData = [];
    this.regionYPositions = {};
  }
}
