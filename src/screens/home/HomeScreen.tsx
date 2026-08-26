import React, { useCallback, useRef, useState } from 'react';
import { Animated, RefreshControl, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { RecentTile } from '../../api/client';
import { Card } from '../../components/Card';
import { TextButton } from '../../components/Button';
import { Badge } from '../../components/Chip';
import { EmptyState, Notice, UndoToast } from '../../components/Feedback';
import { Divider, Gap, Gutter, Row, Split, Stack } from '../../components/Layout';
import { Meter } from '../../components/Meter';
import { Ring } from '../../components/Ring';
import { Header, Screen } from '../../components/Screen';
import { SkeletonCard, SkeletonRow } from '../../components/Skeleton';
import { SectionLabel, Txt } from '../../components/Text';
import { kcal, MEAL_ORDER, plural } from '../../lib/format';
import { useTheme } from '../../theme/ThemeProvider';
import { useAppState } from '../../state/AppState';
import { MealCard } from './MealCard';
import { RecentStrip } from './RecentCard';
import type { TabScreenProps } from '../../navigation/types';

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * Today. Reading order is by cost: the ring (the number they opened the app
 * for), the repeat strip (the two-second route), then the day's meals.
 *
 * Search is deliberately absent — it lives one tap into the composer, and in
 * the empty state where it is genuinely the fastest thing available.
 */
export function HomeScreen({ navigation }: TabScreenProps<'Today'>) {
  const { c, space } = useTheme();
  const { day, goal, loading, recents, pending, toast, refresh, logTile, undoToast, dismissToast, retryPending } =
    useAppState();

  const [refreshing, setRefreshing] = useState(false);
  const scrollY = useRef(new Animated.Value(0)).current;

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

  const onAdjust = (tile: RecentTile) => {
    // Long press means "the portion was different this time" — picker, not log.
    if (tile.kind === 'food') navigation.navigate('Portion', { foodId: tile.food.id });
    else navigation.navigate('Composer', { prefill: tile.name });
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
   * Built here rather than in the note so the note stays a rendering of a fact.
   * Counted per nutrient because the item missing fibre is usually not the item
   * missing carbs, and one shared number could not say which total to distrust.
   */
  const unmeasured = (
    [
      { label: 'Carbs', count: totals?.carbsUnmeasuredItems ?? 0 },
      { label: 'Fat', count: totals?.fatUnmeasuredItems ?? 0 },
      { label: 'Fibre', count: totals?.fiberUnmeasuredItems ?? 0 },
    ] as const
  ).filter(u => u.count > 0);
  const hasEntries = (day?.entries.length ?? 0) > 0;
  const now = new Date();

  return (
    <Screen scrollable>
      <Header
        eyebrow={`${WEEKDAYS[now.getDay()]}, ${now.getDate()} ${MONTHS[now.getMonth()]}`}
        title="Today"
        scrollY={scrollY}
        // Settings live here rather than in a tab. Top-right is where every
        // other app puts an account, and it buys back a third of the tab bar.
        actions={[
          {
            icon: 'user',
            label: 'You',
            variant: 'surface',
            onPress: () => navigation.navigate('You'),
          },
        ]}
      />

      {pending.length > 0 && (
        <>
          <Notice
            icon="offline"
            title={`${plural(pending.length, 'log')} waiting to sync`}
            detail="Saved on this phone. They will send themselves as soon as you are back online — there is nothing to redo."
            action={{ label: 'Try now', onPress: retryPending }}
          />
          <Gap h={space.lg} />
        </>
      )}

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        contentContainerStyle={{ paddingBottom: space.huge }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.inkTertiary} />}>
        {/* ── the number they came for ─────────────────────────────────── */}
        {loading && !day ? (
          <SkeletonCard height={330} />
        ) : (
          <Gutter>
            <Card level="raised" style={{ paddingVertical: space.xxl }}>
              <Stack align="center" gap={space.lg}>
                <Ring consumed={totals?.kcal ?? 0} goal={target?.kcal ?? 2000}>
                  <Gap h={6} />
                  <Badge label={`${kcal(totals?.kcal ?? 0)} of ${kcal(target?.kcal ?? 0)}`} />
                </Ring>
              </Stack>

              <Gap h={space.xxl} />
              <Divider />
              <Gap h={space.xl} />

              {/* Four macros, two per row.
                  Protein and carbs lead because they are the two people steer
                  by; fat and fibre sit under them. Four across a phone would
                  give each meter about 70pt, which is not enough for a label
                  and a "84 / 130 g" together. */}
              <Row gap={space.xxl} align="flex-start">
                <View style={{ flexGrow: 1, flexBasis: 0 }}>
                  <Meter label="Protein" value={totals?.proteinG ?? 0} target={target?.proteinG ?? 0} compact />
                </View>
                <View style={{ flexGrow: 1, flexBasis: 0 }}>
                  <Meter label="Carbs" value={totals?.carbsG ?? 0} target={target?.carbsG ?? 0} compact />
                </View>
              </Row>

              <Gap h={space.lg} />

              <Row gap={space.xxl} align="flex-start">
                <View style={{ flexGrow: 1, flexBasis: 0 }}>
                  <Meter label="Fat" value={totals?.fatG ?? 0} target={target?.fatG ?? 0} compact />
                </View>
                <View style={{ flexGrow: 1, flexBasis: 0 }}>
                  <Meter label="Fibre" value={totals?.fiberG ?? 0} target={target?.fiberG ?? 0} compact />
                </View>
              </Row>

              {/* One note covering whichever macros have gaps, not one per
                  nutrient. Three separate amber cards for the same day would
                  read as three problems instead of one caveat — and amber is
                  the app's only "we do not know" signal, so spending it three
                  times over makes it mean less each time. */}
              {unmeasured.length > 0 && (
                <>
                  <Gap h={space.lg} />
                  <Card fill="attentionSoft" style={{ padding: space.md }}>
                    <Txt role="caption" tone="attention">
                      {unmeasured.map(u => `${u.label} for ${plural(u.count, 'item')}`).join(', ')}{' '}
                      {unmeasured.length === 1 ? 'is' : 'are'} unknown today. Those are left out of the
                      total rather than counted as zero.
                    </Txt>
                  </Card>
                </>
              )}
            </Card>
          </Gutter>
        )}

        {/* ── the two-second route ─────────────────────────────────────── */}
        {recents.length > 0 && (
          <>
            <Gap h={space.xxl} />
            <Gutter>
              <Split align="baseline">
                <SectionLabel>Log again</SectionLabel>
                <Txt role="caption" tone="tertiary">
                  Hold to change portion
                </Txt>
              </Split>
            </Gutter>
            <Gap h={space.md} />
            <RecentStrip tiles={recents} onLog={logTile} onAdjust={onAdjust} />
          </>
        )}

        {/* ── what they already ate ────────────────────────────────────── */}
        {loading && !day ? (
          <Gutter style={{ paddingTop: space.xxl }}>
            {[0, 1, 2].map(i => (
              <SkeletonRow key={i} index={i} />
            ))}
          </Gutter>
        ) : hasEntries ? (
          <>
            <Gap h={space.xxl} />
            <Gutter>
              <SectionLabel>Today's meals</SectionLabel>
            </Gutter>
            <Gap h={space.md} />
            <Gutter>
              <Stack gap={space.md}>
                {MEAL_ORDER.map(meal => (
                  <MealCard
                    key={meal}
                    meal={meal}
                    entries={(day?.entries ?? []).filter(e => e.meal === meal)}
                    onOpenEntry={entry => navigation.navigate('EntryDetail', { entryId: entry.id })}
                  />
                ))}
              </Stack>
            </Gutter>
          </>
        ) : null}

        {!loading && !hasEntries && (
          <EmptyState
            icon="bowl"
            title="Nothing logged yet"
            detail={
              recents.length > 0
                ? 'Tap anything above to log it at your usual portion, or describe a whole meal in one sentence.'
                : 'Start with one thing you ate. Search is the surest way in — describing a meal earns its keep once there are three things on the plate.'
            }
            action={{ label: 'Find a food', icon: 'search', onPress: () => navigation.navigate('Search') }}
            secondary={{ label: 'Describe a meal instead', onPress: () => navigation.navigate('Composer') }}
          />
        )}

        {hasEntries && (
          <Gutter style={{ paddingTop: space.xl, alignItems: 'center' }}>
            <TextButton
              label="Add something else"
              icon="plus"
              onPress={() => navigation.navigate('Composer')}
            />
          </Gutter>
        )}
      </Animated.ScrollView>

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
