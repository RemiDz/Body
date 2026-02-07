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
    this.fullscreenBtn = document.getElementById('fullscreenBtn');
    this.appContainer = document.getElementById('app');
    
    // Fullscreen state
    this.isFullscreen = false;
    
    // Callbacks
    this.onStart = null;
    this.onStop = null;
    this.onSettingsChange = null;
    
    // Bind event handlers
    this.bindEvents();
    
    // Setup fullscreen
    this.setupFullscreen();
  }
  
  /**
   * Helper to add both click and touch events (iOS compatibility)
   * Handles iPhone Safari quirks with touch events
   */
  addTapHandler(element, handler) {
    if (!element) return;
    
    let touchHandled = false;
    let touchMoved = false;
    
    // Touch events for iOS - handle BOTH touchstart for immediate response
    element.addEventListener('touchstart', (e) => {
      touchMoved = false;
      touchHandled = false;
      // Add visual feedback
      element.classList.add('btn-pressed');
    }, { passive: true });
    
    element.addEventListener('touchmove', () => {
      touchMoved = true;
    }, { passive: true });
    
    element.addEventListener('touchend', (e) => {
      element.classList.remove('btn-pressed');
      
      if (!touchMoved) {
        touchHandled = true;
        e.preventDefault();
        // Small delay to ensure iOS processes the event
        setTimeout(() => {
          handler(e);
        }, 10);
      }
    }, { passive: false });
    
    element.addEventListener('touchcancel', () => {
      element.classList.remove('btn-pressed');
      touchMoved = false;
    }, { passive: true });
    
    // Click event for desktop (and fallback for iOS)
    element.addEventListener('click', (e) => {
      // Only fire if touch didn't already handle it
      if (!touchHandled) {
        handler(e);
      }
      // Reset for next interaction
      touchHandled = false;
    });
  }
  
  /**
   * Bind DOM event handlers
   */
  bindEvents() {
    // Main button - use tap handler for iOS
    this.addTapHandler(this.mainBtn, () => this.handleMainClick());
    
    // Settings button
    this.addTapHandler(this.settingsBtn, () => this.showSettings());
    
    // Close settings
    this.addTapHandler(this.closeSettingsBtn, () => this.hideSettings());
    
    // Welcome overlay - Allow Mic button (CRITICAL for iOS)
    this.addTapHandler(this.allowMicBtn, () => this.handleStart());
    
    // Welcome overlay - dismiss on background tap (click only, to avoid touch interference)
    if (this.welcomeOverlay) {
      this.welcomeOverlay.addEventListener('click', (e) => {
        if (e.target === this.welcomeOverlay) {
          this.handleStart();
        }
      });
    }
    
    // Error overlay - Retry button
    this.addTapHandler(this.retryBtn, () => this.handleRetry());
    
    // Settings overlay click outside to close
    if (this.settingsOverlay) {
      this.addTapHandler(this.settingsOverlay, (e) => {
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
      this.setupToggle(particlesToggle, (checked) => {
        this.emitSettingsChange({ particlesEnabled: checked });
      });
    }
    
    // Theme toggle (Light/Dark mode)
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      // Load saved theme preference
      const savedTheme = localStorage.getItem('resonance-theme');
      if (savedTheme === 'light') {
        themeToggle.checked = true;
        document.body.classList.add('light-theme');
        // Update meta theme color for light mode
        const metaTheme = document.querySelector('meta[name="theme-color"]');
        if (metaTheme) metaTheme.setAttribute('content', '#f5f2ed');
      }
      
      this.setupToggle(themeToggle, (isLight) => {
        document.body.classList.toggle('light-theme', isLight);
        
        // Update meta theme color
        const metaTheme = document.querySelector('meta[name="theme-color"]');
        if (metaTheme) {
          metaTheme.setAttribute('content', isLight ? '#f5f2ed' : '#08080c');
        }
        
        // Save preference
        localStorage.setItem('resonance-theme', isLight ? 'light' : 'dark');
        
        this.emitSettingsChange({ theme: isLight ? 'light' : 'dark' });
      });
    }
    
    // Harmonic Cascade toggle
    const cascadeToggle = document.getElementById('cascade-toggle');
    if (cascadeToggle) {
      this.setupToggle(cascadeToggle, (checked) => {
        this.emitSettingsChange({ cascadeEnabled: checked });
      });
    }
    
    // Cymatics Pattern toggle
    const cymaticsToggle = document.getElementById('cymatics-toggle');
    if (cymaticsToggle) {
      this.setupToggle(cymaticsToggle, (checked) => {
        this.emitSettingsChange({ cymaticsEnabled: checked });
      });
    }
    
    // Cymatics Position buttons
    const cymaticsCenterBtn = document.getElementById('cymatics-center');
    const cymaticsRegionBtn = document.getElementById('cymatics-region');
    
    if (cymaticsCenterBtn) {
      this.addTapHandler(cymaticsCenterBtn, () => {
        cymaticsCenterBtn.classList.add('active');
        cymaticsRegionBtn?.classList.remove('active');
        this.emitSettingsChange({ cymaticsPosition: 'center' });
      });
    }
    
    if (cymaticsRegionBtn) {
      this.addTapHandler(cymaticsRegionBtn, () => {
        cymaticsRegionBtn.classList.add('active');
        cymaticsCenterBtn?.classList.remove('active');
        this.emitSettingsChange({ cymaticsPosition: 'region' });
      });
    }
    
    // Tuner Mode toggle
    const tunerToggle = document.getElementById('tunerToggle');
    if (tunerToggle) {
      this.setupToggle(tunerToggle, (checked) => {
        this.emitSettingsChange({ tunerEnabled: checked });
      });
    }
    
    // Frequency Reference toggle
    const freqRefToggle = document.getElementById('freqRefToggle');
    if (freqRefToggle) {
      this.setupToggle(freqRefToggle, (checked) => {
        this.emitSettingsChange({ freqRefEnabled: checked });
      });
    }
    
    // Color Theme selector
    const colorThemeSelector = document.getElementById('colorThemeSelector');
    if (colorThemeSelector) {
      const themeButtons = colorThemeSelector.querySelectorAll('button');
      themeButtons.forEach(btn => {
        this.addTapHandler(btn, () => {
          themeButtons.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.emitSettingsChange({ colorTheme: btn.dataset.theme });
        });
      });
    }
    
    // Visualization Intensity Preset selector
    const vizPresetSelector = document.getElementById('vizPresetSelector');
    if (vizPresetSelector) {
      const presetButtons = vizPresetSelector.querySelectorAll('button');
      presetButtons.forEach(btn => {
        this.addTapHandler(btn, () => {
          presetButtons.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.emitSettingsChange({ vizPreset: btn.dataset.preset });
        });
      });
    }
  }
  
  /**
   * Setup toggle with iOS-compatible touch handling
   */
  setupToggle(toggleElement, callback) {
    let touchHandled = false;
    
    // Handle touch events for iOS
    toggleElement.addEventListener('touchstart', (e) => {
      touchHandled = false;
    }, { passive: true });
    
    toggleElement.addEventListener('touchend', (e) => {
      e.preventDefault();
      touchHandled = true;
      // Toggle the checkbox
      toggleElement.checked = !toggleElement.checked;
      callback(toggleElement.checked);
    }, { passive: false });
    
    // Handle regular change event (for desktop)
    toggleElement.addEventListener('change', (e) => {
      if (!touchHandled) {
        callback(e.target.checked);
      }
      touchHandled = false;
    });
  }
  
  /**
   * Setup fullscreen button and listeners
   */
  setupFullscreen() {
    if (!this.fullscreenBtn) return;
    
    // Detect iPhone (not iPad) — iPhone Safari lacks Fullscreen API
    this.isIPhone = /iPhone|iPod/.test(navigator.userAgent);
    
    // Detect if running as installed PWA (standalone mode)
    this.isStandalone = window.navigator.standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches;
    
    // Add tap handler for fullscreen button
    this.addTapHandler(this.fullscreenBtn, () => this.toggleFullscreen());
    
    // Listen for fullscreen change events (including Escape key)
    document.addEventListener('fullscreenchange', () => this.onFullscreenChange());
    document.addEventListener('webkitfullscreenchange', () => this.onFullscreenChange());
    document.addEventListener('mozfullscreenchange', () => this.onFullscreenChange());
    document.addEventListener('MSFullscreenChange', () => this.onFullscreenChange());
  }
  
  /**
   * Toggle fullscreen mode
   */
  async toggleFullscreen() {
    const doc = document;
    const elem = document.documentElement;
    
    // Check if native Fullscreen API is available
    const hasNativeFullscreen = !!(
      elem.requestFullscreen ||
      elem.webkitRequestFullscreen ||
      elem.mozRequestFullScreen ||
      elem.msRequestFullscreen
    );
    
    if (!this.isFullscreen) {
      // Enter fullscreen
      if (hasNativeFullscreen) {
        try {
          if (elem.requestFullscreen) {
            await elem.requestFullscreen();
          } else if (elem.webkitRequestFullscreen) {
            await elem.webkitRequestFullscreen();
          } else if (elem.mozRequestFullScreen) {
            await elem.mozRequestFullScreen();
          } else if (elem.msRequestFullscreen) {
            await elem.msRequestFullscreen();
          }
        } catch (err) {
          console.warn('Fullscreen request failed:', err);
          this.enterIPhoneFullscreen();
        }
      } else {
        // iPhone Safari or other browser without Fullscreen API
        this.enterIPhoneFullscreen();
      }
    } else {
      // Exit fullscreen
      if (hasNativeFullscreen && (doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement)) {
        try {
          if (doc.exitFullscreen) {
            await doc.exitFullscreen();
          } else if (doc.webkitExitFullscreen) {
            await doc.webkitExitFullscreen();
          } else if (doc.mozCancelFullScreen) {
            await doc.mozCancelFullScreen();
          } else if (doc.msExitFullscreen) {
            await doc.msExitFullscreen();
          }
        } catch (err) {
          console.warn('Exit fullscreen failed:', err);
          this.exitIPhoneFullscreen();
        }
      } else {
        this.exitIPhoneFullscreen();
      }
    }
  }
  
  /**
   * Enter simulated fullscreen for iPhone Safari
   * Hides address bar via scroll and applies CSS-based fullscreen
   */
  enterIPhoneFullscreen() {
    // Apply CSS fullscreen class
    this.setFullscreenUI(true);
    
    // Add iPhone-specific fullscreen class for extra CSS handling
    document.documentElement.classList.add('iphone-fullscreen');
    
    // Scroll to hide the Safari address bar
    window.scrollTo(0, 1);
    
    // Show a helpful toast if not running as PWA
    if (this.isIPhone && !this.isStandalone) {
      this.showFullscreenToast();
    }
  }
  
  /**
   * Exit simulated fullscreen for iPhone Safari
   */
  exitIPhoneFullscreen() {
    this.setFullscreenUI(false);
    document.documentElement.classList.remove('iphone-fullscreen');
    window.scrollTo(0, 0);
  }
  
  /**
   * Show a brief toast suggesting Add to Home Screen for true fullscreen
   */
  showFullscreenToast() {
    // Don't show if already dismissed this session
    if (this._fullscreenToastShown) return;
    this._fullscreenToastShown = true;
    
    const toast = document.createElement('div');
    toast.className = 'fullscreen-toast';
    toast.innerHTML = `
      <span>For true fullscreen, tap <strong>Share</strong> → <strong>Add to Home Screen</strong></span>
    `;
    document.body.appendChild(toast);
    
    // Trigger entrance animation
    requestAnimationFrame(() => toast.classList.add('visible'));
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 400);
    }, 5000);
  }
  
  /**
   * Handle fullscreen change events
   */
  onFullscreenChange() {
    const isNowFullscreen = !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    );
    
    this.setFullscreenUI(isNowFullscreen);
  }
  
  /**
   * Update UI for fullscreen state
   */
  setFullscreenUI(isFullscreen) {
    this.isFullscreen = isFullscreen;
    
    if (this.appContainer) {
      if (isFullscreen) {
        this.appContainer.classList.add('fullscreen-active');
      } else {
        this.appContainer.classList.remove('fullscreen-active');
      }
    }
    
    console.log('Fullscreen:', isFullscreen ? 'ON' : 'OFF');
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
    console.log('Controls: handleStart called');
    this.setState(this.states.REQUESTING_MIC);
    
    // Update button text to show we're working
    if (this.allowMicBtn) {
      const btnText = this.allowMicBtn.querySelector('.btn-text');
      if (btnText) {
        btnText.textContent = 'Requesting...';
      }
    }
    
    if (this.onStart) {
      console.log('Controls: calling onStart callback');
      this.onStart();
    } else {
      console.warn('Controls: no onStart callback set');
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
    console.log('Controls: microphone granted');
    this.setState(this.states.LISTENING);
    this.hideWelcome();
  }
  
  /**
   * Called when microphone access is denied or error occurs
   */
  onMicrophoneError(error) {
    console.error('Controls: microphone error', error);
    this.setState(this.states.ERROR);
    
    // Reset the welcome button text
    if (this.allowMicBtn) {
      const btnText = this.allowMicBtn.querySelector('.btn-text');
      if (btnText) {
        btnText.textContent = 'Allow Microphone';
      }
    }
    
    // Show user-friendly error
    let message = error?.message || 'Microphone access denied';
    
    // Add iOS-specific help
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (isIOS && message.includes('denied')) {
      message += '\n\nOn iOS: Settings → Safari → Microphone → Allow';
    }
    
    this.showError(message);
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
        // Replace newlines with <br> for proper display
        msgElement.innerHTML = message.replace(/\n/g, '<br>');
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
    
    // Harmonic Cascade
    const cascadeToggle = document.getElementById('cascade-toggle');
    if (cascadeToggle && settings.cascadeEnabled !== undefined) {
      cascadeToggle.checked = settings.cascadeEnabled;
    }
    
    // Cymatics Pattern
    const cymaticsToggle = document.getElementById('cymatics-toggle');
    if (cymaticsToggle && settings.cymaticsEnabled !== undefined) {
      cymaticsToggle.checked = settings.cymaticsEnabled;
    }
    
    // Cymatics Position
    if (settings.cymaticsPosition !== undefined) {
      const centerBtn = document.getElementById('cymatics-center');
      const regionBtn = document.getElementById('cymatics-region');
      if (centerBtn && regionBtn) {
        centerBtn.classList.toggle('active', settings.cymaticsPosition === 'center');
        regionBtn.classList.toggle('active', settings.cymaticsPosition === 'region');
      }
    }
    
    // Tuner Mode
    const tunerToggle = document.getElementById('tunerToggle');
    if (tunerToggle && settings.tunerEnabled !== undefined) {
      tunerToggle.checked = settings.tunerEnabled;
    }
    
    // Frequency Reference
    const freqRefToggle = document.getElementById('freqRefToggle');
    if (freqRefToggle && settings.freqRefEnabled !== undefined) {
      freqRefToggle.checked = settings.freqRefEnabled;
    }
    
    // Color Theme
    if (settings.colorTheme !== undefined) {
      const colorThemeSelector = document.getElementById('colorThemeSelector');
      if (colorThemeSelector) {
        colorThemeSelector.querySelectorAll('button').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.theme === settings.colorTheme);
        });
      }
    }
    
    // Visualization Preset
    if (settings.vizPreset !== undefined) {
      const vizPresetSelector = document.getElementById('vizPresetSelector');
      if (vizPresetSelector) {
        vizPresetSelector.querySelectorAll('button').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.preset === settings.vizPreset);
        });
      }
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
