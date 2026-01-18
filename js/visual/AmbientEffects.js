/**
 * Resonance Body Map - Ambient Effects
 * Background animations and atmosphere
 */

import { clamp, randomRange, lerp } from '../utils/math.js';
import { easeInOutSine } from '../utils/easing.js';

export class AmbientEffects {
  constructor(containerElement, options = {}) {
    this.container = containerElement;
    this.config = {
      orbCount: 3,
      orbMinSize: 200,
      orbMaxSize: 400,
      orbMinOpacity: 0.03,
      orbMaxOpacity: 0.08,
      animationDuration: 20000, // ms
      ...options
    };
    
    this.orbs = [];
    this.isAnimating = false;
    this.animationFrame = null;
    this.startTime = 0;
    
    // Global intensity modifier (reacts to audio)
    this.intensity = 0;
    this.targetIntensity = 0;
  }
  
  /**
   * Initialize ambient effects
   */
  init() {
    // Get existing orbs from DOM (they're in the HTML)
    const existingOrbs = this.container.querySelectorAll('.ambient-orb');
    
    existingOrbs.forEach((orbElement, index) => {
      this.orbs.push({
        element: orbElement,
        phase: Math.random() * Math.PI * 2,
        speed: randomRange(0.8, 1.2),
        baseOpacity: randomRange(this.config.orbMinOpacity, this.config.orbMaxOpacity),
        driftX: randomRange(-50, 50),
        driftY: randomRange(-50, 50)
      });
    });
    
    this.startTime = performance.now();
  }
  
  /**
   * Start ambient animations
   */
  start() {
    if (this.isAnimating) return;
    
    this.isAnimating = true;
    this.animate();
  }
  
  /**
   * Stop ambient animations
   */
  stop() {
    this.isAnimating = false;
    
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }
  
  /**
   * Animation loop
   */
  animate = () => {
    if (!this.isAnimating) return;
    
    const now = performance.now();
    const elapsed = (now - this.startTime) / 1000; // seconds
    
    // Smooth intensity transition
    this.intensity = lerp(this.intensity, this.targetIntensity, 0.05);
    
    // Update each orb
    for (const orb of this.orbs) {
      this.updateOrb(orb, elapsed);
    }
    
    this.animationFrame = requestAnimationFrame(this.animate);
  }
  
  /**
   * Update a single orb
   */
  updateOrb(orb, elapsed) {
    const phase = orb.phase + elapsed * orb.speed * 0.3;
    
    // Sine wave motion for smooth floating
    const xOffset = Math.sin(phase) * orb.driftX;
    const yOffset = Math.cos(phase * 0.7) * orb.driftY;
    const scaleOffset = Math.sin(phase * 0.5) * 0.1;
    
    // Increase opacity and brightness based on audio intensity
    const intensityBoost = this.intensity * 0.15;
    const opacity = clamp(orb.baseOpacity + intensityBoost, 0, 0.3);
    
    // Apply transforms
    orb.element.style.transform = `translate(${xOffset}px, ${yOffset}px) scale(${1 + scaleOffset})`;
    orb.element.style.opacity = opacity;
  }
  
  /**
   * Set intensity from audio (0-1)
   */
  setIntensity(value) {
    this.targetIntensity = clamp(value, 0, 1);
  }
  
  /**
   * Pulse effect - brief intensity spike
   */
  pulse(amount = 0.5) {
    this.intensity = clamp(this.intensity + amount, 0, 1);
    
    // Auto-decay back to target
    setTimeout(() => {
      this.targetIntensity = 0;
    }, 100);
  }
  
  /**
   * Set color tint based on active regions
   */
  setColorTint(color) {
    // Apply color tint to orbs
    for (const orb of this.orbs) {
      // Extract RGB from color and create semi-transparent version
      const rgb = this.hexToRgb(color);
      if (rgb) {
        const tintedColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`;
        orb.element.style.background = `radial-gradient(circle, ${tintedColor} 0%, transparent 70%)`;
      }
    }
  }
  
  /**
   * Reset color to default
   */
  resetColor() {
    for (let i = 0; i < this.orbs.length; i++) {
      const orb = this.orbs[i];
      // Reset to original colors from CSS
      orb.element.style.background = '';
    }
  }
  
  /**
   * Create ripple effect at position
   */
  createRipple(x, y, color = '#ffffff') {
    const ripple = document.createElement('div');
    ripple.className = 'ambient-ripple';
    ripple.style.cssText = `
      position: absolute;
      left: ${x}px;
      top: ${y}px;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      border: 1px solid ${color};
      transform: translate(-50%, -50%) scale(1);
      opacity: 0.5;
      pointer-events: none;
    `;
    
    this.container.appendChild(ripple);
    
    // Animate
    ripple.animate([
      { transform: 'translate(-50%, -50%) scale(1)', opacity: 0.5 },
      { transform: 'translate(-50%, -50%) scale(20)', opacity: 0 }
    ], {
      duration: 1500,
      easing: 'ease-out'
    }).onfinish = () => {
      ripple.remove();
    };
  }
  
  /**
   * Update vignette intensity
   */
  setVignetteIntensity(intensity) {
    const vignette = this.container.querySelector('.vignette');
    if (vignette) {
      const size = 150 - intensity * 50;
      const spread = 50 + intensity * 30;
      const opacity = 0.4 + intensity * 0.2;
      vignette.style.boxShadow = `inset 0 0 ${size}px ${spread}px rgba(0, 0, 0, ${opacity})`;
    }
  }
  
  /**
   * Helper: Convert hex to RGB
   */
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }
  
  /**
   * Destroy and clean up
   */
  destroy() {
    this.stop();
    
    // Reset styles
    for (const orb of this.orbs) {
      orb.element.style.transform = '';
      orb.element.style.opacity = '';
      orb.element.style.background = '';
    }
    
    // Remove any ripples
    const ripples = this.container.querySelectorAll('.ambient-ripple');
    ripples.forEach(r => r.remove());
    
    this.orbs = [];
  }
}
