import React, { useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  BackHandler,
  Dimensions,
  Easing,
  PanResponder,
  Pressable,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';

/**
 * The bottom sheet the confirm flow lives in.
 *
 * Built on PanResponder and Animated rather than a sheet library: the whole
 * gesture is one axis with one threshold, and the alternative pulls Reanimated
 * plus Gesture Handler into a project that otherwise needs neither.
 *
 * Two rules the confirm sheet depends on:
 *
 *  • It opens *before* its content exists. The resolve call is still in flight
 *    when this mounts; skeleton rows fill the gap. A sheet that waits for data
 *    turns a 2s parse into a 2s stall.
 *  • `dismissible={false}` disables the drag and the scrim tap — used while a
 *    commit is in flight, so a swipe cannot orphan a request that is going to
 *    land anyway.
 */
export function Sheet({
  visible,
  onDismiss,
  children,
  height,
  dismissible = true,
}: {
  visible: boolean;
  onDismiss: () => void;
  children: React.ReactNode;
  /** Fraction of screen height, or an absolute value over 1. */
  height?: number;
  dismissible?: boolean;
}) {
  const { c, rule } = useTheme();
  const insets = useSafeAreaInsets();
  const screen = Dimensions.get('window').height;
  const sheetHeight = height ? (height <= 1 ? screen * height : height) : screen * 0.92;

  const translate = useRef(new Animated.Value(sheetHeight)).current;
  const scrim = useRef(new Animated.Value(0)).current;

  const animateTo = useCallback(
    (to: 'open' | 'closed', velocity = 0) => {
      Animated.parallel([
        Animated.spring(translate, {
          toValue: to === 'open' ? 0 : sheetHeight,
          velocity,
          damping: 32,
          stiffness: 320,
          mass: 0.9,
          useNativeDriver: true,
        }),
        Animated.timing(scrim, {
          toValue: to === 'open' ? 1 : 0,
          duration: to === 'open' ? 220 : 180,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished && to === 'closed') onDismiss();
      });
    },
    [onDismiss, scrim, sheetHeight, translate],
  );

  useEffect(() => {
    if (visible) animateTo('open');
  }, [animateTo, visible]);

  const close = useCallback(() => {
    if (!dismissible) return;
    animateTo('closed');
  }, [animateTo, dismissible]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!visible) return false;
      close();
      return true;
    });
    return () => sub.remove();
  }, [close, visible]);

  const pan = useRef(
    PanResponder.create({
      // Only claim the gesture once it is clearly a downward drag, so a list
      // inside the sheet still scrolls normally.
      onMoveShouldSetPanResponder: (_, g) => dismissible && g.dy > 8 && Math.abs(g.dy) > Math.abs(g.dx) * 1.5,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translate.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        const flung = g.vy > 0.9;
        const dragged = g.dy > sheetHeight * 0.25;
        animateTo(flung || dragged ? 'closed' : 'open', g.vy);
      },
    }),
  ).current;

  if (!visible) return null;

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end' }}>
      <Animated.View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: scrim }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          onPress={close}
          style={{ flex: 1, backgroundColor: c.scrim }}
        />
      </Animated.View>

      <Animated.View
        style={{
          height: sheetHeight,
          backgroundColor: c.ground,
          borderTopWidth: rule.heavy,
          borderTopColor: c.heavy,
          transform: [{ translateY: translate }],
        }}>
        <View {...pan.panHandlers} style={{ alignItems: 'center', paddingTop: 9, paddingBottom: 3 }}>
          <View style={{ width: 42, height: 4, backgroundColor: c.rule }} />
        </View>
        <View style={{ flex: 1, paddingBottom: insets.bottom > 0 ? 0 : 4 }}>{children}</View>
      </Animated.View>
    </View>
  );
}
