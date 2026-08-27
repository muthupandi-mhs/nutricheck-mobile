import React from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EMAIL_MAX, PASSWORD_MAX, PASSWORD_MIN } from '../../api/types';
import { Button, IconButton } from '../../components/Button';
import { KeyboardAvoid } from '../../components/KeyboardAvoid';
import { Notice } from '../../components/Feedback';
import { Gap, Gutter, Stack } from '../../components/Layout';
import { Screen } from '../../components/Screen';
import { Txt } from '../../components/Text';
import { FormField } from '../../forms/fields';
import { useKeyboardVisible } from '../../lib/keyboard';
import { useTheme } from '../../theme/ThemeProvider';
import { BrandField, useSheetStyle } from './BrandField';
import { useAuthForm } from './useAuthForm';
import type { ScreenProps } from '../../navigation/types';

/**
 * Create an account. Reached only from sign-in, so it carries no link back
 * there — the header's Back button already is that link, and offering both
 * would be two controls for one destination.
 *
 * Email and password is the whole of registration in this build. Apple and
 * Google are not in v1; the `auth_provider` enum carries them so adding one
 * later is a new row, not an ALTER TYPE on a hot enum. Password rules follow
 * the contract and NIST SP 800-63B: length only.
 *
 * This screen asks for no system permission. The entire first run works without one.
 */
export function SignUpScreen({ navigation }: ScreenProps<'SignUp'>) {
  const { c, space } = useTheme();
  const insets = useSafeAreaInsets();
  const sheet = useSheetStyle();
  const keyboard = useKeyboardVisible();
  const f = useAuthForm('register', navigation);

  return (
    <Screen style={{ paddingTop: 0, paddingBottom: 0 }}>
      <KeyboardAvoid>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Identical to sign-in. The two screens are the same screen with a
              different verb, so nothing here should distinguish them by accident. */}
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
              <Txt role="h1">Make an account</Txt>
              <Gap h={space.sm} />
              <Txt role="bodyLg" tone="secondary">
                So your log is still here on your next phone.
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
                  placeholder={`at least ${PASSWORD_MIN} characters`}
                  secure
                  autoCapitalize="none"
                  autoComplete="new-password"
                  textContentType="newPassword"
                  maxLength={PASSWORD_MAX}
                  returnKeyType="go"
                  onSubmitEditing={f.submit}
                />
              </Stack>
            </Gutter>

            <Gap h={space.xl} />
          </View>
        </ScrollView>

        <View
          style={{
            backgroundColor: c.surface,
            paddingTop: space.sm,
            paddingBottom: Math.max(insets.bottom, space.lg) + space.xs,
          }}>
          <Gutter>
            <Button
              label="Create account"
              loading={f.busy}
              disabled={f.tried && !f.ready}
              onPress={f.submit}
              haptic="select"
            />
          </Gutter>
        </View>
      </KeyboardAvoid>

      <View style={{ position: 'absolute', top: insets.top + 4, left: space.gutter - 10 }}>
        <IconButton name="chevronLeft" onPress={() => navigation.goBack()} accessibilityLabel="Back" />
      </View>
    </Screen>
  );
}
