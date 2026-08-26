import axios, { AxiosError, type AxiosAdapter } from 'axios';
import { createHttpApi } from '../src/api/http/httpApi';
import { createMemoryTokenStore } from '../src/api/http/tokens';
import { Transport } from '../src/api/http/transport';
import { ApiError, OfflineError, isProblem, type TokenPair } from '../src/api/types';

/**
 * The transport, held to GAP-REPORT.STATUS.md §4.
 *
 * Every case here is something that COMPILES AND RUNS while being wrong, and
 * that the mock cannot reveal — it emits bare problem slugs, ignores timezones
 * and never rotates a refresh token. These are the failure modes that only
 * exist between the app and the real server.
 */

const BASE = 'http://api.test';

const tokens = (over: Partial<TokenPair> = {}): TokenPair => ({
  accessToken: 'access-1',
  refreshToken: 'refresh-1',
  tokenType: 'Bearer',
  expiresIn: 900,
  ...over,
});

type Call = { url: string; method: string; headers: Record<string, string>; data?: string };

/**
 * An axios instance driven by a queue of responses, recording what it was sent.
 *
 * A custom adapter rather than a mocking library: the adapter IS axios's
 * transport seam, so everything above it — the transformResponse pipeline,
 * validateStatus, header assembly — runs exactly as it does on a device.
 * Responses are handed over as raw strings, which is what a real adapter
 * produces and what the parse-or-pass-through logic has to cope with.
 */
function stubHttp(responses: Array<{ status: number; body?: unknown }>) {
  const calls: Call[] = [];

  const adapter: AxiosAdapter = async config => {
    calls.push({
      url: String(config.url),
      method: String(config.method).toUpperCase(),
      headers: JSON.parse(JSON.stringify(config.headers ?? {})),
      data: config.data as string | undefined,
    });

    const next = responses.shift() ?? { status: 500, body: null };
    return {
      data: next.body === undefined ? '' : JSON.stringify(next.body),
      status: next.status,
      statusText: '',
      headers: {},
      config,
    };
  };

  return { client: axios.create({ adapter }), calls };
}

/** An adapter that fails the way a dead socket does: no response, ever. */
function offlineClient(failAfter = 0, responses: Array<{ status: number; body?: unknown }> = []) {
  let seen = 0;
  const adapter: AxiosAdapter = async config => {
    if (seen++ >= failAfter) {
      throw new AxiosError('Network Error', AxiosError.ERR_NETWORK, config);
    }
    const next = responses.shift() ?? { status: 500, body: null };
    return {
      data: next.body === undefined ? '' : JSON.stringify(next.body),
      status: next.status,
      statusText: '',
      headers: {},
      config,
    };
  };
  return axios.create({ adapter });
}

const problem = (type: string, title = 'Nope', status = 401) => ({
  type: `https://api.nutricheck.app/problems/${type}`,
  title,
  status,
});

describe('problem documents', () => {
  it('strips the base URI so isProblem() matches', async () => {
    // The trap: the server sends a URI, isProblem compares a bare slug. Left
    // alone this takes the else branch on every screen — silently.
    const { client } = stubHttp([{ status: 401, body: problem('unauthorized') }]);
    const transport = new Transport({
      baseUrl: BASE,
      tokens: createMemoryTokenStore(null),
      client,
    });

    const error = (await transport.request('/v1/me').catch(e => e)) as ApiError;

    expect(error).toBeInstanceOf(ApiError);
    expect(error.problem.type).toBe('unauthorized');
    expect(isProblem(error, 'unauthorized')).toBe(true);
  });

  it('keeps a 429 resetAt, which the sign-in screen renders', async () => {
    const { client } = stubHttp([
      {
        status: 429,
        body: {
          ...problem('rate-limited', 'Too many attempts', 429),
          detail: 'Wait 12 minutes and try again.',
          resetAt: '2026-08-26T09:00:00.000Z',
        },
      },
    ]);
    const transport = new Transport({
      baseUrl: BASE,
      tokens: createMemoryTokenStore(null),
      client,
    });

    const error = (await transport
      .request('/v1/auth/login', { anonymous: true })
      .catch(e => e)) as ApiError;

    expect(isProblem(error, 'rate-limited')).toBe(true);
    expect(error.problem.title).toBe('Too many attempts');
    expect(error.problem.resetAt).toBe('2026-08-26T09:00:00.000Z');
  });

  it('gives an unusable body a readable title rather than undefined', async () => {
    // A proxy's HTML error page must not reach a screen as "undefined".
    const { client } = stubHttp([{ status: 502 }]);
    const transport = new Transport({
      baseUrl: BASE,
      tokens: createMemoryTokenStore(null),
      client,
    });

    const error = (await transport.request('/v1/me').catch(e => e)) as ApiError;
    expect(error.problem.title).toBe('Something went wrong');
    expect(error.problem.status).toBe(502);
  });
});

