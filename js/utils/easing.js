/**
 * Resonance Body Map - Easing Functions
 * Standard easing curves for animations
 */

/**
 * Linear - no easing
 */
export function linear(t) {
  return t;
}

// ===== QUADRATIC =====

export function easeInQuad(t) {
  return t * t;
}

export function easeOutQuad(t) {
  return t * (2 - t);
}

export function easeInOutQuad(t) {
  return t < 0.5 
    ? 2 * t * t 
    : -1 + (4 - 2 * t) * t;
}

// ===== CUBIC =====

export function easeInCubic(t) {
  return t * t * t;
}

export function easeOutCubic(t) {
  const t1 = t - 1;
  return t1 * t1 * t1 + 1;
}

export function easeInOutCubic(t) {
  return t < 0.5
    ? 4 * t * t * t
    : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
}

// ===== QUARTIC =====

export function easeInQuart(t) {
  return t * t * t * t;
}

export function easeOutQuart(t) {
  const t1 = t - 1;
  return 1 - t1 * t1 * t1 * t1;
}

export function easeInOutQuart(t) {
  const t1 = t - 1;
  return t < 0.5
    ? 8 * t * t * t * t
    : 1 - 8 * t1 * t1 * t1 * t1;
}

// ===== QUINTIC =====

export function easeInQuint(t) {
  return t * t * t * t * t;
}

export function easeOutQuint(t) {
  const t1 = t - 1;
  return 1 + t1 * t1 * t1 * t1 * t1;
}

export function easeInOutQuint(t) {
  const t1 = t - 1;
  return t < 0.5
    ? 16 * t * t * t * t * t
    : 1 + 16 * t1 * t1 * t1 * t1 * t1;
}

// ===== SINE =====

export function easeInSine(t) {
  return 1 - Math.cos((t * Math.PI) / 2);
}

export function easeOutSine(t) {
  return Math.sin((t * Math.PI) / 2);
}

