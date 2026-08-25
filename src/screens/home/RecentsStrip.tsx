import React from 'react';
import { ScrollView, View } from 'react-native';
import type { RecentTile } from '../../api/client';
import { PressableRow } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { Row, SplitRow } from '../../components/Layout';
import { Mono, Num, Title } from '../../components/Type';
import { kcal, plural } from '../../lib/format';
import { useTheme } from '../../theme/ThemeProvider';

/**
 * The recents strip — the two-second route, above the fold.
 *
 * This is the single highest-leverage element on the home screen. If the
 * fastest way to log is buried a level down, people take the eighteen-second
 * one instead and quietly conclude the app is tedious. So it sits directly
 * under the ring, at full tap-target size, before the meal list.
 *
 * A tap logs immediately at the remembered portion — no sheet, no dialog. A
 * long press opens the portion picker, for the times it was different.
 */
export function RecentsStrip({
  tiles,
  onLog,
  onAdjust,
}: {
  tiles: RecentTile[];
  onLog: (t: RecentTile) => void;
  onAdjust: (t: RecentTile) => void;
}) {
  const { c, space, rule } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: space.gutter, gap: 10 }}>
      {tiles.map(tile => {
        const isMeal = tile.kind === 'meal';
        const totalKcal = isMeal
          ? tile.items.reduce((s, i) => s + i.nutrients.kcal, 0)
          : tile.nutrients.kcal;

        return (
          <PressableRow
            key={tile.id}
            onPress={() => onLog(tile)}
            onLongPress={() => onAdjust(tile)}
            accessibilityLabel={
              isMeal
                ? `${tile.name}, ${plural(tile.items.length, 'item')}, ${Math.round(totalKcal)} calories`
                : `${tile.food.name}, ${tile.portionLabel}, ${Math.round(totalKcal)} calories`
            }
            accessibilityHint="Logs immediately. Long press to change the portion."
            style={{
              width: 116,
              height: 96,
              backgroundColor: c.surface,
              borderWidth: 1,
              borderColor: c.rule,
              borderLeftWidth: isMeal ? rule.edge : 1,
              borderLeftColor: isMeal ? c.det : c.rule,
              paddingVertical: 10,
              paddingHorizontal: 11,
              justifyContent: 'space-between',
            }}>
            <View style={{ gap: 3 }}>
              {isMeal && (
                <Row gap={5}>
                  <Icon name="layers" size={12} color={c.det} weight={2} />
                  <Mono size={8.5} tone="det" style={{ letterSpacing: 0.7 }}>
                    MEAL
                  </Mono>
                </Row>
              )}
              <Title size={13} weight="700" numberOfLines={2}>
                {isMeal ? tile.name : tile.food.name}
              </Title>
            </View>

            <SplitRow align="baseline">
              <Mono size={9} tone="ink3">
                {isMeal ? plural(tile.items.length, 'item') : tile.portionLabel}
              </Mono>
              <Num size={12} weight="600">
                {kcal(totalKcal)}
              </Num>
            </SplitRow>
          </PressableRow>
        );
      })}
      <View style={{ width: space.xs }} />
    </ScrollView>
  );
}
