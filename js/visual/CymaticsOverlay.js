/**
 * Cymatics Overlay Visualization
 * Procedurally generates Chladni-inspired patterns based on frequency
 */

import { FREQUENCY_REGIONS } from '../config.js';
import { lerp, clamp, smoothstep } from '../utils/math.js';

export class CymaticsOverlay {
  constructor(options = {}) {
    this.canvas = null;
    this.ctx = null;
    this.enabled = true;
    
    // Configuration
    this.config = {
      size: 150,                 // Base size of the pattern
      maxSize: 200,              // Maximum size with amplitude
      resolution: 100,           // Grid resolution for pattern calculation
      lineWidth: 1.5,
      glowBlur: 8,
      rotationSpeed: 0.0005,     // Slow rotation
      morphSpeed: 0.002,         // Speed of pattern morphing
      fadeSpeed: 0.1,
      positionMode: 'center',    // 'center', 'region', or 'floating'
      opacity: 0.6,
      ...options
    };
    
    // State
    this.currentFrequency = 0;
    this.targetFrequency = 0;
    this.currentAmplitude = 0;
    this.targetAmplitude = 0;
    this.rotation = 0;
    this.morphOffset = 0;
    this.currentRegion = null;
    this.patternCache = null;
    this.lastPatternFreq = 0;
    
    // Position for pattern (relative to canvas)
    this.position = { x: 0.5, y: 0.5 };
    
    // Region center positions
    this.regionPositions = {
      root: { y: 0.88, x: 0.5 },
      sacral: { y: 0.78, x: 0.5 },
      solar: { y: 0.67, x: 0.5 },
      heart: { y: 0.52, x: 0.5 },
      throat: { y: 0.35, x: 0.5 },
      thirdEye: { y: 0.22, x: 0.5 },
      crown: { y: 0.10, x: 0.5 }
    };
  }
  
