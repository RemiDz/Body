/**
 * Cymatics Overlay Visualization - FIXED VERSION
 * Renders beautiful circular mandala patterns inspired by cymatics
 * Uses polar coordinates for smooth, organic shapes
 */

import { FREQUENCY_REGIONS } from '../config.js';
import { lerp, clamp } from '../utils/math.js';

export class CymaticsOverlay {
  constructor(options = {}) {
    this.canvas = null;
    this.ctx = null;
    this.enabled = true;
    
    // Configuration - much smaller and subtler
    this.config = {
      baseSize: 80,              // Much smaller base size
      maxSize: 120,              // Maximum size with amplitude
      lineWidth: 1,
      glowBlur: 6,
      rotationSpeed: 0.0003,     // Slower rotation
      morphSpeed: 0.001,
      breathSpeed: 0.003,        // Breathing animation
      opacity: 0.5,              // More subtle
      positionMode: 'bottom',    // 'bottom', 'center', 'region'
      ...options
    };
    
    // State
    this.currentFrequency = 0;
    this.targetFrequency = 0;
    this.currentAmplitude = 0;
    this.targetAmplitude = 0;
    this.rotation = 0;
    this.morphPhase = 0;
    this.breathPhase = 0;
    this.currentRegion = null;
    this.currentColor = '#00ff99';
    
    // Set initial position based on configured mode
    if (this.config.positionMode === 'center') {
      this.position = { x: 0.5, y: 0.5 };
    } else if (this.config.positionMode === 'region') {
      // Start at heart region center (middle of body) for a natural initial position
      this.position = { x: 0.5, y: 0.52 };
    } else {
      this.position = { x: 0.5, y: 0.75 };
    }
    
    // Region positions if following
    this.regionPositions = {
      root: { y: 0.85, x: 0.5 },
      sacral: { y: 0.78, x: 0.5 },
      solar: { y: 0.68, x: 0.5 },
      heart: { y: 0.52, x: 0.5 },
      throat: { y: 0.38, x: 0.5 },
      thirdEye: { y: 0.25, x: 0.5 },
      crown: { y: 0.12, x: 0.5 }
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
      opacity: 0.7;
    `;
    
    container.style.position = 'relative';
    container.appendChild(this.canvas);
    
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    
    this._resizeHandler = () => this.resize();
    window.addEventListener('resize', this._resizeHandler);
    
    return true;
  }
  
  resize() {
    if (!this.canvas) return;
    
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    
    this.width = rect.width;
    this.height = rect.height;
  }
  
  /**
   * Update cymatics based on audio data
   */
  update(frequency, amplitude, regionName, deltaTime = 16.67) {
    if (!this.enabled) return;
    
    // Smooth transitions
    this.targetFrequency = frequency || 0;
    this.targetAmplitude = amplitude || 0;
    
    this.currentFrequency = lerp(this.currentFrequency, this.targetFrequency, 0.08);
    this.currentAmplitude = lerp(this.currentAmplitude, this.targetAmplitude, 0.12);
    
    // Animation phases
    this.rotation += this.config.rotationSpeed * deltaTime;
    this.morphPhase += this.config.morphSpeed * deltaTime;
    this.breathPhase += this.config.breathSpeed * deltaTime;
    
    // Update region and color
    if (regionName && FREQUENCY_REGIONS[regionName]) {
      this.currentRegion = regionName;
      this.currentColor = FREQUENCY_REGIONS[regionName].glowHex || '#00ff99';
      
      // Update position if following region
      if (this.config.positionMode === 'region') {
        const targetPos = this.regionPositions[regionName];
        if (targetPos) {
          this.position.x = lerp(this.position.x, targetPos.x, 0.03);
          this.position.y = lerp(this.position.y, targetPos.y, 0.03);
        }
      }
    }
  }
  
  /**
   * Render the cymatics pattern
   */
  render() {
    if (!this.ctx || !this.enabled) return;
    
    this.ctx.clearRect(0, 0, this.width, this.height);
    
    // Only render if there's sound
    if (this.currentAmplitude < 0.08 || this.currentFrequency < 30) return;
    
    // Calculate pattern parameters
    const params = this.getPatternParams(this.currentFrequency);
    
    // Calculate size with breathing effect
    const breathScale = 1 + Math.sin(this.breathPhase) * 0.1 * this.currentAmplitude;
    const baseSize = lerp(this.config.baseSize, this.config.maxSize, this.currentAmplitude);
    const size = baseSize * breathScale;
    
    // Get center position
    const cx = this.position.x * this.width;
    const cy = this.position.y * this.height;
    
    // Draw the mandala pattern
    this.drawMandala(cx, cy, size, params);
  }
  
  /**
   * Convert frequency to pattern parameters
   */
  getPatternParams(frequency) {
    // Normalize frequency to 0-1 range
    const normalized = clamp((frequency - 30) / (1200 - 30), 0, 1);
    
    // Pattern complexity increases with frequency
    // Low freq: 3-4 petals, simple
    // High freq: 8-12 petals, complex
    const basePetals = Math.floor(3 + normalized * 9);
    
    // Add subtle variation with morph phase
    const petalVariation = Math.sin(this.morphPhase) * 0.5;
    
    return {
      petals: basePetals,
      layers: Math.floor(2 + normalized * 3),      // 2-5 concentric layers
      complexity: normalized,
      innerRadius: 0.2 + normalized * 0.1,         // Inner hole size
      petalDepth: 0.3 + normalized * 0.3,          // How deep petals go
      waviness: petalVariation,
      secondaryPetals: basePetals * 2              // Secondary pattern
    };
  }
  
  /**
   * Draw a beautiful mandala pattern
   */
  drawMandala(cx, cy, size, params) {
    const { petals, layers, complexity, innerRadius, petalDepth, waviness, secondaryPetals } = params;
    
    this.ctx.save();
    this.ctx.translate(cx, cy);
    this.ctx.rotate(this.rotation);
    
    const alpha = this.config.opacity * this.currentAmplitude;
    
    // Draw outer glow
    this.ctx.globalAlpha = alpha * 0.2;
    this.ctx.filter = `blur(${this.config.glowBlur * 2}px)`;
    this.drawFlower(size * 1.1, petals, innerRadius, petalDepth, this.currentColor);
    this.ctx.filter = 'none';
    
    // Draw main layers from outside to inside
    for (let layer = layers; layer >= 1; layer--) {
      const layerSize = size * (layer / layers);
      const layerAlpha = alpha * (0.3 + (layer / layers) * 0.5);
      const layerPetals = layer === layers ? petals : secondaryPetals;
      
      // Glow layer
      this.ctx.globalAlpha = layerAlpha * 0.4;
      this.ctx.filter = `blur(${this.config.glowBlur}px)`;
      this.drawFlower(layerSize, layerPetals, innerRadius, petalDepth + waviness * 0.1, this.currentColor);
      
      // Core layer
      this.ctx.filter = 'none';
      this.ctx.globalAlpha = layerAlpha * 0.8;
      this.drawFlower(layerSize, layerPetals, innerRadius, petalDepth + waviness * 0.1, this.currentColor);
    }
    
    // Draw center circle
    this.ctx.globalAlpha = alpha * 0.6;
    this.ctx.fillStyle = this.currentColor;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, size * innerRadius * 0.5, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Draw outer ring
    this.ctx.globalAlpha = alpha * 0.3;
    this.ctx.strokeStyle = this.currentColor;
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, size, 0, Math.PI * 2);
    this.ctx.stroke();
    
    this.ctx.restore();
  }
  
  /**
   * Draw a flower/petal pattern using polar coordinates
   */
  drawFlower(radius, petals, innerRatio, depth, color) {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = this.config.lineWidth;
    this.ctx.beginPath();
    
    const points = petals * 20; // Smooth curve
    const innerRadius = radius * innerRatio;
    const petalAmplitude = radius * depth;
    
    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * Math.PI * 2;
      
      // Create petal shape using sine waves
      // r = innerRadius + amplitude * |sin(petals * angle / 2)|
      const petalWave = Math.pow(Math.abs(Math.sin(petals * angle / 2)), 0.8);
      const r = innerRadius + petalAmplitude * petalWave;
      
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      
      if (i === 0) {
        this.ctx.moveTo(x, y);
      } else {
        this.ctx.lineTo(x, y);
      }
    }
    
    this.ctx.closePath();
    this.ctx.stroke();
  }
  
  /**
   * Set position mode
   */
  setPositionMode(mode) {
    this.config.positionMode = mode;
    
    switch (mode) {
      case 'center':
        this.position = { x: 0.5, y: 0.5 };
        break;
      case 'bottom':
        this.position = { x: 0.5, y: 0.75 };
        break;
      // 'region' mode updates position dynamically
    }
  }
  
  /**
   * Set size
   */
  setSize(baseSize, maxSize) {
    this.config.baseSize = baseSize;
    this.config.maxSize = maxSize || baseSize * 1.5;
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
  
  destroy() {
    if (this._resizeHandler) {
      window.removeEventListener('resize', this._resizeHandler);
      this._resizeHandler = null;
    }
    if (this.canvas && this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas);
    }
    this.canvas = null;
    this.ctx = null;
  }
}
