/**
 * Resonance Body Map - Controls
 * UI controls and state management
 */

import { UI_CONFIG } from '../config.js';

export class Controls {
  constructor(options = {}) {
    this.config = { ...UI_CONFIG, ...options };
    this.states = this.config.states;
    
    // Current state
    this.currentState = this.states.IDLE;
    
    // DOM elements
    this.mainBtn = document.getElementById('mainBtn');
    this.settingsBtn = document.getElementById('settingsBtn');
    this.statusIndicator = document.getElementById('statusIndicator');
    this.welcomeOverlay = document.getElementById('welcomeOverlay');
    this.settingsOverlay = document.getElementById('settingsOverlay');
    this.errorOverlay = document.getElementById('errorOverlay');
    this.allowMicBtn = document.getElementById('allowMicBtn');
    this.retryBtn = document.getElementById('retryBtn');
    this.closeSettingsBtn = document.getElementById('closeSettingsBtn');
    
    // Callbacks
    this.onStart = null;
    this.onStop = null;
    this.onSettingsChange = null;
    
    // Bind event handlers
    this.bindEvents();
  }
  
  /**
   * Bind DOM event handlers
   */
  bindEvents() {
    // Main button
    if (this.mainBtn) {
      this.mainBtn.addEventListener('click', () => this.handleMainClick());
    }
    
    // Settings button
    if (this.settingsBtn) {
      this.settingsBtn.addEventListener('click', () => this.showSettings());
    }
    
    // Close settings
    if (this.closeSettingsBtn) {
      this.closeSettingsBtn.addEventListener('click', () => this.hideSettings());
    }
    
    // Welcome overlay - Allow Mic button
    if (this.allowMicBtn) {
      this.allowMicBtn.addEventListener('click', () => this.handleStart());
    }
    
    // Error overlay - Retry button
    if (this.retryBtn) {
      this.retryBtn.addEventListener('click', () => this.handleRetry());
    }
    
    // Settings overlay click outside to close
    if (this.settingsOverlay) {
      this.settingsOverlay.addEventListener('click', (e) => {
        if (e.target === this.settingsOverlay) {
          this.hideSettings();
        }
      });
    }
    
    // Bind settings controls
    this.bindSettingsControls();
  }
  
