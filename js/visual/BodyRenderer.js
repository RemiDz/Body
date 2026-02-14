/**
 * Resonance Body Map - Body Renderer
 * Manipulates the SVG body visualization
 */

import { FREQUENCY_REGIONS, UI_CONFIG } from '../config.js';
import { clamp } from '../utils/math.js';

export class BodyRenderer {
  constructor(containerElement, options = {}) {
    this.container = containerElement;
    this.config = { ...UI_CONFIG, ...options };
    this.regions = FREQUENCY_REGIONS;
    
    this.svgElement = null;
    this.energyLayer = null;
    this.organsLayer = null;
    
    // Cache element references
    this.energyElements = {};
    this.organElements = {};
    this.spineLineElements = {};
    this.spineNodeElements = {};
    
    this.isLoaded = false;
    this.isIdleAnimating = false;
    
    // Callbacks
    this.onLoad = null;
    this.onError = null;
  }
  
  /**
   * Load and inject the body SVG
   */
  async load(svgPath = null) {
    const path = svgPath || this.config.bodySvgPath;
    
    try {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`Failed to load SVG: ${response.status}`);
      }
      
      const svgText = await response.text();
      
      // Create a temporary container to parse SVG
      const temp = document.createElement('div');
      temp.innerHTML = svgText;
      
      this.svgElement = temp.querySelector('svg');
      if (!this.svgElement) {
        throw new Error('No SVG element found in file');
      }
      
      // Add to DOM
      this.container.innerHTML = '';
      this.container.appendChild(this.svgElement);
      
      // Cache layer references
      this.energyLayer = this.svgElement.querySelector('#energy-layer');
      this.organsLayer = this.svgElement.querySelector('#organs-layer');
      
      // Cache individual element references for performance
      this.cacheElements();
      
      this.isLoaded = true;
      
      // Start idle breathing animation on load - makes body feel alive
      this.startIdleAnimation();
      
      if (this.onLoad) {
        this.onLoad();
      }
      
