/**
 * Resonance Body Map - Particle System
 * Manages particle effects emanating from active regions
 */

import { VISUAL_CONFIG, FREQUENCY_REGIONS } from '../config.js';
import { randomRange, randomInt, clamp } from '../utils/math.js';

export class ParticleSystem {
  constructor(containerElement, options = {}) {
    this.container = containerElement;
    this.config = { ...VISUAL_CONFIG, ...options };
    this.regions = FREQUENCY_REGIONS;
    
    // Particle pool for object reuse
    this.pool = [];
    this.activeParticles = [];
    this.maxParticles = this.config.maxParticles || 60;
    
    // Pre-create particle elements
    this.initPool();
    
    // State
    this.isEnabled = true;
    this.lastSpawnTime = {};
    
    // Initialize spawn timers for each region
    for (const regionName of Object.keys(this.regions)) {
      this.lastSpawnTime[regionName] = 0;
    }
  }
  
  /**
   * Initialize particle pool with reusable DOM elements
   */
  initPool() {
    for (let i = 0; i < this.maxParticles; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      particle.style.display = 'none';
      this.container.appendChild(particle);
      
      this.pool.push({
        element: particle,
        active: false,
        startTime: 0,
        lifetime: 0,
        startX: 0,
        startY: 0,
        endX: 0,
        endY: 0,
        size: 4,
        color: '#ffffff',
        opacity: 0.8
      });
    }
  }
  
  /**
   * Update particle system
   * @param {Object} regionIntensities - Current region intensities
   * @param {Object} regionBounds - Bounding boxes for each region
   * @param {number} deltaTime - Time since last update in ms
   */
  update(regionIntensities, regionBounds, deltaTime) {
    if (!this.isEnabled) return;
    
    const now = performance.now();
    
    // Potentially spawn new particles for active regions
    for (const [regionName, intensity] of Object.entries(regionIntensities)) {
      if (intensity >= this.config.particleSpawnThreshold) {
        this.maybeSpawnParticle(regionName, intensity, regionBounds[regionName], now);
      }
    }
    
    // Update active particles
    this.updateParticles(now);
  }
  
  /**
   * Maybe spawn a new particle for a region
   */
  maybeSpawnParticle(regionName, intensity, bounds, now) {
    if (!bounds) return;
    
    // Check spawn probability
    const spawnChance = intensity * this.config.particleSpawnRate;
    if (Math.random() > spawnChance) return;
    
    // Get available particle from pool
    const particle = this.getFromPool();
    if (!particle) return; // Pool exhausted
    
    // Configure particle
    const config = this.regions[regionName];
    
    // Random position within region bounds
    const startX = bounds.centerX + (Math.random() - 0.5) * bounds.width * 0.8;
    const startY = bounds.centerY + (Math.random() - 0.5) * bounds.height * 0.8;
    
    // Random end position (drift upward with some horizontal movement)
    const drift = randomRange(-this.config.particleDrift, this.config.particleDrift);
    const rise = randomRange(this.config.particleSpeed[0], this.config.particleSpeed[1]);
    const lifetime = randomRange(this.config.particleLifetime[0], this.config.particleLifetime[1]);
    
    const endX = startX + drift;
    const endY = startY - rise * (lifetime / 1000);
    
    // Random size
    const size = randomRange(this.config.particleSize[0], this.config.particleSize[1]);
    
    // Set particle properties
    particle.active = true;
    particle.startTime = now;
    particle.lifetime = lifetime;
    particle.startX = startX;
    particle.startY = startY;
    particle.endX = endX;
    particle.endY = endY;
    particle.size = size;
    particle.color = config.glowHex;
    particle.opacity = clamp(intensity, 0.4, 0.9);
    particle.regionName = regionName;
    
    // Style the element
    const el = particle.element;
    el.style.display = 'block';
    el.style.left = startX + 'px';
    el.style.top = startY + 'px';
    el.style.width = size + 'px';
    el.style.height = size + 'px';
    el.style.backgroundColor = config.glowHex;
    el.style.boxShadow = `0 0 ${size * 2}px ${config.glowHex}, 0 0 ${size * 4}px ${config.colorHex}`;
    el.style.opacity = particle.opacity;
    
    this.activeParticles.push(particle);
  }
  
  /**
   * Update all active particles
   */
  updateParticles(now) {
    for (let i = this.activeParticles.length - 1; i >= 0; i--) {
      const particle = this.activeParticles[i];
      const elapsed = now - particle.startTime;
      const progress = elapsed / particle.lifetime;
      
      if (progress >= 1) {
        // Return to pool
        this.returnToPool(particle);
        this.activeParticles.splice(i, 1);
        continue;
      }
      
      // Interpolate position
      const x = particle.startX + (particle.endX - particle.startX) * progress;
      const y = particle.startY + (particle.endY - particle.startY) * progress;
      
      // Calculate opacity fade
      let opacity = particle.opacity;
      if (progress > 0.6) {
        // Start fading at 60% of lifetime
        opacity = particle.opacity * (1 - (progress - 0.6) / 0.4);
      }
      
      // Scale down towards end
      const scale = progress < 0.3 
        ? 1 
        : 1 - (progress - 0.3) / 0.7 * 0.5;
      
      // Update element
      const el = particle.element;
      el.style.transform = `translate(-50%, -50%) scale(${scale})`;
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      el.style.opacity = opacity;
    }
  }
  
  /**
   * Get an inactive particle from the pool
   */
  getFromPool() {
    for (const particle of this.pool) {
      if (!particle.active) {
        return particle;
      }
    }
    return null; // Pool exhausted
  }
  
  /**
   * Return a particle to the pool
   */
  returnToPool(particle) {
    particle.active = false;
    particle.element.style.display = 'none';
  }
  
  /**
   * Spawn a burst of particles from a region
   */
  spawnBurst(regionName, count, bounds) {
    if (!bounds) return;
    
    for (let i = 0; i < count; i++) {
      // Delay each particle slightly
      setTimeout(() => {
        if (this.isEnabled) {
          this.maybeSpawnParticle(regionName, 1.0, bounds, performance.now());
        }
      }, i * 50);
    }
  }
  
  /**
   * Enable/disable particle system
   */
  setEnabled(enabled) {
    this.isEnabled = enabled;
    
    if (!enabled) {
      this.clear();
    }
  }
  
  /**
   * Clear all active particles
   */
  clear() {
    for (const particle of this.activeParticles) {
      this.returnToPool(particle);
    }
    this.activeParticles = [];
  }
  
  /**
   * Set max particles
   */
  setMaxParticles(max) {
    this.maxParticles = clamp(max, 10, 100);
    
    // Add more if needed
    while (this.pool.length < this.maxParticles) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      particle.style.display = 'none';
      this.container.appendChild(particle);
      
      this.pool.push({
        element: particle,
        active: false,
        startTime: 0,
        lifetime: 0,
        startX: 0,
        startY: 0,
        endX: 0,
        endY: 0,
        size: 4,
        color: '#ffffff',
        opacity: 0.8
      });
    }
  }
  
  /**
   * Set spawn rate
   */
  setSpawnRate(rate) {
    this.config.particleSpawnRate = clamp(rate, 0.05, 1.0);
  }
  
  /**
   * Get active particle count
   */
  getActiveCount() {
    return this.activeParticles.length;
  }
  
  /**
   * Destroy and clean up
   */
  destroy() {
    this.clear();
    
    for (const particle of this.pool) {
      if (particle.element.parentNode) {
        particle.element.parentNode.removeChild(particle.element);
      }
    }
    
    this.pool = [];
    this.activeParticles = [];
  }
}
