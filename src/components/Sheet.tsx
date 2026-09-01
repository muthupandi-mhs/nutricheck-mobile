import React, { useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  BackHandler,
  Dimensions,
  Easing,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
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
  tint = false,
}: {
  visible: boolean;
  onDismiss: () => void;
  children: React.ReactNode;
  /** Fraction of screen height, or an absolute value above 1. */
  height?: number;
  dismissible?: boolean;
  /**
   * AskSheet's surface: a faintly blue panel over a graded scrim, rather than
   * a flat canvas over a flat one.
   *
   * Off by default. It was written for the panel Home raises from the mic and
   * lived inside that component; it is a prop here so a second sheet can wear
   * the same skin without a second copy of the gradients, which is the way
   * these two would otherwise drift apart.
   */
  tint?: boolean;
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
          style={[{ flex: 1 }, tint ? null : { backgroundColor: c.scrim }]}>
          {/* Graded rather than flat: light at the top where the page behind is
              still worth seeing, heavy behind the sheet where it would
              otherwise compete with it. One opacity over the whole screen
              either hides the page or fails to separate from it; this does the
              job a blur does, which is to push it back without taking it
              away. */}
          {tint ? (
            <LinearGradient
              colors={['rgba(6,8,11,0.35)', 'rgba(6,8,11,0.62)', 'rgba(6,8,11,0.86)']}
              locations={[0, 0.55, 1]}
              style={StyleSheet.absoluteFill}
            />
          ) : null}
        </Pressable>
      </Animated.View>

      <Animated.View
        style={{
          height: sheetHeight,
          backgroundColor: tint ? c.surface : c.canvas,
          borderTopLeftRadius: radius.xl,
          borderTopRightRadius: radius.xl,
          // Only when tinted, so the untinted sheet keeps the clipping
          // behaviour it already had. The wash is an absolute fill and would
          // square off the two rounded corners without it.
          ...(tint ? { overflow: 'hidden' as const } : null),
          transform: [{ translateY: translate }],
          ...elevation.e3,
        }}>
        {/* The wash. An edge and a corner, not a colour over the whole panel:
            it runs from a faint blue at the top-left into the ordinary surface,
            so the sheet reads as a different KIND of thing without anything on
            it being coloured to mean something. */}
        {tint ? (
          <LinearGradient
            colors={[c.askWash, c.surface, c.surface]}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
        ) : null}

        <View {...pan.panHandlers} style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 4 }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: c.borderStrong }} />
        </View>
        <View style={{ flex: 1, paddingBottom: Math.max(insets.bottom, 8) }}>{children}</View>
      </Animated.View>
    </View>
  );
}
