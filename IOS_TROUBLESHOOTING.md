# iOS/iPad Troubleshooting Guide

## Common Issue: Microphone Enabled But No Sound Detection

If the amber microphone indicator is showing but the app isn't responding to sound:

### Quick Fixes (Try These First)

1. **Tap the screen** - iOS suspends audio contexts. Tap anywhere on the screen while making sound.

2. **Increase volume** - Play sounds LOUDER. iOS has aggressive noise filtering. Try:
   - Speaking directly into the microphone (6-12 inches away)
   - Playing instruments closer to the iPad
   - Increasing instrument volume

3. **Restart the app**:
   - Close the browser tab completely
   - Reopen the URL
   - Click "Allow Microphone" again

4. **Check Settings → Safari → Microphone**:
   - Ensure "Ask" or "Allow" is selected
   - Not "Deny"

5. **Adjust sensitivity in app**:
   - Tap the ⚙️ Settings icon
   - Increase "Microphone Sensitivity" to 2.5x or 3.0x
   - Lower "Noise Threshold" to -65 dB or -70 dB

### iOS-Specific Issues

#### Problem: Audio Context Suspended
**Symptoms:** Mic indicator shows, but no response to any sound

**Solution:**
- iOS Safari suspends audio contexts when the page loses focus
- **Tap the screen** while making sound
- Keep the app in the foreground
- Don't switch to other apps while using

#### Problem: Low Input Levels
**Symptoms:** Only responds to very loud sounds

**Solution:**
- iOS has lower microphone input levels than desktop
- The app automatically boosts gain to 2.5x on iOS
- Try increasing sensitivity further in Settings
- Speak/play directly into the microphone

#### Problem: Noise Suppression
**Symptoms:** Constant tones work, but complex sounds don't

**Solution:**
- iOS may apply audio processing despite our settings
- Try using **Safari** (best compatibility)
- Avoid Chrome on iOS (uses Safari's engine anyway)

### Testing Steps

1. **Test with voice**:
   - Say "Ahhhh" loudly and steadily
   - Hold for 3-5 seconds
   - Should activate throat/heart regions

2. **Test with singing bowl**:
   - Strike the bowl firmly
   - Hold 6-12 inches from iPad
   - Should show immediate response

3. **Check console**:
   - Connect iPad to Mac
   - Safari → Develop → [Your iPad] → [Page]
   - Look for "AudioContext state: running"
   - Should NOT show "suspended"

### iOS Safari Limitations

iOS Safari has strict audio policies:
- ✅ Requires HTTPS (GitHub Pages has this)
- ✅ Requires user gesture to start audio
- ⚠️ Suspends audio when page loses focus
- ⚠️ Lower microphone input levels
- ⚠️ May apply audio processing

### Best Practices for iPad Use

1. **Use Safari** (not Chrome) - better audio support
2. **Keep app in foreground** - don't switch apps
3. **Add to Home Screen** - runs in standalone mode
4. **Test before session** - ensure it's working
5. **Have backup plan** - traditional demonstration if tech fails

### Advanced: Force Audio Context Resume

If audio stops working during a session:

1. **Tap the STOP button**
2. **Tap anywhere on screen**
3. **Tap BEGIN LISTENING again**

This forces a fresh audio context initialization.

### Still Not Working?

1. **Restart iPad** - clears audio system
2. **Update iOS** - newer versions have better Web Audio support
3. **Try different browser** - Safari is best, but try Firefox
4. **Check microphone hardware**:
   - Test with Voice Memos app
   - Ensure microphone isn't blocked/covered
   - Clean microphone opening

### Settings Recommendations for iPad

Open Settings (⚙️ icon) and try these values:

**For Loud Instruments (Gongs, Drums):**
- Microphone Sensitivity: 1.0x - 1.5x
- Noise Threshold: -55 dB

**For Quiet Instruments (Chimes, Soft Bowls):**
- Microphone Sensitivity: 2.5x - 3.0x
- Noise Threshold: -65 dB to -70 dB

**For Voice/Demonstration:**
- Microphone Sensitivity: 2.0x
- Noise Threshold: -60 dB

### Contact & Support

If none of these work:
1. Check browser console for errors
2. Note your iOS version (Settings → General → About)
3. Note your Safari version
4. Try on a different iOS device to isolate issue

### Technical Details

The app implements these iOS-specific fixes:
- ✅ Auto-detects iOS and adjusts settings
- ✅ 2.5x default gain boost on iOS
- ✅ Lower noise floor (-65 dB vs -55 dB)
- ✅ Audio context resume on every touch
- ✅ State change listener for auto-resume
- ✅ 48kHz sample rate request for iOS

These should make it work, but iOS audio is notoriously finicky!
