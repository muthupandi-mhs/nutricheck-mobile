import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState as RNAppState, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApi } from '../../api/client';
import {
  ApiError,
  FASTING_BACKDATE_MAX_HOURS,
  FASTING_DEFAULT_TARGET_HOURS,
  FASTING_PLANS,
  OfflineError,
  type Fast,
  type FastingSummary,
} from '../../api/types';
import { Button, TextButton } from '../../components/Button';
import { Card } from '../../components/Card';
import { Notice } from '../../components/Feedback';
import { Segmented } from '../../components/Field';
import { Icon } from '../../components/Icon';
import { Divider, Gap, Gutter, Row, Spacer, Split, Stack } from '../../components/Layout';
import { Press } from '../../components/Press';
import { Header, Screen } from '../../components/Screen';
import { Sheet } from '../../components/Sheet';
import { Shimmer } from '../../components/Skeleton';
import { SectionLabel, Txt } from '../../components/Text';
import { DASH, clockTime, dayMonth, localDate, plural } from '../../lib/format';
import { useTheme } from '../../theme/ThemeProvider';
import type { ScreenProps } from '../../navigation/types';
import { FastingRing } from './FastingRing';

/**
 * The fasting screen, opened from the fasting dial on Home.
 *
 * The dial has always been able to say how long it had been since the last
 * thing was logged — a gap, computed from meal timestamps, needing no feature
 * behind it. This screen is the other thing, and the distinction is the whole
 * design: **a gap is measured, a fast is declared.** Nobody keeps a gap. What
 * makes a fast worth a screen is that somebody said when it began and how long
 * they meant it to run, so the clock is counting toward something they chose.
 *
 * Four things, in the order somebody asks them:
 *
 *   1. **How long have I been going** — the ring and the running clock.
 *   2. **How much is left** — the target under it, and the time it finishes.
 *   3. **How am I doing generally** — longest, average, how often the target
 *      is met. All-time, not over the window the list shows.
 *   4. **What did I actually do** — the history, newest first.
 *
 * The one action sits at the bottom and changes with the state: Start when
 * nothing is running, End when something is. Not a corner plus like the weight
 * screen's, because that button has one meaning and this one has two, and a
 * circle with a glyph in it cannot say which.
 *
 * Nothing on this screen is derived from what has been eaten, and nothing it
 * writes changes a target. That independence is deliberate — see
 * `FastingModule` on the server, which imports nothing.
 */

/**
 * How many finished fasts the list shows before "View all".
 *
 * Five, the same as the weight screen's readings, for the same reason: long
 * enough to cover the last few days for somebody doing this daily, short
 * enough that the clock above it is still on screen.
 */
const VISIBLE_FASTS = 5;

/**
 * How far past the target a fast has to run before the screen says something.
 *
 * Half a day. Overshooting by an hour is somebody who was busy; overshooting
 * by twelve is almost always a timer nobody stopped, and the fix — end it at
 * the right time, or throw it away — is one the app cannot make on their
 * behalf without inventing the moment they broke their fast.
 */
const STALE_AFTER_TARGET_H = 12;

/** Which panel is open. A union rather than four booleans, because exactly one is. */
type Panel =
  | { kind: 'startTime' }
  | { kind: 'target' }
  | { kind: 'endEarly' }
  | { kind: 'fast'; fast: Fast };

