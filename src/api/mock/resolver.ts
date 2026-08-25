import { uuid } from '../../lib/id';
import { scale } from '../../lib/nutrition';
import type { Quantity, ResolveDraft, ResolveSource, ResolvedItem, UnresolvedItem } from '../types';
import { FOODS, USER_PORTIONS, food, summary } from './db';

/**
 * A stand-in for POST /v1/resolve.
 *
 * It is not a language model, but it produces the same *shapes* and — more
 * importantly — the same *distribution of shapes*: exact masses, counts,
 * standard measures, learned and unlearned personal units, ambiguous head
 * nouns, and words that match nothing. Every branch of the confirm sheet is
 * reachable from something a developer can actually type, which is the only
 * way those branches get looked at before the real resolver exists.
 *
 * When the SSE endpoint lands this file is deleted, not ported.
 */

/** Head noun → the row we would rank first, plus its runners-up. */
const LEXICON: Array<{ match: RegExp; foodId: string; alts?: string[]; ambiguous?: boolean }> = [
  { match: /\b(roti|rotis|chapati|chapatis|phulka)\b/, foodId: 'f-roti' },
  { match: /\b(dal|daal|dhal|lentils?)\b/, foodId: 'f-dal-toor', alts: ['f-dal-moong', 'f-dal-chana', 'f-rajma'], ambiguous: true },
  { match: /\b(curd|dahi|yoghurt|yogurt)\b/, foodId: 'f-curd', alts: ['f-greek-yogurt'] },
  { match: /\bgreek\b/, foodId: 'f-greek-yogurt', alts: ['f-curd'] },
  { match: /\b(chicken)\b/, foodId: 'f-chicken-thigh-grilled', alts: ['f-chicken-breast', 'f-chicken-thigh-roast-skin', 'f-chicken-curry'], ambiguous: true },
  { match: /\b(rice|chawal)\b/, foodId: 'f-rice-white' },
  { match: /\b(oats|oatmeal|porridge)\b/, foodId: 'f-oats' },
  { match: /\b(banana|kela)\b/, foodId: 'f-banana' },
  { match: /\b(apple)\b/, foodId: 'f-apple' },
  { match: /\b(coffee|latte|cappuccino)\b/, foodId: 'f-coffee-milk', alts: ['f-flat-white'] },
  { match: /\bflat white\b/, foodId: 'f-flat-white', alts: ['f-coffee-milk'] },
  { match: /\b(eggs?|anda)\b/, foodId: 'f-egg-boiled' },
  { match: /\b(almonds?|nuts?|badam)\b/, foodId: 'f-almonds', alts: ['f-peanut-butter'] },
  { match: /\b(salad)\b/, foodId: 'f-chicken-salad', ambiguous: true },
  { match: /\b(bread|toast)\b/, foodId: 'f-bread-ww', ambiguous: true },
  { match: /\b(milk|doodh)\b/, foodId: 'f-milk-whole' },
  { match: /\b(paneer|cottage cheese)\b/, foodId: 'f-paneer' },
  { match: /\b(whey|protein shake|shake)\b/, foodId: 'f-whey' },
  { match: /\b(rajma|kidney beans?)\b/, foodId: 'f-rajma' },
  { match: /\b(poha)\b/, foodId: 'f-poha' },
  { match: /\b(spinach|palak)\b/, foodId: 'f-spinach' },
  { match: /\b(peanut butter)\b/, foodId: 'f-peanut-butter' },
  { match: /\b(curry)\b/, foodId: 'f-chicken-curry', ambiguous: true },
];

const NUMBER_WORDS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10, half: 0.5,
};

/** Words that name a vessel rather than a standard measure. */
const PERSONAL_UNITS = ['bowl', 'katori', 'plate', 'handful', 'glass', 'mug', 'piece'];

/** Vessels whose gram weight varies enough that a guess would be dishonest. */
const UNLEARNED_RANGE: Record<string, [number, number]> = {
  bowl: [150, 300],
  katori: [120, 200],
  plate: [200, 400],
  handful: [20, 45],
  glass: [180, 300],
  mug: [200, 350],
  piece: [30, 120],
};

function splitSegments(phrase: string): string[] {
  return phrase
    .toLowerCase()
    .split(/,|\band\b|\bwith\b|\bplus\b|\+/g)
    .map(s => s.trim())
    .filter(Boolean);
}

function findFood(segment: string) {
  for (const entry of LEXICON) if (entry.match.test(segment)) return entry;
  return null;
}

/**
 * Decide how the amount was expressed. Returning the *type* faithfully matters
 * more than returning a number — the type is what the sheet branches on, and a
 * confidently wrong gram value is the failure this product cannot afford.
 */
