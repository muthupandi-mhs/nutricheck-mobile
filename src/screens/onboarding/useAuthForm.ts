import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useApi } from '../../api/client';
import { ApiError, OfflineError, type TokenPair, type SessionUser } from '../../api/types';
import { REVEAL_ON_SUBMIT } from '../../forms/fields';
import {
  credentialsSchema,
  passwordStepSchema,
  type CredentialsValues,
  type PasswordStepValues,
} from '../../forms/schemas';
import type { RootStackParamList } from '../../navigation/types';

type Nav = {
  reset(state: { index: number; routes: Array<{ name: keyof RootStackParamList }> }): void;
};

type Auth = { user: SessionUser; tokens: TokenPair };

/**
 * What a failed call means, and where a successful one goes.
 *
 * Sign-in and registration differ in their copy, their affordances and their
 * password rules; they do not differ in either of those. Keeping it in one
 * place is what stops the login path and the register path drifting into two
 * different answers for "no connection" — which they did once already.
 *
 * Split out of `useAuthForm` when registration became two screens: the call now
 * happens on the second of them, with the email arriving as a route param
 * rather than as a field.
 */
export function useAuthOutcome(navigation: Nav) {
  /**
   * A rejected call, not a rejected field. It survives until the next attempt
   * rather than clearing on the next keystroke: "that password is wrong" is
   * still true, and still worth reading, while they retype it.
   */
  const [error, setError] = useState<{ title: string; detail?: string } | null>(null);

  // `isSubmitting` goes false the moment the handler returns, which is while
  // the reset is still animating. On the way out the button should stay a
  // spinner rather than flicker back to a live control.
  const [leaving, setLeaving] = useState(false);

  const attempt = async (call: () => Promise<Auth>) => {
    setError(null);

    try {
      const auth = await call();

      setLeaving(true);
      // Trust the server's `onboarded` rather than probing for a profile, so a
      // returning user never sees a flash of onboarding on a slow link.
      navigation.reset({
        index: 0,
        routes: [{ name: auth.user.onboarded ? 'Main' : 'OnboardProfile' }],
      });
    } catch (e) {
      if (e instanceof OfflineError) {
        setError({
          title: 'No connection',
          detail: 'Signing in needs the network. Everything else works offline once you are in.',
        });
      } else if (e instanceof ApiError) {
        setError({ title: e.problem.title, detail: e.problem.detail });
      } else {
        setError({ title: 'Something went wrong', detail: 'Try that again.' });
      }
    }
  };

  return { error, leaving, attempt };
}

/**
 * Sign-in: both credentials on one screen, because somebody signing in already
 * knows both and splitting them would be two taps to say one thing.
 *
 * Field state, validation and the message under each field belong to
 * react-hook-form and `credentialsSchema`.
 */
export function useAuthForm(mode: 'register' | 'login', navigation: Nav) {
  const api = useApi();
  const registering = mode === 'register';
  const outcome = useAuthOutcome(navigation);

  const form = useForm<CredentialsValues>({
    ...REVEAL_ON_SUBMIT,
    resolver: zodResolver(credentialsSchema(mode)),
    defaultValues: { email: '', password: '' },
  });

  const submit = form.handleSubmit(credentials =>
    outcome.attempt(() => (registering ? api.register(credentials) : api.login(credentials))),
  );

  return {
    control: form.control,
    busy: form.formState.isSubmitting || outcome.leaving,
    /** True once they have pressed the button, which is when we start saying no. */
    tried: form.formState.isSubmitted,
    ready: form.formState.isValid,
    error: outcome.error,
    submit,
  };
}

/**
 * The second step of registering: a password, for an email already settled.
 *
 * `watch` rather than `getValues` — the rule list under the field is live, and
 * it has to re-render on every keystroke to be worth putting there at all.
 */
export function useRegisterForm(email: string, navigation: Nav) {
  const api = useApi();
  const outcome = useAuthOutcome(navigation);

  const form = useForm<PasswordStepValues>({
    ...REVEAL_ON_SUBMIT,
    resolver: zodResolver(passwordStepSchema),
    defaultValues: { password: '' },
  });

  const submit = form.handleSubmit(({ password }) =>
    outcome.attempt(() => api.register({ email, password })),
  );

  return {
    control: form.control,
    password: form.watch('password'),
    busy: form.formState.isSubmitting || outcome.leaving,
    tried: form.formState.isSubmitted,
    ready: form.formState.isValid,
    error: outcome.error,
    submit,
  };
}
