/**
 * Resonance Body Map - Particle System
 * Manages particle effects emanating from active regions
 * Features: curved bezier paths, gravitation toward active regions, frequency pulsing
 */

import { VISUAL_CONFIG, FREQUENCY_REGIONS } from '../config.js';
import { randomRange, randomInt, clamp } from '../utils/math.js';

// Adjacent region mapping for gravitation
const ADJACENT_REGIONS = {
  root: ['sacral'],
  sacral: ['root', 'solar'],
  solar: ['sacral', 'heart'],
  heart: ['solar', 'throat'],
  throat: ['heart', 'thirdEye'],
  thirdEye: ['throat', 'crown'],
  crown: ['thirdEye']
};

export class ParticleSystem {
  constructor(containerElement, options = {}) {
    this.container = containerElement;
    this.config = { ...VISUAL_CONFIG, ...options };
    this.regions = FREQUENCY_REGIONS;
    
    // Particle pool for object reuse
    this.pool = [];
    this.activeParticles = [];
    this.maxParticles = this.config.maxParticles || 60;
    
    // Screen-space region centers cache (fixes SVG/viewBox coordinate mismatch)
    this.regionCenters = {};
    
    // Pre-create particle elements
    this.initPool();
    
    // State
    this.isEnabled = true;
    this.lastSpawnTime = {};
    this.currentIntensities = {};
    this.dominantFrequency = 0;
    this.pulsePhase = 0;
    
    // Initialize spawn timers for each region
    for (const regionName of Object.keys(this.regions)) {
      this.lastSpawnTime[regionName] = 0;
      this.currentIntensities[regionName] = 0;
    }
  }
  
  /**
   * Create a single particle record with all required fields
   */
  createParticleRecord() {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.display = 'none';
    this.container.appendChild(particle);

    return {
      element: particle,
      active: false,
      startTime: 0,
      lifetime: 0,
      startX: 0,
      startY: 0,
      endX: 0,
      endY: 0,
      controlX1: 0,
      controlY1: 0,
      controlX2: 0,
      controlY2: 0,
      useCurve: false,
      size: 4,
      baseSize: 4,
      color: '#ffffff',
      opacity: 0.8,
      regionName: '',
      gravitateToward: null,
      gravitateStrength: 0
    };
  }
  
  /**
   * Initialize particle pool with reusable DOM elements
   */
  initPool() {
    for (let i = 0; i < this.maxParticles; i++) {
      this.pool.push(this.createParticleRecord());
    }
  }
  
  /**
   * Update particle system
   * @param {Object} regionIntensities - Current region intensities
   * @param {Object} regionBounds - Bounding boxes for each region
   * @param {number} deltaTime - Time since last update in ms
   * @param {number} dominantFrequency - Current dominant frequency for pulsing
   */
  update(regionIntensities, regionBounds, deltaTime, dominantFrequency = 0) {
    if (!this.isEnabled) return;
    
    const now = performance.now();
    
    // Store current intensities for gravitation calculations
    this.currentIntensities = { ...regionIntensities };
    this.dominantFrequency = dominantFrequency;
    
    // Cache screen-space centers for all regions (fixes SVG/viewBox mismatch)
    this.regionCenters = {};
    if (regionBounds) {
      for (const [name, b] of Object.entries(regionBounds)) {
        if (b && Number.isFinite(b.centerX) && Number.isFinite(b.centerY)) {
          this.regionCenters[name] = { x: b.centerX, y: b.centerY };
        }
      }
    }
    
    // Update pulse phase based on dominant frequency (creates rhythm)
    if (dominantFrequency > 0) {
      // Pulse rate scales with frequency (lower freq = slower pulse)
      const pulseRate = clamp(dominantFrequency / 200, 0.5, 4);
      this.pulsePhase += (deltaTime / 1000) * pulseRate * Math.PI * 2;
      if (this.pulsePhase > Math.PI * 2) this.pulsePhase -= Math.PI * 2;
    }
    
    // Potentially spawn new particles for active regions
    for (const [regionName, intensity] of Object.entries(regionIntensities)) {
      if (intensity >= this.config.particleSpawnThreshold) {
        this.maybeSpawnParticle(regionName, intensity, regionBounds, now);
      }
    }
    
    // Update active particles
    this.updateParticles(now, deltaTime);
  }
  
