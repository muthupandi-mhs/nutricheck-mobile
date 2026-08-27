import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { ApiProvider, type NutriCheckApi } from '../src/api/client';
import type { AiMealDraft } from '../src/api/types';
import { createStubApi } from './fixtures/stubApi';
import { AppStateProvider } from '../src/state/AppState';
import { OnboardingProvider } from '../src/state/Onboarding';
import { ThemeProvider } from '../src/theme/ThemeProvider';

import { ComposerScreen } from '../src/screens/composer/ComposerScreen';
import { ConfirmSheetScreen } from '../src/screens/confirm/ConfirmSheetScreen';
import { RecordingOverlay } from '../src/screens/composer/DictationOverlay';
import { EntryDetailScreen } from '../src/screens/entry/EntryDetailScreen';
import { HomeScreen } from '../src/screens/home/HomeScreen';
import { InsightsScreen } from '../src/screens/insights/InsightsScreen';
import { ActivityScreen } from '../src/screens/onboarding/ActivityScreen';
import { ObjectiveScreen } from '../src/screens/onboarding/ObjectiveScreen';
import { ProfileScreen } from '../src/screens/onboarding/ProfileScreen';
import { AuthEmailScreen } from '../src/screens/onboarding/AuthEmailScreen';
import { AuthPasswordScreen } from '../src/screens/onboarding/AuthPasswordScreen';
import { TargetsScreen } from '../src/screens/onboarding/TargetsScreen';
import { WelcomeScreen } from '../src/screens/onboarding/WelcomeScreen';
import { CreateFoodScreen } from '../src/screens/search/CreateFoodScreen';
import { PortionScreen } from '../src/screens/search/PortionScreen';
import { SearchScreen } from '../src/screens/search/SearchScreen';
import { GoalEditorScreen } from '../src/screens/settings/GoalEditorScreen';
import { YouScreen } from '../src/screens/settings/YouScreen';

/**
 * Every screen, rendered past its loading state.
 *
 * This is the cheapest guard there is against the class of bug that only shows
 * up on the one screen nobody opened this week: a null day, a missing portion,
 * a token that was renamed under a screen no one had open.
 *
 * It used to run each screen twice, once per colour scheme. There is one
 * palette now, so the second pass proved nothing the first did not.
 */

// `useFocusEffect` is the only navigation hook a screen calls; the rest of the
// navigation surface reaches screens as props, which the fakes below supply.
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (effect: () => void) => {
    const React_ = require('react');
    React_.useEffect(effect, [effect]);
  },
}));

const navigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  replace: jest.fn(),
  reset: jest.fn(),
  push: jest.fn(),
  setOptions: jest.fn(),
  addListener: jest.fn(() => jest.fn()),
} as never;

const settle = () =>
  ReactTestRenderer.act(async () => {
    await new Promise<void>(resolve => {
      setTimeout(resolve, 700);
    });
  });

async function renderScreen(node: React.ReactElement) {
  let tree: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <ThemeProvider>
        <ApiProvider api={createStubApi()}>
          <OnboardingProvider>
            <AppStateProvider>{node}</AppStateProvider>
          </OnboardingProvider>
        </ApiProvider>
      </ThemeProvider>,
    );
  });
  await settle();
  const json = tree!.toJSON();
  await ReactTestRenderer.act(async () => tree!.unmount());
  return json;
}

