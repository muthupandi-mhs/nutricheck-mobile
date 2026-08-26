import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Device-local key/value persistence.
 *
 * Every call swallows its own failure and returns a neutral result. A disk that
 * cannot be read is not a reason to refuse to start — the caller falls back to
 * "no stored session", which is the safe direction: a user who has to sign in
 * again has lost a few seconds, where a crash on launch has lost the app.
 */
export async function load<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw === null ? null : (JSON.parse(raw) as T);
  } catch {
    return null;
  }
}

export async function save(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Nothing to do and nothing to tell the user: the write was a convenience.
  }
}

export async function clear(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    // As above.
  }
}
