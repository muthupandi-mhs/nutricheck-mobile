import React, { createContext, useContext } from 'react';
import type {
  AudioMimeType,
  AuthResponse,
  CreateCustomFood,
  DaySummary,
  FoodDetail,
  FoodSearchResult,
  Goal,
  LoginRequest,
  LogEntry,
  MealInsight,
  MealSlot,
  CheckEmailRequest,
  CheckEmailResponse,
  RegisterRequest,
  AiMealDraft,
  ResolveDraft,
  ResolveSource,
  SessionUser,
  SuggestedTargets,
  SetGoal,
  TranscribeLocale,
  TranscribeResult,
  UserProfile,
  WeekSummary,
} from './types';

/**
 * The seam between the UI and the backend. Every screen talks to this and
 * nothing else.
 *
 * The route on each method is the one the API actually serves — see
 * docs/BACKEND.md §5.3. Eleven of these comments were once wrong in ways that
 * would only surface as a 404 at runtime, so treat them as load-bearing: change
 * one only alongside the route it names.
 */
export interface NutriCheckApi {
  // auth ────────────────────────────────────────────────────────────────────
  /** POST /v1/auth/check-email — which of the two step two is. */
  checkEmail(input: CheckEmailRequest): Promise<CheckEmailResponse>;
  /** POST /v1/auth/register */
  register(input: RegisterRequest): Promise<AuthResponse>;
  /** POST /v1/auth/login */
  login(input: LoginRequest): Promise<AuthResponse>;
  /** GET /v1/me — null when there is no valid session on this device. */
  getSession(): Promise<SessionUser | null>;
  /** POST /v1/auth/logout — revokes the refresh-token family. */
  logout(): Promise<void>;

  // dictation ───────────────────────────────────────────────────────────────
  /**
   * POST /v1/transcribe — the ONLY route that takes audio.
   *
   * Called only when on-device dictation cannot cope with the language being
   * spoken. On-device stays the default because it is free, private and works
   * with no network; this costs a round trip and is billed by audio duration.
   *
   * Returns text, never a draft. The user reads and edits it before anything
   * reaches `/v1/resolve` — which still refuses audio with a 415.
   */
  transcribe(input: {
    /** Base64, no `data:` prefix. */
    audio: string;
    mimeType: AudioMimeType;
    locale: TranscribeLocale;
  }): Promise<TranscribeResult>;

  // profile & goals ─────────────────────────────────────────────────────────
  /** GET /v1/me/profile — null before onboarding completes. */
  getProfile(): Promise<UserProfile | null>;
  /** PUT /v1/me/profile — writes the profile and its first goal in one transaction. */
  saveProfile(profile: UserProfile): Promise<UserProfile>;
  /** POST /v1/me/goals/preview — derives targets without persisting, for live recompute. */
  previewGoal(profile: UserProfile): Promise<Goal>;
  /** POST /v1/me/goals/suggest — 503 when no model is configured. */
  suggestTargets(profile: UserProfile): Promise<SuggestedTargets>;
  /** GET /v1/me/goals */
  getGoal(): Promise<Goal>;
  /** POST /v1/me/goals — a user override. Append-only; effectiveFrom decides history. */
  setGoal(patch: SetGoal): Promise<Goal>;

  // insights ────────────────────────────────────────────────────────────────
  /**
   * GET /v1/insights/meal?date=&meal=&tz=
   *
   * A sentence or two about one logged meal. Never throws for a missing note:
   * an unreachable model returns empty `text` with the facts intact, because a
   * missing sentence must not look like a failed log.
   */
  getMealInsight(date: string, meal: MealSlot): Promise<MealInsight>;

  // the day ─────────────────────────────────────────────────────────────────
  /**
   * GET /v1/logs/day?date=&tz=
   *
   * No `tz` parameter here: the transport injects the device zone. The wire
   * contract defaults it to UTC, so a caller that forgot would silently hand
   * every user east of Greenwich someone else's day boundary.
   */
  getDay(date: string): Promise<DaySummary>;
  /** GET /v1/logs/week?date=&tz= — seven days ending on `endingOn`. */
  getWeek(endingOn: string): Promise<WeekSummary>;

  // search ──────────────────────────────────────────────────────────────────
  /** GET /v1/foods/search?q= — history and custom foods rank above generic rows. */
  searchFoods(q: string, signal?: AbortSignal): Promise<FoodSearchResult[]>;
  /** GET /v1/foods/:id — portions come from food_portions, user portions first. */
  getFood(id: string): Promise<FoodDetail>;
  /** POST /v1/foods/custom — the exit from "no database match". */
  createFood(input: CreateCustomFood): Promise<FoodDetail>;

  // the AI route ────────────────────────────────────────────────────────────
  /**
   * POST /v1/resolve. Returns a draft, never a log — "never auto-commit a parse"
   * is a property of the API, not client discipline.
   *
   * `onParsed` fires when the parse lands, before the database match completes,
   * so the sheet can fill its skeletons early. Real transport is SSE.
   */
  resolve(
    phrase: string,
    source: ResolveSource,
    onParsed?: (draft: ResolveDraft) => void,
  ): Promise<ResolveDraft>;

