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
import { HarmonicCascade } from './visual/HarmonicCascade.js';
import { CymaticsOverlay } from './visual/CymaticsOverlay.js';
import { HarmonicLines } from './visual/HarmonicLines.js';
import { ResonanceRings } from './visual/ResonanceRings.js';
import { SpectrumArc } from './visual/SpectrumArc.js';
import { FrequencyDisplay } from './ui/FrequencyDisplay.js';
import { Controls } from './ui/Controls.js';
import { Calibration } from './ui/Calibration.js';
import { WakeLock } from './ui/WakeLock.js';
import { SessionTimer } from './ui/SessionTimer.js';
import { SessionRecorder } from './ui/SessionRecorder.js';
import { SessionSummary } from './ui/SessionSummary.js';
import { Screenshot } from './ui/Screenshot.js';
import { FrequencyReference } from './ui/FrequencyReference.js';
import { InstrumentGuide } from './ui/InstrumentGuide.js';
import { AudioFileInput } from './ui/AudioFileInput.js';
import { syncThemeColors } from './utils/ThemeManager.js';

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
    this.harmonicCascade = null;
    this.cymaticsOverlay = null;
    this.harmonicLines = null;
    this.resonanceRings = null;
    this.spectrumArc = null;
    this.frequencyDisplay = null;
    this.controls = null;
    this.calibration = null;
    this.wakeLock = null;
    this.sessionTimer = null;
    this.sessionRecorder = null;
    this.sessionSummary = null;
    this.frequencyReference = null;
    this.instrumentGuide = null;
    this.audioFileInput = null;
    
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
      
      // Sync theme colors in case a saved theme was restored
      syncThemeColors();
      
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
    
    // Record button
    this.controls.onRecord = () => this.toggleRecording();
    
    // Frequency display
    this.frequencyDisplay = new FrequencyDisplay();
    
    // Wake lock (prevents screen sleep)
    this.wakeLock = new WakeLock();
    
    // Session timer
    this.sessionTimer = new SessionTimer();
    
    // Session recorder
    this.sessionRecorder = new SessionRecorder();
    
    // Session summary
    this.sessionSummary = new SessionSummary();
    
    // Frequency reference & tuner
    this.frequencyReference = new FrequencyReference();
    
    // Instrument guide
    this.instrumentGuide = new InstrumentGuide();
    const instrumentGuideBtn = document.getElementById('instrumentGuideBtn');
    if (instrumentGuideBtn) {
      instrumentGuideBtn.addEventListener('click', () => this.instrumentGuide.toggle());
    }
    
    // Audio file input
    this.audioFileInput = new AudioFileInput();
    this.audioFileInput.onFileReady = (audioEl, fileName) => this.startFilePlayback(audioEl, fileName);
    const audioFileBtn = document.getElementById('audioFileBtn');
    if (audioFileBtn) {
      audioFileBtn.addEventListener('click', () => this.audioFileInput.open());
    }
    
    // Screenshot button
    const screenshotBtn = document.getElementById('screenshotBtn');
    if (screenshotBtn) {
      screenshotBtn.addEventListener('click', () => Screenshot.capture());
    }
    
    // Show welcome if configured, otherwise hide it
    if (this.config.showWelcome) {
      this.controls.showWelcome();
    } else {
      this.controls.hideWelcome();
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
    
    // Harmonic cascade visualization
    this.harmonicCascade = new HarmonicCascade();
    this.harmonicCascade.init('.body-container');
    
    // Cymatics overlay visualization
    this.cymaticsOverlay = new CymaticsOverlay({
      positionMode: 'region'  // follow active chakra by default
    });
    this.cymaticsOverlay.init('.body-container');
    
    // Harmonic lines visualization
    this.harmonicLines = new HarmonicLines('#bodyContainer');
    
    // Resonance rings visualization
    this.resonanceRings = new ResonanceRings('#bodyContainer');
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
   * Toggle session recording on/off
   */
  toggleRecording() {
    if (!this.isRunning) return;
    
    if (this.sessionRecorder?.isRecording) {
      // Stop recording and show summary
      this.sessionRecorder.stop();
      this.controls?.setRecordingState(false);
      const summary = this.sessionRecorder.getSummary();
      if (summary.totalDurationMs > 5000) {
        this.sessionSummary?.show(summary);
      }
    } else {
      // Start recording
      this.sessionRecorder?.start();
      this.controls?.setRecordingState(true);
    }
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
      
      this.audioAnalyzer.onStateChange = (state) => {
        if (state === 'ended' && this.isRunning) {
          // Mic track was killed (e.g., iOS background) — stop gracefully
          console.warn('Audio stream ended, stopping visualization');
          this.stop();
          this.controls?.onMicrophoneError(
            new Error('Microphone was disconnected. Tap "Begin Listening" to restart.')
          );
        }
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
      
      // Initialize spectrum arc (requires audioAnalyzer)
      if (!this.spectrumArc) {
        this.spectrumArc = new SpectrumArc('#bodyContainer', this.audioAnalyzer);
      } else {
        // Update audioAnalyzer reference (it's recreated on each start)
        this.spectrumArc.audioAnalyzer = this.audioAnalyzer;
        // Re-cache positions in case layout changed since construction
        this.spectrumArc.clearCache();
      }
      
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
      
      // Acquire wake lock to prevent screen sleep
      this.wakeLock?.acquire();
      
      // Start session timer
      this.sessionTimer?.start();
      
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
    
    // Release wake lock
    this.wakeLock?.release();
    
    // Stop session timer (keep display visible briefly)
    this.sessionTimer?.stop();
    
    // Stop session recorder and show summary
    if (this.sessionRecorder?.isRecording) {
      this.sessionRecorder.stop();
      this.controls?.setRecordingState(false);
      const summary = this.sessionRecorder.getSummary();
      // Only show summary if session was longer than 5 seconds
      if (summary.totalDurationMs > 5000) {
        this.sessionSummary?.show(summary);
      }
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
    
    // Clear overlay visualizations (these would freeze on screen otherwise)
    this.harmonicCascade?.update(null, 0, 0);
    this.harmonicCascade?.render();
    this.cymaticsOverlay?.update(0, 0, null, 0);
    this.cymaticsOverlay?.render();
    this.harmonicLines?.clear();
    this.resonanceRings?.clear();
    this.spectrumArc?.clear();
    
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
        const intensities = this.frequencyMapper.update(audioData, deltaTime);
        
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
            dominant.config.label,
            deltaTime
          );
        }
        
        // Update harmonic cascade visualization
        this.harmonicCascade?.update(
          audioData.harmonicProfile,
          audioData.dominantFrequency,
          deltaTime
        );
        
        // Update cymatics overlay visualization
        this.cymaticsOverlay?.update(
          audioData.dominantFrequency,
          audioData.dominantAmplitude,
          dominant?.name,
          deltaTime
        );
        
        // Update harmonic lines visualization
        if (audioData && audioData.fundamentalConfidence > 0.4) {
          this.harmonicLines?.update(
            this.frequencyMapper.harmonicContributions,
            this.frequencyMapper.intensities,
            this.glowEngine.glowStates
          );
        } else {
          this.harmonicLines?.clear();
        }
        
        // Update resonance rings visualization
        this.resonanceRings?.update(
          this.frequencyMapper.resonanceValues,
          this.frequencyMapper.intensities
        );
        
        // Update spectrum arc visualization
        this.spectrumArc?.update(audioData);
        
        // Record session data
        if (this.sessionRecorder?.isRecording) {
          this.sessionRecorder.record(
            this.frequencyMapper.intensities,
            audioData.dominantFrequency,
            deltaTime
          );
        }
        
        // Update tuner display
        if (this.frequencyReference?.isTunerMode) {
          this.frequencyReference.updateTuner(audioData.dominantFrequency);
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
        const decayedIntensities = this.frequencyMapper.update(null, deltaTime);
        this.glowEngine.update(decayedIntensities, deltaTime);
        this.bodyRenderer?.setAllRegions(decayedIntensities);
        
        // Hide frequency display
        if (!this.frequencyMapper.isAnyActive(0.1)) {
          this.frequencyDisplay?.hide();
        }
        
        // Reset ambient effects
        this.ambientEffects?.setIntensity(0);
        this.ambientEffects?.resetColor();
        
        // Fade out cascade and cymatics
        this.harmonicCascade?.update(null, 0, deltaTime);
        this.cymaticsOverlay?.update(0, 0, null, deltaTime);
        
        // Clear harmonic lines, resonance rings, and spectrum arc
        this.harmonicLines?.clear();
        this.resonanceRings?.clear();
        this.spectrumArc?.clear();
      }
      
      // Render new visualizations
      this.harmonicCascade?.render();
      this.cymaticsOverlay?.render();
    }
    
    // Continue loop
    this.animationFrame = requestAnimationFrame(this.animate);
  }
  
  /**
   * Start visualization from an audio file
   */
  async startFilePlayback(audioElement, fileName) {
    // Stop any current session
    if (this.isRunning) {
      this.stop();
    }
    
    try {
      this.audioAnalyzer = new AudioAnalyzer();
      const success = await this.audioAnalyzer.initFromAudioElement(audioElement);
      if (!success) {
        throw new Error('Failed to initialize audio from file');
      }
      
      this.frequencyMapper = new FrequencyMapper();
      this.noiseGate = new NoiseGate({
        threshold: this.calibration?.noiseFloor || -55
      });
      
      this.applySettings(this.calibration?.getSettings() || {});
      this.controls?.onMicrophoneGranted();
      
      // Update SpectrumArc's audioAnalyzer reference
      if (this.spectrumArc) {
        this.spectrumArc.audioAnalyzer = this.audioAnalyzer;
        this.spectrumArc.clearCache();
      }
      
      this.isRunning = true;
      this.lastFrameTime = performance.now();
      this.silenceStartTime = 0;
      this.isIdle = false;
      
      this.bodyRenderer?.stopIdleAnimation();
      this.wakeLock?.acquire();
      this.sessionTimer?.start();
      
      // Start playback
      audioElement.play();
      
      // Stop when audio ends
      audioElement.addEventListener('ended', () => {
        this.stop();
      }, { once: true });
      
      this.animate();
      console.log('File playback started:', fileName);
      
    } catch (error) {
      console.error('File playback error:', error);
      this.controls?.onMicrophoneError(error);
    }
  }
  
  /**
   * Apply a color theme preset
   */
  applyColorTheme(theme) {
    const body = document.body;
    // Remove all theme classes
    body.classList.remove('theme-earth', 'theme-ocean', 'theme-sunset', 'theme-mono');
    if (theme && theme !== 'default') {
      body.classList.add(`theme-${theme}`);
    }
    // Sync CSS custom property colors back into JS FREQUENCY_REGIONS
    // Use rAF to ensure computed styles have updated after class change
    requestAnimationFrame(() => syncThemeColors());
  }
  
  /**
   * Apply a visualization intensity preset
   */
  applyVizPreset(preset) {
    const presets = {
      subtle: { glowIntensity: 0.5, particlesEnabled: false, cascadeEnabled: false, cymaticsEnabled: false },
      standard: { glowIntensity: 1.0, particlesEnabled: true, cascadeEnabled: true, cymaticsEnabled: true },
      dramatic: { glowIntensity: 1.8, particlesEnabled: true, cascadeEnabled: true, cymaticsEnabled: true }
    };
    
    const settings = presets[preset];
    if (!settings) return;
    
    // Apply each setting
    this.calibration?.setGlowIntensity(settings.glowIntensity);
    this.calibration?.setParticlesEnabled(settings.particlesEnabled);
    this.calibration?.setCascadeEnabled(settings.cascadeEnabled);
    this.calibration?.setCymaticsEnabled(settings.cymaticsEnabled);
    
    this.glowEngine?.setIntensityMultiplier(settings.glowIntensity);
    this.frequencyMapper?.setGlowIntensity(settings.glowIntensity);
    this.particleSystem?.setEnabled(settings.particlesEnabled);
    this.harmonicCascade?.setEnabled(settings.cascadeEnabled);
    this.cymaticsOverlay?.setEnabled(settings.cymaticsEnabled);
    
    // Update UI controls to reflect preset values
    this.controls?.updateSettingsUI(settings);
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
    
    // Harmonic Cascade toggle
    if (changes.cascadeEnabled !== undefined) {
      this.calibration?.setCascadeEnabled(changes.cascadeEnabled);
      this.harmonicCascade?.setEnabled(changes.cascadeEnabled);
    }
    
    // Cymatics Pattern toggle
    if (changes.cymaticsEnabled !== undefined) {
      this.calibration?.setCymaticsEnabled(changes.cymaticsEnabled);
      this.cymaticsOverlay?.setEnabled(changes.cymaticsEnabled);
    }
    
    // Cymatics Position mode
    if (changes.cymaticsPosition !== undefined) {
      this.calibration?.setCymaticsPosition(changes.cymaticsPosition);
      this.cymaticsOverlay?.setPositionMode(changes.cymaticsPosition);
    }
    
    // Tuner Mode toggle
    if (changes.tunerEnabled !== undefined) {
      this.calibration?.setTunerEnabled(changes.tunerEnabled);
      if (changes.tunerEnabled) {
        this.frequencyReference?.enableTuner();
      } else {
        this.frequencyReference?.disableTuner();
      }
    }
    
    // Frequency Reference toggle
    if (changes.freqRefEnabled !== undefined) {
      this.calibration?.setFreqRefEnabled(changes.freqRefEnabled);
      if (changes.freqRefEnabled) {
        this.frequencyReference?.showReference();
      } else {
        this.frequencyReference?.hideReference();
      }
    }
    
    // Color Theme
    if (changes.colorTheme !== undefined) {
      this.calibration?.setColorTheme(changes.colorTheme);
      this.applyColorTheme(changes.colorTheme);
    }
    
    // Visualization Intensity Preset
    if (changes.vizPreset !== undefined) {
      this.calibration?.setVizPreset(changes.vizPreset);
      this.applyVizPreset(changes.vizPreset);
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
    
    // Harmonic Cascade
    if (settings.cascadeEnabled !== undefined) {
      this.harmonicCascade?.setEnabled(settings.cascadeEnabled);
    }
    
    // Cymatics
    if (settings.cymaticsEnabled !== undefined) {
      this.cymaticsOverlay?.setEnabled(settings.cymaticsEnabled);
    }
    
    if (settings.cymaticsPosition !== undefined) {
      this.cymaticsOverlay?.setPositionMode(settings.cymaticsPosition);
    }
    
    // Tuner
    if (settings.tunerEnabled !== undefined) {
      if (settings.tunerEnabled) {
        this.frequencyReference?.enableTuner();
      } else {
        this.frequencyReference?.disableTuner();
      }
    }
    
    // Frequency Reference
    if (settings.freqRefEnabled !== undefined) {
      if (settings.freqRefEnabled) {
        this.frequencyReference?.showReference();
      } else {
        this.frequencyReference?.hideReference();
      }
    }
    
    // Color Theme
    if (settings.colorTheme !== undefined) {
      this.applyColorTheme(settings.colorTheme);
    }
    
    // Viz Preset (don't re-apply on load — individual settings already loaded)
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
    this.harmonicCascade?.destroy();
    this.cymaticsOverlay?.destroy();
    this.harmonicLines?.destroy();
    this.resonanceRings?.destroy();
    this.spectrumArc?.destroy();
    this.controls?.destroy();
    this.sessionTimer?.destroy();
    this.frequencyReference?.destroy();
    this.instrumentGuide?.destroy();
    this.audioFileInput?.destroy();
    this.sessionSummary?.remove();
    
    this.audioAnalyzer = null;
    this.frequencyMapper = null;
    this.noiseGate = null;
    this.bodyRenderer = null;
    this.glowEngine = null;
    this.particleSystem = null;
    this.ambientEffects = null;
    this.harmonicCascade = null;
    this.cymaticsOverlay = null;
    this.harmonicLines = null;
    this.resonanceRings = null;
    this.spectrumArc = null;
    this.frequencyDisplay = null;
    this.controls = null;
    this.calibration = null;
    this.wakeLock = null;
    this.sessionTimer = null;
    this.sessionRecorder = null;
    this.sessionSummary = null;
    this.frequencyReference = null;
    this.instrumentGuide = null;
    this.audioFileInput = null;
    
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
    app.harmonicLines?.clearCache();
    app.resonanceRings?.clearCache();
    app.spectrumArc?.clearCache();
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
