import type {
  FoodDetail,
  FoodNutrientsPer100g,
  FoodPortion,
  FoodSource,
  FoodSummary,
  UserProfile,
} from '../types';

/**
 * The fixture corpus.
 *
 * Values are real per-100 g figures from the sources named in `source`, so
 * every number the UI derives from them is arithmetically honest — a portion
 * chip retotals to something a nutritionist would recognise. Two rows carry
 * `fiberState: 'unknown'` on purpose: without them the em-dash path and the
 * "N items unmeasured" line on the ring would never render in development.
 */

type Seed = {
  id: string;
  name: string;
  brand?: string | null;
  source: FoodSource;
  isGeneric?: boolean;
  kcal: number;
  protein: number;
  /** null means the source genuinely does not carry a fiber figure. */
  fiber: number | null;
  fiberState?: FoodNutrientsPer100g['fiberState'];
  portions?: Array<[label: string, grams: number, isDefault?: boolean]>;
};

const GRAM_PORTION: FoodPortion = { label: '100 g', grams: 100, isDefault: true };

function build(seed: Seed): FoodDetail {
  const portions: FoodPortion[] = (seed.portions ?? []).map(([label, grams, isDefault]) => ({
    label,
    grams,
    isDefault: Boolean(isDefault),
  }));
  if (!portions.some(p => p.isDefault)) portions.push({ ...GRAM_PORTION, isDefault: portions.length === 0 });
  return {
    id: seed.id,
    name: seed.name,
    brand: seed.brand ?? null,
    kcalPer100g: seed.kcal,
    source: seed.source,
    isGeneric: seed.isGeneric ?? true,
    nutrients: {
      kcal: seed.kcal,
      proteinG: seed.protein,
      fiberG: seed.fiber,
      fiberState: seed.fiberState ?? (seed.fiber === null ? 'unknown' : 'known'),
    },
    portions,
  };
}