export function FastingScreen({ navigation }: ScreenProps<'Fasting'>) {
  const { c, radius, space } = useTheme();
  const insets = useSafeAreaInsets();
  const api = useApi();

  const [summary, setSummary] = useState<FastingSummary | null>(null);
  /**
   * Which kind of failure, not whether there was one — the same three-way
   * split the weight screen makes, plus one this screen needs and that one
   * does not.
   *
   * 'stale' is the addition: this is the only screen in the app whose subject
   * can be changed from somewhere else while it is open, because a fast is a
   * single running thing and a second device can end it. A 404 or a 409 here
   * does not mean anything is broken — it means this screen is describing a
   * state that no longer exists, and the honest response is to say so and
   * reload rather than to report an error the user cannot act on.
   */
  const [failed, setFailed] = useState<Failure | null>(null);
  const [busy, setBusy] = useState(false);
  const [panel, setPanel] = useState<Panel | null>(null);
  const [showAll, setShowAll] = useState(false);

  /**
   * The plan the start control is set to, or null to follow the server.
   *
   * Null rather than seeded from the summary, so that a picker nobody has
   * touched keeps tracking `lastTargetHours` as it arrives and as it changes.
   * Seeding it on load would freeze the choice at whatever had loaded first.
   */
  const [plan, setPlan] = useState<number | null>(null);

  /**
   * How tall the docked action is, measured rather than guessed.
   *
   * It has to be measured because it is not one height: the idle state carries
   * a button and the "I stopped eating earlier" link under it, the running
   * state carries the button alone, and both sit on a safe-area inset that
   * differs per device. A constant was wrong for the taller of the two — the
   * last row of the history sat underneath the button, reachable only by
   * over-scrolling, which on a list is indistinguishable from the list ending
   * there.
   *
   * The initial value is the shorter arrangement, so the first frame errs
   * toward too little padding for a few milliseconds rather than a visible
   * gap that then collapses.
   */
  const [dock, setDock] = useState(88);

  /** Minutes ago the start-time panel is set to. Seeded when it opens. */
  const [startedMinutesAgo, setStartedMinutesAgo] = useState(0);
  /** The target the target panel is set to. Seeded when it opens. */
  const [targetDraft, setTargetDraft] = useState(FASTING_DEFAULT_TARGET_HOURS);

  const load = useCallback(async () => {
    try {
      const next = await api.getFasting();
      setSummary(next);
      setFailed(null);
    } catch (error) {
      setFailed({ kind: kindOf(error), verb: 'load' });
    }
  }, [api]);

  useEffect(() => {
    void load();
  }, [load]);

  const current = summary?.current ?? null;

  /**
   * The clock, ticking only while there is something to tick for.
   *
   * Running from `Date.now()` on every tick rather than incrementing a
   * counter, so an app that spent an hour in the background comes back showing
   * an hour more rather than an hour behind.
   */
  const now = useNow(current !== null);

  const elapsedH = current === null ? 0 : Math.max(0, now - Date.parse(current.startedAt)) / 3_600_000;
  const remainingH = current === null ? 0 : current.targetHours - elapsedH;
  const finishesAt =
    current === null ? null : Date.parse(current.startedAt) + current.targetHours * 3_600_000;

  /**
   * One path for every write, because they differ in exactly two ways: the
   * call, and the verb to put in the failure notice.
   *
   * A 'stale' failure reloads. The screen is out of date rather than wrong,
   * and the only useful thing to show is what is actually true now.
   */
  const run = useCallback(
    async (verb: Failure['verb'], op: () => Promise<FastingSummary>) => {
      setBusy(true);
      try {
        setSummary(await op());
        setFailed(null);
        setPanel(null);
        setPlan(null);
      } catch (error) {
        const kind = kindOf(error);
        setFailed({ kind, verb });
        if (kind === 'stale') void load();
      } finally {
        setBusy(false);
      }
    },
    [load],
  );

  const chosenTarget = plan ?? summary?.lastTargetHours ?? FASTING_DEFAULT_TARGET_HOURS;

  const onStart = (startedAt?: string) =>
    run('start', () => api.startFast({ targetHours: chosenTarget, startedAt }));

  /**
   * Ending goes straight through once the target is met, and asks first when
   * it is not.
   *
   * A finished fast is a good outcome and does not need a confirmation on top
   * of it — putting one there taxes the common case to guard the rare one.
   * Stopping early is a decision, and the thing worth showing before it is how
   * much was left, which is a figure the user cannot see once the sheet closes
   * and the clock is gone.
   */
  const onEnd = () => {
    if (current !== null && remainingH > 0) {
      setPanel({ kind: 'endEarly' });
      return;
    }
    void run('end', () => api.endFast());
  };

  const openStartTime = () => {
    setStartedMinutesAgo(current === null ? 0 : Math.round((elapsedH * 60) / 5) * 5);
    setPanel({ kind: 'startTime' });
  };

  const openTarget = () => {
    setTargetDraft(current?.targetHours ?? chosenTarget);
    setPanel({ kind: 'target' });
  };

  /**
   * The start-time panel serves two flows, and which one is decided by whether
   * a fast is running rather than by two nearly identical sheets.
   *
   * Running: it corrects the start of the fast in progress. Idle: it starts a
   * new one, backdated. They are the same question — "when did you actually
   * stop eating" — and the same control, so they are the same panel.
   */
  const onSaveStartTime = () => {
    const startedAt = new Date(Date.now() - startedMinutesAgo * 60_000).toISOString();
    if (current === null) void onStart(startedAt);
    else void run('adjust', () => api.adjustFast({ startedAt }));
  };

  const fasts = summary?.recent ?? [];
  const visible = showAll ? fasts : fasts.slice(0, VISIBLE_FASTS);
  const stats = summary?.stats ?? null;

  /** A fast running far past what it was set to — almost always a forgotten timer. */
  const forgotten = current !== null && elapsedH > current.targetHours + STALE_AFTER_TARGET_H;

  /**
   * The plan options, which are the four presets unless the running fast is on
   * something else.
   *
   * Only reachable by a target set outside this app, and rare — but a
   * segmented control whose value matches none of its options highlights the
   * first one, and a screen quietly claiming somebody is on 16:8 when they are
   * on 14 is worse than an extra segment.
   */
  const planOptions = withCurrent(current?.targetHours ?? chosenTarget);

  return (
    <Screen scrollable>
      <Header
        title="Fasting"
        leading={{ icon: 'chevronLeft', onPress: () => navigation.goBack(), label: 'Back' }}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        /* Clears the docked action drawn over this, from its MEASURED height
           rather than a guess — the last row of the history has to be
           reachable, not parked underneath it. One gutter of daylight between
           the two. `dock` already includes the safe-area inset, which the bar
           adds to its own padding. */
        contentContainerStyle={{ paddingBottom: dock + space.gutter }}>
        <Gutter>
          {summary === null && failed === null ? (
            <Stack gap={space.lg} align="center">
              <Shimmer width={224} height={224} />
              <Shimmer width="100%" height={96} delay={140} />
            </Stack>
          ) : failed !== null && summary === null ? (
            <FailedToLoad kind={failed.kind} onRetry={() => void load()} />
          ) : (
            <Stack gap={space.lg}>
              {/* The clock. Centred and alone, because it is the screen. */}
              <Stack gap={space.lg} align="center">
                <FastingRing
                  progress={current === null ? null : elapsedH / current.targetHours}>
                  {current === null ? (
                    <>
                      <Txt role="h2" tone="secondary">
                        Not fasting
                      </Txt>
                      <Gap h={4} />
                      <Txt role="bodySm" tone="tertiary" style={{ textAlign: 'center' }}>
                        {fasts[0]
                          ? `Last one ${span(fasts[0].hours ?? 0)}`
                          : 'Start when you stop eating'}
                      </Txt>
                    </>
                  ) : (
                    <>
                      <Txt role="display" numeric>
                        {counter(elapsedH)}
                      </Txt>
                      <Txt role="caption" tone="secondary" numeric>
                        of {current.targetHours}h
                      </Txt>
                      <Gap h={6} />
                      {/* Overshoot in words rather than in colour — see the
                          comment in FastingRing on why amber is not spent
                          congratulating anybody. */}
                      <Txt
                        role="bodySm"
                        tone={remainingH > 0 ? 'tertiary' : 'primary'}
                        style={{ textAlign: 'center' }}>
                        {remainingH > 0
                          ? `${span(remainingH)} to go`
                          : `Target reached · ${span(-remainingH)} past`}
                      </Txt>
                    </>
                  )}
                </FastingRing>

                {/* The sentence a screen reader gets, in place of the six
                    fragments the ring is made of. */}
                <View
                  accessible
                  accessibilityRole="progressbar"
                  accessibilityLabel={
                    current === null
                      ? 'Not fasting'
                      : `Fasting ${span(elapsedH)} of ${current.targetHours} hours. ${
                          remainingH > 0 ? `${span(remainingH)} remaining.` : 'Target reached.'
                        }`
                  }
                  style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}
                />
              </Stack>

              {forgotten ? (
                <Notice
                  tone="attention"
                  icon="alert"
                  title="This has been running a long time"
                  detail={`${cap(span(elapsedH))} against a ${current!.targetHours}-hour target. If the timer was left on, throw this one away rather than recording a fast that did not happen — otherwise correct when it started, then end it.`}
                  action={{
                    label: 'Discard it',
                    onPress: () => void run('discard', () => api.discardFast(current!.id)),
                  }}
                />
              ) : null}

              {current === null ? (
                /* The picker, on the screen rather than behind a sheet.
                   Choosing the plan IS the start flow — there is nothing to
                   confirm and nothing else to fill in, so putting it a tap
                   away would add a step to the only thing this screen is for. */
                <Card>
                  <Stack gap={space.md}>
                    <Segmented
                      label="Plan"
                      options={planOptions.map(p => ({
                        value: String(p.hours),
                        label: p.label,
                      }))}
                      value={String(chosenTarget)}
                      onChange={v => setPlan(Number(v))}
                    />
                    <Txt role="bodySm" tone="secondary">
                      {detailFor(chosenTarget)}
                    </Txt>
                  </Stack>
                </Card>
              ) : (
                /* Running: the two facts that are not the clock, each a door to
                   the thing that changes it. A row that opens something wears a
                   chevron, as every other pressable row in this app does. */
                <Card padded={false}>
                  <FactRow
                    label="Started"
                    value={whenStarted(current.startedAt)}
                    onPress={openStartTime}
                    hint="Opens a control to correct when this fast began."
                  />
                  <Divider inset={space.xl} />
                  <FactRow
                    label={remainingH > 0 ? 'Finishes' : 'Finished'}
                    value={finishesAt === null ? DASH : whenStarted(new Date(finishesAt).toISOString())}
                    detail={labelFor(current.targetHours)}
                    onPress={openTarget}
                    hint="Opens a control to change the target without ending the fast."
                  />
                </Card>
              )}

              {/* The record. Three figures rather than four: the count of
                  finished fasts is already implied by "2 of 3 on target", and
                  a tally somebody can read off the line beside it is a figure
                  spending space to say nothing new. */}
              {stats !== null ? (
                <Card>
                  <Split align="flex-start">
                    <Figure label="Longest" value={span(stats.longestHours)} />
                    <Figure label="Average" value={span(stats.averageHours)} />
                    <Figure
                      label="On target"
                      value={`${stats.reached} of ${stats.completed}`}
                      detail={plural(stats.completed, 'fast')}
                    />
                  </Split>
                </Card>
              ) : null}

              {fasts.length > 0 ? (
                <Stack gap={space.sm}>
                  <Split align="center" style={{ minHeight: 24 }}>
                    <SectionLabel>Finished</SectionLabel>
                    {fasts.length > VISIBLE_FASTS ? (
                      <TextButton
                        label={showAll ? 'Show less' : 'View all'}
                        role="labelSm"
                        onPress={() => setShowAll(v => !v)}
                      />
                    ) : null}
                  </Split>

                  <Card padded={false}>
                    {visible.map((fast, i) => (
                      <View key={fast.id}>
                        {i > 0 ? <Divider inset={space.xl} /> : null}
                        <FastRow fast={fast} onPress={() => setPanel({ kind: 'fast', fast })} />
                      </View>
                    ))}
                  </Card>
                </Stack>
              ) : current === null && summary !== null ? (
                <Txt role="bodySm" tone="tertiary" style={{ textAlign: 'center' }}>
                  Nothing finished yet. A fast appears here once you end it.
                </Txt>
              ) : null}

              {/* Shown where the content is, not over it: the clock above is
                  still the clock, and only the write failed. */}
              {failed !== null && summary !== null ? (
                <Notice
                  tone={failed.kind === 'stale' ? 'attention' : 'danger'}
                  icon={failed.kind === 'stale' ? 'info' : 'alert'}
                  title={titleFor(failed)}
                  detail={detailForFailure(failed)}
                />
              ) : null}
            </Stack>
          )}
        </Gutter>
      </ScrollView>

      {/* The one action, docked.

          A bar rather than the weight screen's corner plus, because this
          button has two meanings — Start and End — and a circle holding a
          glyph cannot say which of them it is about to do. It is also the only
          control on the screen most visits will touch, which is the case a
          full-width target is for. */}
      {summary !== null ? (
        <View
          onLayout={e => setDock(e.nativeEvent.layout.height)}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            paddingHorizontal: space.gutter,
            paddingTop: space.md,
            paddingBottom: insets.bottom + space.md,
            backgroundColor: c.canvas,
          }}>
          {current === null ? (
            <Stack gap={space.xs} align="center">
              <Button
                label="Start fasting"
                icon="clock"
                onPress={() => void onStart()}
                loading={busy}
                haptic="commit"
              />
              {/* The escape hatch for the commonest correction there is: the
                  timer is remembered after the fact, not before. Quiet, under
                  the button, because starting now is still what nearly
                  everybody means. */}
              <TextButton label="I stopped eating earlier" role="labelSm" onPress={openStartTime} />
            </Stack>
          ) : (
            <Button
              label="End fast"
              variant={remainingH > 0 ? 'outline' : 'primary'}
              onPress={onEnd}
              loading={busy}
              haptic="commit"
            />
          )}
        </View>
      ) : null}

      {/*
        Panels, not routes — the same reasoning as the weight screen's sheet.
        Each one is a single decision taken against the clock behind it, and
        pushing a screen would put the figure being decided about behind a back
        button. Unmounted when closed, so a half-set time cannot survive.
      */}
      <Sheet
        visible={panel !== null}
        onDismiss={() => setPanel(null)}
        height={panel?.kind === 'fast' ? 0.45 : 0.55}
        tint
        // Not while a write is in flight: a swipe that closed this mid-save
        // would leave the button spinning on a panel nobody is looking at.
        dismissible={!busy}>
        <View style={{ flex: 1 }}>
          <Gap h={space.lg} />
          <Gutter>
            <PanelHeader title={panelTitle(panel, current !== null)} />
            <Gap h={space.xxl} />

            {panel?.kind === 'startTime' ? (
              <Stack gap={space.md}>
                <TimeShift
                  minutesAgo={startedMinutesAgo}
                  onChange={setStartedMinutesAgo}
                  now={now}
                />
                <Txt role="bodySm" tone="secondary">
                  {current === null
                    ? 'The fast is timed from here, so a start you set an hour back begins an hour in.'
                    : 'Moving the start redraws the clock. It does not change your target, and nothing else in the app is affected.'}
                </Txt>
              </Stack>
            ) : null}

            {panel?.kind === 'target' ? (
              <Stack gap={space.md}>
                <Segmented
                  label="Plan"
                  options={withCurrent(targetDraft).map(p => ({
                    value: String(p.hours),
                    label: p.label,
                  }))}
                  value={String(targetDraft)}
                  onChange={v => setTargetDraft(Number(v))}
                />
                <Txt role="bodySm" tone="secondary">
                  {detailFor(targetDraft)}. The time already served is kept — this moves the
                  finish line, it does not restart the clock.
                </Txt>
              </Stack>
            ) : null}

            {panel?.kind === 'endEarly' && current !== null ? (
              <Stack gap={space.md}>
                <Txt role="h2">{cap(span(elapsedH))} in</Txt>
                <Txt role="bodySm" tone="secondary">
                  {span(remainingH)} short of the {current.targetHours} hours you set. It is
                  recorded either way — a fast that fell short is still a fast, and the history
                  is worth more for holding both.
                </Txt>
              </Stack>
            ) : null}

            {panel?.kind === 'fast' ? (
              <Stack gap={space.md}>
                <Txt role="h2" numeric>
                  {span(panel.fast.hours ?? 0)}
                </Txt>
                <Stack gap={space.xs}>
                  <Split align="baseline">
                    <Txt role="bodySm" tone="secondary">
                      Started
                    </Txt>
                    <Txt role="labelSm" numeric>
                      {whenStarted(panel.fast.startedAt)}
                    </Txt>
                  </Split>
                  <Split align="baseline">
                    <Txt role="bodySm" tone="secondary">
                      Ended
                    </Txt>
                    <Txt role="labelSm" numeric>
                      {panel.fast.endedAt === null ? DASH : whenStarted(panel.fast.endedAt)}
                    </Txt>
                  </Split>
                  <Split align="baseline">
                    <Txt role="bodySm" tone="secondary">
                      Target
                    </Txt>
                    <Txt role="labelSm" numeric>
                      {labelFor(panel.fast.targetHours)} · {panel.fast.targetHours}h
                    </Txt>
                  </Split>
                </Stack>
                <Txt role="bodySm" tone="tertiary">
                  Discarding removes it from your history and your record. Nothing else in the
                  app is derived from a fast, so there is nothing else to put right.
                </Txt>
              </Stack>
            ) : null}
          </Gutter>

          <Spacer />

          {/* Padded here rather than wrapped in a Dock: the sheet has already
              added the bottom inset, and the two together push the button off
              the edge it is meant to sit on. */}
          <Gutter style={{ paddingTop: space.lg, paddingBottom: space.md }}>
            {panel?.kind === 'startTime' ? (
              <Button
                label={current === null ? 'Start from here' : 'Save'}
                onPress={onSaveStartTime}
                loading={busy}
                haptic="commit"
              />
            ) : panel?.kind === 'target' ? (
              <Button
                label="Save"
                onPress={() => void run('adjust', () => api.adjustFast({ targetHours: targetDraft }))}
                loading={busy}
                haptic="commit"
              />
            ) : panel?.kind === 'endEarly' ? (
              <Button
                label="End it anyway"
                onPress={() => void run('end', () => api.endFast())}
                loading={busy}
                haptic="commit"
              />
            ) : panel?.kind === 'fast' ? (
              <Button
                label="Discard"
                variant="danger"
                onPress={() => void run('discard', () => api.discardFast(panel.fast.id))}
                loading={busy}
                haptic="commit"
              />
            ) : null}
          </Gutter>
        </View>
      </Sheet>
    </Screen>
  );
}

