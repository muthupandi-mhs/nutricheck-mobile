import React, { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useApi } from '../../api/client';
import { ApiError, EMAIL_MAX, OfflineError } from '../../api/types';
import { Button } from '../../components/Button';
import { FormField, REVEAL_ON_SUBMIT } from '../../forms/fields';
import { emailStepSchema, type EmailStepValues } from '../../forms/schemas';
import { AuthStep, FieldLabel } from './AuthStep';
import type { ScreenProps } from '../../navigation/types';

/**
 * Step one, and the only door into the app.
 *
 * Signing in and signing up arrive here together, because from the user's side
 * they are the same task and they routinely cannot tell you which one they are
 * doing — somebody who signed up eight months ago and forgot is not lying, and
 * making them choose first means half of them choose wrong and hit an error
 * that reads like a rejection.
 *
 * The address is settled here and nothing else is. The server is asked whether
 * it already knows it, and the answer travels forward so step two can be an
 * honest sign-in screen or an honest sign-up screen rather than a screen
 * hedging between the two.
 *
 * No account is created here either. A person who backs out has left nothing
 * behind, and there is no half-account to reconcile.
 */
export function AuthEmailScreen({ navigation }: ScreenProps<'AuthEmail'>) {
  const api = useApi();
  const [error, setError] = useState<{ title: string; detail?: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const form = useForm<EmailStepValues>({
    ...REVEAL_ON_SUBMIT,
    resolver: zodResolver(emailStepSchema),
    defaultValues: { email: '' },
  });

  const submit = form.handleSubmit(async ({ email }) => {
    // Lowercased to match what the server stores and compares on, so the same
    // address typed two ways does not become two answers.
    const address = email.trim().toLowerCase();

    setError(null);
    setBusy(true);
    try {
      const { registered } = await api.checkEmail({ email: address });
      navigation.navigate('AuthPassword', { email: address, registered });
    } catch (e) {
      if (e instanceof OfflineError) {
        setError({
          title: 'No connection',
          detail: 'Getting in needs the network. Everything else works offline once you are.',
        });
      } else if (e instanceof ApiError) {
        setError({ title: e.problem.title, detail: e.problem.detail });
      } else {
        setError({ title: 'Something went wrong', detail: 'Try that again.' });
      }
    } finally {
      setBusy(false);
    }
  });

  return (
    <AuthStep
      title="What's your email?"
      subtitle="So your day is saved, and still here on a new phone."
      error={error}
      onBack={() => navigation.goBack()}
      footer={
        <Button
          label="Continue"
         
          loud
          loading={busy}
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
