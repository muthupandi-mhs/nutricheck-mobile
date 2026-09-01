import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { ApiProvider, type NutriCheckApi } from '../src/api/client';
import { createStubApi } from './fixtures/stubApi';
import { AppStateProvider } from '../src/state/AppState';
import { OnboardingProvider } from '../src/state/Onboarding';
import { ThemeProvider } from '../src/theme/ThemeProvider';
import { WelcomeScreen } from '../src/screens/onboarding/WelcomeScreen';

/**
 * The Google button on Welcome: whether it is there, and where pressing it goes.
 *
 * The gate is half the point. `GOOGLE_SIGNIN_ENABLED` is false in a build with
 * no client ID, and a button that opens onto a 503 is worse than no button — so
 * the absence is asserted as deliberately as the presence. That is the one that
 * breaks quietly: nothing fails to compile, nothing throws, the door just stops
 * working for everybody.
 *
 * The rest of Welcome is covered by the render sweep in `screens.test.tsx`,
 * which runs it with the feature OFF. This file is the other half.
 */

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (effect: () => void) => {
    const React_ = require('react');
    React_.useEffect(effect, [effect]);
  },
}));

/**
 * A getter rather than a value, and no `jest.resetModules` anywhere near this
 * file.
 *
 * Re-requiring the screen to pick up a different config drags a SECOND copy of
 * React in with it, and the providers above it are still holding contexts from
 * the first — which surfaces as `useContext` reading null, several frames deep,
 * in a component that has nothing to do with what is being tested. A live
 * getter flips the flag with one module graph.
 */
let mockGoogleEnabled = true;

jest.mock('../src/config', () => ({
  ...jest.requireActual('../src/config'),
  GOOGLE_WEB_CLIENT_ID: 'test-web-client.apps.googleusercontent.com',
  get GOOGLE_SIGNIN_ENABLED() {
    return mockGoogleEnabled;
  },
}));

const { GoogleSignin } = require('@react-native-google-signin/google-signin');

const session = (onboarded: boolean) => ({
  user: {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'sundar@example.com',
    createdAt: '2026-01-01T00:00:00.000Z',
    onboarded,
  },
  tokens: {
    accessToken: 'a',
    refreshToken: 'r',
    tokenType: 'Bearer' as const,
    expiresIn: 900,
  },
});

async function renderWelcome(api: Partial<NutriCheckApi> = {}) {
  const navigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
    reset: jest.fn(),
    replace: jest.fn(),
    push: jest.fn(),
    setOptions: jest.fn(),
    addListener: jest.fn(() => jest.fn()),
  };

  let tree: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <ThemeProvider>
        <ApiProvider api={{ ...createStubApi(), ...api } as NutriCheckApi}>
          <OnboardingProvider>
            <AppStateProvider>
              <WelcomeScreen
                navigation={navigation as never}
                route={{ key: 'k', name: 'Welcome' } as never}
              />
            </AppStateProvider>
          </OnboardingProvider>
        </ApiProvider>
      </ThemeProvider>,
    );
  });

  const find = (label: string) =>
    tree!.root
      .findAll(n => typeof n.props.accessibilityLabel === 'string')
      .find(n => n.props.accessibilityLabel === label && n.props.onPress);

  const press = async (label: string) => {
    await ReactTestRenderer.act(async () => {
      await find(label)!.props.onPress();
    });
  };

  return { tree: tree!, navigation, find, press };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGoogleEnabled = true;
  GoogleSignin.hasPlayServices.mockResolvedValue(true);
  GoogleSignin.signIn.mockResolvedValue({ type: 'cancelled' });
});

