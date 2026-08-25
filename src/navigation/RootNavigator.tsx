import React from 'react';
import { DefaultTheme, NavigationContainer, type Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeProvider';
import { ComposerScreen } from '../screens/composer/ComposerScreen';
import { ConfirmSheetScreen } from '../screens/confirm/ConfirmSheetScreen';
import { EntryDetailScreen } from '../screens/entry/EntryDetailScreen';
import { HomeScreen } from '../screens/home/HomeScreen';
import { WeekScreen } from '../screens/insights/WeekScreen';
import { ActivityScreen } from '../screens/onboarding/ActivityScreen';
import { ObjectiveScreen } from '../screens/onboarding/ObjectiveScreen';
import { ProfileScreen } from '../screens/onboarding/ProfileScreen';
import { SignInScreen } from '../screens/onboarding/SignInScreen';
import { TargetsScreen } from '../screens/onboarding/TargetsScreen';
import { WelcomeScreen } from '../screens/onboarding/WelcomeScreen';
import { CreateFoodScreen } from '../screens/search/CreateFoodScreen';
import { PortionScreen } from '../screens/search/PortionScreen';
import { SearchScreen } from '../screens/search/SearchScreen';
import { GoalEditorScreen } from '../screens/settings/GoalEditorScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * One stack, no tab bar.
 *
 * A tab bar would cost 49pt of every screen to advertise three destinations,
 * two of which are visited weekly at most. The week view and settings are
 * reachable from the two icons in the masthead; the fold that a tab bar would
 * eat belongs to the recents strip, which is the whole speed argument.
 *
 * `initialRoute` is decided by the caller from whether a profile exists, so
 * this component stays free of loading states.
 */
export function RootNavigator({ initialRoute }: { initialRoute: keyof RootStackParamList }) {
  const { c, scheme } = useTheme();

  // Navigation's own theme only has to agree with ours on the two colours it
  // paints itself: the card behind a transition, and the container background.
  // Everything else is drawn by the screens.
  const navTheme: Theme = {
    ...DefaultTheme,
    dark: scheme === 'dark',
    colors: {
      ...DefaultTheme.colors,
      background: c.ground,
      card: c.ground,
      text: c.ink,
      border: c.rule,
      primary: c.det,
      notification: c.est,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: c.ground },
          animation: 'slide_from_right',
        }}>
        {/* onboarding */}
        <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ animation: 'fade' }} />
        <Stack.Screen name="SignIn" component={SignInScreen} />
        <Stack.Screen name="OnboardProfile" component={ProfileScreen} />
        <Stack.Screen name="OnboardActivity" component={ActivityScreen} />
        <Stack.Screen name="OnboardObjective" component={ObjectiveScreen} />
        <Stack.Screen name="OnboardTargets" component={TargetsScreen} />

        {/* the app */}
        <Stack.Screen name="Home" component={HomeScreen} options={{ animation: 'fade' }} />
        <Stack.Screen name="Week" component={WeekScreen} />

        {/* logging — modal, because each of these is a task with an exit */}
        <Stack.Screen name="Composer" component={ComposerScreen} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen
          name="Confirm"
          component={ConfirmSheetScreen}
          options={{
            // The sheet animates itself, over whatever is behind it.
            presentation: 'transparentModal',
            animation: 'none',
          }}
        />
        <Stack.Screen name="Search" component={SearchScreen} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="Portion" component={PortionScreen} />
        <Stack.Screen name="CreateFood" component={CreateFoodScreen} />
        <Stack.Screen name="EntryDetail" component={EntryDetailScreen} options={{ animation: 'slide_from_bottom' }} />

        {/* settings */}
        <Stack.Screen name="Settings" component={SettingsScreen} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="GoalEditor" component={GoalEditorScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
