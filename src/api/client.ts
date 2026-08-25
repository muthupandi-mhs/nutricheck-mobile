import React, { createContext, useContext } from 'react';
import type {
  CreateCustomFood,
  DaySummary,
  FoodDetail,
  FoodSearchResult,
  Goal,
  LogEntry,
  MealSlot,
  ResolveDraft,
  ResolveSource,
  SetGoal,
  UserProfile,
  WeekSummary,
} from './types';

/**
 * The seam between the UI and the backend.
 *
 * Every screen talks to this interface and nothing else — no fetch calls, no
 * fixture imports, no knowledge of where a number came from. `mockApi`
 * implements it today; `httpApi` implements it against `apps/api` when the
 * endpoints land. Swapping them is one line in `App.tsx`, and no screen
 * changes, because the shapes are already the wire shapes.
 *
 * Methods map one-to-one onto the routes in docs/BACKEND.md.
 */
export interface NutriCheckApi {
  // profile & goals ─────────────────────────────────────────────────────────
  /** GET /v1/me — null before onboarding completes. */
  getProfile(): Promise<UserProfile | null>;
  /** PATCH /v1/me */
  saveProfile(profile: UserProfile): Promise<UserProfile>;
  /**
   * POST /v1/goals/preview — derive targets without persisting them, so the
   * targets screen can recompute live as the user edits the profile behind it.
   */
  previewGoal(profile: UserProfile): Promise<Goal>;
  /** GET /v1/goals/current */
  getGoal(): Promise<Goal>;
  /** PUT /v1/goals — a user override. Append-only; effectiveFrom decides history. */
  setGoal(patch: SetGoal): Promise<Goal>;

  // the day ─────────────────────────────────────────────────────────────────
  /** GET /v1/days/:date?tz= */
  getDay(date: string): Promise<DaySummary>;
  /** GET /v1/weeks/:date?tz= */
  getWeek(endingOn: string): Promise<WeekSummary>;

  // search ──────────────────────────────────────────────────────────────────
  /** GET /v1/foods/search?q= — history and custom foods rank above generic rows. */
  searchFoods(q: string, signal?: AbortSignal): Promise<FoodSearchResult[]>;
  /** GET /v1/foods/:id — portions come from food_portions, user portions first. */
  getFood(id: string): Promise<FoodDetail>;
  /** POST /v1/foods — the exit from "no database match". */
  createFood(input: CreateCustomFood): Promise<FoodDetail>;

  // the AI route ────────────────────────────────────────────────────────────
  /**
   * POST /v1/resolve. Returns a draft, never a log — "never auto-commit a
   * parse" is a property of the API, not client discipline.
   *
   * `onParsed` fires with the items as soon as the parse lands, before the
   * database match completes, so the sheet can fill its skeleton rows early.
   * The real transport is SSE; the mock calls it on the same schedule.
   */
  resolve(
    phrase: string,
    source: ResolveSource,
    onParsed?: (draft: ResolveDraft) => void,
  ): Promise<ResolveDraft>;

  // committing ──────────────────────────────────────────────────────────────
  /** POST /v1/logs — idempotent on clientId, so a replayed queue is safe. */
  commit(entry: CommitDraft): Promise<LogEntry>;
  /** DELETE /v1/logs/:id — backs the undo toast. */
  deleteEntry(id: string): Promise<void>;
  /** PATCH /v1/logs/:id/items/:itemId — a portion edit also trains user_portions. */
  updateItemGrams(entryId: string, itemId: string, grams: number): Promise<LogEntry>;

  // repeat route ────────────────────────────────────────────────────────────
  /** GET /v1/recents — foods and saved meals, blended by frequency and recency. */
  getRecents(): Promise<RecentTile[]>;
  /** GET /v1/phrases — sentences that worked, for the composer's "say it again". */
  getPhrases(): Promise<RecentPhrase[]>;
}

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

/**
 * One cell of the recents strip. A tile is either a single food at a remembered
 * portion or a saved meal that logs all of its items at once — both are one tap,
 * which is the whole point of the two-second route.
 */
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
