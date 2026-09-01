import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useApi } from '../../api/client';
import type { DayPoint, MonthSummary } from '../../api/types';
import { Card } from '../../components/Card';
import { Divider, Gutter, Row, Split, Stack } from '../../components/Layout';
import { IconButton } from '../../components/Button';
import { Press } from '../../components/Press';
import { Header, Screen } from '../../components/Screen';
import { Shimmer } from '../../components/Skeleton';
import { SectionLabel, Txt } from '../../components/Text';
import { DASH, kcal, localDate, parseLocalDate, plural } from '../../lib/format';
import { useTheme } from '../../theme/ThemeProvider';
import { useAppState } from '../../state/AppState';
import { adherenceOf, bandOf, BAND_LABEL, BAND_RANGE, type Band } from './adherence';
import type { ScreenProps } from '../../navigation/types';

const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * The history calendar, behind Home's masthead.
 *
 * One month at a time, every day coloured by how close it landed to its calorie
 * target. Tapping a day sets the date the whole app is looking at and returns
 * to Home — the app already had that state (`AppState.date`), it simply had no
 * control that could reach it, so every day but today was unreachable.
 *
 * **The colour means closeness, not completion** — see `adherence.ts`. Copying
 * the usual "more is greener" scale would have painted somebody's worst
 * overshoot as their best day.
 *
 * Days with nothing logged are left uncoloured rather than scored zero. A day
 * you did not track is not a day you ate nothing, and the two must not look
 * alike on a grid somebody reads for a streak.
 */
export function CalendarScreen({ navigation }: ScreenProps<'Calendar'>) {
  const { space } = useTheme();
  const api = useApi();
  const { date, setDate } = useAppState();

  /** Any day inside the month on screen. The server snaps to its boundaries. */
  const [anchor, setAnchor] = useState(date || localDate());
  const [month, setMonth] = useState<MonthSummary | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();

    setMonth(null);
    setFailed(false);

    api
      .getMonth(anchor, controller.signal)
      .then(m => alive && setMonth(m))
      .catch(() => {
        // Aborting a superseded month fires this too. Harmless: the next
        // effect has already cleared the flag it would set.
        if (alive) setFailed(true);
      });

    return () => {
      alive = false;
      controller.abort();
    };
  }, [api, anchor]);

  const today = localDate();
  const shown = parseLocalDate(anchor);
  const isThisMonth = anchor.slice(0, 7) === today.slice(0, 7);

  const onPick = (day: string) => {
    setDate(day);
    navigation.navigate('Main');
  };

  return (
    <Screen scrollable>
      <Header
        leading={{ icon: 'chevronLeft', onPress: () => navigation.goBack(), label: 'Back' }}
        title="Calendar"
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: space.huge }}>
        <Gutter>
          <Stack gap={space.lg}>
            <Card>
              <Stack gap={space.lg}>
                {/* Month, with an arrow at each end. Forward is hidden on the
                    current month rather than disabled — there is nothing to
                    look at in the future, and a dead control invites the tap
                    that proves it is dead. */}
                <Split align="center">
                  <IconButton
                    name="chevronLeft"
                    onPress={() => setAnchor(a => shiftMonth(a, -1))}
                    accessibilityLabel="Previous month"
                  />
                  <Txt role="h3" accessibilityRole="header">
                    {MONTHS[shown.getMonth()]} {shown.getFullYear()}
                  </Txt>
                  {isThisMonth ? (
                    // Holds the arrow's width so the title stays centred.
                    <View style={{ width: 44 }} />
                  ) : (
                    <IconButton
                      name="chevronRight"
                      onPress={() => setAnchor(a => shiftMonth(a, 1))}
                      accessibilityLabel="Next month"
                    />
                  )}
                </Split>

                <Row justify="space-around">
                  {WEEKDAY_INITIALS.map((initial, i) => (
                    <Txt
                      key={`${initial}-${i}`}
                      role="caption"
                      tone="tertiary"
                      style={{ width: 34, textAlign: 'center' }}>
                      {initial}
                    </Txt>
                  ))}
                </Row>

                {month === null ? (
                  <Stack gap={space.sm}>
                    {[0, 1, 2, 3, 4].map(i => (
                      <Shimmer key={i} width="100%" height={34} delay={i * 70} />
                    ))}
                  </Stack>
                ) : (
                  <MonthGrid
                    month={month}
                    today={today}
                    selected={date}
                    onPick={onPick}
                  />
                )}
              </Stack>
            </Card>

            {failed ? (
              <Txt role="bodySm" tone="secondary">
                That month could not be loaded. The arrows still work, and nothing about your day is affected.
              </Txt>
            ) : null}

            <Legend />

            {month && !failed ? (
              <Txt role="caption" tone="tertiary">
                {summaryLine(month)}
              </Txt>
            ) : null}
          </Stack>
        </Gutter>
      </ScrollView>
    </Screen>
  );
}

