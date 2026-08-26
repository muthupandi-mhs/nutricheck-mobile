import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { CommitDraft, RecentPhrase, RecentTile } from '../api/client';
import { useApi } from '../api/client';
import { OfflineError, type DaySummary, type Goal, type LogEntry, type MealSlot, type UserProfile } from '../api/types';
import { localDate, mealSlotFor } from '../lib/format';
import { uuid } from '../lib/id';

/**
 * The day store. One rule governs everything here: the user's input is never
 * lost. Commits apply to local state first and reconcile after; a commit that
 * fails on the network is queued, never surfaced as an error to redo.
 */

export type PendingCommit = { draft: CommitDraft; queuedAt: string; reason: 'offline' | 'error' };

type Toast = { id: string; message: string; detail?: string; entryId: string | null } | null;

type AppState = {
  profile: UserProfile | null;
  goal: Goal | null;
  day: DaySummary | null;
  date: string;
  recents: RecentTile[];
  phrases: RecentPhrase[];
  loading: boolean;
  /** Commits waiting on a connection. Rendered as a banner and as pending rows. */
  pending: PendingCommit[];
  toast: Toast;

  setDate: (d: string) => void;
  refresh: () => Promise<void>;
  /** The two-second route: log a recents tile at its remembered portion. */
  logTile: (tile: RecentTile) => Promise<void>;
  /** The confirm route: commit a reviewed draft. Returns the kcal added. */
  commit: (draft: CommitDraft) => Promise<{ kcal: number; queued: boolean }>;
  deleteEntry: (id: string) => Promise<void>;
  updateItemGrams: (entryId: string, itemId: string, grams: number) => Promise<void>;
  saveProfile: (p: UserProfile) => Promise<void>;
  setGoalOverride: (patch: Partial<Pick<Goal, 'kcal' | 'proteinG' | 'fiberG'>>) => Promise<void>;
  dismissToast: () => void;
  undoToast: () => Promise<void>;
  retryPending: () => Promise<void>;
};

