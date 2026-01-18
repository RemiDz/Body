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
  }
  
  /**
   * Initialize the audio system and request microphone access
   */
  async init() {
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
      
      this.audioContext = new AudioContextClass();
      
      // Resume audio context if suspended (required for iOS Safari)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      // Request microphone access with specific constraints for best quality
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
      
      // Create source from microphone stream
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      
      // Create gain node for sensitivity adjustment
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 1.0;
      
      // Create analyzer node
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = this.config.fftSize;
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
      
      if (this.onStateChange) {
        this.onStateChange('listening');
      }
      
      return true;
      
    } catch (error) {
      console.error('AudioAnalyzer init error:', error);
      
      // Create user-friendly error message
      let userError = error;
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        userError = new Error('Microphone permission denied. Please allow microphone access and try again.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        userError = new Error('No microphone found. Please connect a microphone and try again.');
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        userError = new Error('Microphone is in use by another application. Please close other apps and try again.');
      } else if (error.name === 'OverconstrainedError') {
        userError = new Error('Microphone does not support requested settings. Trying default settings...');
      } else if (error.name === 'SecurityError') {
        userError = new Error('Microphone access blocked. Please use HTTPS or localhost.');
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
    const binSize = sampleRate / this.config.fftSize;
    
    // Find peaks
    const peaks = this.findPeaks(binSize);
    
    // Calculate RMS level for overall activity detection
    this.analyser.getFloatTimeDomainData(this.timeData);
    const rmsLevel = this.calculateRMS();
    
    // Determine dominant frequency
    const dominant = peaks.length > 0 ? peaks[0] : null;
    
    // Check if audio is active (above noise floor)
    const isActive = dominant !== null && dominant.db > this.config.noiseFloor;
    
    return {
      peaks,
      dominantFrequency: dominant ? dominant.frequency : 0,
      dominantAmplitude: dominant ? dominant.amplitude : 0,
      dominantDb: dominant ? dominant.db : this.config.minDecibels,
      rmsLevel,
      isActive,
      binSize,
      sampleRate
    };
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
    
    // Return top peaks (limit to avoid processing too many)
    return peaks.slice(0, 10);
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
    
    const binSize = this.audioContext.sampleRate / this.config.fftSize;
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
