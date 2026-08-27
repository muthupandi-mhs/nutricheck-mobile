import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { ApiProvider, type NutriCheckApi } from '../src/api/client';
import { PASSWORD_MIN, type CreateCustomFood, type FoodDetail } from '../src/api/types';
import {
  customFoodSchema,
  emailField,
  existingPasswordField,
  goalTargetsSchema,
  loginSchema,
  newPasswordField,
  portionGramsField,
  registerSchema,
} from '../src/forms/schemas';
import { AppStateProvider } from '../src/state/AppState';
import { ThemeProvider } from '../src/theme/ThemeProvider';
import { CreateFoodScreen } from '../src/screens/search/CreateFoodScreen';
import { createStubApi } from './fixtures/stubApi';

/**
 * The form layer: what the schemas accept, and what the screens do with what
 * they produce.
 *
 * The schema half is where the invariants live — a blank fibre field is not
 * zero grams of fibre — so most of this file is a table of inputs and the wire
 * value each one becomes. The screen half exists because a correct schema
 * wired to the wrong field is still a wrong log.
 */

/** The first message zod reports for a value, or null if it parsed. */
function problem(schema: { safeParse: (v: unknown) => any }, value: unknown): string | null {
  const r = schema.safeParse(value);
  return r.success ? null : r.error.issues[0].message;
}

describe('email', () => {
  it('normalises before it is sent, the way contracts/auth.ts does', () => {
    expect(emailField.parse('  Someone@Example.COM ')).toBe('someone@example.com');
  });

  it('asks for a blank field rather than judging it', () => {
    expect(problem(emailField, '')).toMatch(/Enter the email/);
    expect(problem(emailField, '   ')).toMatch(/Enter the email/);
  });

  it('rejects what is not an address', () => {
    expect(problem(emailField, 'someone')).toMatch(/does not look like/);
    expect(problem(emailField, 'someone@example')).toMatch(/does not look like/);
    expect(problem(emailField, `${'a'.repeat(250)}@example.com`)).toMatch(/longer than/);
  });
});

describe('password', () => {
  it('counts the characters back, since the field shows dots', () => {
    // Built from PASSWORD_MIN rather than restating it. The minimum has moved
    // once already, and a test that hardcodes it fails for the number rather
    // than for the behaviour — which is that the count is counted back.
    expect(problem(newPasswordField, 'short')).toBe(
      `${PASSWORD_MIN} characters minimum — that one has 5.`,
    );
  });

  it('does not apply the minimum to a password that already exists', () => {
    // A rule for a password being created. Enforcing it at sign-in would lock
    // out an older account and tell anyone probing what the rule is.
    expect(problem(existingPasswordField, 'short')).toBeNull();
    expect(problem(existingPasswordField, '')).toMatch(/Enter your password/);
  });

  it('does not trim — a space is a character somebody chose', () => {
    expect(registerSchema.parse({ email: 'a@b.co', password: ' a pass word ' }).password).toBe(
      ' a pass word ',
    );
  });

  it('takes the two shapes apart at the password only', () => {
    const weak = { email: 'a@b.co', password: 'short' };
    expect(registerSchema.safeParse(weak).success).toBe(false);
    expect(loginSchema.safeParse(weak).success).toBe(true);
  });
});

