import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { CommitDraft, RecentPhrase, RecentTile } from '../api/client';
import { useApi } from '../api/client';
import { OfflineError, type DaySummary, type Goal, type LogEntry, type MealSlot, type UserProfile } from '../api/types';
import { localDate, mealSlotFor } from '../lib/format';
import { uuid } from '../lib/id';

/**
 * The day store.
 *
 * One rule governs everything here: **the user's input is never lost.** A
 * commit is applied to local state first and reconciled after; a commit that
 * fails on the network is queued rather than surfaced as an error the user has
 * to redo. A tracker that loses a log to a dead connection is a tracker people
 * delete, and no amount of visual polish above this layer compensates for it.
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

  const refresh = useCallback(async () => {
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
    setLoading(false);
  }, [api, date]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    refresh().catch(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
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
        // Offline, or a commit that failed on the way out. Either way the entry
        // is kept locally and retried — there is nothing for the user to redo.
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

  const retryPending = useCallback(async () => {
    const queue = pending;
    if (queue.length === 0) return;
    const survivors: PendingCommit[] = [];
    for (const item of queue) {
      try {
        await api.commit(item.draft);
      } catch {
        survivors.push(item);
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
