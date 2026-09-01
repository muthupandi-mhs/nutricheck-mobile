import React, { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useApi } from '../../api/client';
import type { WeekSummary } from '../../api/types';
import { IconButton } from '../../components/Button';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/Feedback';
import { Divider, Gap, Gutter, Row, Split, Stack } from '../../components/Layout';
import { Header, Screen } from '../../components/Screen';
import { Shimmer } from '../../components/Skeleton';
import { SectionLabel, Txt } from '../../components/Text';
import { addDays, dayMonth, grams, kcal, localDate, parseLocalDate, plural } from '../../lib/format';
import { useTheme } from '../../theme/ThemeProvider';
import { ChartLegend, WeekChart } from './WeekChart';
import type { TabScreenProps } from '../../navigation/types';

/**
 * Insights. Averages cover logged days only — including an unrecorded day turns
 * "you forgot on Sunday" into "you undershot by 300 kcal", a fact about the
 * app's completeness misreported as one about the diet. The row underneath
 * names the days counted, so the number is auditable.
 */
export function InsightsScreen({ navigation }: TabScreenProps<'Insights'>) {
  const { c, space } = useTheme();
  const api = useApi();

  const [endingOn, setEndingOn] = useState(localDate());
  const [week, setWeek] = useState<WeekSummary | null>(null);

  useEffect(() => {
    let alive = true;
    setWeek(null);
    // Offline leaves `week` null, which this screen already renders as its
    // empty state. An uncaught rejection here put a red box over it instead.
    api.getWeek(endingOn)
      .then(w => alive && setWeek(w))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [api, endingOn]);

  const isCurrent = endingOn === localDate();
  // "26 Aug", not "2026-08-26". The eyebrow printed the raw wire date, which is
  // the one format nobody reads a week in.
  const weekLabel = isCurrent ? 'Last 7 days' : `Week to ${dayMonth(parseLocalDate(endingOn))}`;
  const loggedDays = week?.days.filter(d => d.logged).length ?? 0;

  const delta = (avg: number, target: number, unit: 'kcal' | 'g') => {
    const d = Math.round(avg - target);
    const tolerance = unit === 'kcal' ? 25 : 3;
    if (Math.abs(d) < tolerance) return { text: 'on target', tone: 'primary' as const };
    if (d < 0)
      return {
        text: `${Math.abs(d)} ${unit === 'kcal' ? 'under' : 'short'}`,
        tone: unit === 'kcal' ? ('primary' as const) : ('attention' as const),
      };
    return {
      text: `${d} over`,
      tone: unit === 'kcal' ? ('attention' as const) : ('primary' as const),
    };
  };

  return (
    <Screen scrollable>
      <Header
        title="Insights"
        actions={[
          { icon: 'chevronLeft', onPress: () => setEndingOn(d => addDays(d, -7)), label: 'Previous week' },
          ...(isCurrent
            ? []
            : [{ icon: 'chevronRight' as const, onPress: () => setEndingOn(d => addDays(d, 7)), label: 'Next week' }]),
        ]}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: space.huge }}>
        {week === null ? (
          <Gutter>
            <Stack gap={space.md}>
              <Shimmer width="100%" height={120} />
              <Shimmer width="100%" height={200} delay={140} />
            </Stack>
          </Gutter>
        ) : loggedDays === 0 ? (
          <EmptyState
            icon="chart"
            title="Nothing to compare yet"
            detail="Trends need a few days behind them. Log today and this fills in on its own — there is nothing to set up."
            action={{ label: 'Back to home', onPress: () => navigation.navigate('Home') }}
          />
        ) : (
          <Gutter>
            <Stack gap={space.lg}>
              <Card>
                {/* Which week this is.

                    It was the header's eyebrow, and it is the one thing on this
                    screen that CANNOT be dropped when the header goes down to a
                    single title: the arrows page backwards through the year, and
                    without this the only way to tell which week you are looking
                    at is to recognise the bars. */}
                <SectionLabel>{weekLabel}</SectionLabel>
                <Gap h={space.md} />
                <Split align="flex-start">
                  {[
                    { label: 'Calories', value: kcal(week.averages.kcal), unit: '', d: delta(week.averages.kcal, week.goal.kcal, 'kcal') },
                    { label: 'Protein', value: grams(week.averages.proteinG), unit: 'g', d: delta(week.averages.proteinG, week.goal.proteinG, 'g') },
                    { label: 'Fibre', value: grams(week.averages.fiberG), unit: 'g', d: delta(week.averages.fiberG, week.goal.fiberG, 'g') },
                  ].map(stat => (
                    <Stack key={stat.label} gap={3} style={{ flexGrow: 1, flexBasis: 0 }}>
                      <Txt role="caption" tone="tertiary">
                        {stat.label}
                      </Txt>
                      <Row gap={2} align="baseline">
                        <Txt role="h2" numeric>
                          {stat.value}
                        </Txt>
                        {stat.unit ? (
                          <Txt role="bodySm" tone="secondary">
                            {stat.unit}
                          </Txt>
                        ) : null}
                      </Row>
                      <Txt role="caption" tone={stat.d.tone}>
                        {stat.d.text}
                      </Txt>
                    </Stack>
                  ))}
                </Split>

                <Gap h={space.lg} />
                <Divider />
                <Gap h={space.md} />

                <Txt role="caption" tone="tertiary">
                  Daily average over the {plural(loggedDays, 'day')} you logged, not all seven.
                </Txt>
              </Card>

              <Card>
                <Stack gap={space.xl}>
                  <ChartLegend />
                  <WeekChart
                    label="Calories"
                    target={week.goal.kcal}
                    targetLabel={`target ${kcal(week.goal.kcal)}`}
                    bars={week.days.map(d => ({ date: d.date, value: d.kcal, logged: d.logged }))}
                  />
                  <Divider />
                  <WeekChart
                    label="Protein"
                    target={week.goal.proteinG}
                    targetLabel={`target ${week.goal.proteinG} g`}
                    bars={week.days.map(d => ({ date: d.date, value: d.proteinG, logged: d.logged }))}
                  />
                  <Divider />
                  <WeekChart
                    label="Fibre"
                    target={week.goal.fiberG}
                    targetLabel={`target ${week.goal.fiberG} g`}
                    bars={week.days.map(d => ({ date: d.date, value: d.fiberG, logged: d.logged }))}
                  />
                </Stack>
              </Card>

              <Card fill="primarySoft">
                <Split align="center">
                  <Stack gap={4} style={{ flexShrink: 1 }}>
                    <SectionLabel tone="primary">Streak</SectionLabel>
                    <Row gap={6} align="baseline">
                      <Txt role="h1" numeric>
                        {week.streakDays}
                      </Txt>
                      <Txt role="body" tone="secondary">
                        {week.streakDays === 1 ? 'day' : 'days'} in a row
                      </Txt>
                    </Row>
                    <Txt role="bodySm" tone="secondary">
                      Counted back from today. Missing a day resets it — and it does not punish you anywhere
                      else in the app.
                    </Txt>
                  </Stack>
                  <View style={{ paddingLeft: space.md }}>
                    <IconButton name="flame" size={26} color={c.primary} accessibilityLabel="Streak" />
                  </View>
                </Split>
              </Card>
            </Stack>
          </Gutter>
        )}
      </ScrollView>
    </Screen>
  );
}
