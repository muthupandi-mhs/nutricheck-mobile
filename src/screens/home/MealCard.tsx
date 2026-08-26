import React from 'react';
import { View } from 'react-native';
import type { LogEntry, MealSlot } from '../../api/types';
import { Card } from '../../components/Card';
import { FoodGlyph } from '../../components/FoodGlyph';
import { Icon } from '../../components/Icon';
import { Divider, Row, Split, Stack } from '../../components/Layout';
import { MealInsight } from './MealInsight';
import { Press } from '../../components/Press';
import { Txt } from '../../components/Text';
import { grams, kcal } from '../../lib/format';
import { entryTotals } from '../../lib/nutrition';
import { useTheme } from '../../theme/ThemeProvider';

const TITLES: Record<MealSlot, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snacks',
};

/**
 * One meal, as a card of rows. The portion line carries the household unit and
 * the gram weight — "1 medium · 118 g". Grams alone are precise and
 * unintuitive; household units alone are intuitive and ambiguous.
 */
export function MealCard({
  meal,
  entries,
  date,
  onOpenEntry,
}: {
  meal: MealSlot;
  entries: LogEntry[];
  date: string;
  onOpenEntry: (entry: LogEntry) => void;
}) {
  const { c, space } = useTheme();
  if (entries.length === 0) return null;

  const total = entries.reduce((s, e) => s + entryTotals(e).kcal, 0);
  const rows = entries.flatMap(entry => entry.items.map(item => ({ entry, item })));

  return (
    <Card padded={false} level="raised">
      <Split style={{ paddingHorizontal: space.xl, paddingTop: space.lg, paddingBottom: space.md }}>
        <Txt role="h3">{TITLES[meal]}</Txt>
        <Row gap={3} align="baseline">
          <Txt role="label" numeric tone="secondary">
            {kcal(total)}
          </Txt>
          <Txt role="caption" tone="tertiary">
            kcal
          </Txt>
        </Row>
      </Split>

      {rows.map(({ entry, item }, i) => (
        <View key={item.id}>
          {i > 0 && <Divider inset={space.xl + 44 + space.md} />}
          <Press
            onPress={() => onOpenEntry(entry)}
            feedback="none"
            accessibilityLabel={`${item.food.name}, ${grams(item.grams)} grams, ${Math.round(item.nutrients.kcal)} calories`}
            accessibilityHint="Opens the entry"
            style={{ paddingHorizontal: space.xl, paddingVertical: space.md }}>
            <Row gap={space.md}>
              <FoodGlyph name={item.food.name} seed={item.food.id} />

              <Stack gap={3} style={{ flexGrow: 1, flexShrink: 1 }}>
                <Txt role="h3" numberOfLines={1}>
                  {item.food.name}
                </Txt>
                <Row gap={space.sm} wrap>
                  <Txt role="caption" tone="tertiary">
                    {grams(item.grams)} g
                  </Txt>
                  {item.nutrients.fiberState === 'unknown' && (
                    <Row gap={4}>
                      <Icon name="info" size={11} color={c.attention} weight={2.2} />
                      <Txt role="caption" tone="attention">
                        fibre unknown
                      </Txt>
                    </Row>
                  )}
                </Row>
              </Stack>

              <Txt role="label" numeric>
                {kcal(item.nutrients.kcal)}
              </Txt>
            </Row>
          </Press>
        </View>
      ))}

      <Divider />
      <MealInsight meal={meal} date={date} kcalOfMeal={total} />

      <View style={{ height: space.sm }} />
    </Card>
  );
}