/**
 * A clock that ticks only while something is running.
 *
 * Recomputed from `Date.now()` on every tick rather than incremented, and
 * re-read whenever the app comes back to the foreground. React Native throttles
 * timers in the background, so a counter that added a second per tick would
 * come back from a two-hour phone call showing eleven minutes.
 */
function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = setInterval(() => {
      if (alive.current) setNow(Date.now());
    }, 1000);
    const sub = RNAppState.addEventListener('change', state => {
      if (state === 'active' && alive.current) setNow(Date.now());
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [active]);

  return now;
}

/** One of the three figures in the record. */
function Figure({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <Stack gap={3} style={{ flexGrow: 1, flexBasis: 0 }}>
      <Txt role="caption" tone="tertiary">
        {label}
      </Txt>
      <Txt role="h2" numeric>
        {value}
      </Txt>
      {detail ? (
        <Txt role="caption" tone="tertiary">
          {detail}
        </Txt>
      ) : null}
    </Stack>
  );
}

/** A labelled fact that opens something. */
function FactRow({
  label,
  value,
  detail,
  onPress,
  hint,
}: {
  label: string;
  value: string;
  detail?: string;
  onPress: () => void;
  hint: string;
}) {
  const { c, space } = useTheme();
  return (
    <Press
      onPress={onPress}
      feedback="fade"
      haptic="select"
      accessibilityLabel={`${label}, ${value}`}
      accessibilityHint={hint}
      style={{ paddingHorizontal: space.xl, paddingVertical: space.md }}>
      <Row gap={space.md} align="center">
        <Txt role="body" tone="secondary" style={{ flexGrow: 1, flexShrink: 1 }}>
          {label}
        </Txt>
        {detail ? (
          <Txt role="caption" tone="tertiary">
            {detail}
          </Txt>
        ) : null}
        <Txt role="labelSm" numeric>
          {value}
        </Txt>
        <Icon name="chevronRight" size={17} color={c.inkTertiary} />
      </Row>
    </Press>
  );
}

