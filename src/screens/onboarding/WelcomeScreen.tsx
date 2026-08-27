import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { Gap, Gutter } from '../../components/Layout';
import { Screen } from '../../components/Screen';
import { Txt } from '../../components/Text';
import { useTheme } from '../../theme/ThemeProvider';
import { BrandField } from './BrandField';
import type { ScreenProps } from '../../navigation/types';

/**
 * Welcome: a hero that runs off every edge and dissolves into the page, with
 * the wordmark and both doors stacked below it.
 *
 * No sheet. The sheet was what separated the brand zone from the controls, and
 * the point of this composition is that they are not separated — the hero has
 * no bottom edge, it just stops being there, so the buttons read as sitting on
 * the same surface rather than in a drawer pulled over it.
 *
 * Two buttons, one per audience, because the first screen is the cheapest place
 * to name both. It used to offer only "Get started" into sign-in, on the
 * reasoning that a new user would find the "Create new" link from there — true,
 * but it made the more common of the two journeys the one you had to read your
 * way into. Auth still decides the destination after either: onboarding if the
 * account has no profile yet, the app itself if it has.
 *
 * The line under the buttons is the only thing on the screen that says what the
 * app does, and it is deliberately last. Somebody deciding whether to bother is
 * asking what this is for, not how it works: "you tell it a meal, it works out
 * the nutrition, it keeps the day's total." It promises no figure — every value
 * in this build carries a "~", so a first screen claiming to *count* anything
 * is a promise the second screen walks back.
 *
 * It never says "AI". Not because the app hides it, but because it is not a
 * differentiator: everything says AI, and almost nothing understands
 * "rendu dosai".
 */
export function WelcomeScreen({ navigation }: ScreenProps<'Welcome'>) {
  const { c, space } = useTheme();
  const insets = useSafeAreaInsets();

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
    <Screen style={{ paddingTop: 0, paddingBottom: 0 }}>
      {/* Takes whatever the copy below does not, rather than a fixed slice of
          the window, so the mark sits in the middle of the space that is
          actually empty. Pinned to a proportion it centred inside its own box
          and left a dead band between itself and the wordmark — centred, but
          not where the eye reads the middle to be. */}
      <View style={{ flex: 1 }}>
        {/* The wordmark is drawn below instead, at the size the composition
            wants, so the field contributes the mark and the halo only. */}
        <BrandField wordmark={false} minHeight={0} style={{ flex: 1 }} />

        {/* Fades the hero out rather than cutting it off. Eight-digit hex on
            the canvas colour, not `transparent` — a literal transparent fades
            through black on Android and leaves a grey band across the middle. */}
        <LinearGradient
          colors={[`${c.canvas}00`, c.canvas]}
          pointerEvents="none"
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 160 }}
        />
      </View>

      <View style={{ paddingBottom: Math.max(insets.bottom, space.lg) + space.lg }}>
        <Animated.View
          style={{
            opacity: enter,
            transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
          }}>
          <Gutter>
            <Txt
              role="h1"
              style={{ fontSize: 40, lineHeight: 46, letterSpacing: 4, textAlign: 'center' }}
              accessibilityRole="header">
              NUTRICHECK
            </Txt>
          </Gutter>

          <Gap h={space.huge} />

          <Gutter>
            {/* Inverse, not the accent. The reference fills its first button
                with the brightest thing it has, and on this palette that is
                ink — which also keeps the accent meaning "a measured value"
                rather than "the button we want you to press". */}
            <Button
              label="I have an account"
              variant="inverse"
              loud
              onPress={() => navigation.navigate('SignIn')}
              haptic="select"
            />
            <Gap h={space.md} />
            <Button
              label="Create an account"
              variant="outline"
              loud
              onPress={() => navigation.navigate('SignUp')}
              haptic="select"
            />

            <Gap h={space.xl} />

            <Txt role="bodySm" tone="tertiary" style={{ textAlign: 'center' }}>
              Tell us what you ate. We'll work out what's in it, and keep the day's total.
            </Txt>
          </Gutter>
        </Animated.View>
      </View>
    </Screen>
  );
}
