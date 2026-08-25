import React, { useState } from 'react';
import { View } from 'react-native';
import type { FoodDetail, FoodSummary, Nutrients, Quantity } from '../../api/types';
import { PressableRow, TextAction } from '../../components/Button';
import { Chip } from '../../components/Chip';
import { Icon } from '../../components/Icon';
import { Row, SplitRow } from '../../components/Layout';
import { Body, Mono, Num, Title } from '../../components/Type';
import { DASH, grams, kcal } from '../../lib/format';
import { useTheme } from '../../theme/ThemeProvider';

/** One editable line of the sheet. */
export type Line = {
  itemId: string;
  matchedText: string;
  food: FoodSummary | null;
  detail: FoodDetail | null;
  candidates: FoodSummary[];
  confidence: 'high' | 'low';
  quantity: Quantity;
  grams: number | null;
  nutrients: Nutrients | null;
  /** Set when the user pins a personal unit — writes back to user_portions. */
  learnedUnitLabel: string | null;
};

/**
 * The provenance line under a portion.
 *
 * This is the sheet doing its actual job. The same "210 g" means four different
 * things depending on how it got there, and the user's willingness to accept it
 * without checking depends entirely on which one it is:
 *
 *   stated       they said it — show it plainly, no range, no hedging
 *   food_portion the food table said it — a standard measure, quietly sourced
 *   user_portion they taught us, once — "your usual", and it stays right
 *   unknown      nobody said — ask, and never fill it in on their behalf
 *
 * Showing uncertainty on a number the user supplied is noise. Hiding it on one
 * we guessed is how a wrong week starts.
 */
function Provenance({ q, grams: g }: { q: Quantity; grams: number | null }) {
  const { c } = useTheme();

  if (q.source === 'stated') {
    return (
      <Row gap={4}>
        <Icon name="check" size={11} color={c.det} weight={3} />
        <Mono size={10} tone="det">
          {q.type === 'count' ? 'you counted it' : 'you said it'}
        </Mono>
      </Row>
    );
  }
  if (q.source === 'user_portion') {
    return (
      <Row gap={6}>
        <Mono size={11} tone="ink3">
          {g !== null ? `${grams(g)} g` : DASH}
        </Mono>
        <Chip label="your usual" variant="est" size={10} style={{ paddingVertical: 3, paddingHorizontal: 6 }} />
      </Row>
    );
  }
  if (q.source === 'food_portion') {
    return (
      <Mono size={11} tone="ink3">
        {g !== null ? `${grams(g)} g` : DASH}
      </Mono>
    );
  }
  // unknown — either nothing was said, or a vessel we have not learned.
  return (
    <Mono size={10} tone="est">
      {q.range ? `usually ${Math.round(q.range[0])}–${Math.round(q.range[1])} g — pick one` : "you didn't say"}
    </Mono>
  );
}

