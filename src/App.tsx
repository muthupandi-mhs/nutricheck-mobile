import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ApiProvider, useApi, type NutriCheckApi } from './api/client';
import { createMockApi } from './api/mock/mockApi';
import { RootNavigator } from './navigation/RootNavigator';
import type { RootStackParamList } from './navigation/types';
import { AppStateProvider } from './state/AppState';
import { OnboardingProvider } from './state/Onboarding';
import { ThemeProvider, useTheme } from './theme/ThemeProvider';

/**
 * NutriCheck.
 *
 * ── Swapping in the real backend ───────────────────────────────────────────
 *
 * One line. Implement `NutriCheckApi` (src/api/client.ts) against
 * `apps/api` and pass it here instead of `createMockApi()`:
 *
 *     const api = useMemo(() => createHttpApi(BASE_URL, getToken), []);
 *
 * Nothing else moves. No screen imports a fixture, no screen calls `fetch`,
 * and every shape crossing that boundary is already the wire shape from
 * `packages/contracts` — mirrored in `src/api/types.ts` only because this
 * project is not yet a workspace member.
 *
 * The mock is not a stub: it holds state, so a commit lands, an undo removes
 * it, and a portion correction trains the next parse. That is deliberate —
 * a fixture that returns the same canned day forever cannot tell you whether
 * the interaction design works across a session.
 */
export default function App() {
  const api = useMemo<NutriCheckApi>(() => createMockApi(), []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ApiProvider api={api}>
          <OnboardingProvider>
            <AppStateProvider>
              <Root />
            </AppStateProvider>
          </OnboardingProvider>
        </ApiProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

/**
 * The one branch before the navigator: has this person onboarded?
 *
 * It is resolved here rather than inside a screen so nobody ever sees Home
 * flash before being pushed into Welcome — the first frame is either the app
 * or the empty ground, never the wrong one.
 */
function Root() {
  const { c } = useTheme();
  const api = useApi();
  const [initial, setInitial] = useState<keyof RootStackParamList | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .getProfile()
      .then(profile => alive && setInitial(profile ? 'Home' : 'Welcome'))
      .catch(() => alive && setInitial('Welcome'));
    return () => {
      alive = false;
    };
  }, [api]);

  if (!initial) return <View style={{ flex: 1, backgroundColor: c.ground }} />;
  return <RootNavigator initialRoute={initial} />;
}
