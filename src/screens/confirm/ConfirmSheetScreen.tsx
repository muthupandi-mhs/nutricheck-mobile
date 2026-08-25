import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useApi } from '../../api/client';
import {
  OfflineError,
  isProblem,
  type FoodSummary,
  type MealSlot,
  type ResolveDraft,
  type UnresolvedItem,
} from '../../api/types';
import { PrimaryButton, TextAction } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { Divider, Gap, Gutter, Row, SplitRow } from '../../components/Layout';
import { Sheet } from '../../components/Sheet';
import { SkeletonItemRow } from '../../components/Skeleton';
import { Body, Display, Eyebrow, Mono } from '../../components/Type';
import { DASH, grams, kcal, mealSlotFor, plural } from '../../lib/format';
import { uuid } from '../../lib/id';
import { scale, total } from '../../lib/nutrition';
import { useTheme } from '../../theme/ThemeProvider';
import { useAppState } from '../../state/AppState';
import { ConfirmRow, UnresolvedRow, type Line } from './ConfirmRow';
import type { ScreenProps } from '../../navigation/types';

/**
 * The confirm sheet — where a parse becomes a user assertion.
 *
 * Three rules, and none of them bends:
 *
 *  1. **Never auto-commit a parse.** Not on high confidence, not on a repeated
 *     phrase, not to win a second in the timing table. The user's number has to
 *     be a thing they asserted, or the whole log is the model's opinion.
 *  2. **Show ranges only where they are real.** A range on "180 g of chicken"
 *     is noise. A range on "a bowl of dal", before we have learned their bowl,
 *     is honesty. The quantity type tells us which case we are in.
 *  3. **Every correction is training data.** A portion edit writes to
 *     `user_portions`; a food swap writes the miss log that feeds the curated
 *     dish backlog. This sheet is the app's main sensor, not just a form.
 *
 * It opens *before* the resolve call returns. Two seconds of skeleton rows
 * filling in reads as progress; two seconds of nothing reads as a stall.
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
        // Frame one: quantities are known, foods are not. Real rows replace
        // skeletons the moment there is anything true to put in them.
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
        // A user who typed a sentence has already done the work; losing it is
        // the failure that makes people delete a tracker.
        if (isProblem(err, 'resolver-timeout', 'resolver-unavailable')) {
          navigation.replace('Search', { prefill: phrase, notice: 'timeout' });
        } else if (isProblem(err, 'resolver-refused', 'validation-failed')) {
          navigation.replace('Search', { prefill: phrase, notice: 'unparsed' });
        } else if (isProblem(err, 'quota-exhausted', 'rate-limited')) {
          navigation.replace('Search', { prefill: phrase, notice: 'quota' });
        } else if (err instanceof OfflineError) {
          navigation.replace('Search', { prefill: phrase, notice: 'timeout' });
        } else {
          navigation.replace('Search', { prefill: phrase, notice: 'unparsed' });
        }
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

  const missingPortions = (lines ?? []).filter(l => l.grams === null).length;
  const ready = lines !== null && lines.length > 0 && missingPortions === 0;

  const onCommit = async () => {
    if (!lines || !ready) return;
    setCommitting(true);
    await commit({
      clientId: uuid(),
      loggedAt: new Date().toISOString(),
      meal,
      source,
      // Kept on the entry: the reproducible input for any later correction, the
      // miss-log row when nothing matched, and — unlike a photo — searchable.
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
    // A queued commit is not an error state here: the Home banner explains the
    // queue, and there is nothing for the user to redo either way.
    navigation.navigate('Home');
  };

  return (
    <View style={{ flex: 1 }}>
      <Sheet visible={visible} onDismiss={() => navigation.goBack()} height={0.92} dismissible={!committing}>
        {/* ── the phrase, kept verbatim ─────────────────────────────────── */}
        <Gutter style={{ paddingTop: space.md, paddingBottom: space.md }}>
          <SplitRow align="flex-start">
            <View style={{ flexShrink: 1, paddingRight: space.md }}>
              <Eyebrow size={10} tone="ink3">
                {source === 'voice' ? 'YOU SAID' : 'YOU TYPED'}
              </Eyebrow>
              <Gap h={4} />
              <Body size={15.5} tone="ink2" style={{ fontStyle: 'italic' }}>
                “{phrase}”
              </Body>
            </View>
            <TextAction
              label="Edit"
              onPress={() => navigation.replace('Composer', { prefill: phrase })}
              size={11}
            />
          </SplitRow>
        </Gutter>

        <Divider />

        <ScrollView contentContainerStyle={{ paddingHorizontal: space.gutter }}>
          {lines === null ? (
            <>
              <View style={{ paddingTop: space.sm }}>
                <Row gap={9} style={{ paddingBottom: space.md }}>
                  <Icon name="sparkle" size={15} color={c.est} weight={2.2} />
                  <Eyebrow size={11} tone="est">
                    READING YOUR MEAL
                  </Eyebrow>
                </Row>
              </View>
              {[0, 1, 2].map(i => (
                <SkeletonItemRow key={i} index={i} widths={i === 1 ? ['44%', '41%'] : ['58%', '34%']} />
              ))}
              <View style={{ alignItems: 'center', paddingTop: 26 }}>
                <Mono size={10.5} tone="ink3">
                  matching against 8,412 foods
                </Mono>
              </View>
            </>
          ) : (
            <>
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

              <Row
                gap={space.sm}
                style={{ paddingVertical: 13 }}
                accessibilityRole="button"
                accessibilityLabel="Add something we missed">
                <Icon name="plus" size={14} color={c.ink2} weight={2.2} />
                <TextAction
                  label="Add something we missed"
                  tone="ink2"
                  size={14.5}
                  onPress={() => navigation.replace('Search', { prefill: '' })}
                />
              </Row>
            </>
          )}
        </ScrollView>

        <Divider />

        {/* ── running totals ────────────────────────────────────────────── */}
        <Gutter style={{ paddingTop: 13 }}>
          <Row gap={space.xl}>
            {[
              { label: 'CALORIES', value: lines ? kcal(totals.kcal) : DASH, unit: '' },
              { label: 'PROTEIN', value: lines ? grams(totals.proteinG) : DASH, unit: 'g' },
              { label: 'FIBER', value: lines ? grams(totals.fiberG) : DASH, unit: 'g' },
            ].map(stat => (
              <View key={stat.label} style={{ gap: 2 }}>
                <Eyebrow size={9.5} tone="ink2">
                  {stat.label}
                </Eyebrow>
                <Row gap={3} align="baseline">
                  <Display size={24} tone={lines ? 'ink' : 'ink3'}>
                    {stat.value}
                  </Display>
                  {stat.unit ? (
                    <Mono size={14} tone="ink2">
                      {stat.unit}
                    </Mono>
                  ) : null}
                </Row>
              </View>
            ))}
          </Row>

          {totals.fiberUnmeasuredItems > 0 && (
            <Row gap={6} style={{ paddingTop: 7 }}>
              <Icon name="info" size={11} color={c.est} weight={2.2} />
              <Mono size={10} tone="est">
                fiber unknown on {plural(totals.fiberUnmeasuredItems, 'item')} — left out, not counted as zero
              </Mono>
            </Row>
          )}

          {missingPortions > 0 && (
            <Row gap={6} style={{ paddingTop: 7 }}>
              <Icon name="info" size={11} color={c.est} weight={2.2} />
              <Mono size={10} tone="est">
                {plural(missingPortions, 'item')} still {missingPortions === 1 ? 'needs' : 'need'} a portion
              </Mono>
            </Row>
          )}
        </Gutter>

        <Gutter style={{ paddingTop: 14, paddingBottom: 26 }}>
          <PrimaryButton
            label="Add to today"
            disabled={!ready}
            loading={committing}
            onPress={onCommit}
          />
        </Gutter>
      </Sheet>

    </View>
  );
}

