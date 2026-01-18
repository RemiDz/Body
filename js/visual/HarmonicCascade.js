/**
 * Harmonic Cascade Visualization
 * Renders flowing energy connections between harmonically-related body regions
 */

import { FREQUENCY_REGIONS } from '../config.js';
import { lerp, clamp, smoothstep } from '../utils/math.js';

export class HarmonicCascade {
  constructor(options = {}) {
    this.canvas = null;
    this.ctx = null;
    this.enabled = true;
    
    // Configuration
    this.config = {
      lineWidth: 2,
      maxLineWidth: 6,
      glowBlur: 15,
      flowSpeed: 0.003,        // Speed of flowing particles
      particlesPerLine: 8,
      fadeInDuration: 300,
      fadeOutDuration: 500,
      minAmplitude: 0.15,      // Minimum amplitude to show cascade
      ...options
    };
    
    // State
    this.cascadeLines = [];    // Active cascade connections
    this.flowOffset = 0;       // Animation offset for flowing effect
    this.lastUpdate = 0;
    
    // Region center positions (Y coordinates as percentage of body height)
    // These map to the SVG body regions - adjust based on your body.svg
    this.regionPositions = {
      root: { y: 0.92, x: 0.5 },
      sacral: { y: 0.82, x: 0.5 },
      solar: { y: 0.70, x: 0.5 },
      heart: { y: 0.55, x: 0.5 },
      throat: { y: 0.38, x: 0.5 },
      thirdEye: { y: 0.25, x: 0.5 },
      crown: { y: 0.12, x: 0.5 }
    };
    
    // Region order for cascade flow
    this.regionOrder = ['root', 'sacral', 'solar', 'heart', 'throat', 'thirdEye', 'crown'];
  }
  
