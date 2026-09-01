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
 * Sign in with Google — one call that covers signing in, signing up, and
 * attaching Google to an account that already exists with a password.
 *
 * The ID token and nothing else. Not the email, not the name: those are claims
 * inside the token, and the server reads them from the signature it verified
 * rather than from a body this client could have written. An `email` field
 * beside this one would be an account-takeover primitive.
 *
 * There is no `check-email` step in front of it and no `registered` flag out of
 * it — Google already knows which case this is, so the three outcomes are the
 * server's to decide from a token it checked.
 */
export type GoogleAuthRequest = { idToken: string };

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
/** Mirrors `NameField` in `contracts/src/profile.ts`. A cap, not a rule about names. */
export const NAME_MAX = 60;

/**
 * A meal said in words — `contracts/src/resolve.ts` and `ai-meal.ts` both cap it
 * at 500, and both reject what is over.
 *
 * Enforced on the field rather than at the send, deliberately. The screens
 * that produce a phrase send it to a model, and a sentence that is refused
 * AFTER the button has been pressed costs a round trip to say something the
 * keyboard could have said while it was being typed. It is also the only
 * unbounded thing a user can hand this app.
 */
export const PHRASE_MAX = 500;

/**
 * One turn of the assistant in the microphone sheet.
 *
 * The conversation lives in the sheet and dies with it. That is a limit rather
 * than an oversight: a durable transcript of everything anybody has ever said
 * to this app is a retention decision nobody has taken, and what makes the
 * feature useful is the exchange happening right now about the day on screen.
 */
export type ChatTurn = { role: 'user' | 'agent'; text: string };

export type ChatReply = {
  /** What to show. One or two sentences — this is a panel, not a page. */
  text: string;
  /**
   * Set when the message was a meal rather than a question, carrying the
   * user's own words. Nothing is logged by this: the phrase goes to the same
   * read-back screen a spoken meal does, and still needs a deliberate tap.
   */
  log: { phrase: string } | null;
};

/** `contracts/src/food.ts` — the search query. Longer is not a search. */
export const SEARCH_MAX = 120;

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
  /**
   * Which meal the words put this item in, or null when they said nothing.
   *
   * One sentence is routinely a whole day here — "kalaila lemon rice ...
   * mathiyam briyani ... iravu 3 chappathi" — so the slot belongs to the item
   * and not to the draft, and the read-back files each group under its own
   * meal instead of putting breakfast into dinner.
   *
   * Optional on this side on purpose. A server that has not shipped the field
   * yet, or a cached draft from before it, should read as "the sentence said
   * nothing" and fall back to the clock — which is exactly what null means.
   */
  meal?: MealSlot | null;
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
  /**
   * What to call them, asked on the first onboarding step.
   *
   * Optional on both sides of the wire: accounts that predate the name step
   * have no name, and the profile save is a merge — so a screen saving a
   * weight change without one must not read as "delete my name".
   *
   * Which is why `null` is in the type and is not the same as leaving it out.
   * Absent means "I am not saying anything about this field" and keeps what is
   * stored; null is how a surname is actually cleared. Sending `undefined`
   * would drop the key from the body and the old surname would come back on
   * the next load.
   */
  firstName?: string | null;
  lastName?: string | null;
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

// ── weight ───────────────────────────────────────────────────────────────────

/** One reading. `date` is the LOCAL day it was taken, never a UTC instant. */
export type WeightPoint = {
  date: string;
  weightKg: number;
};

/**
 * The movement, measured on the server rather than fitted here.
 *
 * `kgPerWeek` is a least-squares slope over the window, not last-minus-first
 * over the span — weight is noisy enough at the scale people weigh themselves
 * that two endpoints let one dehydrated Tuesday claim a trend. `deltaKg` is
 * the plain subtraction, kept beside it because it is the figure people check
 * the fit against.
 *
 * Signed, never normalized against the objective: negative is losing, for
 * somebody trying to lose and somebody trying to gain alike.
 */
export type WeightTrend = {
  kgPerWeek: number;
  deltaKg: number;
  spanDays: number;
  /**
   * The rate the profile asked for, already signed. Null when maintaining,
   * because there is no intended rate to be behind or ahead of.
   *
   * Sent rather than derived here from `objective` and `rateKgPerWeek`: the
   * sign convention belongs with the figure, and a client that rebuilds it is a
   * second place to get it backwards.
   */
  intendedKgPerWeek: number | null;
};

/**
 * Everything the weight screen draws, in one response.
 *
 * `current` and `start` may both sit OUTSIDE `points`. Someone who has not
 * weighed themselves in four months still has a weight, and a screen that
 * showed a dash because the reading fell off the left of the chart would be
 * forgetting something it knows.
 */
