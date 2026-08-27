import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { haptics } from '../lib/haptics';
import { navBar } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';
import { Icon, IconName } from './Icon';
import { Row, Stack } from './Layout';
import { Press } from './Press';
import { Txt } from './Text';

const ICONS: Record<string, IconName> = {
  Today: 'home',
  Insights: 'chart',
};

/** The mic's diameter, and the pill's height — equal, so the two align. */
const BAR_HEIGHT = 62;

/**
 * A floating tab bar: a dark pill holding the destinations, and the log action
 * as its own circle beside it.
 *
 * Two things follow from floating rather than sitting in the page. It stays in
 * normal layout flow, so the bar's own height reserves the strip and nothing is
 * occluded — an absolutely-positioned bar would need every scroll view to know
 * its height. And it carries its own tokens (see `navBar`) rather than the
 * palette's, because it hovers over the page instead of holding it and is a
 * step lighter than a card to say so.
 *
 * The action is a circle outside the pill, not a tab: it pushes the composer
 * onto the parent stack rather than switching destination. Splitting it out of
 * the pill is what makes that difference visible before the tap.
 */
export function TabBar({ state, navigation, onLogPress }: BottomTabBarProps & { onLogPress: () => void }) {
  const { c, radius, space, elevation } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: space.md,
        paddingTop: space.sm,
        paddingBottom: Math.max(insets.bottom, space.md),
        paddingHorizontal: space.gutter,
        // Transparent, not `surface`: the page shows through around the pill,
        // which is the whole of what makes it read as floating.
        backgroundColor: 'transparent',
      }}>
      <Row
        style={{
          flexGrow: 1,
          flexBasis: 0,
          height: BAR_HEIGHT,
          borderRadius: radius.pill,
          backgroundColor: navBar.surface,
          borderWidth: 1,
          borderColor: navBar.border,
          paddingHorizontal: space.xs,
          ...elevation.e2,
        }}
        justify="space-around">
        {state.routes.map(route => {
          const index = state.routes.findIndex(r => r.key === route.key);
          const focused = state.index === index;

          return (
            <TabItem
              key={route.key}
              name={route.name}
              focused={focused}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (focused || event.defaultPrevented) return;
                navigation.navigate(route.name);
              }}
            />
          );
        })}
      </Row>

      <Press
        onPress={() => {
          haptics.select();
          onLogPress();
        }}
        accessibilityLabel="Say what you ate"
        accessibilityHint="Starts listening straight away. You can edit the words, or type instead."
        style={{ borderRadius: radius.pill, ...elevation.e2 }}>
        {/* Filled with the brand gradient rather than ringed with it. The
            reference rings a logo; this is the app's primary action, and a
            hollow circle asks for the tap far more quietly than a solid one. */}
        <LinearGradient
          colors={[c.ringFrom, c.ringTo]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: BAR_HEIGHT,
            height: BAR_HEIGHT,
            borderRadius: radius.pill,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
          {/* A mic, not a plus. The fastest way in is speaking, so the button
              names that rather than the generic "add something". Typing is still
              one tap away inside — the overlay cancels onto the same field. */}
          <Icon name="mic" size={26} color={c.onPrimary} weight={2.5} />
        </LinearGradient>
      </Press>
    </View>
  );
}

/** One tab. Active lifts the icon 1pt — subliminal, but the eye tracks which one moved. */
function TabItem({ name, focused, onPress }: { name: string; focused: boolean; onPress: () => void }) {
  const { hit, motion, radius, space } = useTheme();
  const lift = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(lift, { toValue: focused ? 1 : 0, ...motion.spring.pop, useNativeDriver: true }).start();
  }, [focused, lift, motion]);

  const tint = focused ? navBar.active : navBar.inactive;

  return (
    <Press
      onPress={onPress}
      feedback="none"
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={name}
      style={{
        minWidth: hit + 8,
        minHeight: hit,
        paddingHorizontal: space.sm,
        borderRadius: radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Stack gap={4} align="center">
        <Animated.View
          style={{
            transform: [
              { translateY: lift.interpolate({ inputRange: [0, 1], outputRange: [0, -1] }) },
            ],
          }}>
          <Icon name={ICONS[name] ?? 'home'} size={24} color={tint} weight={focused ? 2.1 : 1.8} />
        </Animated.View>
        <Txt role="caption" color={tint}>
          {name}
        </Txt>
      </Stack>
    </Press>
  );
}
