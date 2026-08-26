import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ApiProvider, useApi, type NutriCheckApi } from './api/client';
import { createHttpApi } from './api/http/httpApi';
import { API_BASE_URL } from './config';
import { RootNavigator } from './navigation/RootNavigator';
import type { RootStackParamList } from './navigation/types';
import { AppStateProvider } from './state/AppState';
import { OnboardingProvider } from './state/Onboarding';
import { ThemeProvider, useTheme } from './theme/ThemeProvider';

/**
 * The one place `NutriCheckApi` is constructed. There is a single
 * implementation now — the fixture backend was deleted once the app moved onto
 * the API — so this is the only thing standing between the screens and the
 * server. No screen imports a fixture or calls `fetch`.
 */
export default function App() {
  const api = useMemo<NutriCheckApi>(() => createHttpApi({ baseUrl: API_BASE_URL }), []);

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
 * Resolved here rather than inside a screen so Home never flashes before the
 * user is pushed into Welcome.
 */
function Root() {
  const { c } = useTheme();
  const api = useApi();
  const [initial, setInitial] = useState<keyof RootStackParamList | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .getSession()
      .then(user => {
        if (!alive) return;
        // Three states, not two — collapsing the middle one lands a
        // half-onboarded account on a home screen with no targets.
        setInitial(!user ? 'Welcome' : user.onboarded ? 'Main' : 'OnboardProfile');
      })
      .catch(() => alive && setInitial('Welcome'));
    return () => {
      alive = false;
    };
  }, [api]);

  if (!initial) return <View style={{ flex: 1, backgroundColor: c.canvas }} />;
  return <RootNavigator initialRoute={initial} />;
}
