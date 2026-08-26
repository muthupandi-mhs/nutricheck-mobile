import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, BackHandler, Dimensions, Easing, PanResponder, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';

/**
 * The bottom sheet. PanResponder and Animated rather than a sheet library —
 * one axis, one dismissal threshold, no need for Reanimated + Gesture Handler.
 *
 * Two properties the confirm flow depends on: it opens BEFORE its content
 * exists (skeletons fill the gap while resolve is in flight), and
 * dismissible={false} disables both the drag and the scrim tap, so a stray
 * swipe cannot orphan an in-flight commit.
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
  /** Fraction of screen height, or an absolute value above 1. */
  height?: number;
  dismissible?: boolean;
}) {
  const { c, radius, elevation } = useTheme();
  const insets = useSafeAreaInsets();
  const screen = Dimensions.get('window').height;
  const sheetHeight = height ? (height <= 1 ? screen * height : height) : screen * 0.9;

  const translate = useRef(new Animated.Value(sheetHeight)).current;
  const scrim = useRef(new Animated.Value(0)).current;

  const animateTo = useCallback(
    (to: 'open' | 'closed', velocity = 0) => {
      Animated.parallel([
        Animated.spring(translate, {
          toValue: to === 'open' ? 0 : sheetHeight,
          velocity,
          damping: 34,
          stiffness: 300,
          mass: 0.95,
          useNativeDriver: true,
        }),
        Animated.timing(scrim, {
          toValue: to === 'open' ? 1 : 0,
          duration: to === 'open' ? 260 : 180,
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
    if (dismissible) animateTo('closed');
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
      // Claim the gesture only once it is unambiguously downward, so a list
      // inside the sheet still scrolls.
      onMoveShouldSetPanResponder: (_, g) =>
        dismissible && g.dy > 8 && Math.abs(g.dy) > Math.abs(g.dx) * 1.5,
      onPanResponderMove: (_, g) => {
        // Rubber-band upward drags — resistance signals the end of the travel.
        translate.setValue(g.dy > 0 ? g.dy : g.dy * 0.18);
      },
      onPanResponderRelease: (_, g) => {
        const flung = g.vy > 0.85;
        const dragged = g.dy > sheetHeight * 0.22;
        animateTo(flung || dragged ? 'closed' : 'open', g.vy);
      },
    }),
  ).current;

  if (!visible) return null;

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end' }}>
      <Animated.View
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: scrim }}>
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
          backgroundColor: c.canvas,
          borderTopLeftRadius: radius.xl,
          borderTopRightRadius: radius.xl,
          transform: [{ translateY: translate }],
          ...elevation.e3,
        }}>
        <View {...pan.panHandlers} style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 4 }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: c.borderStrong }} />
        </View>
        <View style={{ flex: 1, paddingBottom: Math.max(insets.bottom, 8) }}>{children}</View>
      </Animated.View>
    </View>
  );
}