/**
 * The line under the grid.
 *
 * Three cases, and the third is why this is a function. A month that ends
 * before the user's first goal comes back with `goal.kcal` of 0 — real, and
 * easy to hit by paging back a few months — and the obvious sentence would
 * then read "measured against a target of 0 kcal", which is both nonsense and
 * an accusation. Those days are uncoloured for the same reason: there is no
 * target to have missed.
 */
function summaryLine(month: MonthSummary): string {
  if (month.loggedDays === 0) return 'Nothing logged this month.';

  if (month.goal.kcal <= 0) {
    return `${plural(month.loggedDays, 'day')} logged this month. No target was set then, so nothing is coloured.`;
  }

  return `${plural(month.loggedDays, 'day')} logged this month, measured against a target of ${kcal(
    month.goal.kcal,
  )} kcal.`;
}

/**
 * The grid.
 *
 * Laid out by absolute weekday position, not by wrapping the days in order: the
 * first of the month has to sit under its own weekday column, so the row begins
 * with blanks. Wrapping without them shifts every date in the month by up to
 * six columns, which looks plausible and is wrong.
 */
function MonthGrid({
  month,
  today,
  selected,
  onPick,
}: {
  month: MonthSummary;
  today: string;
  selected: string;
  onPick: (day: string) => void;
}) {
  const { space } = useTheme();

  const cells = useMemo(() => {
    const leadingBlanks = parseLocalDate(month.from).getDay();
    return [
      ...Array.from({ length: leadingBlanks }, () => null),
      ...month.days,
    ] as Array<DayPoint | null>;
  }, [month]);

  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: space.sm }}>
      {cells.map((day, i) => (
        <View key={day?.date ?? `blank-${i}`} style={{ width: `${100 / 7}%`, alignItems: 'center' }}>
          {day === null ? (
            <View style={{ height: 38 }} />
          ) : (
            <DayCell
              day={day}
              targetKcal={month.goal.kcal}
              isToday={day.date === today}
              isSelected={day.date === selected}
              isFuture={day.date > today}
              onPick={onPick}
            />
          )}
        </View>
      ))}
    </View>
  );
}

function DayCell({
  day,
  targetKcal,
  isToday,
  isSelected,
  isFuture,
  onPick,
}: {
  day: DayPoint;
  targetKcal: number;
  isToday: boolean;
  isSelected: boolean;
  isFuture: boolean;
  onPick: (day: string) => void;
}) {
  const { c, radius } = useTheme();
  const band = bandOf(adherenceOf(day, targetKcal));
  const dayNumber = Number(day.date.slice(8));

  const tint = bandColour(band, c);

  return (
    <Press
      onPress={() => onPick(day.date)}
      // A day that has not happened cannot be reviewed. Disabled rather than
      // hidden: the grid must keep its shape to stay readable.
      disabled={isFuture}
      feedback="none"
      haptic="select"
      accessibilityLabel={accessibilityFor(day, band, isToday)}
      accessibilityState={{ selected: isSelected, disabled: isFuture }}
      style={{
        width: 38,
        height: 38,
        borderRadius: radius.pill,
        alignItems: 'center',
        justifyContent: 'center',
        // Selection is a filled ring, matching how the rest of the app marks a
        // chosen thing. Today gets an outline instead, so "where I am" and
        // "what I picked" never collapse into one mark.
        backgroundColor: isSelected ? c.ink : 'transparent',
        borderWidth: isToday && !isSelected ? 1.5 : 0,
        borderColor: c.borderStrong,
        opacity: isFuture ? 0.28 : 1,
      }}>
      <Txt
        role="labelSm"
        numeric
        color={isSelected ? c.canvas : tint}>
        {dayNumber}
      </Txt>
    </Press>
  );
}

