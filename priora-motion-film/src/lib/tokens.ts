// Design tokens from the production brief (section 4). Tune only after looking at rendered stills.

export const COLOR = {
  // Director's overrides of the brief's values: paper #F5F3EE (was #F3EEE3), ink #111111 (was #151515).
  paper: '#F5F3EE',
  ink: '#111111',
  cobalt: '#2443B5',
  coral: '#D9785F',
  stone: '#C8C0B0',
  cream: '#E9E2D2',
  greyText: '#8C877D',
  spark: '#FFFFFF',
  /** The deep interior of the factory window, just lighter than ink so the window reads. */
  windowInterior: '#2A2927',
} as const;

// On-screen stroke weights at 1080p. World width = px / zoom, so they read the same at every zoom.
export const STROKE_PX = {
  thread: 2,
  humanLine: 5,
} as const;

// One dash pattern everywhere: proposed, incomplete or simulated. On-screen pixels.
export const DASH_PX = [10, 7] as const;

export const FONT = {
  sans: 'IBM Plex Sans',
  mono: 'IBM Plex Mono',
} as const;

// Status labels: Plex Mono, uppercase, letter spacing about 0.08 em.
export const MONO_TRACKING_EM = 0.08;

// Easing curves from the brief (section 6). No springs, no overshoot.
export const EASE_DEFAULT = [0.45, 0, 0.15, 1] as const;
export const EASE_ARRIVE = [0.2, 0.7, 0.2, 1] as const;

// One focal arrangement at a time (section 8): anything else in frame sits below 30 percent.
export const CONTEXT_OPACITY = 0.28;

// Minimum on-screen text sizes (section 7).
export const MIN_PX = { label: 22, sentence: 44 } as const;

// Persistent labels keep a damped on-screen size across big zoom changes: px = base * zoom^0.2.
export const READABLE_EXPONENT = 0.2;

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
