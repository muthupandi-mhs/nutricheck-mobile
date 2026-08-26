import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TokenPair } from '../types';

/**
 * Where the session lives between launches.
 *
 * An interface rather than a direct AsyncStorage call so tests can run without
 * a native module, and so moving the refresh token to the Keychain later is one
 * implementation swap rather than an edit to the transport.
 */
export interface TokenStore {
  read(): Promise<TokenPair | null>;
  write(tokens: TokenPair): Promise<void>;
  clear(): Promise<void>;
}

const KEY = 'nutricheck.tokens.v1';

/**
 * AsyncStorage is not encrypted. That is acceptable for the ACCESS token, which
 * lives fifteen minutes; it is a compromise for the refresh token, which is the
 * whole session. The right home for that is the iOS Keychain / Android
 * Keystore, and this is the seam where that swap happens — see the note in
 * BACKEND.STATUS.md rather than assuming this was overlooked.
 */
export function createAsyncStorageTokenStore(): TokenStore {
  // Mirrors the stored value so the common path (every authenticated request)
  // does not touch the bridge. AsyncStorage is async and on the critical path.
  let cached: TokenPair | null | undefined;

  return {
    async read() {
      if (cached !== undefined) return cached;
      try {
        const raw = await AsyncStorage.getItem(KEY);
        cached = raw ? (JSON.parse(raw) as TokenPair) : null;
      } catch {
        // Corrupt or unreadable storage must not brick the app: treat it as a
        // signed-out device, which is a state the UI already handles.
        cached = null;
      }
      return cached;
    },

    async write(tokens) {
      cached = tokens;
      await AsyncStorage.setItem(KEY, JSON.stringify(tokens));
    },

    async clear() {
      cached = null;
      await AsyncStorage.removeItem(KEY);
    },
  };
}

/** For tests and for a "stay signed out" mode. Never touches the bridge. */
export function createMemoryTokenStore(initial: TokenPair | null = null): TokenStore {
  let tokens = initial;
  return {
    async read() {
      return tokens;
    },
    async write(next) {
      tokens = next;
    },
    async clear() {
      tokens = null;
    },
  };
}
