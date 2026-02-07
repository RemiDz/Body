# Resonance Body Map — Improvement & Feature Roadmap

## 1. Accuracy Improvements

### 1.1 Frequency Detection
- **Octave jump suppression** — The `updateFundamentalTracking` smoothing helps, but rapid instrument changes (e.g., switching from a low singing bowl to a high crystal bowl) can still cause the fundamental to "slide" through intermediate frequencies instead of snapping cleanly. A short-window onset detector could reset the smoother on transients.
- **Low-frequency resolution on iOS** — With FFT size 4096 at 44.1kHz, bin resolution is ~10.8Hz. At the root region (30–98Hz), that's only ~6 bins covering the entire range. Consider using autocorrelation or AMDF as a secondary pitch estimator for frequencies below 150Hz on iOS.
- **Harmonic Product Spectrum sparse input** — The HPS implementation builds a spectrum from only the top 12 peaks, leaving most bins at 0.01. This makes the product noisy. Using the raw FFT magnitude data (or at least top 30 peaks) would improve HPS reliability.
- **Noise gate hysteresis tuning** — The 3dB hysteresis is tight. In reverberant rooms (common in sound healing spaces), the gate can chatter during sustained bowl tones that hover near the threshold. A wider hysteresis (5–6dB) or an adaptive hysteresis based on signal variance would help.

### 1.2 Frequency-to-Region Mapping
- **Crown region is disproportionately wide** — Crown spans 740–2000Hz (1260Hz range) while root spans only 30–98Hz (68Hz). This means high-frequency content overwhelmingly maps to crown. Consider splitting crown into two sub-regions or using logarithmic scaling for region boundaries.
- **Boundary blending zone is fixed at 15%** — The `blend = width * 0.15` in `processPeak` means the root region has a ~10Hz blend zone while crown has a ~189Hz blend zone. Using a fixed Hz-width blend (e.g., 20Hz) would be more perceptually consistent.
- **Harmonic contribution weighting** — Harmonics use `0.3 / ratio` which drops off linearly. Real instrument overtones (especially singing bowls) have strong 2nd and 3rd harmonics. A `0.4 / sqrt(ratio)` curve would better match acoustic reality.

### 1.3 Visual Accuracy
- **Glow intensity double-smoothing** — Both `FrequencyMapper.update` and `GlowEngine.update` apply independent attack/decay smoothing to the same signal. This creates a sluggish response where the visual lags behind the audio by 2× the intended attack time. One of these should be removed.
- **Frequency display number animation** — The `animateNumber` method uses a fixed speed cap of 50 Hz/frame, which means jumping from 65Hz to 440Hz takes ~8 frames (~130ms). This is fine, but the `MovingAverage(5)` smoother on top makes the displayed number lag behind the actual detected frequency.

## 2. UI/UX Improvements

