import type { NativeStackScreenProps } from '@react-navigation/native-stack';

/**
 * Routes, and what each one needs to render itself.
 *
 * Params are values, never callbacks. A screen that hands its parent a
 * function through route params cannot be deep-linked, cannot be restored from
 * a killed process, and quietly leaks a closure over a stale render — so the
 * flows that look like they want a callback (search → portion → commit) each
 * own their own commit instead.
 */
export type RootStackParamList = {
  // onboarding — ninety seconds, ending on a number the user wanted
  Welcome: undefined;
  SignIn: undefined;
  OnboardProfile: undefined;
  OnboardActivity: undefined;
  OnboardObjective: undefined;
  OnboardTargets: undefined;

  // the app
  Home: undefined;
  /** `prefill` carries a phrase that failed elsewhere, so nothing is retyped. */
  Composer: { prefill?: string } | undefined;
  /** The confirm sheet. Opens before the resolve call returns. */
  Confirm: { phrase: string; source: 'text' | 'voice' };
  /** `notice` explains why search opened, when it opened as a fallback. */
  Search:
    | { prefill?: string; firstLog?: boolean; notice?: 'timeout' | 'unparsed' | 'quota' }
    | undefined;
  Portion: { foodId: string; firstLog?: boolean };
  CreateFood: { name?: string } | undefined;
  EntryDetail: { entryId: string };
  Week: undefined;
  Settings: undefined;
  GoalEditor: undefined;
};

export type ScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;
