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
    this.recordBtn = document.getElementById('recordBtn');
    this.appContainer = document.getElementById('app');
    
    // Fullscreen state
    this.isFullscreen = false;
    
    // Callbacks
    this.onStart = null;
    this.onStop = null;
    this.onRecord = null;
    this.onSettingsChange = null;
    
    // Track all event listeners for cleanup (#6, #7)
    this._listeners = [];
    
    // Bind event handlers
    this.bindEvents();
    
    // Setup fullscreen
    this.setupFullscreen();
  }
  
  /**
   * Add a reliable tap/click handler.
   * Modern iOS Safari (13+) has no 300ms delay when touch-action: manipulation
   * is set (which we have on html,body). So a plain click listener is reliable.
   * We only add visual feedback via touchstart/touchend.
   */
  /**
   * Track a listener so it can be removed on destroy (#6)
   */
  _track(element, event, handler, options) {
    element.addEventListener(event, handler, options);
    this._listeners.push({ element, event, handler, options });
  }
  
  addTapHandler(element, handler) {
    if (!element) return;

    // Visual feedback on touch
    const onTouchStart = () => element.classList.add('btn-pressed');
    const onTouchEnd = () => element.classList.remove('btn-pressed');
    const onTouchCancel = () => element.classList.remove('btn-pressed');
    const onClick = (e) => handler(e);
    
    this._track(element, 'touchstart', onTouchStart, { passive: true });
    this._track(element, 'touchend', onTouchEnd, { passive: true });
    this._track(element, 'touchcancel', onTouchCancel, { passive: true });
    this._track(element, 'click', onClick);
  }
  
  /**
   * Bind DOM event handlers
   */
  bindEvents() {
    // Main button
    this.addTapHandler(this.mainBtn, () => this.handleMainClick());
    
    // Settings button
    this.addTapHandler(this.settingsBtn, () => this.showSettings());
    
    // Record button
    this.addTapHandler(this.recordBtn, () => {
      if (this.onRecord) this.onRecord();
    });
    
    // Close settings
    this.addTapHandler(this.closeSettingsBtn, () => this.hideSettings());
    
    // Welcome overlay - Allow Mic button
    this.addTapHandler(this.allowMicBtn, () => this.handleStart());
    
    // Welcome overlay - dismiss on background tap
    if (this.welcomeOverlay) {
      this._track(this.welcomeOverlay, 'click', (e) => {
        if (e.target === this.welcomeOverlay) {
          this.handleStart();
        }
      });
    }
    
    // Error overlay - Retry button
    this.addTapHandler(this.retryBtn, () => this.handleRetry());
    
    // Settings overlay click outside to close
    if (this.settingsOverlay) {
      this._track(this.settingsOverlay, 'click', (e) => {
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
      this._track(gainSlider, 'input', (e) => {
        const value = parseFloat(e.target.value);
        gainValue.textContent = value.toFixed(1) + 'x';
        this.emitSettingsChange({ gain: value });
      });
    }
    
    // Noise threshold slider
    const noiseSlider = document.getElementById('noiseSlider');
    const noiseValue = document.getElementById('noiseValue');
    if (noiseSlider && noiseValue) {
      this._track(noiseSlider, 'input', (e) => {
        const value = parseInt(e.target.value);
        noiseValue.textContent = value + ' dB';
        this.emitSettingsChange({ noiseFloor: value });
      });
    }
    
    // Glow intensity slider
    const glowSlider = document.getElementById('glowSlider');
    const glowValue = document.getElementById('glowValue');
    if (glowSlider && glowValue) {
      this._track(glowSlider, 'input', (e) => {
        const value = parseFloat(e.target.value);
        glowValue.textContent = value.toFixed(1) + 'x';
        this.emitSettingsChange({ glowIntensity: value });
      });
    }
    
    // --- Toggles: just use the native change event ---
    this.bindToggle('particlesToggle', (checked) => {
      this.emitSettingsChange({ particlesEnabled: checked });
    });
    
    // Theme toggle (Light/Dark mode)
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      const savedTheme = localStorage.getItem('resonance-theme');
      if (savedTheme === 'light') {
        themeToggle.checked = true;
        document.body.classList.add('light-theme');
        const metaTheme = document.querySelector('meta[name="theme-color"]');
        if (metaTheme) metaTheme.setAttribute('content', '#f5f2ed');
      }
      
      this.bindToggle('themeToggle', (isLight) => {
        document.body.classList.toggle('light-theme', isLight);
        const metaTheme = document.querySelector('meta[name="theme-color"]');
        if (metaTheme) {
          metaTheme.setAttribute('content', isLight ? '#f5f2ed' : '#08080c');
        }
        localStorage.setItem('resonance-theme', isLight ? 'light' : 'dark');
        this.emitSettingsChange({ theme: isLight ? 'light' : 'dark' });
      });
    }
    
    this.bindToggle('cascade-toggle', (checked) => {
      this.emitSettingsChange({ cascadeEnabled: checked });
    });
    
    this.bindToggle('cymatics-toggle', (checked) => {
      this.emitSettingsChange({ cymaticsEnabled: checked });
    });
    
    this.bindToggle('tunerToggle', (checked) => {
      this.emitSettingsChange({ tunerEnabled: checked });
    });
    
    this.bindToggle('freqRefToggle', (checked) => {
      this.emitSettingsChange({ freqRefEnabled: checked });
    });
    
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
   * Bind a checkbox toggle using only the native change event.
   * No touch hacks needed — the browser handles checkbox toggling natively.
   */
  bindToggle(elementId, callback) {
    const el = document.getElementById(elementId);
    if (!el) return;
    this._track(el, 'change', () => {
      callback(el.checked);
    });
  }
  
  /**
   * Setup fullscreen button and listeners
   */
  setupFullscreen() {
    if (!this.fullscreenBtn) return;
    
    this.isIPhone = /iPhone|iPod/.test(navigator.userAgent);
    this.isStandalone = window.navigator.standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches;
    
    this.addTapHandler(this.fullscreenBtn, () => this.toggleFullscreen());
    
    // Track document-level listeners for cleanup (#7)
    this._track(document, 'fullscreenchange', () => this.onFullscreenChange());
    this._track(document, 'webkitfullscreenchange', () => this.onFullscreenChange());
  }
  
  async toggleFullscreen() {
    const elem = document.documentElement;
    
    const hasNativeFullscreen = !!(
      elem.requestFullscreen || elem.webkitRequestFullscreen
    );
    
    if (!this.isFullscreen) {
      if (hasNativeFullscreen) {
        try {
          if (elem.requestFullscreen) {
            await elem.requestFullscreen();
          } else if (elem.webkitRequestFullscreen) {
            await elem.webkitRequestFullscreen();
          }
        } catch (err) {
          console.warn('Fullscreen request failed:', err);
          this.enterIPhoneFullscreen();
        }
      } else {
        this.enterIPhoneFullscreen();
      }
    } else {
      const doc = document;
      if (hasNativeFullscreen && (doc.fullscreenElement || doc.webkitFullscreenElement)) {
        try {
          if (doc.exitFullscreen) {
            await doc.exitFullscreen();
          } else if (doc.webkitExitFullscreen) {
            await doc.webkitExitFullscreen();
          }
        } catch (err) {
          this.exitIPhoneFullscreen();
        }
      } else {
        this.exitIPhoneFullscreen();
      }
    }
  }
  
  enterIPhoneFullscreen() {
    this.setFullscreenUI(true);
    document.documentElement.classList.add('iphone-fullscreen');
    window.scrollTo(0, 1);
    if (this.isIPhone && !this.isStandalone) {
      this.showFullscreenToast();
    }
  }
  
  exitIPhoneFullscreen() {
    this.setFullscreenUI(false);
    document.documentElement.classList.remove('iphone-fullscreen');
    window.scrollTo(0, 0);
  }
  
  showFullscreenToast() {
    if (this._fullscreenToastShown) return;
    this._fullscreenToastShown = true;
    
    const toast = document.createElement('div');
    toast.className = 'fullscreen-toast';
    toast.innerHTML = `<span>For true fullscreen, tap <strong>Share</strong> → <strong>Add to Home Screen</strong></span>`;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('visible'));
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 400);
    }, 5000);
  }
  
  onFullscreenChange() {
    const isNowFullscreen = !!(
      document.fullscreenElement || document.webkitFullscreenElement
    );
    this.setFullscreenUI(isNowFullscreen);
  }
  
  setFullscreenUI(isFullscreen) {
    this.isFullscreen = isFullscreen;
    if (this.appContainer) {
      this.appContainer.classList.toggle('fullscreen-active', isFullscreen);
    }
  }
  
  handleMainClick() {
    if (this.currentState === this.states.LISTENING) {
      this.handleStop();
    } else if (this.currentState === this.states.IDLE) {
      this.handleStart();
    }
  }
  
  handleStart() {
    console.log('Controls: handleStart called');
    this.setState(this.states.REQUESTING_MIC);
    
    if (this.allowMicBtn) {
      const btnText = this.allowMicBtn.querySelector('.btn-text');
      if (btnText) btnText.textContent = 'Requesting...';
    }
    
    if (this.onStart) {
      this.onStart();
    }
  }
  
  handleStop() {
    this.setState(this.states.IDLE);
    // Hide record button when not listening
    this.recordBtn?.classList.add('hidden');
    this.setRecordingState(false);
    if (this.onStop) this.onStop();
  }
  
  handleRetry() {
    this.hideError();
    this.handleStart();
  }
  
  setState(state) {
    this.currentState = state;
    this.updateUI();
  }
  
  updateUI() {
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
    
    if (this.statusIndicator) {
      this.statusIndicator.classList.remove('listening', 'error');
      if (this.currentState === this.states.LISTENING) {
        this.statusIndicator.classList.add('listening');
      } else if (this.currentState === this.states.ERROR) {
        this.statusIndicator.classList.add('error');
      }
    }
  }
  
  onMicrophoneGranted() {
    this.setState(this.states.LISTENING);
    this.hideWelcome();
    // Show record button when listening
    this.recordBtn?.classList.remove('hidden');
  }
  
  /**
   * Set the recording button state (active/inactive)
   */
  setRecordingState(isRecording) {
    if (this.recordBtn) {
      this.recordBtn.classList.toggle('recording', isRecording);
      this.recordBtn.setAttribute('aria-label', isRecording ? 'Stop recording' : 'Record session');
    }
  }
  
  onMicrophoneError(error) {
    console.error('Controls: microphone error', error);
    this.setState(this.states.ERROR);
    
    if (this.allowMicBtn) {
      const btnText = this.allowMicBtn.querySelector('.btn-text');
      if (btnText) btnText.textContent = 'Allow Microphone';
    }
    
    let message = error?.message || 'Microphone access denied';
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (isIOS && message.includes('denied')) {
      message += '\n\nOn iOS: Settings → Safari → Microphone → Allow';
    }
    this.showError(message);
  }
  
  showWelcome() {
    this.welcomeOverlay?.classList.remove('hidden');
  }
  
  hideWelcome() {
    this.welcomeOverlay?.classList.add('hidden');
  }
  
  showSettings() {
    this.settingsOverlay?.classList.remove('hidden');
  }
  
  hideSettings() {
    this.settingsOverlay?.classList.add('hidden');
  }
  
  showError(message) {
    if (this.errorOverlay) {
      const msgElement = document.getElementById('errorMessage');
      if (msgElement) msgElement.innerHTML = message.replace(/\n/g, '<br>');
      this.errorOverlay.classList.remove('hidden');
    }
  }
  
  hideError() {
    this.errorOverlay?.classList.add('hidden');
  }
  
  emitSettingsChange(changes) {
    if (this.onSettingsChange) this.onSettingsChange(changes);
  }
  
  updateSettingsUI(settings) {
    const setSlider = (sliderId, valueId, val, fmt) => {
      const s = document.getElementById(sliderId);
      const v = document.getElementById(valueId);
      if (s && val !== undefined) { s.value = val; if (v) v.textContent = fmt(val); }
    };
    
    setSlider('gainSlider', 'gainValue', settings.gain, v => v.toFixed(1) + 'x');
    setSlider('noiseSlider', 'noiseValue', settings.noiseFloor, v => v + ' dB');
    setSlider('glowSlider', 'glowValue', settings.glowIntensity, v => v.toFixed(1) + 'x');
    
    const setToggle = (id, val) => {
      const el = document.getElementById(id);
      if (el && val !== undefined) el.checked = val;
    };
    
    setToggle('particlesToggle', settings.particlesEnabled);
    setToggle('cascade-toggle', settings.cascadeEnabled);
    setToggle('cymatics-toggle', settings.cymaticsEnabled);
    setToggle('tunerToggle', settings.tunerEnabled);
    setToggle('freqRefToggle', settings.freqRefEnabled);
    
    if (settings.cymaticsPosition !== undefined) {
      const c = document.getElementById('cymatics-center');
      const r = document.getElementById('cymatics-region');
      if (c && r) {
        c.classList.toggle('active', settings.cymaticsPosition === 'center');
        r.classList.toggle('active', settings.cymaticsPosition === 'region');
      }
    }
    
    if (settings.colorTheme !== undefined) {
      document.getElementById('colorThemeSelector')?.querySelectorAll('button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === settings.colorTheme);
      });
    }
    
    if (settings.vizPreset !== undefined) {
      document.getElementById('vizPresetSelector')?.querySelectorAll('button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.preset === settings.vizPreset);
      });
    }
  }
  
  isListening() {
    return this.currentState === this.states.LISTENING;
  }
  
  destroy() {
    // Remove all tracked event listeners (#6, #7)
    for (const { element, event, handler, options } of this._listeners) {
      element.removeEventListener(event, handler, options);
    }
    this._listeners = [];
    
    this.onStart = null;
    this.onStop = null;
    this.onRecord = null;
    this.onSettingsChange = null;
  }
}
