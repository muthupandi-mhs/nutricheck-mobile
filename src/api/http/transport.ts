import axios, {
  type AxiosInstance,
  type AxiosResponse,
  type Method,
} from 'axios';
import { ApiError, OfflineError, type TokenPair } from '../types';
import { toApiError } from './problems';
import type { TokenStore } from './tokens';

export type TransportConfig = {
  /** No trailing slash. Versioned paths are passed in per call. */
  baseUrl: string;
  tokens: TokenStore;
  /** Called when the session is gone for good, so the UI can route to Welcome. */
  onSignedOut?: () => void;
  /** Injectable for tests — an instance carrying a stub adapter. */
  client?: AxiosInstance;
  timeoutMs?: number;
};

type RequestOptions = {
  method?: Method;
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  signal?: AbortSignal;
  /** Skips the Authorization header and the refresh dance. Auth routes only. */
  anonymous?: boolean;
  /**
   * Overrides the default for a route that is slow BY DESIGN.
   *
   * The default is tuned for calls that should feel instant, and a route that
   * waits on a speech model is not one of them. Set it shorter than the
   * server's own ceiling for that work and the client hangs up on a request the
   * server is still happily serving — which reads to the user as an infinite
   * spinner and to the server as `request aborted`.
   */
  timeoutMs?: number;
};

/** Long enough for a cold start, short enough that a dead socket is not forever. */
const DEFAULT_TIMEOUT_MS = 15_000;

/**
 * The HTTP transport, over axios.
 *
 * Owns three things the screens must never see: the Authorization header, the
 * 401 → refresh → retry loop, and the difference between "the server said no"
 * (ApiError) and "there is no server right now" (OfflineError). That last
 * distinction is what lets a failed commit be queued rather than shown to the
 * user as an error to redo.
 *
 * Note what is NOT used here: axios interceptors. The refresh loop has to
 * serialise concurrent 401s behind one in-flight promise (see `refreshing`),
 * and a stock response interceptor gives each failed request its own retry —
 * which is precisely the token reuse the server revokes the whole session for.
 */
export class Transport {
  private readonly baseUrl: string;
  private readonly tokens: TokenStore;
  private readonly client: AxiosInstance;
  private readonly timeoutMs: number;
  private readonly onSignedOut?: () => void;

  /**
   * The single in-flight refresh.
   *
   * Refresh tokens ROTATE and the server detects family reuse: if two requests
   * both 401 and both post the same stored refresh token, the second one looks
   * exactly like a stolen token being replayed, and the server's correct
   * response is to revoke every session. The user gets "Session ended for
   * security" for the crime of opening the app.
   *
   * Home fires five requests at once on mount, so this is the ordinary path,
   * not an edge case. Every 401 awaits this one promise instead of starting
   * its own refresh.
   */
  private refreshing: Promise<TokenPair | null> | null = null;

  constructor(config: TransportConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.tokens = config.tokens;
    this.client = config.client ?? axios.create();
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.onSignedOut = config.onSignedOut;
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const response = await this.send(path, options);

    // One retry, and only after a refresh that actually produced a new token.
    // Retrying on any 401 would loop forever against a route that is simply
    // forbidden to this user.
    if (response.status === 401 && !options.anonymous) {
      const refreshed = await this.refreshOnce();
      if (refreshed) {
        return this.unwrap<T>(await this.send(path, options));
      }
      await this.signOut();
    }

    return this.unwrap<T>(response);
  }

  /** Current access token, for the SSE reader which cannot go through axios. */
  async accessToken(): Promise<string | null> {
    return (await this.tokens.read())?.accessToken ?? null;
  }