  /**
   * Bind settings control handlers
   */
  bindSettingsControls() {
    // Gain slider
    const gainSlider = document.getElementById('gainSlider');
    const gainValue = document.getElementById('gainValue');
    if (gainSlider && gainValue) {
      gainSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        gainValue.textContent = value.toFixed(1) + 'x';
        this.emitSettingsChange({ gain: value });
      });
    }
    
    // Noise threshold slider
    const noiseSlider = document.getElementById('noiseSlider');
    const noiseValue = document.getElementById('noiseValue');
    if (noiseSlider && noiseValue) {
      noiseSlider.addEventListener('input', (e) => {
        const value = parseInt(e.target.value);
        noiseValue.textContent = value + ' dB';
        this.emitSettingsChange({ noiseFloor: value });
      });
    }
    
    // Glow intensity slider
    const glowSlider = document.getElementById('glowSlider');
    const glowValue = document.getElementById('glowValue');
    if (glowSlider && glowValue) {
      glowSlider.addEventListener('input', (e) => {
        const value = parseFloat(e.target.value);
        glowValue.textContent = value.toFixed(1) + 'x';
        this.emitSettingsChange({ glowIntensity: value });
      });
    }
    
    // Particles toggle
    const particlesToggle = document.getElementById('particlesToggle');
    if (particlesToggle) {
      particlesToggle.addEventListener('change', (e) => {
        this.emitSettingsChange({ particlesEnabled: e.target.checked });
      });
    }
  }
  
  /**
   * Handle main button click
   */
  handleMainClick() {
    if (this.currentState === this.states.LISTENING) {
      this.handleStop();
    } else if (this.currentState === this.states.IDLE) {
      this.handleStart();
    }
  }
  
  /**
   * Handle start request
   */
  handleStart() {
    this.setState(this.states.REQUESTING_MIC);
    
    if (this.onStart) {
      this.onStart();
    }
  }
  
  /**
   * Handle stop request
   */
  handleStop() {
    this.setState(this.states.IDLE);
    
    if (this.onStop) {
      this.onStop();
    }
  }
  
  /**
   * Handle retry after error
   */
  handleRetry() {
    this.hideError();
    this.handleStart();
  }
  
  /**
   * Set current state
   */
  setState(state) {
    this.currentState = state;
    this.updateUI();
  }
  
  /**
   * Update UI based on current state
   */
  updateUI() {
    // Update main button
    if (this.mainBtn) {
      const btnText = this.mainBtn.querySelector('.btn-text');
      
      switch (this.currentState) {
        case this.states.IDLE:
          this.mainBtn.classList.remove('active');
          if (btnText) btnText.textContent = 'Begin Listening';
          break;
          
        case this.states.REQUESTING_MIC:
          this.mainBtn.classList.add('active');
          if (btnText) btnText.textContent = 'Starting...';
          break;
          
        case this.states.LISTENING:
          this.mainBtn.classList.add('active');
          if (btnText) btnText.textContent = 'Stop';
          break;
          
        case this.states.ERROR:
          this.mainBtn.classList.remove('active');
          if (btnText) btnText.textContent = 'Begin Listening';
          break;
      }
    }
    
    // Update status indicator
    if (this.statusIndicator) {
      this.statusIndicator.classList.remove('listening', 'error');
      
      switch (this.currentState) {
        case this.states.LISTENING:
          this.statusIndicator.classList.add('listening');
          break;
        case this.states.ERROR:
          this.statusIndicator.classList.add('error');
          break;
      }
    }
  }
  
  /**
   * Called when microphone access is granted
   */
  onMicrophoneGranted() {
    this.setState(this.states.LISTENING);
    this.hideWelcome();
  }
  
  /**
   * Called when microphone access is denied or error occurs
   */
  onMicrophoneError(error) {
    this.setState(this.states.ERROR);
    this.showError(error?.message || 'Microphone access denied');
  }
  
  /**
   * Show welcome overlay
   */
  showWelcome() {
    if (this.welcomeOverlay) {
      this.welcomeOverlay.classList.remove('hidden');
    }
  }
  
  /**
   * Hide welcome overlay
   */
  hideWelcome() {
    if (this.welcomeOverlay) {
      this.welcomeOverlay.classList.add('hidden');
    }
  }
  
  /**
   * Show settings panel
   */
  showSettings() {
    if (this.settingsOverlay) {
      this.settingsOverlay.classList.remove('hidden');
    }
  }
  
  /**
   * Hide settings panel
   */
  hideSettings() {
    if (this.settingsOverlay) {
      this.settingsOverlay.classList.add('hidden');
    }
  }
  
  /**
   * Show error overlay
   */
  showError(message) {
    if (this.errorOverlay) {
      const msgElement = document.getElementById('errorMessage');
      if (msgElement) {
        msgElement.textContent = message;
      }
      this.errorOverlay.classList.remove('hidden');
    }
  }
  
  /**
   * Hide error overlay
   */
  hideError() {
    if (this.errorOverlay) {
      this.errorOverlay.classList.add('hidden');
    }
  }
  
  /**
   * Emit settings change event
   */
  emitSettingsChange(changes) {
    if (this.onSettingsChange) {
      this.onSettingsChange(changes);
    }
  }
  
  /**
   * Update settings UI from current values
   */
  updateSettingsUI(settings) {
    // Gain
    const gainSlider = document.getElementById('gainSlider');
    const gainValue = document.getElementById('gainValue');
    if (gainSlider && settings.gain !== undefined) {
      gainSlider.value = settings.gain;
      if (gainValue) gainValue.textContent = settings.gain.toFixed(1) + 'x';
    }
    
    // Noise floor
    const noiseSlider = document.getElementById('noiseSlider');
    const noiseValue = document.getElementById('noiseValue');
    if (noiseSlider && settings.noiseFloor !== undefined) {
      noiseSlider.value = settings.noiseFloor;
      if (noiseValue) noiseValue.textContent = settings.noiseFloor + ' dB';
    }
    
    // Glow intensity
    const glowSlider = document.getElementById('glowSlider');
    const glowValue = document.getElementById('glowValue');
    if (glowSlider && settings.glowIntensity !== undefined) {
      glowSlider.value = settings.glowIntensity;
      if (glowValue) glowValue.textContent = settings.glowIntensity.toFixed(1) + 'x';
    }
    
    // Particles
    const particlesToggle = document.getElementById('particlesToggle');
    if (particlesToggle && settings.particlesEnabled !== undefined) {
      particlesToggle.checked = settings.particlesEnabled;
    }
  }
  
  /**
   * Check if currently listening
   */
  isListening() {
    return this.currentState === this.states.LISTENING;
  }
  
  /**
   * Destroy and clean up
   */
  destroy() {
    // Remove event listeners would go here if we stored references
    this.onStart = null;
    this.onStop = null;
    this.onSettingsChange = null;
  }
}