export function ConfirmRow({
  line,
  onPickPortion,
  onPickCandidate,
  onSearchInstead,
}: {
  line: Line;
  onPickPortion: (grams: number, label: string, learned: boolean) => void;
  onPickCandidate: (food: FoodSummary) => void;
  onSearchInstead: () => void;
}) {
  const { c, space, rule } = useTheme();
  const [expanded, setExpanded] = useState(line.confidence === 'low');

  const needsPortion = line.grams === null;
  const flagged = line.confidence === 'low';
  const fiberUnknown = line.detail?.nutrients.fiberState === 'unknown';

  const portions = line.detail?.portions ?? [];
  const quickPortions = portions.slice(0, 3);

  /** The vessel word from the phrase, if there was one — "a bowl" → "bowl". */
  const vessel = line.quantity.type === 'personal_unit' ? line.quantity.raw.replace(/^(a|an|\d+)\s+/, '').replace(/s$/, '') : null;

  return (
    <View
      style={
        flagged || needsPortion
          ? {
              backgroundColor: c.estBg,
              borderLeftWidth: rule.edge,
              borderLeftColor: c.est,
              borderBottomWidth: 1,
              borderBottomColor: c.rule,
              marginHorizontal: -space.gutter,
              paddingHorizontal: space.gutter,
              paddingTop: 15,
              paddingBottom: 14,
            }
          : { borderBottomWidth: 1, borderBottomColor: c.rule, paddingTop: 15, paddingBottom: 14 }
      }>
      {flagged && (
        <Row gap={6} style={{ paddingBottom: 9 }}>
          <Icon name="alert" size={12} color={c.est} weight={2.3} />
          <Mono size={10} tone="est" style={{ letterSpacing: 0.9 }}>
            {`WHICH ${line.matchedText.replace(/[^a-z ]/gi, '').trim().split(' ').pop()?.toUpperCase()}? — PICK ONE`}
          </Mono>
        </Row>
      )}

      <Row gap={space.md} align="flex-start">
        <View style={{ flexGrow: 1, flexShrink: 1, gap: 7 }}>
          <Title size={16} weight="700">
            {line.food?.name ?? line.matchedText}
          </Title>

          <Row gap={7} wrap>
            {needsPortion ? (
              <Chip label="How much?" variant="empty" onPress={() => setExpanded(true)} accessibilityLabel="Set a portion" />
            ) : (
              <Chip
                label={line.quantity.raw}
                variant={line.quantity.source === 'user_portion' ? 'est' : 'plain'}
                onPress={() => setExpanded(e => !e)}
                accessibilityLabel={`Portion: ${line.quantity.raw}. Tap to change.`}
              />
            )}
            <Provenance q={line.quantity} grams={line.grams} />
          </Row>

          {/* Portion options: household units first, grams behind them. */}
          {(needsPortion || expanded) && portions.length > 0 && (
            <Row gap={6} wrap style={{ paddingTop: 1 }}>
              {quickPortions.map(p => (
                <Chip
                  key={p.label}
                  label={p.label}
                  size={11}
                  variant={line.grams === p.grams ? 'selected' : 'plain'}
                  onPress={() => onPickPortion(p.grams, p.label, Boolean(vessel))}
                  accessibilityLabel={`${p.label}, ${grams(p.grams)} grams`}
                />
              ))}
              {vessel && line.quantity.range && (
                <Chip
                  label={`a ${vessel} ≈ ${Math.round((line.quantity.range[0] + line.quantity.range[1]) / 2)} g`}
                  size={11}
                  onPress={() =>
                    onPickPortion(
                      Math.round((line.quantity.range![0] + line.quantity.range![1]) / 2),
                      vessel,
                      true,
                    )
                  }
                  accessibilityLabel={`Set your ${vessel} to the middle of the usual range and remember it`}
                />
              )}
            </Row>
          )}

          {vessel && line.quantity.source === 'unknown' && (
            <Mono size={10} tone="ink3">
              Set it once and we will remember what your {vessel} holds.
            </Mono>
          )}

          {line.nutrients && (
            <Mono size={10.5} tone="ink3">
              P {grams(line.nutrients.proteinG)} g ·{' '}
              {fiberUnknown ? (
                <>
                  Fiber <Mono size={10.5} tone="est">{DASH}</Mono> not in the source data
                </>
              ) : (
                `F ${grams(line.nutrients.fiberG ?? 0)} g`
              )}
            </Mono>
          )}
        </View>

        <View style={{ alignItems: 'flex-end' }}>
          <Num size={17} weight="600" tone={line.nutrients ? 'ink' : 'ink3'}>
            {line.nutrients ? kcal(line.nutrients.kcal) : DASH}
          </Num>
          <Mono size={9.5} tone="ink3">
            kcal
          </Mono>
        </View>
      </Row>

      {/* Runner-up candidates. Shipped with the draft, so this is instant. */}
      {flagged && expanded && line.candidates.length > 1 && (
        <Row gap={7} style={{ paddingTop: 11 }} align="stretch">
          {line.candidates.slice(0, 3).map(cand => {
            const active = cand.id === line.food?.id;
            return (
              <PressableRow
                key={cand.id}
                onPress={() => onPickCandidate(cand)}
                accessibilityLabel={`${cand.name}, ${Math.round(cand.kcalPer100g)} calories per 100 grams`}
                style={{
                  flexGrow: 1,
                  flexBasis: 0,
                  backgroundColor: c.surface,
                  borderWidth: active ? 2 : 1,
                  borderColor: active ? c.heavy : c.rule,
                  paddingVertical: 8,
                  paddingHorizontal: 9,
                }}>
                <Title size={12} weight="600" numberOfLines={2}>
                  {cand.name.split(',').slice(-1)[0].trim()}
                </Title>
                <Mono size={9.5} tone="ink3" style={{ paddingTop: 2 }}>
                  {kcal(cand.kcalPer100g)} /100 g
                </Mono>
              </PressableRow>
            );
          })}
          <PressableRow
            onPress={onSearchInstead}
            accessibilityLabel="Search for a different food"
            style={{
              width: 40,
              backgroundColor: c.surface,
              borderWidth: 1,
              borderColor: c.rule,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Icon name="search" size={15} color={c.ink2} weight={2} />
          </PressableRow>
        </Row>
      )}
    </View>
  );
}

/**
 * A word from the phrase that matched nothing.
 *
 * It is not dropped and no row is invented for it — either would be a silent
 * lie about what was logged. It becomes a scoped search instead, which is both
 * the honest answer and the fastest way to a correct one.
 */
export function UnresolvedRow({ text, onSearch }: { text: string; onSearch: () => void }) {
  const { c, space, rule } = useTheme();
  return (
    <View
      style={{
        borderBottomWidth: 1,
        borderBottomColor: c.rule,
        borderLeftWidth: rule.edge,
        borderLeftColor: c.ink3,
        marginHorizontal: -space.gutter,
        paddingHorizontal: space.gutter,
        paddingVertical: 14,
      }}>
      <SplitRow align="center">
        <View style={{ flexShrink: 1, gap: 4, paddingRight: space.md }}>
          <Mono size={10} tone="ink3" style={{ letterSpacing: 0.9 }}>
            NO MATCH FOR
          </Mono>
          <Body size={15.5} style={{ fontStyle: 'italic' }}>
            “{text}”
          </Body>
        </View>
        <TextAction label="Search" onPress={onSearch} />
      </SplitRow>
    </View>
  );
}
