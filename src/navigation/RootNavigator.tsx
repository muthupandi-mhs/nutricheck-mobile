import React, { useState } from 'react';
import { View } from 'react-native';
import { DefaultTheme, NavigationContainer, useNavigation, type Theme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { TabBar } from '../components/TabBar';
import { useTheme } from '../theme/ThemeProvider';
import { CalendarScreen } from '../screens/calendar/CalendarScreen';
import { ComposerScreen } from '../screens/composer/ComposerScreen';
import { ConfirmSheetScreen } from '../screens/confirm/ConfirmSheetScreen';
import { EntryDetailScreen } from '../screens/entry/EntryDetailScreen';
import { HomeScreen } from '../screens/home/HomeScreen';
import { IdeasScreen } from '../screens/ideas/IdeasScreen';
import { InsightsScreen } from '../screens/insights/InsightsScreen';
import { ActivityScreen } from '../screens/onboarding/ActivityScreen';
import { ObjectiveScreen } from '../screens/onboarding/ObjectiveScreen';
import { NameScreen } from '../screens/onboarding/NameScreen';
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
import { ProfileEditorScreen } from '../screens/settings/ProfileEditorScreen';
import { AskSheet } from '../screens/voice/AskSheet';
import { ListenScreen } from '../screens/voice/ListenScreen';
import { MealScreen } from '../screens/voice/MealScreen';
import { TypeScreen } from '../screens/voice/TypeScreen';
import { WeightScreen } from '../screens/weight/WeightScreen';
import { YouScreen } from '../screens/settings/YouScreen';
import type { RootStackParamList, TabParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

/**
 * Three tabs in a floating pill, and the log action as its own circle beside it.
 * That button is not a tab — it pushes the composer onto the parent stack, so
 * logging happens over whatever you were doing. Making it a tab would leave a
 * half-written meal in the background.
 */
function MainTabs() {
  const navigation = useNavigation<import('@react-navigation/native-stack').NativeStackNavigationProp<RootStackParamList>>();

  /**
   * The microphone opens a sheet HERE, over the live tab, rather than pushing
   * a screen.
   *
   * It was a route, and a route was wrong twice over: it put an entry in the
   * back stack for something that is not a place, and what you saw behind the
   * panel was a transparent modal rather than the day itself. Mounted by the
   * tab host, Home keeps scrolling behind it, keeps its position, and is
   * still the thing you came back to.
   *
   * Held here rather than inside Home because the mic is on the tab bar and
   * belongs to all three tabs — Ideas and Insights raise the same sheet, over
   * themselves, without either of them knowing it exists.
   */
  const [asking, setAsking] = useState(false);

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={{ headerShown: false }}
        /* eslint-disable-next-line react/no-unstable-nested-components -- tabBar is
           react-navigation's documented render prop, not a component definition. */
        tabBar={props => <TabBar {...props} onLogPress={() => setAsking(true)} />}>
        <Tab.Screen name="Home" component={HomeScreen} />
        {/* Between the two, not after them. Ideas is about the day in progress
            and Insights about the days behind it, so the order runs now →
            next → past, and the tab nearest Home is the one that changes
            when Home does. */}
        <Tab.Screen name="Ideas" component={IdeasScreen} />
        <Tab.Screen name="Insights" component={InsightsScreen} />
      </Tab.Navigator>

      {/* Unmounted when closed, not hidden. The sheet holds a microphone and a
          language, and a hidden copy of both sitting behind Home for the life
          of the app is a recorder nobody can see the state of. */}
      {asking ? (
        <AskSheet
          onClose={() => setAsking(false)}
          onPhrase={(phrase, source) => navigation.navigate('MealDetails', { phrase, source })}
          onSearch={() => navigation.navigate('Search')}
        />
      ) : null}
    </View>
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
        <Stack.Screen name="OnboardName" component={NameScreen} />
        <Stack.Screen name="OnboardProfile" component={ProfileScreen} />
        <Stack.Screen name="OnboardActivity" component={ActivityScreen} />
        <Stack.Screen name="OnboardObjective" component={ObjectiveScreen} />
        <Stack.Screen name="OnboardRate" component={RateScreen} />
        <Stack.Screen name="OnboardTargets" component={TargetsScreen} />

        {/* the voice route — the mic, and what it heard.

            Not filed under onboarding any more: these two screens are the whole
            of logging by voice, and the first meal is one trip through them
            rather than a rehearsal of some other flow.

            The entrance depends on where it came from. Ending onboarding it
            arrives on a reset with Main placed underneath, and a slide would
            animate a screen nobody has seen out of the way of one they have not
            either; from the mic button it is a task pushed over Home, and
            rising from the bottom is what says so. */}
        <Stack.Screen
          name="Listen"
          component={ListenScreen}
          options={({ route }) => ({
            animation: route.params?.first ? 'fade' : 'slide_from_bottom',
          })}
        />
        {/* Swapped for Listen rather than stacked on it — they are two doors
            to one room, and a back button that walks from the keyboard into the
            microphone describes a journey nobody took. */}
        <Stack.Screen
          name="Type"
          component={TypeScreen}
          options={{ animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="MealDetails" component={MealScreen} />

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

        {/* Pushed from the weight dial. Slides in from the right like any
            other task rather than up like the calendar — the calendar changes
            what Home is showing and comes back to it, this is a place you go. */}
        <Stack.Screen name="Weight" component={WeightScreen} />

        {/* settings — reached from Home's avatar, so it pushes like any task */}
        <Stack.Screen name="Calendar" component={CalendarScreen} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="You" component={YouScreen} />
        <Stack.Screen name="ProfileEditor" component={ProfileEditorScreen} />
        <Stack.Screen name="GoalEditor" component={GoalEditorScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