export function easeInOutSine(t) {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

// ===== EXPONENTIAL =====

export function easeInExpo(t) {
  return t === 0 ? 0 : Math.pow(2, 10 * (t - 1));
}

export function easeOutExpo(t) {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

export function easeInOutExpo(t) {
  if (t === 0) return 0;
  if (t === 1) return 1;
  if (t < 0.5) return Math.pow(2, 20 * t - 10) / 2;
  return (2 - Math.pow(2, -20 * t + 10)) / 2;
}

// ===== CIRCULAR =====

export function easeInCirc(t) {
  return 1 - Math.sqrt(1 - t * t);
}

export function easeOutCirc(t) {
  const t1 = t - 1;
  return Math.sqrt(1 - t1 * t1);
}

export function easeInOutCirc(t) {
  return t < 0.5
    ? (1 - Math.sqrt(1 - 4 * t * t)) / 2
    : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2;
}

// ===== ELASTIC =====

export function easeInElastic(t) {
  if (t === 0) return 0;
  if (t === 1) return 1;
  return -Math.pow(2, 10 * (t - 1)) * Math.sin((t - 1.1) * 5 * Math.PI);
}

export function easeOutElastic(t) {
  if (t === 0) return 0;
  if (t === 1) return 1;
  return Math.pow(2, -10 * t) * Math.sin((t - 0.1) * 5 * Math.PI) + 1;
}

export function easeInOutElastic(t) {
  if (t === 0) return 0;
  if (t === 1) return 1;
  if (t < 0.5) {
    return -Math.pow(2, 20 * t - 10) * Math.sin((20 * t - 11.125) * (2 * Math.PI) / 4.5) / 2;
  }
  return Math.pow(2, -20 * t + 10) * Math.sin((20 * t - 11.125) * (2 * Math.PI) / 4.5) / 2 + 1;
}

// ===== BACK (OVERSHOOT) =====

const BACK_OVERSHOOT = 1.70158;

export function easeInBack(t) {
  return t * t * ((BACK_OVERSHOOT + 1) * t - BACK_OVERSHOOT);
}

export function easeOutBack(t) {
  const t1 = t - 1;
  return t1 * t1 * ((BACK_OVERSHOOT + 1) * t1 + BACK_OVERSHOOT) + 1;
}

export function easeInOutBack(t) {
  const s = BACK_OVERSHOOT * 1.525;
  if (t < 0.5) {
    const t2 = 2 * t;
    return (t2 * t2 * ((s + 1) * t2 - s)) / 2;
  }
  const t2 = 2 * t - 2;
  return (t2 * t2 * ((s + 1) * t2 + s) + 2) / 2;
}

// ===== BOUNCE =====

export function easeOutBounce(t) {
  const n1 = 7.5625;
  const d1 = 2.75;
  
  if (t < 1 / d1) {
    return n1 * t * t;
  } else if (t < 2 / d1) {
    const t1 = t - 1.5 / d1;
    return n1 * t1 * t1 + 0.75;
  } else if (t < 2.5 / d1) {
    const t1 = t - 2.25 / d1;
    return n1 * t1 * t1 + 0.9375;
  } else {
    const t1 = t - 2.625 / d1;
    return n1 * t1 * t1 + 0.984375;
  }
}

export function easeInBounce(t) {
  return 1 - easeOutBounce(1 - t);
}

export function easeInOutBounce(t) {
  return t < 0.5
    ? (1 - easeOutBounce(1 - 2 * t)) / 2
    : (1 + easeOutBounce(2 * t - 1)) / 2;
}

// ===== SPRING =====

/**
 * Spring easing with customizable parameters
 */
export function spring(t, { stiffness = 100, damping = 10, mass = 1 } = {}) {
  const w0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  
  if (zeta < 1) {
    // Underdamped
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    return 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + (zeta * w0 / wd) * Math.sin(wd * t));
  } else if (zeta === 1) {
    // Critically damped
    return 1 - (1 + w0 * t) * Math.exp(-w0 * t);
  } else {
    // Overdamped
    const s1 = -w0 * (zeta + Math.sqrt(zeta * zeta - 1));
    const s2 = -w0 * (zeta - Math.sqrt(zeta * zeta - 1));
    return 1 - ((s2 * Math.exp(s1 * t) - s1 * Math.exp(s2 * t)) / (s2 - s1));
  }
}

// ===== CUSTOM CURVES =====

/**
 * Custom cubic bezier easing
 */
export function cubicBezier(t, p1x, p1y, p2x, p2y) {
  // Simplified cubic bezier - for accurate results use a proper implementation
  const cx = 3 * p1x;
  const bx = 3 * (p2x - p1x) - cx;
  const ax = 1 - cx - bx;
  
  const cy = 3 * p1y;
  const by = 3 * (p2y - p1y) - cy;
  const ay = 1 - cy - by;
  
  // Solve for t given x (Newton-Raphson)
  let x = t;
  for (let i = 0; i < 8; i++) {
    const xEst = ((ax * x + bx) * x + cx) * x;
    const dx = (3 * ax * x + 2 * bx) * x + cx;
    if (Math.abs(dx) < 1e-6) break;
    x -= (xEst - t) / dx;
  }
  
  return ((ay * x + by) * x + cy) * x;
}

// ===== EASING PRESETS =====

export const EASING_PRESETS = {
  // Fast response (for audio reactivity)
  outFast: (t) => cubicBezier(t, 0.22, 1, 0.36, 1),
  
  // Smooth transitions
  outSmooth: (t) => cubicBezier(t, 0.16, 1, 0.3, 1),
  
  // Gentle ambient
  inOutGentle: (t) => cubicBezier(t, 0.45, 0, 0.55, 1),
  
  // Spring-like
  outSpring: (t) => cubicBezier(t, 0.175, 0.885, 0.32, 1.275)
};