const SEEDS: Seed[] = [
  // ── grains and staples ────────────────────────────────────────────────────
  { id: 'f-oats', name: 'Oats, rolled, dry', source: 'usda_foundation', kcal: 379, protein: 13.2, fiber: 10.1,
    portions: [['1 cup', 80, true], ['½ cup', 40], ['1 tbsp', 8]] },
  { id: 'f-roti', name: 'Roti, plain', source: 'curated', kcal: 147, protein: 5.2, fiber: 2.0,
    portions: [['1 roti', 90, true], ['1 small roti', 60]] },
  { id: 'f-rice-white', name: 'Rice, white, cooked', source: 'usda_sr', kcal: 130, protein: 2.7, fiber: 0.4,
    portions: [['1 cup', 158, true], ['½ cup', 79], ['1 bowl', 200]] },
  { id: 'f-bread-ww', name: 'Bread, whole wheat', source: 'usda_fndds', kcal: 247, protein: 13.0, fiber: 6.8,
    portions: [['1 slice', 32, true], ['2 slices', 64]] },
  { id: 'f-poha', name: 'Poha, cooked', source: 'curated', kcal: 130, protein: 2.6, fiber: 1.2,
    portions: [['1 plate', 180, true], ['1 bowl', 220]] },

  // ── pulses ────────────────────────────────────────────────────────────────
  { id: 'f-dal-toor', name: 'Dal, toor, cooked', source: 'curated', kcal: 104, protein: 6.2, fiber: 3.9,
    portions: [['1 bowl', 210, true], ['1 cup', 240], ['1 katori', 150]] },
  { id: 'f-dal-moong', name: 'Dal, moong, cooked', source: 'curated', kcal: 97, protein: 6.6, fiber: 3.6,
    portions: [['1 bowl', 210, true], ['1 katori', 150]] },
  { id: 'f-dal-chana', name: 'Dal, chana, cooked', source: 'curated', kcal: 115, protein: 7.0, fiber: 4.2,
    portions: [['1 bowl', 210, true], ['1 katori', 150]] },
  { id: 'f-rajma', name: 'Rajma, cooked', source: 'curated', kcal: 127, protein: 8.7, fiber: 6.4,
    portions: [['1 bowl', 200, true]] },

  // ── chicken, the search-disambiguation set ────────────────────────────────
  { id: 'f-chicken-thigh-grilled', name: 'Chicken thigh, grilled', source: 'usda_fndds', kcal: 210, protein: 25.6, fiber: 0,
    portions: [['1 thigh', 90, true], ['1 fillet', 145]] },
  { id: 'f-chicken-thigh-raw', name: 'Chicken, broiler, thigh, meat only, raw', source: 'usda_foundation', kcal: 119, protein: 20.0, fiber: 0 },
  { id: 'f-chicken-thigh-roast-skin', name: 'Chicken, thigh, roasted, skin eaten', source: 'usda_fndds', kcal: 229, protein: 25.0, fiber: 0 },
  { id: 'f-chicken-thigh-fried', name: 'Chicken, thigh, fried, batter-coated', source: 'usda_fndds', kcal: 259, protein: 21.0, fiber: 0.6 },
  { id: 'f-chicken-thigh-bnls', name: 'Chicken thigh, boneless, skinless', brand: 'Own brand', source: 'off', isGeneric: false, kcal: 121, protein: 19.0, fiber: null },
  { id: 'f-chicken-curry', name: 'Chicken thigh curry, restaurant', source: 'curated', kcal: 174, protein: 14.0, fiber: 1.6,
    portions: [['1 bowl', 240, true], ['1 katori', 160]] },
  { id: 'f-chicken-breast', name: 'Chicken breast, roasted', source: 'usda_foundation', kcal: 165, protein: 31.0, fiber: 0,
    portions: [['1 breast', 174, true], ['1 fillet', 120]] },

  // ── dairy ─────────────────────────────────────────────────────────────────
  { id: 'f-curd', name: 'Curd, whole milk', source: 'off', isGeneric: false, kcal: 61, protein: 3.5, fiber: null,
    portions: [['1 bowl', 150, true], ['1 cup', 245], ['½ cup', 123]] },
  { id: 'f-greek-yogurt', name: 'Greek yogurt, plain', source: 'usda_foundation', kcal: 59, protein: 10.0, fiber: 0,
    portions: [['1 pot', 170, true], ['1 cup', 245]] },
  { id: 'f-milk-whole', name: 'Milk, whole', source: 'usda_foundation', kcal: 61, protein: 3.2, fiber: 0,
    portions: [['1 glass', 240, true], ['1 splash', 30]] },
  { id: 'f-paneer', name: 'Paneer', source: 'curated', kcal: 265, protein: 18.3, fiber: 0,
    portions: [['1 cube', 25, true], ['1 bowl', 100]] },
  { id: 'f-coffee-milk', name: 'Coffee with milk', source: 'usda_fndds', kcal: 21, protein: 1.6, fiber: null,
    portions: [['1 mug', 200, true], ['1 cup', 150]] },
  { id: 'f-flat-white', name: 'Flat white', brand: 'Café', source: 'off', isGeneric: false, kcal: 55, protein: 3.4, fiber: null,
    portions: [['1 regular', 180, true]] },

  // ── protein and snacks ────────────────────────────────────────────────────
  { id: 'f-egg-boiled', name: 'Egg, whole, boiled', source: 'usda_foundation', kcal: 155, protein: 12.6, fiber: 0,
    portions: [['1 egg', 50, true], ['2 eggs', 100]] },
  { id: 'f-almonds', name: 'Almonds, raw', source: 'usda_foundation', kcal: 579, protein: 21.2, fiber: 12.5,
    portions: [['1 handful', 28, true], ['10 almonds', 12]] },
  { id: 'f-peanut-butter', name: 'Peanut butter, smooth', source: 'usda_sr', kcal: 588, protein: 25.1, fiber: 6.0,
    portions: [['1 tbsp', 16, true], ['2 tbsp', 32]] },
  { id: 'f-whey', name: 'Whey protein isolate', brand: 'Generic', source: 'off', isGeneric: false, kcal: 373, protein: 80.0, fiber: 0,
    portions: [['1 scoop', 30, true]] },
  { id: 'f-banana', name: 'Banana, raw', source: 'usda_foundation', kcal: 89, protein: 1.1, fiber: 2.6,
    portions: [['1 medium', 118, true], ['1 small', 90], ['1 large', 136]] },
  { id: 'f-apple', name: 'Apple, with skin', source: 'usda_foundation', kcal: 52, protein: 0.3, fiber: 2.4,
    portions: [['1 medium', 182, true], ['1 small', 149]] },
  { id: 'f-spinach', name: 'Spinach, cooked', source: 'usda_sr', kcal: 23, protein: 3.0, fiber: 2.4,
    portions: [['1 bowl', 180, true]] },
  { id: 'f-chicken-salad', name: 'Chicken salad, no dressing', source: 'curated', kcal: 118, protein: 13.4, fiber: 1.3,
    portions: [['1 bowl', 320, true]] },
];

export const FOODS: FoodDetail[] = SEEDS.map(build);

export const FOOD_BY_ID = new Map(FOODS.map(f => [f.id, f]));

export const summary = (f: FoodDetail): FoodSummary => ({
  id: f.id,
  name: f.name,
  brand: f.brand,
  kcalPer100g: f.kcalPer100g,
});

export const food = (id: string): FoodDetail => {
  const f = FOOD_BY_ID.get(id);
  if (!f) throw new Error(`fixture missing food: ${id}`);
  return f;
};

/**
 * Foods this user has logged before. Search boosts these above generic rows,
 * and they are what the recents strip is built from.
 */
export const LOGGED_FOOD_IDS = new Set([
  'f-chicken-thigh-grilled',
  'f-dal-toor',
  'f-roti',
  'f-oats',
  'f-banana',
  'f-greek-yogurt',
  'f-curd',
  'f-coffee-milk',
  'f-almonds',
  'f-rice-white',
]);

export const CUSTOM_FOOD_IDS = new Set<string>();

/**
 * `user_portions` — what this user's own words mean in grams.
 *
 * The presence of a row here is the difference between "a bowl" resolving
 * exactly and resolving to a range. Keyed by `${foodId}:${label}`.
 */
export const USER_PORTIONS = new Map<string, number>([
  ['f-dal-toor:bowl', 210],
  ['f-rice-white:bowl', 200],
  ['f-curd:bowl', 150],
]);

/** The default demo profile. Onboarding overwrites it. */
export const DEFAULT_PROFILE: UserProfile = {
  sex: 'male',
  birthDate: '1994-04-18',
  heightCm: 178,
  weightKg: 74,
  activityLevel: 'moderate',
  objective: 'lose',
  rateKgPerWeek: 0.5,
  units: 'metric',
};
