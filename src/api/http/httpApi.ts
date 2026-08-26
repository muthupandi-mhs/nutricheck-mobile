import type { AxiosInstance } from 'axios';
import type { CommitDraft, NutriCheckApi, RecentPhrase, RecentTile } from '../client';
import {
  ApiError,
  OfflineError,
  type AudioMimeType,
  type AuthResponse,
  type CreateCustomFood,
  type DaySummary,
  type FoodDetail,
  type FoodSearchResult,
  type FoodSummary,
  type Goal,
  type LoginRequest,
  type LogEntry,
  type QuantityType,
  type RegisterRequest,
  type ResolveDraft,
  type ResolveSource,
  type SessionUser,
  type SetGoal,
  type TranscribeLocale,
  type TranscribeResult,
  type UserProfile,
  type WeekSummary,
} from '../types';
import { toApiError } from './problems';
import { streamSse } from './sse';
import { createAsyncStorageTokenStore, type TokenStore } from './tokens';
import { Transport } from './transport';

export type HttpApiConfig = {
  baseUrl: string;
  tokens?: TokenStore;
  onSignedOut?: () => void;
  /** Injectable for tests — an axios instance carrying a stub adapter. */
  client?: AxiosInstance;
  /** Overridable for tests; otherwise the device zone. */
  timeZone?: string;
};

/**
 * The real transport behind `NutriCheckApi`.
 *
 * Route names here follow the API, not the doc comments that used to sit on the
 * interface — eleven of those were stale (GAP-REPORT.STATUS.md §2) and the
 * server was the one that was right. They are corrected in client.ts now.
 */
