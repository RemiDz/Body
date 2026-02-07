/**
 * Resonance Body Map - Frequency Display
 * Shows dominant frequency, musical note, and region label
 */

import { FREQUENCY_REGIONS, VISUAL_CONFIG } from '../config.js';
import { clamp, lerp, MovingAverage } from '../utils/math.js';

// Musical note names (using sharps, not flats)
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Reference: A4 = 440 Hz
const A4_FREQUENCY = 440;
const A4_MIDI = 69; // MIDI note number for A4

export class FrequencyDisplay {
  constructor(options = {}) {
    this.config = { ...VISUAL_CONFIG, ...options };
    this.regions = FREQUENCY_REGIONS;
    
    // DOM elements
    this.container = document.getElementById('frequencyDisplay');
    this.valueElement = document.getElementById('freqValue');
    this.numberElement = this.valueElement?.querySelector('.freq-number');
    this.noteElement = document.getElementById('freqNote');
    this.regionElement = document.getElementById('freqRegion');
    
    // State
    this.currentFrequency = 0;
    this.displayedFrequency = 0;
    this.currentNote = '';
    this.currentColor = 'rgba(255, 255, 255, 0.9)';
    this.currentGlow = 'none';
    this.isVisible = false;
    
    // Smoothing
    this.frequencySmoother = new MovingAverage(3);
    
    // Animation
    this.animationFrame = null;
    this.lastUpdateTime = 0;
  }
  
  /**
   * Convert frequency (Hz) to musical note name
   * Uses A4 = 440 Hz as reference
   * @param {number} frequency - Frequency in Hz
   * @returns {string} Note name (e.g., "A4", "C#3", "F#5")
   */
  frequencyToNote(frequency) {
    if (frequency <= 0) return '';
    
    // Calculate MIDI note number from frequency
    // Formula: n = 12 * log2(f / 440) + 69
    const midiNote = Math.round(12 * Math.log2(frequency / A4_FREQUENCY) + A4_MIDI);
    
    // Clamp to valid range (C1 = 24 to C7 = 96)
    if (midiNote < 24 || midiNote > 96) return '';
    
    // Get note name and octave
    const noteIndex = ((midiNote % 12) + 12) % 12; // Handle negative modulo
    const octave = Math.floor(midiNote / 12) - 1;
    
    return NOTE_NAMES[noteIndex] + octave;
  }
  
