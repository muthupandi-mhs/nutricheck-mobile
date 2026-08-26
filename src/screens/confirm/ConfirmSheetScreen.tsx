import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useApi } from '../../api/client';
import {
  isProblem,
  OfflineError,
  type FoodSummary,
  type MealSlot,
  type ResolveDraft,
  type UnresolvedItem,
} from '../../api/types';
import { Button, TextButton } from '../../components/Button';
import { TotalsRow } from '../../components/Feedback';
import { Icon } from '../../components/Icon';
import { Divider, Gap, Gutter, Row, Split, Stack } from '../../components/Layout';
import { Sheet } from '../../components/Sheet';
import { SkeletonRow } from '../../components/Skeleton';
import { SectionLabel, Txt } from '../../components/Text';
import { DASH, grams, kcal, mealSlotFor, plural } from '../../lib/format';
import { uuid } from '../../lib/id';
import { scale, total } from '../../lib/nutrition';
import { useTheme } from '../../theme/ThemeProvider';
import { useAppState } from '../../state/AppState';
import { ConfirmRow, UnresolvedRow, type Line } from './ConfirmRow';
import type { ScreenProps } from '../../navigation/types';

/**
 * The confirm sheet — where a parse becomes a user assertion. Three rules that
 * do not bend:
 *
 *  1. Never auto-commit a parse, on any confidence. Otherwise the log is the
 *     model's opinion rather than something the user asserted.
 *  2. Show ranges only where they are real. A range on "180 g of chicken" is
 *     noise; on "a bowl of dal" before we know their bowl it is honesty.
 *  3. Every correction is training data — portion edits write `user_portions`,
 *     food swaps write the miss log. This sheet is the app's main sensor.
 *
 * It opens BEFORE the resolve returns; skeletons filling in read as progress.
 */