      return true;
      
    } catch (error) {
      console.error('BodyRenderer load error:', error);
      
      if (this.onError) {
        this.onError(error);
      }
      
      return false;
    }
  }
  
  /**
   * Cache DOM element references for performance
   */
  cacheElements() {
    // Cache energy region elements
    for (const regionName of Object.keys(this.regions)) {
      const elementId = this.regions[regionName].energyElement;
      const element = this.svgElement.querySelector(`#${elementId}`);
      if (element) {
        this.energyElements[regionName] = element;
      }
    }
    
    // Cache organ elements
    for (const [regionName, config] of Object.entries(this.regions)) {
      this.organElements[regionName] = [];
      
      for (const organId of config.organs) {
        const element = this.svgElement.querySelector(`#${organId}`);
        if (element) {
          this.organElements[regionName].push(element);
        }
      }
    }
    
    // Cache spine line elements (connecting chakra centers)
    const spineConnections = [
      { id: 'spine-line-crown-thirdeye', regions: ['crown', 'thirdEye'] },
      { id: 'spine-line-thirdeye-throat', regions: ['thirdEye', 'throat'] },
      { id: 'spine-line-throat-heart', regions: ['throat', 'heart'] },
      { id: 'spine-line-heart-solar', regions: ['heart', 'solar'] },
      { id: 'spine-line-solar-sacral', regions: ['solar', 'sacral'] },
      { id: 'spine-line-sacral-root', regions: ['sacral', 'root'] }
    ];
    
    for (const connection of spineConnections) {
      const element = this.svgElement.querySelector(`#${connection.id}`);
      if (element) {
        this.spineLineElements[connection.id] = {
          element,
          regions: connection.regions
        };
      }
    }
    
    // Cache spine node elements (chakra center points)
    const regionNames = ['crown', 'thirdEye', 'throat', 'heart', 'solar', 'sacral', 'root'];
    for (const regionName of regionNames) {
      const nodeId = `spine-node-${regionName.toLowerCase()}`; // Fix dead .replace() (#28)
      const element = this.svgElement.querySelector(`#${nodeId}`);
      if (element) {
        this.spineNodeElements[regionName] = element;
      }
    }
    // Handle thirdEye specifically
    const thirdEyeNode = this.svgElement.querySelector('#spine-node-thirdeye');
    if (thirdEyeNode) {
      this.spineNodeElements['thirdEye'] = thirdEyeNode;
    }
  }
  
  /**
   * Set intensity for a single region
   * @param {string} regionName - Name of the region (root, sacral, etc.)
   * @param {number} intensity - Intensity value 0-1
   */
  setRegionIntensity(regionName, intensity) {
    if (!this.isLoaded) return;
    
    const clampedIntensity = clamp(intensity, 0, 1);
    const config = this.regions[regionName];
    
    if (!config) return;
    
    // Update energy layer glow
    const energyEl = this.energyElements[regionName];
    if (energyEl) {
      energyEl.style.opacity = clampedIntensity;
    }
    
    // Update organ elements
    const organs = this.organElements[regionName];
    if (organs) {
      for (const organ of organs) {
        this.updateOrganElement(organ, clampedIntensity, config);
      }
    }
  }
  
  /**
   * Set all region intensities at once
   * @param {Object} intensityMap - Map of region names to intensities
   */
  setAllRegions(intensityMap) {
    if (!this.isLoaded) return;
    
    for (const [regionName, intensity] of Object.entries(intensityMap)) {
      this.setRegionIntensity(regionName, intensity);
    }
    
    // Update spine lines and nodes based on adjacent region intensities
    this.updateSpineLines(intensityMap);
  }
  
  /**
   * Update spine line opacities based on adjacent region intensities
   * Lines glow when energy flows between connected chakras
   */
  updateSpineLines(intensityMap) {
    const FLOW_THRESHOLD = 0.08; // Threshold to activate flow animation
    
    // Update spine lines (glow based on average of connected regions)
    for (const [lineId, lineData] of Object.entries(this.spineLineElements)) {
      const [region1, region2] = lineData.regions;
      const intensity1 = intensityMap[region1] || 0;
      const intensity2 = intensityMap[region2] || 0;
      
      // Line glows when either connected region is active
      // Use max for stronger effect, or average for subtler effect
      const lineIntensity = Math.max(intensity1, intensity2) * 0.8;
      
      if (lineIntensity > 0.05) {
        // Active - glow the line
        const opacity = 0.1 + lineIntensity * 0.7;
        const strokeWidth = 2 + lineIntensity * 2;
        lineData.element.style.opacity = opacity;
        lineData.element.style.strokeWidth = strokeWidth;
        
        // Add flow animation when intensity is above threshold
        if (lineIntensity > FLOW_THRESHOLD) {
          lineData.element.classList.add('flowing');
        } else {
          lineData.element.classList.remove('flowing');
        }
      } else {
        // Inactive - subtle base visibility
        lineData.element.style.opacity = 0.05;
        lineData.element.style.strokeWidth = 2;
        lineData.element.classList.remove('flowing');
      }
    }
    
    // Update spine nodes (chakra center points)
    for (const [regionName, nodeElement] of Object.entries(this.spineNodeElements)) {
      const intensity = intensityMap[regionName] || 0;
      
      if (intensity > 0.05) {
        const opacity = 0.15 + intensity * 0.7;
        const scale = 1 + intensity * 0.5;
        nodeElement.style.opacity = opacity;
        nodeElement.style.transform = `scale(${scale})`;
        nodeElement.style.transformOrigin = 'center';
      } else {
        nodeElement.style.opacity = 0.1;
        nodeElement.style.transform = 'scale(1)';
      }
    }
  }
  
  /**
   * Apply GlowEngine styles to energy layers for richer depth
   * @param {GlowEngine} glowEngine - The glow engine instance
   */
  applyGlowStyles(glowEngine) {
    if (!this.isLoaded || !glowEngine) return;
    
    for (const [regionName, element] of Object.entries(this.energyElements)) {
      if (!element) continue;
      
      const styles = glowEngine.getGlowStyles(regionName);
      
      // Apply filter (multi-layer glow) - keeps existing opacity from setRegionIntensity
      if (styles.filter && styles.filter !== 'none') {
        element.style.filter = styles.filter;
      }
      
      // Apply subtle scale transform for breathing effect
      if (styles.transform) {
        element.style.transform = styles.transform;
        element.style.transformOrigin = 'center';
      }
    }
  }
  
  /**
   * Update a single organ element's visual state
   */
  updateOrganElement(element, intensity, regionConfig) {
    if (!element) return;
    
    if (intensity > 0.05) {
      // Active state - increase fill opacity and add glow
      const fillOpacity = 0.05 + intensity * 0.4;
      const strokeOpacity = 0.15 + intensity * 0.5;
      
      element.style.fillOpacity = fillOpacity;
      element.style.strokeOpacity = strokeOpacity;
      
      // Apply glow using drop-shadow (more performant than filter)
      const glowSize = Math.round(intensity * 15);
      const glowColor = regionConfig.glowHex;
      element.style.filter = `drop-shadow(0 0 ${glowSize}px ${glowColor})`;
    } else {
      // Inactive state - reset to default
      element.style.fillOpacity = '';
      element.style.strokeOpacity = '';
      element.style.filter = '';
    }
  }
  
  /**
   * Start idle breathing animation
   */
  startIdleAnimation() {
    if (this.isIdleAnimating || !this.isLoaded) return;
    
    this.isIdleAnimating = true;
    this.container.classList.add('idle-breathing');
    
    // Make energy layer visible for breathing effect
    if (this.energyLayer) {
      this.energyLayer.style.opacity = '1';
    }
  }
  
  /**
   * Stop idle breathing animation
   */
  stopIdleAnimation() {
    if (!this.isIdleAnimating) return;
    
    this.isIdleAnimating = false;
    this.container.classList.remove('idle-breathing');
    
    // Reset energy layer opacity that was set by startIdleAnimation
    // so it doesn't interfere with active visualization
    if (this.energyLayer) {
      this.energyLayer.style.opacity = '';
    }
  }
  
  /**
   * Reset all visuals to default state
   */
  reset() {
    if (!this.isLoaded) return;
    
    this.stopIdleAnimation();
    
    // Reset all energy elements
    for (const element of Object.values(this.energyElements)) {
      if (element) {
        element.style.opacity = '0';
      }
    }
    
    // Reset all organ elements
    for (const organs of Object.values(this.organElements)) {
      for (const organ of organs) {
        organ.style.fillOpacity = '';
        organ.style.strokeOpacity = '';
        organ.style.filter = '';
      }
    }
  }
  
  /**
   * Get bounding box for a region (for particle spawning)
   */
  getRegionBounds(regionName) {
    const energyEl = this.energyElements[regionName];
    if (!energyEl || !this.svgElement) return null;
    
    // Get SVG viewBox
    const viewBox = this.svgElement.viewBox.baseVal;
    const svgRect = this.svgElement.getBoundingClientRect();
    
    // Get element bounding box in SVG coordinates
    const bbox = energyEl.getBBox();
    
    // Calculate scale factors
    const scaleX = svgRect.width / viewBox.width;
    const scaleY = svgRect.height / viewBox.height;
    
    // Convert to screen coordinates
    return {
      x: svgRect.left + bbox.x * scaleX,
      y: svgRect.top + bbox.y * scaleY,
      width: bbox.width * scaleX,
      height: bbox.height * scaleY,
      centerX: svgRect.left + (bbox.x + bbox.width / 2) * scaleX,
      centerY: svgRect.top + (bbox.y + bbox.height / 2) * scaleY
    };
  }
  
  /**
   * Get center point of the entire body SVG (for global effects)
   */
  getBodyCenter() {
    if (!this.svgElement) return null;
    
    const rect = this.svgElement.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
  }
  
  /**
   * Apply a global effect to the body (e.g., full-body glow)
   */
  setGlobalGlow(intensity, color = '#ffffff') {
    if (!this.svgElement) return;
    
    if (intensity > 0.05) {
      const glowSize = Math.round(intensity * 30);
      this.svgElement.style.filter = `drop-shadow(0 0 ${glowSize}px ${color})`;
    } else {
      this.svgElement.style.filter = '';
    }
  }
  
  /**
   * Show all regions briefly for testing/preview
   */
  async testAnimation() {
    if (!this.isLoaded) return;
    
    const regionNames = Object.keys(this.regions);
    
    for (const regionName of regionNames) {
      // Fade in
      for (let i = 0; i <= 10; i++) {
        this.setRegionIntensity(regionName, i / 10);
        await new Promise(r => setTimeout(r, 30));
      }
      
      // Hold
      await new Promise(r => setTimeout(r, 200));
      
      // Fade out
      for (let i = 10; i >= 0; i--) {
        this.setRegionIntensity(regionName, i / 10);
        await new Promise(r => setTimeout(r, 30));
      }
    }
  }
  
  /**
   * Check if SVG is loaded
   */
  isReady() {
    return this.isLoaded;
  }
  
  /**
   * Destroy and clean up
   */
  destroy() {
    this.reset();
    this.container.innerHTML = '';
    this.svgElement = null;
    this.energyLayer = null;
    this.organsLayer = null;
    this.energyElements = {};
    this.organElements = {};
    // Clear spine caches (#27)
    this.spineLineElements = {};
    this.spineNodeElements = {};
    this.isLoaded = false;
  }
}
