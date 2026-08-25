/**
 * Wire types — a hand-mirrored copy of `packages/contracts/src/*`.
 *
 * The app is a standalone RN project today (see the repo README, "Mobile"), so
 * it cannot import `@nutricheck/contracts` yet. When it moves to `apps/mobile`
 * this file is deleted and replaced by:
 *
 *     export type { ... } from '@nutricheck/contracts';
 *
 * Until then: every shape below is the contract's inferred type. Change one
 * here only by changing the Zod schema first.
 */

// ── nutrition ────────────────────────────────────────────────────────────────

/** Fiber has three states, not two. `unknown` is excluded from the denominator. */
export type FiberState = 'known' | 'imputed' | 'unknown';

export type Nutrients = {
  kcal: number;
  proteinG: number;
  /** null if and only if fiberState is 'unknown'. */
  fiberG: number | null;
  fiberState: FiberState;
};

/** How the amount was expressed. Drives every branch of the confirm sheet. */
export type QuantityType =
  | 'exact_mass'
  | 'count'
  | 'standard_measure'
  | 'personal_unit'
  | 'none_given';

export type QuantitySource = 'stated' | 'food_portion' | 'user_portion' | 'unknown';

export type Quantity = {
  type: QuantityType;
  raw: string;
  /** null exactly when the amount is unknown. Nothing substitutes a default. */
  grams: number | null;
  source: QuantitySource;
  /** Non-null ONLY for a personal unit this user has not taught us yet. */
  range: [number, number] | null;
};

// ── food ─────────────────────────────────────────────────────────────────────

export type FoodSource =
  | 'usda_foundation'
  | 'usda_sr'
  | 'usda_fndds'
  | 'off'
  | 'curated'
  | 'user';

export type FoodPortion = { label: string; grams: number; isDefault: boolean };

export type FoodSummary = {
  id: string;
  name: string;
  brand: string | null;
  kcalPer100g: number;
};

export type FoodNutrientsPer100g = {
  kcal: number;
  proteinG: number;
  fiberG: number | null;
  fiberState: FiberState;
};

export type FoodDetail = FoodSummary & {
  source: FoodSource;
  isGeneric: boolean;
  nutrients: FoodNutrientsPer100g;
  portions: FoodPortion[];
};

export type FoodSearchResult = FoodSummary & {
  proteinPer100g: number;
  familiarity: 'custom' | 'logged' | 'none';
  defaultPortion: FoodPortion | null;
};

export type CreateCustomFood = {
  name: string;
  brand: string | null;
  per100g: FoodNutrientsPer100g;
  defaultPortionGrams: number | null;
};

// ── resolve ──────────────────────────────────────────────────────────────────

export type LogSource = 'text' | 'voice' | 'search' | 'repeat' | 'photo';
export type ResolveSource = 'text' | 'voice';

export type ResolvedItem = {
  itemId: string;
  /** The span of the original phrase this item came from. */
  matchedText: string;
  quantity: Quantity;
  food: FoodSummary | null;
  /**
   * The rows the re-rank chose from — shipped on every item, so the runner-up
   * expander is instant instead of a second request.
   */
  candidates: FoodSummary[];
  confidence: 'high' | 'low';
  /** null exactly when quantity.grams is null. */
  nutrients: Nutrients | null;
};

export type UnresolvedItem = { text: string };

export type ResolveDraft = {
  draftId: string;
  phrase: string;
  source: ResolveSource;
  items: ResolvedItem[];
  unresolved: UnresolvedItem[];
  aiRunId: string | null;
  cached: boolean;
};

// ── logs ─────────────────────────────────────────────────────────────────────

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type CommitItem = {
  foodId: string;
  grams: number;
  quantityType: QuantityType;
  quantitySource: QuantitySource;
  /** Set when the user corrected a personal unit — writes back to user_portions. */
  learnedUnitLabel: string | null;
};

