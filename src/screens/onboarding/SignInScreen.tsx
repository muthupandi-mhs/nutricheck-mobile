import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EMAIL_MAX, PASSWORD_MAX } from '../../api/types';
import { Button, IconButton, TextButton } from '../../components/Button';
import { Notice } from '../../components/Feedback';
import { Gap, Gutter, Split, Stack } from '../../components/Layout';
import { Screen } from '../../components/Screen';
import { Txt } from '../../components/Text';
import { FormField } from '../../forms/fields';
import { useKeyboardVisible } from '../../lib/keyboard';
import { useTheme } from '../../theme/ThemeProvider';
import { BrandField, useSheetStyle } from './BrandField';
import { useAuthForm } from './useAuthForm';
import type { ScreenProps } from '../../navigation/types';

/**
 * Sign in — the first stop after Welcome, for everyone. A returning user
 * finishes here; a new one leaves through "Create new" in the corner.
 *
 * No step counter and no password rules: the minimum length applies to a
 * password being created, not to one that already exists, and enforcing it
 * here would lock out an older account and leak the rule to anyone probing.
 */
export function SignInScreen({ navigation }: ScreenProps<'SignIn'>) {
  const { c, space } = useTheme();
  const insets = useSafeAreaInsets();
  const sheet = useSheetStyle();
  const keyboard = useKeyboardVisible();
  const f = useAuthForm('login', navigation);

  return (
    <Screen style={{ paddingTop: 0, paddingBottom: 0 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* The brand zone is what gives way to the keyboard. `minHeight` is a
              floor flex cannot push through, so it has to drop to zero while
              typing — otherwise 132pt of decoration keeps squeezing the form. */}
          <BrandField markSize={56} minHeight={keyboard ? 0 : 132} collapsed={keyboard} />

          {/* With the field gone the sheet is the whole screen, so it drops the
              corners and the top hairline — there is nothing behind it to be a
              sheet over — and grows to fill, or the canvas shows through below. */}
          <View
            style={[
              sheet,
              { paddingTop: space.xxl },
              keyboard && {
                flexGrow: 1,
                // Clears the back button, which is absolutely positioned and no
                // longer has a brand field to sit on.
                paddingTop: insets.top + 52,
                borderTopLeftRadius: 0,
                borderTopRightRadius: 0,
                borderTopWidth: 0,
              },
            ]}>
            <Gutter>
              {/* Sign-up sits in the corner rather than under the Sign in
                  button. Down there it was a second thing to read at the moment
                  of committing to the first, and the two actions look alike at
                  a glance -- a returning user tapping the wrong one lands on a
                  form asking them to invent a password they already have. Up
                  here it is out of the way of the primary path and still the
                  first thing a new user sees, because it sits beside the title
                  that told them they are on the wrong screen. */}
              <Split align="center">
                <Txt role="h1">Sign in</Txt>
                <TextButton
                  label="Create new"
                  role="labelSm"
                  // Pushed, not replaced. Sign-up has no link back here -- the
                  // header's Back button is the return trip, and that only works
                  // if this screen is still underneath it.
                  onPress={() => navigation.navigate('SignUp')}
                />
              </Split>
              <Gap h={space.sm} />
              <Txt role="bodyLg" tone="secondary">
                Use the email and password you signed up with.
              </Txt>
            </Gutter>

            <Gap h={space.xl} />

            {f.error && (
              <>
                <Notice
                  icon={f.error.title === 'No connection' ? 'offline' : 'alert'}
                  title={f.error.title}
                  detail={f.error.detail}
                />
                <Gap h={space.lg} />
              </>
            )}

            <Gutter>
              <Stack gap={space.xl}>
                <FormField
                  control={f.control}
                  name="email"
                  label="Email"
                  icon="user"
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  textContentType="emailAddress"
                  maxLength={EMAIL_MAX}
                  returnKeyType="next"
                />

                <FormField
                  control={f.control}
                  name="password"
                  label="Password"
                  placeholder="your password"
                  secure
                  autoCapitalize="none"
                  autoComplete="current-password"
                  textContentType="password"
                  maxLength={PASSWORD_MAX}
                  returnKeyType="go"
                  onSubmitEditing={f.submit}
                />

              </Stack>
            </Gutter>

            <Gap h={space.xl} />
          </View>
        </ScrollView>

        {/* Outside the scroll and on the sheet's own fill, so it reads as the
            bottom of the sheet rather than a bar floating over it. */}
        <View
          style={{
            backgroundColor: c.surface,
            paddingTop: space.sm,
            paddingBottom: Math.max(insets.bottom, space.lg) + space.xs,
          }}>
          <Gutter>
            <Button
              label="Sign in"
              loading={f.busy}
              disabled={f.tried && !f.ready}
              onPress={f.submit}
              haptic="select"
            />
            <Gap h={space.sm} />
            {/* Under the button, not above it. A password you cannot remember is
                only discovered by trying, so the recovery route belongs after
                the attempt rather than beside the field -- where it was one
                mis-tap from the password box and read as an instruction. */}
            <View style={{ alignItems: 'center' }}>
              <TextButton
                label="I forgot my password"
                tone="secondary"
                onPress={() => {}}
              />
            </View>
          </Gutter>
        </View>
      </KeyboardAvoidingView>

      {/* Over the brand field, where there is nothing to collide with. */}
      <View style={{ position: 'absolute', top: insets.top + 4, left: space.gutter - 10 }}>
        <IconButton name="chevronLeft" onPress={() => navigation.goBack()} accessibilityLabel="Back" />
      </View>
    </Screen>
  );
}