const Ctx = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const api = useApi();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [day, setDay] = useState<DaySummary | null>(null);
  const [date, setDate] = useState(localDate());
  const [recents, setRecents] = useState<RecentTile[]>([]);
  const [phrases, setPhrases] = useState<RecentPhrase[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<PendingCommit[]>([]);
  const [toast, setToast] = useState<Toast>(null);

  /**
   * Reload everything the app shows. **Never rejects.**
   *
   * A background read failing is ordinary here, not exceptional: this app is
   * built to work offline, and the honest response to "the network went away"
   * is to keep showing the last known day, not to throw. It used to rethrow,
   * and every caller that forgot to catch — the focus effect, pull-to-refresh —
   * turned a walk out of Wi-Fi into a red box over a working screen.
   *
   * Nothing is cleared on failure. Stale numbers with a visible sync notice
   * beat an empty screen; wiping state would also lose the pending queue's
   * context.
   */
  const refresh = useCallback(async () => {
    try {
      const [p, g, d, r, ph] = await Promise.all([
        api.getProfile(),
        api.getGoal(),
        api.getDay(date),
        api.getRecents(),
        api.getPhrases(),
      ]);
      setProfile(p);
      setGoal(g);
      setDay(d);
      setRecents(r);
      setPhrases(ph);
    } catch {
      // Deliberately silent. The screen keeps what it had.
    } finally {
      // In `finally`, or a failed first load leaves the skeletons up forever.
      setLoading(false);
    }
  }, [api, date]);

  useEffect(() => {
    setLoading(true);
    // `refresh` owns its own failure and clears `loading` in a finally, so
    // there is nothing left here to catch.
    void refresh();
  }, [refresh]);

  const reloadDay = useCallback(async () => {
    setDay(await api.getDay(date));
  }, [api, date]);

  const commit = useCallback<AppState['commit']>(
    async draft => {
      const kcal = draft.items.reduce((s, i) => s + i.nutrients.kcal, 0);
      try {
        await api.commit(draft);
        await Promise.all([reloadDay(), api.getRecents().then(setRecents), api.getPhrases().then(setPhrases)]);
        return { kcal, queued: false };
      } catch (e) {
        // Offline, or failed on the way out. Either way the entry is kept
        // locally and retried.
        setPending(q => [...q, { draft, queuedAt: new Date().toISOString(), reason: e instanceof OfflineError ? 'offline' : 'error' }]);
        return { kcal, queued: true };
      }
    },
    [api, reloadDay],
  );

  const logTile = useCallback<AppState['logTile']>(
    async tile => {
      const now = new Date();
      const meal: MealSlot = mealSlotFor(now);
      const items =
        tile.kind === 'meal'
          ? tile.items.map(i => ({
              food: i.food,
              grams: i.grams,
              quantityType: i.quantityType,
              quantitySource: i.quantitySource,
              learnedUnitLabel: null,
              nutrients: i.nutrients,
            }))
          : [
              {
                food: tile.food,
                grams: tile.grams,
                quantityType: tile.quantityType,
                quantitySource: tile.quantitySource,
                learnedUnitLabel: null,
                nutrients: tile.nutrients,
              },
            ];

      const clientId = uuid();
      const draft: CommitDraft = {
        clientId,
        loggedAt: now.toISOString(),
        meal,
        source: 'repeat',
        phrase: null,
        draftId: null,
        items,
      };

      const kcal = items.reduce((s, i) => s + i.nutrients.kcal, 0);
      const name = tile.kind === 'meal' ? tile.name : tile.food.name;

      let entryId: string | null = null;
      try {
        const entry: LogEntry = await api.commit(draft);
        entryId = entry.id;
        await Promise.all([reloadDay(), api.getRecents().then(setRecents)]);
      } catch (e) {
        setPending(q => [...q, { draft, queuedAt: now.toISOString(), reason: e instanceof OfflineError ? 'offline' : 'error' }]);
      }

      setToast({
        id: uuid(),
        message: `${name} logged`,
        detail: `+${Math.round(kcal)} kcal · ${meal}`,
        entryId,
      });
    },
    [api, reloadDay],
  );

  const deleteEntry = useCallback<AppState['deleteEntry']>(
    async id => {
      await api.deleteEntry(id);
      await reloadDay();
    },
    [api, reloadDay],
  );

  const updateItemGrams = useCallback<AppState['updateItemGrams']>(
    async (entryId, itemId, grams) => {
      await api.updateItemGrams(entryId, itemId, grams);
      await reloadDay();
    },
    [api, reloadDay],
  );

  const saveProfileFn = useCallback<AppState['saveProfile']>(
    async p => {
      setProfile(await api.saveProfile(p));
      setGoal(await api.getGoal());
      await reloadDay();
    },
    [api, reloadDay],
  );

  const setGoalOverride = useCallback<AppState['setGoalOverride']>(
    async patch => {
      setGoal(await api.setGoal(patch));
      await reloadDay();
    },
    [api, reloadDay],
  );

  const undoRef = useRef(toast);
  undoRef.current = toast;

  const undoToast = useCallback(async () => {
    const t = undoRef.current;
    setToast(null);
    if (t?.entryId) {
      await api.deleteEntry(t.entryId);
      await reloadDay();
    }
  }, [api, reloadDay]);

  /**
   * Drain the queue on the connection that has only just come back.
   *
   * One request when the transport offers the batch route, N when it does not.
   * Both are idempotent on `clientId`, so a partial drain that gets retried
   * cannot produce a second breakfast either way.
   */
  const retryPending = useCallback(async () => {
    const queue = pending;
    if (queue.length === 0) return;

    let survivors: PendingCommit[] = [];

    if (api.commitBatch) {
      try {
        const results = await api.commitBatch(queue.map(p => p.draft));
        // A batch always resolves; failure is per element. Keep only the
        // entries the server could not take, and keep them queued rather than
        // reporting an error the user would have to redo.
        const failed = new Set(
          results.filter(r => r.status === 'failed').map(r => r.clientId),
        );
        survivors = queue.filter(p => failed.has(p.draft.clientId));
      } catch {
        // The batch itself never made it out — still offline. Nothing is lost.
        survivors = queue;
      }
    } else {
      for (const item of queue) {
        try {
          await api.commit(item.draft);
        } catch {
          survivors.push(item);
        }
      }
    }

    setPending(survivors);
    await reloadDay();
  }, [api, pending, reloadDay]);

  const value = useMemo<AppState>(
    () => ({
      profile,
      goal,
      day,
      date,
      recents,
      phrases,
      loading,
      pending,
      toast,
      setDate,
      refresh,
      logTile,
      commit,
      deleteEntry,
      updateItemGrams,
      saveProfile: saveProfileFn,
      setGoalOverride,
      dismissToast: () => setToast(null),
      undoToast,
      retryPending,
    }),
    [
      commit,
      date,
      day,
      deleteEntry,
      goal,
      loading,
      logTile,
      pending,
      phrases,
      profile,
      recents,
      refresh,
      retryPending,
      saveProfileFn,
      setGoalOverride,
      toast,
      undoToast,
      updateItemGrams,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState(): AppState {
  const s = useContext(Ctx);
  if (!s) throw new Error('useAppState must be used inside <AppStateProvider>');
  return s;
}
