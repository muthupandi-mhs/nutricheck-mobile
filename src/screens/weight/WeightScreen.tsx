import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApi } from '../../api/client';
import { OfflineError, type WeightPoint, type WeightSeries } from '../../api/types';
import { Button, IconButton, TextButton } from '../../components/Button';
import { Card } from '../../components/Card';
import { EmptyState, Notice } from '../../components/Feedback';
import { Stepper } from '../../components/Field';
import { Icon } from '../../components/Icon';
import { Divider, Gap, Gutter, Row, Spacer, Split, Stack } from '../../components/Layout';
import { Press } from '../../components/Press';
import { Header, Screen } from '../../components/Screen';
import { Sheet } from '../../components/Sheet';
import { Shimmer } from '../../components/Skeleton';
import { SectionLabel, Txt } from '../../components/Text';
import { DASH, dayMonth, parseLocalDate } from '../../lib/format';
import { useAppState } from '../../state/AppState';
import { useTheme } from '../../theme/ThemeProvider';
import type { ScreenProps } from '../../navigation/types';
import { WeightChart } from './WeightChart';

/**
 * The weight report, opened from the weight dial on Home.
 *
 * The dial used to open the profile editor, which was the right destination
 * when the app held one weight and no history: the only thing you could do with
 * the number was change it. Now there is a series behind it, and a tap on a
 * figure should show you the figure, not a form.
 *
 * Three things, in the order somebody asks them:
 *
 *   1. **What do I weigh** — the current reading, large, at the top.
 *   2. **Which way is it going** — the chart, and a fitted trend under it.
 *   3. **Is that the way I asked for** — the trend against the rate the profile
 *      committed to. This is the one the app can answer and a bathroom scale
 *      cannot, so it is stated in words rather than left as two numbers side by
 *      side for the reader to subtract.
 *
 * Logging sits at the bottom, on the same accelerating stepper the profile
 * screen uses for this number. Not a keyboard: a weight is a figure somebody
 * arrives knowing, three digits and a decimal, and the ± targets get there in
 * about a second from wherever the last reading was.
 */
/** The corner action's diameter. 56 is the smallest circle a plus reads in. */
const FAB = 56;

/**
 * How many readings the list shows before "View all".
 *
 * Five, because that is about a week of weighing in for somebody who does it
 * every other day — long enough to see the last few, short enough that the
 * chart above it is still on screen.
 */
const VISIBLE_READINGS = 5;

