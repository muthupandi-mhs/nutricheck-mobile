import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { ApiProvider, type NutriCheckApi } from '../src/api/client';
import type { AiMealDraft, UserProfile } from '../src/api/types';
import { createStubApi } from './fixtures/stubApi';
import { mealSlotFor } from '../src/lib/format';
import { AppStateProvider } from '../src/state/AppState';
import { OnboardingProvider } from '../src/state/Onboarding';
import { ThemeProvider } from '../src/theme/ThemeProvider';

import { ComposerScreen } from '../src/screens/composer/ComposerScreen';
import { ConfirmSheetScreen } from '../src/screens/confirm/ConfirmSheetScreen';
import { RecordingOverlay } from '../src/screens/composer/DictationOverlay';
import { EntryDetailScreen } from '../src/screens/entry/EntryDetailScreen';
import { HomeScreen } from '../src/screens/home/HomeScreen';
import { CalendarScreen } from '../src/screens/calendar/CalendarScreen';
import { IdeasScreen } from '../src/screens/ideas/IdeasScreen';
import { InsightsScreen } from '../src/screens/insights/InsightsScreen';
import { ActivityScreen } from '../src/screens/onboarding/ActivityScreen';
import { ObjectiveScreen } from '../src/screens/onboarding/ObjectiveScreen';
import { NameScreen } from '../src/screens/onboarding/NameScreen';
import { ProfileScreen } from '../src/screens/onboarding/ProfileScreen';
import { RateScreen } from '../src/screens/onboarding/RateScreen';
import { AuthEmailScreen } from '../src/screens/onboarding/AuthEmailScreen';
import { AuthPasswordScreen } from '../src/screens/onboarding/AuthPasswordScreen';
import { TargetsScreen } from '../src/screens/onboarding/TargetsScreen';
import { WelcomeScreen } from '../src/screens/onboarding/WelcomeScreen';
import { CreateFoodScreen } from '../src/screens/search/CreateFoodScreen';
import { PortionScreen } from '../src/screens/search/PortionScreen';
import { SearchScreen } from '../src/screens/search/SearchScreen';
import { GoalEditorScreen } from '../src/screens/settings/GoalEditorScreen';
import { ProfileEditorScreen } from '../src/screens/settings/ProfileEditorScreen';
import { AskSheet, askGreeting } from '../src/screens/voice/AskSheet';
import { ListenScreen } from '../src/screens/voice/ListenScreen';
import { MealScreen } from '../src/screens/voice/MealScreen';
import { TypeScreen } from '../src/screens/voice/TypeScreen';
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
  popTo: jest.fn(),
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
  ['Name', <NameScreen navigation={navigation} route={{ key: 'k', name: 'OnboardName' } as never} />],
  ['Profile', <ProfileScreen navigation={navigation} route={{ key: 'k', name: 'OnboardProfile' } as never} />],
  ['Activity', <ActivityScreen navigation={navigation} route={{ key: 'k', name: 'OnboardActivity' } as never} />],
  ['Objective', <ObjectiveScreen navigation={navigation} route={{ key: 'k', name: 'OnboardObjective' } as never} />],
  ['Rate', <RateScreen navigation={navigation} route={{ key: 'k', name: 'OnboardRate' } as never} />],
  ['Targets', <TargetsScreen navigation={navigation} route={{ key: 'k', name: 'OnboardTargets', params: undefined } as never} />],
  ['Listen (first meal)', <ListenScreen navigation={navigation} route={{ key: 'k', name: 'Listen', params: { first: true } } as never} />],
  [
    'Ask sheet',
    <AskSheet onClose={() => {}} onPhrase={() => {}} onSearch={() => {}} />,
  ],
  ['Listen (from the mic button)', <ListenScreen navigation={navigation} route={{ key: 'k', name: 'Listen', params: undefined } as never} />],
  ['Type', <TypeScreen navigation={navigation} route={{ key: 'k', name: 'Type', params: undefined } as never} />],
  ['MealDetails',
    <MealScreen
      navigation={navigation}
      route={{ key: 'k', name: 'MealDetails', params: { phrase: 'rendu dosai and sambar', source: 'voice' } } as never}
    />,
  ],
  ['Today', <HomeScreen navigation={navigation} route={{ key: 'k', name: 'Today' } as never} />],
  ['Ideas', <IdeasScreen navigation={navigation} route={{ key: 'k', name: 'Ideas' } as never} />],
  ['Calendar', <CalendarScreen navigation={navigation} route={{ key: 'k', name: 'Calendar' } as never} />],
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
  ['ProfileEditor', <ProfileEditorScreen navigation={navigation} route={{ key: 'k', name: 'ProfileEditor' } as never} />],
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