describe('refresh', () => {
  it('refreshes once for concurrent 401s', async () => {
    // The trap: refresh tokens rotate and the server treats a reused one as a
    // stolen replay, revoking every session. Home fires several requests at
    // once, so two of them 401-ing together is the ORDINARY path.
    const { client, calls } = stubHttp([
      { status: 401, body: problem('unauthorized') },
      { status: 401, body: problem('unauthorized') },
      { status: 200, body: tokens({ accessToken: 'access-2', refreshToken: 'refresh-2' }) },
      { status: 200, body: { id: 'u1' } },
      { status: 200, body: { id: 'u1' } },
    ]);

    const store = createMemoryTokenStore(tokens());
    const transport = new Transport({ baseUrl: BASE, tokens: store, client });

    await Promise.all([transport.request('/v1/me'), transport.request('/v1/me/profile')]);

    const refreshes = calls.filter(c => c.url.endsWith('/v1/auth/refresh'));
    expect(refreshes).toHaveLength(1);
    // And the loser retried with the rotated token, not the stale one.
    expect(await store.read()).toMatchObject({ refreshToken: 'refresh-2' });
  });

  it('retries the original request with the new access token', async () => {
    const { client, calls } = stubHttp([
      { status: 401, body: problem('unauthorized') },
      { status: 200, body: tokens({ accessToken: 'access-2' }) },
      { status: 200, body: { id: 'u1' } },
    ]);

    const transport = new Transport({
      baseUrl: BASE,
      tokens: createMemoryTokenStore(tokens()),
      client,
    });

    await expect(transport.request('/v1/me')).resolves.toEqual({ id: 'u1' });

    const retry = calls[calls.length - 1]!;
    expect(retry.headers.authorization).toBe('Bearer access-2');
  });

  it('signs out when the refresh itself is rejected', async () => {
    const onSignedOut = jest.fn();
    const { client } = stubHttp([
      { status: 401, body: problem('unauthorized') },
      { status: 401, body: problem('unauthorized') },
    ]);

    const store = createMemoryTokenStore(tokens());
    const transport = new Transport({
      baseUrl: BASE,
      tokens: store,
      client,
      onSignedOut,
    });

    await expect(transport.request('/v1/me')).rejects.toBeInstanceOf(ApiError);
    expect(onSignedOut).toHaveBeenCalled();
    expect(await store.read()).toBeNull();
  });

  it('does not sign the user out when the refresh fails on the network', async () => {
    // Offline during a refresh is not an expired session. Dropping the user at
    // Welcome here would also discard whatever they were part-way through.
    // First call 401s normally; the refresh that follows dies on the socket.
    const client = offlineClient(1, [{ status: 401, body: problem('unauthorized') }]);

    const onSignedOut = jest.fn();
    const store = createMemoryTokenStore(tokens());
    const transport = new Transport({
      baseUrl: BASE,
      tokens: store,
      client,
      onSignedOut,
    });

    await expect(transport.request('/v1/me')).rejects.toBeInstanceOf(OfflineError);
    expect(onSignedOut).not.toHaveBeenCalled();
    expect(await store.read()).not.toBeNull();
  });

  it('allows a later refresh after one fails', async () => {
    // The in-flight promise must be cleared, or every subsequent 401 awaits a
    // settled failure forever.
    const { client, calls } = stubHttp([
      { status: 401, body: problem('unauthorized') },
      { status: 401, body: problem('unauthorized') },
      { status: 401, body: problem('unauthorized') },
      { status: 200, body: tokens({ accessToken: 'access-3' }) },
      { status: 200, body: { id: 'u1' } },
    ]);

    const store = createMemoryTokenStore(tokens());
    const transport = new Transport({ baseUrl: BASE, tokens: store, client });

    await expect(transport.request('/v1/me')).rejects.toBeInstanceOf(ApiError);

    await store.write(tokens());
    await expect(transport.request('/v1/me')).resolves.toEqual({ id: 'u1' });
    expect(calls.filter(c => c.url.endsWith('/v1/auth/refresh'))).toHaveLength(2);
  });
});

