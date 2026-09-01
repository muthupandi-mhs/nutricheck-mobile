import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { ApiProvider, type NutriCheckApi } from '../src/api/client';
import { ApiError, OfflineError, type AiMealDraft, type UserProfile } from '../src/api/types';
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
import { WeightScreen } from '../src/screens/weight/WeightScreen';
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
  ['Home', <HomeScreen navigation={navigation} route={{ key: 'k', name: 'Home' } as never} />],
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
  ['Weight', <WeightScreen navigation={navigation} route={{ key: 'k', name: 'Weight' } as never} />],
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
     * rather than returning to it, so the back button off Home walked into
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
   * Home somebody was already using.
   *
   * Resetting there would be wrong in a way that is easy to miss and impossible
   * to unsee: it builds a NEW tab host, so the tab they were on and the place
   * they had scrolled to are gone. Popping back returns them to the one that
   * has been there the whole time.
   */
  it('pops back to the Home it was opened from, rather than building a new one', async () => {
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
 * throws all of it away, and the day on Home then says they ate nothing until
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
    // the dinner, which is not the order Home lists its fixed sections in.
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
    // One clause per fact. It used to carry both what was eaten and what is
    // left; the second is the only one anybody steers by, and a paragraph
    // above a field is something to get past rather than something to read.
    expect(askGreeting({ name: 'Muthupandi', eaten: 1404, target: 2041, logged: 3 })).toBe(
      'Hey Muthupandi, 637 kcal left today. What did you eat?',
    );
  });

  it('offers the whole target before anything is logged', () => {
    // "0 in with 2,041 left" is arithmetic nobody needs at breakfast.
    expect(askGreeting({ name: 'Asha', eaten: 0, target: 2041, logged: 0 })).toBe(
      'Hey Asha, 2,041 kcal to play with today. What did you eat?',
    );
  });

  it('says over without dressing it up, and asks what else', () => {
    // Past the target the question changes: "what did you eat" reads as though
    // the app has not noticed the day already has meals in it.
    expect(askGreeting({ name: 'Asha', eaten: 2300, target: 2041, logged: 4 })).toBe(
      'Hey Asha, 259 kcal over today. What else did you eat?',
    );
  });

  it('drops the greeting rather than writing "Hey ,"', () => {
    // An account made before the name step has no name, and the sentence still
    // has to start with a capital.
    expect(askGreeting({ name: null, eaten: 1404, target: 2041, logged: 3 })).toBe(
      '637 kcal left today. What did you eat?',
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

/**
 * The weight report.
 *
 * The behaviour worth pinning here is the seam, not the layout: this screen
 * writes a number that the server then copies onto the profile and recomputes
 * the targets from. A screen that logged without refreshing would leave the
 * Home dial behind it showing the weight the user just replaced.
 */
describe('weight report', () => {
  const target = (tree: ReactTestRenderer.ReactTestRenderer, label: string) =>
    tree.root
      .findAll(n => typeof n.props.accessibilityLabel === 'string')
      .find(n => n.props.accessibilityLabel === label);

  const texts = (tree: ReactTestRenderer.ReactTestRenderer): string =>
    JSON.stringify(tree.toJSON());

  function screen(api: NutriCheckApi) {
    return (
      <ThemeProvider>
        <ApiProvider api={api}>
          <OnboardingProvider>
            <AppStateProvider>
              <WeightScreen navigation={navigation} route={{ key: 'k', name: 'Weight' } as never} />
            </AppStateProvider>
          </OnboardingProvider>
        </ApiProvider>
      </ThemeProvider>
    );
  }

  async function open(api: NutriCheckApi) {
    let tree: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(screen(api));
    });
    await settle();
    return tree!;
  }

  /**
   * The corner action. It is a plus with no text, so it is found by the
   * accessibility label — which is also the only thing that still says, in
   * words, which of its two jobs it is doing.
   */
  const logButton = (tree: ReactTestRenderer.ReactTestRenderer) =>
    target(tree, "Update today's weight") ?? target(tree, "Log today's weight");

  /** Open the entry sheet and wait for it to finish animating in. */
  async function openSheet(tree: ReactTestRenderer.ReactTestRenderer) {
    await ReactTestRenderer.act(async () => logButton(tree)!.props.onPress?.());
    await settle();
  }

  const save = (tree: ReactTestRenderer.ReactTestRenderer) =>
    ReactTestRenderer.act(async () => target(tree, 'Save')!.props.onPress?.());

  it('logs the weight the stepper is showing, not the one it opened with', async () => {
    const api = createStubApi();
    const logged: Array<{ weightKg: number }> = [];
    api.logWeight = async input => {
      logged.push(input);
      return { points: [], current: { date: '2026-08-26', weightKg: input.weightKg }, start: null, trend: null };
    };

    const tree = await open(api);

    // Nothing is written by opening the sheet.
    expect(logged).toHaveLength(0);
    await openSheet(tree);

    // The stepper opens at the newest reading, not at the profile's weight.
    // They agree in the stub; the assertion is that the field was seeded from
    // the series, which is the copy a backfill leaves behind.
    const down = target(tree, 'Decrease Weight');
    expect(down).toBeTruthy();
    await ReactTestRenderer.act(async () => down!.props.onPress?.());

    await save(tree);

    expect(logged).toHaveLength(1);
    // 79.2 stepped down once at 0.1 kg. Plain subtraction gives
    // 79.10000000000001 here; the stepper rounds to its declared precision,
    // and `toBe` rather than `toBeCloseTo` is what makes that assertable.
    expect(logged[0]!.weightKg).toBe(79.1);

    await ReactTestRenderer.act(async () => tree.unmount());
  });

  it('reloads the app state after a weight lands, so Home stops showing the old one', async () => {
    // The server rewrites the profile and appends a goal inside the same
    // transaction. Without this refresh the dial that opened this screen keeps
    // the superseded weight, and the targets keep the figures derived from it,
    // until something unrelated happens to reload.
    const api = createStubApi();
    let profileReads = 0;
    api.getProfile = async () => {
      profileReads += 1;
      return { ...NAMED };
    };

    const tree = await open(api);
    const before = profileReads;

    await openSheet(tree);
    await save(tree);
    await settle();

    expect(profileReads).toBeGreaterThan(before);

    await ReactTestRenderer.act(async () => tree.unmount());
  });

  it('keeps the figures on screen when a save fails', async () => {
    // Only the write failed. Dropping to the offline empty state would tell
    // somebody with a year of readings that there is nothing to show.
    const api = createStubApi();
    api.logWeight = async () => {
      throw new Error('offline');
    };

    const tree = await open(api);
    await openSheet(tree);
    await save(tree);

    const rendered = texts(tree);
    expect(rendered).toContain('That did not save');
    // The series it loaded is still the series it is drawing.
    expect(rendered).toContain('Started at');
    expect(rendered).not.toContain('Could not load your weight');

    await ReactTestRenderer.act(async () => tree.unmount());
  });

  /**
   * A 404 on a phone with full signal.
   *
   * This screen shipped telling that reader to check their connection, because
   * it caught every error and assumed one cause. Sending somebody to look at
   * the one part of the system that is demonstrably working is worse than
   * saying nothing, so the two cases are now separate and stay separate.
   */
  /**
   * The whole reason the sheet holds a Stepper rather than a plain field.
   *
   * A scale reports 78.4, and the shared stepper accepted digits only — so the
   * point was stripped, 784 was refused as out of range, and the number could
   * not be typed at all. Steppers everywhere else in the app count whole
   * calories and centimetres, which is why nobody had hit it.
   */
  it('takes a typed decimal weight, point or comma', async () => {
    const api = createStubApi();
    const logged: Array<{ weightKg: number }> = [];
    api.logWeight = async input => {
      logged.push(input);
      return { points: [], current: { date: '2026-08-26', weightKg: input.weightKg }, start: null, trend: null };
    };

    const tree = await open(api);

    /**
     * Re-found after every save rather than held across them, because a
     * successful save closes the sheet and unmounts the field. Reusing the
     * handle asserts against a node that is no longer on screen — which is
     * itself worth knowing, and is why the sheet closing is checked here too.
     */
    const box = () =>
      tree.root
        .findAll(n => typeof n.props.onChangeText === 'function')
        .find(n => String(n.props.accessibilityLabel ?? '').startsWith('Weight,'));

    await openSheet(tree);
    expect(box()).toBeTruthy();
    await ReactTestRenderer.act(async () => box()!.props.onChangeText('78.4'));
    await save(tree);
    expect(logged[0]!.weightKg).toBe(78.4);

    // Saved, so the sheet is gone and the field with it.
    expect(box()).toBeUndefined();

    // A comma is the decimal separator on half the world's keypads. Dropping
    // it makes a field somebody cannot type their weight into.
    await openSheet(tree);
    await ReactTestRenderer.act(async () => box()!.props.onChangeText('76,8'));
    await save(tree);
    expect(logged[1]!.weightKg).toBe(76.8);

    await ReactTestRenderer.act(async () => tree.unmount());
  });

  it('does not write anything until Save is pressed', async () => {
    // The sheet is a question, not a live control. Stepping in it must not
    // post a reading per tap.
    const api = createStubApi();
    const logged: Array<{ weightKg: number }> = [];
    api.logWeight = async input => {
      logged.push(input);
      return { points: [], current: { date: '2026-08-26', weightKg: input.weightKg }, start: null, trend: null };
    };

    const tree = await open(api);
    await openSheet(tree);

    const up = target(tree, 'Increase Weight')!;
    await ReactTestRenderer.act(async () => up.props.onPress?.());
    await ReactTestRenderer.act(async () => up.props.onPress?.());

    expect(logged).toHaveLength(0);

    await save(tree);
    expect(logged).toHaveLength(1);
    expect(logged[0]!.weightKg).toBe(79.4);

    await ReactTestRenderer.act(async () => tree.unmount());
  });

  /**
   * The per-day record, under the chart.
   *
   * The line answers "which way is this going"; it cannot answer "did I log
   * Tuesday" or "what exactly did the 14th say", which is what somebody asks
   * when the line does something they did not expect.
   */
  it('lists every reading newest first, with the change each one made', async () => {
    const api = createStubApi();
    api.getWeightSeries = async () => ({
      points: [
        { date: '2026-08-10', weightKg: 80 },
        { date: '2026-08-17', weightKg: 79.4 },
        { date: '2026-08-24', weightKg: 79.7 },
      ],
      current: { date: '2026-08-24', weightKg: 79.7 },
      start: { date: '2026-08-10', weightKg: 80 },
      trend: { kgPerWeek: -0.15, deltaKg: -0.3, spanDays: 14, intendedKgPerWeek: -0.5 },
    });

    const tree = await open(api);
    const rendered = texts(tree);

    expect(rendered).toContain('Readings');
    // Three fits under the fold, so there is nothing to view all OF.
    expect(target(tree, 'View all')).toBeUndefined();

    /**
     * Newest at the top, oldest at the bottom — the reverse of the chart,
     * because the top of a list is where the eye starts.
     *
     * By LAST occurrence, not first. The chart above prints the dates of its
     * two endpoints as axis labels, in chart order, so a first-occurrence
     * search finds "10 Aug" on the axis rather than in the list and reports
     * the list as upside down when it is not.
     */
    const order = ['24 Aug', '17 Aug', '10 Aug'].map(d => rendered.lastIndexOf(d));
    expect(order[0]).toBeGreaterThan(-1);
    expect(order[0]).toBeLessThan(order[1]!);
    expect(order[1]).toBeLessThan(order[2]!);

    // The change is against the previous READING, not the previous day, and
    // it is signed: 79.4 -> 79.7 is a gain even in a run that is trending down.
    expect(rendered).toContain('+0.3');
    expect(rendered).toContain('−0.6');

    // The oldest is the first there has ever been, which is worth saying —
    // and it gets no change, because there is nothing before it.
    expect(rendered).toContain('first reading');

    await ReactTestRenderer.act(async () => tree.unmount());
  });

  it('does not call a clipped window a beginning', async () => {
    // The oldest row in the window is not the first reading ever when there
    // are older ones outside it. Saying "first reading" there would invent a
    // starting point, so the row says nothing instead.
    const api = createStubApi();
    api.getWeightSeries = async () => ({
      points: [
        { date: '2026-08-17', weightKg: 79.4 },
        { date: '2026-08-24', weightKg: 79.7 },
      ],
      current: { date: '2026-08-24', weightKg: 79.7 },
      start: { date: '2025-11-02', weightKg: 88 },
      trend: { kgPerWeek: 0.3, deltaKg: 0.3, spanDays: 7, intendedKgPerWeek: -0.5 },
    });

    const tree = await open(api);
    expect(texts(tree)).not.toContain('first reading');

    await ReactTestRenderer.act(async () => tree.unmount());
  });

  /**
   * Correcting a reading that is not today's.
   *
   * The date has to travel with the save. A correction posted without one
   * rewrites TODAY with a figure from three weeks ago — the server takes the
   * client's date at face value and defaults it to its own today, so the bug
   * would be silent and would move the user's targets as well.
   */
  it('saves a corrected reading under the day it belongs to', async () => {
    const api = createStubApi();
    const logged: Array<{ weightKg: number; date?: string }> = [];
    api.logWeight = async input => {
      logged.push(input);
      return { points: [], current: null, start: null, trend: null };
    };
    api.getWeightSeries = async () => ({
      points: [
        { date: '2026-08-10', weightKg: 80 },
        { date: '2026-08-17', weightKg: 79.4 },
      ],
      current: { date: '2026-08-17', weightKg: 79.4 },
      start: { date: '2026-08-10', weightKg: 80 },
      trend: { kgPerWeek: -0.6, deltaKg: -0.6, spanDays: 7, intendedKgPerWeek: -0.5 },
    });

    const tree = await open(api);

    const row = target(tree, '10 Aug, 80.0 kilograms');
    expect(row).toBeTruthy();
    await ReactTestRenderer.act(async () => row!.props.onPress?.());
    await settle();

    // Titled for the day being corrected, not for today.
    expect(texts(tree)).toContain('Correct 10 Aug');

    await save(tree);
    expect(logged).toEqual([{ weightKg: 80, date: '2026-08-10' }]);

    await ReactTestRenderer.act(async () => tree.unmount());
  });

  it('seeds the sheet from the row that opened it', async () => {
    // Not from `current`. Opening the 10 Aug row at 79.4 would have somebody
    // correct a reading they never took, one tap from saving it.
    const api = createStubApi();
    const logged: Array<{ weightKg: number; date?: string }> = [];
    api.logWeight = async input => {
      logged.push(input);
      return { points: [], current: null, start: null, trend: null };
    };
    api.getWeightSeries = async () => ({
      points: [
        { date: '2026-08-10', weightKg: 80 },
        { date: '2026-08-17', weightKg: 79.4 },
      ],
      current: { date: '2026-08-17', weightKg: 79.4 },
      start: { date: '2026-08-10', weightKg: 80 },
      trend: { kgPerWeek: -0.6, deltaKg: -0.6, spanDays: 7, intendedKgPerWeek: -0.5 },
    });

    const tree = await open(api);

    await ReactTestRenderer.act(async () =>
      target(tree, '10 Aug, 80.0 kilograms')!.props.onPress?.(),
    );
    await settle();

    // One step down from the row's own value, not from the latest reading.
    await ReactTestRenderer.act(async () => target(tree, 'Decrease Weight')!.props.onPress?.());
    await save(tree);

    expect(logged[0]!.weightKg).toBe(79.9);

    await ReactTestRenderer.act(async () => tree.unmount());
  });

  it('promises a recalculation only when the day is the newest reading', async () => {
    // The server copies a weight onto the profile only when it is the newest
    // one. Saying "your targets are recalculated" over an older correction
    // would describe a write that does not happen.
    const api = createStubApi();
    api.getWeightSeries = async () => ({
      points: [
        { date: '2026-08-10', weightKg: 80 },
        { date: '2026-08-17', weightKg: 79.4 },
      ],
      current: { date: '2026-08-17', weightKg: 79.4 },
      start: { date: '2026-08-10', weightKg: 80 },
      trend: { kgPerWeek: -0.6, deltaKg: -0.6, spanDays: 7, intendedKgPerWeek: -0.5 },
    });

    const tree = await open(api);

    await ReactTestRenderer.act(async () =>
      target(tree, '10 Aug, 80.0 kilograms')!.props.onPress?.(),
    );
    await settle();
    expect(texts(tree)).toContain('leaves your current weight and targets untouched');
    expect(texts(tree)).not.toContain('recalculated');

    await ReactTestRenderer.act(async () => tree.unmount());
  });

  it('promises the recalculation when the day IS the newest reading', async () => {
    // The other half of the rule, opened fresh rather than by dismissing the
    // sheet — the exit animation is not something a render test should have to
    // wait on to assert a sentence.
    const api = createStubApi();
    api.getWeightSeries = async () => ({
      points: [
        { date: '2026-08-10', weightKg: 80 },
        { date: '2026-08-17', weightKg: 79.4 },
      ],
      current: { date: '2026-08-17', weightKg: 79.4 },
      start: { date: '2026-08-10', weightKg: 80 },
      trend: { kgPerWeek: -0.6, deltaKg: -0.6, spanDays: 7, intendedKgPerWeek: -0.5 },
    });

    const tree = await open(api);
    await openSheet(tree);

    expect(texts(tree)).toContain('recalculated');
    expect(texts(tree)).not.toContain('leaves your current weight and targets untouched');

    await ReactTestRenderer.act(async () => tree.unmount());
  });

  it('deletes the reading whose row opened the sheet', async () => {
    const api = createStubApi();
    const removed: string[] = [];
    api.deleteWeight = async date => {
      removed.push(date);
      return { points: [], current: null, start: null, trend: null };
    };
    api.getWeightSeries = async () => ({
      points: [
        { date: '2026-08-10', weightKg: 80 },
        { date: '2026-08-17', weightKg: 79.4 },
      ],
      current: { date: '2026-08-17', weightKg: 79.4 },
      start: { date: '2026-08-10', weightKg: 80 },
      trend: { kgPerWeek: -0.6, deltaKg: -0.6, spanDays: 7, intendedKgPerWeek: -0.5 },
    });

    const tree = await open(api);
    await ReactTestRenderer.act(async () =>
      target(tree, '10 Aug, 80.0 kilograms')!.props.onPress?.(),
    );
    await settle();

    await ReactTestRenderer.act(async () =>
      target(tree, 'Delete this reading')!.props.onPress?.(),
    );

    expect(removed).toEqual(['2026-08-10']);

    await ReactTestRenderer.act(async () => tree.unmount());
  });

  it('hides delete when there is only one reading in total', async () => {
    /**
     * The server refuses to delete the last one — the profile's weight is NOT
     * NULL and the goals derive from it — so offering the button would be
     * offering a failure.
     *
     * `start` and `current` landing on the same day is what proves there is
     * exactly one. Counting the window instead would hide the button from
     * anybody whose older readings had scrolled off the ninety days.
     */
    const api = createStubApi();
    api.getWeightSeries = async () => ({
      points: [{ date: '2026-08-17', weightKg: 79.4 }],
      current: { date: '2026-08-17', weightKg: 79.4 },
      start: { date: '2026-08-17', weightKg: 79.4 },
      trend: null,
    });

    const tree = await open(api);
    await ReactTestRenderer.act(async () =>
      target(tree, '17 Aug, 79.4 kilograms')!.props.onPress?.(),
    );
    await settle();

    expect(target(tree, 'Delete this reading')).toBeUndefined();
    // The sheet still opened, and can still correct it.
    expect(texts(tree)).toContain('Correct 17 Aug');

    await ReactTestRenderer.act(async () => tree.unmount());
  });

  it('offers no delete on a day that has no reading', async () => {
    // The plus opens today, and today has not been logged in this fixture.
    // There is nothing there to remove.
    const api = createStubApi();
    api.getWeightSeries = async () => ({
      points: [
        { date: '2026-08-10', weightKg: 80 },
        { date: '2026-08-17', weightKg: 79.4 },
      ],
      current: { date: '2026-08-17', weightKg: 79.4 },
      start: { date: '2026-08-10', weightKg: 80 },
      trend: { kgPerWeek: -0.6, deltaKg: -0.6, spanDays: 7, intendedKgPerWeek: -0.5 },
    });

    const tree = await open(api);
    await openSheet(tree);

    expect(target(tree, 'Delete this reading')).toBeUndefined();

    await ReactTestRenderer.act(async () => tree.unmount());
  });

  it('says which action failed, not just that something did', async () => {
    // "That did not save" is a lie about a delete that failed, and the reader
    // has no other way to tell which of the two did not happen.
    const api = createStubApi();
    api.deleteWeight = async () => {
      throw new Error('boom');
    };
    api.getWeightSeries = async () => ({
      points: [
        { date: '2026-08-10', weightKg: 80 },
        { date: '2026-08-17', weightKg: 79.4 },
      ],
      current: { date: '2026-08-17', weightKg: 79.4 },
      start: { date: '2026-08-10', weightKg: 80 },
      trend: { kgPerWeek: -0.6, deltaKg: -0.6, spanDays: 7, intendedKgPerWeek: -0.5 },
    });

    const tree = await open(api);
    await ReactTestRenderer.act(async () =>
      target(tree, '10 Aug, 80.0 kilograms')!.props.onPress?.(),
    );
    await settle();
    await ReactTestRenderer.act(async () =>
      target(tree, 'Delete this reading')!.props.onPress?.(),
    );

    const rendered = texts(tree);
    expect(rendered).toContain('That did not delete');
    expect(rendered).not.toContain('That did not save');

    await ReactTestRenderer.act(async () => tree.unmount());
  });

  it('shows the latest five, and the rest behind View all', async () => {
    // Somebody weighing in daily has ninety rows here. A screen whose top half
    // is a chart and whose bottom half is three months of scrolling buries the
    // chart, and the question the list answers on arrival is answered by five.
    const api = createStubApi();
    api.getWeightSeries = async () => ({
      points: Array.from({ length: 8 }, (_, i) => ({
        date: `2026-08-0${i + 1}`,
        weightKg: 80 - i * 0.2,
      })),
      current: { date: '2026-08-08', weightKg: 78.6 },
      start: { date: '2026-08-01', weightKg: 80 },
      trend: { kgPerWeek: -1.4, deltaKg: -1.4, spanDays: 7, intendedKgPerWeek: -0.5 },
    });

    const tree = await open(api);

    // Newest five: the 8th down to the 4th. The 1st, 2nd and 3rd are held back.
    /**
     * Distinct labels, not matching nodes.
     *
     * `findAll` walks composites as well as hosts, so one `Press` answers to
     * the predicate several times over — counting nodes reported twenty rows
     * where there were five. The dates are unique, so the labels are.
     */
    const rows = () =>
      new Set(
        tree.root
          .findAll(n => typeof n.props.accessibilityLabel === 'string')
          .map(n => String(n.props.accessibilityLabel))
          .filter(label => /kilograms$/.test(label)),
      ).size;

    expect(rows()).toBe(5);
    expect(target(tree, '1 Aug, 80.0 kilograms')).toBeUndefined();

    await ReactTestRenderer.act(async () => target(tree, 'View all')!.props.onPress?.());

    expect(rows()).toBe(8);
    expect(target(tree, '1 Aug, 80.0 kilograms')).toBeTruthy();
    // And back again, so it is a disclosure rather than a one-way door.
    expect(target(tree, 'Show less')).toBeTruthy();

    await ReactTestRenderer.act(async () => tree.unmount());
  });

  it('keeps the change on the last visible row when the list is truncated', async () => {
    // The row before it exists — it is simply not drawn yet. Reading "previous"
    // off the VISIBLE slice would blank that row's change and, worse, make the
    // oldest visible row claim to be the first reading ever.
    const api = createStubApi();
    api.getWeightSeries = async () => ({
      points: Array.from({ length: 8 }, (_, i) => ({
        date: `2026-08-0${i + 1}`,
        weightKg: 80 - i * 0.2,
      })),
      current: { date: '2026-08-08', weightKg: 78.6 },
      start: { date: '2026-08-01', weightKg: 80 },
      trend: { kgPerWeek: -1.4, deltaKg: -1.4, spanDays: 7, intendedKgPerWeek: -0.5 },
    });

    const tree = await open(api);
    const rendered = texts(tree);

    // Five rows, five changes — including the oldest visible one.
    expect(rendered.split('−0.2').length - 1).toBe(5);
    // And nothing claims to be the beginning, because the beginning is hidden.
    expect(rendered).not.toContain('first reading');

    await ReactTestRenderer.act(async () => tree.unmount());
  });

  it('does not blame the connection for a server error', async () => {
    const api = createStubApi();
    api.getWeightSeries = async () => {
      throw new ApiError({
        type: 'not-found',
        title: 'NotFound',
        status: 404,
        detail: 'Cannot GET /v1/me/weight',
      });
    };

    const tree = await open(api);
    const rendered = texts(tree);

    expect(rendered).toContain('Could not load your weight');
    expect(rendered).toContain('The server could not answer');
    expect(rendered).not.toContain('needs a connection');

    await ReactTestRenderer.act(async () => tree.unmount());
  });

  it('does blame the connection when the socket is actually dead', async () => {
    const api = createStubApi();
    api.getWeightSeries = async () => {
      throw new OfflineError();
    };

    const tree = await open(api);
    expect(texts(tree)).toContain('needs a connection');

    await ReactTestRenderer.act(async () => tree.unmount());
  });

  it('says nothing about pace when there is no rate to be behind', async () => {
    // Somebody maintaining has no intended rate, so "slower than planned" has
    // no meaning — the server sends null and the note is absent, rather than
    // the client inventing a target of zero to compare against.
    const api = createStubApi();
    api.getWeightSeries = async () => ({
      points: [
        { date: '2026-08-01', weightKg: 80 },
        { date: '2026-08-26', weightKg: 79.6 },
      ],
      current: { date: '2026-08-26', weightKg: 79.6 },
      start: { date: '2026-08-01', weightKg: 80 },
      trend: { kgPerWeek: -0.11, deltaKg: -0.4, spanDays: 25, intendedKgPerWeek: null },
    });

    const tree = await open(api);
    const rendered = texts(tree);

    expect(rendered).toContain('Trend');
    expect(rendered).not.toContain('planned');
    expect(rendered).not.toContain('On the pace you set');

    await ReactTestRenderer.act(async () => tree.unmount());
  });
});

/**
 * Where the weight dial goes.
 *
 * It opened the profile editor for as long as the app held one weight and no
 * history — the only thing you could do with the number was change it. The
 * destination is the behaviour, so it is asserted rather than left to the
 * render test, which would pass just as happily with the old target.
 */
describe('the weight dial on Home', () => {
  it('opens the weight report, not the profile editor', async () => {
    (navigation as unknown as { navigate: jest.Mock }).navigate.mockClear();

    let tree: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(async () => {
      tree = ReactTestRenderer.create(
        <ThemeProvider>
          <ApiProvider api={createStubApi()}>
            <OnboardingProvider>
              <AppStateProvider>
                <HomeScreen navigation={navigation} route={{ key: 'k', name: 'Home' } as never} />
              </AppStateProvider>
            </OnboardingProvider>
          </ApiProvider>
        </ThemeProvider>,
      );
    });
    await settle();

    const dial = tree!.root
      .findAll(n => typeof n.props.accessibilityLabel === 'string')
      .find(n => String(n.props.accessibilityLabel).startsWith('Weight,'));

    expect(dial).toBeTruthy();
    // It still says what it will do before the tap.
    expect(String(dial!.props.accessibilityLabel)).toContain('weight history');

    await ReactTestRenderer.act(async () => dial!.props.onPress?.());

    expect((navigation as unknown as { navigate: jest.Mock }).navigate).toHaveBeenCalledWith('Weight');

    await ReactTestRenderer.act(async () => tree!.unmount());
  });
});
