import type { CommitDraft, NutriCheckApi, RecentPhrase, RecentTile } from '../../src/api/client';
import type {
  DaySummary,
  FoodDetail,
  FoodSearchResult,
  Goal,
  LogEntry,
  Nutrients,
  UserProfile,
  WeekSummary,
} from '../../src/api/types';

/**
 * A flat `NutriCheckApi` for render tests.
 *
 * This replaced the stateful mock backend, which was deleted once the app moved
 * onto the real API. The two are not the same thing and this is deliberately
 * the lesser one: it holds no state, simulates no failures, and answers every
 * call with the same shapes. Screens under test need *an* implementation of the
 * seam, not a second backend.
 *
 * What it is for: proving every screen renders past its loading state, in both
 * colour schemes, with plausible data in it — the cheapest guard there is
 * against a null day or a token that only exists in light mode.
 *
 * What it is NOT for: asserting behaviour. Behaviour lives in `httpApi.test.ts`
 * against a stubbed `fetch`, which is the only place that can prove anything
 * about the transport.
 */

const nutrients = (
  kcal: number,
  proteinG: number,
  fiberG: number | null,
  carbsG: number | null = 20,
  fatG: number | null = 5,
): Nutrients => ({
  kcal,
  proteinG,
  carbsG,
  carbsState: carbsG === null ? 'unknown' : 'known',
  fatG,
  fatState: fatG === null ? 'unknown' : 'known',
  fiberG,
  fiberState: fiberG === null ? 'unknown' : 'known',
});

const ROTI: FoodDetail = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Roti, wheat',
  brand: null,
  kcalPer100g: 297,
  source: 'usda_sr',
  isGeneric: true,
  nutrients: { kcal: 297, proteinG: 11, carbsG: 49.7, carbsState: 'known', fatG: 3.7, fatState: 'known', fiberG: 4.9, fiberState: 'known' },
  portions: [
    { label: '1 roti', grams: 40, isDefault: true },
    { label: '100 g', grams: 100, isDefault: false },
  ],
};

const DAL: FoodDetail = {
  id: '22222222-2222-4222-8222-222222222222',
  name: 'Dal, toor, cooked',
  brand: null,
  kcalPer100g: 116,
  source: 'curated',
  // Curated dishes carry estimates, so this exercises the `~` path.
  isGeneric: true,
  nutrients: { kcal: 116, proteinG: 7.2, carbsG: 18.2, carbsState: 'imputed', fatG: 2.1, fatState: 'imputed', fiberG: 3.8, fiberState: 'imputed' },
  portions: [{ label: '1 bowl', grams: 150, isDefault: true }],
};

const FOODS = [ROTI, DAL];

const GOAL: Goal = {
  id: '33333333-3333-4333-8333-333333333333',
  kcal: 2100,
  proteinG: 130,
  carbsG: 240,
  fatG: 58,
  fiberG: 30,
  effectiveFrom: '2026-08-01',
  basis: { bmr: 1600, tdee: 2480, activityFactor: 1.55, adjustmentPct: -15, flooredAtBmr: false, fatPctOfKcal: 0.25 },
};

const PROFILE: UserProfile = {
  sex: 'male',
  birthDate: '1995-04-12',
  heightCm: 175,
  weightKg: 72,
  activityLevel: 'moderate',
  objective: 'lose',
  rateKgPerWeek: 0.5,
  units: 'metric',
};

const ENTRY: LogEntry = {
  id: '44444444-4444-4444-8444-444444444444',
  clientId: 'stub-entry-1',
  loggedAt: '2026-08-26T08:30:00.000Z',
  meal: 'breakfast',
  source: 'text',
  phrase: 'two rotis and dal',
  items: [
    {
      id: '55555555-5555-4555-8555-555555555555',
      food: ROTI,
      grams: 80,
      quantityType: 'count',
      quantitySource: 'food_portion',
      nutrients: nutrients(238, 8.8, 3.9),
    },
    {
      id: '66666666-6666-4666-8666-666666666666',
      food: DAL,
      grams: 150,
      quantityType: 'personal_unit',
      quantitySource: 'user_portion',
      // An unmeasured-fibre item, so the "N items unmeasured" note renders.
      nutrients: nutrients(174, 10.8, null),
    },
  ],
};

const day = (date: string): DaySummary => ({
  date,
  totals: { kcal: 412, proteinG: 19.6, carbsG: 58, fatG: 9, fiberG: 3.9, carbsUnmeasuredItems: 0, fatUnmeasuredItems: 0, fiberUnmeasuredItems: 1 },
  goal: { kcal: GOAL.kcal, proteinG: GOAL.proteinG, carbsG: GOAL.carbsG, fatG: GOAL.fatG, fiberG: GOAL.fiberG },
  entries: [ENTRY],
});