  /**
   * Initialize the cascade canvas overlay
   */
  init(containerSelector = '.body-container') {
    const container = document.querySelector(containerSelector);
    if (!container) {
      console.error('HarmonicCascade: Container not found');
      return false;
    }
    
    // Create canvas overlay
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'harmonic-cascade-canvas';
    this.canvas.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 10;
    `;
    
    container.style.position = 'relative';
    container.appendChild(this.canvas);
    
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    
    // Handle resize
    window.addEventListener('resize', () => this.resize());
    
    return true;
  }
  
  /**
   * Resize canvas to match container
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
  }
  
  /**
   * Update cascade based on harmonic profile from audio analyzer
   */
  update(harmonicProfile, fundamentalFrequency, deltaTime = 16.67) {
    if (!this.enabled || !harmonicProfile || fundamentalFrequency <= 0) {
      // Fade out existing cascades
      this.fadeOutAll(deltaTime);
      return;
    }
    
    const now = performance.now();
    this.flowOffset += this.config.flowSpeed * deltaTime;
    
    // Find which region the fundamental is in
    const fundamentalRegion = this.getRegionForFrequency(fundamentalFrequency);
    if (!fundamentalRegion) {
      this.fadeOutAll(deltaTime);
      return;
    }
    
    // Build cascade lines from harmonic profile
    const newCascades = [];
    let prevRegion = fundamentalRegion;
    
    for (const harmonic of harmonicProfile) {
      if (!harmonic.present || harmonic.amplitude < this.config.minAmplitude) continue;
      if (harmonic.harmonic === 1) continue; // Skip fundamental
      
      const targetRegion = this.getRegionForFrequency(harmonic.frequency);
      if (!targetRegion || targetRegion === prevRegion) continue;
      
      // Check if this is an upward flow (energy rising)
      const fromIndex = this.regionOrder.indexOf(prevRegion);
      const toIndex = this.regionOrder.indexOf(targetRegion);
      
      if (toIndex > fromIndex) {
        newCascades.push({
          from: prevRegion,
          to: targetRegion,
          harmonic: harmonic.harmonic,
          amplitude: harmonic.amplitude,
          opacity: 0,
          targetOpacity: Math.min(1, harmonic.amplitude * 1.5)
        });
        prevRegion = targetRegion;
      }
    }
    
    // Merge with existing cascades (smooth transitions)
    this.mergeCascades(newCascades, deltaTime);
  }
  
  /**
   * Get region name for a frequency
   */
  getRegionForFrequency(frequency) {
    for (const [name, config] of Object.entries(FREQUENCY_REGIONS)) {
      if (frequency >= config.min && frequency < config.max) {
        return name;
      }
    }
    return null;
  }
  
  /**
   * Merge new cascades with existing ones for smooth transitions
   */
  mergeCascades(newCascades, deltaTime) {
    const fadeSpeed = deltaTime / this.config.fadeInDuration;
    const fadeOutSpeed = deltaTime / this.config.fadeOutDuration;
    
    // Update existing cascades
    for (const cascade of this.cascadeLines) {
      const matching = newCascades.find(c => c.from === cascade.from && c.to === cascade.to);
      
      if (matching) {
        // Update target
        cascade.targetOpacity = matching.targetOpacity;
        cascade.amplitude = matching.amplitude;
        cascade.opacity = lerp(cascade.opacity, cascade.targetOpacity, fadeSpeed);
      } else {
        // Fade out
        cascade.targetOpacity = 0;
        cascade.opacity = lerp(cascade.opacity, 0, fadeOutSpeed);
      }
    }
    
    // Add new cascades
    for (const newCascade of newCascades) {
      const existing = this.cascadeLines.find(c => c.from === newCascade.from && c.to === newCascade.to);
      if (!existing) {
        this.cascadeLines.push(newCascade);
      }
    }
    
    // Remove fully faded cascades
    this.cascadeLines = this.cascadeLines.filter(c => c.opacity > 0.01);
  }
  
  /**
   * Fade out all cascades
   */
  fadeOutAll(deltaTime) {
    const fadeOutSpeed = deltaTime / this.config.fadeOutDuration;
    
    for (const cascade of this.cascadeLines) {
      cascade.targetOpacity = 0;
      cascade.opacity = lerp(cascade.opacity, 0, fadeOutSpeed);
    }
    
    this.cascadeLines = this.cascadeLines.filter(c => c.opacity > 0.01);
  }
  
  /**
   * Render the cascade visualization
   */
  render() {
    if (!this.ctx || !this.enabled) return;
    
    // Clear canvas
    this.ctx.clearRect(0, 0, this.width, this.height);
    
    if (this.cascadeLines.length === 0) return;
    
    // Draw each cascade line
    for (const cascade of this.cascadeLines) {
      this.drawCascadeLine(cascade);
    }
  }
  
  /**
   * Draw a single cascade line with flowing particles
   */
  drawCascadeLine(cascade) {
    const fromPos = this.regionPositions[cascade.from];
    const toPos = this.regionPositions[cascade.to];
    
    if (!fromPos || !toPos) return;
    
    const x1 = fromPos.x * this.width;
    const y1 = fromPos.y * this.height;
    const x2 = toPos.x * this.width;
    const y2 = toPos.y * this.height;
    
    // Get colors from region configs
    const fromColor = FREQUENCY_REGIONS[cascade.from]?.glowHex || '#ffffff';
    const toColor = FREQUENCY_REGIONS[cascade.to]?.glowHex || '#ffffff';
    
    const opacity = cascade.opacity;
    const lineWidth = lerp(this.config.lineWidth, this.config.maxLineWidth, cascade.amplitude);
    
    // Draw glow line
    this.ctx.save();
    this.ctx.globalAlpha = opacity * 0.3;
    this.ctx.strokeStyle = fromColor;
    this.ctx.lineWidth = lineWidth + this.config.glowBlur;
    this.ctx.lineCap = 'round';
    this.ctx.filter = `blur(${this.config.glowBlur}px)`;
    
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    
    // Curved path (slight S-curve for organic feel)
    const midY = (y1 + y2) / 2;
    const curveOffset = (Math.sin(this.flowOffset * 2) * 10);
    this.ctx.quadraticCurveTo(x1 + curveOffset, midY, x2, y2);
    
    this.ctx.stroke();
    this.ctx.filter = 'none';
    
    // Draw core line with gradient
    const gradient = this.ctx.createLinearGradient(x1, y1, x2, y2);
    gradient.addColorStop(0, fromColor);
    gradient.addColorStop(1, toColor);
    
    this.ctx.globalAlpha = opacity * 0.6;
    this.ctx.strokeStyle = gradient;
    this.ctx.lineWidth = lineWidth;
    
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.quadraticCurveTo(x1 + curveOffset, midY, x2, y2);
    this.ctx.stroke();
    
    // Draw flowing particles along the line
    this.drawFlowingParticles(x1, y1, x2, y2, curveOffset, cascade, fromColor, toColor);
    
    this.ctx.restore();
  }
  
  /**
   * Draw particles flowing along the cascade line
   */
  drawFlowingParticles(x1, y1, x2, y2, curveOffset, cascade, fromColor, toColor) {
    const numParticles = this.config.particlesPerLine;
    const opacity = cascade.opacity;
    
    for (let i = 0; i < numParticles; i++) {
      // Calculate particle position along the curve
      let t = ((i / numParticles) + this.flowOffset * (1 + cascade.harmonic * 0.1)) % 1;
      
      // Quadratic bezier point calculation
      const midY = (y1 + y2) / 2;
      const midX = x1 + curveOffset;
      
      const mt = 1 - t;
      const x = mt * mt * x1 + 2 * mt * t * midX + t * t * x2;
      const y = mt * mt * y1 + 2 * mt * t * midY + t * t * y2;
      
      // Particle size varies with position (larger in middle)
      const sizeMod = Math.sin(t * Math.PI);
      const size = lerp(2, 5, sizeMod) * cascade.amplitude;
      
      // Color interpolation
      const particleColor = t < 0.5 ? fromColor : toColor;
      
      // Draw particle glow
      this.ctx.globalAlpha = opacity * 0.4 * sizeMod;
      this.ctx.fillStyle = particleColor;
      this.ctx.beginPath();
      this.ctx.arc(x, y, size * 2, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Draw particle core
      this.ctx.globalAlpha = opacity * 0.8 * sizeMod;
      this.ctx.beginPath();
      this.ctx.arc(x, y, size, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }
  
  /**
   * Enable/disable the cascade visualization
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      this.cascadeLines = [];
      if (this.ctx) {
        this.ctx.clearRect(0, 0, this.width, this.height);
      }
    }
  }
  
  /**
   * Clean up resources
   */
  destroy() {
    if (this.canvas && this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas);
    }
    this.canvas = null;
    this.ctx = null;
    this.cascadeLines = [];
  }
}
