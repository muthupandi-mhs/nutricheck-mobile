import React, { useState } from 'react';
import { View } from 'react-native';
import type { FoodDetail, FoodSummary, Nutrients, Quantity } from '../../api/types';
import { TextButton } from '../../components/Button';
import { Badge, Chip } from '../../components/Chip';
import { FoodGlyph } from '../../components/FoodGlyph';
import { Icon } from '../../components/Icon';
import { Row, Split, Stack } from '../../components/Layout';
import { Press } from '../../components/Press';
import { Txt } from '../../components/Text';
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
 * The food's leading word, not the phrase's last one: "grilled chicken thigh"
 * ends in "thigh", and "Which thigh?" is not the question anybody is asking.
 */
function ambiguousNoun(line: Line): string {
  const fromFood = line.food?.name.split(/[,\s]/)[0];
  const fromPhrase = line.matchedText.replace(/[^a-z ]/gi, '').trim().split(' ').pop();
  return (fromFood || fromPhrase || 'this').toLowerCase();
}

/**
 * How we came by this number. The same "210 g" means four different things:
 *
 *   stated        they said it — plainly, no range, no hedging
 *   food_portion  the food table said it — a standard measure, quietly sourced
 *   user_portion  they taught us once — "your usual"
 *   unknown       nobody said — ask, never fill it in on their behalf
 *
 * Doubt about a number the user supplied is noise; hiding doubt about one we
 * guessed is how a wrong week starts.
 */