export type WeightSeries = {
  /** Oldest first, one per day, only the days actually logged. */
  points: WeightPoint[];
  current: WeightPoint | null;
  start: WeightPoint | null;
  /** Null until two readings on different days give a line to draw. */
  trend: WeightTrend | null;
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

/**
 * Every day of one calendar month, logged or not.
 *
 * The same `DayPoint` the week chart uses. A calendar cell and a chart bar
 * answer the same question at different resolutions, and a second shape for it
 * would be a second place for `logged` to drift.
 *
 * `goal` is the one in effect on the LAST day of the month, not per day — the
 * same limitation `WeekSummary` carries. Someone who changed their target
 * mid-month has the front half coloured against the back half's goal.
 */
export type MonthSummary = {
  from: string;
  to: string;
  /** 28 to 31 entries. Every day is present, so a grid can index by position. */
  days: DayPoint[];
  goal: { kcal: number; proteinG: number; carbsG: number; fatG: number; fiberG: number };
  loggedDays: number;
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

// ── food ideas ───────────────────────────────────────────────────────────────

/**
 * One suggested food, for a person with some of their day left.
 *
 * The third place a model supplies nutrition, after `/v1/ai-meal` and the
 * targets step — and the only one that runs because a TAB WAS OPENED rather
 * than because somebody asked. Everything on it is an estimate, and the screen
 * showing it has to say so.
 *
 * `food` is a real row the server created, source `'ai'` with every nutrient
 * state `imputed`, so tapping an idea opens the ordinary portion screen and
 * commits through the ordinary log path. `reason` is not decoration: the claim
 * of this tab is that the list was built from THIS person's remaining targets,
 * and a suggestion with no argument attached cannot be disagreed with.
 */
export type FoodIdea = {
  food: FoodSummary;
  /** Why this food, for this gap. One sentence, addressed to the user. */
  reason: string;
  /** The portion the figures below describe. */
  grams: number;
  /** That portion in ordinary words — "1 cup", "2 eggs". */
  servingLabel: string;
  /** Computed server-side from per-100g rates and `grams`, never by the model. */
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  confidence: 'high' | 'low';
};

/**
 * What is left of the day's targets.
 *
 * Null when the target is not set, and NEGATIVE when it has been passed —
 * reported either way, never clamped. Somebody 300 kcal over is asking a
 * different question from somebody exactly on target.
 */
export type RemainingTargets = {
  kcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  fiberG: number | null;
};

export type FoodIdeas = {
  date: string;
  /** The gap the ideas were built for, so the screen can show its own evidence. */
  remaining: RemainingTargets;
  ideas: FoodIdea[];
  /**
   * A sentence about the day. EMPTY whenever the model was unavailable or
   * refused — render `remaining` and say less, exactly as a meal card does with
   * a missing note. Never an error to retry.
   */
  note: string;
  /** Literal true, so no screen can render one of these without being told. */
  estimated: true;
  cached: boolean;
};

// ── fasting ──────────────────────────────────────────────────────────────────

/**
 * The protocols the picker offers, mirrored from `FASTING_PLANS` in the
 * contracts.
 *
 * **A plan is its target and nothing else.** The wire carries `targetHours`;
 * "16:8" is only the name people use for a sixteen-hour fast, and it is looked
 * up here rather than stored anywhere. The eating half of each pair is what is
 * left of the day, which is why the numbers add to 24 — and why OMAD, the one
 * that is not a ratio, is the only label not derived from its figure.
 */
export const FASTING_PLANS: ReadonlyArray<{ hours: number; label: string; detail: string }> = [
  { hours: 16, label: '16:8', detail: 'Eat within eight hours' },
  { hours: 18, label: '18:6', detail: 'Eat within six hours' },
  { hours: 20, label: '20:4', detail: 'A meal and a snack' },
  { hours: 23, label: 'OMAD', detail: 'One meal a day' },
];

/** What the picker opens on for somebody who has never fasted. */
export const FASTING_DEFAULT_TARGET_HOURS = 16;

/** What a target may be, whatever the presets offer. Mirrors the contract. */
export const FASTING_TARGET_MIN_HOURS = 4;
export const FASTING_TARGET_MAX_HOURS = 48;
/** How far back the server lets a start time move. */
export const FASTING_BACKDATE_MAX_HOURS = 72;

/**
 * One fast — an interval on the clock, not a measurement of a day.
 *
 * That is the difference from `WeightPoint` above, and it decides the shape:
 * a weight is filed under a local date and its clock time is noise, while a
 * fast's whole content is its length, two of them fit inside one calendar day,
 * and one usually straddles midnight. So both ends are instants.
 */
export type Fast = {
  id: string;
  startedAt: string;
  /** Null while it is running. There is no separate status. */
  endedAt: string | null;
  targetHours: number;
  /**
   * How long it ran. **Null while open, and deliberately so** — a running
   * fast's length changes every second, and a figure computed server-side is
   * stale the moment it is serialized. The screen subtracts `startedAt` from
   * its own clock instead, once a second.
   */
  hours: number | null;
  /**
   * Whether it made its target. Null while open.
   *
   * Sent rather than compared here, because it has to be decided on the same
   * rounded figure the row prints: 15.9994 h shows as "16h" and would fail a
   * raw `>= 16`, putting "16h" and "missed" side by side.
   */
  reachedTarget: boolean | null;
};

/**
 * The record, all-time — not over the returned window. A personal best that
 * forgot March is a worse number than no number.
 */
export type FastingStats = {
  /** Finished fasts. The one still running is not counted until it closes. */
  completed: number;
  /** How many reached their target; the denominator is `completed`. */
  reached: number;
  longestHours: number;
  averageHours: number;
};

/**
 * Everything the fasting screen draws — and what every write returns, because
 * starting or ending a fast moves the timer, the record and the list at once.
 */
export type FastingSummary = {
  current: Fast | null;
  /** Finished fasts, newest first. */
  recent: Fast[];
  /** Null until one has finished; there is no average of nothing. */
  stats: FastingStats | null;
  /**
   * What the start control opens on: the running fast's target, else the last
   * one finished, else 16. The whole of the "which plan am I on" preference,
   * stored nowhere — a plan picked each time can never be out of date.
   */
  lastTargetHours: number;
};