describe('custom food', () => {
  const typed = {
    name: '  Mum’s rajma  ',
    brand: '',
    kcal: '118',
    proteinG: '7.2',
    carbsG: '20',
    fatG: '0.4',
    fiberG: '4.9',
    defaultPortionGrams: '200',
  };

  it('parses the text fields into the request that is posted', () => {
    expect(customFoodSchema.parse(typed)).toEqual<CreateCustomFood>({
      name: 'Mum’s rajma',
      brand: null,
      per100g: {
        kcal: 118,
        proteinG: 7.2,
        carbsG: 20,
        carbsState: 'known',
        fatG: 0.4,
        fatState: 'known',
        fiberG: 4.9,
        fiberState: 'known',
      },
      defaultPortionGrams: 200,
    });
  });

  it('treats a blank nutrient as unknown, and a typed zero as zero', () => {
    // The invariant the whole fibre column rests on. Unknown is left out of the
    // day's numerator; zero is counted, and would drag every day down.
    // Blanking one nutrient says nothing about the others.
    expect(customFoodSchema.parse({ ...typed, fiberG: '' }).per100g).toMatchObject({
      carbsG: 20,
      carbsState: 'known',
      fatG: 0.4,
      fatState: 'known',
      fiberG: null,
      fiberState: 'unknown',
    });
    expect(customFoodSchema.parse({ ...typed, fiberG: '0' }).per100g).toMatchObject({
      fiberG: 0,
      fiberState: 'known',
    });
    expect(customFoodSchema.parse({ ...typed, carbsG: '', fatG: '' }).per100g).toMatchObject({
      carbsG: null,
      carbsState: 'unknown',
      fatG: null,
      fatState: 'unknown',
    });
  });

  it('drops what the numeric keyboard did not stop', () => {
    // `keyboardType="numeric"` is a hint. A paste, a comma or a hardware
    // keyboard all reach the field.
    expect(customFoodSchema.parse({ ...typed, kcal: ' 118 kcal ' }).per100g.kcal).toBe(118);
    expect(
      customFoodSchema.parse({ ...typed, defaultPortionGrams: '1,200' }).defaultPortionGrams,
    ).toBe(1200);
  });

  it('refuses a number that is not one, rather than logging NaN', () => {
    expect(problem(customFoodSchema, { ...typed, kcal: '1.2.3' })).toMatch(/should be a number/);
    expect(problem(customFoodSchema, { ...typed, kcal: '' })).toMatch(/Copy the calories/);
    expect(problem(customFoodSchema, { ...typed, proteinG: '' })).toMatch(/Copy the protein/);
    expect(problem(customFoodSchema, { ...typed, name: '   ' })).toMatch(/Give it a name/);
  });

  it('holds the bounds of the physical world', () => {
    // Fat is 9 kcal/g, so 900 is the ceiling of a per-100 g label, and 100 g
    // cannot contain more than 100 g of protein.
    expect(problem(customFoodSchema, { ...typed, kcal: '1180' })).toMatch(/per 100 g/);
    expect(problem(customFoodSchema, { ...typed, proteinG: '140' })).toMatch(/more than 100 g/);
    expect(problem(customFoodSchema, { ...typed, defaultPortionGrams: '0' })).toMatch(
      /more than zero/,
    );
  });
});

describe('portion grams', () => {
  it('is the same rule the custom-food screen uses', () => {
    expect(portionGramsField.parse('200')).toBe(200);
    expect(problem(portionGramsField, '')).toBe('Enter an amount to log this.');
    expect(problem(portionGramsField, '0')).toMatch(/more than zero/);
    expect(problem(portionGramsField, 'abc')).toBe('Enter an amount to log this.');
  });
});

describe('goal targets', () => {
  it('carries the bounds from contracts/profile.ts SetGoal', () => {
    // All five targets are required together: the schema describes a whole set
    // of goals, and a partial one would let a screen save half a target.
    const valid = { kcal: 2100, proteinG: 130, carbsG: 240, fatG: 58, fiberG: 30 };

    expect(goalTargetsSchema.safeParse(valid).success).toBe(true);
    expect(goalTargetsSchema.safeParse({ ...valid, kcal: 700 }).success).toBe(false);
    expect(goalTargetsSchema.safeParse({ ...valid, kcal: 2100.5 }).success).toBe(false);
    // Zero is a legitimate carb target — a ketogenic goal is not a typo — so
    // the floor is 0 rather than the positive minimum the others carry.
    expect(goalTargetsSchema.safeParse({ ...valid, carbsG: 0 }).success).toBe(true);
    expect(goalTargetsSchema.safeParse({ ...valid, fatG: -1 }).success).toBe(false);
    // A whole macro missing is rejected, not defaulted.
    expect(goalTargetsSchema.safeParse({ kcal: 2100, proteinG: 130, fiberG: 30 }).success).toBe(
      false,
    );
  });
});

// ── the screen ───────────────────────────────────────────────────────────────

const navigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  replace: jest.fn(),
  reset: jest.fn(),
  push: jest.fn(),
  setOptions: jest.fn(),
  addListener: jest.fn(() => jest.fn()),
};

