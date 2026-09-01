import { useCallback, useState } from 'react';
import { useApi } from '../../api/client';
import { signInWithGoogle } from '../../lib/googleSession';
import { useAuthOutcome } from './useAuthForm';
import type { RootStackParamList } from '../../navigation/types';

type Nav = {
  reset(state: { index: number; routes: Array<{ name: keyof RootStackParamList }> }): void;
};

/**
 * The Google door, from the tap to wherever the user ends up.
 *
 * Two halves that fail in completely different ways. The first is Google's:
 * a sheet on the device, which can be dismissed, can be unavailable, and hands
 * back an ID token. The second is ours: post that token and get a session,
 * which fails the way every other call in this app fails.
 *
 * Only the second half goes through `useAuthOutcome`, and it goes through the
 * SAME one the password screens use — so "no connection" is worded once, and
 * where a signed-in user lands is decided in one place by the server's
 * `onboarded` flag rather than twice, differently. A returning account reaches
 * Home and a new one reaches onboarding, and nothing here knows which of the
 * two it just did, because the server does not say and does not need to.
 */
export function useGoogleSignIn(navigation: Nav) {
  const api = useApi();
  const outcome = useAuthOutcome(navigation);

  /**
   * Ours, not the form's. `useAuthOutcome` starts its spinner when the network
   * call starts, and by then the user has already been looking at a sheet for
   * several seconds — the button has to be busy from the tap, or it reads as
   * not having registered the press and gets pressed again.
   */
  const [busy, setBusy] = useState(false);

  const start = useCallback(async () => {
    if (busy) return;

    setBusy(true);
    outcome.setError(null);

    try {
      const result = await signInWithGoogle();

      // Backing out is a decision, not a failure. No notice, no spinner, no
      // record of it — the screen is exactly as they left it.
      if (result.kind === 'cancelled') return;

      if (result.kind === 'unavailable') {
        outcome.setError({
          title: 'Google sign-in is not available on this phone',
          detail: 'Use an email address and password instead — it works the same.',
        });
        return;
      }

      if (result.kind === 'failed') {
        outcome.setError({
          title: 'Google sign-in did not finish',
          detail: 'Try that again, or use an email address and password.',
        });
        return;
      }

      await outcome.attempt(() => api.signInWithGoogle({ idToken: result.idToken }));
    } finally {
      // Left busy on the way out would be right — `attempt` navigates away — but
      // only if it navigated. It does not when the call failed, and a button
      // that spins forever over a readable error is worse than the error.
      setBusy(false);
    }
  }, [api, busy, outcome]);

  return {
    start,
    /** True from the tap, through Google's sheet, until there is somewhere to be. */
    busy: busy || outcome.leaving,
    error: outcome.error,
  };
}
