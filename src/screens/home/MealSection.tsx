import React from 'react';
import { View } from 'react-native';
import type { LogEntry, MealSlot } from '../../api/types';
import { PressableRow } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { Hairline, Row, SplitRow } from '../../components/Layout';
import { Body, Eyebrow, Mono, Num } from '../../components/Type';
import { MEAL_LABEL, grams, kcal } from '../../lib/format';
import { entryTotals } from '../../lib/nutrition';
import { useTheme } from '../../theme/ThemeProvider';

/**
 * One meal's worth of the day list.
 *
 * The portion line under each food carries both the household unit and the
 * gram weight ("1 medium · 118 g"). Either alone is worse: grams are precise
 * and unintuitive, household units are intuitive and ambiguous, and the pair
 * is how someone checks whether the number is about right at a glance.
 */
export function MealSection({
  meal,
  entries,
  onOpenEntry,
}: {
  meal: MealSlot;
  entries: LogEntry[];
  onOpenEntry: (entry: LogEntry) => void;
}) {
  const { c, space } = useTheme();
  if (entries.length === 0) return null;

  const sectionKcal = entries.reduce((s, e) => s + entryTotals(e).kcal, 0);

  return (
    <View>
      <SplitRow align="baseline" style={{ paddingTop: space.lg, paddingBottom: space.sm }}>
        <Eyebrow size={10.5} tone="ink2">
          {MEAL_LABEL[meal]}
        </Eyebrow>
        <Num size={11} tone="ink3">
          {kcal(sectionKcal)} kcal
        </Num>
      </SplitRow>

      {entries.map(entry =>
        entry.items.map((item, i) => (
          <View key={item.id}>
            <Hairline />
            <PressableRow
              onPress={() => onOpenEntry(entry)}
              accessibilityLabel={`${item.food.name}, ${grams(item.grams)} grams, ${Math.round(item.nutrients.kcal)} calories`}
              accessibilityHint="Opens the entry"
              style={{ paddingVertical: 9 }}>
              <SplitRow align="baseline">
                <View style={{ flexShrink: 1, gap: 1, paddingRight: space.md }}>
                  <Body size={15} numberOfLines={1}>
                    {item.food.name}
                  </Body>
                  <Row gap={6}>
                    <Mono size={10} tone="ink3">
                      {grams(item.grams)} g
                    </Mono>
                    {item.nutrients.fiberState === 'unknown' && (
                      <Row gap={3}>
                        <Icon name="info" size={9} color={c.est} weight={2.4} />
                        <Mono size={9.5} tone="est">
                          fiber unknown
                        </Mono>
                      </Row>
                    )}
                    {i === 0 && entry.source === 'text' && entry.phrase ? (
                      <Mono size={9.5} tone="ink3" numberOfLines={1} style={{ flexShrink: 1 }}>
                        · typed
                      </Mono>
                    ) : null}
                  </Row>
                </View>
                <Num size={13}>{kcal(item.nutrients.kcal)}</Num>
              </SplitRow>
            </PressableRow>
          </View>
        )),
      )}
    </View>
  );
}
