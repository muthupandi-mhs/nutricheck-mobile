import { Platform, ViewStyle } from 'react-native';

/**
 * Design tokens.
 *
 * One rule outranks aesthetics: **amber never decorates.** If something is
 * amber, the app is saying it does not know a number — an unmeasured fibre
 * value, a portion nobody stated, a match it is unsure of. Spending amber on a
 * highlight makes the one signal protecting the product's credibility
 * unreadable.
 */

export type Palette = {
  /** The page. Warm off-white, not #FFF — screen-white reads clinical. */
  canvas: string;
  /** Cards and sheets, the layer above the canvas. */
  surface: string;
  /** Pressed cards, inputs, and wells — the layer below it. */
  sunken: string;
  /** Hairlines. Structure comes from elevation instead. */
  border: string;
  /** A stronger divider for section breaks. */
  borderStrong: string;

  ink: string;
  inkSecondary: string;
  inkTertiary: string;
  /** Text and icons on a filled primary surface. */
  onPrimary: string;

  /** The brand. Every affirmative action, every completed metric. */
  primary: string;
  primaryPressed: string;
  /** Tinted background for tonal buttons, selected chips, soft badges. */
  primarySoft: string;
  primarySoftInk: string;
  /** The two stops of the progress-ring gradient. */
  ringFrom: string;
  ringTo: string;

  /** Uncertainty. Never decoration. */
  attention: string;
  attentionSoft: string;
  attentionInk: string;

  danger: string;
  dangerSoft: string;

  /** Behind a modal sheet. */
  scrim: string;
  /** Neutral tint pool for food glyphs. */
  glyph: string[];
  /** A two-stop wash for a full-bleed background. A few points of shift, never a visible band. */
  wash: [string, string];
};

const light: Palette = {
  canvas: '#FBFAF7',
  surface: '#FFFFFF',
  sunken: '#F3F1EC',
  border: '#ECE8E0',
  borderStrong: '#DFDAD0',

  ink: '#1A1917',
  inkSecondary: '#6B6659',
  inkTertiary: '#9C968A',
  onPrimary: '#FFFFFF',

  primary: '#0F7A5A',
  primaryPressed: '#0B6249',
  primarySoft: '#E4F1EB',
  primarySoftInk: '#0B5C44',
  ringFrom: '#3ACF95',
  ringTo: '#0F7A5A',

  attention: '#A9670C',
  attentionSoft: '#FBF0DF',
  attentionInk: '#8A530A',

  danger: '#BE3A31',
  dangerSoft: '#FBEAE8',

  scrim: 'rgba(26,25,23,0.42)',
  glyph: ['#EDF3EE', '#F5EFE6', '#EDF0F5', '#F4EDF1', '#EFF2E9', '#F6EEE9'],
  wash: ['#FBFAF7', '#E9F3EC'],
};

const dark: Palette = {
  canvas: '#111110',
  surface: '#1B1A18',
  sunken: '#161514',
  border: '#2B2926',
  borderStrong: '#3A3733',

  ink: '#F6F3ED',
  inkSecondary: '#A9A296',
  inkTertiary: '#736D63',
  onPrimary: '#08221A',

  primary: '#3ECF9A',
  primaryPressed: '#33B486',
  primarySoft: '#12301F',
  primarySoftInk: '#6FE0B7',
  ringFrom: '#5BE8B0',
  ringTo: '#25A87A',

  attention: '#E0A458',
  attentionSoft: '#2E2314',
  attentionInk: '#F0BE7E',

  danger: '#E4736A',
  dangerSoft: '#331B19',

  scrim: 'rgba(0,0,0,0.62)',
  glyph: ['#1E2621', '#26221C', '#1E2128', '#251E23', '#212519', '#26201C'],
  wash: ['#111110', '#16211B'],
};

export const palettes = { light, dark };

/** A 4pt scale. `gutter` is the page margin and is not negotiable per screen. */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  gutter: 20,
} as const;

/** Cards are `lg`; anything full-bleed steps up to `xl` to stay parallel to the device's corners. */
export const radius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

/**
 * Warm-tinted shadows, not black — a neutral shadow over a warm canvas turns
 * grey and makes the screen look dirty. Android gets `elevation` because it
 * ignores shadow offsets entirely.
 */
type Elevation = ViewStyle;

const shadow = (y: number, blur: number, opacity: number, elevation: number): Elevation =>
  Platform.select({
    ios: {
      shadowColor: '#2A2318',
      shadowOffset: { width: 0, height: y },
      shadowRadius: blur,
      shadowOpacity: opacity,
    },
    default: { elevation },
  }) as Elevation;

export const elevation = {
  /** Resting card. */
  e1: shadow(2, 8, 0.06, 2),
  /** Raised card, floating bar. */
  e2: shadow(6, 18, 0.1, 6),
  /** Sheets, FAB, anything that must read as above the page. */
  e3: shadow(12, 32, 0.16, 12),
  none: {} as Elevation,
} as const;

/** Minimum interactive size. Nothing tappable is smaller. */
export const HIT = 44;

/** Springs for finger-initiated motion, durations for system-initiated. */
export const motion = {
  duration: { instant: 90, fast: 160, base: 240, slow: 360 },
  spring: {
    /** Press feedback. Fast, barely any overshoot. */
    press: { damping: 26, stiffness: 420, mass: 0.7 },
    /** Sheets and large moving surfaces. */
    sheet: { damping: 34, stiffness: 300, mass: 0.95 },
    /** Small entrances, badges, toasts. Slightly playful. */
    pop: { damping: 18, stiffness: 340, mass: 0.8 },
  },
  /** Scale a card drops to while held. */
  pressScale: 0.975,
  /** The undo window on the one-tap repeat route. */
  undoMs: 5000,
} as const;
