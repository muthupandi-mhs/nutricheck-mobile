import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import type { LogEntry, LogItem, LogSource } from '../../api/types';
import { Button, IconButton, TextButton } from '../../components/Button';
import { Card } from '../../components/Card';
import { Badge, Chip } from '../../components/Chip';
import { Disclaimer, EmptyState, TotalsRow } from '../../components/Feedback';
import { Stepper } from '../../components/Field';
import { FoodGlyph } from '../../components/FoodGlyph';
import { Divider, Gap, Gutter, Row, Split, Stack } from '../../components/Layout';
import { Press } from '../../components/Press';
import { Dock, Screen } from '../../components/Screen';
import { SectionLabel, Txt } from '../../components/Text';
import { clockTime, DASH, grams, gramsOrDash, kcal, MEAL_LABEL } from '../../lib/format';
import { entryTotals } from '../../lib/nutrition';
import { useTheme } from '../../theme/ThemeProvider';
import { useAppState } from '../../state/AppState';
import type { ScreenProps } from '../../navigation/types';

const SOURCE_COPY: Record<LogSource, string> = {
  text: 'typed',
  voice: 'spoken',
  search: 'from search',
  repeat: 'one tap',
  photo: 'from a photo',
};

/**
 * One entry, and the ability to correct it. The phrase is shown when there was
 * one — it explains a number that looks wrong a week later.
 *
 * A portion edit also writes back to `user_portions`, so the next parse of the
 * same word starts right.
 */