  /**
   * Query strings are built here rather than handed to axios `params`.
   *
   * The SSE reader needs the same absolute URL and never goes through axios at
   * all, so one builder keeps the two paths identical — and it pins the
   * encoding, which matters for an IANA zone: `Asia/Kolkata` must arrive as
   * `Asia%2FKolkata`, not as an extra path segment.
   */
  url(path: string, query?: Record<string, string | number | undefined>): string {
    const search = query
      ? Object.entries(query)
          .filter(([, v]) => v !== undefined && v !== '')
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
          .join('&')
      : '';
    return `${this.baseUrl}${path}${search ? `?${search}` : ''}`;
  }

  async setTokens(tokens: TokenPair): Promise<void> {
    await this.tokens.write(tokens);
  }

  async clearTokens(): Promise<void> {
    await this.tokens.clear();
  }

  async refreshToken(): Promise<string | null> {
    return (await this.tokens.read())?.refreshToken ?? null;
  }

  // ── internals ──────────────────────────────────────────────────────────────

  private async send(
    path: string,
    options: RequestOptions,
  ): Promise<AxiosResponse<unknown>> {
    const headers: Record<string, string> = { accept: 'application/json' };

    if (options.body !== undefined) headers['content-type'] = 'application/json';

    if (!options.anonymous) {
      const token = await this.accessToken();
      if (token) headers.authorization = `Bearer ${token}`;
    }

    try {
      return await this.client.request({
        url: this.url(path, options.query),
        method: options.method ?? 'GET',
        headers,
        data: options.body,
        timeout: options.timeoutMs ?? this.timeoutMs,
        signal: options.signal,
        // Status handling lives in `unwrap`, in one place, so a 401 can be
        // caught and retried rather than arriving as a thrown AxiosError.
        validateStatus: () => true,
        // Never throw on a body that is not JSON: a proxy's HTML error page has
        // to reach the user as a readable problem, not a SyntaxError.
        transformResponse: [parseBody],
      });
    } catch (error) {
      // A caller-cancelled request is not an outage — let the caller see the
      // cancellation so an in-flight search does not queue itself as a commit.
      if (options.signal?.aborted || axios.isCancel(error)) throw error;

      // With validateStatus above, nothing else that reaches here has a
      // response: no DNS, no route, TLS refused, or our own timeout. The app
      // treats all of them as "queue it, do not lose it".
      throw new OfflineError();
    }
  }

  private async unwrap<T>(response: AxiosResponse<unknown>): Promise<T> {
    if (response.status === 204) return undefined as T;

    const body = response.data ?? null;

    if (response.status < 200 || response.status >= 300) {
      throw toApiError(response.status, isRecord(body) ? body : null);
    }
    return body as T;
  }

  /**
   * Refresh, at most once concurrently.
   *
   * The losers of the race await the same promise and then retry with whatever
   * it produced. They must NOT start their own refresh with the token they read
   * before the rotation — that is precisely the reuse the server revokes for.
   */
  private refreshOnce(): Promise<TokenPair | null> {
    if (this.refreshing) return this.refreshing;

    this.refreshing = (async () => {
      try {
        const refreshToken = await this.refreshToken();
        if (!refreshToken) return null;

        const response = await this.send('/v1/auth/refresh', {
          method: 'POST',
          body: { refreshToken },
          anonymous: true,
        });

        if (response.status < 200 || response.status >= 300) return null;

        const tokens = response.data as TokenPair;
        await this.tokens.write(tokens);
        return tokens;
      } catch (error) {
        // Offline during a refresh is not a signed-out session. Rethrow so the
        // caller queues instead of dropping the user at the welcome screen with
        // their entry gone.
        if (error instanceof OfflineError) throw error;
        return null;
      } finally {
        // Cleared in `finally` so a failed refresh does not permanently pin a
        // rejected promise that every later 401 would then await.
        this.refreshing = null;
      }
    })();

    return this.refreshing;
  }

  private async signOut(): Promise<void> {
    await this.tokens.clear();
    this.onSignedOut?.();
  }
}

/** axios hands the raw string to every transformResponse; parse or pass through. */
function parseBody(raw: unknown): unknown {
  if (typeof raw !== 'string') return raw;
  if (raw.length === 0) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export { ApiError };
