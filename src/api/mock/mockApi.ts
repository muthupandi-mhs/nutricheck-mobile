import { addDays, localDate, mealSlotFor } from '../../lib/format';
import { uuid } from '../../lib/id';
import { deriveGoal, scale, total } from '../../lib/nutrition';
import type { CommitDraft, NutriCheckApi, RecentPhrase, RecentTile } from '../client';
import {
  ApiError,
  OfflineError,
  type CreateCustomFood,
  type DaySummary,
  type FoodDetail,
  type FoodSearchResult,
  type Goal,
  type LogEntry,
  type LogItem,
  type ResolveSource,
  type SetGoal,
  type UserProfile,
  type WeekSummary,
} from '../types';
import {
  CUSTOM_FOOD_IDS,
  DEFAULT_PROFILE,
  FOODS,
  FOOD_BY_ID,
  LOGGED_FOOD_IDS,
  USER_PORTIONS,
  food,
  summary,
} from './db';
import { resolvePhrase } from './resolver';
import { LATENCY, getScenario, sleep } from './scenarios';

/**
 * An in-memory NutriCheck backend.
 *
 * It holds real state — commits land, undo removes them, a portion edit trains
 * `user_portions` and the next parse of the same word gets it right. That is
 * deliberate: a fixture that only ever returns the same canned day cannot show
 * whether the interaction design actually works over a session.
 *
 * Delete this directory when `httpApi` lands. Nothing outside `src/api/mock`
 * imports from it.
 */

const today = localDate();

function makeItem(
  f: FoodDetail,
  grams: number,
  quantityType: LogItem['quantityType'],
  quantitySource: LogItem['quantitySource'],
): LogItem {
  return {
    id: uuid(),
    food: summary(f),
    grams,
    quantityType,
    quantitySource,
    nutrients: scale(f.nutrients, grams),
  };
}

