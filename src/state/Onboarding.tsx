import React, { createContext, useContext, useMemo, useState } from 'react';
import type { ActivityLevel, Objective, Sex, UserProfile } from '../api/types';

/**
 * The profile under construction. Must survive a back-swipe on any of the five
 * onboarding screens with fields intact. In memory rather than persisted — a
 * ninety-second flow is not worth restoring across a process death.
 */
export type Draft = {
  sex: Sex;
  birthYear: number;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  objective: Objective;
  rateKgPerWeek: number;
  /**
   * Fixed at metric — the toggle that set it is gone. Kept because the stored
   * profile carries it, so dropping it here would be a contract change rather
   * than a screen one, and because it is what an imperial option would come
   * back through if one is ever wanted.
   */
  units: 'metric' | 'imperial';
};

const INITIAL: Draft = {
  sex: 'male',
  birthYear: new Date().getFullYear() - 30,
  heightCm: 175,
  weightKg: 72,
  activityLevel: 'moderate',
  objective: 'lose',
  rateKgPerWeek: 0.5,
  units: 'metric',
};

type Ctx = {
  draft: Draft;
  patch: (p: Partial<Draft>) => void;
  /** The draft as the wire shape, ready for PATCH /v1/me. */
  toProfile: () => UserProfile;
};

const OnboardingContext = createContext<Ctx | null>(null);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraft] = useState<Draft>(INITIAL);

  const value = useMemo<Ctx>(
    () => ({
      draft,
      patch: p => setDraft(d => ({ ...d, ...p })),
      toProfile: () => ({
        sex: draft.sex,
        // The formula needs age, so a birth year is one field instead of a date
        // picker and no less accurate for a resting-burn estimate.
        birthDate: `${draft.birthYear}-06-15`,
        heightCm: draft.heightCm,
        weightKg: draft.weightKg,
        activityLevel: draft.activityLevel,
        objective: draft.objective,
        rateKgPerWeek: draft.objective === 'maintain' ? 0 : draft.rateKgPerWeek,
        units: draft.units,
      }),
    }),
    [draft],
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding(): Ctx {
  const c = useContext(OnboardingContext);
  if (!c) throw new Error('useOnboarding must be used inside <OnboardingProvider>');
  return c;
}

