import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import type { LogEntry, LogItem, LogSource } from '../../api/types';
import { Disclaimer } from '../../components/Banner';
import { IconButton, PressableRow, PrimaryButton, TextAction } from '../../components/Button';
import { Chip } from '../../components/Chip';
import { Stepper } from '../../components/Field';
import { Divider, Gap, Gutter, Hairline, HeavyBar, Row, SplitRow } from '../../components/Layout';
import { Dock, Screen } from '../../components/Screen';
import { Body, Display, Eyebrow, Mono, Num, Title } from '../../components/Type';
import { DASH, MEAL_LABEL, clockTime, grams, gramsOrDash, kcal } from '../../lib/format';
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
 * One entry, and the ability to correct it.
 *
 * The phrase is shown when there was one. It is the reproducible input for any
 * later correction — if a number here looks wrong a week from now, the sentence
 * that produced it is the only thing that explains why.
 *
 * A portion edit here does not just fix today's total. It writes back to
 * `user_portions`, so the next parse of the same word starts right. That is
 * the difference between a form and a sensor.
 */
export function EntryDetailScreen({ navigation, route }: ScreenProps<'EntryDetail'>) {
  const { c, space } = useTheme();
  const { day, updateItemGrams, deleteEntry } = useAppState();

  const entry: LogEntry | undefined = useMemo(
    () => day?.entries.find(e => e.id === route.params.entryId),
    [day, route.params.entryId],
  );

  const [editing, setEditing] = useState<string | null>(null);
  const [pendingGrams, setPendingGrams] = useState<number>(0);
  const [busy, setBusy] = useState(false);

  if (!entry) {
    return (
      <Screen edges="top">
        <Gutter>
          <Display size={24}>That entry is gone</Display>
          <Gap h={space.sm} />
          <Body size={15} tone="ink2">
            It was deleted, or undone from the toast on the home screen.
          </Body>
          <Gap h={space.lg} />
          <PrimaryButton label="Back to today" onPress={() => navigation.navigate('Home')} />
        </Gutter>
      </Screen>
    );
  }

  const totals = entryTotals(entry);

  const startEdit = (item: LogItem) => {
    setEditing(item.id);
    setPendingGrams(Math.round(item.grams));
  };

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
    navigation.navigate('Home');
  };

  return (
    <Screen edges="top">
      <Gutter style={{ paddingBottom: space.md }}>
        <SplitRow align="flex-start">
          <View style={{ flexShrink: 1, gap: 3 }}>
            <Eyebrow size={10} tone="ink3">
              {MEAL_LABEL[entry.meal]} · {clockTime(entry.loggedAt)} · {SOURCE_COPY[entry.source].toUpperCase()}
            </Eyebrow>
            <Display size={28}>{kcal(totals.kcal)} kcal</Display>
          </View>
          <IconButton name="close" size={20} onPress={() => navigation.goBack()} accessibilityLabel="Close" style={{ marginRight: -10 }} />
        </SplitRow>
      </Gutter>

      <HeavyBar />

      <ScrollView contentContainerStyle={{ paddingBottom: space.xl }}>
        {entry.phrase && (
          <>
            <Gutter style={{ paddingVertical: space.lg }}>
              <Eyebrow size={10} tone="ink3">
                FROM YOUR WORDS
              </Eyebrow>
              <Gap h={5} />
              <Body size={16} tone="ink2" style={{ fontStyle: 'italic' }}>
                “{entry.phrase}”
              </Body>
              <Gap h={space.sm} />
              <Row gap={space.sm}>
                <Chip label="Log it again" variant="det" onPress={() => navigation.navigate('Confirm', { phrase: entry.phrase!, source: 'text' })} />
                <Chip label="Save as a meal" onPress={() => {}} />
              </Row>
            </Gutter>
            <Divider />
          </>
        )}

        <Gutter>
          {entry.items.map(item => {
            const isEditing = editing === item.id;
            const fiberUnknown = item.nutrients.fiberState === 'unknown';
            return (
              <View key={item.id}>
                <Hairline />
                {isEditing ? (
                  <View style={{ paddingVertical: space.lg, gap: space.md }}>
                    <Stepper
                      label={item.food.name.toUpperCase()}
                      value={pendingGrams}
                      unit="g"
                      step={5}
                      min={1}
                      max={5000}
                      onChange={setPendingGrams}
                      hint={`${kcal((item.nutrients.kcal / item.grams) * pendingGrams)} kcal at this amount`}
                    />
                    <SplitRow>
                      <TextAction label="Cancel" tone="ink2" onPress={() => setEditing(null)} />
                      <Chip label={busy ? 'Saving…' : 'Save'} variant="selected" onPress={() => saveEdit(item)} />
                    </SplitRow>
                  </View>
                ) : (
                  <PressableRow
                    onPress={() => startEdit(item)}
                    accessibilityLabel={`${item.food.name}, ${grams(item.grams)} grams. Tap to change the amount.`}
                    style={{ paddingVertical: 13 }}>
                    <SplitRow align="flex-start">
                      <View style={{ flexShrink: 1, gap: 5, paddingRight: space.md }}>
                        <Title size={15.5} weight="700">
                          {item.food.name}
                        </Title>
                        <Row gap={7} wrap>
                          <Chip label={`${grams(item.grams)} g`} size={11} />
                          {item.quantitySource === 'user_portion' && <Chip label="your usual" variant="est" size={10} />}
                          {item.quantitySource === 'stated' && <Chip label="you said it" variant="det" size={10} />}
                        </Row>
                        <Mono size={10.5} tone="ink3">
                          P {grams(item.nutrients.proteinG)} g · Fiber{' '}
                          {fiberUnknown ? <Mono size={10.5} tone="est">{DASH}</Mono> : `${gramsOrDash(item.nutrients.fiberG)} g`}
                        </Mono>
                      </View>
                      <Num size={15} weight="600">
                        {kcal(item.nutrients.kcal)}
                      </Num>
                    </SplitRow>
                  </PressableRow>
                )}
              </View>
            );
          })}
          <Hairline />
        </Gutter>

        <Gutter style={{ paddingTop: space.lg }}>
          <Row gap={space.xl}>
            {[
              { label: 'CALORIES', value: kcal(totals.kcal), unit: '' },
              { label: 'PROTEIN', value: grams(totals.proteinG), unit: 'g' },
              { label: 'FIBER', value: grams(totals.fiberG), unit: 'g' },
            ].map(stat => (
              <View key={stat.label} style={{ gap: 2 }}>
                <Eyebrow size={9.5} tone="ink2">
                  {stat.label}
                </Eyebrow>
                <Row gap={3} align="baseline">
                  <Display size={24}>{stat.value}</Display>
                  {stat.unit ? <Mono size={13} tone="ink2">{stat.unit}</Mono> : null}
                </Row>
              </View>
            ))}
          </Row>
          {totals.fiberUnmeasuredItems > 0 && (
            <View style={{ paddingTop: space.md }}>
              <Disclaimer text="One or more foods here carry no fiber figure. They are excluded from the fiber total rather than counted as zero." />
            </View>
          )}
        </Gutter>

        <Gap h={space.xl} />
        <Divider />

        <Gutter style={{ paddingTop: space.lg }}>
          <PressableRow onPress={onDelete} accessibilityLabel="Delete this entry" style={{ paddingVertical: space.md }}>
            <Row gap={space.sm}>
              <View style={{ opacity: 0.9 }}>
                <IconButton name="trash" size={15} color={c.est} accessibilityLabel="Delete" onPress={onDelete} style={{ width: 20, height: 20 }} />
              </View>
              <Body size={14.5} tone="est">
                Delete this entry
              </Body>
            </Row>
          </PressableRow>
        </Gutter>
      </ScrollView>

      <Dock>
        <PrimaryButton label="Done" onPress={() => navigation.goBack()} />
      </Dock>
    </Screen>
  );
}
