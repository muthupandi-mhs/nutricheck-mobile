import type { CommitDraft, NutriCheckApi, RecentPhrase, RecentTile } from '../../src/api/client';
import type {
  DaySummary,
  FoodIdeas,
  FoodDetail,
  FoodSearchResult,
  Goal,
  LogEntry,
  MonthSummary,
  Nutrients,
  UserProfile,
  WeekSummary,
  WeightSeries,
  FastingSummary,
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
 * What it is for: proving every screen renders past its loading state with
 * plausible data in it — the cheapest guard there is against a null day or a
 * token renamed under a screen nobody had open.
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

  const WEIGHT: WeightSeries = {
    points: Array.from({ length: 8 }, (_, i) => ({
      date: `2026-0${i < 4 ? 7 : 8}-${String(i < 4 ? 8 + i * 7 : (i - 4) * 7 + 5).padStart(2, '0')}`,
      weightKg: Number((82 - i * 0.4).toFixed(1)),
    })),
    current: { date: '2026-08-26', weightKg: 79.2 },
    start: { date: '2026-07-08', weightKg: 82 },
    trend: { kgPerWeek: -0.4, deltaKg: -2.8, spanDays: 49, intendedKgPerWeek: -0.5 },
  };

  /**
   * Fasting times are relative to the clock, not literal like the weight dates
   * above, and they have to be: a fixed `startedAt` would read as "fourteen
   * hours in" only on the afternoon it was written, and as a fast running for
   * eight months by the time anybody ran the suite again.
   */
  const NOW = new Date().toISOString();
  const hoursAgo = (h: number): string => new Date(Date.now() - h * 3_600_000).toISOString();

  const openFast = (hoursIn: number) => ({
    id: '00000000-0000-4000-8000-000000000001',
    startedAt: hoursAgo(hoursIn),
    endedAt: null,
    targetHours: 16,
    // Null on an open fast is the contract, not a gap in the stub: the screen
    // computes the running length from `startedAt` against its own clock.
    hours: null,
    reachedTarget: null,
  });

  const FASTING: FastingSummary = {
    current: openFast(14),
    recent: [
      {
        id: '00000000-0000-4000-8000-000000000002',
        startedAt: hoursAgo(40),
        endedAt: hoursAgo(23),
        targetHours: 16,
        hours: 17,
        reachedTarget: true,
      },
      {
        id: '00000000-0000-4000-8000-000000000003',
        startedAt: hoursAgo(64),
        endedAt: hoursAgo(51),
        targetHours: 16,
        hours: 13,
        reachedTarget: false,
      },
      {
        id: '00000000-0000-4000-8000-000000000004',
        startedAt: hoursAgo(88),
        endedAt: hoursAgo(70),
        targetHours: 16,
        hours: 18,
        reachedTarget: true,
      },
    ],
    stats: { completed: 3, reached: 2, longestHours: 18, averageHours: 16 },
    lastTargetHours: 16,
  };

  return {
    // Unregistered by default: the stub's job is to let screens render, and the
    // sign-up half of the flow is the one with more on it to draw.
    checkEmail: async () => ({ registered: false }),
  // A suggestion that changed nothing, which is both the common real answer
  // and the one that leaves the derived figures on screen to assert against.
  suggestTargets: async () => ({
    kcal: 2100,
    proteinG: 130,
    carbsG: 233,
    fatG: 58,
    fiberG: 29,
    reasoning: 'The standard calculation fits you well.',
    corrections: [],
  }),
    register: async () => ({ user: { ...session, onboarded: false }, tokens }),
    login: async () => ({ user: session, tokens }),
    // Returns an ONBOARDED user, unlike `register`. A Google sign-in is far
    // more often a returning account than a new one — it is the one door
    // somebody who already has an account reaches for without thinking.
    signInWithGoogle: async () => ({ user: session, tokens }),
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

    /**
     * Eight readings a week apart, drifting down — enough for the chart to draw
     * a line, the fit to have a slope, and the pace note to have something to
     * compare against. A single reading would render the screen's other half.
     */
    getWeightSeries: async (): Promise<WeightSeries> => WEIGHT,
    logWeight: async ({ weightKg }: { weightKg: number }): Promise<WeightSeries> => ({
      ...WEIGHT,
      current: { date: '2026-08-26', weightKg },
    }),

    deleteWeight: async (): Promise<WeightSeries> => ({
      ...WEIGHT,
      points: WEIGHT.points.slice(0, -1),
    }),

    /**
     * A fast fourteen hours in, with three finished ones behind it.
     *
     * Running rather than idle, because the running state is the one with
     * something on it: a ticking clock, an arc, a projected finish, an end
     * button, and a record to compare against. `current: null` would draw the
     * plan picker and leave all of that unexercised.
     */
    getFasting: async (): Promise<FastingSummary> => FASTING,
    startFast: async ({ targetHours }: { targetHours: number }): Promise<FastingSummary> => ({
      ...FASTING,
      current: { ...openFast(0), targetHours },
      lastTargetHours: targetHours,
    }),
    adjustFast: async ({ targetHours }: { targetHours?: number }): Promise<FastingSummary> => ({
      ...FASTING,
      current: { ...FASTING.current!, targetHours: targetHours ?? FASTING.current!.targetHours },
    }),
    endFast: async (): Promise<FastingSummary> => ({
      ...FASTING,
      current: null,
      recent: [{ ...FASTING.current!, endedAt: NOW, hours: 14, reachedTarget: false }, ...FASTING.recent],
    }),
    discardFast: async (): Promise<FastingSummary> => ({ ...FASTING, current: null }),

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
    /**
     * The corpus-free path returns one estimated item, and 'ai' as its source.
     * Deliberately different from the resolve stub above: a screen that renders
     * these identically to measured foods is a screen with a bug, and a fixture
     * that made them look the same could never catch it.
     */
    // The assistant answers, and answers nothing: a stub that logged a meal
    // on every message would make every screen test that opens the sheet
    // navigate somewhere.
    chat: async () => ({ text: 'I can only see today.', log: null }),
    interpretMeal: async (phrase: string) => ({
      draftId: '77777777-7777-4777-8777-777777777777',
      phrase,
      summary: 'Five dosai — about 504 kcal.',
      items: [
        {
          food: {
            id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
            name: 'Dosai, plain',
            brand: null,
            kcalPer100g: 168,
          },
          spokenAs: 'dosai',
          quantity: 5,
          unit: 'dosai',
          grams: 300,
          kcal: 504,
          proteinG: 11.7,
          carbsG: 82.2,
          fatG: 16.5,
          fiberG: 3.6,
          confidence: 'high' as const,
        },
      ],
      unresolved: [],
      totals: { kcal: 504, proteinG: 11.7, carbsG: 82.2, fatG: 16.5, fiberG: 3.6 },
      estimated: true as const,
    }),

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
    /**
     * A note with plausible numbers and no prose.
     *
     * Empty `text` is the shape a real server returns whenever the model is
     * unavailable, so this is the honest default for a render fixture — and it
     * exercises the branch where the card shows facts and stays quiet.
     */
    getMealInsight: async (date, meal) => ({
      facts: {
        meal,
        date,
        entryCount: 1,
        kcal: { amount: 236, target: 1700, percentOfTarget: 14, unmeasuredItems: 0 },
        proteinG: { amount: 37.5, target: 145, percentOfTarget: 26, unmeasuredItems: 0 },
        carbsG: { amount: 18, target: 145, percentOfTarget: 12, unmeasuredItems: 0 },
        fatG: { amount: 9, target: 60, percentOfTarget: 15, unmeasuredItems: 0 },
        fiberG: { amount: null, target: 35, percentOfTarget: null, unmeasuredItems: 1 },
        remaining: { kcal: 1464, proteinG: 107.5, carbsG: 127, fatG: 51, fiberG: 35 },
      },
      text: '',
      cached: false,
      model: null,
    }),

    /**
     * Two ideas with plausible estimates, and a note.
     *
     * Unlike the insight fixture, this one is NOT empty. An empty ideas list
     * renders the screen's degraded state, which would leave the card layout
     * — the part most likely to break under a renamed token — unrendered by
     * every test that claims to render every screen.
     */
    getFoodIdeas: async (date: string): Promise<FoodIdeas> => ({
      date,
      remaining: { kcal: 640, proteinG: 48, carbsG: 70, fatG: 22, fiberG: 12 },
      ideas: [
        {
          food: {
            id: 'idea-curd',
            name: 'Curd, plain',
            brand: null,
            kcalPer100g: 98,
          },
          reason: 'A cup covers a fifth of the protein you have left, for under 200 calories.',
          grams: 200,
          servingLabel: '1 cup',
          kcal: 196,
          proteinG: 22,
          carbsG: 6.8,
          fatG: 8.6,
          fiberG: 0,
          confidence: 'high',
        },
        {
          food: {
            id: 'idea-chana',
            name: 'Chana, boiled',
            brand: null,
            kcalPer100g: 164,
          },
          reason: 'Most of the fibre you are short of, and it does not crowd the calories.',
          grams: 150,
          servingLabel: '1 bowl',
          kcal: 246,
          proteinG: 13.4,
          carbsG: 41.1,
          fatG: 3.9,
          fiberG: 11.4,
          confidence: 'low',
        },
      ],
      note: 'You have most of the evening left and are short on protein.',
      estimated: true,
      cached: false,
    }),
    /**
     * A month with a few logged days in it, not an empty one.
     *
     * An empty month renders the calendar grid with every cell uncoloured,
     * which is the one layout least likely to catch a regression in the part
     * that matters -- the banding. These three days sit on either side of
     * both thresholds on a 2,000 kcal target.
     */
    getMonth: async (anyDayInMonth: string): Promise<MonthSummary> => {
      const month = anyDayInMonth.slice(0, 7);
      const days = Array.from({ length: 30 }, (_, i) => {
        const date = month + '-' + String(i + 1).padStart(2, '0');
        // 2,050 -> on target. 1,400 -> close. 900 -> well off.
        const kcal = i === 3 ? 2050 : i === 4 ? 1400 : i === 5 ? 900 : 0;
        return {
          date,
          kcal,
          proteinG: kcal ? 90 : 0,
          carbsG: kcal ? 180 : 0,
          fatG: kcal ? 60 : 0,
          fiberG: kcal ? 20 : 0,
          logged: kcal > 0,
        };
      });
      return {
        from: month + '-01',
        to: month + '-30',
        days,
        goal: { kcal: 2000, proteinG: 145, carbsG: 200, fatG: 65, fiberG: 35 },
        loggedDays: days.filter(d => d.logged).length,
      };
    },
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