function readQuantity(segment: string, foodId: string): Quantity {
  const f = food(foodId);

  // "180 g", "180g", "200 ml" — the user stated a mass. Nothing to estimate.
  const mass = segment.match(/(\d+(?:\.\d+)?)\s*(g|gram|grams|ml)\b/);
  if (mass) {
    const grams = parseFloat(mass[1]);
    return { type: 'exact_mass', raw: `${mass[1]} ${mass[2] === 'ml' ? 'ml' : 'g'}`, grams, source: 'stated', range: null };
  }

  // "a bowl of dal", "two katoris" — a vessel, which means this user's vessel.
  for (const unit of PERSONAL_UNITS) {
    const re = new RegExp(`(\\d+|${Object.keys(NUMBER_WORDS).join('|')})?\\s*${unit}s?\\b`);
    const m = segment.match(re);
    if (!m) continue;
    const count = m[1] ? (NUMBER_WORDS[m[1]] ?? parseFloat(m[1])) : 1;
    const raw = count === 1 ? `a ${unit}` : `${m[1]} ${unit}s`;

    const learned = USER_PORTIONS.get(`${foodId}:${unit}`);
    if (learned) {
      // We have been told what their bowl is. Show it plainly, with no range.
      return { type: 'personal_unit', raw, grams: learned * count, source: 'user_portion', range: null };
    }
    // We have not. A range here is honesty; a silent 200 g is where a wrong week starts.
    const [lo, hi] = UNLEARNED_RANGE[unit];
    return { type: 'personal_unit', raw, grams: null, source: 'unknown', range: [lo * count, hi * count] };
  }

  // "a cup of rice", "2 slices" — a standard measure the food table carries.
  for (const portion of f.portions) {
    const unit = portion.label.replace(/^[\d½¼\s]+/, '').trim();
    if (!unit || unit === '100 g') continue;
    const re = new RegExp(`(\\d+|${Object.keys(NUMBER_WORDS).join('|')})?\\s*${unit}s?\\b`);
    const m = segment.match(re);
    if (!m) continue;
    const count = m[1] ? (NUMBER_WORDS[m[1]] ?? parseFloat(m[1])) : 1;
    return {
      type: 'standard_measure',
      raw: count === 1 ? `1 ${unit}` : `${count} ${unit}s`,
      grams: portion.grams * count,
      source: 'food_portion',
      range: null,
    };
  }

  // "two rotis", "3 eggs" — a count. The food table knows what one weighs.
  const countMatch = segment.match(
    new RegExp(`\\b(\\d+|${Object.keys(NUMBER_WORDS).filter(w => w !== 'a' && w !== 'an').join('|')})\\b`),
  );
  const unitPortion = f.portions.find(p => p.isDefault) ?? f.portions[0];
  if (countMatch && unitPortion) {
    const count = NUMBER_WORDS[countMatch[1]] ?? parseFloat(countMatch[1]);
    const noun = unitPortion.label.replace(/^1\s*/, '');
    return {
      type: 'count',
      raw: `${count} ${noun}${count === 1 ? '' : 's'}`,
      grams: unitPortion.grams * count,
      source: 'food_portion',
      range: null,
    };
  }

  // "some nuts", "dal" — nothing was said. Ask; never invent one.
  return { type: 'none_given', raw: segment, grams: null, source: 'unknown', range: null };
}

function buildItem(segment: string): ResolvedItem | null {
  const hit = findFood(segment);
  if (!hit) return null;

  const f = food(hit.foodId);
  const quantity = readQuantity(segment, hit.foodId);
  const candidates = [summary(f), ...(hit.alts ?? []).map(id => summary(food(id)))].slice(0, 8);

  return {
    itemId: uuid(),
    matchedText: segment,
    quantity,
    food: summary(f),
    candidates,
    confidence: hit.ambiguous ? 'low' : 'high',
    nutrients: quantity.grams === null ? null : scale(f.nutrients, quantity.grams),
  };
}

export function resolvePhrase(phrase: string, source: ResolveSource): ResolveDraft {
  const items: ResolvedItem[] = [];
  const unresolved: UnresolvedItem[] = [];

  for (const segment of splitSegments(phrase)) {
    const item = buildItem(segment);
    if (item) items.push(item);
    else unresolved.push({ text: segment });
  }

  return {
    draftId: uuid(),
    phrase,
    source,
    items,
    unresolved,
    aiRunId: uuid(),
    cached: false,
  };
}

/** Search the same corpus by name, for the scoped field on an unresolved row. */
export function searchByName(q: string) {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  const terms = needle.split(/\s+/);
  return FOODS.map(f => {
    const name = f.name.toLowerCase();
    let score = 0;
    for (const t of terms) {
      if (name.startsWith(t)) score += 3;
      else if (name.includes(t)) score += 2;
    }
    return { f, score };
  })
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(r => r.f);
}