  /**
   * Maybe spawn a new particle for a region
   */
  maybeSpawnParticle(regionName, intensity, regionBounds, now) {
    const bounds = regionBounds?.[regionName];
    if (!bounds) return;
    
    // Helper to get screen-space center for a region
    const getCenter = (r) => {
      const c = this.regionCenters?.[r];
      if (c) return c;
      const b = regionBounds?.[r];
      if (b) return { x: b.centerX, y: b.centerY };
      return { x: bounds.centerX, y: bounds.centerY };
    };
    
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
    
    // Random size
    const size = randomRange(this.config.particleSize[0], this.config.particleSize[1]);
    const lifetime = randomRange(this.config.particleLifetime[0], this.config.particleLifetime[1]);
    
    // Determine movement type based on context
    const useCurvedPath = Math.random() < 0.6; // 60% chance of curved path
    
    let endX, endY, controlX1, controlY1, controlX2, controlY2;
    let gravitateToward = null;
    let gravitateStrength = 0;
    
    if (useCurvedPath) {
      // Curved path along energy channels
      // Find adjacent active regions to potentially curve toward
      const adjacentRegions = ADJACENT_REGIONS[regionName] || [];
      const activeAdjacent = adjacentRegions.filter(r => 
        this.currentIntensities[r] > 0.2
      );
      
      if (activeAdjacent.length > 0 && Math.random() < 0.5) {
        // Curve toward an adjacent active region
        const targetRegion = activeAdjacent[Math.floor(Math.random() * activeAdjacent.length)];
        const targetCenter = getCenter(targetRegion);
        
        gravitateToward = targetRegion;
        gravitateStrength = this.currentIntensities[targetRegion] * 0.5;
        
        // End point curves toward target chakra
        endX = startX + (targetCenter.x - startX) * 0.6 + randomRange(-15, 15);
        endY = startY + (targetCenter.y - startY) * 0.7;
        
        // Control points create S-curve along spine
        controlX1 = startX + randomRange(-20, 20);
        controlY1 = startY + (endY - startY) * 0.3;
        controlX2 = endX + randomRange(-15, 15);
        controlY2 = startY + (endY - startY) * 0.7;
      } else {
        // Spiral/wave path upward along spine
        const spiralDirection = Math.random() < 0.5 ? 1 : -1;
        const spiralAmplitude = randomRange(15, 35);
        const rise = randomRange(this.config.particleSpeed[0], this.config.particleSpeed[1]);
        
        endX = startX + spiralDirection * spiralAmplitude * 0.5;
        endY = startY - rise * (lifetime / 1000);
        
        // Create wave-like control points
        controlX1 = startX + spiralDirection * spiralAmplitude;
        controlY1 = startY + (endY - startY) * 0.33;
        controlX2 = startX - spiralDirection * spiralAmplitude * 0.5;
        controlY2 = startY + (endY - startY) * 0.66;
      }
    } else {
      // Simple rising with drift (original behavior)
      const drift = randomRange(-this.config.particleDrift, this.config.particleDrift);
      const rise = randomRange(this.config.particleSpeed[0], this.config.particleSpeed[1]);
      
      endX = startX + drift;
      endY = startY - rise * (lifetime / 1000);
      
      // Simple quadratic curve
      controlX1 = (startX + endX) / 2 + randomRange(-10, 10);
      controlY1 = (startY + endY) / 2;
      controlX2 = controlX1;
      controlY2 = controlY1;
    }
    
    // Set particle properties
    particle.active = true;
    particle.startTime = now;
    particle.lifetime = lifetime;
    particle.startX = startX;
    particle.startY = startY;
    particle.endX = endX;
    particle.endY = endY;
    particle.controlX1 = controlX1;
    particle.controlY1 = controlY1;
    particle.controlX2 = controlX2;
    particle.controlY2 = controlY2;
    particle.useCurve = useCurvedPath;
    particle.size = size;
    particle.baseSize = size;
    particle.color = config.glowHex;
    particle.opacity = clamp(intensity, 0.4, 0.9);
    particle.regionName = regionName;
    particle.gravitateToward = gravitateToward;
    particle.gravitateStrength = gravitateStrength;
    
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
  updateParticles(now, deltaTime) {
    // Calculate pulse factor based on frequency
    const pulseFactor = 1 + Math.sin(this.pulsePhase) * 0.3;
    
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
      
      // Calculate position - use bezier curve for smooth paths
      let x, y;
      
      if (particle.useCurve) {
        // Cubic bezier interpolation
        const t = progress;
        const mt = 1 - t;
        const mt2 = mt * mt;
        const mt3 = mt2 * mt;
        const t2 = t * t;
        const t3 = t2 * t;
        
        x = mt3 * particle.startX + 
            3 * mt2 * t * particle.controlX1 + 
            3 * mt * t2 * particle.controlX2 + 
            t3 * particle.endX;
        
        y = mt3 * particle.startY + 
            3 * mt2 * t * particle.controlY1 + 
            3 * mt * t2 * particle.controlY2 + 
            t3 * particle.endY;
      } else {
        // Simple linear interpolation
        x = particle.startX + (particle.endX - particle.startX) * progress;
        y = particle.startY + (particle.endY - particle.startY) * progress;
      }
      
      // Apply gravitation toward adjacent active regions
      if (particle.gravitateToward && deltaTime) {
        const targetRegion = particle.gravitateToward;
        const targetIntensity = this.currentIntensities[targetRegion] || 0;
        
        if (targetIntensity > 0.1) {
          const targetCenter = this.regionCenters?.[targetRegion];
          if (!targetCenter) continue;
          
          const gravitateForce = particle.gravitateStrength * targetIntensity;
          
          // Gently pull toward target chakra center
          const dx = targetCenter.x - x;
          const dy = targetCenter.y - y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance > 5) {
            x += (dx / distance) * gravitateForce * 2;
            y += (dy / distance) * gravitateForce * 2;
          }
        }
      }
      
      // Calculate opacity fade
      let opacity = particle.opacity;
      if (progress > 0.6) {
        // Start fading at 60% of lifetime
        opacity = particle.opacity * (1 - (progress - 0.6) / 0.4);
      }
      
      // Apply frequency-based pulsing to size
      const baseSizeFactor = progress < 0.3 
        ? 1 
        : 1 - (progress - 0.3) / 0.7 * 0.5;
      
      // Pulse size with dominant frequency
      const pulseSize = particle.baseSize * baseSizeFactor * pulseFactor;
      
      // Update element
      const el = particle.element;
      el.style.transform = `translate(-50%, -50%)`;
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      el.style.width = pulseSize + 'px';
      el.style.height = pulseSize + 'px';
      el.style.opacity = opacity;
      
      // Update glow intensity with pulse
      const glowSize = pulseSize * 2 * pulseFactor;
      el.style.boxShadow = `0 0 ${glowSize}px ${particle.color}, 0 0 ${glowSize * 2}px ${particle.color}`;
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
          this.maybeSpawnParticle(regionName, 1.0, { [regionName]: bounds }, performance.now());
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
      this.pool.push(this.createParticleRecord());
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