export function createStubApi(): NutriCheckApi {
  const session = {
    id: '77777777-7777-4777-8777-777777777777',
    email: 'stub@example.com',
    createdAt: '2026-07-01T00:00:00.000Z',
    onboarded: true,
  };
  const tokens = {
    accessToken: 'stub-access',
    refreshToken: 'stub-refresh',
    tokenType: 'Bearer' as const,
    expiresIn: 900,
  };

  return {
    register: async () => ({ user: { ...session, onboarded: false }, tokens }),
    login: async () => ({ user: session, tokens }),
    getSession: async () => session,
    logout: async () => {},

    // Never reached in a render test — the fallback only fires when the device
    // recogniser fails, which Jest has no recogniser to do.
    transcribe: async ({ locale }) => ({
      text: 'two rotis and dal',
      locale,
      model: 'stub',
      latencyMs: 0,
    }),

    getProfile: async () => PROFILE,
    saveProfile: async (p: UserProfile) => p,
    previewGoal: async () => GOAL,
    getGoal: async () => GOAL,
    setGoal: async () => GOAL,

    getDay: async (date: string) => day(date),
    getWeek: async (endingOn: string): Promise<WeekSummary> => ({
      from: '2026-08-20',
      to: endingOn,
      days: Array.from({ length: 7 }, (_, i) => ({
        date: `2026-08-${20 + i}`,
        kcal: 1800 + i * 40,
        proteinG: 110,
        carbsG: 200,
        fatG: 55,
        fiberG: 24,
        // One unlogged day, so the chart's gap state is exercised.
        logged: i !== 3,
      })),
      goal: { kcal: GOAL.kcal, proteinG: GOAL.proteinG, carbsG: GOAL.carbsG, fatG: GOAL.fatG, fiberG: GOAL.fiberG },
      averages: { kcal: 1920, proteinG: 110, carbsG: 200, fatG: 55, fiberG: 24 },
      streakDays: 3,
    }),

    searchFoods: async (q: string): Promise<FoodSearchResult[]> =>
      FOODS.filter(f => f.name.toLowerCase().includes(q.toLowerCase().trim()) || !q.trim()).map(f => ({
        id: f.id,
        name: f.name,
        brand: f.brand,
        kcalPer100g: f.kcalPer100g,
        proteinPer100g: f.nutrients.proteinG,
        familiarity: 'logged',
        defaultPortion: f.portions.find(p => p.isDefault) ?? null,
      })),
    getFood: async (id: string) => FOODS.find(f => f.id === id) ?? ROTI,
    createFood: async () => ROTI,

    /**
     * Three items, one per branch the confirm sheet has to render:
     *
     * 1. **Resolved and measured** — the ordinary row.
     * 2. **Ambiguous** — `confidence: 'low'` with runners-up, which is what puts
     *    "Which dal?" and the expander on screen.
     * 3. **No amount given** — `grams: null`, and therefore `nutrients: null`.
     *    That pairing is invariant #2: the sheet must ask "How much?" rather
     *    than quietly assume 100 g.
     *
     * `onParsed` fires on a timer, not inline. Firing it synchronously would
     * mean the skeletons never render, and "the sheet is up before the resolver
     * answers" is precisely what the test exists to prove.
     */
    resolve: async (phrase, source, onParsed) => {
      const draft = {
        draftId: '88888888-8888-4888-8888-888888888888',
        phrase,
        source,
        items: [
          {
            itemId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
            matchedText: 'two rotis',
            quantity: {
              type: 'count' as const,
              raw: 'two rotis',
              grams: 80,
              source: 'food_portion' as const,
              range: null,
            },
            food: { id: ROTI.id, name: 'Roti, plain', brand: null, kcalPer100g: ROTI.kcalPer100g },
            candidates: [],
            confidence: 'high' as const,
            nutrients: nutrients(238, 8.8, 3.9),
          },
          {
            itemId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
            matchedText: 'dal',
            quantity: {
              type: 'none_given' as const,
              raw: 'dal',
              grams: null,
              source: 'unknown' as const,
              range: null,
            },
            food: { id: DAL.id, name: 'Dal, toor, cooked', brand: null, kcalPer100g: DAL.kcalPer100g },
            candidates: [
              { id: DAL.id, name: 'Dal, toor, cooked', brand: null, kcalPer100g: 116 },
              { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', name: 'Dal, moong, cooked', brand: null, kcalPer100g: 105 },
              { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', name: 'Dal, masoor, cooked', brand: null, kcalPer100g: 120 },
            ],
            confidence: 'low' as const,
            nutrients: null,
          },
          {
            itemId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
            matchedText: 'a bowl of curd',
            quantity: {
              type: 'personal_unit' as const,
              raw: 'a bowl',
              grams: null,
              source: 'unknown' as const,
              // An unlearned personal unit gets a range, never a number.
              range: [120, 250] as [number, number],
            },
            food: { id: 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1', name: 'Curd, plain', brand: null, kcalPer100g: 60 },
            candidates: [],
            confidence: 'high' as const,
            nutrients: null,
          },
        ],
        unresolved: [],
        aiRunId: null,
        cached: false,
      };

      await new Promise<void>(r => setTimeout(r, 250));
      onParsed?.(draft);
      return draft;
    },

    commit: async (entry: CommitDraft) => ({ ...ENTRY, clientId: entry.clientId }),
    deleteEntry: async () => {},
    updateItemGrams: async () => ENTRY,

    getRecents: async (): Promise<RecentTile[]> => [
      {
        kind: 'food',
        id: 'recent-1',
        food: { id: ROTI.id, name: ROTI.name, brand: null, kcalPer100g: ROTI.kcalPer100g },
        grams: 40,
        portionLabel: '1 roti',
        nutrients: nutrients(119, 4.4, 2),
        quantityType: 'count',
        quantitySource: 'food_portion',
      },
    ],
    getPhrases: async (): Promise<RecentPhrase[]> => [
      {
        id: 'phrase-1',
        phrase: 'two rotis and dal',
        kcal: 412,
        savedAs: null,
        lastUsedAt: '2026-08-25T08:30:00.000Z',
      },
    ],
  };
}
