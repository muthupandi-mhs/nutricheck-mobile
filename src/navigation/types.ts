import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

/**
 * Routes.
 *
 * Params are values, never callbacks. A screen that hands its parent a function
 * through route params cannot be deep-linked, cannot survive a killed process,
 * and closes over a stale render — so the flows that look like they want a
 * callback (search → portion → commit) each own their own commit instead.
 */

/**
 * The two persistent destinations. Logging is the raised centre action.
 *
 * `You` is deliberately not here: settings are a place you visit, not a place
 * you live, and a permanent tab spends the scarcest real estate on the screen
 * to say so. It is reached from the avatar in Today's top-right instead.
 */
export type TabParamList = {
  Today: undefined;
  Insights: undefined;
};

export type RootStackParamList = {
  // onboarding
  Welcome: undefined;
  SignUp: undefined;
  SignIn: undefined;
  OnboardProfile: undefined;
  OnboardActivity: undefined;
  OnboardObjective: undefined;
  OnboardTargets: undefined;

  /** The tab host. Everything below it is pushed over the tabs. */
  Main: undefined;

  /**
   * `prefill` carries a phrase that failed elsewhere, so nothing is retyped.
   * `autoStart` opens straight into dictation — set by the centre mic button,
   * never by a path that arrives with words already in hand.
   */
  Composer: { prefill?: string; autoStart?: boolean } | undefined;
  /** The confirm sheet. Opens before the resolve call returns. */
  Confirm: { phrase: string; source: 'text' | 'voice' };
  /** `notice` explains why search opened, when it opened as a fallback. */
  Search: { prefill?: string; firstLog?: boolean; notice?: 'timeout' | 'unparsed' | 'quota' | 'off' } | undefined;
  Portion: { foodId: string; firstLog?: boolean };
  CreateFood: { name?: string } | undefined;
  EntryDetail: { entryId: string };

  /** Pushed from Today's top-right avatar, not a tab. */
  You: undefined;
  GoalEditor: undefined;
};

export type ScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;

/** Tab screens need both navigators' types to push onto the parent stack. */
export type TabScreenProps<T extends keyof TabParamList> = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;
