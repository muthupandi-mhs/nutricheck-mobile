import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { useApi } from '../../api/client';
import type { Fast } from '../../api/types';
import LinearGradient from 'react-native-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TextButton } from '../../components/Button';
import { UndoToast } from '../../components/Feedback';
import { Icon, type IconName } from '../../components/Icon';
import { Gap, Gutter, Row, Stack } from '../../components/Layout';

import { Press } from '../../components/Press';
import { Screen } from '../../components/Screen';
import { Txt } from '../../components/Text';
import { DASH, dateEyebrow, grams, kcal, localDate, MEAL_ORDER, parseLocalDate, plural } from '../../lib/format';
import { useAppState } from '../../state/AppState';
import { useTheme } from '../../theme/ThemeProvider';
import { Dial } from './Dial';
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

/**
 * The scale the fasting dial fills against **when nobody has declared a fast**:
 * one day, not a target.
 *
 * Deliberately not 16 hours or any other fasting window. An arc drawn against
 * a window the user never chose would make the dial a goal the app set on their
 * behalf, and this product does not tell anybody how long to go without eating.
 * A day is a neutral denominator: the arc says how far into one you are since
 * you last ate, and nothing about whether that is good.
 *
 * A declared fast is the other case, and it changes the argument rather than
 * breaking it. Once somebody has said "sixteen hours", the target is theirs and
 * an arc against it is drawing their intention, not the app's — so a running
 * fast fills against its own `targetHours` and this constant is not used.
 */
const FAST_SCALE_H = 24;