function Provenance({ line }: { line: Line }) {
  const { c } = useTheme();
  const { quantity: q, grams: g } = line;

  if (q.source === 'stated') {
    return (
      <Row gap={4}>
        <Icon name="check" size={12} color={c.primary} weight={2.8} />
        <Txt role="caption" tone="primary">
          {q.type === 'count' ? 'you counted it' : 'you said it'}
        </Txt>
      </Row>
    );
  }
  if (q.source === 'user_portion') {
    return (
      <Row gap={6}>
        <Txt role="caption" tone="tertiary">
          {g !== null ? `${grams(g)} g` : DASH}
        </Txt>
        <Badge label="your usual" tone="success" />
      </Row>
    );
  }
  if (q.source === 'food_portion') {
    return (
      <Txt role="caption" tone="tertiary">
        {g !== null ? `${grams(g)} g` : DASH}
      </Txt>
    );
  }
  return (
    <Txt role="caption" tone="attention">
      {q.range
        ? `usually ${Math.round(q.range[0])}–${Math.round(q.range[1])} g`
        : 'you did not say how much'}
    </Txt>
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
  const { c, radius, space } = useTheme();
  const [expanded, setExpanded] = useState(line.confidence === 'low');

  const needsPortion = line.grams === null;
  const flagged = line.confidence === 'low';
  const unsure = flagged || needsPortion;
  const fibreUnknown = line.detail?.nutrients.fiberState === 'unknown';

  const portions = (line.detail?.portions ?? []).slice(0, 3);

  /** The vessel word from the phrase, if there was one — "a bowl" → "bowl". */
  const vessel =
    line.quantity.type === 'personal_unit'
      ? line.quantity.raw.replace(/^(a|an|\d+)\s+/, '').replace(/s$/, '')
      : null;

  return (
    <View
      style={{
        // Matches `Card`. The amber fill on an unsure row is the whole point
        // of the row, and it carried no border even before cards lost theirs.
        backgroundColor: unsure ? c.attentionSoft : c.surface,
        borderRadius: radius.lg,
        padding: space.lg,
        gap: space.md,
      }}>
      {flagged && (
        <Row gap={6}>
          <Icon name="alert" size={14} color={c.attention} weight={2.1} />
          {/* One interpolated string, not three children: a split Text node is
              announced as three separate fragments by a screen reader. */}
          <Txt role="labelSm" tone="attention">{`Which ${ambiguousNoun(line)}?`}</Txt>
        </Row>
      )}

      <Row gap={space.md} align="flex-start">
        <FoodGlyph
          name={line.food?.name ?? line.matchedText}
          seed={line.food?.id ?? line.itemId}
          size={44}
        />

        <Stack gap={7} style={{ flexGrow: 1, flexShrink: 1 }}>
          <Txt role="h3" numberOfLines={2}>
            {line.food?.name ?? line.matchedText}
          </Txt>

          <Row gap={space.sm} wrap>
            {needsPortion ? (
              <Chip label="How much?" variant="ask" onPress={() => setExpanded(true)} accessibilityLabel="Set a portion" />
            ) : (
              <Chip
                label={line.quantity.raw}
                variant={line.quantity.source === 'user_portion' ? 'attention' : 'default'}
                onPress={() => setExpanded(e => !e)}
                accessibilityLabel={`Portion: ${line.quantity.raw}. Tap to change.`}
              />
            )}
            <Provenance line={line} />
          </Row>

          {(needsPortion || expanded) && portions.length > 0 && (
            <Row gap={space.sm} wrap>
              {portions.map(p => (
                <Chip
                  key={p.label}
                  label={p.label}
                  variant={line.grams === p.grams ? 'selected' : 'default'}
                  onPress={() => onPickPortion(p.grams, p.label, Boolean(vessel))}
                  accessibilityLabel={`${p.label}, ${grams(p.grams)} grams`}
                />
              ))}
              {vessel && line.quantity.range && (
                <Chip
                  label={`my ${vessel} ≈ ${Math.round((line.quantity.range[0] + line.quantity.range[1]) / 2)} g`}
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
            <Txt role="caption" tone="secondary">
              Set it once and we will remember what your {vessel} holds.
            </Txt>
          )}

          {line.nutrients && (
            <Row gap={space.sm} wrap>
              <Txt role="caption" tone="tertiary">
                P {grams(line.nutrients.proteinG)} g
              </Txt>
              {fibreUnknown ? (
                <Txt role="caption" tone="attention">
                  Fibre {DASH} not in the source data
                </Txt>
              ) : (
                <Txt role="caption" tone="tertiary">
                  F {grams(line.nutrients.fiberG ?? 0)} g
                </Txt>
              )}
            </Row>
          )}
        </Stack>

        <Stack gap={0} align="flex-end">
          <Txt role="h2" numeric tone={line.nutrients ? 'ink' : 'tertiary'}>
            {line.nutrients ? kcal(line.nutrients.kcal) : DASH}
          </Txt>
          <Txt role="caption" tone="tertiary">
            kcal
          </Txt>
        </Stack>
      </Row>

      {/* Runner-up candidates. Shipped with the draft, so this is instant. */}
      {flagged && expanded && line.candidates.length > 1 && (
        <Row gap={space.sm} align="stretch">
          {line.candidates.slice(0, 3).map(cand => {
            const active = cand.id === line.food?.id;
            return (
              <Press
                key={cand.id}
                onPress={() => onPickCandidate(cand)}
                haptic="select"
                accessibilityLabel={`${cand.name}, ${Math.round(cand.kcalPer100g)} calories per 100 grams`}
                style={{
                  flexGrow: 1,
                  flexBasis: 0,
                  backgroundColor: active ? c.ink : c.surface,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: active ? c.ink : c.border,
                  paddingVertical: space.md,
                  paddingHorizontal: space.md,
                }}>
                <Txt role="labelSm" numberOfLines={2} color={active ? c.canvas : c.ink}>
                  {cand.name.split(',').slice(-1)[0].trim()}
                </Txt>
                <Txt role="caption" color={active ? c.inkTertiary : c.inkTertiary} numeric>
                  {kcal(cand.kcalPer100g)}/100 g
                </Txt>
              </Press>
            );
          })}
          <Press
            onPress={onSearchInstead}
            accessibilityLabel="Search for a different food"
            style={{
              width: 46,
              backgroundColor: c.surface,
              borderRadius: radius.md,
              borderWidth: 1,
              borderColor: c.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Icon name="search" size={17} color={c.inkSecondary} />
          </Press>
        </Row>
      )}
    </View>
  );
}

/**
 * A word from the phrase that matched nothing. Neither dropped nor invented —
 * either would be a silent lie about what was logged. It becomes a scoped search.
 */
export function UnresolvedRow({ text, onSearch }: { text: string; onSearch: () => void }) {
  const { c, radius, space } = useTheme();
  return (
    <View
      style={{
        backgroundColor: c.sunken,
        borderRadius: radius.lg,
        padding: space.lg,
      }}>
      <Split gap={space.md}>
        <Stack gap={3} style={{ flexShrink: 1 }}>
          <Txt role="caption" tone="tertiary">
            No match for
          </Txt>
          <Txt role="h3" style={{ fontStyle: 'italic' }}>
            “{text}”
          </Txt>
        </Stack>
        <TextButton label="Search" onPress={onSearch} role="labelSm" />
      </Split>
    </View>
  );
}
