import React, { useCallback } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { RecentTile } from '../../api/client';
import { Banner, EmptyState } from '../../components/Banner';
import { PrimaryButton, SecondaryButton, TextAction } from '../../components/Button';
import { Divider, Gap, Gutter, Row, SplitRow } from '../../components/Layout';
import { MacroBar } from '../../components/MacroBar';
import { Ring } from '../../components/Ring';
import { Dock, Masthead, Screen } from '../../components/Screen';
import { SkeletonItemRow } from '../../components/Skeleton';
import { UndoToast } from '../../components/Toast';
import { Eyebrow, Mono } from '../../components/Type';
import { MEAL_ORDER, dateEyebrow, plural } from '../../lib/format';
import { useTheme } from '../../theme/ThemeProvider';
import { useAppState } from '../../state/AppState';
import { MealSection } from './MealSection';
import { RecentsStrip } from './RecentsStrip';
import type { ScreenProps } from '../../navigation/types';

/**
 * Home.
 *
 * Reading order is deliberate and is the product's whole argument about time:
 *
 *   1. the ring — the one number they opened the app for
 *   2. the recents strip — the two-second route, before anything slower
 *   3. today's list — what they already ate, for checking rather than acting
 *   4. the compose button — the nine-second route, in the dock
 *
 * Search is not on this screen at all. It is the floor under everything, and
 * the eighteen-second route does not deserve to compete for the fold.
 */
export function HomeScreen({ navigation }: ScreenProps<'Home'>) {
  const { c, space } = useTheme();
  const { day, goal, loading, recents, pending, toast, refresh, logTile, undoToast, dismissToast, retryPending } =
    useAppState();

  const [refreshing, setRefreshing] = React.useState(false);

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
    // Long press means "the portion was different this time" — so this goes to
    // the picker rather than logging, at the food the user pressed.
    if (tile.kind === 'food') navigation.navigate('Portion', { foodId: tile.food.id });
    else navigation.navigate('Composer', { prefill: tile.name });
  };

  const totals = day?.totals;
  const g = day?.goal ?? (goal ? { kcal: goal.kcal, proteinG: goal.proteinG, fiberG: goal.fiberG } : null);
  const hasEntries = (day?.entries.length ?? 0) > 0;

  return (
    <Screen edges="top">
      <Masthead
        eyebrow={dateEyebrow(new Date())}
        title="Today"
        actions={[
          { icon: 'chart', onPress: () => navigation.navigate('Week'), label: 'Your week' },
          { icon: 'gear', onPress: () => navigation.navigate('Settings'), label: 'Settings' },
        ]}
      />

      {pending.length > 0 && (
        <Banner
          icon="cloudOff"
          title={`${plural(pending.length, 'log')} waiting to sync`}
          detail="Saved on this phone. They will send themselves as soon as you are back online — nothing to redo."
          action={{ label: 'Try now', onPress: retryPending }}
        />
      )}

      <ScrollView
        contentContainerStyle={{ paddingBottom: space.xl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.ink3} />}>
        {/* ── the number they came for ────────────────────────────────────── */}
        <Row gap={18} align="center" style={{ paddingHorizontal: space.gutter, paddingTop: space.xl, paddingBottom: 18 }}>
          <Ring consumed={totals?.kcal ?? 0} goal={g?.kcal ?? 2000} />
          <View style={{ flexGrow: 1, flexShrink: 1, gap: 14 }}>
            <MacroBar label="PROTEIN" value={totals?.proteinG ?? 0} target={g?.proteinG ?? 0} />
            <MacroBar
              label="FIBER"
              value={totals?.fiberG ?? 0}
              target={g?.fiberG ?? 0}
              unmeasuredItems={totals?.fiberUnmeasuredItems ?? 0}
            />
          </View>
        </Row>

        <Divider />

        {/* ── the two-second route ────────────────────────────────────────── */}
        {recents.length > 0 && (
          <View style={{ paddingTop: 14, paddingBottom: space.lg }}>
            <SplitRow style={{ paddingHorizontal: space.gutter, paddingBottom: 10 }}>
              <Eyebrow size={10.5} tone="ink2">
                TAP TO LOG AGAIN
              </Eyebrow>
              <TextAction label="Edit" onPress={() => navigation.navigate('Settings')} size={10.5} />
            </SplitRow>
            <RecentsStrip tiles={recents} onLog={logTile} onAdjust={onAdjust} />
            <Gutter style={{ paddingTop: 10 }}>
              <Mono size={9.5} tone="ink3">
                Long press to change the portion
              </Mono>
            </Gutter>
          </View>
        )}

        <Divider />

        {/* ── what they already ate ───────────────────────────────────────── */}
        <Gutter>
          {loading && !day ? (
            <View style={{ paddingTop: space.lg }}>
              {[0, 1, 2].map(i => (
                <SkeletonItemRow key={i} index={i} />
              ))}
            </View>
          ) : hasEntries ? (
            MEAL_ORDER.map(meal => (
              <MealSection
                key={meal}
                meal={meal}
                entries={(day?.entries ?? []).filter(e => e.meal === meal)}
                onOpenEntry={entry => navigation.navigate('EntryDetail', { entryId: entry.id })}
              />
            ))
          ) : null}
        </Gutter>

        {!loading && !hasEntries && (
          <EmptyState
            title="Nothing logged yet today"
            detail={
              recents.length > 0
                ? 'Tap anything in the strip above to log it at your usual portion, or write out a whole meal below.'
                : 'Start with one thing you ate. Search is the surest way in — parsing is worth it once there are three items on the plate.'
            }>
            <SecondaryButton
              label="Search for a food"
              icon="search"
              onPress={() => navigation.navigate('Search')}
            />
          </EmptyState>
        )}
      </ScrollView>

      <Dock>
        <PrimaryButton label="Log a meal" icon="plus" onPress={() => navigation.navigate('Composer')} />
        <Gap h={space.sm} />
        <View style={{ alignItems: 'center' }}>
          <TextAction label="or search for a single food" onPress={() => navigation.navigate('Search')} size={11.5} tone="ink2" />
        </View>
      </Dock>

      <UndoToast
        visible={toast !== null}
        message={toast?.message ?? ''}
        detail={toast?.detail}
        onUndo={undoToast}
        onExpire={dismissToast}
      />
    </Screen>
  );
}