/**
 * One finished fast.
 *
 * The duration is the subject and the target is the annotation, not the other
 * way round: what somebody checks on this list is how long they went, and
 * whether it cleared the line they had drawn. A tick rather than a word for
 * the second, because it is the same answer on every row and a column of the
 * word "reached" is a column nobody reads twice.
 */
function FastRow({ fast, onPress }: { fast: Fast; onPress: () => void }) {
  const { c, space } = useTheme();
  return (
    <Press
      onPress={onPress}
      feedback="fade"
      haptic="select"
      accessibilityLabel={`${whenStarted(fast.startedAt)}, ${span(fast.hours ?? 0)}, ${
        fast.reachedTarget ? 'reached' : 'short of'
      } a ${fast.targetHours} hour target`}
      accessibilityHint="Opens this fast, with the option to discard it."
      style={{ paddingHorizontal: space.xl, paddingVertical: space.md }}>
      <Row gap={space.md} align="center">
        <Stack gap={2} style={{ flexGrow: 1, flexShrink: 1 }}>
          <Txt role="body">{whenStarted(fast.startedAt)}</Txt>
          <Txt role="caption" tone="tertiary" numeric>
            {labelFor(fast.targetHours)} · target {fast.targetHours}h
          </Txt>
        </Stack>

        {fast.reachedTarget ? (
          <Icon name="check" size={16} color={c.primary} weight={2.4} />
        ) : null}

        <Txt role="labelSm" numeric tone={fast.reachedTarget ? 'ink' : 'secondary'}>
          {span(fast.hours ?? 0)}
        </Txt>

        <Icon name="chevronRight" size={17} color={c.inkTertiary} />
      </Row>
    </Press>
  );
}

