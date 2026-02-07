# Resonance Body Map — Improvement & Feature Roadmap

## Status Legend
- ✅ Implemented
- 🔮 Future / Not yet implemented

## 1. Accuracy Improvements

### 1.1 Frequency Detection
- ✅ **Octave jump suppression** — Onset detector resets fundamental smoother on transients for clean pitch snapping.
- ✅ **Low-frequency resolution on iOS** — Autocorrelation (AMDF) secondary pitch estimator for frequencies below 150Hz.
- ✅ **Harmonic Product Spectrum improvement** — Increased peak count from 12 to 24 for better HPS reliability.
- ✅ **Noise gate hysteresis tuning** — Widened from 3dB to 5dB for reverberant rooms.

### 1.2 Frequency-to-Region Mapping
- 🔮 **Crown region splitting** — Crown spans 740–2000Hz disproportionately. Consider logarithmic scaling or sub-regions.
- ✅ **Boundary blending zone** — Fixed 20Hz blend zone instead of percentage-based for perceptual consistency.
- ✅ **Harmonic contribution weighting** — Improved from `0.3/ratio` to `0.4/sqrt(ratio)` matching acoustic reality.

### 1.3 Visual Accuracy
- ✅ **Glow intensity double-smoothing** — Removed redundant smoothing in GlowEngine; passes through intensity directly.
- ✅ **Frequency display smoother** — Reduced MovingAverage from 5 to 3 for faster response.

## 2. UI/UX Improvements

### 2.1 Visual Polish
- ✅ **Settings panel scroll** — Added `max-height: 80vh; overflow-y: auto` for small screens.
- 🔮 **Frequency display fade transition** — Container fade for smoother show/hide.
- ✅ **Welcome overlay dismiss on background tap** — Tapping outside dismisses the overlay.
- ✅ **Active region highlight** — Persistent active region label below frequency display.
- ✅ **Slider thumb size** — 22px default, 28px on touch devices.
- 🔮 **Settings panel backdrop blur** — `backdrop-filter: blur(8px)` for premium feel.

### 2.2 Responsiveness
- ✅ **Landscape mode support** — Layout adapts for landscape phones and desktop.
- ✅ **Desktop hover states** — Main button and icon buttons have distinct hover effects.
- ✅ **Font scaling on very large screens** — Responsive scaling for 1440px+ and 2000px+ displays.

### 2.3 Accessibility
- ✅ **Screen reader announcements** — `aria-live="polite"` on status indicator and active region label.
- ✅ **Keyboard navigation** — `:focus-visible` styles with green ring.
- ✅ **Color-only information** — Active region name label for colorblind users.

## 3. New Features

### 3.1 High-Value Features
- ✅ **Session recording & playback** — Records region activations, shows post-session summary with export.
- 🔮 **Multi-instrument detection** — Multiple simultaneous peaks lighting up regions independently.
- ✅ **Audio input source selection** — `getAudioInputDevices()` API for choosing microphone.
- ✅ **Frequency reference overlay** — Toggleable overlay showing region boundaries and note markers.
- ✅ **Tuner mode** — Precise tuning display with cents sharp/flat indicator.

### 3.2 Session & Analytics Features
- ✅ **Session timer** — Elapsed time display during listening sessions.
- ✅ **Region activation heatmap** — Post-session summary with bar chart and percentages.
- 🔮 **Frequency history graph** — Scrolling graph showing detected frequency over time.
- ✅ **Screenshot/share** — Capture visualization state as image with download.

### 3.3 Customization Features
- 🔮 **Custom frequency mappings** — User-defined frequency-to-region boundaries editor.
- ✅ **Color theme presets** — Chakra (default), Earth, Ocean, Sunset, Monochrome themes.
- 🔮 **Body orientation** — Back view option for posterior work.
- ✅ **Visualization intensity presets** — Subtle, Standard, Dramatic quick presets.

### 3.4 Technical Features
- ✅ **Audio file input** — Load MP3/WAV files for playback visualization.
- 🔮 **MIDI input support** — Accept MIDI note input from electronic instruments.
- 🔮 **Multi-device sync** — WebRTC/WebSocket sync across devices.
- ✅ **PWA manifest improvements** — Orientation unlocked, shortcuts added.
- ✅ **Wake Lock API** — Prevents screen sleep during sessions.

### 3.5 Educational Features
- ✅ **Instrument guide** — Interactive reference with frequency ranges and region mappings.
- 🔮 **Guided meditation mode** — Sequence of target frequencies with tracking.
- ✅ **Frequency-to-note learning** — Shows interval relationship from root (Unison, Perfect 5th, etc.).
