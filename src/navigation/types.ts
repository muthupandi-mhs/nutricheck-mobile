import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { SuggestedTargets } from '../api/types';

/**
 * Routes.
 *
 * Params are values, never callbacks. A screen that hands its parent a function
 * through route params cannot be deep-linked, cannot survive a killed process,
 * and closes over a stale render — so the flows that look like they want a
 * callback (search → portion → commit) each own their own commit instead.
 */

/**
 * The three persistent destinations. Logging is the raised centre action.
 *
 * `You` is deliberately not here: settings are a place you visit, not a place
 * you live, and a permanent tab spends the scarcest real estate on the screen
 * to say so. It is reached from the avatar in Home's top-right instead.
 *
 * `Ideas` earned a tab where settings did not, because it is a place you
 * return to: what it shows changes every time something is logged, which is the
 * property that distinguishes a destination from a task. Three is also the
 * ceiling — a fourth would start to crowd the raised action out of the pill.
 */
export type TabParamList = {
  Home: undefined;
  /**
   * Food suggestions, built from the onboarding profile and what is left of
   * today's targets.
   *
   * Takes no params on purpose. Everything it needs is either on the server
   * (the profile) or derivable from the day the app is already showing, and a
   * param would let one tab hand another a stale gap.
   */
  Ideas: undefined;
  Insights: undefined;
};

export type RootStackParamList = {
  // onboarding
  Welcome: undefined;

  /**
   * Step one of the one auth flow there is. Asks for an address, and asks the
   * server whether it already has an account — signing in and signing up are
   * the same two screens, because from the user's side they are the same task
   * and they cannot always tell you which one they are doing.
   */
  AuthEmail: undefined;
  /**
   * Step two: the password, and the call that either signs in or registers.
   *
   * Both values travel as params rather than in a shared store. They are
   * values, they are the whole of what step one produced, and carrying them
   * this way means the screen cannot be reached without them — `registered`
   * decides the title, the rules, and which call is made.
   */
  AuthPassword: { email: string; registered: boolean };
  /**
   * The first onboarding step, and the one question in the flow that feeds no
   * calculation. Takes no params: the name lives in the onboarding draft with
   * every other answer, and is written with them in one PATCH at the end.
   */
  OnboardName: undefined;
  OnboardProfile: undefined;
  OnboardActivity: undefined;
  OnboardObjective: undefined;
  /**
   * How fast. Only on the path where there is a rate to pick — somebody
   * maintaining their weight goes from the objective straight to the targets.
   */
  OnboardRate: undefined;
  /**
   * `suggestion` is fetched on the step before, while the button spins, so the
   * targets screen opens complete rather than filling in under the reader.
   *
   * Optional, and the screen asks for itself when it is missing: the prefetch
   * gives up after a few seconds rather than holding somebody on a screen they
   * have finished with, and a slow model should cost a spinner in one place,
   * not a dead end.
   */
  OnboardTargets: { suggestion?: SuggestedTargets } | undefined;
  /**
   * Listening. The whole of the voice route's front half, and the same screen
   * whether it is somebody's first meal or their four hundredth.
   *
   * `first` marks the onboarding pass, and changes three things: the question
   * at the top, where leaving goes (a reset to Home, since there is a finished
   * flow underneath) and whether typing is offered as a way out. Everything
   * else — the orb, the halo, the language — is deliberately identical, because
   * the first meal is not a tutorial for a different screen.
   */
  /**
   * Onboarding's microphone: a whole screen, one orb, nothing else on it.
   *
   * `first` is what it is for. Inside the app the same job is done by
   * `AskSheet`, which is not a route at all: the tab host mounts it over the
   * live tab, because a screen that covers everything to take one sentence is
   * right at the end of a signup and wrong in the middle of a Tuesday.
   */
  Listen: { first?: boolean } | undefined;
  /**
   * The keyboard half of the voice route: the same question, the same
   * read-back, a different way of answering.
   *
   * `prefill` is words that already exist somewhere — a remembered sentence
   * being adjusted — never a suggestion the screen invented.
   */
  Type: { prefill?: string } | undefined;
  /**
   * What the model made of the words, read back before any of it is logged.
   *
   * The phrase travels, not the parse: params are values that survive a killed
   * process, and a draft is neither small nor still true an hour later. The
   * screen makes its own call. `first` carries the same meaning as on Listen.
   */
  MealDetails: { phrase: string; source: 'text' | 'voice'; first?: boolean };

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
  Search: { prefill?: string; notice?: 'timeout' | 'unparsed' | 'quota' | 'off' } | undefined;
  Portion: { foodId: string };
  CreateFood: { name?: string } | undefined;
  EntryDetail: { entryId: string };

  /**
   * The history calendar, pushed from Home's masthead.
   *
   * Takes no params. It reads the date the app is already looking at from
   * AppState and writes back through the same store, so a date cannot arrive
   * here by one route and leave by another.
   */
  Calendar: undefined;
  /**
   * The weight report, pushed from the weight dial on Home.
   *
   * Takes no params, including the weight it is about. The dial has a figure in
   * hand and passing it would look like a saving — but the screen fetches a
   * series it has to fetch anyway, and a seeded weight would be a second copy
   * of a number that is about to be refetched, wrong for exactly as long as it
   * takes to arrive.
   */
  Weight: undefined;
  /** Pushed from Home's top-right avatar, not a tab. */
  You: undefined;
  /**
   * The profile after onboarding — every answer the flow collected, editable.
   *
   * Takes no params: it reads the saved profile from app state, which is the
   * only copy that is true. Handing it one through a param would let a stale
   * screen seed the editor with figures that have since changed.
   */
  ProfileEditor: undefined;
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
