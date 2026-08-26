import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useApi } from '../../api/client';
import type { FoodDetail, MealSlot, QuantitySource, QuantityType } from '../../api/types';
import { Button, IconButton } from '../../components/Button';
import { Card } from '../../components/Card';
import { Chip } from '../../components/Chip';
import { Disclaimer, TotalsRow } from '../../components/Feedback';
import { Field, Segmented } from '../../components/Field';
import { FoodGlyph } from '../../components/FoodGlyph';
import { Gap, Gutter, Row, Split, Stack } from '../../components/Layout';
import { Dock, Screen } from '../../components/Screen';
import { Shimmer } from '../../components/Skeleton';
import { SectionLabel, Txt } from '../../components/Text';
import { portionGramsField } from '../../forms/schemas';
import { DASH, grams, gramsOrDash, kcal, mealSlotFor } from '../../lib/format';
import { uuid } from '../../lib/id';
import { scale } from '../../lib/nutrition';
import { useTheme } from '../../theme/ThemeProvider';
import { useAppState } from '../../state/AppState';
import type { ScreenProps } from '../../navigation/types';

const SOURCE_LABEL: Record<FoodDetail['source'], string> = {
  usda_foundation: 'USDA Foundation',
  usda_sr: 'USDA SR Legacy',
  usda_fndds: 'USDA FNDDS',
  off: 'Open Food Facts',
  curated: 'Curated dish',
  user: 'Your own food',
};

/**
 * Portion, then commit. Household units lead and grams sit behind them —
 * "1 medium" is verifiable by looking at your plate, "118 g" is not. The gram
 * weight still shows beside the chip, since it is what the arithmetic uses.
 *
 * No confirm step follows: nothing here was estimated by a model.
 */