function at(hour: number, minute: number, dayOffset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

/** Today, mid-afternoon: two meals in, one snack, one unmeasured-fiber item. */
function seedToday(): LogEntry[] {
  return [
    {
      id: uuid(),
      clientId: uuid(),
      loggedAt: at(8, 12),
      meal: 'breakfast',
      source: 'repeat',
      phrase: null,
      items: [
        makeItem(food('f-oats'), 80, 'standard_measure', 'food_portion'),
        makeItem(food('f-banana'), 118, 'count', 'food_portion'),
        makeItem(food('f-coffee-milk'), 200, 'standard_measure', 'food_portion'),
      ],
    },
    {
      id: uuid(),
      clientId: uuid(),
      loggedAt: at(13, 5),
      meal: 'lunch',
      source: 'text',
      phrase: 'grilled chicken thigh, two rotis and a bowl of dal',
      items: [
        makeItem(food('f-chicken-thigh-grilled'), 180, 'exact_mass', 'stated'),
        makeItem(food('f-roti'), 180, 'count', 'food_portion'),
        makeItem(food('f-dal-toor'), 210, 'personal_unit', 'user_portion'),
      ],
    },
    {
      id: uuid(),
      clientId: uuid(),
      loggedAt: at(16, 40),
      meal: 'snack',
      source: 'search',
      phrase: null,
      items: [makeItem(food('f-curd'), 150, 'personal_unit', 'user_portion')],
    },
  ];
}

/** Six prior days, so the week view and the streak have something to say. */
function seedHistory(): Record<string, LogEntry[]> {
  const out: Record<string, LogEntry[]> = {};
  const plans: Array<Array<[string, number]>> = [
    [['f-oats', 80], ['f-egg-boiled', 100], ['f-chicken-breast', 174], ['f-rice-white', 200], ['f-dal-toor', 210], ['f-apple', 182]],
    [['f-poha', 180], ['f-coffee-milk', 200], ['f-chicken-curry', 240], ['f-roti', 180], ['f-curd', 150]],
    [['f-bread-ww', 64], ['f-peanut-butter', 32], ['f-chicken-salad', 320], ['f-almonds', 28], ['f-rajma', 200], ['f-rice-white', 158]],
    [['f-greek-yogurt', 170], ['f-banana', 118], ['f-paneer', 100], ['f-roti', 270], ['f-spinach', 180]],
    [['f-oats', 80], ['f-whey', 30], ['f-chicken-thigh-grilled', 180], ['f-rice-white', 200], ['f-dal-moong', 210]],
    [['f-egg-boiled', 100], ['f-bread-ww', 64], ['f-chicken-breast', 174], ['f-rajma', 200], ['f-flat-white', 180], ['f-almonds', 28]],
  ];

  plans.forEach((plan, i) => {
    const offset = -(i + 1);
    const date = addDays(today, offset);
    out[date] = plan.map((pair, n) => {
      const [id, grams] = pair;
      const hour = [8, 11, 13, 16, 19, 21][n % 6];
      return {
        id: uuid(),
        clientId: uuid(),
        loggedAt: at(hour, 15, offset),
        meal: mealSlotFor(new Date(2020, 0, 1, hour)),
        source: n % 3 === 0 ? 'repeat' : n % 3 === 1 ? 'text' : 'search',
        phrase: null,
        items: [makeItem(food(id), grams, 'standard_measure', 'food_portion')],
      } satisfies LogEntry;
    });
  });
  return out;
}

export function createMockApi(): NutriCheckApi {
  let profile: UserProfile | null = DEFAULT_PROFILE;
  let goalOverride: SetGoal | null = null;
  const days: Record<string, LogEntry[]> = { [today]: seedToday(), ...seedHistory() };
  const customFoods: FoodDetail[] = [];

  const phrases: RecentPhrase[] = [
    { id: uuid(), phrase: 'usual breakfast', kcal: 450, savedAs: 'Usual breakfast', lastUsedAt: at(8, 12) },
    { id: uuid(), phrase: 'chicken salad and a flat white', kcal: 433, savedAs: null, lastUsedAt: at(13, 20, -2) },
    { id: uuid(), phrase: 'two rotis, dal and a bowl of curd', kcal: 573, savedAs: null, lastUsedAt: at(20, 5, -1) },
    { id: uuid(), phrase: 'protein shake after the gym', kcal: 112, savedAs: null, lastUsedAt: at(18, 40, -3) },
  ];

  const isFirstRun = () => getScenario() === 'firstRun';

  const currentGoal = (): Goal => {
    const base = deriveGoal(profile ?? DEFAULT_PROFILE);
    if (!goalOverride) return base;
    return {
      ...base,
      kcal: goalOverride.kcal ?? base.kcal,
      proteinG: goalOverride.proteinG ?? base.proteinG,
      fiberG: goalOverride.fiberG ?? base.fiberG,
    };
  };

  const entriesFor = (date: string): LogEntry[] => (isFirstRun() ? [] : (days[date] ?? []));

  const daySummary = (date: string): DaySummary => {
    const entries = entriesFor(date);
    const t = total(entries.flatMap(e => e.items.map(i => i.nutrients)));
    const goal = currentGoal();
    return {
      date,
      totals: t,
      goal: { kcal: goal.kcal, proteinG: goal.proteinG, fiberG: goal.fiberG },
      entries: [...entries].sort((a, b) => a.loggedAt.localeCompare(b.loggedAt)),
    };
  };

  const allFoods = (): FoodDetail[] => [...customFoods, ...FOODS];

  return {
    async getProfile() {
      await sleep(LATENCY.read);
      return isFirstRun() ? null : profile;
    },

    async saveProfile(next) {
      await sleep(LATENCY.commit);
      profile = next;
      return next;
    },

    async previewGoal(next) {
      // Local arithmetic in the real API too — the preview endpoint exists so the
      // client never has to reimplement the formula and drift from the server.
      await sleep(120);
      return deriveGoal(next);
    },

    async getGoal() {
      await sleep(LATENCY.read);
      return currentGoal();
    },

    async setGoal(patch) {
      await sleep(LATENCY.commit);
      goalOverride = { ...goalOverride, ...patch };
      return currentGoal();
    },

    async getDay(date) {
      await sleep(LATENCY.read);
      return daySummary(date);
    },

    async getWeek(endingOn) {
      await sleep(LATENCY.read);
      const goal = currentGoal();
      const points = Array.from({ length: 7 }, (_, i) => {
        const date = addDays(endingOn, i - 6);
        const t = total(entriesFor(date).flatMap(e => e.items.map(x => x.nutrients)));
        return { date, kcal: t.kcal, proteinG: t.proteinG, fiberG: t.fiberG, logged: entriesFor(date).length > 0 };
      });
      const logged = points.filter(p => p.logged);
      const avg = (pick: (p: (typeof points)[number]) => number) =>
        logged.length ? logged.reduce((s, p) => s + pick(p), 0) / logged.length : 0;

      let streakDays = 0;
      for (let i = points.length - 1; i >= 0 && points[i].logged; i--) streakDays += 1;

      return {
        from: points[0].date,
        to: endingOn,
        days: points,
        goal: { kcal: goal.kcal, proteinG: goal.proteinG, fiberG: goal.fiberG },
        averages: { kcal: avg(p => p.kcal), proteinG: avg(p => p.proteinG), fiberG: avg(p => p.fiberG) },
        streakDays,
      } satisfies WeekSummary;
    },

    async searchFoods(q) {
      await sleep(LATENCY.search);
      if (getScenario() === 'emptySearch') return [];
      const needle = q.trim().toLowerCase();
      if (!needle) return [];
      const terms = needle.split(/\s+/);

      return allFoods()
        .map(f => {
          const name = f.name.toLowerCase();
          let score = 0;
          for (const t of terms) {
            if (name.startsWith(t)) score += 4;
            else if (new RegExp(`\\b${t}`).test(name)) score += 3;
            else if (name.includes(t)) score += 1;
          }
          if (score === 0) return null;
          // The user's own history and custom foods outrank generic database rows.
          if (CUSTOM_FOOD_IDS.has(f.id)) score += 8;
          else if (LOGGED_FOOD_IDS.has(f.id) && !isFirstRun()) score += 5;
          return { f, score };
        })
        .filter((r): r is { f: FoodDetail; score: number } => r !== null)
        .sort((a, b) => b.score - a.score)
        .slice(0, 12)
        .map(({ f }): FoodSearchResult => {
          const learnedGrams = [...USER_PORTIONS.entries()].find(([k]) => k.startsWith(`${f.id}:`))?.[1];
          const defaultPortion = f.portions.find(p => p.isDefault) ?? null;
          return {
            id: f.id,
            name: f.name,
            brand: f.brand,
            kcalPer100g: f.kcalPer100g,
            proteinPer100g: f.nutrients.proteinG,
            familiarity: CUSTOM_FOOD_IDS.has(f.id)
              ? 'custom'
              : LOGGED_FOOD_IDS.has(f.id) && !isFirstRun()
                ? 'logged'
                : 'none',
            defaultPortion: learnedGrams
              ? { label: 'your usual portion', grams: learnedGrams, isDefault: true }
              : defaultPortion,
          };
        });
    },

    async getFood(id) {
      await sleep(LATENCY.search);
      const f = customFoods.find(c => c.id === id) ?? FOOD_BY_ID.get(id);
      if (!f) throw new ApiError({ type: 'not-found', title: 'Food not found', status: 404 });
      return f;
    },

    async createFood(input: CreateCustomFood) {
      await sleep(LATENCY.commit);
      const created: FoodDetail = {
        id: uuid(),
        name: input.name,
        brand: input.brand,
        kcalPer100g: input.per100g.kcal,
        source: 'user',
        isGeneric: false,
        nutrients: input.per100g,
        portions: input.defaultPortionGrams
          ? [{ label: 'your portion', grams: input.defaultPortionGrams, isDefault: true }]
          : [{ label: '100 g', grams: 100, isDefault: true }],
      };
      customFoods.unshift(created);
      CUSTOM_FOOD_IDS.add(created.id);
      return created;
    },

    async resolve(phrase, source: ResolveSource, onParsed) {
      const scenario = getScenario();
      if (scenario === 'offline') {
        await sleep(700);
        throw new OfflineError();
      }
      if (scenario === 'quotaExhausted') {
        await sleep(200);
        const resetAt = new Date(Date.now() + 4 * 3600_000).toISOString();
        throw new ApiError({
          type: 'quota-exhausted',
          title: 'Daily AI limit reached',
          status: 429,
          detail: 'Search and one-tap repeats are unaffected.',
          resetAt,
        });
      }
      if (scenario === 'resolverTimeout') {
        // One silent retry, then stop — the client must not spin forever.
        await sleep(LATENCY.resolve * 1.4);
        throw new ApiError({
          type: 'resolver-timeout',
          title: 'That took too long',
          status: 504,
          detail: 'We tried twice. Your words are kept.',
        });
      }

      const draft = resolvePhrase(phrase, source);

      if (scenario === 'nothingParsed' || (draft.items.length === 0 && draft.unresolved.length > 0)) {
        await sleep(LATENCY.resolve * 0.6);
        throw new ApiError({
          type: 'resolver-refused',
          title: "We couldn't read that",
          status: 422,
          detail: 'Nothing in the phrase matched a food.',
        });
      }

      // Frame one: the parse. Items exist, quantities are known, foods are not.
      await sleep(LATENCY.resolve * 0.35);
      onParsed?.({
        ...draft,
        items: draft.items.map(i => ({ ...i, food: null, candidates: [], nutrients: null })),
      });

      // Frame two: the database match.
      await sleep(LATENCY.resolve * 0.65);
      return draft;
    },

    async commit(input: CommitDraft) {
      if (getScenario() === 'offline') {
        await sleep(600);
        throw new OfflineError();
      }
      await sleep(LATENCY.commit);

      const entry: LogEntry = {
        id: uuid(),
        clientId: input.clientId,
        loggedAt: input.loggedAt,
        meal: input.meal,
        source: input.source,
        phrase: input.phrase,
        items: input.items.map(i => ({
          id: uuid(),
          food: i.food,
          grams: i.grams,
          quantityType: i.quantityType,
          quantitySource: i.quantitySource,
          nutrients: i.nutrients,
        })),
      };

      const date = localDate(new Date(input.loggedAt));
      days[date] = [...(days[date] ?? []), entry];

      // Every correction is training data: a personal unit the user just fixed
      // becomes the remembered portion for the next parse of the same word.
      for (const item of input.items) {
        if (item.learnedUnitLabel) {
          USER_PORTIONS.set(`${item.food.id}:${item.learnedUnitLabel}`, item.grams);
        }
        LOGGED_FOOD_IDS.add(item.food.id);
      }

      if (input.phrase) {
        const existing = phrases.find(p => p.phrase === input.phrase);
        const kcal = input.items.reduce((s, i) => s + i.nutrients.kcal, 0);
        if (existing) {
          existing.lastUsedAt = input.loggedAt;
          existing.kcal = kcal;
          // Second use is when a phrase is worth offering as a saved meal.
          if (!existing.savedAs) existing.savedAs = null;
        } else {
          phrases.unshift({ id: uuid(), phrase: input.phrase, kcal, savedAs: null, lastUsedAt: input.loggedAt });
        }
      }

      return entry;
    },

    async deleteEntry(id) {
      await sleep(200);
      for (const date of Object.keys(days)) {
        days[date] = days[date].filter(e => e.id !== id);
      }
    },

    async updateItemGrams(entryId, itemId, grams) {
      await sleep(LATENCY.commit);
      for (const date of Object.keys(days)) {
        const entry = days[date].find(e => e.id === entryId);
        if (!entry) continue;
        entry.items = entry.items.map(item => {
          if (item.id !== itemId) return item;
          const detail = FOOD_BY_ID.get(item.food.id) ?? customFoods.find(c => c.id === item.food.id);
          return {
            ...item,
            grams,
            quantitySource: 'stated',
            nutrients: detail ? scale(detail.nutrients, grams) : item.nutrients,
          };
        });
        return entry;
      }
      throw new ApiError({ type: 'not-found', title: 'Entry not found', status: 404 });
    },

    async getRecents(): Promise<RecentTile[]> {
      await sleep(LATENCY.read);
      if (isFirstRun()) return [];

      const breakfast: RecentTile = {
        kind: 'meal',
        id: 'meal-usual-breakfast',
        name: 'Usual breakfast',
        items: [
          ['f-oats', 80, '1 cup'],
          ['f-banana', 118, '1 medium'],
          ['f-coffee-milk', 200, '1 mug'],
        ].map(pair => {
          const [id, grams, label] = pair as [string, number, string];
          const f = food(id);
          return {
            food: summary(f),
            grams,
            portionLabel: label,
            nutrients: scale(f.nutrients, grams),
            quantityType: 'standard_measure' as const,
            quantitySource: 'food_portion' as const,
          };
        }),
      };

      const singles: RecentTile[] = (
        [
          ['f-dal-toor', 210, 'your bowl', 'personal_unit', 'user_portion'],
          ['f-greek-yogurt', 170, '1 pot', 'standard_measure', 'food_portion'],
          ['f-chicken-thigh-grilled', 180, '180 g', 'exact_mass', 'stated'],
          ['f-almonds', 28, '1 handful', 'standard_measure', 'food_portion'],
          ['f-roti', 90, '1 roti', 'count', 'food_portion'],
          ['f-coffee-milk', 200, '1 mug', 'standard_measure', 'food_portion'],
        ] as const
      ).map(([id, grams, label, qt, qs]) => {
        const f = food(id);
        return {
          kind: 'food',
          id: `recent-${id}`,
          food: summary(f),
          grams,
          portionLabel: label,
          nutrients: scale(f.nutrients, grams),
          quantityType: qt,
          quantitySource: qs,
        };
      });

      return [breakfast, ...singles];
    },

    async getPhrases() {
      await sleep(LATENCY.read);
      return isFirstRun() ? [] : phrases.slice(0, 6);
    },
  };
}