export function createHttpApi(config: HttpApiConfig): NutriCheckApi {
  const transport = new Transport({
    baseUrl: config.baseUrl,
    tokens: config.tokens ?? createAsyncStorageTokenStore(),
    onSignedOut: config.onSignedOut,
    client: config.client,
  });

  const tz = config.timeZone ?? deviceTimeZone();

  return {
    // ── auth ─────────────────────────────────────────────────────────────────

    async register(input: RegisterRequest) {
      const auth = await transport.request<AuthResponse>('/v1/auth/register', {
        method: 'POST',
        body: input,
        anonymous: true,
      });
      await transport.setTokens(auth.tokens);
      return auth;
    },

    async login(input: LoginRequest) {
      const auth = await transport.request<AuthResponse>('/v1/auth/login', {
        method: 'POST',
        body: input,
        anonymous: true,
      });
      await transport.setTokens(auth.tokens);
      return auth;
    },

    // ── dictation ────────────────────────────────────────────────────────────

    /**
     * The only call that ships audio.
     *
     * No retry on failure, deliberately. Every attempt re-uploads the clip and
     * is billed by its duration, and the caller already has a working fallback
     * that costs nothing — the words are still in the box to be typed.
     */
    async transcribe(input: {
      audio: string;
      mimeType: AudioMimeType;
      locale: TranscribeLocale;
    }): Promise<TranscribeResult> {
      return transport.request<TranscribeResult>('/v1/transcribe', {
        method: 'POST',
        body: input,
        // Longer than the server's own 20s ceiling on the speech model, plus
        // room to upload. The default 15s is shorter than the work takes, so
        // the phone was hanging up on requests the server went on to answer:
        // an endless spinner here, a bare `request aborted` in the API log.
        timeoutMs: 35_000,
      });
    },

    /**
     * `GET /v1/me`, not `/v1/auth/me`.
     *
     * Returns null rather than throwing when there is no session: App.tsx uses
     * this to choose the first screen, and "no session" is the ordinary state
     * on a fresh install, not a failure.
     */
    async getSession(): Promise<SessionUser | null> {
      if (!(await transport.refreshToken())) return null;
      try {
        return await transport.request<SessionUser>('/v1/me');
      } catch (error) {
        if (error instanceof ApiError && error.problem.status === 401) return null;
        throw error;
      }
    },

    /**
     * Clears the local session even when the call fails.
     *
     * A user who taps sign out on a plane must end up signed out. The server
     * side of a missed logout is a refresh token that expires on its own.
     */
    async logout(): Promise<void> {
      const refreshToken = await transport.refreshToken();
      try {
        if (refreshToken) {
          await transport.request<void>('/v1/auth/logout', {
            method: 'POST',
            body: { refreshToken },
            anonymous: true,
          });
        }
      } catch {
        // Deliberately swallowed. See above: the local session goes either way.
      } finally {
        await transport.clearTokens();
      }
    },

    // ── profile & goals ──────────────────────────────────────────────────────

    /** `GET /v1/me/profile`. 404 means onboarding has not happened yet. */
    async getProfile(): Promise<UserProfile | null> {
      try {
        return await transport.request<UserProfile>('/v1/me/profile');
      } catch (error) {
        if (error instanceof ApiError && error.problem.status === 404) return null;
        throw error;
      }
    },

    /** `PUT /v1/me/profile` — one transaction that also writes the first goal. */
    saveProfile(profile: UserProfile) {
      return transport.request<UserProfile>('/v1/me/profile', {
        method: 'PUT',
        body: profile,
      });
    },

    /**
     * `POST /v1/me/goals/preview`. Writes nothing.
     *
     * The server omits `id` and `effectiveFrom` because nothing was persisted.
     * They are filled in here so a screen can treat a preview and a real goal
     * identically — `id` is the literal string 'preview', which is not a uuid
     * and so cannot be mistaken for a saved row on its way back to the server.
     */
    async previewGoal(profile: UserProfile): Promise<Goal> {
      const preview = await transport.request<Omit<Goal, 'id' | 'effectiveFrom'>>(
        '/v1/me/goals/preview',
        { method: 'POST', body: profile },
      );
      return { ...preview, id: 'preview', effectiveFrom: localDate(tz) };
    },

    /** `GET /v1/me/goals`. */
    getGoal() {
      return transport.request<Goal>('/v1/me/goals');
    },

    /** `POST /v1/me/goals` — append-only, never a PUT. */
    setGoal(patch: SetGoal) {
      return transport.request<Goal>('/v1/me/goals', { method: 'POST', body: patch });
    },

    // ── the day ──────────────────────────────────────────────────────────────

    /**
     * `GET /v1/logs/day?date=&tz=`.
     *
     * The interface takes no timezone, but the wire contract requires one and
     * DEFAULTS IT TO UTC. Left out, every user east of Greenwich gets someone
     * else's day boundary — an 11pm meal in Chennai lands on tomorrow. The mock
     * cannot reveal this because it ignores tz entirely, so the device zone is
     * injected here, where it cannot be forgotten by a caller.
     */
    getDay(date: string) {
      return transport.request<DaySummary>('/v1/logs/day', { query: { date, tz } });
    },

    /** `GET /v1/logs/week?date=&tz=` — same boundary rule as the day. */
    getWeek(endingOn: string) {
      return transport.request<WeekSummary>('/v1/logs/week', {
        query: { date: endingOn, tz },
      });
    },

    // ── search ───────────────────────────────────────────────────────────────

    searchFoods(q: string, signal?: AbortSignal) {
      return transport.request<FoodSearchResult[]>('/v1/foods/search', {
        query: { q },
        signal,
      });
    },

    getFood(id: string) {
      return transport.request<FoodDetail>(`/v1/foods/${id}`);
    },

    /** `POST /v1/foods/custom`, not `POST /v1/foods`. */
    createFood(input: CreateCustomFood) {
      return transport.request<FoodDetail>('/v1/foods/custom', {
        method: 'POST',
        body: input,
      });
    },

    // ── the AI route ─────────────────────────────────────────────────────────

    /**
     * `POST /v1/resolve`, streamed.
     *
     * `onParsed` fires on the `parsed` frame, before the corpus match finishes,
     * so the sheet fills its skeleton rows while the re-rank is still running.
     * That early frame carries quantities but no foods yet — hence the partial
     * draft, which the `resolved` frame then replaces wholesale.
     */
    async resolve(
      phrase: string,
      source: ResolveSource,
      onParsed?: (draft: ResolveDraft) => void,
    ): Promise<ResolveDraft> {
      const token = await transport.accessToken();
      let draft: ResolveDraft | null = null;
      let streamProblem: unknown = null;

      try {
        await streamSse({
          url: transport.url('/v1/resolve'),
          body: { phrase, source },
          headers: token ? { authorization: `Bearer ${token}` } : {},
          onFrame: frame => {
            const payload = parse(frame.data);
            if (!payload) return;

            if (frame.event === 'parsed' && onParsed) {
              onParsed(partialDraft(phrase, source, payload));
            } else if (frame.event === 'resolved') {
              draft = (payload as { draft: ResolveDraft }).draft;
            } else if (frame.event === 'error') {
              // The stream had already started, so no status code was left to
              // send. Carry it out as a problem rather than as an empty result
              // the sheet would render as "nothing found".
              streamProblem = (payload as { problem?: unknown }).problem ?? null;
            }
          },
        });
      } catch (failure) {
        throw fromStreamFailure(failure);
      }

      if (streamProblem) throw toApiError(500, streamProblem);
      if (!draft) throw toApiError(500, { title: 'The draft never arrived' });
      return draft;
    },

    // ── committing ───────────────────────────────────────────────────────────

    /**
     * `POST /v1/logs`.
     *
     * The shape adapter matters: `CommitDraft.items` carry a whole `FoodSummary`
     * and optimistic `nutrients` so the sheet can render instantly, and the wire
     * wants neither — only `foodId` and grams. The server refreezes its own
     * nutrients from the corpus. Map, never spread.
     */
    commit(entry: CommitDraft) {
      return transport.request<LogEntry>('/v1/logs', {
        method: 'POST',
        body: toWireEntry(entry),
      });
    },

    /**
     * `POST /v1/logs/batch` — the drain the interface used to hide.
     *
     * A queue of twelve entries replayed through `commit` is twelve round trips
     * on the connection that has only just come back. Both routes are
     * idempotent on `clientId`, so either is correct; this one is one request.
     * Always 200 with a per-element result, so one bad entry cannot cost the
     * user the other eleven.
     */
    commitBatch(entries: CommitDraft[]) {
      return transport.request<WireBatchCommitResult[]>('/v1/logs/batch', {
        method: 'POST',
        body: { entries: entries.map(toWireEntry) },
      });
    },

    deleteEntry(id: string) {
      return transport.request<void>(`/v1/logs/${id}`, { method: 'DELETE' });
    },

    /**
     * `PATCH /v1/logs/:id/items/:itemId`.
     *
     * Narrow on purpose. The wholesale `PATCH /v1/logs/:id` would need every
     * item sent back to move one, which clobbers a concurrent edit and throws
     * away the portion correction — and that correction is the signal that
     * makes the second "a bowl of rice" right.
     */
    updateItemGrams(entryId: string, itemId: string, grams: number) {
      return transport.request<LogEntry>(`/v1/logs/${entryId}/items/${itemId}`, {
        method: 'PATCH',
        body: { grams, learnedUnitLabel: null },
      });
    },

    // ── repeat route ─────────────────────────────────────────────────────────

    /**
     * `GET /v1/suggestions/recents`, joined with `GET /v1/meals`.
     *
     * Two requests rather than one because the wire's meal suggestion carries a
     * name and a count but no items, and a meal tile has to be loggable — the
     * strip builds a commit from `tile.items` on tap. Fetching the meal list
     * once and joining beats a request per meal, and beats dropping saved meals
     * from the strip, which would quietly remove the feature that makes day 30
     * different from day 1.
     */
    async getRecents(): Promise<RecentTile[]> {
      const [suggestions, meals] = await Promise.all([
        transport.request<Suggestion[]>('/v1/suggestions/recents', {
          query: { limit: 12, hour: new Date().getHours() },
        }),
        transport.request<SavedMeal[]>('/v1/meals'),
      ]);

      const byId = new Map(meals.map(meal => [meal.id, meal]));

      return suggestions.flatMap(suggestion => {
        if (suggestion.kind === 'food') return [foodTile(suggestion)];

        const meal = byId.get(suggestion.mealId);
        // A meal deleted between the two requests: skip it rather than render
        // a tile that cannot be logged.
        return meal ? [mealTile(meal)] : [];
      });
    },

    /** `GET /v1/suggestions/phrases`. */
    getPhrases() {
      return transport.request<RecentPhrase[]>('/v1/suggestions/phrases', {
        query: { limit: 6 },
      });
    },
  };
}