  /**
   * POST /v1/ai-meal. The corpus-free path.
   *
   * Where `resolve` matches a phrase against measured rows, this hands the whole
   * sentence to the model and takes back foods it estimated. It exists for the
   * sentences the corpus cannot serve -- "rendu muttai and 5 dosai and chutney"
   * has almost no chance of matching, because the corpus holds 25 Tamil aliases
   * across 8,000 foods.
   *
   * Prefer `resolve` whenever it can find the food: its numbers were measured
   * and these were guessed. The returned foods are real rows, so the draft
   * commits through `commit` unchanged, but every one of them is an estimate
   * and the screen must say so.
   *
   * Rejects with a 503 problem when the server has no AI key, and 429 when the
   * daily call or spend ceiling is reached.
   */
  /**
   * `signal` matters more here than on search. This is a billed model call, and
   * leaving the confirm sheet is the user saying they do not want the answer —
   * so it should stop, not finish quietly and be thrown away.
   */
  interpretMeal(phrase: string, signal?: AbortSignal): Promise<AiMealDraft>;

  // committing ──────────────────────────────────────────────────────────────
  /** POST /v1/logs — idempotent on clientId, so a replayed queue is safe. */
  commit(entry: CommitDraft): Promise<LogEntry>;
  /**
   * POST /v1/logs/batch — drain a whole offline queue in one request.
   *
   * `httpApi` implements it; the optionality is for test doubles, which need
   * only the surface a screen touches. Callers must fall back to a loop of
   * `commit` when it is absent; both routes are idempotent on `clientId`, so
   * the two paths differ only in round trips. Always resolves —
   * failures are reported per element, never by throwing, so one bad entry
   * cannot cost the user the other eleven.
   */
  commitBatch?(entries: CommitDraft[]): Promise<BatchCommitResult[]>;
  /** DELETE /v1/logs/:id — backs the undo toast. */
  deleteEntry(id: string): Promise<void>;
  /** PATCH /v1/logs/:id/items/:itemId — a portion edit also trains user_portions. */
  updateItemGrams(entryId: string, itemId: string, grams: number): Promise<LogEntry>;

  // repeat route ────────────────────────────────────────────────────────────
  /** GET /v1/suggestions/recents — foods and saved meals, by frequency and recency. */
  getRecents(): Promise<RecentTile[]>;
  /** GET /v1/suggestions/phrases — sentences that worked, for "say it again". */
  getPhrases(): Promise<RecentPhrase[]>;
}

/** One element of a drained queue. `failed` carries a problem, not an entry. */
export type BatchCommitResult =
  | { status: 'created' | 'duplicate'; clientId: string; entry: LogEntry }
  | { status: 'failed'; clientId: string; problem: unknown };

/** What the client hands `commit`. `clientId` is minted before the call. */
export type CommitDraft = {
  clientId: string;
  loggedAt: string;
  meal: MealSlot;
  source: LogEntry['source'];
  phrase: string | null;
  draftId: string | null;
  items: Array<{
    food: import('./types').FoodSummary;
    grams: number;
    quantityType: import('./types').QuantityType;
    quantitySource: import('./types').QuantitySource;
    learnedUnitLabel: string | null;
    /** Optimistic values for instant rendering; the server refreezes its own. */
    nutrients: import('./types').Nutrients;
  }>;
};

/** One cell of the recents strip: a food at a remembered portion, or a whole saved meal. */
export type RecentTile =
  | {
      kind: 'food';
      id: string;
      food: import('./types').FoodSummary;
      grams: number;
      portionLabel: string;
      nutrients: import('./types').Nutrients;
      quantityType: import('./types').QuantityType;
      quantitySource: import('./types').QuantitySource;
    }
  | {
      kind: 'meal';
      id: string;
      name: string;
      items: Array<{
        food: import('./types').FoodSummary;
        grams: number;
        portionLabel: string;
        nutrients: import('./types').Nutrients;
        quantityType: import('./types').QuantityType;
        quantitySource: import('./types').QuantitySource;
      }>;
    };

export type RecentPhrase = {
  id: string;
  phrase: string;
  kcal: number;
  /** A phrase promoted to a saved meal after its second use (USER-FLOWS §5). */
  savedAs: string | null;
  lastUsedAt: string;
};

const ApiContext = createContext<NutriCheckApi | null>(null);

export const ApiProvider = ({
  api,
  children,
}: {
  api: NutriCheckApi;
  children: React.ReactNode;
}) => React.createElement(ApiContext.Provider, { value: api }, children);

export function useApi(): NutriCheckApi {
  const api = useContext(ApiContext);
  if (!api) throw new Error('useApi must be used inside <ApiProvider>');
  return api;
}
