import React from 'react';
import { View } from 'react-native';
import { PASSWORD_MAX, PASSWORD_MIN } from '../../api/types';
import { Button, TextButton } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { Gap, Row } from '../../components/Layout';
import { Press } from '../../components/Press';
import { Txt } from '../../components/Text';
import { FormField } from '../../forms/fields';
import { useTheme } from '../../theme/ThemeProvider';
import { AuthStep, FieldLabel } from './AuthStep';
import { LegalNote } from './LegalNote';
import { usePasswordForm } from './useAuthForm';
import type { ScreenProps } from '../../navigation/types';

/**
 * Step two: the password, and the call that gets the user in.
 *
 * One screen, two jobs, decided by what step one learned. `registered` picks
 * the title, whether the rules are shown, whether the minimum is enforced, and
 * whether this signs in or creates the account. It is not a screen hedging
 * between the two — by the time anyone sees it, it knows which it is.
 *
 * The rule list only appears when a password is being CREATED. Enforcing a
 * minimum on one that already exists would lock out an account made under an
 * older rule, and stating the rule to someone signing in leaks it to anyone
 * probing an address.
 *
 * Where it goes afterwards is the server's call, not this screen's: the
 * response carries `onboarded`, and an account that has never finished
 * onboarding lands there whether it was made a second ago or last year.
 */
export function AuthPasswordScreen({ navigation, route }: ScreenProps<'AuthPassword'>) {
  const { space } = useTheme();
  const { email, registered } = route.params;
  const f = usePasswordForm(email, registered, navigation);

  return (
    <AuthStep
      title={registered ? 'Welcome back' : 'Set up a password'}
      subtitle={
        <Txt role="bodyLg" tone="secondary">
          {registered ? 'Signing in as ' : 'Creating an account for '}
          <Txt role="bodyLg">{email}</Txt>.
        </Txt>
      }
      error={f.error}
      onBack={() => navigation.goBack()}
      footer={
        <Button
          label={registered ? 'Sign in' : 'Create account'}
          variant="inverse"
          loud
          loading={f.busy}
          disabled={f.tried && !f.ready}
          onPress={f.submit}
          haptic="select"
        />
      }>
      <FieldLabel>Password</FieldLabel>
      <FormField
        control={f.control}
        name="password"
        secure
        autoCapitalize="none"
        autoComplete={registered ? 'current-password' : 'new-password'}
        textContentType={registered ? 'password' : 'newPassword'}
        maxLength={PASSWORD_MAX}
        returnKeyType="go"
        autoFocus
        onSubmitEditing={f.submit}
      />

      {registered ? (
        <>
          <Gap h={space.lg} />
          {/* TODO: still inert. There is no reset endpoint, so a forgotten
              password is an unrecoverable account; see the open list. */}
          <View style={{ alignItems: 'flex-start' }}>
            <TextButton label="I forgot my password" tone="secondary" onPress={() => {}} />
          </View>
        </>
      ) : (
        <>
          <Gap h={space.lg} />
          {/* Length is the only rule, on the contract's reasoning: composition
              rules push people to `Password1!`. One rule makes a short list,
              but a list that grows is better than a message re-read. */}
          <Rule met={f.password.length >= PASSWORD_MIN} label={`At least ${PASSWORD_MIN} characters`} />
        </>
      )}

      <Gap h={space.xl} />

      {/* The address is settled but not spent — nothing has been sent to it and
          no account exists yet, so going back is free and is the only way to
          fix a typo in the thing the account will be keyed on. */}
      <Press
        onPress={() => navigation.goBack()}
        feedback="fade"
        accessibilityRole="button"
        accessibilityLabel="Use a different email"
        accessibilityHint="Goes back to change the address.">
        <Txt role="labelSm" tone="primary" caps style={{ letterSpacing: 1.1 }}>
          Use a different email
        </Txt>
      </Press>

      {registered ? null : (
        <>
          <Gap h={space.xl} />
          <LegalNote verb="creating an account" />
        </>
      )}
    </AuthStep>
  );
}

/**
 * One rule, in the state it is currently in.
 *
 * Amber for unmet is the same amber the rest of the app spends on an unmeasured
 * value, and it is the same meaning: not settled yet. It is a state, not
 * decoration — which is the line the token file actually draws.
 */
function Rule({ met, label }: { met: boolean; label: string }) {
  const { c, space } = useTheme();

  return (
    <Row gap={space.sm} align="center">
      <View style={{ width: 18, alignItems: 'center' }}>
        <Icon name={met ? 'check' : 'alert'} size={16} color={met ? c.primary : c.attention} weight={2.2} />
      </View>
      {/* A plain string, not children: the state has to reach the label, and
          interpolated children arrive as an array that stringifies with commas
          in it — "At least ,6, characters". */}
      <Txt
        role="bodySm"
        color={met ? c.inkSecondary : c.attentionInk}
        accessibilityLabel={`${label}${met ? ', done' : ', not met yet'}`}>
        {label}
      </Txt>
    </Row>
  );
}
