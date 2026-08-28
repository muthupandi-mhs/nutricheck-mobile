/**
 * Wire types — hand-mirrored from `nutricheck-api/packages/contracts`, which the
 * app cannot import until both live in one workspace. Change a shape here only
 * by changing the Zod schema there first.
 */

// ── auth ─────────────────────────────────────────────────────────────────────

export type RegisterRequest = { email: string; password: string };
export type LoginRequest = { email: string; password: string };

/**
 * Step one of the auth flow asks this before asking for a password, so step two
 * knows whether it is a sign-in screen or a sign-up screen.
 *
 * The server answers on the same conditions `login` treats as an account —
 * an email identity, on a user that is not deleted — and returns nothing else.
 */
export type CheckEmailRequest = { email: string };
export type CheckEmailResponse = { registered: boolean };

/**
 * Length is the only rule. Composition rules reduce entropy in practice (NIST
 * SP 800-63B advises against them); the upper bound stops Argon2id being asked
 * to hash a megabyte.
 *
 * The minimum is 6, mirroring `Password` in the contract — below the 8 that
 * SP 800-63B sets for a user-chosen password, deliberately; the reasoning is
 * beside the rule in `nutricheck-api/packages/contracts/src/auth.ts`.
 *
 * This drives the placeholder and the client-side check only — the server
 * validates independently. Drift either way is a bug the user sees: too high
 * and the form refuses a password the API would take, too low and it invites
 * one the API then rejects.
 */
export const PASSWORD_MIN = 6;
export const PASSWORD_MAX = 200;
export const EMAIL_MAX = 254;

export type TokenPair = {
  accessToken: string;
  /** Opaque, not a JWT. Only its SHA-256 hash is ever stored server-side. */
  refreshToken: string;
  tokenType: 'Bearer';
  /** Access token lifetime in seconds, so the client can refresh ahead of expiry. */
  expiresIn: number;
};

export type SessionUser = {
  id: string;
  email: string;
  createdAt: string;
  /** False until the profile and first goal exist — drives the onboarding jump. */
  onboarded: boolean;
};

export type AuthResponse = { user: SessionUser; tokens: TokenPair };

/**
 * Targets a model proposed for a profile, already bounded by the server.
 *
 * `corrections` is one line per figure the server had to move, and it is
 * normally empty. When it is not, the screen has to say so: a number shown
 * without mentioning it was corrected is the server's answer wearing the
 * model's name.
 */
export type SuggestedTargets = {
  kcal: number;
  proteinG: number;
  /** Derived from the calories, server-side. Never asked of the model. */
  carbsG: number;
  fatG: number;
  fiberG: number;
  reasoning: string;
  corrections: string[];
};

// ── transcription ────────────────────────────────────────────────────────────

/** Mirrors the API's `TranscribeLocale`, which mirrors `SpeechLocaleId`. */
export type TranscribeLocale = 'en-IN' | 'ta-IN';

/** The subset of the API's `AudioMimeType` this device actually records. */
export type AudioMimeType = 'audio/wav' | 'audio/aac' | 'audio/mp3';

/**
 * Server-side transcription — the fallback for when the phone's own recogniser
 * cannot handle the language being spoken.
 *
 * `text` is empty when nothing intelligible was heard. That is an outcome, not
 * an error: the mic caught silence, and the composer says so rather than
 * showing a failure the user cannot act on.
 */
export type TranscribeResult = {
  text: string;
  locale: TranscribeLocale;
  model: string;
  latencyMs: number;
};

// ── nutrition ────────────────────────────────────────────────────────────────

/**
 * How much to trust one number. Three states, not two.
 *
 * `unknown` is excluded from the denominator rather than counted as zero;
 * `imputed` is a real value from an estimate, rendered with a `~`.
 */
export type NutrientState = 'known' | 'imputed' | 'unknown';

/** The original name — fibre is the nutrient this was written for. */
export type FiberState = NutrientState;