/**
 * The first meal's own read-back screen. Two things are worth a test here and
 * neither is layout: the figure at the top has to be the sum of the rows under
 * it, and arriving must never log anything.
 *
 * The same staged resolver as the sheet above, so the wait is real rather than
 * a finished draft handed over on the first render.
 */
describe('meal details', () => {
  it('sums the rows it shows, logs nothing untold, and leaves nothing behind it', async () => {
    const api = stagedAiMealApi();
    const commit = jest.spyOn(api, 'commit');

    let tree: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(
        <ThemeProvider>
          <ApiProvider api={api}>
            <OnboardingProvider>
              <AppStateProvider>
                <MealScreen
                  navigation={navigation}
                  route={
                    {
                      key: 'k',
                      name: 'MealDetails',
                      params: { phrase: 'rendu muttai and 5 dosai and chutney', source: 'voice', first: true },
                    } as never
                  }
                />
              </AppStateProvider>
            </OnboardingProvider>
          </ApiProvider>
        </ThemeProvider>,
      );
    });

    // The sentence is on the screen before the model has answered — it is the
    // only thing the user can check while they wait.
    const waiting = JSON.stringify(tree!.toJSON());
    expect(waiting).toContain('Reading your meal');
    expect(waiting).toContain('rendu muttai and 5 dosai and chutney');

    await ReactTestRenderer.act(async () => {
      await new Promise<void>(resolve => {
        setTimeout(resolve, 2600);
      });
    });

    const filled = JSON.stringify(tree!.toJSON());
    expect(filled).toContain('Egg, boiled');
    expect(filled).toContain('Dosai, plain');
    expect(filled).toContain('Coconut chutney');

    // 155 + 504 + 57. Summed from the rows rather than read off the draft's own
    // totals, so the headline figure cannot disagree with the list beneath it.
    expect(filled).toContain('Add 716 kcal to today');

    // The chutney had no stated amount. That has to be visible on the row, not
    // only in the aggregate.
    expect(filled).toContain('portion assumed');

    // And the claim that must survive every redesign of this screen.
    expect(filled).toContain('not measured');

    expect(commit).not.toHaveBeenCalled();

    /**
     * Adding ends onboarding, and the stack has to end with it.
     *
     * `navigate('Main')` looked right and was not: from React Navigation 7 a
     * navigate to a screen already in the stack pushes ANOTHER copy of it
     * rather than returning to it, so the back button off Today walked into
     * the details of a meal that was already logged — one tap from logging it
     * twice.
     */
    const nav = navigation as unknown as {
      reset: jest.Mock;
      navigate: jest.Mock;
    };
    nav.reset.mockClear();
    nav.navigate.mockClear();

    const add = tree!.root
      .findAll(n => typeof n.props.accessibilityLabel === 'string')
      .find(n => n.props.accessibilityLabel.startsWith('Add 716') && n.props.onPress);
    expect(add).toBeTruthy();

    await ReactTestRenderer.act(async () => {
      add!.props.onPress();
    });

    expect(commit).toHaveBeenCalledTimes(1);
    expect(nav.navigate).not.toHaveBeenCalled();
    expect(nav.reset).toHaveBeenCalledWith({ index: 0, routes: [{ name: 'Main' }] });

    await ReactTestRenderer.act(async () => tree!.unmount());
  }, 20000);

  /**
   * The same screen reached from the mic button, where what is underneath is a
   * Today somebody was already using.
   *
   * Resetting there would be wrong in a way that is easy to miss and impossible
   * to unsee: it builds a NEW tab host, so the tab they were on and the place
   * they had scrolled to are gone. Popping back returns them to the one that
   * has been there the whole time.
   */
  it('pops back to the Today it was opened from, rather than building a new one', async () => {
    const api = stagedAiMealApi();
    const commit = jest.spyOn(api, 'commit');

    let tree: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(
        <ThemeProvider>
          <ApiProvider api={api}>
            <OnboardingProvider>
              <AppStateProvider>
                <MealScreen
                  navigation={navigation}
                  route={
                    {
                      key: 'k',
                      name: 'MealDetails',
                      params: { phrase: 'rendu muttai and 5 dosai and chutney', source: 'voice' },
                    } as never
                  }
                />
              </AppStateProvider>
            </OnboardingProvider>
          </ApiProvider>
        </ThemeProvider>,
      );
    });

    await ReactTestRenderer.act(async () => {
      await new Promise<void>(resolve => {
        setTimeout(resolve, 2600);
      });
    });

    // One repair, and it is going back to the words. The editable confirm
    // sheet used to be offered here as a second door and is deliberately gone:
    // two ways to fix the same thing, in two languages, on the screen where
    // somebody is deciding whether to press Add.
    expect(JSON.stringify(tree!.toJSON())).not.toContain('Fix the details');

    const nav = navigation as unknown as {
      reset: jest.Mock;
      navigate: jest.Mock;
      popTo: jest.Mock;
    };
    nav.reset.mockClear();
    nav.navigate.mockClear();
    nav.popTo.mockClear();

    const add = tree!.root
      .findAll(n => typeof n.props.accessibilityLabel === 'string')
      .find(n => n.props.accessibilityLabel.startsWith('Add 716') && n.props.onPress);

    await ReactTestRenderer.act(async () => {
      add!.props.onPress();
    });

    expect(commit).toHaveBeenCalledTimes(1);
    expect(nav.popTo).toHaveBeenCalledWith('Main');
    expect(nav.reset).not.toHaveBeenCalled();
    expect(nav.navigate).not.toHaveBeenCalled();

    await ReactTestRenderer.act(async () => tree!.unmount());
  }, 20000);
});