/**
 * The start-time control: a clock face with a nudge on each side.
 *
 * Not a `Stepper`, and the reason is what is being set. A stepper's subject is
 * its number, which works for a weight because the weight IS the number
 * somebody read off a scale. Here the number would be "195 minutes ago", which
 * nobody has ever thought; what they know is that they stopped eating at about
 * eight. So the time of day is the figure, in quarter-hour steps, with the
 * relative distance as the caption under it.
 */
function TimeShift({
  minutesAgo,
  onChange,
  now,
}: {
  minutesAgo: number;
  onChange: (v: number) => void;
  now: number;
}) {
  const { c, radius, space } = useTheme();
  const at = new Date(now - minutesAgo * 60_000);
  const max = FASTING_BACKDATE_MAX_HOURS * 60;

  const shift = (by: number) => onChange(Math.min(max, Math.max(0, minutesAgo + by)));

  return (
    <Card>
      <Split align="center">
        <Stack gap={3} style={{ flexShrink: 1 }}>
          <Txt role="labelSm" tone="secondary" caps style={{ letterSpacing: 1.1 }}>
            Started
          </Txt>
          <Txt role="h1" numeric>
            {clockTime(at.toISOString())}
          </Txt>
          <Txt role="caption" tone="tertiary">
            {minutesAgo === 0 ? 'just now' : `${span(minutesAgo / 60)} ago`}
            {isToday(at) ? '' : ` · ${dayMonth(at)}`}
          </Txt>
        </Stack>

        <Row gap={space.md}>
          {/* Earlier on the left, later on the right — the direction time runs
              on every chart in this app. The minus moves the start back, which
              makes the fast longer; that is the commoner correction, and it is
              the one under the thumb that is already there. */}
          <Nudge
            dir={-1}
            disabled={minutesAgo >= max}
            onPress={() => shift(15)}
            label="Move the start earlier"
          />
          <Nudge
            dir={1}
            disabled={minutesAgo <= 0}
            onPress={() => shift(-15)}
            label="Move the start later"
          />
        </Row>
      </Split>
    </Card>
  );
}