describe('offline', () => {
  it('turns a network failure into OfflineError, not ApiError', async () => {
    // The distinction the queue depends on: a commit that fails offline is
    // kept and retried, not shown to the user as something to redo.
    const transport = new Transport({
      baseUrl: BASE,
      tokens: createMemoryTokenStore(null),
      client: offlineClient(),
    });

    await expect(transport.request('/v1/logs')).rejects.toBeInstanceOf(OfflineError);
  });

  it('lets a caller-cancelled request abort rather than look offline', async () => {
    // A cancelled search must not be mistaken for an outage — otherwise every
    // abandoned keystroke would queue itself as a pending commit.
    const controller = new AbortController();
    const adapter: AxiosAdapter = async config => {
      controller.abort();
      throw new AxiosError('canceled', AxiosError.ERR_CANCELED, config);
    };

    const transport = new Transport({
      baseUrl: BASE,
      tokens: createMemoryTokenStore(null),
      client: axios.create({ adapter }),
    });

    const error = await transport
      .request('/v1/foods/search', { signal: controller.signal })
      .catch(e => e);

    expect(error).not.toBeInstanceOf(OfflineError);
  });
});

describe('httpApi', () => {
  const api = (responses: Array<{ status: number; body?: unknown }>) => {
    const { client, calls } = stubHttp(responses);
    return {
      calls,
      instance: createHttpApi({
        baseUrl: BASE,
        tokens: createMemoryTokenStore(tokens()),
        client,
        timeZone: 'Asia/Kolkata',
      }),
    };
  };

  it('sends the device timezone with a day', async () => {
    // The contract defaults tz to UTC. Omitted, an 11pm meal in Chennai lands
    // on the wrong day — and the mock cannot show this because it ignores tz.
    const { instance, calls } = api([{ status: 200, body: { date: '2026-08-26' } }]);
    await instance.getDay('2026-08-26');

    expect(calls[0]!.url).toContain('/v1/logs/day');
    expect(calls[0]!.url).toContain('tz=Asia%2FKolkata');
    expect(calls[0]!.url).toContain('date=2026-08-26');
  });

  it('sends the timezone with a week too', async () => {
    const { instance, calls } = api([{ status: 200, body: { days: [] } }]);
    await instance.getWeek('2026-08-26');
    expect(calls[0]!.url).toContain('/v1/logs/week');
    expect(calls[0]!.url).toContain('tz=Asia%2FKolkata');
  });

  it('strips food summaries and optimistic nutrients from a commit', async () => {
    // The wire wants foodId and grams. Spreading the draft would send a whole
    // FoodSummary and client-side nutrients the server refuses to trust.
    const { instance, calls } = api([{ status: 201, body: { id: 'e1' } }]);

    await instance.commit({
      clientId: 'c1',
      loggedAt: '2026-08-26T12:00:00.000Z',
      meal: 'lunch',
      source: 'text',
      phrase: 'dal',
      draftId: null,
      items: [
        {
          food: { id: 'food-1', name: 'Dal', brand: null, kcalPer100g: 116 },
          grams: 200,
          quantityType: 'exact_mass',
          quantitySource: 'stated',
          learnedUnitLabel: null,
          nutrients: { kcal: 232, proteinG: 18, carbsG: 20, carbsState: 'known', fatG: 5, fatState: 'known', fiberG: 8, fiberState: 'known' },
        },
      ],
    });

    const sent = JSON.parse(calls[0]!.data as string);
    expect(sent.items[0]).toEqual({
      foodId: 'food-1',
      grams: 200,
      quantityType: 'exact_mass',
      quantitySource: 'stated',
      learnedUnitLabel: null,
    });
    expect(sent.items[0].food).toBeUndefined();
    expect(sent.items[0].nutrients).toBeUndefined();
  });

  it('drains a queue in one request', async () => {
    const { instance, calls } = api([{ status: 200, body: [] }]);
    const draft = (clientId: string) => ({
      clientId,
      loggedAt: '2026-08-26T12:00:00.000Z',
      meal: 'lunch' as const,
      source: 'text' as const,
      phrase: null,
      draftId: null,
      items: [
        {
          food: { id: 'food-1', name: 'Dal', brand: null, kcalPer100g: 116 },
          grams: 100,
          quantityType: 'exact_mass' as const,
          quantitySource: 'stated' as const,
          learnedUnitLabel: null,
          nutrients: {
            kcal: 116,
            proteinG: 9,
            carbsG: 20,
            carbsState: 'known' as const,
            fatG: 5,
            fatState: 'known' as const,
            fiberG: 4,
            fiberState: 'known' as const,
          },
        },
      ],
    });

    await instance.commitBatch!([draft('c1'), draft('c2'), draft('c3')]);

    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toContain('/v1/logs/batch');
    expect(JSON.parse(calls[0]!.data as string).entries).toHaveLength(3);
  });

  it('targets the per-item route for a portion edit', async () => {
    const { instance, calls } = api([{ status: 200, body: { id: 'e1' } }]);
    await instance.updateItemGrams('entry-1', 'item-9', 180);

    expect(calls[0]!.url).toBe(`${BASE}/v1/logs/entry-1/items/item-9`);
    expect(calls[0]!.method).toBe('PATCH');
    expect(JSON.parse(calls[0]!.data as string).grams).toBe(180);
  });

  it('returns null for a session instead of throwing on a fresh install', async () => {
    // App.tsx picks the first screen from this. No session is the ordinary
    // state on install, not an error to surface.
    const { client } = stubHttp([]);
    const instance = createHttpApi({
      baseUrl: BASE,
      tokens: createMemoryTokenStore(null),
      client,
    });

    await expect(instance.getSession()).resolves.toBeNull();
  });

  it('returns null for a profile that does not exist yet', async () => {
    const { instance } = api([{ status: 404, body: problem('not-found', 'Profile', 404) }]);
    await expect(instance.getProfile()).resolves.toBeNull();
  });

  it('clears the session locally even when logout fails', async () => {
    const store = createMemoryTokenStore(tokens());
    const { client } = stubHttp([{ status: 500 }]);
    const instance = createHttpApi({ baseUrl: BASE, tokens: store, client });

    await instance.logout();
    expect(await store.read()).toBeNull();
  });

  it('fills in the fields a preview has no way to carry', async () => {
    const { instance } = api([
      { status: 200, body: { kcal: 2400, proteinG: 150, fiberG: 34, basis: {} } },
    ]);

    const goal = await instance.previewGoal({
      sex: 'male',
      birthDate: '1991-01-01',
      heightCm: 180,
      weightKg: 80,
      activityLevel: 'moderate',
      objective: 'maintain',
      rateKgPerWeek: 0,
      units: 'metric',
    });

    expect(goal.kcal).toBe(2400);
    // Not a uuid, so it cannot be mistaken for a persisted row.
    expect(goal.id).toBe('preview');
  });

  it('joins saved meals into the recents strip so a meal tile can be logged', async () => {
    // Dropping meals would compile, run, and quietly delete the feature that
    // makes day 30 different from day 1.
    const { instance } = api([
      {
        status: 200,
        body: [
          { kind: 'meal', mealId: 'm1', name: 'Usual breakfast', itemCount: 2, kcal: 400, lastLoggedAt: null, timesLogged: 0 },
        ],
      },
      {
        status: 200,
        body: [
          {
            id: 'm1',
            name: 'Usual breakfast',
            items: [
              { id: 'mi1', food: { id: 'f1', name: 'Idli', brand: null, kcalPer100g: 120 }, grams: 100, quantityType: 'count' },
            ],
            totals: { kcal: 120, proteinG: 4 },
            createdAt: '2026-08-01T00:00:00.000Z',
          },
        ],
      },
    ]);

    const tiles = await instance.getRecents();
    expect(tiles).toHaveLength(1);
    const tile = tiles[0]!;
    expect(tile.kind).toBe('meal');
    if (tile.kind === 'meal') {
      // logTile builds a commit from these; an empty list would be untappable.
      expect(tile.items).toHaveLength(1);
      expect(tile.items[0]!.food.id).toBe('f1');
    }
  });

  it('never reports an unknown fiber as zero on a tile', async () => {
    // The three-state rule holds client-side too: a tile must not contribute a
    // confident zero to anything.
    const { instance } = api([
      {
        status: 200,
        body: [
          { kind: 'food', food: { id: 'f1', name: 'Idli', brand: null, kcalPer100g: 120 }, grams: 150, lastLoggedAt: '2026-08-26T08:00:00.000Z', timesLogged: 4 },
        ],
      },
      { status: 200, body: [] },
    ]);

    const [tile] = await instance.getRecents();
    if (tile!.kind === 'food') {
      expect(tile!.nutrients.fiberG).toBeNull();
      expect(tile!.nutrients.fiberState).toBe('unknown');
      expect(tile!.nutrients.kcal).toBe(180);
    }
  });
});
