import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { ApiProvider, type NutriCheckApi } from '../src/api/client';
import type { ResolveDraft } from '../src/api/types';
import { createStubApi } from './fixtures/stubApi';
import { AppStateProvider } from '../src/state/AppState';
import { OnboardingProvider } from '../src/state/Onboarding';
import { ThemeProvider } from '../src/theme/ThemeProvider';

import { ComposerScreen } from '../src/screens/composer/ComposerScreen';
import { ConfirmSheetScreen } from '../src/screens/confirm/ConfirmSheetScreen';
import { EntryDetailScreen } from '../src/screens/entry/EntryDetailScreen';
import { HomeScreen } from '../src/screens/home/HomeScreen';
import { InsightsScreen } from '../src/screens/insights/InsightsScreen';
import { ActivityScreen } from '../src/screens/onboarding/ActivityScreen';
import { ObjectiveScreen } from '../src/screens/onboarding/ObjectiveScreen';
import { ProfileScreen } from '../src/screens/onboarding/ProfileScreen';
import { SignInScreen } from '../src/screens/onboarding/SignInScreen';
import { SignUpScreen } from '../src/screens/onboarding/SignUpScreen';
import { TargetsScreen } from '../src/screens/onboarding/TargetsScreen';
import { WelcomeScreen } from '../src/screens/onboarding/WelcomeScreen';
import { CreateFoodScreen } from '../src/screens/search/CreateFoodScreen';
import { PortionScreen } from '../src/screens/search/PortionScreen';
import { SearchScreen } from '../src/screens/search/SearchScreen';
import { GoalEditorScreen } from '../src/screens/settings/GoalEditorScreen';
import { YouScreen } from '../src/screens/settings/YouScreen';

/**
 * Every screen, rendered past its loading state, in both colour schemes.
 *
 * This is the cheapest guard there is against the class of bug that only shows
 * up on the one screen nobody opened this week: a null day, a missing portion,
 * a token that exists in light and not in dark.
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

async function renderScreen(node: React.ReactElement, scheme: 'light' | 'dark') {
  let tree: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <ThemeProvider force={scheme}>
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
  ['SignUp', <SignUpScreen navigation={navigation} route={{ key: 'k', name: 'SignUp' } as never} />],
  ['SignIn', <SignInScreen navigation={navigation} route={{ key: 'k', name: 'SignIn' } as never} />],
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

describe.each(['light', 'dark'] as const)('%s scheme', scheme => {
  it.each(screens)('renders %s', async (_name, node) => {
    const json = await renderScreen(node, scheme);
    expect(json).toBeTruthy();
  });
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
function stagedResolveApi(): NutriCheckApi {
  const q = (raw: string, grams: number | null) => ({
    type: 'count' as const,
    raw,
    grams,
    source: (grams === null ? 'unknown' : 'food_portion') as 'unknown' | 'food_portion',
    range: null,
  });

  const full: ResolveDraft = {
    draftId: '77777777-7777-4777-8777-777777777777',
    phrase: 'two rotis, dal and a bowl of curd',
    source: 'text',
    items: [
      {
        itemId: '11111111-1111-4111-8111-111111111111',
        matchedText: 'two rotis',
        quantity: q('two rotis', 80),
        food: { id: 'f-roti', name: 'Roti, plain', brand: null, kcalPer100g: 297 },
        candidates: [],
        confidence: 'high',
        nutrients: { kcal: 238, proteinG: 8.8, carbsG: 20, carbsState: 'known', fatG: 5, fatState: 'known', fiberG: 3.9, fiberState: 'known' },
      },
      {
        // Ambiguous AND unquantified: the row is flagged "Which dal?" and its
        // portion chip is an empty question rather than an invented 100 g.
        itemId: '22222222-2222-4222-8222-222222222222',
        matchedText: 'dal',
        quantity: q('dal', null),
        food: { id: 'f-dal', name: 'Dal, cooked', brand: null, kcalPer100g: 116 },
        candidates: [
          { id: 'f-dal-toor', name: 'Toor dal, cooked', brand: null, kcalPer100g: 121 },
          { id: 'f-dal-moong', name: 'Moong dal, cooked', brand: null, kcalPer100g: 105 },
        ],
        confidence: 'low',
        nutrients: null,
      },
    ],
    unresolved: [],
    aiRunId: null,
    cached: false,
  };

  return {
    ...createStubApi(),
    resolve: async (_phrase, _source, onParsed) => {
      // Long enough that the initial render commits with `lines === null`,
      // which is the state the skeletons are keyed off.
      await new Promise<void>(r => setTimeout(r, 80));
      onParsed?.({
        ...full,
        items: full.items.map(item => ({
          ...item,
          food: null,
          candidates: [],
          confidence: 'low' as const,
          nutrients: null,
        })),
      });
      await new Promise<void>(r => setTimeout(r, 220));
      return full;
    },
  };
}

describe('confirm sheet', () => {
  it('opens on skeletons and fills in with the parse', async () => {
    let tree: ReactTestRenderer.ReactTestRenderer | undefined;
    const node = (
      <ThemeProvider force="light">
        <ApiProvider api={stagedResolveApi()}>
          <OnboardingProvider>
            <AppStateProvider>
              <ConfirmSheetScreen
                navigation={navigation}
                route={
                  {
                    key: 'k',
                    name: 'Confirm',
                    params: { phrase: 'two rotis, dal and a bowl of curd', source: 'text' },
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

    // The sheet is up and interactive before the resolver has answered.
    expect(JSON.stringify(tree!.toJSON())).toContain('Reading your meal');

    await ReactTestRenderer.act(async () => {
      await new Promise<void>(resolve => {
        setTimeout(resolve, 2600);
      });
    });

    const filled = JSON.stringify(tree!.toJSON());
    expect(filled).toContain('Roti, plain');
    // "dal" is ambiguous, so its row is flagged and expanded with runners-up.
    expect(filled).toContain('Which dal?');
    // "dal" carries no amount of its own in this phrase, so its portion chip is
    // an empty, focused question rather than a silently invented 100 g.
    expect(filled).toContain('How much?');

    await ReactTestRenderer.act(async () => tree!.unmount());
  }, 20000);
});

describe('entry detail', () => {
  it('degrades to a recoverable message when the entry is gone', async () => {
    const json = await renderScreen(
      <EntryDetailScreen navigation={navigation} route={{ key: 'k', name: 'EntryDetail', params: { entryId: 'does-not-exist' } } as never} />,
      'light',
    );
    expect(JSON.stringify(json)).toContain('That entry is gone');
  });
});
