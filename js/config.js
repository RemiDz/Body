/**
 * Resonance Body Map - Configuration
 * All configurable parameters for audio, visual, and UI
 */

// ===== AUDIO CONFIGURATION =====
// Detect iOS for platform-specific settings
const isIOS =
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export const AUDIO_CONFIG = {
  fftSize: isIOS ? 4096 : 8192,     // iOS: 4096 for ~10.8Hz bins at 44.1kHz
  smoothingTimeConstant: 0.75,      // Slightly faster response
  minDecibels: -70,
  maxDecibels: -10,
  noiseFloor: isIOS ? -62 : -55,    // iOS: Adjusted threshold
  peakThreshold: isIOS ? 0.18 : 0.25, // iOS: Lower threshold
  sampleRate: 44100,                // Standard audio
  minFrequency: 30,                 // Hz - extended down from 40
  maxFrequency: 2000,               // Hz - highest frequency to analyze
  harmonicTolerance: 0.03,          // 3% tolerance for harmonic matching
  maxHarmonicSearch: 10,            // Search up to 10th harmonic
  fundamentalBias: 1.3              // Prefer lower fundamentals
};

// ===== FREQUENCY TO BODY REGION MAPPING =====
// Musically-aligned boundaries based on octaves/fifths from C2 root
export const FREQUENCY_REGIONS = {
  root: {
    min: 30,
    max: 98,
    center: 65,  // C2 - monochord fundamental
    color: { h: 0, s: 75, l: 55 },
    colorHex: '#cc3333',
    glowHex: '#ff4444',
    label: 'Root',
    note: 'C2',
    organs: ['pelvic-floor'],
    energyElement: 'energy-root'
  },
  sacral: {
    min: 98,
    max: 165,
    center: 131, // C3 - octave above root
    color: { h: 25, s: 80, l: 50 },
    colorHex: '#dd6600',
    glowHex: '#ff8800',
    label: 'Sacral',
    note: 'C3',
    organs: ['intestines', 'kidney-left', 'kidney-right'],
    energyElement: 'energy-sacral'
  },
  solar: {
    min: 165,
    max: 247,
    center: 196, // G3 - fifth relationship
    color: { h: 45, s: 85, l: 50 },
    colorHex: '#ccaa00',
    glowHex: '#ffcc00',
    label: 'Solar Plexus',
    note: 'G3',
    organs: ['stomach', 'liver', 'pancreas'],
    energyElement: 'energy-solar'
  },
  heart: {
    min: 247,
    max: 370,
    center: 330, // E4 - major third above middle C
    color: { h: 155, s: 70, l: 45 },
    colorHex: '#00bb77',
    glowHex: '#00ff99',
    label: 'Heart',
    note: 'E4',
    organs: ['heart-organ', 'lung-left', 'lung-right'],
    energyElement: 'energy-heart'
  },
  throat: {
    min: 370,
    max: 494,
    center: 440, // A4 - concert pitch
    color: { h: 190, s: 75, l: 45 },
    colorHex: '#00aacc',
    glowHex: '#00ddff',
    label: 'Throat',
    note: 'A4',
    organs: ['thyroid'],
    energyElement: 'energy-throat'
  },
  thirdEye: {
    min: 494,
    max: 740,
    center: 523, // C5 - two octaves above root
    color: { h: 250, s: 50, l: 55 },
    colorHex: '#6655cc',
    glowHex: '#8877ff',
    label: 'Third Eye',
    note: 'C5',
    organs: ['pineal'],
    energyElement: 'energy-thirdeye'
  },
  crown: {
    min: 740,
    max: 2000,
    center: 1047, // C6 - three octaves above root
    color: { h: 280, s: 60, l: 60 },
    colorHex: '#aa55dd',
    glowHex: '#cc77ff',
    label: 'Crown',
    note: 'C6',
    organs: ['brain'],
    energyElement: 'energy-crown'
  }
};

// ===== VISUAL CONFIGURATION =====
export const VISUAL_CONFIG = {
  // Glow settings
  glowIntensityMultiplier: 1.2,     // Slightly boosted glow strength
  glowDecayRate: 0.88,              // How fast glow fades (0-1, higher = slower)
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
  attackTime: 80,                   // ms - faster response to sound
  decayTime: 350,                   // ms - slightly longer fade out
  
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
  frequencyTransitionSpeed: 150,    // ms for number transitions
  peakThreshold: AUDIO_CONFIG.peakThreshold
};

// ===== UI CONFIGURATION =====
export const UI_CONFIG = {
  // Calibration
  defaultGain: isIOS ? 2.5 : 1.0,
  gainRange: [0.1, 4.0],           // Extended upper range
  noiseFloorRange: [-75, -35],
  
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

/**
 * Get resonance strength based on distance from region center
 * Returns a Gaussian-weighted value (1.0 at center, tapering toward edges)
 */
export function getResonanceStrength(frequency, regionName) {
  const config = FREQUENCY_REGIONS[regionName];
  if (!config) return 0;
  
  const center = config.center || (config.min + config.max) / 2;
  const halfWidth = (config.max - config.min) / 2;
  const distance = Math.abs(frequency - center);
  
  // Gaussian curve: sigma = 60% of half-width for nice falloff
  const sigma = halfWidth * 0.6;
  const strength = Math.exp(-(distance * distance) / (2 * sigma * sigma));
  
  return strength;
}
