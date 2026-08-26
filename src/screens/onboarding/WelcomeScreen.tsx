import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { Gap, Gutter } from '../../components/Layout';
import { Screen } from '../../components/Screen';
import { Txt } from '../../components/Text';
import { useTheme } from '../../theme/ThemeProvider';
import { BrandField, useSheetStyle } from './BrandField';
import type { ScreenProps } from '../../navigation/types';

/**
 * Welcome. A full-bleed brand field that absorbs all spare height, and a sheet
 * docked to the bottom edge carrying the copy and the one action.
 *
 * One button, and it leads to sign-in. This screen is only ever reached when
 * there is no stored session, and sign-in is where both audiences resolve: a
 * returning user signs in, a new one takes the "I need an account" link from
 * there. Auth then decides the destination — onboarding if the account has no
 * profile yet, the app itself if it has.
 *
 * Copy is written for a broad Indian audience, so it avoids product English:
 * "tell", not "log" or "type" — it is the only common verb covering both the
 * keyboard and the mic, and voice is the input nobody guesses is there.
 *
 * The screen never says "AI" on purpose. PLAN §2 puts the model on the words
 * and a real food table on every number; leading with the model would sell the
 * one part of the system the architecture refuses to stand behind.
 */
export function WelcomeScreen({ navigation }: ScreenProps<'Welcome'>) {
  const { space } = useTheme();
  const insets = useSafeAreaInsets();
  const sheet = useSheetStyle();

  const enter = useRef(new Animated.Value(0)).current;
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then(v => alive && setReduced(v));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (reduced) {
      enter.setValue(1);
      return;
    }
    // Starts after the field's own entrance so the copy arrives last.
    const anim = Animated.timing(enter, {
      toValue: 1,
      duration: 460,
      delay: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [enter, reduced]);

  return (
    // Insets are cancelled here and re-applied per zone — the field has to run
    // under the status bar, which a screen-level top padding would prevent.
    <Screen style={{ paddingTop: 0, paddingBottom: 0 }}>
      <BrandField />

      <View
        style={[
          sheet,
          {
            paddingTop: space.huge,
            paddingBottom: Math.max(insets.bottom, space.lg) + space.lg,
          },
        ]}>
        <Animated.View
          style={{
            opacity: enter,
            transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
          }}>
          <Gutter>
            <Txt role="h1" style={{ fontSize: 34, lineHeight: 39 }}>
              Tell us what you ate.
            </Txt>
            <Gap h={space.md} />
            <Txt role="bodyLg" tone="secondary">
              Say it or type it. We'll count the calories and protein for you.
            </Txt>
          </Gutter>

          <Gap h={space.xxxl} />

          <Gutter>
            <Button
              label="Get started"
              onPress={() => navigation.navigate('SignIn')}
              haptic="select"
            />
          </Gutter>
        </Animated.View>
      </View>
    </Screen>
  );
}