/** A stub whose one interesting method is the one this screen calls. */
function apiCreating(createFood: jest.Mock): NutriCheckApi {
  return { ...createStubApi(), createFood } as unknown as NutriCheckApi;
}

async function renderCreateFood(api: NutriCheckApi) {
  let tree: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <ThemeProvider force="light">
        <ApiProvider api={api}>
          <AppStateProvider>
            <CreateFoodScreen
              navigation={navigation as never}
              route={{ key: 'k', name: 'CreateFood', params: { name: 'Rajma' } } as never}
            />
          </AppStateProvider>
        </ApiProvider>
      </ThemeProvider>,
    );
  });

  /**
   * Fields and buttons alike carry their label as their accessibility label.
   * A pressable matches twice — once as the component, once as the `Pressable`
   * holding the state — so the press target is the one with the state on it.
   */
  const input = (label: string) =>
    tree.root.findAll(n => n.props.accessibilityLabel === label && n.props.onChangeText)[0];
  const pressable = (label: string) =>
    tree.root.findAll(n => n.props.accessibilityLabel === label && n.props.accessibilityState)[0];

  return {
    async type(label: string, value: string) {
      await ReactTestRenderer.act(async () => input(label).props.onChangeText(value));
    },
    async press(label: string) {
      await ReactTestRenderer.act(async () => pressable(label).props.onPress());
    },
    blocked: (label: string) => Boolean(pressable(label).props.accessibilityState.disabled),
    /** Everything the screen is currently saying, messages included. */
    said: () => JSON.stringify(tree.toJSON()),
    unmount: () => ReactTestRenderer.act(async () => tree.unmount()),
  };
}

const SAVE = 'Save and pick a portion';

describe('CreateFoodScreen', () => {
  beforeEach(() => navigation.replace.mockClear());

  it('posts what the schema parsed, not what was typed', async () => {
    const createFood = jest.fn(
      async (input: CreateCustomFood) => ({ id: 'new-id', ...input } as unknown as FoodDetail),
    );
    const screen = await renderCreateFood(apiCreating(createFood));

    // The phrase that found no match arrives as the name, already typed — and
    // two numbers short of a food, so the button is not offered yet.
    expect(screen.blocked(SAVE)).toBe(true);

    await screen.type('Calories', '118 kcal');
    await screen.type('Protein', '7.2');
    expect(screen.blocked(SAVE)).toBe(false);

    await screen.press(SAVE);

    expect(createFood).toHaveBeenCalledWith({
      name: 'Rajma',
      brand: null,
      per100g: {
        kcal: 118,
        proteinG: 7.2,
        // Nothing else was typed, so nothing else is claimed. Not zero.
        carbsG: null,
        carbsState: 'unknown',
        fatG: null,
        fatState: 'unknown',
        fiberG: null,
        fiberState: 'unknown',
      },
      defaultPortionGrams: null,
    });
    expect(navigation.replace).toHaveBeenCalledWith('Portion', { foodId: 'new-id' });

    await screen.unmount();
  });

  it('says nothing until the button is pressed, then says it in words', async () => {
    const screen = await renderCreateFood(createStubApi());

    await screen.type('Name', '');
    expect(screen.said()).not.toMatch(/Give it a name/);

    await screen.press(SAVE);
    expect(screen.said()).toMatch(/Give it a name/);
    expect(screen.said()).toMatch(/Copy the calories/);

    // And from then on it keeps up, rather than waiting for another press.
    await screen.type('Name', 'Rajma');
    expect(screen.said()).not.toMatch(/Give it a name/);
    expect(screen.said()).toMatch(/Copy the calories/);

    await screen.unmount();
  });

  it('lets a portion chip stand in for the keypad', async () => {
    const createFood = jest.fn(
      async (input: CreateCustomFood) => ({ id: 'new-id', ...input } as unknown as FoodDetail),
    );
    const screen = await renderCreateFood(apiCreating(createFood));

    await screen.type('Calories', '118');
    await screen.type('Protein', '7.2');
    await screen.press('200 g');
    await screen.press(SAVE);

    expect(createFood.mock.calls[0][0].defaultPortionGrams).toBe(200);

    await screen.unmount();
  });
});
