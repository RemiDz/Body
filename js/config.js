/**
 * Resonance Body Map - Configuration
 * All configurable parameters for audio, visual, and UI
 */

// ===== AUDIO CONFIGURATION =====
// Detect iOS for platform-specific settings
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

export const AUDIO_CONFIG = {
  fftSize: 8192,                    // High resolution for low frequencies
  smoothingTimeConstant: 0.8,       // Smooth transitions
  minDecibels: -70,
  maxDecibels: -10,
  noiseFloor: isIOS ? -65 : -55,    // iOS: Lower threshold (more sensitive)
  peakThreshold: isIOS ? 0.2 : 0.3, // iOS: Lower threshold
  sampleRate: 44100,                // Standard audio
  minFrequency: 40,                 // Hz - lowest frequency to analyze
  maxFrequency: 2000                // Hz - highest frequency to analyze
};

// ===== FREQUENCY TO BODY REGION MAPPING =====
export const FREQUENCY_REGIONS = {
  root: {
    min: 40,
    max: 120,
    color: { h: 0, s: 75, l: 55 },
    colorHex: '#cc3333',
    glowHex: '#ff4444',
    label: 'Root',
    organs: ['pelvic-floor'],
    energyElement: 'energy-root'
  },
  sacral: {
    min: 120,
    max: 220,
    color: { h: 25, s: 80, l: 50 },
    colorHex: '#dd6600',
    glowHex: '#ff8800',
    label: 'Sacral',
    organs: ['intestines', 'kidney-left', 'kidney-right'],
    energyElement: 'energy-sacral'
  },
  solar: {
    min: 220,
    max: 330,
    color: { h: 45, s: 85, l: 50 },
    colorHex: '#ccaa00',
    glowHex: '#ffcc00',
    label: 'Solar Plexus',
    organs: ['stomach', 'liver', 'pancreas'],
    energyElement: 'energy-solar'
  },
  heart: {
    min: 330,
    max: 440,
    color: { h: 155, s: 70, l: 45 },
    colorHex: '#00bb77',
    glowHex: '#00ff99',
    label: 'Heart',
    organs: ['heart-organ', 'lung-left', 'lung-right'],
    energyElement: 'energy-heart'
  },
  throat: {
    min: 440,
    max: 550,
    color: { h: 190, s: 75, l: 45 },
    colorHex: '#00aacc',
    glowHex: '#00ddff',
    label: 'Throat',
    organs: ['thyroid'],
    energyElement: 'energy-throat'
  },
  thirdEye: {
    min: 550,
    max: 880,
    color: { h: 250, s: 50, l: 55 },
    colorHex: '#6655cc',
    glowHex: '#8877ff',
    label: 'Third Eye',
    organs: ['pineal'],
    energyElement: 'energy-thirdeye'
  },
  crown: {
    min: 880,
    max: 2000,
    color: { h: 280, s: 60, l: 60 },
    colorHex: '#aa55dd',
    glowHex: '#cc77ff',
    label: 'Crown',
    organs: ['brain'],
    energyElement: 'energy-crown'
  }
};

// ===== VISUAL CONFIGURATION =====
export const VISUAL_CONFIG = {
  // Glow settings
  glowIntensityMultiplier: 1.0,     // Overall glow strength
  glowDecayRate: 0.85,              // How fast glow fades (0-1, higher = slower)
  glowMinOpacity: 0,                // Minimum visible glow
  glowMaxOpacity: 0.95,             // Maximum glow
  
  // Glow layers
  glowCore: {
    blur: 4,                        // px
    opacity: 0.9,                   // multiplied by intensity
    scale: 1.0
  },
  glowMid: {
    blur: 15,
    opacity: 0.5,
    scale: 1.5
  },
  glowAmbient: {
    blur: 40,
    opacity: 0.25,
    scale: 2.5
  },
  
  // Animation timing
  transitionDuration: 300,          // ms for state changes
  pulseFrequency: 0.5,              // Hz for idle breathing
  attackTime: 100,                  // ms - fast response to sound
  decayTime: 300,                   // ms - slow fade out
  
  // Particles
  maxParticles: 60,
  particleSpawnRate: 0.3,           // Probability per frame when active
  particleSpawnThreshold: 0.3,      // Minimum intensity to spawn particles
  particleLifetime: [1000, 2000],   // ms range
  particleSize: [2, 6],             // px range
  particleSpeed: [20, 40],          // px/second
  particleDrift: 15,                // px horizontal drift
  
  // Frequency display
  frequencySmoothing: 0.7,          // Smooth Hz readout
  frequencyDisplayThreshold: -50,   // dB threshold to show Hz
  frequencyTransitionSpeed: 150     // ms for number transitions
};

// ===== UI CONFIGURATION =====
export const UI_CONFIG = {
  // Calibration
  defaultGain: 1.0,
  gainRange: [0.1, 3.0],
  noiseFloorRange: [-70, -40],
  
  // States
  states: {
    IDLE: 'idle',
    REQUESTING_MIC: 'requesting',
    LISTENING: 'listening',
    ERROR: 'error'
  },
  
  // Idle breathing
  idleDelay: 2000,                  // ms of silence before idle animation
  breathDuration: 4000,             // ms for full breath cycle
  breathStagger: 500,               // ms between region breathes
  breathMinOpacity: 0.02,
  breathMaxOpacity: 0.05,
  
  // Welcome overlay
  showWelcome: true,
  
  // Body SVG
  bodySvgPath: 'assets/body.svg'
};

// ===== INSTRUMENT REFERENCE =====
// Approximate frequencies for common sound healing instruments
export const INSTRUMENT_REFERENCE = {
  monochord: {
    fundamental: 65.4,              // C2
    description: 'Rich in overtones, activates root through crown'
  },
  crystalBowls: {
    C4: 261.6,                      // Solar Plexus
    D4: 293.7,                      // Solar Plexus / Heart
    E4: 329.6,                      // Heart
    F4: 349.2,                      // Heart
    G4: 392.0,                      // Heart / Throat
    A4: 440.0,                      // Throat
    B4: 493.9                       // Third Eye
  },
  singingBowls: {
    small: [400, 800],              // Heart to Third Eye
    medium: [250, 500],             // Solar to Throat
    large: [150, 300]               // Sacral to Solar
  },
  didgeridoo: {
    fundamental: [60, 80],          // Root
    overtones: 'complex'            // Multiple regions
  },
  gong: {
    range: [50, 1500],              // Full spectrum
    description: 'Complex wash of frequencies'
  },
  tuningForks: {
    '128Hz': 128,                   // Sacral
    '256Hz': 256,                   // Solar Plexus
    '512Hz': 512                    // Throat
  }
};

// ===== HELPER FUNCTIONS =====

/**
 * Get the region for a given frequency
 */
export function getRegionForFrequency(frequency) {
  for (const [regionName, config] of Object.entries(FREQUENCY_REGIONS)) {
    if (frequency >= config.min && frequency < config.max) {
      return { name: regionName, config };
    }
  }
  return null;
}

/**
 * Interpolate between two region colors based on frequency position
 */
export function getColorForFrequency(frequency) {
  const region = getRegionForFrequency(frequency);
  if (!region) return '#ffffff';
  return region.config.colorHex;
}

/**
 * Get all regions affected by a frequency (including harmonics consideration)
 */
export function getAffectedRegions(frequency) {
  const affected = [];
  for (const [regionName, config] of Object.entries(FREQUENCY_REGIONS)) {
    if (frequency >= config.min && frequency < config.max) {
      affected.push({ name: regionName, config, isPrimary: true });
    }
  }
  return affected;
}
