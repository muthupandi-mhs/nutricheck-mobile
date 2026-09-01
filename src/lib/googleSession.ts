import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { GOOGLE_SIGNIN_ENABLED, GOOGLE_WEB_CLIENT_ID } from '../config';

/**
 * The only file in the app that touches the Google Sign-In native module.
 *
 * Same seam as `lib/recorder.ts` and for the same reason: a native module has no
 * JS fallback, so every file that imports one is a file that cannot be rendered
 * in a test without a mock. Keeping it to one means the screens above it are
 * ordinary React and the hook above them tests against a plain function.
 *
 * It also gives the outcomes names. What comes back from the module is a
 * response object for the success case and a thrown error carrying a string
 * code for everything else, and the distinction that actually matters to the UI
 * — "they changed their mind" versus "this phone cannot do this" — is not the
 * one the library draws.
 */

/**
 * What happened, in the terms the screen cares about.
 *
 * `cancelled` is deliberately not an error. Backing out of the account sheet is
 * a decision, and a screen that answers it with a red notice is telling somebody
 * off for using a control correctly.
 */
export type GoogleSignInOutcome =
  | { kind: 'token'; idToken: string }
  | { kind: 'cancelled' }
  | { kind: 'unavailable'; reason: string }
  | { kind: 'failed' };

/**
 * `configure` is synchronous, idempotent and cheap, but it is called on first
 * use rather than at import so that merely loading this module — which every
 * test of a screen above it does — touches no native code.
 */
let configured = false;

function configureOnce(): void {
  if (configured) return;
  GoogleSignin.configure({
    // The WEB client ID, on Android too. See the comment on the constant: this
    // is what lands in `aud`, and it is what the server checks.
    webClientId: GOOGLE_WEB_CLIENT_ID,
    // No `offlineAccess`. That asks Google for a server auth code so a backend
    // can hold a refresh token and call Google APIs as the user later — this
    // one never does. It reads their identity once, at sign-in, and the ID
    // token is the whole of what it needs.
    scopes: ['email', 'profile'],
  });
  configured = true;
}

/**
 * Run the interactive flow and return the ID token.
 *
 * Never throws. Every path a caller can do something about is a variant of the
 * return type, because the alternative is a screen that has to know which
 * string codes this library uses.
 */
export async function signInWithGoogle(): Promise<GoogleSignInOutcome> {
  if (!GOOGLE_SIGNIN_ENABLED) {
    return { kind: 'unavailable', reason: 'not configured in this build' };
  }

  try {
    configureOnce();

    // Android only in practice; resolves on iOS. `showPlayServicesUpdateDialog`
    // lets Google offer the update itself, which is a better answer than us
    // rendering "your Play Services is old" and leaving them to find it.
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) return { kind: 'cancelled' };

    const { idToken } = response.data;
    // Typed as nullable, and a sign-in with no token is no use to us — the
    // server has nothing to verify. Treated as a failure rather than quietly
    // returning a success the next line would crash on.
    if (!idToken) return { kind: 'failed' };

    return { kind: 'token', idToken };
  } catch (error) {
    if (isErrorWithCode(error)) {
      // Pressing back or tapping outside the sheet arrives here as a THROWN
      // error, not as a cancelled response — both spellings exist depending on
      // the platform and the entry point, so both are handled.
      if (error.code === statusCodes.SIGN_IN_CANCELLED) return { kind: 'cancelled' };

      // A second tap while the sheet is already up. Nothing has gone wrong and
      // there is nothing to say — the flow they started is still running.
      if (error.code === statusCodes.IN_PROGRESS) return { kind: 'cancelled' };

      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        return { kind: 'unavailable', reason: 'no Play Services' };
      }
    }
    return { kind: 'failed' };
  }
}

/**
 * Forget the Google account on this device.
 *
 * Called from the explicit "Sign out" in settings, and deliberately NOT from
 * the transport's involuntary sign-out. Google's session outlives ours, so
 * without this the next "Continue with Google" quietly reuses the same account
 * with no chooser — which is exactly the trap for the phone with two accounts
 * on it, or the one being handed to somebody else.
 *
 * The involuntary path is different on purpose: an expired refresh token is not
 * a request to switch accounts, and there one tap back in is the kindness.
 *
 * Never throws. Signing out of a session that was never started is not a
 * failure, and nothing about our own sign-out should depend on it.
 */
export async function endGoogleSession(): Promise<void> {
  if (!GOOGLE_SIGNIN_ENABLED || !configured) return;
  try {
    await GoogleSignin.signOut();
  } catch {
    // Nothing to do and nothing to tell anyone. The local session is already
    // gone by the time this runs.
  }
}