const screens: Array<[string, React.ReactElement]> = [
  ['Welcome', <WelcomeScreen navigation={navigation} route={{ key: 'k', name: 'Welcome' } as never} />],
  ['AuthEmail', <AuthEmailScreen navigation={navigation} route={{ key: 'k', name: 'AuthEmail' } as never} />],
  // Both halves of step two, since one flag decides the title, the rules and
  // the endpoint — rendering only one would leave the other unproven.
  ['AuthPassword (new)', <AuthPasswordScreen navigation={navigation} route={{ key: 'k', name: 'AuthPassword', params: { email: 'someone@example.com', registered: false } } as never} />],
  ['AuthPassword (returning)', <AuthPasswordScreen navigation={navigation} route={{ key: 'k', name: 'AuthPassword', params: { email: 'someone@example.com', registered: true } } as never} />],
  ['Profile', <ProfileScreen navigation={navigation} route={{ key: 'k', name: 'OnboardProfile' } as never} />],
  ['Activity', <ActivityScreen navigation={navigation} route={{ key: 'k', name: 'OnboardActivity' } as never} />],
  ['Objective', <ObjectiveScreen navigation={navigation} route={{ key: 'k', name: 'OnboardObjective' } as never} />],
  ['Targets', <TargetsScreen navigation={navigation} route={{ key: 'k', name: 'OnboardTargets' } as never} />],
  ['Today', <HomeScreen navigation={navigation} route={{ key: 'k', name: 'Today' } as never} />],
  ['Insights', <InsightsScreen navigation={navigation} route={{ key: 'k', name: 'Insights' } as never} />],
  ['Composer', <ComposerScreen navigation={navigation} route={{ key: 'k', name: 'Composer', params: undefined } as never} />],
  [
    'Confirm',
    <ConfirmSheetScreen
      navigation={navigation}
      route={{ key: 'k', name: 'Confirm', params: { phrase: 'two rotis, dal and a bowl of curd', source: 'text' } } as never}
    />,
  ],
  ['Search', <SearchScreen navigation={navigation} route={{ key: 'k', name: 'Search', params: { prefill: 'chicken' } } as never} />],
  [
    'Portion',
    <PortionScreen navigation={navigation} route={{ key: 'k', name: 'Portion', params: { foodId: 'f-curd' } } as never} />,
  ],
  ['CreateFood', <CreateFoodScreen navigation={navigation} route={{ key: 'k', name: 'CreateFood', params: { name: 'Rajma' } } as never} />],
  ['You', <YouScreen navigation={navigation} route={{ key: 'k', name: 'You' } as never} />],
  ['GoalEditor', <GoalEditorScreen navigation={navigation} route={{ key: 'k', name: 'GoalEditor' } as never} />],
];

it.each(screens)('renders %s', async (_name, node) => {
  const json = await renderScreen(node);
  expect(json).toBeTruthy();
});

/**
 * The confirm sheet is the one screen whose TIMING is the product: it opens on
 * skeletons and fills in as the resolver answers, so the user is never looking
 * at a spinner wondering whether it heard them.
 *
 * The shared stub answers instantly and hands back a finished draft — by
 * design, see its header: it exists to prove screens render, not to assert
 * behaviour. Rendering the completed sheet would pass this test while proving
 * none of what it is named for, so this supplies its own staged resolver.
 *
 * The stages mirror the real transport in `httpApi.resolve`: the `parsed` frame
 * carries quantities but NO foods, and the `resolved` frame replaces it
 * wholesale. That ordering is why the sheet can show a portion chip before it
 * knows what the food is.
 */
function stagedAiMealApi(): NutriCheckApi {
  const draft: AiMealDraft = {
    draftId: '77777777-7777-4777-8777-777777777777',
    phrase: 'rendu muttai and 5 dosai and chutney',
    summary: 'Two eggs, five dosai and coconut chutney — about 716 kcal.',
    items: [
      {
        food: { id: 'f-egg', name: 'Egg, boiled', brand: null, kcalPer100g: 155 },
        spokenAs: 'muttai',
        quantity: 2,
        unit: 'egg',
        grams: 100,
        kcal: 155,
        proteinG: 12.6,
        carbsG: 1.1,
        fatG: 10.6,
        fiberG: 0,
        confidence: 'high',
      },
      {
        food: { id: 'f-dosai', name: 'Dosai, plain', brand: null, kcalPer100g: 168 },
        spokenAs: 'dosai',
        quantity: 5,
        unit: 'dosai',
        grams: 300,
        kcal: 504,
        proteinG: 11.7,
        carbsG: 82.2,
        fatG: 16.5,
        fiberG: 3.6,
        confidence: 'high',
      },
      {
        food: { id: 'f-chutney', name: 'Coconut chutney', brand: null, kcalPer100g: 190 },
        spokenAs: 'chutney',
        quantity: 1,
        unit: 'serving',
        grams: 30,
        kcal: 57,
        proteinG: 0.9,
        carbsG: 1.8,
        fatG: 5.1,
        fiberG: 0.9,
        // No amount was stated, so the portion was assumed.
        confidence: 'low',
      },
    ],
    unresolved: [],
    totals: { kcal: 716, proteinG: 25.2, carbsG: 85.1, fatG: 32.2, fiberG: 4.5 },
    estimated: true,
  };

  return {
    ...createStubApi(),
    interpretMeal: async () => {
      // Long enough that the initial render commits with `lines === null`,
      // which is the state the loading affordance is keyed off. One POST, so
      // there is no half-answer to stage -- unlike the resolver, which streamed
      // a parse before its database match landed.
      await new Promise<void>(r => setTimeout(r, 300));
      return draft;
    },
  };
}

