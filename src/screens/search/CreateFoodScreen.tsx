import React from 'react';
import { ScrollView } from 'react-native';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useApi } from '../../api/client';
import type { CreateCustomFood } from '../../api/types';
import { Button, IconButton } from '../../components/Button';
import { KeyboardAvoid } from '../../components/KeyboardAvoid';
import { Card } from '../../components/Card';
import { Chip } from '../../components/Chip';
import { Disclaimer } from '../../components/Feedback';
import { Gap, Gutter, Row, Split, Stack } from '../../components/Layout';
import { Dock, Screen } from '../../components/Screen';
import { SectionLabel, Txt } from '../../components/Text';
import { FormField, REVEAL_ON_SUBMIT } from '../../forms/fields';
import {
  customFoodSchema,
  EMPTY_CUSTOM_FOOD,
  FOOD_NAME_MAX,
  type CustomFoodValues,
} from '../../forms/schemas';
import { useTheme } from '../../theme/ThemeProvider';
import type { ScreenProps } from '../../navigation/types';

/** Grams a label is likely to be printed in, one tap away from the keypad. */
const PORTION_SHORTCUTS = ['100', '150', '200', '250'];

/**
 * Custom food creation — the exit from "no database match". Calories and
 * protein are the whole of what is required; a label that prints more can say
 * more, and one that does not is never made to guess.
 *
 * A blank nutrient is unknown, never zero — a blank field has told us nothing,
 * and 0 g would quietly corrupt that nutrient's history. That rule is not
 * applied here: `customFoodSchema` parses these text fields straight into the
 * `CreateCustomFood` this screen posts, so there is no half-validated value in
 * between for a screen to get wrong.
 */
export function CreateFoodScreen({ navigation, route }: ScreenProps<'CreateFood'>) {
  const { space } = useTheme();
  const api = useApi();

  const { control, handleSubmit, formState, setValue, watch } = useForm<
    CustomFoodValues,
    unknown,
    CreateCustomFood
  >({
    ...REVEAL_ON_SUBMIT,
    resolver: zodResolver(customFoodSchema),
    // The phrase that failed to match is the name, already typed.
    defaultValues: { ...EMPTY_CUSTOM_FOOD, name: route.params?.name ?? '' },
  });

  const portion = watch('defaultPortionGrams');

  const onSave = handleSubmit(async food => {
    const created = await api.createFood(food);
    navigation.replace('Portion', { foodId: created.id });
  });

  return (
    <Screen scrollable>
      <Gutter>
        <Split align="flex-start" style={{ minHeight: 44 }}>
          <Stack gap={4} style={{ flexShrink: 1 }}>
            <Txt role="caption" tone="tertiary">
              Not in the database
            </Txt>
            <Txt role="h1">Add it yourself</Txt>
          </Stack>
          <IconButton
            name="close"
            onPress={() => navigation.goBack()}
            accessibilityLabel="Close"
            style={{ marginRight: -10 }}
          />
        </Split>
      </Gutter>

      <KeyboardAvoid>
        <ScrollView
          contentContainerStyle={{ padding: space.gutter, paddingTop: space.xl, paddingBottom: space.xl }}
          keyboardShouldPersistTaps="handled">
          <Txt role="bodyLg" tone="secondary">
            Three numbers off the label, per 100 g. Once it is here it behaves like any other food —
            searchable, repeatable, and yours.
          </Txt>

          <Gap h={space.xl} />

          <Stack gap={space.lg}>
            <Card level="raised">
              <Stack gap={space.lg}>
                <FormField
                  control={control}
                  name="name"
                  label="Name"
                  placeholder="e.g. Mum's rajma"
                  maxLength={FOOD_NAME_MAX}
                  autoFocus
                />
                <FormField
                  control={control}
                  name="brand"
                  label="Brand (optional)"
                  placeholder="Leave blank for a home dish"
                  maxLength={FOOD_NAME_MAX}
                />
              </Stack>
            </Card>

            <Card level="raised">
              <Stack gap={space.lg}>
                <Row gap={space.sm} align="baseline">
                  <SectionLabel>Per 100 g</SectionLabel>
                  <Txt role="caption" tone="tertiary">
                    as printed on the label
                  </Txt>
                </Row>

                <FormField
                  control={control}
                  name="kcal"
                  label="Calories"
                  keyboardType="numeric"
                  suffix="kcal"
                  placeholder="0"
                />
                <FormField
                  control={control}
                  name="proteinG"
                  label="Protein"
                  keyboardType="numeric"
                  suffix="g"
                  placeholder="0"
                />
                <FormField
                  control={control}
                  name="carbsG"
                  label="Carbs (optional)"
                  keyboardType="numeric"
                  suffix="g"
                  placeholder="leave blank if not shown"
                />
                <FormField
                  control={control}
                  name="fatG"
                  label="Fat (optional)"
                  keyboardType="numeric"
                  suffix="g"
                  placeholder="leave blank if not shown"
                />
                <FormField
                  control={control}
                  name="fiberG"
                  label="Fibre (optional)"
                  keyboardType="numeric"
                  suffix="g"
                  placeholder="leave blank if not shown"
                  hint="Blank means unknown, not zero. Unknown is left out of your fibre total; zero would be counted as a real zero and drag down every day it appears in."
                />
              </Stack>
            </Card>

            <Card level="raised">
              <Stack gap={space.md}>
                <FormField
                  control={control}
                  name="defaultPortionGrams"
                  label="Your usual portion (optional)"
                  keyboardType="numeric"
                  suffix="g"
                  placeholder="e.g. 200"
                />
                <Row gap={space.sm} wrap>
                  {PORTION_SHORTCUTS.map(g => (
                    <Chip
                      key={g}
                      label={`${g} g`}
                      variant={portion === g ? 'selected' : 'default'}
                      // A chip is a value the same as a keystroke is, so it
                      // revalidates: without this the button below would still
                      // be judging the field the chip just replaced.
                      onPress={() => setValue('defaultPortionGrams', g, { shouldValidate: true })}
                    />
                  ))}
                </Row>
              </Stack>
            </Card>
          </Stack>
        </ScrollView>
      </KeyboardAvoid>

      <Dock>
        <Disclaimer text="Custom foods are private to your account and are never added to the shared database." />
        <Gap h={space.md} />
        <Button
          label="Save and pick a portion"
          disabled={!formState.isValid}
          loading={formState.isSubmitting || formState.isSubmitSuccessful}
          onPress={onSave}
          haptic="commit"
        />
      </Dock>
    </Screen>
  );
}