/**
 * The keyboard half of the voice route. Two things matter and neither is
 * layout: it must hand the words to the same read-back the microphone does,
 * marked as typed, and it must not be able to send an empty sentence.
 */
describe('type screen', () => {
  it('hands typed words to the read-back, and refuses an empty one', async () => {
    let tree: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(
        <ThemeProvider>
          <ApiProvider api={createStubApi()}>
            <OnboardingProvider>
              <AppStateProvider>
                <TypeScreen
                  navigation={navigation}
                  route={{ key: 'k', name: 'Type', params: undefined } as never}
                />
              </AppStateProvider>
            </OnboardingProvider>
          </ApiProvider>
        </ThemeProvider>,
      );
    });
    await settle();

    const nav = navigation as unknown as { navigate: jest.Mock };
    nav.navigate.mockClear();

    const input = tree!.root.findAll(n => n.props.onChangeText)[0];
    const button = tree!.root
      .findAll(n => typeof n.props.accessibilityLabel === 'string')
      .find(n => n.props.accessibilityLabel === 'Read my meal');
    expect(input).toBeTruthy();
    expect(button).toBeTruthy();

    // Empty, and whitespace is empty too — a space bar is not a meal.
    await ReactTestRenderer.act(async () => {
      input!.props.onChangeText('   ');
    });
    await ReactTestRenderer.act(async () => {
      button!.props.onPress?.();
    });
    expect(nav.navigate).not.toHaveBeenCalled();

    await ReactTestRenderer.act(async () => {
      input!.props.onChangeText('  two rotis and dal  ');
    });
    await ReactTestRenderer.act(async () => {
      button!.props.onPress?.();
    });

    // Trimmed, and marked as typed: `source` is what the eval set slices on,
    // so it has to say how the words actually arrived.
    expect(nav.navigate).toHaveBeenCalledWith('MealDetails', {
      phrase: 'two rotis and dal',
      source: 'text',
    });

    await ReactTestRenderer.act(async () => tree!.unmount());
  }, 20000);
});

/**
 * A whole day said in one sentence, at the end of it.
 *
 * This is how the app is actually spoken to — "innaiku kalaila lemon rice
 * sambar apram rendu muttai and mathiyam chicken briyani ... iravu 3
 * chappathi" — and every time word in it is a fact about when somebody ate.
 * Logging that as one dinner because that is when they happened to be talking
 * throws all of it away, and the day on Today then says they ate nothing until
 * ten at night.
 */
