/**
 * Resonance Body Map - Theme Manager
 * Syncs CSS custom property theme colors back into the JS FREQUENCY_REGIONS config
 * so that particles, harmonic cascade, cymatics, resonance rings, etc. use the
 * active theme colors instead of the hardcoded defaults.
 */

import { FREQUENCY_REGIONS } from '../config.js';

// Map from region name to CSS custom property suffix
const REGION_CSS_MAP = {
  root:     'root',
  sacral:   'sacral',
  solar:    'solar',
  heart:    'heart',
  throat:   'throat',
  thirdEye: 'thirdeye',
  crown:    'crown'
};

/**
 * Read the current computed CSS custom properties and update
 * FREQUENCY_REGIONS.colorHex / glowHex in place.
 */
export function syncThemeColors() {
  const style = getComputedStyle(document.body);

  for (const [regionName, cssSuffix] of Object.entries(REGION_CSS_MAP)) {
    const config = FREQUENCY_REGIONS[regionName];
    if (!config) continue;

    const colorVal = style.getPropertyValue(`--color-${cssSuffix}`).trim();
    const glowVal  = style.getPropertyValue(`--color-${cssSuffix}-glow`).trim();

    if (colorVal) config.colorHex = colorVal;
    if (glowVal)  config.glowHex  = glowVal;
  }
}