export type Nutrients = {
  kcal: number;
  proteinG: number;
  /**
   * Each is null if and only if its own state is 'unknown'.
   *
   * Measured against the corpus: carbs and fat are present for 100% of the
   * USDA rows and fibre for 92.8%, so in practice only fibre is often missing —
   * but curated dishes are estimates and arrive 'imputed' across all three.
   */
  carbsG: number | null;
  carbsState: NutrientState;
  fatG: number | null;
  fatState: NutrientState;
  fiberG: number | null;
  fiberState: NutrientState;
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
  | 'user'
  /**
   * A row a model estimated the numbers for, as distinct from 'user', which is
   * one a person typed them into. Every nutrient on an 'ai' food is imputed,
   * never known, and the UI must show it as an estimate.
   */
  | 'ai';

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
  carbsG: number | null;
  carbsState: NutrientState;
  fatG: number | null;
  fatState: NutrientState;
  fiberG: number | null;
  fiberState: NutrientState;
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
  /** The rows the re-rank chose from. Shipped inline so the runner-up expander needs no request. */
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

// ── ai meal ──────────────────────────────────────────────────────────────────

/**
 * The corpus-free path: a whole meal read out of one sentence by the model.
 *
 * Unlike ResolveDraft, nothing here was matched against a measured row. The
 * foods are real rows the server created, so they commit through the ordinary
 * log path, but every nutrient on them is an ESTIMATE and the screen showing
 * them has to say so. `estimated` is a literal true rather than a boolean for
 * exactly that reason: it cannot be quietly forgotten.
 */
export type AiMealItemDraft = {
  food: FoodSummary;
  /** The words this came from, so the user can check we heard them. */
  spokenAs: string;
  quantity: number;
  unit: string;
  grams: number;
  /** Totals for the stated quantity, computed on the server from per-100g rates. */
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  /** Low when the dish was unfamiliar or the portion had to be assumed. */
  confidence: 'high' | 'low';
};

export type AiMealDraft = {
  draftId: string;
  phrase: string;
  /** One or two sentences, for the confirmation screen. */
  summary: string;
  items: AiMealItemDraft[];
  /** Words that sounded like food but produced no item. */
  unresolved: string[];
  totals: {
    kcal: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    fiberG: number;
  };
  estimated: true;
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
    carbsG: number;
    fatG: number;
    fiberG: number;
    /**
     * Why a meter can honestly say "12 of 28 g, 2 items unmeasured".
     *
     * One count per nutrient, not a shared one: the item missing fibre is
     * usually not the item missing carbs, and a single number could not say
     * which total to distrust.
     */
    carbsUnmeasuredItems: number;
    fatUnmeasuredItems: number;
    fiberUnmeasuredItems: number;
  };
  goal: { kcal: number; proteinG: number; carbsG: number; fatG: number; fiberG: number };
  entries: LogEntry[];
};

// ── profile ──────────────────────────────────────────────────────────────────

export type Sex = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active' | 'athlete';
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
  carbsG: number;
  fatG: number;
  fiberG: number;
  effectiveFrom: string;
  /** Shown on the targets screen so the user can see the math and trust it. */
  basis: {
    bmr: number;
    tdee: number;
    activityFactor: number;
    adjustmentPct: number;
    flooredAtBmr: boolean;
    /** The fat share used for THIS goal. Policy, not derivation — so it is stored. */
    fatPctOfKcal: number;
  };
};

export type SetGoal = Partial<Pick<Goal, 'kcal' | 'proteinG' | 'carbsG' | 'fatG' | 'fiberG'>> & {
  effectiveFrom?: string;
};

// ── insights ─────────────────────────────────────────────────────────────────

/** M3. Not in the contract package yet; shaped to match how DaySummary reads. */
export type DayPoint = {
  date: string;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  logged: boolean;
};

export type WeekSummary = {
  from: string;
  to: string;
  days: DayPoint[];
  goal: { kcal: number; proteinG: number; carbsG: number; fatG: number; fiberG: number };
  averages: { kcal: number; proteinG: number; carbsG: number; fatG: number; fiberG: number };
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

// ── insights ─────────────────────────────────────────────────────────────────

/**
 * One nutrient of a meal, measured against the day's target.
 *
 * `amount` is null when NOTHING in the meal measured it — distinct from a
 * measured zero, which is a real reading. Eggs genuinely contain no fibre; a
 * curated dish may simply never have been measured for it, and saying "0 g"
 * about the second is a claim nobody made.
 */
export type MacroShare = {
  amount: number | null;
  target: number | null;
  percentOfTarget: number | null;
  /** Items in this meal with no measurement for this nutrient. */
  unmeasuredItems: number;
};

export type MealFacts = {
  meal: MealSlot;
  date: string;
  entryCount: number;
  kcal: MacroShare;
  proteinG: MacroShare;
  carbsG: MacroShare;
  fatG: MacroShare;
  fiberG: MacroShare;
  /** Left for the whole day, not this meal. Negative when the target is passed. */
  remaining: {
    kcal: number | null;
    proteinG: number | null;
    carbsG: number | null;
    fatG: number | null;
    fiberG: number | null;
  };
};

/**
 * The note under a meal card.
 *
 * `text` is EMPTY whenever the model was unavailable, refused, or the meal is
 * empty — never an error. `facts` is always complete, so the card renders the
 * numbers and simply says less. Treat the empty string as "no note", not as a
 * failure to retry.
 */
export type MealInsight = {
  facts: MealFacts;
  text: string;
  cached: boolean;
  model: string | null;
};
