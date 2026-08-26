import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { Button, TextButton } from './Button';
import { Icon, IconName } from './Icon';
import { Row, Stack } from './Layout';
import { Press } from './Press';
import { Txt } from './Text';

/**
 * The undo toast — *the* confirm step for the one-tap repeat route. A repeat has
 * nothing to confirm, so the tap commits and this offers five seconds back.
 *
 * The countdown is drawn: an undo with an invisible deadline teaches the user
 * not to trust it.
 */
export function UndoToast({
  visible,
  message,
  detail,
  onUndo,
  onExpire,
  bottomOffset = 0,
}: {
  visible: boolean;
  message: string;
  detail?: string;
  onUndo: () => void;
  onExpire: () => void;
  bottomOffset?: number;
}) {
  const { c, radius, space, elevation, motion } = useTheme();
  const insets = useSafeAreaInsets();

  const slide = useRef(new Animated.Value(140)).current;
  const countdown = useRef(new Animated.Value(1)).current;
  const expire = useRef(onExpire);
  expire.current = onExpire;

  useEffect(() => {
    if (!visible) {
      slide.setValue(140);
      countdown.setValue(1);
      return;
    }
    Animated.spring(slide, { toValue: 0, ...motion.spring.pop, useNativeDriver: true }).start();
    const timer = Animated.timing(countdown, {
      toValue: 0,
      duration: motion.undoMs,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    timer.start(({ finished }) => finished && expire.current());
    return () => timer.stop();
  }, [countdown, motion, slide, visible]);

  if (!visible) return null;

  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      style={{
        position: 'absolute',
        left: space.gutter,
        right: space.gutter,
        bottom: Math.max(insets.bottom, space.lg) + bottomOffset,
        transform: [{ translateY: slide }],
        backgroundColor: c.ink,
        borderRadius: radius.lg,
        overflow: 'hidden',
        ...elevation.e3,
      }}>
      <Row
        gap={space.md}
        justify="space-between"
        style={{ paddingHorizontal: space.xl, paddingVertical: space.lg }}>
        <Row gap={space.md} style={{ flexShrink: 1 }}>
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: radius.pill,
              backgroundColor: c.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Icon name="check" size={17} color={c.onPrimary} weight={2.6} />
          </View>
          <Stack gap={1} style={{ flexShrink: 1 }}>
            <Txt role="label" color={c.canvas} numberOfLines={1}>
              {message}
            </Txt>
            {detail ? (
              <Txt role="caption" color={c.inkTertiary} numeric>
                {detail}
              </Txt>
            ) : null}
          </Stack>
        </Row>

        <Press
          onPress={onUndo}
          haptic="undo"
          feedback="fade"
          accessibilityLabel="Undo"
          hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}>
          <Txt role="label" color={c.primary}>
            Undo
          </Txt>
        </Press>
      </Row>

      <Animated.View
        style={{
          height: 3,
          backgroundColor: c.primary,
          width: countdown.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        }}
      />
    </Animated.View>
  );
}

/**
 * A standing notice: offline, quota exhausted, pending sync. Every one states
 * what still works — "offline, logs are queued" is actionable; "offline" is not.
 */
export function Notice({
  tone = 'attention',
  icon,
  title,
  detail,
  action,
}: {
  tone?: 'attention' | 'success' | 'danger';
  icon: IconName;
  title: string;
  detail?: string;
  action?: { label: string; onPress: () => void };
}) {
  const { c, radius, space } = useTheme();

  const accent = tone === 'attention' ? c.attention : tone === 'danger' ? c.danger : c.primary;
  const bg = tone === 'attention' ? c.attentionSoft : tone === 'danger' ? c.dangerSoft : c.primarySoft;
  const ink = tone === 'attention' ? c.attentionInk : tone === 'danger' ? c.danger : c.primarySoftInk;

  return (
    <View
      accessibilityLiveRegion="polite"
      style={{
        backgroundColor: bg,
        borderRadius: radius.md,
        padding: space.lg,
        marginHorizontal: space.gutter,
      }}>
      <Row gap={space.md} align="flex-start">
        <View style={{ paddingTop: 1 }}>
          <Icon name={icon} size={18} color={accent} weight={2} />
        </View>
        <Stack gap={4} style={{ flexShrink: 1 }}>
          <Txt role="label" color={ink}>
            {title}
          </Txt>
          {detail ? (
            <Txt role="bodySm" color={ink} style={{ opacity: 0.82 }}>
              {detail}
            </Txt>
          ) : null}
          {action ? (
            <View style={{ marginTop: 2 }}>
              <TextButton label={action.label} onPress={action.onPress} role="labelSm" />
            </View>
          ) : null}
        </Stack>
      </Row>
    </View>
  );
}