export function WeightScreen({ navigation }: ScreenProps<'Weight'>) {
  const { c, elevation, radius, space } = useTheme();
  const insets = useSafeAreaInsets();
  const api = useApi();
  const { profile, refresh } = useAppState();

  const [series, setSeries] = useState<WeightSeries | null>(null);
  /**
   * Which kind of failure, not whether there was one.
   *
   * Distinguished from `series === null`, which is "still loading" — a screen
   * that renders its empty state on a failed request tells somebody with a
   * hundred readings that they have never weighed themselves.
   *
   * And 'offline' is distinguished from 'server' because the difference is the
   * whole of what the reader can act on. Telling somebody on full signal to
   * check their connection sends them to look at the one thing that is working,
   * and it is what this screen did the first time a route was missing from the
   * running build.
   */
  const [failed, setFailed] = useState<Failure | null>(null);
  const [saving, setSaving] = useState(false);
  /**
   * The day the sheet is editing, or null when it is closed.
   *
   * A date rather than a boolean, because the sheet is now the one way into
   * every reading and not just today's. Holding the day here rather than in the
   * row that opened it means the SAVE has it too — and a correction that posted
   * without a date would silently rewrite today with a figure from three weeks
   * ago.
   */
  const [entering, setEntering] = useState<string | null>(null);
  /**
   * Whether the list is showing everything or just the head of it.
   *
   * Collapsed by default. Somebody who weighs in daily has ninety rows here,
   * and a screen whose top half is a chart and whose bottom half is three
   * months of scrolling buries the chart — while the question the list answers
   * on arrival ("what did the last few days say") is answered by five.
   */
  const [showAllReadings, setShowAllReadings] = useState(false);

  /**
   * Seeded from the profile so the stepper opens at what the app already
   * believes, and re-seeded once the series lands, because the newest reading
   * is a better starting point than the profile on the rare occasion they
   * differ — a backfilled entry moves one and not the other.
   */
  const [draft, setDraft] = useState(() => profile?.weightKg ?? 70);

  const load = useCallback(async () => {
    try {
      const next = await api.getWeightSeries();
      setSeries(next);
      setFailed(null);
      if (next.current) setDraft(next.current.weightKg);
    } catch (error) {
      setFailed({ kind: kindOf(error), verb: 'load' });
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  const onLog = async () => {
    setSaving(true);
    try {
      const next = await api.logWeight({ weightKg: draft, date: entering ?? undefined });
      setSeries(next);
      setFailed(null);
      setEntering(null);
      /**
       * Recording today's weight rewrites the profile and appends a goal on the
       * server, in one transaction. Refreshing pulls both back so the dial and
       * the targets on Home agree with this screen before the user gets there —
       * without it they would show the old weight until something else
       * happened to reload.
       *
       * Not awaited into the button's spinner: the write has already succeeded
       * and this screen is already correct. Holding the button for a refresh of
       * a screen behind it would make a local success look slow.
       */
      void refresh();
    } catch (error) {
      setFailed({ kind: kindOf(error), verb: 'save' });
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (entering === null) return;
    // Captured before the await: the sheet closes on success, and the branch
    // below still has to know what the deleted reading WAS.
    const removedNewest = editingNewest;

    setSaving(true);
    try {
      const next = await api.deleteWeight(entering);
      setSeries(next);
      setFailed(null);
      setEntering(null);
      // Deleting the newest promotes the one before it onto the profile and
      // recomputes the goal, server-side. Home is showing both.
      if (removedNewest) void refresh();
    } catch (error) {
      setFailed({ kind: kindOf(error), verb: 'delete' });
    } finally {
      setSaving(false);
    }
  };

  /**
   * The rows, newest first — the order the list draws, computed once so the
   * truncation and the row above each row agree about what "the previous one"
   * means.
   *
   * `reverse` on a copy: the chart renders from `series.points` in its own
   * order, and mutating the array under it would flip the line.
   */
  const readings = series ? [...series.points].reverse() : [];
  const visibleReadings = showAllReadings ? readings : readings.slice(0, VISIBLE_READINGS);

  const current = series?.current ?? null;
  const start = series?.start ?? null;
  const trend = series?.trend ?? null;
  const sinceStart =
    current && start && current.date !== start.date ? current.weightKg - start.weightKg : null;

  /**
   * Whether the day in the sheet is the newest reading there is — which is the
   * server's own condition for copying a weight onto the profile and
   * recomputing the goal. Mirrored here to say so, never to decide it: the
   * server decides, and this only has to describe the same rule.
   *
   * `>=` because re-saving the newest day is still the newest day, and today
   * is newest even when there is no reading on it yet.
   */
  const editingNewest = entering !== null && (!current || entering >= current.date);
  /** Whether that day already has a reading, so "replaces" is the honest verb. */
  const editingLogged = series?.points.some(p => p.date === entering) ?? false;
  /**
   * Whether there is exactly one reading in total — in which case the server
   * will refuse to delete it, and offering the button would be offering a
   * failure.
   *
   * Read off `start` and `current`, which are the first and last readings
   * OVERALL rather than within the window: when those are the same day there is
   * one reading and nothing to guess about. Counting `points` instead would
   * hide the button from anybody whose older readings had scrolled off the
   * ninety-day window.
   */
  const onlyReading = series?.start != null && series.start.date === series.current?.date;
  const canDelete = editingLogged && !onlyReading;
  const sheetTitle =
    entering === null
      ? ''
      : entering === todayLocal()
        ? editingLogged
          ? 'Correct today'
          : "Today's weight"
        : `Correct ${dayMonth(parseLocalDate(entering))}`;

  /**
   * The sentence under the control — three different true things, and which one
   * applies depends on the day being edited.
   *
   * The first has to be said out loud: the server copies a reading onto the
   * profile only when it is the NEWEST one, so correcting a Tuesday from three
   * weeks ago redraws the chart and deliberately leaves today's weight and
   * today's targets alone. A screen that promised to recalculate would be
   * describing a write that does not happen.
   *
   * Lifted out of the markup because it is three branches of prose, and three
   * branches of prose nested in JSX is where a sentence goes wrong unnoticed.
   */
  const sheetHint = !editingNewest
    ? 'An older reading. Correcting it redraws the chart and leaves your current weight and targets untouched.'
    : editingLogged
      ? 'Saving replaces that reading rather than adding a second one, and your targets follow it.'
      : 'Your calorie and protein targets are recalculated from this.';

  return (
    <Screen scrollable>
      {/* The page's name, not its headline figure. The current weight was the
          title and "Your weight" the line above it, which made the number a
          heading and the heading a caption — and printed the same figure twice,
          since "Now" in the card below is the same reading. */}
      <Header
        title="Weight"
        leading={{ icon: 'chevronLeft', onPress: () => navigation.goBack(), label: 'Back' }}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        /* Clears the corner action drawn over this, computed from where that
           button actually is rather than guessed at with a round number — the
           last reading in the list has to be reachable, not parked underneath
           it. One gutter of daylight between the two. */
        contentContainerStyle={{ paddingBottom: insets.bottom + space.gutter * 3 + FAB }}>
        <Gutter>
          {series === null && failed === null ? (
            <Stack gap={space.md}>
              <Shimmer width="100%" height={96} />
              <Shimmer width="100%" height={200} delay={140} />
            </Stack>
          ) : failed !== null && series === null ? (
            <EmptyState
              icon={failed.kind === 'offline' ? 'offline' : 'alert'}
              title="Could not load your weight"
              detail={
                failed.kind === 'offline'
                  ? 'The history lives on the server, so this screen needs a connection. Everything else — logging, search, your day — keeps working offline.'
                  : 'The server could not answer, and the app cannot tell you why — which is worth saying plainly rather than guessing at a cause. Nothing about your weight has been lost.'
              }
              action={{ label: 'Try again', onPress: () => void load() }}
            />
          ) : (
            <Stack gap={space.lg}>
              {/* The two figures that need no chart to read. `start` is the
                  first reading ever recorded, not the first in the window: the
                  question is "how far have I come", and a 90-day frame would
                  keep re-answering it about a different starting point every
                  time the window slid. */}
              <Card>
                <Split align="flex-start">
                  <Figure
                    label="Now"
                    value={current ? current.weightKg.toFixed(1) : DASH}
                    unit="kg"
                    detail={current ? whenLabel(current.date) : 'not recorded'}
                  />
                  <Figure
                    label="Started at"
                    value={start ? start.weightKg.toFixed(1) : DASH}
                    unit="kg"
                    detail={start ? whenLabel(start.date) : undefined}
                  />
                  <Figure
                    label="Change"
                    value={sinceStart === null ? DASH : signed(sinceStart)}
                    unit={sinceStart === null ? undefined : 'kg'}
                    detail={sinceStart === null ? 'needs a second reading' : 'since you started'}
                    tone={sinceStart === null ? 'ink' : moving(sinceStart, profile?.objective)}
                  />
                </Split>
              </Card>

              {series && series.points.length > 0 ? (
                <Card>
                  <Stack gap={space.sm}>
                    <SectionLabel>Last 90 days</SectionLabel>
                    <WeightChart points={series.points} />
                    {trend ? (
                      <>
                        <Divider />
                        <Gap h={space.xs} />
                        <Split align="baseline">
                          <Txt role="bodySm" tone="secondary">
                            Trend
                          </Txt>
                          <Txt role="labelSm" numeric>
                            {signed(trend.kgPerWeek)} kg per week
                          </Txt>
                        </Split>
                        {/* The fit and the subtraction, both shown. They
                            disagree whenever a run of readings is noisy, and
                            the honest thing is to say which is which rather
                            than print one number and call it the truth. */}
                        <Split align="baseline">
                          <Txt role="bodySm" tone="secondary">
                            Over {trend.spanDays} {trend.spanDays === 1 ? 'day' : 'days'}
                          </Txt>
                          <Txt role="bodySm" tone="tertiary" numeric>
                            {signed(trend.deltaKg)} kg end to end
                          </Txt>
                        </Split>
                      </>
                    ) : null}
                  </Stack>
                </Card>
              ) : null}

              {trend && trend.intendedKgPerWeek !== null ? (
                <PaceNote
                  actual={trend.kgPerWeek}
                  intended={trend.intendedKgPerWeek}
                />
              ) : null}

              {/* The readings themselves, newest first.

                  The chart shows the shape and this shows the record. They are
                  not redundant: a line answers "which way is this going", and
                  it cannot answer "did I log Tuesday" or "what exactly did it
                  say on the 14th" — which are the questions somebody asks when
                  the line does something they did not expect.

                  Newest first because the top of a list is where the eye
                  starts and the most recent reading is the one being checked.
                  The chart runs the other way, oldest to newest, because time
                  reads left to right; that is not an inconsistency, it is two
                  different things being ordered by two different rules. */}
              {readings.length > 0 ? (
                <Stack gap={space.sm}>
                  <Split align="center" style={{ minHeight: 24 }}>
                    <SectionLabel>Readings</SectionLabel>
                    {/* The count was here, and a count is a fact nobody needed:
                        the rows are right below it and the chart already says
                        how much history there is. A way THROUGH the list is
                        worth the space; a tally of it is not.

                        Absent below the fold, because "View all" over a list
                        that is already all of it is a button that does
                        nothing. */}
                    {readings.length > VISIBLE_READINGS ? (
                      <TextButton
                        label={showAllReadings ? 'Show less' : 'View all'}
                        role="labelSm"
                        onPress={() => setShowAllReadings(v => !v)}
                      />
                    ) : null}
                  </Split>

                  <Card padded={false}>
                    {visibleReadings.map((point, i) => (
                      <View key={point.date}>
                        {i > 0 ? <Divider inset={space.xl} /> : null}
                        <ReadingRow
                          point={point}
                          /* The next one DOWN the FULL list, not the visible
                             one. Read off `rows` while the list is truncated
                             and the last visible row would lose its change —
                             the reading before it exists, it is simply not
                             drawn yet. */
                          previous={readings[i + 1] ?? null}
                          isFirstEver={point.date === series?.start?.date}
                          objective={profile?.objective}
                          onEdit={() => {
                            setDraft(point.weightKg);
                            setEntering(point.date);
                          }}
                        />
                      </View>
                    ))}
                  </Card>
                </Stack>
              ) : null}

              {/* Shown where the form was, not over the screen: the numbers
                  above are still the numbers, and only the save failed. */}
              {failed !== null && series !== null ? (
                <Notice
                  tone="danger"
                  icon="alert"
                  title={failed.verb === 'delete' ? 'That did not delete' : 'That did not save'}
                  detail={
                    failed.kind === 'offline'
                      ? 'Nothing changed — the device is offline. The figures above are what the server last confirmed.'
                      : 'Nothing changed; the server refused it. The figures above are what the server last confirmed.'
                  }
                />
              ) : null}
            </Stack>
          )}
        </Gutter>
      </ScrollView>

      {/* The one action, in the bottom-right corner.

          A circle rather than the full-width bar it replaced. That bar said
          "Update today" or "Log today's weight" in a sentence, which is a lot
          of furniture for a screen whose job is reading — and it reserved a
          strip across the bottom of every render, including the ones where
          there is nothing to read yet.

          A plus needs no label because the sheet it opens is titled, and it
          sits over the content instead of pushing it up. The screen reader
          still gets the sentence: see `accessibilityLabel`, which says which
          of the two things this does.

          Ink on canvas, the same skin as a primary Button — this is the
          screen's primary action, and giving it the ask gradient would borrow
          a colour that means "a model is involved" for arithmetic. */}
      <Press
        onPress={() => {
          if (current) setDraft(current.weightKg);
          setEntering(todayLocal());
        }}
        haptic="select"
        accessibilityLabel={
          current?.date === todayLocal() ? "Update today's weight" : "Log today's weight"
        }
        accessibilityHint="Opens a sheet to type or step the number."
        style={{
          position: 'absolute',
          /* Aligned to the page gutter, so the circle's right edge sits on the
             same line as the right edge of every card it floats over. The
             convention is 16; this app's grid is 20, and matching the grid is
             what stops it looking like it landed a few pixels off. */
          right: space.gutter,
          /* ABOVE the safe area, not merely as tall as it.

             This was `Math.max(insets.bottom, space.lg)`, which on any device
             with a gesture bar returns the inset — so the circle sat flush on
             the home indicator with no gap at all, and on a device with no
             inset it sat 16 up. One expression, two wrong answers. Adding the
             margin to the inset gives the same visible gap on both. */
          bottom: insets.bottom + space.gutter,
          width: FAB,
          height: FAB,
          borderRadius: radius.pill,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: c.ink,
          ...elevation.e2,
        }}>
        <Icon name="plus" size={26} color={c.canvas} weight={2.4} />
      </Press>

      {/*
        A sheet, not a route.

        Entering a weight is one number over the screen that explains why it
        matters — pushing a screen would put the chart the reader is comparing
        against behind a back button, and leave an entry in the stack for
        something that is not a place. Unmounted when closed, so the field
        cannot hold yesterday's half-typed number.
      */}
      <Sheet
        visible={entering !== null}
        onDismiss={() => setEntering(null)}
        height={0.5}
        // AskSheet's surface: the faint blue wash and the graded scrim, so the
        // two panels in this app are the same object seen twice rather than
        // two different ideas of what a sheet looks like.
        tint
        // Not while the write is in flight: a swipe that closed the sheet
        // mid-save would leave the button spinning on a screen nobody is
        // looking at, with no way to learn whether it landed.
        dismissible={!saving}>
        {/* Column, so the question sits at the top and the answer button at the
            bottom edge — the same arrangement as the screen behind it, where
            the action is docked rather than trailing the last card. Flowing the
            button straight after the stepper left it stranded mid-sheet with
            dead space under it, and put the one target you reach for furthest
            from the thumb already holding the phone. */}
        <View style={{ flex: 1 }}>
          <Gap h={space.lg} />

          <Gutter>
            {/* The header AskSheet uses, because these two are the same kind of
                object and should announce themselves the same way: a small
                round chip holding one glyph, then the name of the thing in
                tracked caps, then whatever action belongs to the panel on the
                right.

                The surface is borrowed too — see `tint` on the Sheet below.
                Worth knowing what that costs: the wash used to appear on
                exactly one panel and so could be read as "this is where you
                talk to it". It now means "this is a sheet", which is a weaker
                thing to mean but a consistent one, and consistency is the
                reason it is here. */}
            <Row justify="space-between" align="center">
              <Row gap={space.sm} align="center" style={{ flexShrink: 1 }}>
                <View
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: radius.pill,
                    backgroundColor: c.primarySoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Icon name="scale" size={14} color={c.primarySoftInk} weight={2} />
                </View>
                <Txt
                  role="labelSm"
                  tone="secondary"
                  caps
                  accessibilityRole="header"
                  style={{ letterSpacing: 1.4, flexShrink: 1 }}>
                  {sheetTitle}
                </Txt>
              </Row>

              {/* Top-right, where AskSheet puts Memory — and away from Save.

                  Destructive actions do not belong in the thumb's path to the
                  primary one; this was a text link directly under Save, which
                  is the worst place on a sheet for the one control you cannot
                  undo. Absent rather than disabled when there is nothing to
                  remove, because a greyed bin invites a tap to find out why. */}
              {canDelete ? (
                <IconButton
                  name="trash"
                  onPress={() => void onDelete()}
                  size={18}
                  color={c.danger}
                  accessibilityLabel="Delete this reading"
                  style={{ marginRight: -10 }}
                />
              ) : null}
            </Row>

            <Gap h={space.xxl} />

            {/* Type it or step it, in one control, then what saving it will do.

                One control, because the two are different tasks: somebody
                reading a scale has a number in hand and wants the keypad, and
                somebody correcting yesterday's by a notch wants the ± and no
                keyboard at all. One decimal place — scales report one, and a
                weight without it cannot show the change a week makes.

                The sentence used to sit above the card, between the title and
                the number, which put an explanation in front of the thing it
                explains and pushed the sheet's only control down the screen.
                Underneath, it reads as a consequence of the value above it,
                which is what it is. */}
            <Stepper
              framed
              /* Sunken, not surface. The sheet is already `surface`, so a
                 surface card on it has no edge — the step in lightness IS the
                 edge in this palette, and one step down is what makes the
                 control read as an object on the panel rather than part of it. */
              fill="sunken"
              label="Weight"
              value={draft}
              unit="kg"
              step={0.1}
              decimals={1}
              min={25}
              max={400}
              onChange={setDraft}
            />

            <Gap h={space.md} />

            <Txt role="bodySm" tone="secondary">
              {sheetHint}
            </Txt>
          </Gutter>

          <Spacer />

          {/* Padded here rather than wrapped in a `Dock`. Dock adds the bottom
              safe-area inset and the sheet has already added it — the two
              together push the button up off the edge it is meant to sit on. */}
          <Gutter style={{ paddingTop: space.lg, paddingBottom: space.md }}>
            <Button label="Save" onPress={() => void onLog()} loading={saving} haptic="commit" />
          </Gutter>
        </View>
      </Sheet>
    </Screen>
  );
}

/** One of the three figures across the top. */
function Figure({
  label,
  value,
  unit,
  detail,
  tone = 'ink',
}: {
  label: string;
  value: string;
  unit?: string;
  detail?: string;
  tone?: 'ink' | 'primary' | 'attention';
}) {
  return (
    <Stack gap={3} style={{ flexGrow: 1, flexBasis: 0 }}>
      <Txt role="caption" tone="tertiary">
        {label}
      </Txt>
      <Row gap={2} align="baseline">
        <Txt role="h2" numeric tone={tone}>
          {value}
        </Txt>
        {unit ? (
          <Txt role="bodySm" tone="secondary">
            {unit}
          </Txt>
        ) : null}
      </Row>
      {detail ? (
        <Txt role="caption" tone="tertiary">
          {detail}
        </Txt>
      ) : null}
    </Stack>
  );
}

/**
 * One day's reading, and what it did to the number.
 *
 * The change is against the PREVIOUS READING, not the previous day — they are
 * only the same thing for somebody who weighs themselves every morning. Filling
 * the gap with "no change" would invent readings that were never taken, and
 * dividing by the days between would put a rate in a column of weights.
 *
 * At the bottom of the window `previous` is null, and the two reasons for that
 * are different: either this is genuinely the first reading ever, which is
 * worth saying, or there are older ones outside the window, in which case the
 * honest thing is to say nothing rather than call it a beginning.
 */
function ReadingRow({
  point,
  previous,
  isFirstEver,
  objective,
  onEdit,
}: {
  point: WeightPoint;
  previous: WeightPoint | null;
  isFirstEver: boolean;
  objective?: 'lose' | 'maintain' | 'gain';
  onEdit: () => void;
}) {
  const { c, space } = useTheme();
  const change = previous ? point.weightKg - previous.weightKg : null;

  return (
    <Press
      onPress={onEdit}
      feedback="fade"
      haptic="select"
      accessibilityLabel={`${whenLabel(point.date)}, ${point.weightKg.toFixed(1)} kilograms`}
      accessibilityHint="Opens this reading to correct it."
      style={{ paddingHorizontal: space.xl, paddingVertical: space.md }}>
      <Row gap={space.md} align="center">
        <Stack gap={2} style={{ flexGrow: 1, flexShrink: 1 }}>
          <Txt role="body">{whenLabel(point.date)}</Txt>
          {isFirstEver && previous === null ? (
            <Txt role="caption" tone="tertiary">
              first reading
            </Txt>
          ) : null}
        </Stack>

        {change === null ? null : (
          <Txt
            role="caption"
            numeric
            /* Grey rather than green or amber inside a rounding error of zero.
               At one decimal place a 40 g difference prints as 0.0, and
               colouring that as progress reads a scale's noise as a result. */
            tone={Math.abs(change) < 0.05 ? 'tertiary' : moving(change, objective)}>
            {signed(change)}
          </Txt>
        )}

        <Row gap={3} align="baseline">
          <Txt role="labelSm" numeric>
            {point.weightKg.toFixed(1)}
          </Txt>
          <Txt role="caption" tone="tertiary">
            kg
          </Txt>
        </Row>

        {/* A chevron, so the row says it is a door before it is tapped. It is
            what every pressable row in the app wears — see `YouScreen`, which
            shows one only when `onPress` is set. Without it this is a table
            that happens to respond to touch, which nobody tries. */}
        <Icon name="chevronRight" size={17} color={c.inkTertiary} />
      </Row>
    </Press>
  );
}

/**
 * Intent against outcome, in a sentence.
 *
 * The comparison is on MAGNITUDE in the intended direction, not on the raw
 * numbers, because "behind" and "ahead" both have to work for somebody gaining
 * as well as somebody losing. Sign alone would call a gainer putting on 0.6
 * kg/week against a 0.4 target "over" — which is true of the number and
 * backwards as a statement about their week.
 *
 * The tolerance is a fifth of the intended rate rather than a fixed figure. At
 * 0.25 kg/week a 100 g miss is most of the target; at 1 kg/week it is noise,
 * and one threshold cannot be right for both.
 */
function PaceNote({ actual, intended }: { actual: number; intended: number }) {
  const direction = Math.sign(intended);
  const progress = actual * direction;
  const goal = Math.abs(intended);
  const tolerance = Math.max(goal * 0.2, 0.05);
  const verb = intended < 0 ? 'losing' : 'gaining';

  const [title, detail, tone] =
    progress < -tolerance
      ? [
          `Going the other way`,
          `You asked to be ${verb} ${goal} kg a week. Over this window the trend is ${signed(
            actual,
          )} kg a week — the opposite direction. One noisy fortnight can do this; a month of it means the targets are wrong for how you are actually eating.`,
          'attention' as const,
        ]
      : progress < goal - tolerance
        ? [
            `Slower than planned`,
            `${cap(verb)} about ${Math.abs(actual).toFixed(2)} kg a week against the ${goal} you asked for.`,
            'attention' as const,
          ]
        : progress > goal + tolerance
          ? [
              `Faster than planned`,
              `${cap(verb)} about ${Math.abs(actual).toFixed(
                2,
              )} kg a week against the ${goal} you asked for. Faster is not better here — the targets were set to make the rate you chose sustainable.`,
              'attention' as const,
            ]
          : [
              `On the pace you set`,
              `${cap(verb)} about ${Math.abs(actual).toFixed(2)} kg a week, which is the ${goal} you asked for.`,
              'success' as const,
            ];

  return <Notice tone={tone} icon={tone === 'success' ? 'check' : 'info'} title={title} detail={detail} />;
}

/**
 * What went wrong, and during what.
 *
 * The verb is carried because the same two failure kinds mean different things
 * to a reader depending on what they had just pressed — "that did not save" is
 * a lie about a delete that failed, and the reader has no other way to tell
 * which of the two did not happen.
 */
type Failure = { kind: 'offline' | 'server'; verb: 'load' | 'save' | 'delete' };

/**
 * What kind of failure it was, from the two the transport distinguishes.
 *
 * Anything that is not a dead socket is the server's answer — a 404 from a
 * route the running build does not serve, a 500, a refused token. All of them
 * are "the server could not answer" to a reader, and none of them are fixed by
 * looking at the signal bars.
 */
function kindOf(error: unknown): 'offline' | 'server' {
  return error instanceof OfflineError ? 'offline' : 'server';
}

/** Always signed, so a loss and a gain are never mistaken for each other. */
function signed(n: number): string {
  const rounded = Math.abs(n) < 0.05 ? 0 : n;
  return `${rounded > 0 ? '+' : rounded < 0 ? '−' : ''}${Math.abs(rounded).toFixed(1)}`;
}

/**
 * Whether a change is going the way the user asked.
 *
 * Neutral for somebody maintaining, and for a profile that has not loaded:
 * colouring a number as good or bad requires knowing what they were trying to
 * do, and guessing "down is good" is wrong for a third of the people using this.
 */
function moving(delta: number, objective?: 'lose' | 'maintain' | 'gain'): 'ink' | 'primary' | 'attention' {
  if (!objective || objective === 'maintain') return 'ink';
  const wanted = objective === 'lose' ? -1 : 1;
  return Math.sign(delta) === wanted ? 'primary' : 'attention';
}

function whenLabel(date: string): string {
  return date === todayLocal() ? 'today' : dayMonth(parseLocalDate(date));
}

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
