import React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { NAME_MAX } from '../../api/types';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Gap, Stack } from '../../components/Layout';
import { Txt } from '../../components/Text';
import { FormField, REVEAL_ON_SUBMIT } from '../../forms/fields';
import { nameStepSchema, type NameStep, type NameStepValues } from '../../forms/schemas';
import { useOnboarding } from '../../state/Onboarding';
import { useTheme } from '../../theme/ThemeProvider';
import { OnboardStep } from './OnboardStep';
import type { ScreenProps } from '../../navigation/types';

/**
 * The first thing asked after the password, and the only question in the flow
 * that is not an input to a calculation.
 *
 * It is here rather than folded into "About you" because of what the two
 * screens are. That screen is a form about a body — sex, age, height, weight —
 * and a name dropped at the top of it is the app's one human question filed
 * under measurements. Asked on its own, first, it is the app introducing
 * itself; asked fourth, between a height and a weight, it is another field.
 *
 * A surname is asked for and never required. The app says the first name back
 * to people and has no use for the second, so requiring it would cost signups
 * to collect something nothing reads.
 *
 * Nothing is sent from here. The draft is carried in memory to the targets
 * step, which writes the whole profile in one PATCH — a name saved on its own
 * would need a profile row that does not exist yet.
 */
export function NameScreen({ navigation }: ScreenProps<'OnboardName'>) {
  const { space } = useTheme();
  const { draft, patch } = useOnboarding();

  // Three generics because the schema transforms: the fields hold two
  // strings, and what comes out of them has a surname that may be absent.
  const form = useForm<NameStepValues, unknown, NameStep>({
    ...REVEAL_ON_SUBMIT,
    resolver: zodResolver(nameStepSchema),
    // Seeded from the draft, not blank: coming back to this step should show
    // what was typed, and the draft is what survives the back-swipe.
    defaultValues: { firstName: draft.firstName, lastName: draft.lastName },
  });

  const submit = form.handleSubmit(({ firstName, lastName }) => {
    patch({ firstName, lastName: lastName ?? '' });
    navigation.navigate('OnboardProfile');
  });

  return (
    <OnboardStep
      title="What should we call you?"
      pinFooter
      footer={
        <Button
          label="Continue"
          disabled={form.formState.isSubmitted && !form.formState.isValid}
          onPress={submit}
          haptic="select"
        />
      }>
      <Txt role="bodyLg" tone="secondary">
        Your first name is how the app addresses you. Nothing here is shown to anyone else.
      </Txt>

      <Gap h={space.xl} />

      <Card>
        <Stack gap={space.md}>
          <FormField
            control={form.control}
            name="firstName"
            label="First name"
            placeholder="Alex"
            autoComplete="given-name"
            textContentType="givenName"
            autoCapitalize="words"
            maxLength={NAME_MAX}
            // Both fields submit rather than one of them advancing to the
            // other. Moving focus needs a ref through the form layer, and the
            // surname is optional — so "done" on the first field is a real answer
            // to the question, not a step skipped.
            returnKeyType="done"
            onSubmitEditing={submit}
            autoFocus
          />
          <FormField
            control={form.control}
            name="lastName"
            label="Last name (optional)"
            placeholder="Leave blank if you would rather not"
            autoComplete="family-name"
            textContentType="familyName"
            autoCapitalize="words"
            maxLength={NAME_MAX}
            returnKeyType="done"
            onSubmitEditing={submit}
          />
        </Stack>
      </Card>
    </OnboardStep>
  );
}
