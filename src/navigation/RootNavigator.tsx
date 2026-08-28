import React from 'react';
import { DefaultTheme, NavigationContainer, useNavigation, type Theme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TabBar } from '../components/TabBar';
import { useTheme } from '../theme/ThemeProvider';
import { ComposerScreen } from '../screens/composer/ComposerScreen';
import { ConfirmSheetScreen } from '../screens/confirm/ConfirmSheetScreen';
import { EntryDetailScreen } from '../screens/entry/EntryDetailScreen';
import { HomeScreen } from '../screens/home/HomeScreen';
import { InsightsScreen } from '../screens/insights/InsightsScreen';
import { ActivityScreen } from '../screens/onboarding/ActivityScreen';
import { ObjectiveScreen } from '../screens/onboarding/ObjectiveScreen';
import { ProfileScreen } from '../screens/onboarding/ProfileScreen';
import { RateScreen } from '../screens/onboarding/RateScreen';
import { AuthEmailScreen } from '../screens/onboarding/AuthEmailScreen';
import { AuthPasswordScreen } from '../screens/onboarding/AuthPasswordScreen';
import { TargetsScreen } from '../screens/onboarding/TargetsScreen';
import { WelcomeScreen } from '../screens/onboarding/WelcomeScreen';
import { CreateFoodScreen } from '../screens/search/CreateFoodScreen';
import { PortionScreen } from '../screens/search/PortionScreen';
import { SearchScreen } from '../screens/search/SearchScreen';
import { GoalEditorScreen } from '../screens/settings/GoalEditorScreen';
import { YouScreen } from '../screens/settings/YouScreen';
import type { RootStackParamList, TabParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

/**
 * Two tabs in a floating pill, and the log action as its own circle beside it.
 * That button is not a tab — it pushes the composer onto the parent stack, so
 * logging happens over whatever you were doing. Making it a tab would leave a
 * half-written meal in the background.
 */
function MainTabs() {
  const navigation = useNavigation<import('@react-navigation/native-stack').NativeStackNavigationProp<RootStackParamList>>();

  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      /* eslint-disable-next-line react/no-unstable-nested-components -- tabBar is
         react-navigation's documented render prop, not a component definition. */
      tabBar={props => (
        <TabBar {...props} onLogPress={() => navigation.navigate('Composer', { autoStart: true })} />
      )}>
      <Tab.Screen name="Today" component={HomeScreen} />
      <Tab.Screen name="Insights" component={InsightsScreen} />
    </Tab.Navigator>
  );
}

export function RootNavigator({ initialRoute }: { initialRoute: keyof RootStackParamList }) {
  const { c } = useTheme();

  // Navigation's theme only has to agree with ours on what it paints itself —
  // the transition card and the container background.
  const navTheme: Theme = {
    ...DefaultTheme,
    dark: true,
    colors: {
      ...DefaultTheme.colors,
      background: c.canvas,
      card: c.surface,
      text: c.ink,
      border: c.border,
      primary: c.primary,
      notification: c.attention,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        initialRouteName={initialRoute}
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: c.canvas },
          animation: 'slide_from_right',
        }}>
        {/* onboarding */}
        <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ animation: 'fade' }} />
        <Stack.Screen name="AuthEmail" component={AuthEmailScreen} />
        <Stack.Screen name="AuthPassword" component={AuthPasswordScreen} />
        <Stack.Screen name="OnboardProfile" component={ProfileScreen} />
        <Stack.Screen name="OnboardActivity" component={ActivityScreen} />
        <Stack.Screen name="OnboardObjective" component={ObjectiveScreen} />
        <Stack.Screen name="OnboardRate" component={RateScreen} />
        <Stack.Screen name="OnboardTargets" component={TargetsScreen} />

        {/* the app */}
        <Stack.Screen name="Main" component={MainTabs} options={{ animation: 'fade' }} />

        {/* logging — each of these is a task with an explicit exit */}
        <Stack.Screen name="Composer" component={ComposerScreen} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen
          name="Confirm"
          component={ConfirmSheetScreen}
          // The sheet animates itself over whatever is behind it.
          options={{ presentation: 'transparentModal', animation: 'none' }}
        />
        <Stack.Screen name="Search" component={SearchScreen} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="Portion" component={PortionScreen} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="CreateFood" component={CreateFoodScreen} />
        <Stack.Screen name="EntryDetail" component={EntryDetailScreen} options={{ animation: 'slide_from_bottom' }} />

        {/* settings — reached from Today's avatar, so it pushes like any task */}
        <Stack.Screen name="You" component={YouScreen} />
        <Stack.Screen name="GoalEditor" component={GoalEditorScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
