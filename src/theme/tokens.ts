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
  /** Hairlines. For dividers inside a surface — cards no longer draw one. */
  border: string;
  /** A stronger divider for section breaks. */
  borderStrong: string;

  ink: string;
  inkSecondary: string;
  inkTertiary: string;
  /** Text and icons on a filled primary surface. */
  onPrimary: string;

  /**
   * Emphasis, in ash. Links, a selected state, a completed metric.
   *
   * Named `primary` because it is still the accent slot every component reads
   * from — renaming it would be a hundred-file change for a word. What changed
   * is that it is now a light grey, deliberately brighter than `inkSecondary`
   * and dimmer than `ink`, so an emphasised thing reads as emphasised without
   * introducing a hue that competes with amber.
   */
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

  /**
   * The ask sheet's own light, and the one hue left in this palette that is
   * not a warning.
   *
   * The app is ash. This is the exception, and it belongs to one thing said in
   * two places: the panel the microphone raises, where somebody is speaking TO
   * the app rather than reading it, and the microphone itself — the door to
   * that room, which has to look like it before it opens. The reference does
   * exactly this: a monochrome dashboard with one tinted conversational panel
   * and one tinted control that summons it.
   *
   * Two rules keep it from becoming an accent again. It never encodes anything
   * — no value, state or grade is drawn in it, so it cannot compete with amber
   * for meaning. And on the panel it never touches text: it is an edge and a
   * wash, so nothing anybody has to READ depends on it. The mic is the single
   * place it fills a shape, because that shape is a button and not a number.
   */
  askFrom: string;
  askTo: string;
  /** The top of the sheet's own wash, warmer and bluer than the page's. */
  askWash: string;

  /** Behind a modal sheet. */
  scrim: string;
  /** Neutral tint pool for food glyphs. */
  glyph: string[];
  /** A two-stop wash for a full-bleed background. A few points of shift, never a visible band. */
  wash: [string, string];
  /**
   * The grey the top of a page is lit with — and, at the same strength, the
   * face of anything sitting up there.
   *
   * Always laid ON the canvas with an alpha, never painted solid: at full
   * strength it is lighter than the ink standing on it. It is a token rather
   * than a constant in one screen because the dials have to be lit by the same
   * light as the page behind them, or they read as discs cut out of a
   * different material and pasted on.
   */
  lift: string;
};

/**
 * The palette. There is one, it is dark, and it is ASH.
 *
 * Monochrome by design now, not by omission. It ran a blue-to-violet accent —
 * links, arcs, the mic, the ring — and the reference this app is drawn against
 * carries no hue at all: its rings, labels and controls are all one family of
 * cool grey, and the only colour on the screen is the colour that means
 * something.
 *
 * That turns out to be the version this palette was already arguing for. The
 * one hard rule here is that **amber never decorates** — it is the app's claim
 * that a number is unknown — and a rule like that is only as strong as the
 * quietness around it. With the accent gone, the two remaining hues are amber
 * for "we do not know" and red for "this deletes something", and both now
 * carry across a screen at a glance because nothing else is competing.
 *
 * What replaces the accent is WEIGHT. Emphasis is a lighter grey, not a
 * different colour; the loudest thing the palette can make is still ink on
 * canvas. Anything that needs to look tappable earns it with shape — a fill, a
 * chevron, a rule — which is what the reference does too.
 */
const palette: Palette = {
  canvas: '#0B0C0E',
  // Lifted a touch when cards lost their hairline: the step from canvas to
  // surface is now the entire edge of a card, so it has to carry on its own.
  surface: '#191D21',
  sunken: '#101315',
  border: '#23282C',
  borderStrong: '#31373D',

  ink: '#F2F5F7',
  inkSecondary: '#A2ABB4',
  // 4.9:1 on `surface`. Tertiary is still text, so it clears AA rather than
  // sitting at the edge of legible the way a true disabled grey would.
  inkTertiary: '#828B94',
  onPrimary: '#0B0C0E',

  primary: '#C2CAD1',
  primaryPressed: '#A7B0B8',
  primarySoft: '#1A1E22',
  primarySoftInk: '#CBD3DA',
  // Light to mid, so an arc still has a direction to travel in — the thing the
  // old blue-to-violet sweep was actually doing, minus the hue.
  ringFrom: '#DCE3E9',
  ringTo: '#737C85',

  // Unchanged through every repaint of this palette — a green accent, then a
  // blue one, now none — because it is the only thing here carrying a meaning
  // rather than a mood. On an ash screen it is the single warm mark, which is
  // as far from the rest as it has ever been.
  attention: '#E0A458',
  attentionSoft: '#2A2114',
  attentionInk: '#F0BE7E',

  danger: '#E4736A',
  dangerSoft: '#301A19',

  // Kept from the palette this app used to run everywhere. What was a whole
  // scheme is now one panel's worth of it.
  askFrom: '#6FA8FF',
  askTo: '#7B5BEF',
  askWash: '#161C2E',

  scrim: 'rgba(0,0,0,0.66)',
  // Six neutrals a shade apart, so a wall of food rows has texture without any
  // of them appearing to mean something. They were faintly blue and violet.
  glyph: ['#15181B', '#17191C', '#141719', '#181B1E', '#16191B', '#1A1D20'],
  wash: ['#0B0C0E', '#171B1F'],
  lift: '#D3D3D3',
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
