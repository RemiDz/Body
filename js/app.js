/**
 * Resonance Body Map - Main Application
 * Entry point that orchestrates all modules
 */

import { AUDIO_CONFIG, VISUAL_CONFIG, UI_CONFIG, FREQUENCY_REGIONS } from './config.js';
import { AudioAnalyzer } from './audio/AudioAnalyzer.js';
import { FrequencyMapper } from './audio/FrequencyMapper.js';
import { NoiseGate } from './audio/NoiseGate.js';
import { BodyRenderer } from './visual/BodyRenderer.js';
import { GlowEngine } from './visual/GlowEngine.js';
import { ParticleSystem } from './visual/ParticleSystem.js';
import { AmbientEffects } from './visual/AmbientEffects.js';
import { FrequencyDisplay } from './ui/FrequencyDisplay.js';
import { Controls } from './ui/Controls.js';
import { Calibration } from './ui/Calibration.js';

class ResonanceApp {
  constructor() {
    // Configuration
    this.config = {
      ...AUDIO_CONFIG,
      ...VISUAL_CONFIG,
      ...UI_CONFIG
    };
    
    // Module instances
    this.audioAnalyzer = null;
    this.frequencyMapper = null;
    this.noiseGate = null;
    this.bodyRenderer = null;
    this.glowEngine = null;
    this.particleSystem = null;
    this.ambientEffects = null;
    this.frequencyDisplay = null;
    this.controls = null;
    this.calibration = null;
    
    // State
    this.isRunning = false;
    this.isInitialized = false;
    this.lastFrameTime = 0;
    this.animationFrame = null;
    this.silenceStartTime = 0;
    this.isIdle = false;
    
    // Cached region bounds
    this.regionBounds = {};
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init());
    } else {
      this.init();
    }
  }
  
  /**
   * Initialize the application
   */
  async init() {
    console.log('Resonance Body Map initializing...');
    
    try {
      // Initialize UI modules first (they don't require async)
      this.initUI();
      
      // Load body SVG
      await this.initVisuals();
      
      // Initialize calibration and load saved settings
      this.initCalibration();
      
      this.isInitialized = true;
      console.log('Initialization complete');
      
    } catch (error) {
      console.error('Initialization error:', error);
      this.controls?.onMicrophoneError(error);
    }
  }
  
  /**
   * Initialize UI components
   */
  initUI() {
    // Controls
    this.controls = new Controls();
    this.controls.onStart = () => this.start();
    this.controls.onStop = () => this.stop();
    this.controls.onSettingsChange = (changes) => this.handleSettingsChange(changes);
    
    // Frequency display
    this.frequencyDisplay = new FrequencyDisplay();
    
    // Show welcome if configured
    if (this.config.showWelcome) {
      this.controls.showWelcome();
    }
  }
  
  /**
   * Initialize visual components
   */
  async initVisuals() {
    // Body renderer
    const bodyWrapper = document.getElementById('bodyWrapper');
    this.bodyRenderer = new BodyRenderer(bodyWrapper);
    
    this.bodyRenderer.onLoad = () => {
      console.log('Body SVG loaded');
      this.cacheRegionBounds();
    };
    
    this.bodyRenderer.onError = (error) => {
      console.error('Body SVG error:', error);
    };
    
    // Load the SVG
    await this.bodyRenderer.load();
    
    // Glow engine
    this.glowEngine = new GlowEngine();
    
    // Particle system
    const particlesContainer = document.getElementById('particlesContainer');
    this.particleSystem = new ParticleSystem(particlesContainer);
    
    // Ambient effects
    const ambientContainer = document.querySelector('.ambient-bg');
    this.ambientEffects = new AmbientEffects(ambientContainer);
    this.ambientEffects.init();
    this.ambientEffects.start();
  }
  
  /**
   * Initialize calibration
   */
  initCalibration() {
    this.calibration = new Calibration();
    
    // Try to load saved settings
    const saved = this.calibration.loadSettings();
    
    if (saved) {
      this.controls.updateSettingsUI(saved);
    }
    
    // Handle calibration changes
    this.calibration.onSettingsChange = (settings) => {
      this.applySettings(settings);
    };
  }
  
  /**
   * Start audio analysis and visualization
   */
  async start() {
    if (this.isRunning) return;
    
    let initError = null;
    
    try {
      // Initialize audio analyzer
      this.audioAnalyzer = new AudioAnalyzer();
      this.audioAnalyzer.onError = (error) => {
        console.error('Audio error:', error);
        initError = error;
      };
      
      const success = await this.audioAnalyzer.init();
      
      if (!success) {
        // Use the captured error if available, otherwise generic message
        throw initError || new Error('Failed to initialize audio. Please check your microphone permissions.');
      }
      
      // Initialize frequency mapper
      this.frequencyMapper = new FrequencyMapper();
      
      // Initialize noise gate
      this.noiseGate = new NoiseGate({
        threshold: this.calibration?.noiseFloor || -55
      });
      
      // Apply current settings
      this.applySettings(this.calibration?.getSettings() || {});
      
      // Notify controls
      this.controls?.onMicrophoneGranted();
      
      // Start animation loop
      this.isRunning = true;
      this.lastFrameTime = performance.now();
      this.silenceStartTime = 0;
      this.isIdle = false;
      
      // Stop idle animation if running
      this.bodyRenderer?.stopIdleAnimation();
      
      this.animate();
      
      console.log('Audio visualization started');
      
    } catch (error) {
      console.error('Start error:', error);
      this.controls?.onMicrophoneError(error);
    }
  }
  
  /**
   * Stop audio analysis and visualization
   */
  stop() {
    this.isRunning = false;
    
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    
    // Clean up audio
    if (this.audioAnalyzer) {
      this.audioAnalyzer.destroy();
      this.audioAnalyzer = null;
    }
    
    // Reset visuals
    this.bodyRenderer?.reset();
    this.frequencyDisplay?.reset();
    this.frequencyMapper?.reset();
    this.glowEngine?.reset();
    this.particleSystem?.clear();
    this.noiseGate?.reset();
    
    // Start idle animation
    this.bodyRenderer?.startIdleAnimation();
    
    console.log('Audio visualization stopped');
  }
  
  /**
   * Main animation loop
   */
  animate = () => {
    if (!this.isRunning) return;
    
    const now = performance.now();
    const deltaTime = now - this.lastFrameTime;
    this.lastFrameTime = now;
    
    // iOS Safari: Ensure audio context stays active
    if (this.audioAnalyzer?.audioContext?.state === 'suspended') {
      this.audioAnalyzer.audioContext.resume();
    }
    
    // Analyze audio
    const audioData = this.audioAnalyzer?.analyze();
    
    if (audioData) {
      // Process through noise gate
      const gateResult = this.noiseGate?.process(audioData.dominantDb) || { isOpen: audioData.isActive };
      
      // Update calibration level tracking
      this.calibration?.updateLevel(audioData.dominantDb);
      
      if (gateResult.isOpen && audioData.isActive) {
        // Active audio - reset idle timer
        this.silenceStartTime = 0;
        
        if (this.isIdle) {
          this.isIdle = false;
          this.bodyRenderer?.stopIdleAnimation();
        }
        
        // Update frequency mapping
        const intensities = this.frequencyMapper.update(audioData);
        
        // Update glow engine
        this.glowEngine.update(intensities, deltaTime);
        
        // Update body visuals
        this.bodyRenderer?.setAllRegions(intensities);
        
        // Apply GlowEngine styles for richer depth effects
        this.bodyRenderer?.applyGlowStyles(this.glowEngine);
        
        // Update particles with dominant frequency for pulsing
        if (this.calibration?.particlesEnabled !== false) {
          this.particleSystem?.update(intensities, this.regionBounds, deltaTime, audioData.dominantFrequency);
        }
        
        // Update frequency display
        const dominant = this.frequencyMapper.getDominantRegion();
        if (dominant) {
          this.frequencyDisplay?.update(
            audioData.dominantFrequency,
            dominant.intensity,
            dominant.config.glowHex,
            dominant.config.label
          );
        }
        
        // Update ambient effects
        const totalEnergy = this.frequencyMapper.getTotalEnergy();
        this.ambientEffects?.setIntensity(totalEnergy * 0.3);
        
        // Color tint based on dominant region
        if (dominant) {
          this.ambientEffects?.setColorTint(dominant.config.colorHex);
        }
        
      } else {
        // No active audio
        if (!this.silenceStartTime) {
          this.silenceStartTime = now;
        }
        
        // Check if we should start idle animation
        const silenceDuration = now - this.silenceStartTime;
        if (silenceDuration > this.config.idleDelay && !this.isIdle) {
          this.isIdle = true;
          this.bodyRenderer?.startIdleAnimation();
        }
        
        // Decay existing visuals
        const decayedIntensities = this.frequencyMapper.update(null);
        this.glowEngine.update(decayedIntensities, deltaTime);
        this.bodyRenderer?.setAllRegions(decayedIntensities);
        
        // Hide frequency display
        if (!this.frequencyMapper.isAnyActive(0.1)) {
          this.frequencyDisplay?.hide();
        }
        
        // Reset ambient effects
        this.ambientEffects?.setIntensity(0);
        this.ambientEffects?.resetColor();
      }
    }
    
    // Continue loop
    this.animationFrame = requestAnimationFrame(this.animate);
  }
  
  /**
   * Cache region bounding boxes for particle spawning
   */
  cacheRegionBounds() {
    for (const regionName of Object.keys(FREQUENCY_REGIONS)) {
      const bounds = this.bodyRenderer?.getRegionBounds(regionName);
      if (bounds) {
        this.regionBounds[regionName] = bounds;
      }
    }
  }
  
  /**
   * Handle settings changes from UI
   */
  handleSettingsChange(changes) {
    if (changes.gain !== undefined) {
      this.calibration?.setGain(changes.gain);
    }
    
    if (changes.noiseFloor !== undefined) {
      this.calibration?.setNoiseFloor(changes.noiseFloor);
    }
    
    if (changes.glowIntensity !== undefined) {
      this.calibration?.setGlowIntensity(changes.glowIntensity);
    }
    
    if (changes.particlesEnabled !== undefined) {
      this.calibration?.setParticlesEnabled(changes.particlesEnabled);
    }
    
    // Save settings
    this.calibration?.saveSettings();
  }
  
  /**
   * Apply settings to all modules
   */
  applySettings(settings) {
    // Audio analyzer gain
    if (settings.gain !== undefined && this.audioAnalyzer) {
      this.audioAnalyzer.setGain(settings.gain);
    }
    
    // Noise gate threshold
    if (settings.noiseFloor !== undefined) {
      this.noiseGate?.setThreshold(settings.noiseFloor);
      if (this.audioAnalyzer) {
        this.audioAnalyzer.setNoiseFloor(settings.noiseFloor);
      }
    }
    
    // Glow intensity
    if (settings.glowIntensity !== undefined) {
      this.glowEngine?.setIntensityMultiplier(settings.glowIntensity);
      this.frequencyMapper?.setGlowIntensity(settings.glowIntensity);
    }
    
    // Particles
    if (settings.particlesEnabled !== undefined) {
      this.particleSystem?.setEnabled(settings.particlesEnabled);
    }
  }
  
  /**
   * Start auto-calibration
   */
  async startCalibration() {
    if (!this.isRunning) {
      console.warn('Start listening before calibrating');
      return null;
    }
    
    return await this.calibration?.startCalibration();
  }
  
  /**
   * Test visualization with synthetic data
   */
  async testVisualization() {
    console.log('Running visualization test...');
    
    // Test body renderer
    await this.bodyRenderer?.testAnimation();
    
    // Test frequency display
    await this.frequencyDisplay?.testAnimation();
    
    console.log('Test complete');
  }
  
  /**
   * Get current state
   */
  getState() {
    return {
      isInitialized: this.isInitialized,
      isRunning: this.isRunning,
      isIdle: this.isIdle,
      settings: this.calibration?.getSettings()
    };
  }
  
  /**
   * Destroy and clean up
   */
  destroy() {
    this.stop();
    
    this.bodyRenderer?.destroy();
    this.particleSystem?.destroy();
    this.ambientEffects?.destroy();
    this.controls?.destroy();
    
    this.audioAnalyzer = null;
    this.frequencyMapper = null;
    this.noiseGate = null;
    this.bodyRenderer = null;
    this.glowEngine = null;
    this.particleSystem = null;
    this.ambientEffects = null;
    this.frequencyDisplay = null;
    this.controls = null;
    this.calibration = null;
    
    this.isInitialized = false;
    console.log('App destroyed');
  }
}