describe('confirm sheet', () => {
  it('waits, then shows the meal as estimates rather than measurements', async () => {
    let tree: ReactTestRenderer.ReactTestRenderer | undefined;
    const node = (
      <ThemeProvider>
        <ApiProvider api={stagedAiMealApi()}>
          <OnboardingProvider>
            <AppStateProvider>
              <ConfirmSheetScreen
                navigation={navigation}
                route={
                  {
                    key: 'k',
                    name: 'Confirm',
                    params: { phrase: 'rendu muttai and 5 dosai and chutney', source: 'voice' },
                  } as never
                }
              />
            </AppStateProvider>
          </OnboardingProvider>
        </ApiProvider>
      </ThemeProvider>
    );

    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(node);
    });

    // The sheet is up and the phrase echoed back before the model has answered.
    const waiting = JSON.stringify(tree!.toJSON());
    expect(waiting).toContain('Reading your meal');
    expect(waiting).toContain('rendu muttai and 5 dosai and chutney');
    // The old caption claimed a corpus search. Nothing is searched now, and a
    // caption describing work that is not happening is the sentence someone
    // quotes back when the numbers turn out to be estimates.
    expect(waiting).not.toContain('matching against');

    await ReactTestRenderer.act(async () => {
      await new Promise<void>(resolve => {
        setTimeout(resolve, 2600);
      });
    });

    const filled = JSON.stringify(tree!.toJSON());
    expect(filled).toContain('Dosai, plain');
    expect(filled).toContain('Egg, boiled');
    expect(filled).toContain('Coconut chutney');

    // What we understood, in a sentence, above the numbers.
    expect(filled).toContain('Two eggs, five dosai');

    // And the part that must never be quietly dropped: these were guessed.
    expect(filled).toContain('Estimated by AI');

    await ReactTestRenderer.act(async () => tree!.unmount());
  }, 20000);
});


describe('recording overlay', () => {
  /**
   * The end-of-speech detector is a guess, and it guesses worst on the speech
   * this app exists for: a pause while somebody reaches for the English word
   * for a dish, or a kitchen with a television on. Before Done, the only way
   * out of a turn the detector would not end was Cancel, which discards -- so
   * the sentence somebody had just said correctly was the thing they lost.
   */
  it('offers Done while listening, and calls stop when it is pressed', async () => {
    const onDone = jest.fn();
    let tree: ReactTestRenderer.ReactTestRenderer | undefined;

    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(
        <ThemeProvider>
          <RecordingOverlay transcribing={false} onDone={onDone} onCancel={() => {}} />
        </ThemeProvider>,
      );
    });

    const rendered = JSON.stringify(tree!.toJSON());
    expect(rendered).toContain('Done');
    expect(rendered).toContain('Cancel');

    const done = tree!.root
      .findAll(n => typeof n.props.accessibilityHint === 'string')
      .find(n => n.props.accessibilityHint.includes('Stop listening'));
    expect(done).toBeTruthy();

    await ReactTestRenderer.act(async () => {
      done!.props.onPress();
    });
    expect(onDone).toHaveBeenCalledTimes(1);

    await ReactTestRenderer.act(async () => tree!.unmount());
  });

  it('hides Done once the microphone has closed', async () => {
    let tree: ReactTestRenderer.ReactTestRenderer | undefined;

    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(
        <ThemeProvider>
          <RecordingOverlay transcribing onDone={() => {}} onCancel={() => {}} />
        </ThemeProvider>,
      );
    });

    // Nothing left to stop: the clip is already recorded and on its way.
    // Offering Done here would suggest the upload can be called back.
    const rendered = JSON.stringify(tree!.toJSON());
    expect(rendered).not.toContain('Done');
    expect(rendered).toContain('Cancel');

    await ReactTestRenderer.act(async () => tree!.unmount());
  });
});

describe('entry detail', () => {
  it('degrades to a recoverable message when the entry is gone', async () => {
    const json = await renderScreen(
      <EntryDetailScreen navigation={navigation} route={{ key: 'k', name: 'EntryDetail', params: { entryId: 'does-not-exist' } } as never} />,
    );
    expect(JSON.stringify(json)).toContain('That entry is gone');
  });
});