/** "14h" / "45m". Whole units, because the minute is not the point. */
function fastingLabel(hours: number): string {
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))}m`;
  return `${Math.floor(hours)}h`;
}

/**
 * How long a declared fast has been running, from this device's clock.
 *
 * Computed here rather than sent, because a duration in a response is a
 * duration as of the moment it was serialized — see `Fast.hours` in the
 * contracts, which is null on purpose while a fast is open.
 */
function elapsedOn(fast: Fast): number {
  return Math.max(0, (Date.now() - Date.parse(fast.startedAt)) / 3_600_000);
}

/**
 * One end of the day stepper.
 *
 * Disabled rather than hidden on the day it cannot move to, so the pill keeps
 * its width and the label under your thumb does not jump sideways.
 */
function Step({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { c, radius } = useTheme();

  return (
    <Press
      onPress={onPress}
      disabled={disabled}
      feedback="fade"
      haptic="select"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled) }}
      style={{
        width: 34,
        height: 34,
        borderRadius: radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: disabled ? 0.3 : 1,
      }}>
      <Icon name={icon} size={17} color={c.ink} weight={2.2} />
    </Press>
  );
}

/**
 * A day either side, clamped to today.
 *
 * Built from the parts rather than by adding milliseconds: a day is not always
 * 86,400 seconds long, and on the two mornings a year it is not, arithmetic on
 * the timestamp lands on the wrong date or the same one twice.
 */
function shiftDay(date: string, delta: number): string {
  const d = parseLocalDate(date);
  const moved = localDate(new Date(d.getFullYear(), d.getMonth(), d.getDate() + delta));
  const today = localDate();
  return moved > today ? today : moved;
}

/** One silhouette per macro. Subjects, not abstractions — an egg, a grain. */
const MACRO_ICON: Record<string, IconName> = {
  Protein: 'egg',
  Carbs: 'grain',
  Fat: 'nut',
  Fibre: 'leaf',
};

/**
 * Home, drawn against the reference.
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
export function HomeScreen({ navigation }: TabScreenProps<'Home'>) {
  const { c, radius, space } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const {
    profile,
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
   * Days logged in a row, or null while nobody has told us.
   *
   * Read off the week rather than counted here: the server already computes it
   * for Insights, and a second implementation on the client would be a second
   * answer to "what is a streak" that could disagree with the first one on the
   * screen next door.
   *
   * Its own call, not part of `refresh()`. That function is the day, and every
   * screen in the app waits on it; a decoration in the corner of one header
   * must not be able to slow it down, and must not be able to fail it either —
   * the catch here leaves the pill absent and the day untouched.
   */
  const api = useApi();
  const [streak, setStreak] = useState<number | null>(null);
  /**
   * The running fast, or null when nobody has declared one.
   *
   * Null covers both "not fasting" and "the request failed", and the dial
   * treats them the same on purpose: in either case the honest thing to show
   * is the gap since the last meal, which this screen can compute on its own.
   */
  const [fast, setFast] = useState<Fast | null>(null);

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

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      // Always counted back from today, whatever day is being LOOKED at: a
      // streak is a fact about now, and paging back to last Tuesday does not
      // change how many days you have logged in a row.
      api
        .getWeek(localDate())
        .then(w => alive && setStreak(w.streakDays))
        .catch(() => undefined);
      return () => {
        alive = false;
      };
    }, [api]),
  );

  /**
   * The declared fast, if there is one.
   *
   * On focus rather than through `refresh`, and with a limit of 1, because the
   * dial needs exactly one row: the running fast. Pulling it into AppState
   * would put a fasting fetch on every profile save and every day change, for
   * a figure that only moves when somebody presses start or end.
   *
   * A failure is swallowed to null, which lands on the derived gap below — the
   * dial then says how long since the last meal, which is true, useful, and
   * needs nothing from the server.
   */
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      api
        .getFasting(1)
        .then(s => alive && setFast(s.current))
        .catch(() => undefined);
      return () => {
        alive = false;
      };
    }, [api]),
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

  /**
   * Three across the gutter, with real air between them.
   *
   * The gap is `xl` because three circles a few points apart read as one
   * control cut into thirds rather than as three separate measures.
   */
  const dial = Math.min(118, (width - space.gutter * 2 - space.xl * 2) / 3);
  /** Positive is headroom, negative is overshoot. */
  const left = Math.round((target?.kcal ?? 0) - (totals?.kcal ?? 0));

  /**
   * Hours since the last thing logged, or null when there is nothing to
   * measure from.
   *
   * Derived rather than tracked. The app has no fasting feature and does not
   * need one to answer this: a meal is logged with the time it was logged, so
   * "how long since you last ate" is already in the data. What it is NOT is a
   * fast somebody declared — it is a gap, and it says so by being called one.
   *
   * Only for today. "How long since you ate" on a Tuesday you are looking back
   * at is a question about now, not about that day, and answering it with
   * today's clock would be nonsense.
   */
  const fasting = useMemo(() => {
    if (!isToday) return null;
    const last = [...(day?.entries ?? [])]
      .map(e => Date.parse(e.loggedAt))
      .filter(t => Number.isFinite(t))
      .sort((a, b) => b - a)[0];
    if (last === undefined) return null;
    return Math.max(0, (Date.now() - last) / 3600000);
  }, [day, isToday]);

  return (
    <Screen style={{ paddingTop: 0, paddingBottom: 0 }}>
      {/* The backdrop, in the same two colours everything else on this route
          is lit with.

          The dials' arcs, the mic on the tab bar and the field in the ask sheet
          all run `ringFrom` to `ringTo`; the page they sit on was a flat
          near-black, so the lit things read as stuck onto it rather than lit by
          it. This puts two soft lights behind the dials in those same two ashes
          — a background belonging to the same family as what stands on it,
          which is what the reference is doing when its page seems to glow
          behind the rings.

          Faint on purpose: 0.16 and 0.10 over a near-black page. Amber has to
          stay the loudest thing on this screen, and it cannot be if the page
          itself is competing. */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {/* Vertical, and it lands on the canvas by halfway: the top half is
            lit, the bottom half is not.

            Diagonal was wrong for what this page is. The things worth looking
            at — the day, the dials — are all in the top third, and a corner-to-
            corner wash spends its light on the left edge instead of on them.
            Straight down puts the brightest grey where the eye starts and lets
            the ledger of meals run out into the dark, which is also what stops
            a long day of rows looking like it is fading out.

            Weak, and it never reaches zero. At a quarter strength the top was
            a grey fog with a visible edge halfway down, and the bottom half
            fell away to near-black — two different pages stacked. The
            reference has no band anywhere: it is one dark grey, a little
            lighter at the top than the bottom, and that is all.

            So the stops run 16 → 0D → 07 across the whole height rather than
            42 → 00 across the first half. It is laid ON the canvas with an
            alpha because #D3D3D3 painted solid would be lighter than the ink
            standing on it. */}
        <LinearGradient
          colors={[`${c.lift}16`, `${c.lift}0D`, `${c.lift}07`]}
          locations={[0, 0.5, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <View style={{ flex: 1, paddingTop: insets.top + space.xs }}>
        {/* The masthead: you on the left, the day in the middle, the month on
            the right.

            The day is a stepper now rather than a label with a calendar button
            beside it. Moving a day is the thing people do constantly — "what
            did I eat yesterday" — and it was costing a screen, a grid and a
            tap on the right cell; the chevrons make it one tap in the place
            the date already is. The calendar stays, on the right, for the jump
            that a stepper is bad at: a Tuesday three weeks ago.

            Forward is present but INERT on today rather than missing. A
            control that vanishes moves the two beside it, so the whole
            masthead shifts every time you step back a day — and there is
            nothing to look at in the future either way. */}
        <Gutter>
          <Row justify="space-between" align="center" style={{ minHeight: 48 }}>
            {/* You, as a face rather than a glyph in a row of glyphs. The ring
                is what makes it read as a portrait — the reference does the
                same, and it is the one control here that is about a person
                rather than about a date. */}
            <Press
              onPress={() => navigation.navigate('You')}
              feedback="scale"
              haptic="select"
              accessibilityLabel="You"
              accessibilityHint="Your profile, targets and settings"
              style={{
                width: 40,
                height: 40,
                borderRadius: radius.pill,
                borderWidth: 1.5,
                borderColor: c.borderStrong,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Icon name="user" size={19} color={c.ink} weight={1.9} />
            </Press>

            {/* One pill, three targets: back a day, the day itself, forward a
                day. Tapping the middle opens the calendar, so the label is not
                dead space between two chevrons. */}
            <Row
              gap={2}
              style={{
                padding: 3,
                borderRadius: radius.pill,
                backgroundColor: c.sunken,
              }}>
              <Step
                icon="chevronLeft"
                label="Previous day"
                onPress={() => setDate(shiftDay(date, -1))}
              />

              <Press
                onPress={() => navigation.navigate('Calendar')}
                feedback="fade"
                haptic="select"
                accessibilityRole="button"
                accessibilityLabel={`${isToday ? 'Today' : dateEyebrow(parseLocalDate(date))}. Opens the calendar.`}
                style={{ paddingHorizontal: space.md, justifyContent: 'center', minHeight: 34 }}>
                <Txt role="labelSm" caps style={{ letterSpacing: 1.6 }} accessibilityRole="header">
                  {isToday ? 'Today' : dateEyebrow(parseLocalDate(date))}
                </Txt>
              </Press>

              <Step
                icon="chevronRight"
                label="Next day"
                disabled={isToday}
                onPress={() => setDate(shiftDay(date, 1))}
              />
            </Row>

            {/* The streak, where the calendar icon was.

                The calendar did not lose a door — tapping the date opens it,
                which is where somebody looking for a particular day already
                is. What that corner was missing was a reason to glance at it:
                a run of logged days is the one number on this screen that is
                about the habit rather than the meal, and it belongs beside the
                date it is counted from.

                Absent, not zero, when the week has not answered. "0 days" is a
                claim about somebody's month; a gap is the truth while a request
                is in flight. */}
            {streak === null ? (
              <View style={{ width: 40 }} />
            ) : (
              <Press
                onPress={() => navigation.navigate('Insights')}
                feedback="scale"
                haptic="select"
                accessibilityLabel={`${plural(streak, 'day')} logged in a row. Opens Insights.`}
                style={{
                  minWidth: 40,
                  height: 40,
                  paddingHorizontal: space.sm + 2,
                  borderRadius: radius.pill,
                  backgroundColor: c.sunken,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Row gap={5} align="center">
                  {/* Amber only once it is a streak. A flame on a day nobody
                      has logged is the app congratulating an empty page — and
                      amber is spoken for anyway, so the lit version has to earn
                      it by there being something to light. */}
                  <Icon
                    name="flame"
                    size={15}
                    color={streak > 0 ? c.attention : c.inkTertiary}
                    weight={2}
                  />
                  <Txt role="labelSm" numeric tone={streak > 0 ? 'ink' : 'tertiary'}>
                    {streak}
                  </Txt>
                </Row>
              </Press>
            )}
          </Row>
        </Gutter>

        <ScrollView
          showsVerticalScrollIndicator={false}
          // Clears the floating tab bar and its mic, drawn over this.
          contentContainerStyle={{ paddingBottom: space.huge * 2.5 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.inkTertiary} />
          }>
          {/* Room between the masthead and the dials. `huge` rather than `xl`:
              the header is a bar of controls and the dials are the content, and
              a page reads as having a head and a body only if there is more air
              between them than there is inside either. */}
          <Gap h={space.huge} />

          {/* Three dials, in the shape the reference uses: equal circles,
              equal weight, calories in the middle because it is the one people
              open the app for and the middle is where the eye lands.

              Fasting and weight are not decoration around it. They are the two
              questions somebody tracking their eating asks that a calorie
              count cannot answer — how long since I last ate, and is any of
              this moving the number I actually care about. */}
          <Gutter>
            <Row gap={space.xl} align="flex-start">
              {/* Two sources, one dial, and which one is showing changes what
                  the arc means.

                  A DECLARED fast fills against the target its owner chose, and
                  the figure is time served. A gap since the last meal fills
                  against a neutral day and says nothing about whether that gap
                  is good — see FAST_SCALE_H. The dial does not label which it
                  is, because at a glance the answer to "how long since I ate"
                  is the same number either way; the screen it opens is where
                  the difference is spelled out.

                  Whole hours, so this does not need a ticking clock behind it.
                  The figure changes once an hour, and a per-second timer on a
                  tab somebody leaves open would be a wake-up every second to
                  redraw the same two characters. The running clock lives on the
                  fasting screen, where it is the subject. */}
              <Dial
                size={dial}
                progress={
                  fast !== null
                    ? Math.min(elapsedOn(fast) / fast.targetHours, 1)
                    : fasting === null
                      ? null
                      : Math.min(fasting / FAST_SCALE_H, 1)
                }
                value={
                  fast !== null
                    ? fastingLabel(elapsedOn(fast))
                    : fasting === null
                      ? DASH
                      : fastingLabel(fasting)
                }
                label="Fasting"
                onPress={() => navigation.navigate('Fasting')}
                accessibilityLabel={
                  fast !== null
                    ? `Fasting, ${fastingLabel(elapsedOn(fast))} of ${fast.targetHours} hours. Opens your fasting timer.`
                    : fasting === null
                      ? 'Fasting, no meal logged to measure from. Opens your fasting timer.'
                      : `${fastingLabel(fasting)} since your last meal, no fast running. Opens your fasting timer.`
                }
              />

              <Dial
                size={dial}
                progress={waiting || !target?.kcal ? null : (totals?.kcal ?? 0) / target.kcal}
                value={waiting ? DASH : kcal(totals?.kcal ?? 0)}
                unit={waiting ? undefined : 'kcal'}
                over={left < 0}
                label="Calories"
                accessibilityLabel={
                  waiting
                    ? 'Calories, still loading'
                    : `${kcal(totals?.kcal ?? 0)} calories of ${kcal(target?.kcal ?? 0)}, ${kcal(
                        Math.abs(left),
                      )} ${left < 0 ? 'over' : 'left'}`
                }
              />

              {/* Still no arc. There is a history behind this now, but an arc
                  is a fraction of a target and there is no target weight to be
                  a fraction of — the profile holds a direction and a rate, not
                  a destination. A ring drawn against an invented one would be
                  the only figure on this screen that nobody chose.

                  It opens the report rather than the profile editor. That was
                  the right destination while the app held one weight and no
                  history: the only thing you could do with the number was
                  change it. Now a tap on a figure shows the figure, and logging
                  is one action at the bottom of the screen it opens. */}
              <Dial
                size={dial}
                progress={null}
                value={profile?.weightKg ? String(profile.weightKg) : DASH}
                unit={profile?.weightKg ? 'kg' : undefined}
                label="Weight"
                onPress={() => navigation.navigate('Weight')}
                accessibilityLabel={
                  profile?.weightKg
                    ? `Weight, ${profile.weightKg} kilograms. Opens your weight history.`
                    : 'Weight not set. Opens your weight history to record one.'
                }
              />
            </Row>
          </Gutter>

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