/**
 * A ± target, drawn to match `Stepper`'s.
 *
 * Copied in shape rather than imported, because `Stepper`'s own is private to
 * it and carries a press-and-hold repeat this control does not want: fifteen
 * minutes a tap over a three-day range is at most a few taps, and a runaway
 * repeat on a time would overshoot the moment somebody was aiming at.
 */
function Nudge({
  dir,
  disabled,
  onPress,
  label,
}: {
  dir: -1 | 1;
  disabled: boolean;
  onPress: () => void;
  label: string;
}) {
  const { c, radius } = useTheme();
  return (
    <Press
      onPress={onPress}
      disabled={disabled}
      haptic="select"
      accessibilityLabel={label}
      style={{
        width: 48,
        height: 48,
        borderRadius: radius.pill,
        backgroundColor: c.sunken,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      {dir > 0 ? (
        <Icon name="plus" size={20} color={disabled ? c.inkTertiary : c.ink} weight={2.4} />
      ) : (
        // A minus glyph would be the only 1px-tall icon in the set — the same
        // reason Stepper draws its own.
        <View
          style={{
            width: 18,
            height: 2.4,
            borderRadius: 2,
            backgroundColor: disabled ? c.inkTertiary : c.ink,
          }}
        />
      )}
    </Press>
  );
}

/** The panel's chip-and-caps header, the one AskSheet and the weight sheet wear. */
function PanelHeader({ title }: { title: string }) {
  const { c, radius, space } = useTheme();
  return (
    <Row gap={space.sm} align="center">
      <View
        style={{
          width: 26,
          height: 26,
          borderRadius: radius.pill,
          backgroundColor: c.primarySoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Icon name="clock" size={14} color={c.primarySoftInk} weight={2} />
      </View>
      <Txt
        role="labelSm"
        tone="secondary"
        caps
        accessibilityRole="header"
        style={{ letterSpacing: 1.4, flexShrink: 1 }}>
        {title}
      </Txt>
    </Row>
  );
}

function FailedToLoad({
  kind,
  onRetry,
}: {
  kind: Failure['kind'];
  onRetry: () => void;
}) {
  const { space } = useTheme();
  return (
    <Stack gap={space.lg} style={{ paddingTop: space.huge }}>
      <Notice
        tone={kind === 'offline' ? 'attention' : 'danger'}
        icon={kind === 'offline' ? 'offline' : 'alert'}
        title="Could not load your fasting"
        detail={
          kind === 'offline'
            ? 'A fast is a single running thing and the server is the only copy of it, so this screen needs a connection. Everything else — logging, search, your day — keeps working offline.'
            : 'The server could not answer, and the app cannot tell you why. Nothing about your fasting has been lost.'
        }
        action={{ label: 'Try again', onPress: onRetry }}
      />
    </Stack>
  );
}

/**
 * What went wrong, and during what.
 *
 * The verb is carried for the reason the weight screen carries one: the same
 * failure means different things depending on what was pressed, and "that did
 * not save" is a lie about an end that did not happen.
 */
type Failure = {
  kind: 'offline' | 'stale' | 'server';
  verb: 'load' | 'start' | 'end' | 'adjust' | 'discard';
};

/**
 * Which kind of failure it was.
 *
 * 'stale' is the one worth separating out here. A 404 means the fast this
 * screen is describing is no longer running and a 409 means one already is —
 * both of which happen when the same account is open somewhere else, and
 * neither of which is a fault. Reporting them as errors would tell somebody to
 * fix something that is not broken.
 */
function kindOf(error: unknown): Failure['kind'] {
  if (error instanceof OfflineError) return 'offline';
  if (error instanceof ApiError && (error.problem.status === 404 || error.problem.status === 409)) {
    return 'stale';
  }
  return 'server';
}

const VERBS: Record<Failure['verb'], string> = {
  load: 'load',
  start: 'start',
  end: 'end',
  adjust: 'change',
  discard: 'discard',
};

function titleFor(failure: Failure): string {
  if (failure.kind === 'stale') return 'This screen was out of date';
  return `That did not ${VERBS[failure.verb]}`;
}

function detailForFailure(failure: Failure): string {
  if (failure.kind === 'stale') {
    return 'Your fasting had already changed somewhere else — another device, or another tab of this one. Nothing was lost; what you see now is what the server holds.';
  }
  if (failure.kind === 'offline') {
    return 'Nothing changed — the device is offline. What is on screen is what the server last confirmed.';
  }
  return 'Nothing changed; the server refused it. What is on screen is what the server last confirmed.';
}

function panelTitle(panel: Panel | null, running: boolean): string {
  switch (panel?.kind) {
    case 'startTime':
      return running ? 'Correct the start' : 'When did you stop eating?';
    case 'target':
      return 'Change the target';
    case 'endEarly':
      return 'End early?';
    case 'fast':
      return 'This fast';
    default:
      return '';
  }
}

/**
 * The presets, plus the current target when it is not one of them.
 *
 * Only reachable by a target set outside this app, and rare — but a segmented
 * control whose value matches none of its options silently highlights the
 * first, and a screen claiming somebody is on 16:8 when they are on 14 is
 * worse than one extra segment.
 */
function withCurrent(hours: number): ReadonlyArray<{ hours: number; label: string; detail: string }> {
  if (FASTING_PLANS.some(p => p.hours === hours)) return FASTING_PLANS;
  return [{ hours, label: `${hours}h`, detail: `A ${hours}-hour fast` }, ...FASTING_PLANS];
}

function labelFor(hours: number): string {
  return FASTING_PLANS.find(p => p.hours === hours)?.label ?? `${hours}h`;
}

function detailFor(hours: number): string {
  return FASTING_PLANS.find(p => p.hours === hours)?.detail ?? `A ${hours}-hour fast`;
}

/**
 * The running clock: "14:32:07".
 *
 * Seconds, and deliberately. Everywhere else in this app a duration is rounded
 * to something readable, because nobody needs a meal logged to the second —
 * but the seconds are most of why anybody opens a fasting timer, and a figure
 * that sat still for a minute at a time would not read as running at all.
 */
function counter(hours: number): string {
  const total = Math.max(0, Math.floor(hours * 3600));
  const p = (n: number) => String(n).padStart(2, '0');
  return `${Math.floor(total / 3600)}:${p(Math.floor((total % 3600) / 60))}:${p(total % 60)}`;
}

/**
 * A length in words: "17h 12m", "45m", "1h".
 *
 * Used for everything that is not the live clock — a finished fast, a
 * remainder, an overshoot. Whole minutes, because a completed fast measured to
 * the second is precision about a moment somebody estimated anyway.
 */
function span(hours: number): string {
  const minutes = Math.max(0, Math.round(hours * 60));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** "20:04" today, "20:04 · 25 Aug" on any other day. */
function whenStarted(iso: string): string {
  const at = new Date(iso);
  return isToday(at) ? clockTime(iso) : `${clockTime(iso)} · ${dayMonth(at)}`;
}

function isToday(d: Date): boolean {
  return localDate(d) === localDate();
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
