import { useState } from 'react';
import { useApi } from '../../api/client';
import { useOnboarding } from '../../state/Onboarding';
import type { SuggestedTargets } from '../../api/types';

/**
 * How long to hold somebody on the button before giving up on the model.
 *
 * Long enough for an ordinary call and short enough that a bad minute upstream
 * is a pause rather than a wall. The circuit breaker in front of the provider
 * means a sustained outage fails immediately anyway; this is for the slow case,
 * not the broken one.
 */
const SUGGEST_TIMEOUT_MS = 5000;

type Nav = {
  navigate(route: 'OnboardTargets', params?: { suggestion?: SuggestedTargets }): void;
};

/**
 * Asks the model on the way into the targets screen, so it opens finished.
 *
 * Shared because there are two doors into that screen and only one of them is
 * obvious: somebody losing or gaining weight arrives from the rate step, and
 * somebody maintaining skips it, because there is no rate to pick. Both have to
 * prefetch, and a copy in each is how one of them silently stops.
 *
 * Every failure navigates anyway. The suggestion is worth a moment on a button
 * and is not worth being stuck behind, and the targets screen asks for itself
 * when it arrives without one.
 */
export function useTargetsPrefetch(navigation: Nav) {
  const api = useApi();
  const { toProfile } = useOnboarding();
  const [asking, setAsking] = useState(false);

  const go = async () => {
    setAsking(true);
    const suggestion = await Promise.race([
      api.suggestTargets(toProfile()).catch(() => undefined),
      new Promise<undefined>(resolve => setTimeout(() => resolve(undefined), SUGGEST_TIMEOUT_MS)),
    ]);
    setAsking(false);
    navigation.navigate('OnboardTargets', suggestion ? { suggestion } : undefined);
  };

  return { asking, go };
}
