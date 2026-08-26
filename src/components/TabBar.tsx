import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { haptics } from '../lib/haptics';
import { useTheme } from '../theme/ThemeProvider';
import { Icon, IconName } from './Icon';
import { Row, Stack } from './Layout';
import { Press } from './Press';
import { Txt } from './Text';

const ICONS: Record<string, IconName> = {
  Today: 'home',
  Insights: 'chart',
};

/**
 * The tab bar, with the log action raised into its centre — thumb-reachable at
 * any device size, and it occludes nothing because the bar already reserves
 * that strip. Labels stay visible; icon-only bars save 12pt and cost a guess.
 *
 * Two tabs, one either side of the centre action. The split below is
 * positional, not fixed at two: `slice` keeps the bar balanced if a third
 * destination is ever added on the right.
 */
export function TabBar({ state, navigation, onLogPress }: BottomTabBarProps & { onLogPress: () => void }) {
  const { c, radius, space, elevation } = useTheme();
  const insets = useSafeAreaInsets();

  const left = state.routes.slice(0, 1);
  const right = state.routes.slice(1);

  const renderTab = (route: (typeof state.routes)[number]) => {
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
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingTop: space.sm,
        paddingBottom: Math.max(insets.bottom, space.md),
        paddingHorizontal: space.sm,
        backgroundColor: c.surface,
        borderTopWidth: 1,
        borderTopColor: c.border,
      }}>
      <Row style={{ flexGrow: 1, flexBasis: 0 }} justify="space-around">
        {left.map(renderTab)}
      </Row>

      <Press
        onPress={() => {
          haptics.select();
          onLogPress();
        }}
        accessibilityLabel="Say what you ate"
        accessibilityHint="Starts listening straight away. You can edit the words, or type instead."
        style={{
          width: 60,
          height: 60,
          borderRadius: radius.pill,
          backgroundColor: c.primary,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: -22,
          marginHorizontal: space.sm,
          borderWidth: 4,
          borderColor: c.surface,
          ...elevation.e2,
        }}>
        {/* A mic, not a plus. The fastest way in is speaking, so the button
            names that rather than the generic "add something". Typing is still
            one tap away inside — the overlay cancels onto the same field. */}
        <Icon name="mic" size={26} color={c.onPrimary} weight={2.5} />
      </Press>

      <Row style={{ flexGrow: 1, flexBasis: 0 }} justify="space-around">
        {right.map(renderTab)}
      </Row>
    </View>
  );
}

/** One tab. Active lifts the icon 1pt — subliminal, but the eye tracks which one moved. */
function TabItem({ name, focused, onPress }: { name: string; focused: boolean; onPress: () => void }) {
  const { c, hit, motion } = useTheme();
  const lift = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(lift, { toValue: focused ? 1 : 0, ...motion.spring.pop, useNativeDriver: true }).start();
  }, [focused, lift, motion]);

  return (
    <Press
      onPress={onPress}
      feedback="none"
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={name}
      style={{ minWidth: hit + 8, minHeight: hit + 4, alignItems: 'center', justifyContent: 'center' }}>
      <Stack gap={4} align="center">
        <Animated.View
          style={{
            transform: [
              { translateY: lift.interpolate({ inputRange: [0, 1], outputRange: [0, -1] }) },
            ],
          }}>
          <Icon
            name={ICONS[name] ?? 'home'}
            size={24}
            color={focused ? c.primary : c.inkTertiary}
            weight={focused ? 2.1 : 1.8}
          />
        </Animated.View>
        <Txt role="caption" color={focused ? c.primary : c.inkTertiary}>
          {name}
        </Txt>
      </Stack>
    </Press>
  );
}