### 2.1 Visual Polish
- **Settings panel scroll on small screens** — The settings panel has many controls but no `overflow-y: auto`. On shorter phones (iPhone SE, older Android), the bottom settings are cut off and unreachable.
- **Frequency display visibility states** — The frequency display uses CSS class toggling for show/hide, but there's no transition on the container itself. Adding a fade transition would prevent the jarring pop-in/pop-out.
- **Welcome overlay dismiss on background tap** — Currently only the "Allow Microphone" button dismisses the welcome overlay. Tapping outside should also dismiss it (like the settings panel does).
- **Active region highlight on body** — When a region is dominant, there's no visual indicator beyond the glow intensity. A subtle outline pulse or a brighter chakra node on the spine would make the active region more obvious.
- **Slider thumb size for touch** — The range slider thumbs are default browser size. On touch devices, they should be at least 44×44px (Apple's minimum touch target) for comfortable use.
- **Settings panel backdrop** — The settings overlay uses a semi-transparent background but no blur. Adding `backdrop-filter: blur(8px)` would match the premium feel of the rest of the UI.

### 2.2 Responsiveness
- **Landscape mode support** — The app is portrait-only by manifest, but on desktop browsers it can be any aspect ratio. The body SVG and controls layout don't adapt to landscape, leaving large empty areas on wide screens.
- **Desktop hover states** — The fullscreen button and settings button have hover states, but the main "Begin Listening" button doesn't have a distinct hover effect beyond the generic btn style.
- **Font scaling on very large screens** — The `clamp()` font sizes max out at reasonable sizes for tablets, but on a 27" monitor the frequency display looks small relative to the viewport.

### 2.3 Accessibility
- **Screen reader announcements** — When the visualization state changes (listening, idle, error), there are no ARIA live region announcements. Adding `aria-live="polite"` to the status indicator would help.
- **Keyboard navigation** — The settings sliders and toggles work with keyboard, but there's no visible focus ring (the CSS resets remove outlines). Adding `:focus-visible` styles would help keyboard users.
- **Color-only information** — Region identification relies entirely on color. Adding the region name as a persistent label near the active glow (or in the frequency display area) would help colorblind users.

## 3. New Feature Ideas

### 3.1 High-Value Features
- **Session recording & playback** — Record a timeline of detected frequencies and region activations during a session. Allow playback to review which regions were activated and for how long. Export as a simple report (JSON or visual timeline).
- **Multi-instrument detection** — Currently only the dominant frequency drives the visualization. Detecting multiple simultaneous peaks (e.g., a chord or two bowls playing together) and lighting up multiple regions independently would be more accurate for group sessions.
- **Audio input source selection** — Allow choosing between microphone, line-in, or system audio (where supported). Sound healers often use external microphones or direct instrument pickups.
- **Frequency reference overlay** — A toggleable overlay showing the frequency boundaries of each region, with musical note markers (C2, C3, G3, etc.). Useful for practitioners learning which instruments activate which regions.
- **Tuner mode** — A secondary mode that shows a precise tuning display for the detected note, with cents sharp/flat indicator. Useful for tuning singing bowls and instruments before a session.

### 3.2 Session & Analytics Features
- **Session timer** — A simple elapsed time display showing how long the current listening session has been running.
- **Region activation heatmap** — After a session, show a summary of which regions received the most activation time and intensity. Displayed as a color-coded body map with percentages.
- **Frequency history graph** — A small scrolling graph at the bottom showing the detected frequency over the last 30–60 seconds. Helps practitioners see the frequency trajectory of their playing.
- **Screenshot/share** — Capture the current visualization state as an image for sharing on social media or with clients. Include the frequency, note, and region label in the capture.

### 3.3 Customization Features
- **Custom frequency mappings** — Allow users to define their own frequency-to-region boundaries. Different traditions use different frequency associations. A simple editor in settings would make the tool more versatile.
- **Color theme presets** — Beyond light/dark, offer alternative color palettes (e.g., earth tones, ocean, monochrome, traditional chakra colors from different systems).
- **Body orientation** — Option to show the body from the back (for practitioners working on the posterior). The SVG could be mirrored or a second SVG loaded.
- **Visualization intensity presets** — Quick presets like "Subtle" (low glow, no particles), "Standard" (current defaults), and "Dramatic" (high glow, max particles, all overlays) for different presentation contexts.

### 3.4 Technical Features
- **Audio file input** — Allow loading an audio file (MP3/WAV) and visualizing it instead of live microphone input. Useful for demos, testing, and pre-recorded sessions.
- **MIDI input support** — Accept MIDI note input from electronic instruments or controllers. This would give perfect frequency accuracy without microphone noise issues.
- **Multi-device sync** — Using WebRTC or a simple WebSocket server, sync the visualization across multiple devices (e.g., practitioner's iPad shows the visualization while a large screen mirrors it for the audience).
- **PWA manifest improvements** — Add raster icon fallbacks (192×192 and 512×512 PNG) for broader PWA install support. Some browsers don't support SVG-only icons. Add `shortcuts` for quick actions.
- **Wakelock API** — Prevent the screen from dimming/sleeping during a session using the Screen Wake Lock API. Critical for live demonstrations.

### 3.5 Educational Features
- **Instrument guide** — An interactive reference showing common sound healing instruments, their frequency ranges, and which body regions they activate. The `INSTRUMENT_REFERENCE` config already has this data.
- **Guided meditation mode** — A mode that plays a sequence of target frequencies (or guides the practitioner to play them) and tracks whether each region was successfully activated. A simple "journey" from root to crown.
- **Frequency-to-note learning** — When a frequency is detected, show not just the note name but also the interval relationship to the root (octave, fifth, third, etc.). Helps practitioners understand the musical theory behind the mapping.
