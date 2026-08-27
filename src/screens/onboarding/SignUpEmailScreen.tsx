import React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { EMAIL_MAX } from '../../api/types';
import { Button } from '../../components/Button';
import { FormField, REVEAL_ON_SUBMIT } from '../../forms/fields';
import { emailStepSchema, type EmailStepValues } from '../../forms/schemas';
import { AuthStep, FieldLabel } from './AuthStep';
import type { ScreenProps } from '../../navigation/types';

/**
 * Registration, step one: the email and nothing else.
 *
 * Split from the password because the two are rejected for unrelated reasons.
 * On one screen, a typo'd address and a short password come back together as a
 * pair of red messages and the user has to work out which of two problems they
 * are solving; asked one at a time, each answer is settled before the next
 * question exists.
 *
 * Nothing is sent here. The address is carried forward as a route param and the
 * account is created on the next screen, in one call — so a person who backs
 * out has left nothing behind, and there is no half-account to reconcile.
 */
export function SignUpEmailScreen({ navigation }: ScreenProps<'SignUp'>) {
  const form = useForm<EmailStepValues>({
    ...REVEAL_ON_SUBMIT,
    resolver: zodResolver(emailStepSchema),
    defaultValues: { email: '' },
  });

  const submit = form.handleSubmit(({ email }) =>
    navigation.navigate('SignUpPassword', { email: email.trim() }),
  );

  return (
    <AuthStep
      glyph="user"
      title="Enter your email"
      subtitle="So your day is saved, and still here on a new phone."
      onBack={() => navigation.goBack()}
      footer={
        <Button
          label="Confirm email"
          loud
          disabled={form.formState.isSubmitted && !form.formState.isValid}
          onPress={submit}
          haptic="select"
        />
      }>
      <FieldLabel>Email address</FieldLabel>
      <FormField
        control={form.control}
        name="email"
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        maxLength={EMAIL_MAX}
        returnKeyType="next"
        autoFocus
        onSubmitEditing={submit}
      />
    </AuthStep>
  );
}
