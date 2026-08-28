import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  RefreshControl,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconButton, TextButton } from '../../components/Button';
import { UndoToast } from '../../components/Feedback';
import { Icon, type IconName } from '../../components/Icon';
import { Gap, Gutter, Row, Stack } from '../../components/Layout';
import { Press } from '../../components/Press';
import { Ring } from '../../components/Ring';
import { Screen } from '../../components/Screen';
import { Txt } from '../../components/Text';
import { dateEyebrow, grams, kcal, localDate, MEAL_ORDER, parseLocalDate, plural } from '../../lib/format';
import { useAppState } from '../../state/AppState';
import { useTheme } from '../../theme/ThemeProvider';
import { MealCard } from './MealCard';
import type { TabScreenProps } from '../../navigation/types';

/**
 * Where "on track" starts.
 *
 * A grading, not a prescription, and the legend under the rows says so in
 * words rather than leaving four bars to be interpreted. Half is the only
 * boundary defensible before the day is over: it is the point where finishing
 * needs the same again, which is a fact about the number rather than an
 * opinion about the person.
 */
const ON_TRACK = 0.5;

/**
 * Weight of ink per band. Three tints of one colour, never three hues.
 *
 * The reference greens and ambers these bars. This palette cannot: amber is
 * the app's single claim of "we do not know this number", and spending it on
 * "you are behind on fibre" makes the one signal protecting the product's
 * credibility unreadable. Ink at three weights carries a three-way grade
 * perfectly well, and leaves amber saying only what it has always said.
 */
const BAND_INK: Record<'short' | 'track' | 'met', number> = { short: 0.3, track: 0.55, met: 1 };

/** One silhouette per macro. Subjects, not abstractions — an egg, a grain. */
const MACRO_ICON: Record<string, IconName> = {
  Protein: 'egg',
  Carbs: 'grain',
  Fat: 'nut',
  Fibre: 'leaf',
};

/**
 * Today, drawn against the reference.
 *
 * A centred masthead, one ring carrying the figure people open the app for,
 * the parts of the day as labelled rows with a bar and a value each, a legend
 * saying what the bars mean, and a callout for the one thing the screen is
 * unsure about. Under it the day itself, as a ledger.
 *
 * Two things the reference does that this app must not, and both are colour.
 * It grades its bars green and amber; here amber means one thing only — a
 * number nobody measured — so the grades are three weights of ink and amber is
 * left for the callout that actually says "unknown". And it fills a card
 * behind every group; the cards are gone, because a rounded edge around the
 * only thing on the page is a box drawn around the page.
 *
 * The empty state is one line. It was an illustration, two sentences and a
 * full-width button repeating what the mic in the tab bar already does — the
 * most furniture in the app, on the screen of the person with the least to
 * look at.
 */