describe('the Google button', () => {
  it('is offered alongside the two email doors', async () => {
    const { tree, find } = await renderWelcome();

    expect(find('Continue with Google')).toBeDefined();
    // The email paths are not replaced by it — they are the ones that work on
    // every phone, and this is a third option rather than a substitution.
    expect(find('Sign in')).toBeDefined();
    expect(find('Create an account')).toBeDefined();

    await ReactTestRenderer.act(async () => tree.unmount());
  });

  it('sends the token on, and lands where the server says', async () => {
    GoogleSignin.signIn.mockResolvedValue({
      type: 'success',
      data: { idToken: 'id-token-abc' },
    });
    const signInWithGoogle = jest.fn(async () => session(true));

    const { tree, navigation, press } = await renderWelcome({
      signInWithGoogle: signInWithGoogle as never,
    });

    await press('Continue with Google');

    expect(signInWithGoogle).toHaveBeenCalledWith({ idToken: 'id-token-abc' });
    // Nothing on this screen decided the destination — `onboarded` did, exactly
    // as it does after a password sign-in.
    expect(navigation.reset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: 'Main' }],
    });

    await ReactTestRenderer.act(async () => tree.unmount());
  });

  it('takes a brand new account to onboarding instead', async () => {
    GoogleSignin.signIn.mockResolvedValue({
      type: 'success',
      data: { idToken: 'id-token-abc' },
    });

    const { tree, navigation, press } = await renderWelcome({
      signInWithGoogle: (async () => session(false)) as never,
    });

    await press('Continue with Google');

    expect(navigation.reset).toHaveBeenCalledWith({
      index: 0,
      routes: [{ name: 'OnboardName' }],
    });

    await ReactTestRenderer.act(async () => tree.unmount());
  });

  /**
   * Backing out of Google's sheet leaves the screen exactly as it was. No
   * notice, and nothing sent — a red box for somebody who pressed back is the
   * app telling them off for changing their mind.
   */
  it('says nothing at all when the sheet is dismissed', async () => {
    GoogleSignin.signIn.mockResolvedValue({ type: 'cancelled' });
    const signInWithGoogle = jest.fn();

    const { tree, navigation, press } = await renderWelcome({
      signInWithGoogle: signInWithGoogle as never,
    });

    await press('Continue with Google');

    expect(signInWithGoogle).not.toHaveBeenCalled();
    expect(navigation.reset).not.toHaveBeenCalled();
    expect(JSON.stringify(tree.toJSON())).not.toContain('did not finish');

    await ReactTestRenderer.act(async () => tree.unmount());
  });

  it('explains itself on a phone that cannot do this, and names the way in that works', async () => {
    GoogleSignin.hasPlayServices.mockRejectedValue(
      Object.assign(new Error('nope'), { code: 'PLAY_SERVICES_NOT_AVAILABLE' }),
    );

    const { tree, press } = await renderWelcome();

    await press('Continue with Google');

    const rendered = JSON.stringify(tree.toJSON());
    expect(rendered).toContain('not available on this phone');
    expect(rendered).toContain('email address and password');

    await ReactTestRenderer.act(async () => tree.unmount());
  });

  it('surfaces a server rejection where it can be read', async () => {
    GoogleSignin.signIn.mockResolvedValue({
      type: 'success',
      data: { idToken: 'forged' },
    });

    const { ApiError } = require('../src/api/types');
    const reject = async () => {
      throw new ApiError({
        type: 'unauthorized',
        title: 'Could not verify that Google sign-in',
        status: 401,
      });
    };

    const { tree, navigation, press } = await renderWelcome({
      signInWithGoogle: reject as never,
    });

    await press('Continue with Google');

    expect(navigation.reset).not.toHaveBeenCalled();
    expect(JSON.stringify(tree.toJSON())).toContain('Could not verify');

    await ReactTestRenderer.act(async () => tree.unmount());
  });
});

describe('with no client ID configured', () => {
  it('does not offer a door that cannot open', async () => {
    mockGoogleEnabled = false;

    const { tree, find } = await renderWelcome();

    expect(find('Continue with Google')).toBeUndefined();
    // And it is still a working sign-in screen without it.
    expect(find('Sign in')).toBeDefined();
    expect(find('Create an account')).toBeDefined();

    await ReactTestRenderer.act(async () => tree.unmount());
  });
});
