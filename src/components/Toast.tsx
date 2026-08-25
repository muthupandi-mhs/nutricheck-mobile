import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { duration } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';
import { Icon } from './Icon';
import { Row } from './Layout';
import { Mono, Num, Title } from './Type';

/**
 * The undo toast.
 *
 * This component is the confirm step for the repeat route. A one-tap log of a
 * food the user has logged before at a portion they themselves set has nothing
 * to confirm — asking anyway is putting a question in front of someone four
 * times a day when you already know the answer. So the tap commits, and this
 * offers five seconds to take it back: free for the 95% that were right, fully
 * recoverable for the rest.
 *
 * The countdown rule is visible. An undo affordance with an invisible deadline
 * is worse than no undo, because the user learns not to trust it.
 */
export function UndoToast({
  message,
  detail,
  onUndo,
  onExpire,
  visible,
}: {
  message: string;
  detail?: string;
  onUndo: () => void;
  onExpire: () => void;
  visible: boolean;
}) {
  const { c, space } = useTheme();
  const insets = useSafeAreaInsets();

  const slide = useRef(new Animated.Value(120)).current;
  const countdown = useRef(new Animated.Value(1)).current;
  const expired = useRef(onExpire);
  expired.current = onExpire;

  useEffect(() => {
    if (!visible) {
      slide.setValue(120);
      countdown.setValue(1);
      return;
    }
    Animated.spring(slide, { toValue: 0, damping: 26, stiffness: 300, useNativeDriver: true }).start();
    const timer = Animated.timing(countdown, {
      toValue: 0,
      duration: duration.undo,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    timer.start(({ finished }) => finished && expired.current());
    return () => timer.stop();
  }, [countdown, slide, visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: space.gutter,
        right: space.gutter,
        bottom: Math.max(insets.bottom, space.lg) + 8,
        transform: [{ translateY: slide }],
        backgroundColor: c.heavy,
      }}
      accessibilityLiveRegion="polite">
      <Animated.View
        style={{
          height: 3,
          backgroundColor: c.det,
          width: countdown.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        }}
      />
      <Row
        gap={space.md}
        style={{ paddingHorizontal: space.lg, paddingVertical: 14, justifyContent: 'space-between' }}>
        <View style={{ flexShrink: 1, gap: 2 }}>
          <Title size={14.5} weight="700" color={c.onHeavy}>
            {message}
          </Title>
          {detail ? (
            <Num size={10.5} color={c.ink3}>
              {detail}
            </Num>
          ) : null}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Undo"
          onPress={onUndo}
          hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}>
          <Row gap={6}>
            <Icon name="undo" size={14} color={c.det} weight={2.2} />
            <Mono size={12} color={c.det}>
              Undo
            </Mono>
          </Row>
        </Pressable>
      </Row>
    </Animated.View>
  );
}