// Create and export app instance
const app = new ResonanceApp();

// Expose to window for debugging
window.resonanceApp = app;

// Handle visibility change (pause when hidden)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // Pause analysis when tab is hidden
    if (app.isRunning) {
      app.audioAnalyzer?.suspend();
    }
  } else {
    // Resume when visible
    if (app.isRunning) {
      app.audioAnalyzer?.resume();
    }
  }
});

// Handle resize (recache bounds)
let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    app.cacheRegionBounds();
  }, 250);
});

// Prevent context menu
document.addEventListener('contextmenu', (e) => e.preventDefault());

// Prevent zooming on double tap
let lastTouchEnd = 0;
document.addEventListener('touchend', (e) => {
  const now = Date.now();
  if (now - lastTouchEnd <= 300) {
    e.preventDefault();
  }
  lastTouchEnd = now;
}, { passive: false });

// iOS Safari: Resume audio context on any touch/click
// This is critical for iOS which suspends audio contexts aggressively
const resumeAudioContext = () => {
  if (app.audioAnalyzer?.audioContext?.state === 'suspended') {
    app.audioAnalyzer.audioContext.resume().then(() => {
      console.log('AudioContext resumed via user interaction');
    });
  }
};

document.addEventListener('touchstart', resumeAudioContext, { passive: true });
document.addEventListener('touchend', resumeAudioContext, { passive: true });
document.addEventListener('click', resumeAudioContext);

export default app;