  /**
   * Get the expected frequency for a note (for display purposes)
   * @param {string} noteName - Note name (e.g., "A4")
   * @returns {number} Frequency in Hz
   */
  noteToFrequency(noteName) {
    const match = noteName.match(/^([A-G]#?)(\d)$/);
    if (!match) return 0;
    
    const note = match[1];
    const octave = parseInt(match[2]);
    const noteIndex = NOTE_NAMES.indexOf(note);
    
    if (noteIndex === -1) return 0;
    
    const midiNote = (octave + 1) * 12 + noteIndex;
    return A4_FREQUENCY * Math.pow(2, (midiNote - A4_MIDI) / 12);
  }
  
  /**
   * Update display with new frequency data
   * @param {number} frequency - Dominant frequency in Hz
   * @param {number} amplitude - Signal amplitude (0-1)
   * @param {string} color - Color hex for display
   * @param {string} regionLabel - Optional region label
   */
  update(frequency, amplitude, color = null, regionLabel = null) {
    // Smooth frequency for display
    const smoothedFreq = this.frequencySmoother.add(frequency);
    
    // Update target frequency
    this.currentFrequency = smoothedFreq;
    
    // Determine if we should show the display
    const shouldShow = frequency > 0 && amplitude > 0.1;
    
    if (shouldShow !== this.isVisible) {
      this.setVisibility(shouldShow);
    }
    
    if (shouldShow) {
      // Update color
      if (color) {
        this.setColor(color, amplitude);
      } else {
        // Auto-determine color from frequency
        const region = this.getRegionForFrequency(frequency);
        if (region) {
          this.setColor(region.config.glowHex, amplitude);
          regionLabel = regionLabel || region.config.label;
        }
      }
      
      // Update musical note
      this.updateNote(smoothedFreq);
      
      // Update region label
      if (regionLabel && this.regionElement) {
        this.regionElement.textContent = regionLabel;
        this.regionElement.classList.add('visible');
      }
      
      // Animate number transition
      this.animateNumber();
    } else {
      // Hide region label and note
      if (this.regionElement) {
        this.regionElement.classList.remove('visible');
      }
      if (this.noteElement) {
        this.noteElement.classList.remove('visible');
      }
    }
  }
  
  /**
   * Update the musical note display
   * @param {number} frequency - Frequency in Hz
   */
  updateNote(frequency) {
    const note = this.frequencyToNote(frequency);
    
    if (note && note !== this.currentNote) {
      this.currentNote = note;
      
      if (this.noteElement) {
        this.noteElement.textContent = note;
        this.noteElement.classList.add('visible');
      }
    } else if (!note && this.noteElement) {
      this.noteElement.classList.remove('visible');
    }
  }
  
  /**
   * Animate the displayed number towards current frequency
   */
  animateNumber() {
    const target = Math.round(this.currentFrequency);
    const current = this.displayedFrequency;
    
    // Smooth interpolation
    const diff = target - current;
    
    if (Math.abs(diff) < 1) {
      this.displayedFrequency = target;
    } else {
      // Faster interpolation for larger differences
      const speed = Math.min(Math.abs(diff) * 0.2, 50);
      this.displayedFrequency = current + Math.sign(diff) * speed;
    }
    
    // Update DOM
    if (this.numberElement) {
      this.numberElement.textContent = Math.round(this.displayedFrequency);
    }
  }
  
  /**
   * Set visibility with animation
   */
  setVisibility(visible) {
    this.isVisible = visible;
    
    if (this.valueElement) {
      if (visible) {
        this.valueElement.classList.add('visible');
      } else {
        this.valueElement.classList.remove('visible');
        this.frequencySmoother.reset();
      }
    }
  }
  
  /**
   * Set display color and glow
   */
  setColor(color, intensity = 1) {
    this.currentColor = color;
    
    // Calculate glow based on intensity
    const glowSize = Math.round(intensity * 30);
    const glow = `0 0 ${glowSize}px ${color}, 0 0 ${glowSize * 1.5}px ${color}`;
    
    if (this.valueElement) {
      this.valueElement.style.color = color;
      this.valueElement.style.textShadow = glow;
    }
    
    // Apply same color to note element
    if (this.noteElement) {
      this.noteElement.style.color = color;
      this.noteElement.style.textShadow = glow;
    }
  }
  
  /**
   * Get region for a frequency
   */
  getRegionForFrequency(frequency) {
    for (const [regionName, config] of Object.entries(this.regions)) {
      if (frequency >= config.min && frequency < config.max) {
        return { name: regionName, config };
      }
    }
    return null;
  }
  
  /**
   * Set frequency directly (for testing)
   */
  setFrequency(frequency) {
    this.currentFrequency = frequency;
    this.displayedFrequency = frequency;
    
    if (this.numberElement) {
      this.numberElement.textContent = Math.round(frequency);
    }
    
    if (frequency > 0) {
      this.setVisibility(true);
      
      // Update note
      this.updateNote(frequency);
      
      const region = this.getRegionForFrequency(frequency);
      if (region) {
        this.setColor(region.config.glowHex, 1);
        if (this.regionElement) {
          this.regionElement.textContent = region.config.label;
          this.regionElement.classList.add('visible');
        }
      }
    }
  }
  
  /**
   * Hide the display
   */
  hide() {
    this.setVisibility(false);
    this.currentFrequency = 0;
    
    if (this.regionElement) {
      this.regionElement.classList.remove('visible');
    }
  }
  
  /**
   * Reset to initial state
   */
  reset() {
    this.hide();
    this.displayedFrequency = 0;
    this.currentNote = '';
    this.frequencySmoother.reset();
    
    if (this.valueElement) {
      this.valueElement.style.color = '';
      this.valueElement.style.textShadow = '';
    }
    
    if (this.numberElement) {
      this.numberElement.textContent = '---';
    }
    
    if (this.noteElement) {
      this.noteElement.textContent = '';
      this.noteElement.style.color = '';
      this.noteElement.style.textShadow = '';
      this.noteElement.classList.remove('visible');
    }
    
    if (this.regionElement) {
      this.regionElement.textContent = '';
    }
  }
  
  /**
   * Test animation
   */
  async testAnimation() {
    const testFrequencies = [65, 130, 262, 349, 440, 523, 698, 880, 1046];
    
    for (const freq of testFrequencies) {
      const region = this.getRegionForFrequency(freq);
      this.update(freq, 0.8, region?.config.glowHex, region?.config.label);
      await new Promise(r => setTimeout(r, 500));
    }
    
    this.hide();
  }
}