/**
 * The legend: the colour, what it means, and where the band actually starts.
 *
 * Required, not decoration. Three coloured numbers with nothing explaining them
 * is a code the reader has to break, and the natural guess — that green means
 * "more" — is the one reading this scale does not have. The percentage is what
 * makes each row checkable rather than merely reassuring: "Close" is an opinion
 * until it says 15–40% off.
 *
 * One row per band rather than a wrapped strip of dots. Four labels and four
 * ranges on one line wrap into a shape where it stops being obvious which range
 * belongs to which colour, which is worse than no ranges at all.
 */
function Legend() {
  const { c, space } = useTheme();

  const rows: Array<{ key: string; colour: string; label: string; range: string }> = [
    ...(['on', 'near', 'off'] as const).map(band => ({
      key: band,
      colour: bandColour(band, c),
      label: BAND_LABEL[band],
      range: BAND_RANGE[band],
    })),
    // No range, and a dash rather than "0%": a day nobody logged has no
    // distance from target, and printing one would be scoring it.
    { key: 'none', colour: c.inkTertiary, label: 'Not logged', range: DASH },
  ];

  return (
    <Card fill="sunken">
      <Stack gap={space.md}>
        <SectionLabel>What the colours mean</SectionLabel>
        <Stack gap={space.sm}>
          {rows.map(row => (
            <Split key={row.key} align="center">
              <Row gap={space.sm} align="center">
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: row.colour,
                  }}
                />
                <Txt role="caption" tone="secondary">
                  {row.label}
                </Txt>
              </Row>
              <Txt role="caption" tone="tertiary" numeric>
                {row.range}
              </Txt>
            </Split>
          ))}
        </Stack>
        <Divider />
        <Txt role="caption" tone="tertiary">
          Distance from the calorie target in effect that month, in either direction — a day well over reads the
          same as one well under, because neither is the day you were aiming for.
        </Txt>
      </Stack>
    </Card>
  );
}

/**
 * Band → colour.
 *
 * Reuses the palette's own semantic tokens rather than raw green and red. The
 * app has exactly one colour that means "good" and one that means "look at
 * this", and a calendar inventing its own pair would be a second vocabulary for
 * the same idea.
 */
function bandColour(band: Band, c: ReturnType<typeof useTheme>['c']): string {
  switch (band) {
    case 'on':
      return c.primary;
    case 'near':
      return c.attention;
    case 'off':
      return c.danger;
    default:
      return c.inkTertiary;
  }
}

/**
 * What a screen reader says for one cell.
 *
 * Spelled out because the colour carries the whole meaning visually, and a
 * label of just the number would leave a screen-reader user with a grid of
 * dates and no information in it at all.
 */
function accessibilityFor(day: DayPoint, band: Band, isToday: boolean): string {
  const d = parseLocalDate(day.date);
  const when = `${d.getDate()} ${MONTHS[d.getMonth()]}${isToday ? ', today' : ''}`;
  if (band === 'none') return `${when}, nothing logged`;
  return `${when}, ${kcal(day.kcal)} calories, ${BAND_LABEL[band].toLowerCase()}, ${BAND_RANGE[band]}`;
}

/**
 * Move the anchor by whole months, clamping the day.
 *
 * The clamp is the reason this is not `addMonths` on a Date: 31 March minus one
 * month is 31 February, which JavaScript rolls forward to 3 March — so paging
 * back from a 31-day month would skip February entirely.
 */
function shiftMonth(anchor: string, delta: number): string {
  const [year, month] = anchor.split('-').map(Number);
  const shifted = new Date(year, month - 1 + delta, 1);
  return localDate(shifted);
}