describe('a day in one sentence', () => {
  const DAY =
    'innaiku kalaila lemon rice sambar apram rendu muttai and mathiyam chicken briyani raitha and evening vengaya bajji 5 and iravu 3 chappathi';

  function item(name: string, meal: 'breakfast' | 'lunch' | 'snack' | 'dinner' | null, kcalOf: number) {
    return {
      food: { id: `f-${name.toLowerCase().replace(/\W+/g, '-')}`, name, brand: null, kcalPer100g: 100 },
      spokenAs: name.toLowerCase(),
      quantity: 1,
      unit: 'serving',
      grams: 100,
      kcal: kcalOf,
      proteinG: 5,
      carbsG: 20,
      fatG: 4,
      fiberG: 2,
      confidence: 'high' as const,
      meal,
    };
  }

  function dayApi(): NutriCheckApi {
    return {
      ...createStubApi(),
      interpretMeal: async () => ({
        draftId: '88888888-8888-4888-8888-888888888888',
        phrase: DAY,
        summary: 'Four meals across the day.',
        items: [
          item('Lemon rice', 'breakfast', 300),
          item('Sambar', 'breakfast', 120),
          item('Egg, boiled', 'breakfast', 155),
          item('Chicken biryani', 'lunch', 700),
          item('Raita', 'lunch', 90),
          item('Onion bajji', 'snack', 250),
          item('Chappathi', 'dinner', 330),
        ],
        unresolved: [],
        totals: { kcal: 1945, proteinG: 35, carbsG: 140, fatG: 28, fiberG: 14 },
        estimated: true as const,
      }),
    };
  }

  it('files each part of the day under the meal its words named', async () => {
    const api = dayApi();
    const commit = jest.spyOn(api, 'commit');

    let tree: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(
        <ThemeProvider>
          <ApiProvider api={api}>
            <OnboardingProvider>
              <AppStateProvider>
                <MealScreen
                  navigation={navigation}
                  route={{ key: 'k', name: 'MealDetails', params: { phrase: DAY, source: 'voice' } } as never}
                />
              </AppStateProvider>
            </OnboardingProvider>
          </ApiProvider>
        </ThemeProvider>,
      );
    });
    await settle();

    // Four headings, in the order the day happened — the evening bajji before
    // the dinner, which is not the order Today lists its fixed sections in.
    const shown = JSON.stringify(tree!.toJSON());
    for (const label of ['BREAKFAST', 'LUNCH', 'SNACK', 'DINNER']) {
      expect(shown).toContain(label);
    }
    expect(shown.indexOf('SNACK')).toBeLessThan(shown.indexOf('DINNER'));

    // And the bar says what it is about to do, rather than naming one meal.
    expect(shown).toContain('4 meals');

    const nav = navigation as unknown as { popTo: jest.Mock };
    nav.popTo.mockClear();
    commit.mockClear();

    const add = tree!.root
      .findAll(n => typeof n.props.accessibilityLabel === 'string')
      .find(n => n.props.accessibilityLabel.startsWith('Add ') && n.props.onPress);

    await ReactTestRenderer.act(async () => {
      add!.props.onPress();
    });

    // One entry per meal, each carrying the whole sentence — it is the
    // reproducible input behind all four, and cutting it into pieces would
    // store something nobody said.
    expect(commit).toHaveBeenCalledTimes(4);
    const slots = commit.mock.calls.map(([draft]) => draft.meal);
    expect(slots).toEqual(['breakfast', 'lunch', 'snack', 'dinner']);
    expect(commit.mock.calls.map(([draft]) => draft.items.length)).toEqual([3, 2, 1, 1]);
    expect(commit.mock.calls.every(([draft]) => draft.phrase === DAY)).toBe(true);

    await ReactTestRenderer.act(async () => tree!.unmount());
  }, 20000);

  it('falls back to the clock when the sentence names no time', async () => {
    const api = dayApi();
    jest.spyOn(api, 'interpretMeal').mockResolvedValue({
      draftId: '99999999-9999-4999-8999-999999999999',
      phrase: 'two dosai and chutney',
      summary: 'Two dosai and chutney.',
      // No time words, so the model returns null and must not guess: a dish is
      // not a time of day, whatever a language model thinks idli means.
      items: [item('Dosai, plain', null, 210), item('Chutney', null, 57)],
      unresolved: [],
      totals: { kcal: 267, proteinG: 5, carbsG: 30, fatG: 9, fiberG: 3 },
      estimated: true as const,
    });
    const commit = jest.spyOn(api, 'commit');

    let tree: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(
        <ThemeProvider>
          <ApiProvider api={api}>
            <OnboardingProvider>
              <AppStateProvider>
                <MealScreen
                  navigation={navigation}
                  route={
                    { key: 'k', name: 'MealDetails', params: { phrase: 'two dosai and chutney', source: 'voice' } } as never
                  }
                />
              </AppStateProvider>
            </OnboardingProvider>
          </ApiProvider>
        </ThemeProvider>,
      );
    });
    await settle();

    // One meal, so no headings and no count: the screen looks exactly as it
    // did before any of this, which is the ordinary case.
    expect(JSON.stringify(tree!.toJSON())).not.toContain('meals');

    commit.mockClear();
    const add = tree!.root
      .findAll(n => typeof n.props.accessibilityLabel === 'string')
      .find(n => n.props.accessibilityLabel.startsWith('Add ') && n.props.onPress);
    await ReactTestRenderer.act(async () => {
      add!.props.onPress();
    });

    expect(commit).toHaveBeenCalledTimes(1);
    expect(commit.mock.calls[0]![0].meal).toBe(mealSlotFor());

    await ReactTestRenderer.act(async () => tree!.unmount());
  }, 20000);
});

