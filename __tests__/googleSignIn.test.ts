import axios, { type AxiosAdapter } from 'axios';
import { createHttpApi } from '../src/api/http/httpApi';
import { createMemoryTokenStore } from '../src/api/http/tokens';

/**
 * The Google door, from the native module up to the wire.
 *
 * Two things are being pinned here, and only one of them is happy-path. The
 * first is that every way Google's sheet can end has a named outcome, because
 * the difference between "they changed their mind" and "this phone cannot do
 * this" is the difference between a silent screen and a notice — and the
 * library draws that line in two different places (a `cancelled` RESPONSE on
 * one path, a THROWN error carrying a code on another). Handling one and not
 * the other is a bug you only find on a device.
 *
 * The second is what the request looks like. The token is the whole of it: an
 * `email` field alongside would be an account-takeover primitive, since this
 * process chooses what goes in it.
 *
 * `../src/config` is mocked because the real one ships with an empty client ID,
 * which correctly disables the whole feature — testing against it would assert
 * that a switch which is off is off.
 */
jest.mock('../src/config', () => ({
  ...jest.requireActual('../src/config'),
  GOOGLE_WEB_CLIENT_ID: 'test-web-client.apps.googleusercontent.com',
  GOOGLE_SIGNIN_ENABLED: true,
}));

const native = require('@react-native-google-signin/google-signin');

const { GoogleSignin, statusCodes } = native;

/** Imported after the config mock is registered, so it reads the mocked values. */
const { signInWithGoogle, endGoogleSession } = require('../src/lib/googleSession');

/** What the module hands back on a real, completed sign-in. */
const success = (idToken: string | null = 'id-token-abc') => ({
  type: 'success',
  data: { idToken, user: { email: 'sundar@example.com' } },
});

/** A thrown native error, which is a plain object with a `code`. */
function nativeError(code: string) {
  return Object.assign(new Error(code), { code });
}

beforeEach(() => {
  jest.clearAllMocks();
  GoogleSignin.hasPlayServices.mockResolvedValue(true);
  GoogleSignin.signIn.mockResolvedValue({ type: 'cancelled' });
  GoogleSignin.signOut.mockResolvedValue(null);
});

describe('signInWithGoogle', () => {
  it('returns the ID token when the flow completes', async () => {
    GoogleSignin.signIn.mockResolvedValue(success());

    await expect(signInWithGoogle()).resolves.toEqual({
      kind: 'token',
      idToken: 'id-token-abc',
    });
  });

  /**
   * `configure` runs once per process, so these need a module that has never
   * run it — the suite above has, and clearing the mock erases the record
   * rather than the fact. Resetting the registry hands back a genuinely
   * fresh module, which means re-reading the native mock too: the factory
   * builds a new object each reset, and the stale reference would be
   * watching a module nothing calls.
   */
  function freshModule() {
    jest.resetModules();
    const fresh = require('@react-native-google-signin/google-signin');
    fresh.GoogleSignin.hasPlayServices.mockResolvedValue(true);
    fresh.GoogleSignin.signIn.mockResolvedValue(success());
    return {
      ...require('../src/lib/googleSession'),
      GoogleSignin: fresh.GoogleSignin,
    };
  }

  it('configures with the WEB client id, which is what lands in aud', async () => {
    const g = freshModule();

    await g.signInWithGoogle();

    expect(g.GoogleSignin.configure).toHaveBeenCalledWith(
      expect.objectContaining({
        webClientId: 'test-web-client.apps.googleusercontent.com',
      }),
    );
  });

  it('does not ask for offline access, having no server-side Google calls to make', async () => {
    const g = freshModule();

    await g.signInWithGoogle();

    const [options] = g.GoogleSignin.configure.mock.calls.at(-1);
    expect(options.offlineAccess).toBeUndefined();
  });

  it('configures once, however many times somebody signs in', async () => {
    const g = freshModule();

    await g.signInWithGoogle();
    await g.signInWithGoogle();
    await g.signInWithGoogle();

    expect(g.GoogleSignin.configure).toHaveBeenCalledTimes(1);
  });

  it('checks Play Services before opening anything', async () => {
    GoogleSignin.signIn.mockResolvedValue(success());

    await signInWithGoogle();

    expect(GoogleSignin.hasPlayServices).toHaveBeenCalled();
  });

  describe('backing out', () => {
    /**
     * Both spellings, because both happen. Which one you get depends on the
     * platform and on how the sheet was dismissed, and a build that handles
     * only the response shape shows an error notice to somebody who pressed
     * back — telling them off for using the control correctly.
     */
    it('reads a cancelled RESPONSE as cancelled, not as a failure', async () => {
      GoogleSignin.signIn.mockResolvedValue({ type: 'cancelled' });

      await expect(signInWithGoogle()).resolves.toEqual({ kind: 'cancelled' });
    });

    it('reads a THROWN cancellation the same way', async () => {
      GoogleSignin.signIn.mockRejectedValue(
        nativeError(statusCodes.SIGN_IN_CANCELLED),
      );

      await expect(signInWithGoogle()).resolves.toEqual({ kind: 'cancelled' });
    });

    it('treats a double tap on an open sheet as nothing happening', async () => {
      GoogleSignin.signIn.mockRejectedValue(nativeError(statusCodes.IN_PROGRESS));

      await expect(signInWithGoogle()).resolves.toEqual({ kind: 'cancelled' });
    });
  });

  describe('when it cannot work at all', () => {
    it('names a phone without Play Services as unavailable, not failed', async () => {
      GoogleSignin.hasPlayServices.mockRejectedValue(
        nativeError(statusCodes.PLAY_SERVICES_NOT_AVAILABLE),
      );

      await expect(signInWithGoogle()).resolves.toMatchObject({
        kind: 'unavailable',
      });
    });

    /**
     * Typed nullable by the library. A success with no token is no use — the
     * server has nothing to verify — so it is a failure here rather than a
     * success that the next line dereferences.
     */
    it('fails on a success carrying no token', async () => {
      GoogleSignin.signIn.mockResolvedValue(success(null));

      await expect(signInWithGoogle()).resolves.toEqual({ kind: 'failed' });
    });

    it('fails, rather than throwing, on an error it has never heard of', async () => {
      GoogleSignin.signIn.mockRejectedValue(new Error('something native'));

      await expect(signInWithGoogle()).resolves.toEqual({ kind: 'failed' });
    });
  });
});

