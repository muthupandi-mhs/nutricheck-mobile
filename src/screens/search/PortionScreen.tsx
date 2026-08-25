import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useApi } from '../../api/client';
import type { FoodDetail, MealSlot, QuantitySource, QuantityType } from '../../api/types';
import { Disclaimer } from '../../components/Banner';
import { IconButton, PrimaryButton } from '../../components/Button';
import { Chip } from '../../components/Chip';
import { Segmented, TextField } from '../../components/Field';
import { Divider, Gap, Gutter, HeavyBar, Row, SplitRow } from '../../components/Layout';
import { Dock, Screen } from '../../components/Screen';
import { Shimmer } from '../../components/Skeleton';
import { Body, Display, Eyebrow, Mono, Num } from '../../components/Type';
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
 * Portion, then commit.
 *
 * Household-unit chips come first and grams sit behind them, because "1 medium"
 * is a thing someone can verify by looking at their plate and "118 g" is a
 * thing they have to take on faith. The gram weight is still shown next to the
 * chip — it is the number the arithmetic actually uses, and hiding it would
 * make the totals unauditable.
 *
 * There is no confirm step after this one. Nothing here was estimated by a
 * model, so there is nothing to review: search goes straight to commit.
 */
export function PortionScreen({ navigation, route }: ScreenProps<'Portion'>) {
  const { space } = useTheme();
  const api = useApi();
  const { commit } = useAppState();

  const [foodDetail, setFoodDetail] = useState<FoodDetail | null>(null);
  const [gramsValue, setGramsValue] = useState<number | null>(null);
  const [chosenLabel, setChosenLabel] = useState<string | null>(null);
  const [customMode, setCustomMode] = useState(false);
  const [customText, setCustomText] = useState('');
  const [meal, setMeal] = useState<MealSlot>(mealSlotFor());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getFood(route.params.foodId).then(f => {
      setFoodDetail(f);
      const def = f.portions.find(p => p.isDefault) ?? f.portions[0];
      setGramsValue(def?.grams ?? 100);
      setChosenLabel(def?.label ?? null);
    });
  }, [api, route.params.foodId]);

  const nutrients = useMemo(
    () => (foodDetail && gramsValue ? scale(foodDetail.nutrients, gramsValue) : null),
    [foodDetail, gramsValue],
  );

  const onCommit = async () => {
    if (!foodDetail || !gramsValue || !nutrients) return;
    setSaving(true);

    // A custom gram amount is a stated mass; a chip is the food table's own
    // portion. Recording which is which is what keeps `user_portions` honest.
    const quantityType: QuantityType = customMode ? 'exact_mass' : 'standard_measure';
    const quantitySource: QuantitySource = customMode ? 'stated' : 'food_portion';

    await commit({
      clientId: uuid(),
      loggedAt: new Date().toISOString(),
      meal,
      source: 'search',
      phrase: null,
      draftId: null,
      items: [
        {
          food: { id: foodDetail.id, name: foodDetail.name, brand: foodDetail.brand, kcalPer100g: foodDetail.kcalPer100g },
          grams: gramsValue,
          quantityType,
          quantitySource,
          learnedUnitLabel: null,
          nutrients,
        },
      ],
    });

    setSaving(false);
    if (route.params.firstLog) {
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    } else {
      navigation.navigate('Home');
    }
  };

  if (!foodDetail) {
    return (
      <Screen edges="top">
        <Gutter style={{ gap: 12, paddingTop: space.lg }}>
          <Shimmer width="70%" height={22} />
          <Shimmer width="40%" height={12} delay={140} />
        </Gutter>
      </Screen>
    );
  }

  const fiberUnknown = foodDetail.nutrients.fiberState === 'unknown';

  return (
    <Screen edges="top">
      <Gutter style={{ paddingBottom: space.md }}>
        <SplitRow align="flex-start">
          <View style={{ flexShrink: 1, gap: 4, paddingRight: space.sm }}>
            <Eyebrow size={10} tone="ink3">
              HOW MUCH?
            </Eyebrow>
            <Display size={26}>{foodDetail.name}</Display>
            <Mono size={10.5} tone="ink3">
              {SOURCE_LABEL[foodDetail.source]}
              {foodDetail.brand ? ` · ${foodDetail.brand}` : ''} · {kcal(foodDetail.kcalPer100g)} kcal per 100 g
            </Mono>
          </View>
          <IconButton name="close" size={20} onPress={() => navigation.goBack()} accessibilityLabel="Close" style={{ marginRight: -10 }} />
        </SplitRow>
      </Gutter>

      <HeavyBar />

      <ScrollView contentContainerStyle={{ paddingBottom: space.xl }} keyboardShouldPersistTaps="handled">
        <Gutter style={{ paddingTop: space.lg, gap: space.md }}>
          <Eyebrow size={10} tone="ink2">
            PORTION
          </Eyebrow>
          <Row gap={7} wrap>
            {foodDetail.portions.map(p => (
              <Chip
                key={p.label}
                label={p.label}
                variant={!customMode && chosenLabel === p.label ? 'selected' : 'plain'}
                onPress={() => {
                  setCustomMode(false);
                  setChosenLabel(p.label);
                  setGramsValue(p.grams);
                }}
                accessibilityLabel={`${p.label}, ${grams(p.grams)} grams`}
              />
            ))}
            <Chip
              label="grams"
              variant={customMode ? 'selected' : 'plain'}
              onPress={() => {
                setCustomMode(true);
                setCustomText(String(Math.round(gramsValue ?? 100)));
              }}
            />
          </Row>

          {customMode ? (
            <View style={{ paddingTop: 4 }}>
              <TextField
                label="EXACT AMOUNT"
                value={customText}
                onChangeText={t => {
                  const cleaned = t.replace(/[^0-9.]/g, '');
                  setCustomText(cleaned);
                  const n = parseFloat(cleaned);
                  setGramsValue(Number.isFinite(n) && n > 0 ? n : null);
                }}
                keyboardType="numeric"
                suffix="g"
                autoFocus
              />
            </View>
          ) : (
            <Mono size={11} tone="ink3">
              {chosenLabel} · {grams(gramsValue ?? 0)} g
            </Mono>
          )}
        </Gutter>

        <Gap h={space.xl} />
        <Divider />

        <Gutter style={{ paddingTop: space.lg }}>
          <SplitRow style={{ gap: space.xl }}>
            {[
              { label: 'CALORIES', value: nutrients ? kcal(nutrients.kcal) : DASH, unit: '' },
              { label: 'PROTEIN', value: nutrients ? grams(nutrients.proteinG) : DASH, unit: 'g' },
              {
                label: 'FIBER',
                value: nutrients ? gramsOrDash(nutrients.fiberG) : DASH,
                unit: fiberUnknown ? '' : 'g',
              },
            ].map(stat => (
              <View key={stat.label} style={{ gap: 3 }}>
                <Eyebrow size={9.5} tone="ink2">
                  {stat.label}
                </Eyebrow>
                <Row gap={3} align="baseline">
                  <Display size={26} tone={stat.value === DASH ? 'ink3' : 'ink'}>
                    {stat.value}
                  </Display>
                  {stat.unit ? (
                    <Mono size={13} tone="ink2">
                      {stat.unit}
                    </Mono>
                  ) : null}
                </Row>
              </View>
            ))}
          </SplitRow>

          {fiberUnknown && (
            <View style={{ paddingTop: space.md }}>
              <Disclaimer text="This source carries no fiber figure. It will be left out of today's fiber total rather than counted as zero — the day's denominator says so." />
            </View>
          )}
        </Gutter>

        <Gap h={space.xl} />

        <Gutter>
          <Segmented
            label="MEAL"
            value={meal}
            onChange={setMeal}
            options={[
              { value: 'breakfast', label: 'Brkfst' },
              { value: 'lunch', label: 'Lunch' },
              { value: 'dinner', label: 'Dinner' },
              { value: 'snack', label: 'Snack' },
            ]}
          />
        </Gutter>
      </ScrollView>

      <Dock>
        {!gramsValue && (
          <>
            <Row gap={6}>
              <Body size={13} tone="est">
                Enter an amount to log this.
              </Body>
            </Row>
            <Gap h={space.sm} />
          </>
        )}
        <PrimaryButton
          label={route.params.firstLog ? 'Log it — that is onboarding done' : 'Add to today'}
          disabled={!gramsValue}
          loading={saving}
          onPress={onCommit}
        />
        <Gap h={space.sm} />
        <View style={{ alignItems: 'center' }}>
          <Num size={10.5} tone="ink3">
            {nutrients ? `${kcal(nutrients.kcal)} kcal · P ${grams(nutrients.proteinG)} g` : 'no amount yet'}
          </Num>
        </View>
      </Dock>
    </Screen>
  );
}
