import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useApi } from '../../api/client';
import { ApiError, OfflineError } from '../../api/types';
import { REVEAL_ON_SUBMIT } from '../../forms/fields';
import { credentialsSchema, type CredentialsValues } from '../../forms/schemas';
import type { RootStackParamList } from '../../navigation/types';

type Nav = {
  reset(state: { index: number; routes: Array<{ name: keyof RootStackParamList }> }): void;
};

/**
 * The shared half of sign-up and sign-in.
 *
 * The two screens differ in their copy, their affordances and their password
 * rules; they do not differ in what a failed call means or where a success
 * goes. Keeping that here is what stops the register path and the login path
 * drifting into two different answers for "no connection".
 *
 * Field state, validation and the message under each field belong to
 * react-hook-form and `credentialsSchema`. What is left here is the half a
 * schema cannot know about: what the server said, and where to go next.
 */
export function useAuthForm(mode: 'register' | 'login', navigation: Nav) {
  const api = useApi();
  const registering = mode === 'register';

  const form = useForm<CredentialsValues>({
    ...REVEAL_ON_SUBMIT,
    resolver: zodResolver(credentialsSchema(mode)),
    defaultValues: { email: '', password: '' },
  });

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

  const submit = form.handleSubmit(async credentials => {
    setError(null);

    try {
      const auth = registering ? await api.register(credentials) : await api.login(credentials);

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
  });

  return {
    control: form.control,
    busy: form.formState.isSubmitting || leaving,
    /** True once they have pressed the button, which is when we start saying no. */
    tried: form.formState.isSubmitted,
    ready: form.formState.isValid,
    error,
    submit,
  };
}