describe('endGoogleSession', () => {
  it('signs out of Google, so the next sign-in can choose an account', async () => {
    GoogleSignin.signIn.mockResolvedValue(success());
    await signInWithGoogle();

    await endGoogleSession();

    expect(GoogleSignin.signOut).toHaveBeenCalled();
  });

  it('survives Google refusing, because our own sign-out already happened', async () => {
    GoogleSignin.signIn.mockResolvedValue(success());
    await signInWithGoogle();
    GoogleSignin.signOut.mockRejectedValue(new Error('no session'));

    await expect(endGoogleSession()).resolves.toBeUndefined();
  });
});

describe('POST /v1/auth/google', () => {
  const BASE = 'http://api.test';

  const tokens = {
    accessToken: 'access-1',
    refreshToken: 'refresh-1',
    tokenType: 'Bearer' as const,
    expiresIn: 900,
  };

  const authResponse = {
    user: {
      id: '11111111-1111-4111-8111-111111111111',
      email: 'sundar@example.com',
      createdAt: '2026-01-01T00:00:00.000Z',
      onboarded: true,
    },
    tokens,
  };

  function stubHttp(status: number, body: unknown) {
    const calls: Array<{ url: string; method: string; headers: Record<string, string>; data?: string }> = [];

    const adapter: AxiosAdapter = async config => {
      calls.push({
        url: String(config.url),
        method: String(config.method).toUpperCase(),
        headers: JSON.parse(JSON.stringify(config.headers ?? {})),
        data: config.data as string | undefined,
      });
      return {
        data: JSON.stringify(body),
        status,
        statusText: '',
        headers: {},
        config,
      };
    };

    return { client: axios.create({ adapter }), calls };
  }

  it('posts the token to the right route and nothing else with it', async () => {
    const { client, calls } = stubHttp(200, authResponse);
    const api = createHttpApi({
      baseUrl: BASE,
      client,
      tokens: createMemoryTokenStore(null),
    });

    await api.signInWithGoogle({ idToken: 'id-token-abc' });

    expect(calls[0].method).toBe('POST');
    expect(calls[0].url).toBe(`${BASE}/v1/auth/google`);
    // The body is the token and only the token. An `email` here would be a
    // field the server could believe about a person this process did not
    // authenticate.
    expect(JSON.parse(calls[0].data!)).toEqual({ idToken: 'id-token-abc' });
  });

  /**
   * Anonymous, like login and register. Whatever session this device was
   * holding is not the authority on who is signing in now — the ID token is,
   * and sending a stale Authorization header alongside it invites a 401 refresh
   * dance on a route that never needed one.
   */
  it('sends no Authorization header, even with a session already stored', async () => {
    const { client, calls } = stubHttp(200, authResponse);
    const api = createHttpApi({
      baseUrl: BASE,
      client,
      tokens: createMemoryTokenStore({ ...tokens, accessToken: 'stale' }),
    });

    await api.signInWithGoogle({ idToken: 'id-token-abc' });

    expect(calls[0].headers.Authorization).toBeUndefined();
  });

  it('stores the returned session, so the next call is authenticated', async () => {
    const store = createMemoryTokenStore(null);
    const { client } = stubHttp(200, authResponse);
    const api = createHttpApi({ baseUrl: BASE, client, tokens: store });

    await api.signInWithGoogle({ idToken: 'id-token-abc' });

    await expect(store.read()).resolves.toMatchObject({ accessToken: 'access-1' });
  });

  it('leaves the device signed out when the server rejects the token', async () => {
    const store = createMemoryTokenStore(null);
    const { client } = stubHttp(401, {
      type: 'https://api.nutricheck.app/problems/unauthorized',
      title: 'Could not verify that Google sign-in',
      status: 401,
    });
    const api = createHttpApi({ baseUrl: BASE, client, tokens: store });

    await expect(api.signInWithGoogle({ idToken: 'forged' })).rejects.toThrow();
    await expect(store.read()).resolves.toBeNull();
  });
});
