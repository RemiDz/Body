# Resonance Body Map

A real-time audio frequency visualizer that maps sound to human body regions. Designed as a premium iPad PWA for sound healing demonstrations.

## Overview

**Product:** Real-time audio frequency visualizer mapping sound to human body regions  
**Platform:** iPad (portrait), installable PWA  
**Use Case:** Live demonstration tool for sound healing sessions

When instruments are played, different frequencies illuminate different body regions based on a chakra-inspired mapping system:

| Region | Frequency Range | Color |
|--------|----------------|-------|
| Root | 40-120 Hz | Red |
| Sacral | 120-220 Hz | Orange |
| Solar Plexus | 220-330 Hz | Gold |
| Heart | 330-440 Hz | Green |
| Throat | 440-550 Hz | Cyan |
| Third Eye | 550-880 Hz | Indigo |
| Crown | 880-2000 Hz | Violet |

## Quick Start

1. Serve the files with any static HTTP server:
   ```bash
   # Python 3
   python -m http.server 8000
   
   # Node.js (npx)
   npx serve
   
   # Or any other static server
   ```

2. Open in browser: `http://localhost:8000`

3. Click "Allow Microphone" to begin

4. Play instruments and watch the body visualization respond!

## Deployment

### GitHub Pages (Recommended - Free)

**Quick Deploy:**
```bash
# Windows
deploy.bat

# Mac/Linux
chmod +x deploy.sh
./deploy.sh
```

**Manual Steps:**
1. Create a GitHub repository
2. Push this code to GitHub
3. Go to Settings → Pages
4. Select `main` branch as source
5. Your app will be live at: `https://YOUR-USERNAME.github.io/REPO-NAME/`

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions and alternative hosting options (Netlify, Vercel, Cloudflare Pages).

## Installation as PWA

Once deployed, on iPad:
1. Open the GitHub Pages URL in Safari
2. Tap the Share button
3. Tap "Add to Home Screen"
4. The app will run in fullscreen standalone mode

## Features

- **Real-time FFT Analysis**: 8192-point FFT for accurate low-frequency detection
- **Multi-layer Glow Effects**: Core, mid, and ambient glow layers for premium visuals
- **Particle System**: Particles emanate from active regions (60 max, pooled for performance)
- **Idle Animation**: Subtle breathing animation when no sound is detected
- **Noise Gate**: Auto-adjusts to ambient noise levels
- **Settings Panel**: Adjust sensitivity, noise threshold, and glow intensity
- **Offline Support**: Works offline after first load (PWA with service worker)

## Project Structure

```
resonance-body/
├── index.html              # Main HTML shell
├── manifest.json           # PWA manifest
├── sw.js                   # Service worker (offline support)
├── css/
│   ├── themes.css          # Color variables, design tokens
│   ├── styles.css          # Main styles
│   └── animations.css      # Keyframe animations
├── js/
│   ├── app.js              # Main entry point
│   ├── config.js           # Configuration (frequencies, colors, settings)
│   ├── audio/
│   │   ├── AudioAnalyzer.js    # Web Audio FFT analysis
│   │   ├── FrequencyMapper.js  # Maps frequencies to body regions
│   │   └── NoiseGate.js        # Filters ambient noise
│   ├── visual/
│   │   ├── BodyRenderer.js     # SVG body manipulation
│   │   ├── GlowEngine.js       # Glow effect calculations
│   │   ├── ParticleSystem.js   # Particle spawning/pooling
│   │   └── AmbientEffects.js   # Background animations
│   ├── ui/
│   │   ├── FrequencyDisplay.js # Hz readout
│   │   ├── Controls.js         # Start/stop, settings
│   │   └── Calibration.js      # Mic sensitivity
│   └── utils/
│       ├── easing.js           # Animation curves
│       └── math.js             # Math helpers
└── assets/
    └── body.svg                # Body illustration
```

## Instrument Examples

- **Monochord (~65Hz)**: Root/Sacral regions glow, overtones cascade upward
- **Crystal Bowl C4 (~262Hz)**: Solar Plexus illuminates
- **Crystal Bowl F4 (~349Hz)**: Heart region glows
- **Crystal Bowl A4 (~440Hz)**: Heart/Throat boundary
- **High chimes (~1000Hz+)**: Third Eye/Crown activation

## Technical Notes

### Performance Targets
- 60 FPS on iPad Pro/Air
- <50ms audio latency
- <100MB memory usage

### Browser Requirements
- Web Audio API
- getUserMedia (microphone access)
- ES6 Modules
- CSS Custom Properties
- Service Worker (for PWA)

### Important Disclaimer

This visualization is an **artistic interpretation** based on traditional chakra/energy systems. It does not claim medical or scientific accuracy. Physical organ resonance occurs at much lower infrasound frequencies (2-30 Hz) than the audible frequencies used in this mapping.

## Settings

Access settings via the gear icon:

- **Microphone Sensitivity**: Adjust input gain (0.1x - 3.0x)
- **Noise Threshold**: Set noise floor (-70dB to -40dB)
- **Glow Intensity**: Control visual intensity (0.3x - 2.0x)
- **Particles**: Toggle particle effects on/off

Settings are automatically saved to localStorage.

## Development

The app uses ES6 modules and requires an HTTP server (file:// protocol won't work due to CORS).

Debug commands available in browser console:
```javascript
// Access app instance
resonanceApp

// Get current state
resonanceApp.getState()

// Test visualization without audio
resonanceApp.testVisualization()

// Start calibration
resonanceApp.startCalibration()
```

## License

Created for sound healing demonstrations. Use freely for educational and wellness purposes.

---

*"Visualizing sound through the body"*
