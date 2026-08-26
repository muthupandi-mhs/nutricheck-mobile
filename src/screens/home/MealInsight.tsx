import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useApi } from '../../api/client';
import type { MacroShare, MealInsight as Insight, MealSlot } from '../../api/types';
import { Icon } from '../../components/Icon';
import { Row, Stack } from '../../components/Layout';
import { Txt } from '../../components/Text';
import { useTheme } from '../../theme/ThemeProvider';

/**
 * The note under a meal card.
 *
 * Two things, in a deliberate order: the SHARES first, because they are
 * computed from frozen log values and are true regardless of what any model
 * did, then the sentence — which is commentary on them and may not arrive at
 * all.
 *
 * That order is the honesty of the feature. If the prose is missing the card
 * still says something useful; if the prose is present it is read against
 * numbers already on screen, so a sentence that disagreed with them would be
 * visibly wrong rather than quietly believed.
 */
export function MealInsight({ meal, date, kcalOfMeal }: {
  meal: MealSlot;
  date: string;
  /** Refetches when the meal's calories change — an edited portion is a new note. */
  kcalOfMeal: number;
}) {
  const api = useApi();
  const { c, space } = useTheme();
  const [insight, setInsight] = useState<Insight | null>(null);

  useEffect(() => {
    let alive = true;
    // Never `.catch` into an error state: `getMealInsight` already resolves
    // with empty text on failure, and a note is not worth a red box.
    void api.getMealInsight(date, meal).then(result => {
      if (alive) setInsight(result);
    });
    return () => {
      alive = false;
    };
  }, [api, date, meal, kcalOfMeal]);

  if (!insight || insight.facts.entryCount === 0) return null;

  const { facts, text } = insight;
  const shares = ([
    ['Protein', facts.proteinG],
    ['Carbs', facts.carbsG],
    ['Fat', facts.fatG],
    ['Fibre', facts.fiberG],
  ] as const).filter(([, share]) => share.target !== null);

  if (shares.length === 0 && !text) return null;

  return (
    <View
      style={{
        paddingHorizontal: space.xl,
        paddingTop: space.md,
        paddingBottom: space.sm,
        gap: space.sm,
      }}>
      <Row gap={space.md} wrap>
        {shares.map(([label, share]) => (
          <ShareChip key={label} label={label} share={share} />
        ))}
      </Row>

      {text ? (
        <Row gap={6} align="flex-start">
          <View style={{ paddingTop: 2 }}>
            <Icon name="sparkle" size={12} color={c.primary} weight={2} />
          </View>
          <Txt role="caption" tone="secondary" style={{ flexShrink: 1 }}>
            {text}
          </Txt>
        </Row>
      ) : null}
    </View>
  );
}

/**
 * One nutrient's share of the day.
 *
 * An unmeasured nutrient shows an em dash in the attention colour, never 0%.
 * The app's fibre rule applies to every macro here: nobody measured it is a
 * different statement from there was none of it, and only one of them is
 * something we are entitled to say.
 */
function ShareChip({ label, share }: { label: string; share: MacroShare }) {
  const { c } = useTheme();
  const unmeasured = share.amount === null;

  return (
    <Stack gap={1}>
      <Txt role="caption" tone="tertiary">
        {label}
      </Txt>
      <Row gap={3} align="baseline">
        <Txt
          role="label"
          numeric
          style={{ color: unmeasured ? c.attention : c.ink }}>
          {unmeasured ? '—' : `${share.percentOfTarget}%`}
        </Txt>
        {!unmeasured && share.unmeasuredItems > 0 ? (
          // Part of the meal was measured and part was not. The number stands,
          // but it is a floor rather than a total.
          <Txt role="caption" tone="attention">
            +
          </Txt>
        ) : null}
      </Row>
    </Stack>
  );
}
