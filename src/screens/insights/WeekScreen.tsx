import React, { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useApi } from '../../api/client';
import type { WeekSummary } from '../../api/types';
import { EmptyState } from '../../components/Banner';
import { IconButton, SecondaryButton } from '../../components/Button';
import { Divider, Gap, Gutter, Row, SplitRow } from '../../components/Layout';
import { Masthead, Screen } from '../../components/Screen';
import { Shimmer } from '../../components/Skeleton';
import { Body, Display, Eyebrow, Mono } from '../../components/Type';
import { addDays, grams, kcal, localDate, plural } from '../../lib/format';
import { useTheme } from '../../theme/ThemeProvider';
import { ChartLegend, WeekChart } from './WeekChart';
import type { ScreenProps } from '../../navigation/types';

/**
 * The week.
 *
 * Averages are computed over *logged* days only. Including a day nobody
 * recorded would drag the average toward zero and turn "you forgot on Sunday"
 * into "you undershot by 300 kcal" — a fact about the app's completeness
 * misreported as a fact about the user's diet.
 */
export function WeekScreen({ navigation }: ScreenProps<'Week'>) {
  const { c, space } = useTheme();
  const api = useApi();

  const [endingOn, setEndingOn] = useState(localDate());
  const [week, setWeek] = useState<WeekSummary | null>(null);

  useEffect(() => {
    let alive = true;
    setWeek(null);
    api.getWeek(endingOn).then(w => alive && setWeek(w));
    return () => {
      alive = false;
    };
  }, [api, endingOn]);

  const isCurrentWeek = endingOn === localDate();

  const deltaLine = (avg: number, target: number, unit: string) => {
    const d = Math.round(avg - target);
    if (Math.abs(d) < (unit === 'kcal' ? 25 : 3)) return { text: 'on target', tone: 'det' as const };
    return d < 0
      ? { text: `${Math.abs(d)} ${unit === 'kcal' ? 'under' : 'short'}`, tone: unit === 'kcal' ? ('det' as const) : ('est' as const) }
      : { text: `${d} over`, tone: unit === 'kcal' ? ('est' as const) : ('det' as const) };
  };

  const loggedDays = week?.days.filter(d => d.logged).length ?? 0;

  return (
    <Screen edges="top">
      <Masthead
        eyebrow={isCurrentWeek ? 'LAST 7 DAYS' : `WEEK TO ${endingOn}`}
        title="Your week"
        titleSize={28}
        actions={[
          { icon: 'chevronLeft', onPress: () => setEndingOn(d => addDays(d, -7)), label: 'Previous week' },
          ...(isCurrentWeek
            ? []
            : [{ icon: 'chevronRight' as const, onPress: () => setEndingOn(d => addDays(d, 7)), label: 'Next week' }]),
        ]}
      />

      <ScrollView contentContainerStyle={{ paddingBottom: space.xxl }}>
        {week === null ? (
          <Gutter style={{ paddingTop: space.lg, gap: space.md }}>
            <Shimmer width="80%" height={26} />
            <Shimmer width="55%" height={14} delay={140} />
            <Gap h={space.sm} />
            <Shimmer width="100%" height={60} delay={280} />
            <Shimmer width="100%" height={60} delay={420} />
          </Gutter>
        ) : loggedDays === 0 ? (
          <EmptyState
            title="Nothing to compare yet"
            detail="Trends need a few days behind them. Log today and this fills in on its own — there is nothing to set up.">
            <SecondaryButton label="Back to today" onPress={() => navigation.navigate('Home')} />
          </EmptyState>
        ) : (
          <>
            <Gutter style={{ paddingTop: space.lg, paddingBottom: 15 }}>
              <Row gap={18}>
                {[
                  { label: 'AVG KCAL', value: kcal(week.averages.kcal), delta: deltaLine(week.averages.kcal, week.goal.kcal, 'kcal') },
                  { label: 'AVG PROTEIN', value: grams(week.averages.proteinG), unit: 'g', delta: deltaLine(week.averages.proteinG, week.goal.proteinG, 'g') },
                  { label: 'AVG FIBER', value: grams(week.averages.fiberG), unit: 'g', delta: deltaLine(week.averages.fiberG, week.goal.fiberG, 'g') },
                ].map(stat => (
                  <View key={stat.label} style={{ gap: 2 }}>
                    <Eyebrow size={9.5} tone="ink2">
                      {stat.label}
                    </Eyebrow>
                    <Row gap={2} align="baseline">
                      <Display size={25}>{stat.value}</Display>
                      {stat.unit ? (
                        <Mono size={13} tone="ink2">
                          {stat.unit}
                        </Mono>
                      ) : null}
                    </Row>
                    <Mono size={10} tone={stat.delta.tone}>
                      {stat.delta.text}
                    </Mono>
                  </View>
                ))}
              </Row>
              <Gap h={space.sm} />
              <Mono size={10} tone="ink3">
                Averaged over the {plural(loggedDays, 'day')} you logged, not all seven.
              </Mono>
            </Gutter>

            <Divider />

            <Gutter>
              <ChartLegend />

              <WeekChart
                label="CALORIES"
                target={week.goal.kcal}
                targetLabel={`target ${kcal(week.goal.kcal)}`}
                bars={week.days.map(d => ({ date: d.date, value: d.kcal, logged: d.logged }))}
              />

              <View style={{ height: 1, backgroundColor: c.rule, marginTop: 12 }} />

              <WeekChart
                label="PROTEIN"
                target={week.goal.proteinG}
                targetLabel={`target ${week.goal.proteinG} g`}
                bars={week.days.map(d => ({ date: d.date, value: d.proteinG, logged: d.logged }))}
              />

              <View style={{ height: 1, backgroundColor: c.rule, marginTop: 12 }} />

              <WeekChart
                label="FIBER"
                target={week.goal.fiberG}
                targetLabel={`target ${week.goal.fiberG} g`}
                bars={week.days.map(d => ({ date: d.date, value: d.fiberG, logged: d.logged }))}
              />
            </Gutter>

            <Gap h={space.xl} />
            <Divider />

            <Gutter style={{ paddingTop: space.lg }}>
              <SplitRow align="flex-start">
                <View style={{ gap: 3, flexShrink: 1, paddingRight: space.md }}>
                  <Eyebrow size={10} tone="ink2">
                    STREAK
                  </Eyebrow>
                  <Row gap={6} align="baseline">
                    <Display size={30}>{week.streakDays}</Display>
                    <Mono size={12} tone="ink2">
                      {week.streakDays === 1 ? 'day' : 'days'} in a row
                    </Mono>
                  </Row>
                  <Body size={13.5} tone="ink2" style={{ paddingTop: 3 }}>
                    Counted from today backwards. Missing a day resets it — it does not punish you
                    for it anywhere else.
                  </Body>
                </View>
                <IconButton name="flame" size={22} color={c.est} accessibilityLabel="Streak" onPress={() => {}} />
              </SplitRow>
            </Gutter>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
