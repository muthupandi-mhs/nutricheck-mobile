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
  /** The page. Near-black, not #000 — pure black crushes every shadow flat. */
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

/**
 * The palette. There is one, and it is dark.
 *
 * Cool rather than warm: the greys lean blue, which is what makes a screen of
 * numbers read as an instrument. The app used to run a warm off-white scheme
 * alongside this one; carrying two meant every token had to be proved twice,
 * and half of them only ever got looked at in one.
 */
const palette: Palette = {
  canvas: '#0B0C0E',
  surface: '#16191C',
  sunken: '#101315',
  border: '#23282C',
  borderStrong: '#31373D',

  ink: '#F2F5F7',
  inkSecondary: '#A2ABB4',
  // 4.9:1 on `surface`. Tertiary is still text, so it clears AA rather than
  // sitting at the edge of legible the way a true disabled grey would.
  inkTertiary: '#828B94',
  onPrimary: '#0A1020',

  primary: '#5B8DEF',
  primaryPressed: '#4A76C9',
  primarySoft: '#161F33',
  primarySoftInk: '#9BBBF7',
  ringFrom: '#6FA8FF',
  ringTo: '#7B5BEF',

  // Unchanged, and deliberately. Amber is the app's one claim of ignorance,
  // and it has to stay as far from the accent as it was when the accent was
  // green — a blue page makes amber MORE distinct, not less.
  attention: '#E0A458',
  attentionSoft: '#2A2114',
  attentionInk: '#F0BE7E',

  danger: '#E4736A',
  dangerSoft: '#301A19',

  scrim: 'rgba(0,0,0,0.66)',
  glyph: ['#161C24', '#1A1B26', '#131E22', '#1E1A24', '#141F1E', '#1C1D20'],
  wash: ['#0B0C0E', '#121A28'],
};

export { palette };

/**
 * The floating tab bar.
 *
 * Its own tokens rather than palette entries, because it is the one surface
 * that is not part of the page: it hovers over the content instead of holding
 * it, and it is a step lighter than `surface` so that reads at a glance. Given
 * to `Palette` it would be indistinguishable from a card, and the next person
 * to restyle cards would take the bar with them.
 *
 * Pure white on the selected tab, where `ink` would be too soft — this is the
 * only place in the app that has to answer "where am I" without being read.
 */
export const navBar = {
  /** The pill. Opaque — content stops above it, so there is nothing to blur. */
  surface: '#23262A',
  /** A hairline lift, since a shadow has almost nothing to darken against here. */
  border: 'rgba(255,255,255,0.08)',
  /** The selected destination. */
  active: '#FFFFFF',
  /** The rest. Contrast against `surface` is 4.7:1 — a label, not a whisper. */
  inactive: '#8C949C',
  /** Behind a pressed tab. */
  pressed: 'rgba(255,255,255,0.07)',
} as const;

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
 * Black shadows, and deeper than they were.
 *
 * On a dark page a shadow does most of its work by being darker than a canvas
 * that is already nearly black, which it cannot be — so height reads mainly
 * through a surface being LIGHTER than what it sits on. The shadow is what
 * stops that lighter patch looking painted on, and it needs real opacity to do
 * even that. Android gets `elevation` because it ignores shadow offsets.
 */
type Elevation = ViewStyle;

const shadow = (y: number, blur: number, opacity: number, elevation: number): Elevation =>
  Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: y },
      shadowRadius: blur,
      shadowOpacity: opacity,
    },
    default: { elevation },
  }) as Elevation;

export const elevation = {
  /** Resting card. */
  e1: shadow(2, 8, 0.24, 2),
  /** Raised card, floating bar. */
  e2: shadow(6, 18, 0.38, 6),
  /** Sheets, FAB, anything that must read as above the page. */
  e3: shadow(12, 32, 0.52, 12),
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