export function PortionScreen({ navigation, route }: ScreenProps<'Portion'>) {
  const { space } = useTheme();
  const api = useApi();
  const { commit } = useAppState();

  const [food, setFood] = useState<FoodDetail | null>(null);
  const [gramsValue, setGramsValue] = useState<number | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [custom, setCustom] = useState(false);
  const [customText, setCustomText] = useState('');
  const [customProblem, setCustomProblem] = useState<string | null>(null);
  const [meal, setMeal] = useState<MealSlot>(mealSlotFor());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getFood(route.params.foodId)
      .then(f => {
        setFood(f);
        const def = f.portions.find(p => p.isDefault) ?? f.portions[0];
        setGramsValue(def?.grams ?? 100);
        setChosen(def?.label ?? null);
      })
      // `food` stays null and the screen holds its skeleton. A red box here
      // would land on top of a half-finished log.
      .catch(() => {});
  }, [api, route.params.foodId]);

  const nutrients = useMemo(
    () => (food && gramsValue ? scale(food.nutrients, gramsValue) : null),
    [food, gramsValue],
  );

  const onCommit = async () => {
    if (!food || !gramsValue || !nutrients) return;
    setSaving(true);

    // A typed gram amount is a stated mass; a chip is the food table's own
    // portion. Recording which keeps `user_portions` honest.
    const quantityType: QuantityType = custom ? 'exact_mass' : 'standard_measure';
    const quantitySource: QuantitySource = custom ? 'stated' : 'food_portion';

    await commit({
      clientId: uuid(),
      loggedAt: new Date().toISOString(),
      meal,
      source: 'search',
      phrase: null,
      draftId: null,
      items: [
        {
          food: { id: food.id, name: food.name, brand: food.brand, kcalPer100g: food.kcalPer100g },
          grams: gramsValue,
          quantityType,
          quantitySource,
          learnedUnitLabel: null,
          nutrients,
        },
      ],
    });

    setSaving(false);
    navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
  };

  if (!food) {
    return (
      <Screen>
        <Gutter>
          <Stack gap={space.md}>
            <Shimmer width={56} height={56} />
            <Shimmer width="72%" height={26} delay={100} />
            <Shimmer width="44%" height={14} delay={180} />
          </Stack>
        </Gutter>
      </Screen>
    );
  }

  const fibreUnknown = food.nutrients.fiberState === 'unknown';

  return (
    <Screen scrollable>
      <Gutter>
        <Split align="flex-start" style={{ minHeight: 44 }}>
          <Row gap={space.md} align="flex-start" style={{ flexShrink: 1 }}>
            <FoodGlyph name={food.name} seed={food.id} size={52} />
            <Stack gap={4} style={{ flexShrink: 1 }}>
              <Txt role="h2" numberOfLines={3}>
                {food.name}
              </Txt>
              <Txt role="caption" tone="tertiary">
                {SOURCE_LABEL[food.source]}
                {food.brand ? ` · ${food.brand}` : ''} · {kcal(food.kcalPer100g)} kcal per 100 g
              </Txt>
            </Stack>
          </Row>
          <IconButton
            name="close"
            onPress={() => navigation.goBack()}
            accessibilityLabel="Close"
            style={{ marginRight: -10 }}
          />
        </Split>
      </Gutter>

      <ScrollView
        contentContainerStyle={{ padding: space.gutter, paddingTop: space.xl, paddingBottom: space.xl }}
        keyboardShouldPersistTaps="handled">
        <Stack gap={space.lg}>
          <Card level="raised">
            <Stack gap={space.md}>
              <SectionLabel>How much?</SectionLabel>
              <Row gap={space.sm} wrap>
                {food.portions.map(p => (
                  <Chip
                    key={p.label}
                    label={p.label}
                    variant={!custom && chosen === p.label ? 'selected' : 'default'}
                    onPress={() => {
                      setCustom(false);
                      setChosen(p.label);
                      setGramsValue(p.grams);
                    }}
                    accessibilityLabel={`${p.label}, ${grams(p.grams)} grams`}
                  />
                ))}
                <Chip
                  label="Exact grams"
                  variant={custom ? 'selected' : 'default'}
                  onPress={() => {
                    setCustom(true);
                    setCustomText(String(Math.round(gramsValue ?? 100)));
                    setCustomProblem(null);
                  }}
                />
              </Row>

              {custom ? (
                <Field
                  label="Amount"
                  value={customText}
                  onChangeText={t => {
                    // One field, so no form — but the rule for what counts as
                    // an amount is the same rule, read from the same schema as
                    // the custom-food screen rather than rewritten here.
                    const amount = portionGramsField.safeParse(t);
                    setCustomText(t.replace(/[^0-9.]/g, ''));
                    setGramsValue(amount.success ? amount.data : null);
                    setCustomProblem(amount.success ? null : amount.error.issues[0].message);
                  }}
                  keyboardType="numeric"
                  suffix="g"
                  autoFocus
                  problem={customProblem}
                />
              ) : (
                <Txt role="caption" tone="tertiary">
                  {chosen} · {grams(gramsValue ?? 0)} g
                </Txt>
              )}
            </Stack>
          </Card>

          <Card level="raised">
            <TotalsRow
              kcal={nutrients ? kcal(nutrients.kcal) : DASH}
              protein={nutrients ? grams(nutrients.proteinG) : DASH}
              carbs={nutrients ? gramsOrDash(nutrients.carbsG) : DASH}
              fat={nutrients ? gramsOrDash(nutrients.fatG) : DASH}
              fibre={nutrients ? gramsOrDash(nutrients.fiberG) : DASH}
              fibreUnknown={fibreUnknown ? 1 : 0}
            />
            {fibreUnknown && (
              <>
                <Gap h={space.lg} />
                <Disclaimer text="This source carries no fibre figure. It is left out of today's fibre total rather than counted as zero, and the day's denominator says so." />
              </>
            )}
          </Card>

          <Card level="raised">
            <Segmented
              label="Meal"
              value={meal}
              onChange={setMeal}
              options={[
                { value: 'breakfast', label: 'Brkfst' },
                { value: 'lunch', label: 'Lunch' },
                { value: 'dinner', label: 'Dinner' },
                { value: 'snack', label: 'Snack' },
              ]}
            />
          </Card>
        </Stack>
      </ScrollView>

      <Dock>
        <Button
          label={route.params.firstLog ? 'Log it — that is onboarding done' : 'Add to today'}
          disabled={!gramsValue}
          loading={saving}
          onPress={onCommit}
          haptic="commit"
        />
        <Gap h={space.sm} />
        <View style={{ alignItems: 'center' }}>
          <Txt role="caption" tone="tertiary" numeric>
            {nutrients
              ? `${kcal(nutrients.kcal)} kcal · P ${grams(nutrients.proteinG)} g`
              : 'no amount yet'}
          </Txt>
        </View>
      </Dock>
    </Screen>
  );
}
