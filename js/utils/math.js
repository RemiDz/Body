/**
 * Resonance Body Map - Math Utilities
 * Interpolation, clamping, and mathematical helpers
 */

/**
 * Clamp a value between min and max
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Linear interpolation between two values
 */
export function lerp(start, end, t) {
  return start + (end - start) * t;
}

/**
 * Inverse linear interpolation - get t from value
 */
export function inverseLerp(start, end, value) {
  if (start === end) return 0;
  return (value - start) / (end - start);
}

/**
 * Map a value from one range to another
 */
export function mapRange(value, inMin, inMax, outMin, outMax) {
  const t = inverseLerp(inMin, inMax, value);
  return lerp(outMin, outMax, clamp(t, 0, 1));
}

/**
 * Smooth step - ease in/out
 */
export function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * Smoother step - even smoother transition
 */
export function smootherstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
}

/**
 * Exponential decay
 */
export function expDecay(current, target, decay, dt) {
  return target + (current - target) * Math.exp(-decay * dt);
}

/**
 * Exponential approach (smooth movement towards target)
 */
export function approach(current, target, rate) {
  const diff = target - current;
  if (Math.abs(diff) < 0.001) return target;
  return current + diff * rate;
}

/**
 * Random float between min and max
 */
export function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

/**
 * Random integer between min and max (inclusive)
 */
export function randomInt(min, max) {
  return Math.floor(randomRange(min, max + 1));
}

/**
 * Random element from array
 */
export function randomChoice(array) {
  return array[randomInt(0, array.length - 1)];
}

/**
 * Gaussian random (approximation using Box-Muller)
 */
export function gaussianRandom(mean = 0, stdDev = 1) {
  const u = 1 - Math.random();
  const v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return z * stdDev + mean;
}

/**
 * Convert decibels to linear amplitude
 */
export function dbToLinear(db) {
  return Math.pow(10, db / 20);
}

/**
 * Convert linear amplitude to decibels
 */
export function linearToDb(linear) {
  if (linear <= 0) return -Infinity;
  return 20 * Math.log10(linear);
}

/**
 * Normalize a value from dB range to 0-1
 */
export function normalizeDb(db, minDb, maxDb) {
  return clamp((db - minDb) / (maxDb - minDb), 0, 1);
}

/**
 * Get frequency for FFT bin
 */
export function binToFrequency(bin, sampleRate, fftSize) {
  return bin * sampleRate / fftSize;
}

/**
 * Get FFT bin for frequency
 */
export function frequencyToBin(frequency, sampleRate, fftSize) {
  return Math.round(frequency * fftSize / sampleRate);
}

/**
 * Calculate distance between two points
 */
export function distance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Normalize angle to 0-2PI
 */
export function normalizeAngle(angle) {
  while (angle < 0) angle += Math.PI * 2;
  while (angle >= Math.PI * 2) angle -= Math.PI * 2;
  return angle;
}

/**
 * Convert degrees to radians
 */
export function degToRad(degrees) {
  return degrees * Math.PI / 180;
}

/**
 * Convert radians to degrees
 */
export function radToDeg(radians) {
  return radians * 180 / Math.PI;
}

/**
 * Round to specified decimal places
 */
export function roundTo(value, decimals) {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Moving average - add new value and get average
 */
export class MovingAverage {
  constructor(size = 10) {
    this.size = size;
    this.values = [];
    this.sum = 0;
  }
  
  add(value) {
    this.values.push(value);
    this.sum += value;
    
    if (this.values.length > this.size) {
      this.sum -= this.values.shift();
    }
    
    return this.average;
  }
  
  get average() {
    if (this.values.length === 0) return 0;
    return this.sum / this.values.length;
  }
  
  reset() {
    this.values = [];
    this.sum = 0;
  }
}

/**
 * Peak detector with decay
 */
export class PeakDetector {
  constructor(decayRate = 0.95) {
    this.peak = 0;
    this.decayRate = decayRate;
  }
  
  update(value) {
    if (value > this.peak) {
      this.peak = value;
    } else {
      this.peak *= this.decayRate;
    }
    return this.peak;
  }
  
  reset() {
    this.peak = 0;
  }
}
