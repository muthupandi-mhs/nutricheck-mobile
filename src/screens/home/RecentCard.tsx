import React from 'react';
import { ScrollView, View } from 'react-native';
import type { RecentTile } from '../../api/client';
import { Badge } from '../../components/Chip';
import { FoodGlyph } from '../../components/FoodGlyph';
import { Row, Split, Stack } from '../../components/Layout';
import { Press } from '../../components/Press';
import { Txt } from '../../components/Text';
import { kcal, plural } from '../../lib/format';
import { useTheme } from '../../theme/ThemeProvider';

/**
 * The repeat strip — the two-second route. Sits directly under the hero, at full
 * tap-target size, because a fastest route one level down does not get used.
 *
 * Tap logs immediately at the remembered portion, with an undo toast instead of
 * a dialog. Long press opens the portion picker.
 */
export function RecentStrip({
  tiles,
  onLog,
  onAdjust,
}: {
  tiles: RecentTile[];
  onLog: (t: RecentTile) => void;
  onAdjust: (t: RecentTile) => void;
}) {
  const { space } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: space.gutter, gap: space.md, paddingVertical: 2 }}>
      {tiles.map(tile => (
        <RecentCard key={tile.id} tile={tile} onLog={onLog} onAdjust={onAdjust} />
      ))}
      <View style={{ width: space.xs }} />
    </ScrollView>
  );
}

function RecentCard({
  tile,
  onLog,
  onAdjust,
}: {
  tile: RecentTile;
  onLog: (t: RecentTile) => void;
  onAdjust: (t: RecentTile) => void;
}) {
  const { c, radius, space, elevation } = useTheme();

  const isMeal = tile.kind === 'meal';
  const name = isMeal ? tile.name : tile.food.name;
  const total = isMeal ? tile.items.reduce((s, i) => s + i.nutrients.kcal, 0) : tile.nutrients.kcal;
  const sub = isMeal ? plural(tile.items.length, 'item') : tile.portionLabel;

  return (
    <Press
      onPress={() => onLog(tile)}
      onLongPress={() => onAdjust(tile)}
      haptic="commit"
      accessibilityLabel={`${name}, ${sub}, ${Math.round(total)} calories`}
      accessibilityHint="Logs immediately at your usual portion. Long press to change it."
      style={{
        width: 152,
        backgroundColor: c.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: c.border,
        padding: space.lg,
        gap: space.md,
        ...elevation.e1,
      }}>
      <Split align="flex-start">
        <FoodGlyph name={name} seed={tile.id} size={40} icon={isMeal ? 'bookmark' : undefined} />
        {isMeal && <Badge label="Meal" tone="success" />}
      </Split>

      <Stack gap={2}>
        <Txt role="h3" numberOfLines={2} style={{ minHeight: 46 }}>
          {name}
        </Txt>
      </Stack>

      <Split align="baseline">
        <Txt role="caption" tone="tertiary" numberOfLines={1} style={{ flexShrink: 1 }}>
          {sub}
        </Txt>
        <Row gap={3} align="baseline">
          <Txt role="label" numeric>
            {kcal(total)}
          </Txt>
          <Txt role="caption" tone="tertiary">
            kcal
          </Txt>
        </Row>
      </Split>
    </Press>
  );
}