// ── wire shapes that types.ts does not mirror ────────────────────────────────

type WireBatchCommitResult =
  | { status: 'created' | 'duplicate'; clientId: string; entry: LogEntry }
  | { status: 'failed'; clientId: string; problem: unknown };

type FoodSuggestion = {
  kind: 'food';
  food: FoodSummary;
  grams: number;
  lastLoggedAt: string;
  timesLogged: number;
};

type MealSuggestion = {
  kind: 'meal';
  mealId: string;
  name: string;
  itemCount: number;
  kcal: number;
  lastLoggedAt: string | null;
  timesLogged: number;
};

type Suggestion = FoodSuggestion | MealSuggestion;

type SavedMeal = {
  id: string;
  name: string;
  items: Array<{
    id: string;
    food: FoodSummary;
    grams: number;
    quantityType: QuantityType;
  }>;
  totals: { kcal: number; proteinG: number };
  createdAt: string;
};

// ── adapters ─────────────────────────────────────────────────────────────────

/** Strips everything the server recomputes. See the note on `commit`. */
function toWireEntry(entry: CommitDraft) {
  return {
    clientId: entry.clientId,
    loggedAt: entry.loggedAt,
    meal: entry.meal,
    source: entry.source,
    phrase: entry.phrase,
    draftId: entry.draftId,
    items: entry.items.map(item => ({
      foodId: item.food.id,
      grams: item.grams,
      quantityType: item.quantityType,
      quantitySource: item.quantitySource,
      learnedUnitLabel: item.learnedUnitLabel,
    })),
  };
}