export function ConfirmSheetScreen({ navigation, route }: ScreenProps<'Confirm'>) {
  const { c, space } = useTheme();
  const api = useApi();
  const { commit } = useAppState();
  const { phrase, source } = route.params;

  const [lines, setLines] = useState<Line[] | null>(null);
  const [unresolved, setUnresolved] = useState<UnresolvedItem[]>([]);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [meal] = useState<MealSlot>(mealSlotFor());
  const [committing, setCommitting] = useState(false);
  const [visible, setVisible] = useState(true);

  /** Hydrate a resolver draft into editable lines, pulling portions per food. */
  const hydrate = useCallback(
    async (draft: ResolveDraft) => {
      const details = await Promise.all(
        draft.items.map(i => (i.food ? api.getFood(i.food.id).catch(() => null) : Promise.resolve(null))),
      );
      setLines(
        draft.items.map((item, i) => ({
          itemId: item.itemId,
          matchedText: item.matchedText,
          food: item.food,
          detail: details[i],
          candidates: item.candidates,
          confidence: item.confidence,
          quantity: item.quantity,
          grams: item.quantity.grams,
          nutrients: item.nutrients,
          learnedUnitLabel: null,
        })),
      );
      setUnresolved(draft.unresolved);
      setDraftId(draft.draftId);
    },
    [api],
  );

  useEffect(() => {
    let alive = true;

    api
      .resolve(phrase, source, parsed => {
        // Frame one: quantities known, foods not. Real rows replace skeletons
        // the moment there is anything true to put in them.
        if (!alive) return;
        setLines(
          parsed.items.map(item => ({
            itemId: item.itemId,
            matchedText: item.matchedText,
            food: null,
            detail: null,
            candidates: [],
            confidence: 'high',
            quantity: item.quantity,
            grams: item.quantity.grams,
            nutrients: null,
            learnedUnitLabel: null,
          })),
        );
      })
      .then(draft => {
        if (alive) return hydrate(draft);
      })
      .catch(err => {
        if (!alive) return;
        // Every failure keeps the phrase and lands on a route that cannot fail.
        // Losing typed input is the failure that makes people delete a tracker.
        const notice = isProblem(err, 'resolver-refused', 'validation-failed')
          ? 'unparsed'
          : isProblem(err, 'quota-exhausted', 'rate-limited')
            ? 'quota'
            : isProblem(err, 'resolver-timeout', 'resolver-unavailable') || err instanceof OfflineError
              ? 'timeout'
              : 'unparsed';
        navigation.replace('Search', { prefill: phrase, notice });
      });

    return () => {
      alive = false;
    };
  }, [api, hydrate, navigation, phrase, source]);

  const setLine = (itemId: string, patch: (l: Line) => Line) =>
    setLines(ls => (ls ? ls.map(l => (l.itemId === itemId ? patch(l) : l)) : ls));

  const onPickPortion = (itemId: string) => (g: number, label: string, learned: boolean) =>
    setLine(itemId, l => ({
      ...l,
      grams: g,
      nutrients: l.detail ? scale(l.detail.nutrients, g) : l.nutrients,
      quantity: {
        ...l.quantity,
        raw: label,
        grams: g,
        source: learned ? 'user_portion' : 'food_portion',
        // The range was honest while we did not know. Now we do.
        range: null,
      },
      learnedUnitLabel: learned ? label : l.learnedUnitLabel,
    }));

  const onPickCandidate = (itemId: string) => async (food: FoodSummary) => {
    const detail = await api.getFood(food.id).catch(() => null);
    setLine(itemId, l => ({
      ...l,
      food,
      detail,
      confidence: 'high',
      nutrients: detail && l.grams !== null ? scale(detail.nutrients, l.grams) : l.nutrients,
    }));
  };

  const totals = useMemo(
    () => total((lines ?? []).map(l => l.nutrients).filter(Boolean) as NonNullable<Line['nutrients']>[]),
    [lines],
  );

  const missing = (lines ?? []).filter(l => l.grams === null).length;
  const ready = lines !== null && lines.length > 0 && missing === 0;

  const onCommit = async () => {
    if (!lines || !ready) return;
    setCommitting(true);
    await commit({
      clientId: uuid(),
      loggedAt: new Date().toISOString(),
      meal,
      source,
      // Kept on the entry: the reproducible input for a later correction, and
      // the miss-log row when nothing matched.
      phrase,
      draftId,
      items: lines
        .filter(l => l.food && l.grams !== null && l.nutrients)
        .map(l => ({
          food: l.food!,
          grams: l.grams!,
          quantityType: l.quantity.type,
          quantitySource: l.quantity.source,
          learnedUnitLabel: l.learnedUnitLabel,
          nutrients: l.nutrients!,
        })),
    });
    setCommitting(false);
    setVisible(false);
    // A queued commit is not an error here — the Today banner explains the queue.
    navigation.navigate('Main');
  };

  return (
    <View style={{ flex: 1 }}>
      <Sheet visible={visible} onDismiss={() => navigation.goBack()} height={0.9} dismissible={!committing}>
        <Gutter style={{ paddingTop: space.sm, paddingBottom: space.lg }}>
          <Split align="flex-start" gap={space.md}>
            <Stack gap={5} style={{ flexShrink: 1 }}>
              <SectionLabel>{source === 'voice' ? 'You said' : 'You typed'}</SectionLabel>
              <Txt role="h3" tone="secondary" style={{ fontStyle: 'italic' }}>
                “{phrase}”
              </Txt>
            </Stack>
            <TextButton
              label="Edit"
              role="labelSm"
              onPress={() => navigation.replace('Composer', { prefill: phrase })}
            />
          </Split>
        </Gutter>

        <Divider />

        <ScrollView
          style={{ flexGrow: 1, flexShrink: 1 }}
          contentContainerStyle={{ paddingHorizontal: space.gutter, paddingVertical: space.lg }}>
          {lines === null ? (
            <>
              <Row gap={space.sm} style={{ paddingBottom: space.md }}>
                <Icon name="sparkle" size={16} color={c.primary} weight={2} />
                <Txt role="labelSm" tone="primary">
                  Reading your meal
                </Txt>
              </Row>
              {[0, 1, 2].map(i => (
                <SkeletonRow key={i} index={i} widths={i === 1 ? ['46%', '40%'] : ['60%', '34%']} />
              ))}
              <View style={{ alignItems: 'center', paddingTop: space.xxl }}>
                <Txt role="caption" tone="tertiary">
                  matching against 8,412 foods
                </Txt>
              </View>
            </>
          ) : (
            <Stack gap={space.md}>
              {lines.map(line => (
                <ConfirmRow
                  key={line.itemId}
                  line={line}
                  onPickPortion={onPickPortion(line.itemId)}
                  onPickCandidate={onPickCandidate(line.itemId)}
                  onSearchInstead={() => navigation.replace('Search', { prefill: line.matchedText })}
                />
              ))}

              {unresolved.map(u => (
                <UnresolvedRow
                  key={u.text}
                  text={u.text}
                  onSearch={() => navigation.replace('Search', { prefill: u.text })}
                />
              ))}

              <View style={{ alignItems: 'center', paddingTop: space.sm }}>
                <TextButton
                  label="Add something we missed"
                  icon="plus"
                  onPress={() => navigation.replace('Search')}
                />
              </View>
            </Stack>
          )}
        </ScrollView>

        <Divider />

        <Gutter style={{ paddingTop: space.lg }}>
          <TotalsRow
            kcal={lines ? kcal(totals.kcal) : DASH}
            protein={lines ? grams(totals.proteinG) : DASH}
            carbs={lines ? grams(totals.carbsG) : DASH}
            fat={lines ? grams(totals.fatG) : DASH}
            fibre={lines ? grams(totals.fiberG) : DASH}
            fibreUnknown={totals.fiberUnmeasuredItems}
          />

          {totals.fiberUnmeasuredItems > 0 && (
            <Row gap={6} style={{ paddingTop: space.md }}>
              <Icon name="info" size={13} color={c.attention} weight={2.1} />
              <Txt role="caption" tone="attention" style={{ flexShrink: 1 }}>
                Fibre unknown on {plural(totals.fiberUnmeasuredItems, 'item')} — left out, not counted as zero.
              </Txt>
            </Row>
          )}

          {missing > 0 && (
            <Row gap={6} style={{ paddingTop: space.sm }}>
              <Icon name="info" size={13} color={c.attention} weight={2.1} />
              <Txt role="caption" tone="attention">
                {plural(missing, 'item')} still {missing === 1 ? 'needs' : 'need'} a portion.
              </Txt>
            </Row>
          )}

          <Gap h={space.lg} />
          <Button
            label="Add to today"
            disabled={!ready}
            loading={committing}
            onPress={onCommit}
            haptic="commit"
          />
          <Gap h={space.sm} />
        </Gutter>
      </Sheet>
    </View>
  );
}