export function HomeScreen({ navigation }: TabScreenProps<'Today'>) {
  const { c, space } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const {
    day,
    date,
    setDate,
    goal,
    loading,
    pending,
    toast,
    refresh,
    undoToast,
    dismissToast,
    retryPending,
  } = useAppState();

  const [refreshing, setRefreshing] = useState(false);

  /**
   * Whether the screen is showing today or a day picked from the calendar.
   *
   * Recomputed each render rather than held in state: it depends on the wall
   * clock, and a value cached at mount is wrong for anybody who leaves the app
   * open across midnight.
   */
  const isToday = date === localDate();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const totals = day?.totals;
  const target =
    day?.goal ??
    (goal
      ? {
          kcal: goal.kcal,
          proteinG: goal.proteinG,
          carbsG: goal.carbsG,
          fatG: goal.fatG,
          fiberG: goal.fiberG,
        }
      : null);

  /**
   * Which macros had at least one item that did not report them.
   *
   * Per nutrient, not one shared count: the item missing fibre is usually not
   * the item missing carbs, and a single number could not say which total to
   * distrust.
   */
  const unmeasured: Record<string, number> = {
    Carbs: totals?.carbsUnmeasuredItems ?? 0,
    Fat: totals?.fatUnmeasuredItems ?? 0,
    Fibre: totals?.fiberUnmeasuredItems ?? 0,
  };
  const gaps = Object.entries(unmeasured).filter(([, n]) => n > 0);

  const entries = day?.entries ?? [];
  const hasEntries = entries.length > 0;
  const waiting = loading && !day;

  const ring = Math.min(248, width * 0.62);
  /** Positive is headroom, negative is overshoot. Read by the line in the ring. */
  const left = Math.round((target?.kcal ?? 0) - (totals?.kcal ?? 0));

  return (
    <Screen style={{ paddingTop: 0, paddingBottom: 0 }}>
      <LinearGradient
        colors={[c.wash[1], c.canvas, c.canvas]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
      />

      <View style={{ flex: 1, paddingTop: insets.top + space.xs }}>
        {/* The masthead: the day in the middle, one control at each end.

            The left control is the CALENDAR, not search. Search used to sit
            here on the reasoning that looking a food up has nothing to do with
            having logged nothing yet — true, but it is still reachable from the
            composer and from four paths in the confirm sheet, which is where
            people are when they actually need it. What was NOT reachable was
            any other day: the app has always held a `date` in AppState and had
            no control anywhere that could move it, so every day but today was
            unreachable from the UI. A control that opens a locked door beats a
            second door to a room you were already in. */}
        <Gutter>
          <Row justify="space-between" align="center" style={{ minHeight: 44 }}>
            <IconButton
              name="calendar"
              onPress={() => navigation.navigate('Calendar')}
              accessibilityLabel="Open the calendar, to look at a previous day"
              style={{ marginLeft: -10 }}
            />
            <View style={{ alignItems: 'center' }}>
              {/* Says which day is on screen, not the literal word "Today".
                  Now that a past date can be selected, a hardcoded "Today" over
                  last Tuesday's meals would be the screen lying about what it
                  is showing. */}
              <Txt role="labelSm" caps style={{ letterSpacing: 2 }} accessibilityRole="header">
                {isToday ? 'Today' : 'That day'}
              </Txt>
              <Txt role="caption" tone="tertiary" caps style={{ letterSpacing: 1.2 }}>
                {dateEyebrow(parseLocalDate(date))}
              </Txt>
            </View>
            <IconButton
              name="user"
              onPress={() => navigation.navigate('You')}
              accessibilityLabel="You"
              style={{ marginRight: -10 }}
            />
          </Row>

          {/* The way back, and it only exists when it is needed.
              Without it the calendar is a one-way door: picking a past day
              leaves the whole app on that day, and the only route home is
              opening the calendar again and finding today in the grid. */}
          {!isToday ? (
            <Row justify="center" style={{ paddingTop: space.sm }}>
              <TextButton label="Back to today" onPress={() => setDate(localDate())} />
            </Row>
          ) : null}
        </Gutter>

        <ScrollView
          showsVerticalScrollIndicator={false}
          // Clears the floating tab bar and its mic, drawn over this.
          contentContainerStyle={{ paddingBottom: space.huge * 2.5 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.inkTertiary} />
          }>
          <Gap h={space.xl} />

          {/* The figure, and nothing beside it. It counts DOWN — "637 left" is
              the question people open the app with — and past the target it
              flips to what is over, in amber. */}
          <View style={{ alignItems: 'center' }}>
            {waiting ? (
              <View
                style={{
                  width: ring,
                  height: ring,
                  borderRadius: ring / 2,
                  borderWidth: 16,
                  borderColor: c.sunken,
                }}
              />
            ) : (
              <Ring consumed={totals?.kcal ?? 0} goal={target?.kcal ?? 2000} size={ring} stroke={16}>
                <Gap h={2} />
                {/* What is left, under what has been eaten. It is still the
                    figure people steer by late in the day, but it is a
                    consequence of the two numbers above it rather than a third
                    number competing with them — and past the target it says
                    "over" in amber, which is the one thing on this screen that
                    is allowed to shout. */}
                <Txt
                  role="caption"
                  tone={left < 0 ? 'attention' : 'tertiary'}
                  numeric>
                  {kcal(Math.abs(left))} {left < 0 ? 'over' : 'left'}
                </Txt>
              </Ring>
            )}
          </View>

          <Gap h={space.xxl} />

          {/* The parts of the day, one row each, in the order people steer by. */}
          <Gutter>
            <View style={{ height: 1, backgroundColor: c.border }} />
            {(
              [
                ['Protein', totals?.proteinG ?? 0, target?.proteinG ?? 0],
                ['Carbs', totals?.carbsG ?? 0, target?.carbsG ?? 0],
                ['Fat', totals?.fatG ?? 0, target?.fatG ?? 0],
                ['Fibre', totals?.fiberG ?? 0, target?.fiberG ?? 0],
              ] as const
            ).map(([label, value, goalG]) => (
              <MacroRow
                key={label}
                label={label}
                value={value}
                target={goalG}
                unknownItems={unmeasured[label] ?? 0}
                waiting={waiting}
              />
            ))}

            <Gap h={space.lg} />
            <Legend />

            {/* The callout, and the only one the screen has. Amber, because it
                is the app saying a number is not what it appears to be: the
                total is short by whatever those items would have added, and
                reading it as complete is the mistake this prevents. */}
            {gaps.length > 0 ? (
              <>
                <Gap h={space.lg} />
                <View
                  style={{
                    borderWidth: 1,
                    borderColor: c.attention,
                    backgroundColor: c.attentionSoft,
                    borderRadius: 12,
                    padding: space.md,
                  }}>
                  <Row gap={space.sm} align="flex-start">
                    <View style={{ paddingTop: 1 }}>
                      <Icon name="info" size={13} color={c.attention} weight={2.1} />
                    </View>
                    <Txt role="caption" tone="attention" style={{ flexShrink: 1 }}>
                      {gaps.map(([n, count]) => `${n} for ${plural(count, 'item')}`).join(', ')}{' '}
                      {gaps.length === 1 ? 'is' : 'are'} unknown today — left out of the total, not
                      counted as zero.
                    </Txt>
                  </Row>
                </View>
              </>
            ) : null}

            {/* A queued log is not an error: it is saved on the phone and will
                send itself. A line says that; the bordered notice that used to
                say it read as something to fix. */}
            {pending.length > 0 ? (
              <>
                <Gap h={space.lg} />
                <Row gap={space.sm}>
                  <Icon name="offline" size={13} color={c.inkTertiary} weight={2.1} />
                  <Txt role="caption" tone="tertiary" style={{ flexShrink: 1 }}>
                    {plural(pending.length, 'log')} waiting to sync. Nothing to redo.
                  </Txt>
                  <TextButton label="Try now" role="labelSm" onPress={retryPending} />
                </Row>
              </>
            ) : null}
          </Gutter>

          <Gap h={space.huge} />

          {waiting ? (
            <Gutter>
              <GhostRows />
            </Gutter>
          ) : hasEntries ? (
            <Gutter>
              {/* Cards, not a ledger. A meal is a group of things eaten at one
                  time and an edge around it is what says so — and each one
                  carries its own note underneath, which needs somewhere to sit
                  that is visibly part of the meal it is about rather than
                  loose text between two lists. */}
              <Txt role="caption" tone="tertiary" caps style={{ letterSpacing: 1.4 }}>
                What you ate
              </Txt>
              <Gap h={space.md} />
              <Stack gap={space.md}>
                {MEAL_ORDER.map(meal => (
                  <MealCard
                    key={meal}
                    meal={meal}
                    entries={entries.filter(e => e.meal === meal)}
                    date={date}
                    onOpenEntry={entry => navigation.navigate('EntryDetail', { entryId: entry.id })}
                  />
                ))}
              </Stack>
            </Gutter>
          ) : (
            <Gutter>
              {/* One line, and no button. The mic is a thumb's width below
                  this, raised and lit, on every screen of the app. */}
              <Txt role="bodyLg" tone="tertiary">
                Nothing logged yet. Tap the mic and say what you ate.
              </Txt>
            </Gutter>
          )}
        </ScrollView>
      </View>

      <UndoToast
        visible={toast !== null}
        message={toast?.message ?? ''}
        detail={toast?.detail}
        onUndo={undoToast}
        onExpire={dismissToast}
        bottomOffset={72}
      />
    </Screen>
  );
}

/**
 * One nutrient: what it is, how far along, and how much there has been.
 *
 * A row rather than a meter in a grid, so all four read as one list with one
 * left edge — four boxes in a two-by-two made the day look like four separate
 * measurements of four separate things.
 *
 * The bar carries the grade and the number carries the fact. An unmeasured
 * nutrient marks its number with a '~' and greys the bar rather than filling
 * it: the total is a floor, not a reading, and a confident bar over an
 * incomplete number is the one thing this screen must never draw.
 */
function MacroRow({
  label,
  value,
  target,
  unknownItems,
  waiting,
}: {
  label: string;
  value: number;
  target: number;
  unknownItems: number;
  waiting: boolean;
}) {
  const { c, space } = useTheme();

  const share = target > 0 ? Math.min(value / target, 1) : 0;
  const band = share >= 1 ? 'met' : share >= ON_TRACK ? 'track' : 'short';
  const partial = unknownItems > 0;

  return (
    <View>
      <Row gap={space.md} style={{ paddingVertical: space.md }}>
        <Icon name={MACRO_ICON[label] ?? 'leaf'} size={16} color={c.inkTertiary} weight={1.9} />

        <Txt
          role="labelSm"
          tone="secondary"
          caps
          style={{ letterSpacing: 1.2, flexGrow: 1, flexShrink: 1 }}>
          {label}
        </Txt>

        <View
          style={{
            width: 76,
            height: 4,
            borderRadius: 2,
            backgroundColor: c.sunken,
            overflow: 'hidden',
          }}>
          {waiting ? null : (
            <View
              style={{
                width: `${Math.round(share * 100)}%`,
                height: 4,
                borderRadius: 2,
                backgroundColor: partial ? c.inkTertiary : c.ink,
                opacity: partial ? 0.5 : BAND_INK[band],
              }}
            />
          )}
        </View>

        <Row gap={1} align="baseline" style={{ width: 78, justifyContent: 'flex-end' }}>
          <Txt role="labelSm" numeric tone={waiting ? 'tertiary' : 'ink'}>
            {waiting ? '—' : `${partial ? '~' : ''}${grams(value)}`}
          </Txt>
          <Txt role="caption" tone="tertiary" numeric>
            /{grams(target)} g
          </Txt>
        </Row>
      </Row>
      <View style={{ height: 1, backgroundColor: c.border }} />
    </View>
  );
}

/**
 * What the bars mean, in words.
 *
 * The reference carries one, and it is why its rows can be read at a glance
 * instead of being four lengths with no scale. Three weights of ink, each of
 * them named — a legend of colours nobody can name is decoration.
 */
function Legend() {
  const { c, space } = useTheme();

  const items: Array<[string, number]> = [
    ['Under half', BAND_INK.short],
    ['On track', BAND_INK.track],
    ['Met', BAND_INK.met],
  ];

  return (
    <Row gap={space.lg} wrap>
      {items.map(([label, opacity]) => (
        <Row key={label} gap={6}>
          <View style={{ width: 14, height: 4, borderRadius: 2, backgroundColor: c.ink, opacity }} />
          <Txt role="caption" tone="tertiary">
            {label}
          </Txt>
        </Row>
      ))}
    </Row>
  );
}

/** The day's ledger before it has arrived. */
function GhostRows() {
  const { space } = useTheme();
  return (
    <View>
      {[0, 1, 2].map(i => (
        <View key={i} style={{ paddingVertical: space.md }}>
          <Row gap={space.md}>
            <View style={{ flexGrow: 1, flexShrink: 1 }}>
              <Ghost w={i === 1 ? 132 : 178} h={15} />
              <Gap h={space.sm} />
              <Ghost w={64} h={11} />
            </View>
            <Ghost w={44} h={15} />
          </Row>
        </View>
      ))}
    </View>
  );
}

/** One breathing block. */
function Ghost({ w, h }: { w: number; h: number }) {
  const { c } = useTheme();
  const pulse = useRef(new Animated.Value(0.4)).current;
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(v => alive && setReduced(v));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (reduced) {
      pulse.setValue(0.6);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 720,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.4,
          duration: 720,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, reduced]);

  return (
    <Animated.View
      style={{
        width: w,
        height: h,
        borderRadius: h / 2,
        backgroundColor: c.border,
        opacity: pulse,
      }}
    />
  );
}
