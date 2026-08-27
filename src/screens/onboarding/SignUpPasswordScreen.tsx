import React from 'react';
import { View } from 'react-native';
import { PASSWORD_MAX, PASSWORD_MIN } from '../../api/types';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { Gap, Row } from '../../components/Layout';
import { Press } from '../../components/Press';
import { Txt } from '../../components/Text';
import { FormField } from '../../forms/fields';
import { useTheme } from '../../theme/ThemeProvider';
import { AuthStep, FieldLabel } from './AuthStep';
import { useRegisterForm } from './useAuthForm';
import type { ScreenProps } from '../../navigation/types';

/**
 * Registration, step two: the password, and the call that creates the account.
 *
 * The rules are listed under the field and settle as they are met, rather than
 * waiting to be quoted back as an error. A rule you can watch go green is a
 * different experience from a rule you discover by failing it — particularly
 * this one, where the whole rule is length and the field shows dots.
 *
 * The email is shown in full and is the reason the "wrong email" link exists.
 * Somebody who mistyped it has no other way to know, because nothing has been
 * sent to it yet — and going back is the only fix, since the address is what
 * the account will be keyed on.
 */
export function SignUpPasswordScreen({ navigation, route }: ScreenProps<'SignUpPassword'>) {
  const { space } = useTheme();
  const { email } = route.params;
  const f = useRegisterForm(email, navigation);

  return (
    <AuthStep
      title="Set up a password"
      subtitle={
        <Txt role="bodyLg" tone="secondary">
          Creating an account for <Txt role="bodyLg">{email}</Txt>.
        </Txt>
      }
      error={f.error}
      onBack={() => navigation.goBack()}
      footer={
        <Button
          label="Set password"
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
        autoComplete="new-password"
        textContentType="newPassword"
        maxLength={PASSWORD_MAX}
        returnKeyType="go"
        autoFocus
        onSubmitEditing={f.submit}
      />

      <Gap h={space.lg} />

      {/* Length is the only rule, on the contract's reasoning: composition
          rules push people to `Password1!`. One rule makes a short list, but a
          list that grows is better than a message that has to be re-read. */}
      <Rule met={f.password.length >= PASSWORD_MIN} label={`At least ${PASSWORD_MIN} characters`} />

      <Gap h={space.xl} />

      <Press
        onPress={() => navigation.goBack()}
        feedback="fade"
        accessibilityRole="button"
        accessibilityLabel="Entered the wrong email?"
        accessibilityHint="Goes back to change the address this account will use.">
        <Txt role="labelSm" tone="primary" caps style={{ letterSpacing: 1.1 }}>
          Entered the wrong email?
        </Txt>
      </Press>

      <Gap h={space.lg} />

      <Txt role="caption" tone="tertiary">
        Your email is only ever used to sign you in. Nothing is sent to it.
      </Txt>
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
        <Icon
          name={met ? 'check' : 'alert'}
          size={16}
          color={met ? c.primary : c.attention}
          weight={2.2}
        />
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
