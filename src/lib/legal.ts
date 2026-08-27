import { Linking } from 'react-native';

/**
 * The two documents the onboarding line commits people to.
 *
 * ⚠️ BOTH URLS ARE UNVERIFIED. The domain is taken from the one the API already
 * uses for its problem types (`https://api.nutricheck.app/problems/…`), which
 * makes it the right guess and not a checked fact — nothing in either
 * repository points at a published privacy policy or terms page, because there
 * is not one yet.
 *
 * A line saying "you accept these" next to a link that 404s is worse than
 * either half alone, so these must be confirmed before the app ships. They are
 * in one place so that is a two-line change.
 */
export const LEGAL = {
  privacy: 'https://nutricheck.app/privacy',
  terms: 'https://nutricheck.app/terms',
} as const;

/**
 * Opens one of them in the system browser.
 *
 * A rejection here means no browser would take an `https` URL, which is not a
 * state the user can do anything about and not worth a dialog over the screen
 * they are trying to get past. It is swallowed rather than surfaced.
 */
export function openLegal(which: keyof typeof LEGAL): void {
  Linking.openURL(LEGAL[which]).catch(() => undefined);
}