/**
 * The line the sheet opens with reads the day's numbers, which makes it code
 * rather than copy: "you're 1,404 in" is a claim, and the way a claim like that
 * goes wrong is silently, in the one state nobody thought to open the sheet in.
 */
describe('ask greeting', () => {
  it('greets by name and says where the day stands', () => {
    expect(askGreeting({ name: 'Muthupandi', eaten: 1404, target: 2041, logged: 3 })).toBe(
      "Hey Muthupandi, you're 1,404 in with 637 kcal left today. What did you eat?",
    );
  });

  it('says the whole target is still theirs before anything is logged', () => {
    // "0 in with 2,041 left" is arithmetic nobody needs at breakfast.
    expect(askGreeting({ name: 'Asha', eaten: 0, target: 2041, logged: 0 })).toBe(
      'Hey Asha, nothing logged yet — the whole 2,041 kcal is still yours. What did you eat?',
    );
  });

  it('says over without dressing it up, and asks what else', () => {
    // Past the target the question changes: "what did you eat" reads as though
    // the app has not noticed the day already has meals in it.
    expect(askGreeting({ name: 'Asha', eaten: 2300, target: 2041, logged: 4 })).toBe(
      "Hey Asha, you're 259 kcal past today's target. What else did you eat?",
    );
  });

  it('drops the greeting rather than writing "Hey ,"', () => {
    // An account made before the name step has no name, and the sentence still
    // has to start with a capital.
    expect(askGreeting({ name: null, eaten: 1404, target: 2041, logged: 3 })).toBe(
      "You're 1,404 in with 637 kcal left today. What did you eat?",
    );
  });

  it('asks the question and nothing else when there is no target yet', () => {
    // A brand-new account, or a day that has not loaded. Every other line here
    // would be dividing by a goal that does not exist.
    expect(askGreeting({ name: 'Asha', eaten: 0, target: 0, logged: 0 })).toBe(
      'Hey Asha, what did you eat?',
    );
  });
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

/**
 * The profile after onboarding. Editable, and the edit has to reach the wire —
 * a screen that collects a new weight and posts the old one is worse than no
 * screen, because the number on it says the change was taken.
 */
/** A profile that HAS a surname, so clearing one is a thing that can happen. */
const NAMED: UserProfile = {
  firstName: 'Alex',
  lastName: 'Rivera',
  sex: 'male',
  birthDate: '1995-04-12',
  heightCm: 175,
  weightKg: 72,
  activityLevel: 'moderate',
  objective: 'lose',
  rateKgPerWeek: 0.5,
  units: 'metric',
};

describe('profile editor', () => {
  /**
   * By label, never by index. A `Field` renders three nodes that each carry an
   * `onChangeText` — the component, its inner view and the input — so the
   * second entry in that list is still the first field, and a test that types
   * into it is quietly typing in the wrong box.
   */
  const input = (tree: ReactTestRenderer.ReactTestRenderer, label: string) =>
    tree.root
      .findAll(n => typeof n.props.onChangeText === 'function')
      .find(n => n.props.accessibilityLabel === label);

  const target = (tree: ReactTestRenderer.ReactTestRenderer, label: string) =>
    tree.root
      .findAll(n => typeof n.props.accessibilityLabel === 'string')
      .find(n => n.props.accessibilityLabel === label);

  function editor(api: NutriCheckApi) {
    return (
      <ThemeProvider>
        <ApiProvider api={api}>
          <OnboardingProvider>
            <AppStateProvider>
              <ProfileEditorScreen
                navigation={navigation}
                route={{ key: 'k', name: 'ProfileEditor' } as never}
              />
            </AppStateProvider>
          </OnboardingProvider>
        </ApiProvider>
      </ThemeProvider>
    );
  }

  it('posts the edited profile, not the one it opened with', async () => {
    const api = createStubApi();
    const saved: UserProfile[] = [];
    api.saveProfile = async p => {
      saved.push(p);
      return p;
    };

    let tree: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(editor(api));
    });
    await settle();

    const by = (label: string) => target(tree!, label);

    // A name, since the stub account predates the name step and the schema
    // refuses a blank one.
    await ReactTestRenderer.act(async () =>
      input(tree!, 'First name')!.props.onChangeText('  Alex  '),
    );

    // The one edit anybody comes back for.
    const heavier = by('Increase Current weight');
    expect(heavier).toBeTruthy();
    await ReactTestRenderer.act(async () => heavier!.props.onPress?.());

    // And a goal that no longer wants a rate. Maintain stores zero, so the
    // rate left over from "lose" must not travel with it.
    const maintain = by('Stay where I am');
    expect(maintain).toBeTruthy();
    await ReactTestRenderer.act(async () => maintain!.props.onPress?.());

    await ReactTestRenderer.act(async () => by('Save profile')!.props.onPress?.());

    expect(saved).toHaveLength(1);
    expect(saved[0].firstName).toBe('Alex');
    expect(saved[0].weightKg).toBe(73);
    expect(saved[0].objective).toBe('maintain');
    expect(saved[0].rateKgPerWeek).toBe(0);

    await ReactTestRenderer.act(async () => tree!.unmount());
  });

  /**
   * The save is a MERGE on the server, so a key left out of the body keeps what
   * is stored. A cleared surname sent as `undefined` would be dropped by
   * JSON.stringify and reappear on the next load — the field would look like it
   * had been deleted right up until the screen was opened again.
   */
  it('clears a surname with null rather than omitting it', async () => {
    const api = createStubApi();
    const saved: UserProfile[] = [];
    api.getProfile = async () => ({ ...NAMED });
    api.saveProfile = async p => {
      saved.push(p);
      return p;
    };

    let tree: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(editor(api));
    });
    await settle();

    await ReactTestRenderer.act(async () =>
      input(tree!, 'Last name (optional)')!.props.onChangeText(''),
    );

    await ReactTestRenderer.act(async () =>
      target(tree!, 'Save profile')!.props.onPress?.(),
    );

    expect(saved).toHaveLength(1);
    // Null, and present. `toBeNull` would also pass on undefined with `toBe`,
    // so the key itself is asserted.
    expect(Object.keys(saved[0])).toContain('lastName');
    expect(saved[0].lastName).toBeNull();
    expect(saved[0].firstName).toBe('Alex');

    await ReactTestRenderer.act(async () => tree!.unmount());
  });

  it('refuses to save without a first name, and says why', async () => {
    const api = createStubApi();
    const saved: UserProfile[] = [];
    api.saveProfile = async p => {
      saved.push(p);
      return p;
    };

    let tree: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(editor(api));
    });
    await settle();

    await ReactTestRenderer.act(async () => target(tree!, 'Save profile')!.props.onPress?.());

    expect(saved).toHaveLength(0);
    expect(JSON.stringify(tree!.toJSON())).toContain('What should we call you');

    await ReactTestRenderer.act(async () => tree!.unmount());
  });
});