function foodTile(suggestion: FoodSuggestion): RecentTile {
  return {
    kind: 'food',
    // Stable across refreshes so the list does not re-key on every poll.
    id: `food:${suggestion.food.id}:${suggestion.grams}`,
    food: suggestion.food,
    grams: suggestion.grams,
    portionLabel: `${Math.round(suggestion.grams)} g`,
    nutrients: indicativeNutrients(suggestion.food, suggestion.grams),
    quantityType: 'exact_mass',
    quantitySource: 'user_portion',
  };
}

function mealTile(meal: SavedMeal): RecentTile {
  return {
    kind: 'meal',
    id: `meal:${meal.id}`,
    name: meal.name,
    items: meal.items.map(item => ({
      food: item.food,
      grams: item.grams,
      portionLabel: `${Math.round(item.grams)} g`,
      nutrients: indicativeNutrients(item.food, item.grams),
      quantityType: item.quantityType,
      // These are portions the user set when they saved the meal.
      quantitySource: 'user_portion',
    })),
  };
}

/**
 * Enough to render a tile, and no more.
 *
 * `FoodSummary` carries only kcal per 100 g, so protein and fiber are not
 * knowable here. Fiber is reported as `unknown` rather than 0 — the three-state
 * rule holds on the client too, and a tile must not contribute a confident zero
 * to anything. Every one of these numbers is replaced by the server's frozen
 * values the moment the tile is actually logged.
 */
function indicativeNutrients(food: FoodSummary, grams: number) {
  return {
    kcal: Math.round((food.kcalPer100g * grams) / 100),
    proteinG: 0,
    // Every macro is 'unknown' rather than zero, because the recents strip only
    // carries a food SUMMARY — kcal per 100 g and nothing else. The real values
    // arrive with the commit, which reads them from the corpus server-side. A
    // zero here would render as a measured zero on the tile.
    carbsG: null,
    carbsState: 'unknown' as const,
    fatG: null,
    fatState: 'unknown' as const,
    fiberG: null,
    fiberState: 'unknown' as const,
  };
}

/** The `parsed` frame has quantities but no foods yet. */
function partialDraft(
  phrase: string,
  source: ResolveSource,
  payload: unknown,
): ResolveDraft {
  const parsed = payload as {
    items?: Array<{ itemId: string; matchedText: string; quantity: unknown }>;
    unresolved?: Array<{ text: string }>;
  };

  return {
    draftId: '',
    phrase,
    source,
    items: (parsed.items ?? []).map(item => ({
      itemId: item.itemId,
      matchedText: item.matchedText,
      quantity: item.quantity as ResolveDraft['items'][number]['quantity'],
      food: null,
      candidates: [],
      confidence: 'low' as const,
      nutrients: null,
    })),
    unresolved: parsed.unresolved ?? [],
    aiRunId: null,
    cached: false,
  };
}

/** A pre-stream refusal (quota, throttle) still has to reach the sheet as a problem. */
function fromStreamFailure(failure: unknown): unknown {
  const f = failure as { status?: number; body?: unknown; aborted?: boolean };
  if (f?.aborted) return failure;
  if (typeof f?.status === 'number' && f.status > 0) return toApiError(f.status, f.body);
  // Status 0 is a dead socket, which is the offline case: queue it, do not lose it.
  return new OfflineError();
}

function parse(data: string): unknown {
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

/**
 * The device's IANA zone. Hermes ships full ICU, so this is available; the
 * fallback exists because a wrong-but-present zone beats a crash on a build
 * that trimmed the data.
 */
function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/** Today in the given zone, as YYYY-MM-DD. 'en-CA' formats exactly that way. */
function localDate(timeZone: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}