  /**
   * Initialize the cymatics canvas
   */
  init(containerSelector = '.body-container') {
    const container = document.querySelector(containerSelector);
    if (!container) {
      console.error('CymaticsOverlay: Container not found');
      return false;
    }
    
    // Create canvas overlay
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'cymatics-overlay-canvas';
    this.canvas.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 5;
    `;
    
    container.style.position = 'relative';
    container.appendChild(this.canvas);
    
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    
    window.addEventListener('resize', () => this.resize());
    
    return true;
  }
  
  /**
   * Resize canvas
   */
  resize() {
    if (!this.canvas) return;
    
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    
    this.ctx.scale(dpr, dpr);
    
    this.width = rect.width;
    this.height = rect.height;
    
    // Invalidate pattern cache on resize
    this.patternCache = null;
  }
  
  /**
   * Update cymatics based on audio data
   */
  update(frequency, amplitude, regionName, deltaTime = 16.67) {
    if (!this.enabled) return;
    
    // Smooth frequency transitions
    this.targetFrequency = frequency || 0;
    this.targetAmplitude = amplitude || 0;
    
    const freqSmooth = 0.1;
    const ampSmooth = 0.15;
    
    this.currentFrequency = lerp(this.currentFrequency, this.targetFrequency, freqSmooth);
    this.currentAmplitude = lerp(this.currentAmplitude, this.targetAmplitude, ampSmooth);
    
    // Update animation offsets
    this.rotation += this.config.rotationSpeed * deltaTime;
    this.morphOffset += this.config.morphSpeed * deltaTime;
    
    // Update region and position
    if (regionName && this.regionPositions[regionName]) {
      this.currentRegion = regionName;
      if (this.config.positionMode === 'region') {
        const targetPos = this.regionPositions[regionName];
        this.position.x = lerp(this.position.x, targetPos.x, 0.05);
        this.position.y = lerp(this.position.y, targetPos.y, 0.05);
      }
    }
    
    // Regenerate pattern if frequency changed significantly
    if (Math.abs(this.currentFrequency - this.lastPatternFreq) > 10) {
      this.patternCache = null;
      this.lastPatternFreq = this.currentFrequency;
    }
  }
  
  /**
   * Render the cymatics pattern
   */
  render() {
    if (!this.ctx || !this.enabled) return;
    
    this.ctx.clearRect(0, 0, this.width, this.height);
    
    if (this.currentAmplitude < 0.05 || this.currentFrequency < 30) return;
    
    // Calculate pattern parameters from frequency
    const params = this.frequencyToChladniParams(this.currentFrequency);
    
    // Calculate size based on amplitude
    const baseSize = this.config.size;
    const size = lerp(baseSize * 0.8, this.config.maxSize, this.currentAmplitude);
    
    // Get position
    const centerX = this.position.x * this.width;
    const centerY = this.position.y * this.height;
    
    // Get color from current region
    const color = this.currentRegion ? 
      FREQUENCY_REGIONS[this.currentRegion]?.glowHex || '#ffffff' : 
      '#ffffff';
    
    // Draw the pattern
    this.drawChladniPattern(centerX, centerY, size, params, color);
  }
  
  /**
   * Convert frequency to Chladni pattern parameters
   * Lower frequencies = simpler patterns (lower m, n values)
   * Higher frequencies = more complex patterns (higher m, n values)
   */
  frequencyToChladniParams(frequency) {
    // Map frequency to pattern complexity
    // Root (30-98 Hz) -> m=1-2, n=1-2
    // Crown (740-2000 Hz) -> m=6-10, n=6-10
    
    const normalized = clamp((frequency - 30) / (1500 - 30), 0, 1);
    
    // Base m and n values
    const baseM = 1 + normalized * 7;
    const baseN = 1 + normalized * 7;
    
    // Add subtle morphing
    const morphM = Math.sin(this.morphOffset) * 0.5;
    const morphN = Math.cos(this.morphOffset * 1.3) * 0.5;
    
    return {
      m: baseM + morphM,
      n: baseN + morphN,
      // Add variation based on frequency bands
      symmetry: Math.floor(3 + normalized * 5),
      complexity: normalized
    };
  }
  
  /**
   * Draw a Chladni-inspired pattern
   * Based on the equation: cos(m*π*x/L)*cos(n*π*y/L) - cos(n*π*x/L)*cos(m*π*y/L) = 0
   */
  drawChladniPattern(cx, cy, size, params, color) {
    const { m, n, symmetry, complexity } = params;
    const resolution = this.config.resolution;
    const halfSize = size / 2;
    
    this.ctx.save();
    this.ctx.translate(cx, cy);
    this.ctx.rotate(this.rotation);
    
    // Draw glow layer
    this.ctx.globalAlpha = this.config.opacity * 0.3 * this.currentAmplitude;
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = this.config.lineWidth + this.config.glowBlur;
    this.ctx.filter = `blur(${this.config.glowBlur}px)`;
    
    this.drawPatternPaths(halfSize, m, n, resolution);
    
    // Draw core pattern
    this.ctx.filter = 'none';
    this.ctx.globalAlpha = this.config.opacity * this.currentAmplitude;
    this.ctx.lineWidth = this.config.lineWidth;
    
    this.drawPatternPaths(halfSize, m, n, resolution);
    
    // Draw radial symmetry lines for additional complexity
    if (complexity > 0.3) {
      this.drawSymmetryLines(halfSize, symmetry, color, complexity);
    }
    
    // Draw center point
    this.ctx.globalAlpha = this.config.opacity * 0.8 * this.currentAmplitude;
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, 3, 0, Math.PI * 2);
    this.ctx.fill();
    
    this.ctx.restore();
  }
  
  /**
   * Draw the Chladni pattern nodal lines
   */
  drawPatternPaths(halfSize, m, n, resolution) {
    const step = (halfSize * 2) / resolution;
    const threshold = 0.15; // Threshold for nodal line detection
    
    this.ctx.beginPath();
    
    for (let i = 0; i < resolution; i++) {
      for (let j = 0; j < resolution; j++) {
        const x = -halfSize + i * step;
        const y = -halfSize + j * step;
        
        // Chladni equation
        const value = this.chladniValue(x / halfSize, y / halfSize, m, n);
        
        if (Math.abs(value) < threshold) {
          // Point is on or near a nodal line
          this.ctx.moveTo(x, y);
          this.ctx.arc(x, y, 1, 0, Math.PI * 2);
        }
      }
    }
    
    this.ctx.stroke();
    
    // Also draw continuous contour lines
    this.drawContourLines(halfSize, m, n, resolution);
  }
  
  /**
   * Calculate Chladni pattern value at a point
   */
  chladniValue(x, y, m, n) {
    const pi = Math.PI;
    return Math.cos(m * pi * x) * Math.cos(n * pi * y) - 
           Math.cos(n * pi * x) * Math.cos(m * pi * y);
  }
  
  /**
   * Draw contour lines using marching squares approximation
   */
  drawContourLines(halfSize, m, n, resolution) {
    const step = (halfSize * 2) / (resolution / 2);
    
    this.ctx.beginPath();
    
    for (let i = 0; i < resolution / 2 - 1; i++) {
      for (let j = 0; j < resolution / 2 - 1; j++) {
        const x = -halfSize + i * step;
        const y = -halfSize + j * step;
        
        // Sample corners
        const v00 = this.chladniValue(x / halfSize, y / halfSize, m, n);
        const v10 = this.chladniValue((x + step) / halfSize, y / halfSize, m, n);
        const v01 = this.chladniValue(x / halfSize, (y + step) / halfSize, m, n);
        const v11 = this.chladniValue((x + step) / halfSize, (y + step) / halfSize, m, n);
        
        // Check for zero crossings and draw line segments
        this.drawMarchingSquare(x, y, step, v00, v10, v01, v11);
      }
    }
    
    this.ctx.stroke();
  }
  
  /**
   * Draw marching square cell
   */
  drawMarchingSquare(x, y, step, v00, v10, v01, v11) {
    // Simplified marching squares - check for sign changes
    const edges = [];
    
    if (v00 * v10 < 0) {
      const t = v00 / (v00 - v10);
      edges.push({ x: x + t * step, y: y });
    }
    if (v10 * v11 < 0) {
      const t = v10 / (v10 - v11);
      edges.push({ x: x + step, y: y + t * step });
    }
    if (v01 * v11 < 0) {
      const t = v01 / (v01 - v11);
      edges.push({ x: x + t * step, y: y + step });
    }
    if (v00 * v01 < 0) {
      const t = v00 / (v00 - v01);
      edges.push({ x: x, y: y + t * step });
    }
    
    if (edges.length >= 2) {
      this.ctx.moveTo(edges[0].x, edges[0].y);
      this.ctx.lineTo(edges[1].x, edges[1].y);
    }
  }
  
  /**
   * Draw radial symmetry lines for added visual interest
   */
  drawSymmetryLines(halfSize, symmetry, color, complexity) {
    this.ctx.globalAlpha = this.config.opacity * 0.2 * this.currentAmplitude * complexity;
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 0.5;
    
    const angleStep = (Math.PI * 2) / symmetry;
    
    this.ctx.beginPath();
    for (let i = 0; i < symmetry; i++) {
      const angle = i * angleStep;
      const innerRadius = halfSize * 0.1;
      const outerRadius = halfSize * 0.9;
      
      this.ctx.moveTo(
        Math.cos(angle) * innerRadius,
        Math.sin(angle) * innerRadius
      );
      this.ctx.lineTo(
        Math.cos(angle) * outerRadius,
        Math.sin(angle) * outerRadius
      );
    }
    this.ctx.stroke();
    
    // Draw concentric circles
    this.ctx.beginPath();
    const numCircles = Math.floor(2 + complexity * 4);
    for (let i = 1; i <= numCircles; i++) {
      const radius = (halfSize * i) / (numCircles + 1);
      this.ctx.moveTo(radius, 0);
      this.ctx.arc(0, 0, radius, 0, Math.PI * 2);
    }
    this.ctx.stroke();
  }
  
  /**
   * Set position mode
   */
  setPositionMode(mode) {
    this.config.positionMode = mode;
    if (mode === 'center') {
      this.position = { x: 0.5, y: 0.5 };
    }
  }
  
  /**
   * Enable/disable
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled && this.ctx) {
      this.ctx.clearRect(0, 0, this.width, this.height);
    }
  }
  
  /**
   * Clean up
   */
  destroy() {
    if (this.canvas && this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas);
    }
    this.canvas = null;
    this.ctx = null;
  }
}
