import React from 'react';
import { View } from 'react-native';
import { EMAIL_MAX, PASSWORD_MAX } from '../../api/types';
import { Button, TextButton } from '../../components/Button';
import { Gap, Stack } from '../../components/Layout';
import { FormField } from '../../forms/fields';
import { useTheme } from '../../theme/ThemeProvider';
import { AuthStep, FieldLabel } from './AuthStep';
import { useAuthForm } from './useAuthForm';
import type { ScreenProps } from '../../navigation/types';

/**
 * Sign in. Both credentials on one screen, unlike registration: somebody
 * signing in already knows both, and splitting them would be two screens to
 * say one thing they can say in one.
 *
 * No password rules here. The minimum applies to a password being created, not
 * to one that already exists — enforcing it would lock out an older account and
 * leak the rule to anyone probing.
 */
export function SignInScreen({ navigation }: ScreenProps<'SignIn'>) {
  const { space } = useTheme();
  const f = useAuthForm('login', navigation);

  return (
    <AuthStep
      title="Sign in"
      subtitle="Use the email and password you signed up with."
      error={f.error}
      onBack={() => navigation.goBack()}
      footer={
        <>
          <Button
            label="Sign in"
            loud
            loading={f.busy}
            disabled={f.tried && !f.ready}
            onPress={f.submit}
            haptic="select"
          />
          <Gap h={space.sm} />
          {/* Under the button, not above it. A password you cannot remember is
              only discovered by trying, so the recovery route belongs after the
              attempt rather than beside the field — where it was one mis-tap
              from the password box and read as an instruction.

              TODO: still inert. There is no reset endpoint, so a forgotten
              password is an unrecoverable account; see the open list. */}
          <View style={{ alignItems: 'center' }}>
            <TextButton label="I forgot my password" tone="secondary" onPress={() => {}} />
          </View>
        </>
      }>
      <Stack gap={space.xl}>
        <View>
          <FieldLabel>Email address</FieldLabel>
          <FormField
            control={f.control}
            name="email"
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            maxLength={EMAIL_MAX}
            returnKeyType="next"
          />
        </View>

        <View>
          <FieldLabel>Password</FieldLabel>
          <FormField
            control={f.control}
            name="password"
            placeholder="your password"
            secure
            autoCapitalize="none"
            autoComplete="current-password"
            textContentType="password"
            maxLength={PASSWORD_MAX}
            returnKeyType="go"
            onSubmitEditing={f.submit}
          />
        </View>
      </Stack>

      <Gap h={space.xl} />

      {/* Welcome names both paths now, so this is a second chance rather than
          the only one — which is why it sits quietly at the end of the form
          instead of in the corner beside the title. */}
      <View style={{ alignItems: 'center' }}>
        <TextButton
          label="No account yet? Create one"
          role="labelSm"
          onPress={() => navigation.navigate('SignUp')}
        />
      </View>
    </AuthStep>
  );
}