export function EntryDetailScreen({ navigation, route }: ScreenProps<'EntryDetail'>) {
  const { c, space } = useTheme();
  const { day, updateItemGrams, deleteEntry } = useAppState();

  const entry: LogEntry | undefined = useMemo(
    () => day?.entries.find(e => e.id === route.params.entryId),
    [day, route.params.entryId],
  );

  const [editing, setEditing] = useState<string | null>(null);
  const [pendingGrams, setPendingGrams] = useState(0);
  const [busy, setBusy] = useState(false);

  if (!entry) {
    return (
      <Screen>
        <EmptyState
          icon="info"
          title="That entry is gone"
          detail="It was deleted, or undone from the toast on your home screen."
          action={{ label: 'Back to today', onPress: () => navigation.navigate('Main') }}
        />
      </Screen>
    );
  }

  const totals = entryTotals(entry);

  const saveEdit = async (item: LogItem) => {
    setBusy(true);
    await updateItemGrams(entry.id, item.id, pendingGrams);
    setBusy(false);
    setEditing(null);
  };

  const onDelete = async () => {
    setBusy(true);
    await deleteEntry(entry.id);
    setBusy(false);
    navigation.navigate('Main');
  };

  return (
    <Screen scrollable>
      <Gutter>
        <Split align="flex-start" style={{ minHeight: 44 }}>
          <Stack gap={4} style={{ flexShrink: 1 }}>
            <Txt role="caption" tone="tertiary">
              {MEAL_LABEL[entry.meal]} · {clockTime(entry.loggedAt)} · {SOURCE_COPY[entry.source]}
            </Txt>
            <Row gap={6} align="baseline">
              <Txt role="h1" numeric>
                {kcal(totals.kcal)}
              </Txt>
              <Txt role="body" tone="secondary">
                kcal
              </Txt>
            </Row>
          </Stack>
          <IconButton
            name="close"
            onPress={() => navigation.goBack()}
            accessibilityLabel="Close"
            style={{ marginRight: -10 }}
          />
        </Split>
      </Gutter>

      <ScrollView
        contentContainerStyle={{ padding: space.gutter, paddingTop: space.xl, paddingBottom: space.xl }}>
        <Stack gap={space.lg}>
          {entry.phrase && (
            <Card level="raised" fill="sunken">
              <Stack gap={space.md}>
                <SectionLabel>From your words</SectionLabel>
                <Txt role="h3" tone="secondary" style={{ fontStyle: 'italic' }}>
                  “{entry.phrase}”
                </Txt>
                <Row gap={space.sm} wrap>
                  <Chip
                    label="Log it again"
                    icon="undo"
                    onPress={() => navigation.navigate('Confirm', { phrase: entry.phrase!, source: 'text' })}
                  />
                  <Chip label="Save as a meal" icon="bookmark" onPress={() => {}} />
                </Row>
              </Stack>
            </Card>
          )}

          <Card level="raised" padded={false}>
            {entry.items.map((item, i) => {
              const isEditing = editing === item.id;
              const fibreUnknown = item.nutrients.fiberState === 'unknown';

              return (
                <View key={item.id}>
                  {i > 0 && <Divider inset={space.xl + 44 + space.md} />}

                  {isEditing ? (
                    <View style={{ padding: space.xl, gap: space.lg }}>
                      <Stepper
                        label={item.food.name}
                        value={pendingGrams}
                        unit="g"
                        step={5}
                        min={1}
                        max={5000}
                        onChange={setPendingGrams}
                        hint={`${kcal((item.nutrients.kcal / item.grams) * pendingGrams)} kcal at this amount`}
                      />
                      <Split>
                        <TextButton label="Cancel" tone="secondary" onPress={() => setEditing(null)} />
                        <Button
                          label={busy ? 'Saving…' : 'Save'}
                          size="sm"
                          full={false}
                          variant="tonal"
                          onPress={() => saveEdit(item)}
                          haptic="commit"
                        />
                      </Split>
                    </View>
                  ) : (
                    <Press
                      onPress={() => {
                        setEditing(item.id);
                        setPendingGrams(Math.round(item.grams));
                      }}
                      feedback="none"
                      accessibilityLabel={`${item.food.name}, ${grams(item.grams)} grams. Tap to change the amount.`}
                      style={{ paddingHorizontal: space.xl, paddingVertical: space.lg }}>
                      <Row gap={space.md} align="flex-start">
                        <FoodGlyph name={item.food.name} seed={item.food.id} />

                        <Stack gap={6} style={{ flexGrow: 1, flexShrink: 1 }}>
                          <Txt role="h3">{item.food.name}</Txt>
                          <Row gap={space.sm} wrap>
                            <Badge label={`${grams(item.grams)} g`} />
                            {item.quantitySource === 'user_portion' && <Badge label="your usual" tone="success" />}
                            {item.quantitySource === 'stated' && <Badge label="you said it" tone="success" />}
                          </Row>
                          <Row gap={space.sm} wrap>
                            <Txt role="caption" tone="tertiary">
                              P {grams(item.nutrients.proteinG)} g
                            </Txt>
                            {fibreUnknown ? (
                              <Txt role="caption" tone="attention">
                                Fibre {DASH} unknown
                              </Txt>
                            ) : (
                              <Txt role="caption" tone="tertiary">
                                F {gramsOrDash(item.nutrients.fiberG)} g
                              </Txt>
                            )}
                          </Row>
                        </Stack>

                        <Txt role="h3" numeric>
                          {kcal(item.nutrients.kcal)}
                        </Txt>
                      </Row>
                    </Press>
                  )}
                </View>
              );
            })}
          </Card>

          <Card level="raised">
            <TotalsRow
              kcal={kcal(totals.kcal)}
              protein={grams(totals.proteinG)}
              carbs={grams(totals.carbsG)}
              fat={grams(totals.fatG)}
              fibre={grams(totals.fiberG)}
              fibreUnknown={totals.fiberUnmeasuredItems}
            />
            {totals.fiberUnmeasuredItems > 0 && (
              <>
                <Gap h={space.lg} />
                <Disclaimer text="One or more foods here carry no fibre figure. They are excluded from the fibre total rather than counted as zero." />
              </>
            )}
          </Card>

          <Press
            onPress={onDelete}
            accessibilityLabel="Delete this entry"
            style={{ alignItems: 'center', paddingVertical: space.md }}>
            <Row gap={space.sm}>
              <Txt role="label" color={c.danger}>
                Delete this entry
              </Txt>
            </Row>
          </Press>
        </Stack>
      </ScrollView>

      <Dock>
        <Button label="Done" variant="tonal" onPress={() => navigation.goBack()} />
      </Dock>
    </Screen>
  );
}
