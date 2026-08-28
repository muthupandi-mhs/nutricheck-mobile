import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useApi } from '../../api/client';
import { ApiError, OfflineError, type TokenPair, type SessionUser } from '../../api/types';
import { REVEAL_ON_SUBMIT } from '../../forms/fields';
import {
  existingPasswordStepSchema,
  passwordStepSchema,
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
 * Signing in and registering differ in their copy, their rules and which
 * endpoint they hit; they do not differ in either of those. Keeping it in one
 * place is what stops the two paths drifting into two different answers for
 * "no connection" — which they did once already.
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
      // returning user never sees a flash of onboarding on a slow link — and an
      // account that never finished it still lands there, however old it is.
      navigation.reset({
        index: 0,
        routes: [{ name: auth.user.onboarded ? 'Main' : 'OnboardName' }],
      });
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
    }
  };

  return { error, leaving, attempt };
}

/**
 * Step two's form, for an address step one has already settled.
 *
 * `registered` decides both halves at once, and deliberately from one flag: the
 * schema that validates the password, and the endpoint it is sent to. Letting
 * those be chosen separately is how a screen ends up enforcing a new-password
 * minimum on somebody signing in.
 *
 * `watch` rather than `getValues` — the rule list under the field is live, and
 * it has to re-render on every keystroke to be worth putting there at all.
 */
export function usePasswordForm(email: string, registered: boolean, navigation: Nav) {
  const api = useApi();
  const outcome = useAuthOutcome(navigation);

  const form = useForm<PasswordStepValues>({
    ...REVEAL_ON_SUBMIT,
    resolver: zodResolver(registered ? existingPasswordStepSchema : passwordStepSchema),
    defaultValues: { password: '' },
  });

  const submit = form.handleSubmit(({ password }) =>
    outcome.attempt(() =>
      registered ? api.login({ email, password }) : api.register({ email, password }),
    ),
  );

  return {
    control: form.control,
    password: form.watch('password'),
    busy: form.formState.isSubmitting || outcome.leaving,
    /** True once they have pressed the button, which is when we start saying no. */
    tried: form.formState.isSubmitted,
    ready: form.formState.isValid,
    error: outcome.error,
    submit,
  };
}