export type CommitLogEntry = {
  /** Generated on-device before any network call. Makes a replayed queue idempotent. */
  clientId: string;
  loggedAt: string;
  meal: MealSlot;
  source: LogSource;
  phrase: string | null;
  draftId: string | null;
  items: CommitItem[];
};

export type LogItem = {
  id: string;
  food: FoodSummary;
  grams: number;
  quantityType: QuantityType;
  quantitySource: QuantitySource;
  /** Frozen at commit — never recomputed on read, so history cannot drift. */
  nutrients: Nutrients;
};

export type LogEntry = {
  id: string;
  clientId: string;
  loggedAt: string;
  meal: MealSlot;
  source: LogSource;
  phrase: string | null;
  items: LogItem[];
};

export type DaySummary = {
  date: string;
  totals: {
    kcal: number;
    proteinG: number;
    fiberG: number;
    /** Why the ring can honestly say "12 of 28 g, 2 items unmeasured". */
    fiberUnmeasuredItems: number;
  };
  goal: { kcal: number; proteinG: number; fiberG: number };
  entries: LogEntry[];
};

// ── profile ──────────────────────────────────────────────────────────────────

export type Sex = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type Objective = 'lose' | 'maintain' | 'gain';

export type UserProfile = {
  sex: Sex;
  birthDate: string;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  objective: Objective;
  /** kg per week; sign implied by `objective`. 0 when maintaining. */
  rateKgPerWeek: number;
  units: 'metric' | 'imperial';
};

export type Goal = {
  id: string;
  kcal: number;
  proteinG: number;
  fiberG: number;
  effectiveFrom: string;
  /** Shown on the targets screen so the user can see the math and trust it. */
  basis: {
    bmr: number;
    tdee: number;
    activityFactor: number;
    adjustmentPct: number;
    flooredAtBmr: boolean;
  };
};

export type SetGoal = Partial<Pick<Goal, 'kcal' | 'proteinG' | 'fiberG'>> & {
  effectiveFrom?: string;
};

// ── insights ─────────────────────────────────────────────────────────────────

/** M3. Not in the contract package yet; shaped to match how DaySummary reads. */
export type DayPoint = {
  date: string;
  kcal: number;
  proteinG: number;
  fiberG: number;
  logged: boolean;
};

export type WeekSummary = {
  from: string;
  to: string;
  days: DayPoint[];
  goal: { kcal: number; proteinG: number; fiberG: number };
  averages: { kcal: number; proteinG: number; fiberG: number };
  /** Consecutive days with at least one entry, counting back from today. */
  streakDays: number;
};

// ── errors ───────────────────────────────────────────────────────────────────

export const PROBLEM_TYPES = {
  validationFailed: 'validation-failed',
  unauthorized: 'unauthorized',
  forbidden: 'forbidden',
  notFound: 'not-found',
  conflict: 'conflict',
  rateLimited: 'rate-limited',
  quotaExhausted: 'quota-exhausted',
  resolverTimeout: 'resolver-timeout',
  resolverRefused: 'resolver-refused',
  resolverUnavailable: 'resolver-unavailable',
  internal: 'internal-error',
} as const;

export type ProblemType = (typeof PROBLEM_TYPES)[keyof typeof PROBLEM_TYPES];

export type ProblemDetails = {
  type: ProblemType | string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  requestId?: string;
  violations?: Array<{ path: string; message: string }>;
  /** Present on 429 only. */
  resetAt?: string;
};

/** Thrown by every transport. Screens switch on `problem.type`, never on status. */
export class ApiError extends Error {
  constructor(readonly problem: ProblemDetails) {
    super(problem.title);
    this.name = 'ApiError';
  }
}

/** Convenience for the failure paths the UI branches on (USER-FLOWS §8). */
export const isProblem = (e: unknown, ...types: ProblemType[]): e is ApiError =>
  e instanceof ApiError && types.includes(e.problem.type as ProblemType);

/** No connectivity. Distinct from a server problem: the phrase is queued, not lost. */
export class OfflineError extends Error {
  constructor() {
    super('offline');
    this.name = 'OfflineError';
  }
}
