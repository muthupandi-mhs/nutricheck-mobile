/**
 * Design tokens — the single source of colour and metric truth.
 *
 * Values are transcribed verbatim from the design canvas in `design/*.dc.html`.
 * Nothing in `src/` may hardcode a hex value; if a colour is needed and is not
 * here, it belongs here first.
 */

export type Palette = {
  /** Page background. */
  ground: string;
  /** Cards, fields, chips — one step above the ground. */
  surface: string;
  /** Skeletons and inert fills — one step below the surface. */
  surface2: string;
  /** Primary text. */
  ink: string;
  /** Secondary text — labels, supporting copy. */
  ink2: string;
  /** Tertiary text — units, provenance, disabled. */
  ink3: string;
  /** Hairlines and inert track fills. */
  rule: string;
  /** The heavy bar / primary button fill. Inverts with the scheme. */
  heavy: string;
  /** Text drawn on top of `heavy`. */
  onHeavy: string;
  /** Estimated / uncertain / needs-attention. Amber. */
  est: string;
  estBg: string;
  /** Determined / exact / confirmed. Teal. */
  det: string;
  detBg: string;
  /** Scrim behind a modal sheet. */
  scrim: string;
};

const light: Palette = {
  ground: '#F2F3EF',
  surface: '#FFFFFF',
  surface2: '#E9EBE4',
  ink: '#161A17',
  ink2: '#565E58',
  ink3: '#7C847D',
  rule: '#D5D9CF',
  heavy: '#161A17',
  onHeavy: '#F2F3EF',
  est: '#9E5A0A',
  estBg: '#F6EADA',
  det: '#0C6558',
  detBg: '#DFEDE9',
  scrim: 'rgba(22,26,23,0.28)',
};

const dark: Palette = {
  ground: '#131614',
  surface: '#1B1F1C',
  surface2: '#242926',
  ink: '#E9ECE6',
  ink2: '#A2AAA4',
  ink3: '#79817B',
  rule: '#2F342F',
  heavy: '#E9ECE6',
  onHeavy: '#131614',
  est: '#E4A24E',
  estBg: '#2B2117',
  det: '#5FC4B2',
  detBg: '#142925',
  scrim: 'rgba(0,0,0,0.55)',
};

export const palettes = { light, dark };

/**
 * A 4pt scale. The canvas leans on 20 for the page gutter and 6/2/1 for rules,
 * so those get names rather than being spelled as numbers at every call site.
 */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  gutter: 20,
} as const;

/**
 * The design is hard-edged on purpose: rules and weight carry the hierarchy
 * instead of corner radius and shadow. `radius` exists so that intent is
 * explicit at call sites rather than looking like an omission.
 */
export const radius = { none: 0 } as const;

export const rule = {
  /** Hairline between list rows. */
  hair: 1,
  /** Section divider. */
  section: 2,
  /** The masthead bar under a screen header. */
  heavy: 6,
  /** The emphasis edge on a flagged or primary row. */
  edge: 3,
} as const;

/** Minimum interactive size. Every Pressable in the app satisfies this. */
export const HIT = 44;

export const duration = {
  fast: 140,
  base: 220,
  slow: 320,
  /** The undo window on the repeat route (USER-FLOWS §4). */
  undo: 5000,
} as const;
