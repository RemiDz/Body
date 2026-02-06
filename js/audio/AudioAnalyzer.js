/**
 * Resonance Body Map - Audio Analyzer
 * Handles Web Audio API setup and FFT analysis
 */

import { AUDIO_CONFIG } from '../config.js';
import { normalizeDb, clamp } from '../utils/math.js';

export class AudioAnalyzer {
  constructor(options = {}) {
    this.config = { ...AUDIO_CONFIG, ...options };
    
    this.audioContext = null;
    this.analyser = null;
    this.source = null;
    this.stream = null;
    this.gainNode = null;
    
    this.frequencyData = null;
    this.timeData = null;
    
    this.isInitialized = false;
    this.isActive = false;
    
    // Callbacks
    this.onError = null;
    this.onStateChange = null;
    
    // Fundamental frequency tracking
    this.lastFundamental = 0;
    this.fundamentalConfidence = 0;
    this.harmonicProfile = [];
  }
  
  /**
   * Check if running on iOS
   */
  static isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }
  
  /**
   * Initialize the audio system and request microphone access
   * IMPORTANT: This MUST be called during a user gesture (click/tap) on iOS
   */
  async init() {
    const isIOS = AudioAnalyzer.isIOS();
    console.log('AudioAnalyzer init started, iOS detected:', isIOS);
    
    try {
      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone access not supported in this browser');
      }
      
      // Create audio context (without sampleRate for better compatibility)
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        throw new Error('Web Audio API not supported in this browser');
      }
      
      // Create AudioContext during user gesture (critical for iOS)
      this.audioContext = new AudioContextClass();
      console.log('AudioContext created, state:', this.audioContext.state);
      
      // iOS Safari REQUIRES explicit resume() during user gesture
      if (this.audioContext.state === 'suspended') {
        console.log('Resuming suspended AudioContext...');
        await this.audioContext.resume();
        console.log('AudioContext resumed, state:', this.audioContext.state);
      }
      
      // Set up state change listener
      this.audioContext.addEventListener('statechange', () => {
        console.log('AudioContext state changed:', this.audioContext.state);
      });
      
      // Request microphone access with iOS-compatible constraints
      // iOS Safari: Simpler constraints work better
      let audioConstraints;
      if (isIOS) {
        // Start with very simple constraints for iOS
        audioConstraints = { audio: true };
      } else {
        audioConstraints = {
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
          }
        };
      }
      
      console.log('Requesting microphone with constraints:', audioConstraints);
      
      try {
        this.stream = await navigator.mediaDevices.getUserMedia(audioConstraints);
      } catch (firstError) {
        // If iOS constraints fail, try absolute minimum
        console.warn('First getUserMedia attempt failed, trying fallback:', firstError);
        this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      
      console.log('Got media stream:', this.stream.active);
      
      // Monitor for stream ending (iOS can kill tracks after prolonged background)
      const audioTrack = this.stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.addEventListener('ended', () => {
          console.warn('Audio track ended unexpectedly (iOS background kill?)');
          this.isActive = false;
          if (this.onError) {
            this.onError(new Error('Microphone was disconnected. Please tap "Begin Listening" to restart.'));
          }
          if (this.onStateChange) {
            this.onStateChange('ended');
          }
        });
      }
      
      // Create source from microphone stream
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      
      // Create gain node for sensitivity adjustment
      this.gainNode = this.audioContext.createGain();
      // iOS Safari: Boost gain by default (iOS has lower input levels)
      this.gainNode.gain.value = isIOS ? 3.0 : 1.0;
      
      // Create analyzer node with iOS-friendly settings
      this.analyser = this.audioContext.createAnalyser();
      // iOS: Use 4096 for ~10.8Hz bins (better low-freq resolution than 2048)
      this.analyser.fftSize = isIOS ? 4096 : this.config.fftSize;
      this.analyser.smoothingTimeConstant = this.config.smoothingTimeConstant;
      this.analyser.minDecibels = this.config.minDecibels;
      this.analyser.maxDecibels = this.config.maxDecibels;
      
      // Connect the audio graph
      this.source.connect(this.gainNode);
      this.gainNode.connect(this.analyser);
      
      // Create data arrays
      this.frequencyData = new Float32Array(this.analyser.frequencyBinCount);
      this.timeData = new Float32Array(this.analyser.fftSize);
      
      this.isInitialized = true;
      this.isActive = true;
      
      console.log('AudioAnalyzer initialized successfully');
      
      if (this.onStateChange) {
        this.onStateChange('listening');
      }
      
      return true;
      
    } catch (error) {
      console.error('AudioAnalyzer init error:', error.name, error.message);
      
      // Create user-friendly error message
      let userError = error;
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        userError = new Error('Microphone permission denied. Please allow microphone access in Settings > Safari > Microphone and try again.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        userError = new Error('No microphone found. Please connect a microphone and try again.');
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        userError = new Error('Microphone is in use by another application. Please close other apps and try again.');
      } else if (error.name === 'OverconstrainedError') {
        userError = new Error('Microphone does not support requested settings. Trying default settings...');
      } else if (error.name === 'SecurityError') {
        userError = new Error('Microphone access blocked. Please use HTTPS or localhost.');
      } else if (error.name === 'AbortError') {
        userError = new Error('Microphone request was aborted. Please try again.');
      }
      
      if (this.onError) {
        this.onError(userError);
      }
      
      return false;
    }
  }
  
  /**
   * Resume audio context (required after user gesture on iOS)
   */
  async resume() {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    this.isActive = true;
  }
  
  /**
   * Suspend audio analysis
   */
  suspend() {
    if (this.audioContext) {
      this.audioContext.suspend();
    }
    this.isActive = false;
  }
  
  /**
   * Set gain/sensitivity
   */
  setGain(value) {
    if (this.gainNode) {
      this.gainNode.gain.value = clamp(value, this.config.gainRange?.[0] || 0.1, this.config.gainRange?.[1] || 3.0);
    }
  }
  
  /**
   * Set noise floor threshold
   */
  setNoiseFloor(value) {
    this.config.noiseFloor = value;
  }
  
  /**
   * Analyze current audio and return frequency data
   */
  analyze() {
    if (!this.isInitialized || !this.isActive) {
      return null;
    }
    
    // Get frequency data
    this.analyser.getFloatFrequencyData(this.frequencyData);
    
    // Calculate bin size for frequency mapping
    const sampleRate = this.audioContext.sampleRate;
    const binSize = sampleRate / this.analyser.fftSize;
    
    // Find peaks
    const peaks = this.findPeaks(binSize);
    
    // Calculate RMS level for overall activity detection
    this.analyser.getFloatTimeDomainData(this.timeData);
    const rmsLevel = this.calculateRMS();
    
    // Determine dominant frequency using improved fundamental estimation
    // This reduces octave/harmonic jumps by preferring the base tone
    const dominant = peaks.length > 0 ? peaks[0] : null;
    const dominantFrequency = this.estimateFundamental(peaks);
    
    // Check if audio is active (above noise floor)
    const isActive = dominant !== null && dominant.db > this.config.noiseFloor;
    
    return {
      peaks,
      dominantFrequency,
      dominantAmplitude: dominant ? dominant.amplitude : 0,
      dominantDb: dominant ? dominant.db : this.config.minDecibels,
      fundamentalConfidence: this.fundamentalConfidence,
      harmonicProfile: this.harmonicProfile,
      rmsLevel,
      isActive,
      binSize,
      sampleRate
    };
  }
  
  /**
   * Improved fundamental frequency estimation using:
   * 1. Harmonic Product Spectrum (HPS)
   * 2. Peak-based harmonic analysis
   * 3. Temporal smoothing
   */
  estimateFundamental(peaks) {
    if (!peaks || peaks.length === 0) return 0;
    
    const binSize = this.audioContext.sampleRate / this.analyser.fftSize;
    
    // Method 1: Harmonic Product Spectrum
    const hpsResult = this.harmonicProductSpectrum(peaks, binSize);
    
    // Method 2: Peak-based harmonic analysis
    const peakResult = this.estimateFundamentalFromPeaks(peaks);
    
    // Combine results
    let bestFreq = 0;
    let bestConfidence = 0;
    
    if (hpsResult.confidence > peakResult.confidence * 1.2) {
      bestFreq = hpsResult.frequency;
      bestConfidence = hpsResult.confidence;
    } else if (peakResult.confidence > hpsResult.confidence * 1.2) {
      bestFreq = peakResult.frequency;
      bestConfidence = peakResult.confidence;
    } else {
      // Use the lower frequency (more likely fundamental)
      if (hpsResult.frequency > 0 && peakResult.frequency > 0) {
        const lower = Math.min(hpsResult.frequency, peakResult.frequency);
        const higher = Math.max(hpsResult.frequency, peakResult.frequency);
        const ratio = higher / lower;
        
        if (Math.abs(ratio - Math.round(ratio)) < 0.1) {
          bestFreq = lower;
          bestConfidence = Math.max(hpsResult.confidence, peakResult.confidence);
        } else {
          bestFreq = hpsResult.confidence > peakResult.confidence ? hpsResult.frequency : peakResult.frequency;
          bestConfidence = Math.max(hpsResult.confidence, peakResult.confidence);
        }
      } else {
        bestFreq = hpsResult.frequency || peakResult.frequency;
        bestConfidence = Math.max(hpsResult.confidence, peakResult.confidence);
      }
    }
    
    // Build harmonic profile
    if (bestFreq > 0) {
      this.harmonicProfile = this.buildHarmonicProfile(bestFreq, peaks);
    }
    
    // Apply temporal smoothing
    this.updateFundamentalTracking(bestFreq, bestConfidence);
    
    return this.lastFundamental;
  }

  /**
   * Harmonic Product Spectrum analysis
   */
  harmonicProductSpectrum(peaks, binSize) {
    if (peaks.length === 0) return { frequency: 0, confidence: 0 };
    
    const maxBin = Math.ceil(this.config.maxFrequency / binSize);
    const spectrum = new Float32Array(maxBin).fill(0);
    
    for (const peak of peaks) {
      const bin = Math.round(peak.frequency / binSize);
      if (bin < maxBin) {
        spectrum[bin] = peak.amplitude;
      }
    }
    
    const numHarmonics = 5;
    const hps = new Float32Array(Math.floor(maxBin / numHarmonics)).fill(1);
    
    for (let h = 1; h <= numHarmonics; h++) {
      for (let i = 0; i < hps.length; i++) {
        const bin = i * h;
        if (bin < spectrum.length) {
          hps[i] *= (spectrum[bin] + 0.01);
        }
      }
    }
    
    let maxVal = 0;
    let maxBinIdx = 0;
    const minBin = Math.ceil(this.config.minFrequency / binSize);
    
    for (let i = minBin; i < hps.length; i++) {
      if (hps[i] > maxVal) {
        maxVal = hps[i];
        maxBinIdx = i;
      }
    }
    
    const frequency = maxBinIdx * binSize;
    const avgHPS = hps.reduce((a, b) => a + b, 0) / hps.length;
    const confidence = avgHPS > 0 ? Math.min(1, (maxVal / avgHPS - 1) / 5) : 0;
    
    return { frequency, confidence };
  }

  /**
   * Estimate fundamental from peaks using harmonic relationships
   */
  estimateFundamentalFromPeaks(peaks) {
    if (!peaks || peaks.length === 0) return { frequency: 0, confidence: 0 };
    
    const candidates = [];
    const numPeaks = Math.min(peaks.length, 6);
    
    for (let i = 0; i < numPeaks; i++) {
      const f = peaks[i].frequency;
      candidates.push(f);
      if (f / 2 >= this.config.minFrequency) candidates.push(f / 2);
      if (f / 3 >= this.config.minFrequency) candidates.push(f / 3);
      if (f / 4 >= this.config.minFrequency) candidates.push(f / 4);
    }
    
    const tolerance = this.config.harmonicTolerance || 0.03;
    let bestF = 0;
    let bestScore = -1;
    
    for (const f0 of candidates) {
      if (f0 < this.config.minFrequency || f0 > this.config.maxFrequency) continue;
      
      let score = 0;
      let harmonicsFound = 0;
      
      for (const peak of peaks) {
        const ratio = peak.frequency / f0;
        const k = Math.round(ratio);
        if (k < 1 || k > 12) continue;
        
        const err = Math.abs(ratio - k) / k;
        if (err < tolerance) {
          score += peak.amplitude * (1 / Math.sqrt(k));
          harmonicsFound++;
        }
      }
      
      if (harmonicsFound >= 2) {
        score *= (1 + harmonicsFound * 0.1);
      }
      
      score *= (1 + (this.config.fundamentalBias || 1.3) * (1 - f0 / this.config.maxFrequency));
      
      if (score > bestScore) {
        bestScore = score;
        bestF = f0;
      }
    }
    
    const confidence = peaks.length > 0 ? Math.min(1, bestScore / (peaks.length * 0.5)) : 0;
    
    return { frequency: bestF, confidence };
  }

  /**
   * Build harmonic profile
   */
  buildHarmonicProfile(fundamental, peaks) {
    const profile = [];
    const tolerance = 0.04;
    
    for (let h = 1; h <= 12; h++) {
      const targetFreq = fundamental * h;
      let found = null;
      
      for (const peak of peaks) {
        const ratio = peak.frequency / targetFreq;
        if (Math.abs(ratio - 1) < tolerance) {
          found = peak;
          break;
        }
      }
      
      profile.push({
        harmonic: h,
        frequency: targetFreq,
        present: found !== null,
        amplitude: found ? found.amplitude : 0
      });
    }
    
    return profile;
  }

  /**
   * Track fundamental frequency over time for stability
   */
  updateFundamentalTracking(newFundamental, confidence) {
    if (newFundamental === 0 || confidence < 0.2) {
      this.fundamentalConfidence *= 0.9;
      if (this.fundamentalConfidence < 0.1) {
        this.lastFundamental = 0;
      }
      return;
    }
    
    if (this.lastFundamental > 0) {
      const ratio = newFundamental / this.lastFundamental;
      const nearestHarmonic = Math.round(ratio);
      const harmonicError = Math.abs(ratio - nearestHarmonic);
      
      if (harmonicError < 0.05 && nearestHarmonic >= 2) {
        if (confidence < this.fundamentalConfidence * 1.5) {
          return;
        }
      }
    }
    
    const smoothingFactor = 0.3 + confidence * 0.4;
    
    if (this.lastFundamental === 0) {
      this.lastFundamental = newFundamental;
    } else {
      this.lastFundamental = this.lastFundamental * (1 - smoothingFactor) + newFundamental * smoothingFactor;
    }
    
    this.fundamentalConfidence = this.fundamentalConfidence * 0.7 + confidence * 0.3;
  }
  
  /**
   * Find frequency peaks in the spectrum
   */
  findPeaks(binSize) {
    const peaks = [];
    const minBin = Math.floor(this.config.minFrequency / binSize);
    const maxBin = Math.min(
      Math.ceil(this.config.maxFrequency / binSize),
      this.frequencyData.length - 2
    );
    
    for (let i = minBin + 2; i < maxBin - 2; i++) {
      const amplitude = this.frequencyData[i];
      
      // Skip if below noise floor
      if (amplitude < this.config.noiseFloor) continue;
      
      // Check if local maximum (compare with neighbors)
      const isLocalMax = (
        amplitude > this.frequencyData[i - 1] &&
        amplitude > this.frequencyData[i + 1] &&
        amplitude > this.frequencyData[i - 2] &&
        amplitude > this.frequencyData[i + 2]
      );
      
      if (isLocalMax) {
        // Quadratic interpolation for more accurate peak frequency
        const alpha = this.frequencyData[i - 1];
        const beta = amplitude;
        const gamma = this.frequencyData[i + 1];
        const p = 0.5 * (alpha - gamma) / (alpha - 2 * beta + gamma);
        
        const interpolatedBin = i + p;
        const interpolatedFrequency = interpolatedBin * binSize;
        
        // Normalize amplitude to 0-1 range
        const normalizedAmplitude = normalizeDb(
          amplitude,
          this.config.noiseFloor,
          this.config.maxDecibels
        );
        
        peaks.push({
          frequency: interpolatedFrequency,
          amplitude: normalizedAmplitude,
          db: amplitude,
          bin: i
        });
      }
    }
    
    // Sort by amplitude (strongest first)
    peaks.sort((a, b) => b.amplitude - a.amplitude);
    
    // Return top peaks (12 for better harmonic analysis)
    return peaks.slice(0, 12);
  }
  
  /**
   * Calculate RMS (root mean square) of time domain data
   */
  calculateRMS() {
    let sum = 0;
    for (let i = 0; i < this.timeData.length; i++) {
      sum += this.timeData[i] * this.timeData[i];
    }
    return Math.sqrt(sum / this.timeData.length);
  }
  
  /**
   * Get raw frequency data for specific frequency range
   */
  getFrequencyRange(minFreq, maxFreq) {
    if (!this.isInitialized) return [];
    
    const binSize = this.audioContext.sampleRate / this.analyser.fftSize;
    const minBin = Math.floor(minFreq / binSize);
    const maxBin = Math.ceil(maxFreq / binSize);
    
    const data = [];
    for (let i = minBin; i <= maxBin && i < this.frequencyData.length; i++) {
      data.push({
        frequency: i * binSize,
        amplitude: normalizeDb(
          this.frequencyData[i],
          this.config.noiseFloor,
          this.config.maxDecibels
        ),
        db: this.frequencyData[i]
      });
    }
    
    return data;
  }
  
  /**
   * Clean up resources
   */
  destroy() {
    this.isActive = false;
    
    if (this.source) {
      this.source.disconnect();
    }
    
    if (this.gainNode) {
      this.gainNode.disconnect();
    }
    
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
    }
    
    if (this.audioContext) {
      this.audioContext.close();
    }
    
    this.audioContext = null;
    this.analyser = null;
    this.source = null;
    this.stream = null;
    this.gainNode = null;
    this.frequencyData = null;
    this.timeData = null;
    this.isInitialized = false;
  }
}