/** An empty state. Every one names the next action rather than describing the absence. */
export function EmptyState({
  icon,
  title,
  detail,
  action,
  secondary,
}: {
  icon: IconName;
  title: string;
  detail?: string;
  action?: { label: string; onPress: () => void; icon?: IconName };
  secondary?: { label: string; onPress: () => void };
}) {
  const { c, radius, space } = useTheme();

  return (
    <Stack gap={space.md} align="center" style={{ paddingVertical: space.huge, paddingHorizontal: space.gutter }}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: radius.pill,
          backgroundColor: c.sunken,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Icon name={icon} size={28} color={c.inkTertiary} weight={1.7} />
      </View>
      <Txt role="h2" style={{ textAlign: 'center' }}>
        {title}
      </Txt>
      {detail ? (
        <Txt role="body" tone="secondary" style={{ textAlign: 'center', maxWidth: 320 }}>
          {detail}
        </Txt>
      ) : null}
      {action ? (
        <View style={{ paddingTop: space.sm, alignSelf: 'stretch' }}>
          <Button label={action.label} icon={action.icon} onPress={action.onPress} size="md" />
        </View>
      ) : null}
      {secondary ? <TextButton label={secondary.label} onPress={secondary.onPress} /> : null}
    </Stack>
  );
}

/** The footnote under anything that makes a health claim. Required, not decorative. */
export function Disclaimer({ text }: { text: string }) {
  const { c, space } = useTheme();
  return (
    <Row gap={space.sm} align="flex-start">
      <View style={{ paddingTop: 1 }}>
        <Icon name="info" size={14} color={c.inkTertiary} weight={2} />
      </View>
      <Txt role="caption" tone="tertiary" style={{ flexShrink: 1 }}>
        {text}
      </Txt>
    </Row>
  );
}

/**
 * The macro strip. Five numbers, wrapped two rows deep on a phone.
 *
 * Calories lead because they answer the question people opened the app with;
 * the four macros follow in the order a nutrition label prints them. Each is
 * optional — a caller with nothing to say about carbs passes nothing, and the
 * cell is left out rather than rendered as a zero it does not mean.
 */
export function TotalsRow({
  kcal,
  protein,
  carbs,
  fat,
  fibre,
  fibreUnknown,
}: {
  kcal: string;
  protein: string;
  carbs?: string;
  fat?: string;
  fibre: string;
  fibreUnknown?: number;
}) {
  const { space } = useTheme();
  const cells = [
    { label: 'Calories', value: kcal, unit: '' },
    { label: 'Protein', value: protein, unit: 'g' },
    ...(carbs === undefined ? [] : [{ label: 'Carbs', value: carbs, unit: 'g' }]),
    ...(fat === undefined ? [] : [{ label: 'Fat', value: fat, unit: 'g' }]),
    { label: 'Fibre', value: fibre, unit: fibreUnknown ? '' : 'g' },
  ];

  return (
    // Wraps rather than squeezing: five cells across a phone would give each
    // about 60pt, and a three-digit calorie count does not fit in that.
    <Row gap={space.lg} wrap align="flex-start">
      {cells.map(cell => (
        <Stack key={cell.label} gap={2} style={{ flexGrow: 1, flexBasis: 72 }}>
          <Txt role="caption" tone="tertiary">
            {cell.label}
          </Txt>
          <Row gap={3} align="baseline">
            <Txt role="h2" numeric>
              {cell.value}
            </Txt>
            {cell.unit ? (
              <Txt role="bodySm" tone="secondary">
                {cell.unit}
              </Txt>
            ) : null}
          </Row>
        </Stack>
      ))}
    </Row>
  );
}
