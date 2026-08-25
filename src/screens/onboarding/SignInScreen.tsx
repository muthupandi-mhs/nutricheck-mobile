import React, { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { TextAction } from '../../components/Button';
import { Icon, IconName } from '../../components/Icon';
import { Gap, Gutter, HeavyBar, Row, Spacer } from '../../components/Layout';
import { Dock, Screen } from '../../components/Screen';
import { Body, Display, Eyebrow, Mono, Title } from '../../components/Type';
import { useTheme } from '../../theme/ThemeProvider';
import type { ScreenProps } from '../../navigation/types';

/**
 * Sign in.
 *
 * Apple is listed first and is not optional on iOS: offering any third-party
 * login without it fails App Store review. Email sits below the two social
 * buttons rather than beside them, because the account someone can actually
 * recover is worth a row of its own.
 *
 * Note what this screen does *not* do: it asks for no system permission. The
 * whole first-run experience is fully functional without granting one, which
 * is unusual for a health app and worth protecting.
 */
export function SignInScreen({ navigation }: ScreenProps<'SignIn'>) {
  const { c, space } = useTheme();
  const [busy, setBusy] = useState<string | null>(null);

  const go = (provider: string) => {
    setBusy(provider);
    // Stands in for the OAuth round-trip; the real handler swaps in here and
    // the rest of the screen — including the busy state — is unchanged.
    setTimeout(() => {
      setBusy(null);
      navigation.navigate('OnboardProfile');
    }, 650);
  };

  const providers: Array<{ id: string; label: string; icon: IconName; primary?: boolean }> = [
    ...(Platform.OS === 'ios' ? [{ id: 'apple', label: 'Continue with Apple', icon: 'check' as IconName, primary: true }] : []),
    { id: 'google', label: 'Continue with Google', icon: 'search', primary: Platform.OS !== 'ios' },
    ...(Platform.OS !== 'ios' ? [{ id: 'apple', label: 'Continue with Apple', icon: 'check' as IconName }] : []),
  ];

  return (
    <Screen>
      <Gutter>
        <Eyebrow size={10.5} tone="ink3">
          STEP 1 OF 6
        </Eyebrow>
        <Gap h={space.sm} />
        <Display size={32}>Make an account</Display>
        <Gap h={space.sm} />
        <Body size={15.5} tone="ink2">
          So your log survives a new phone. We store what you ate and your targets — nothing else.
        </Body>
      </Gutter>

      <Gap h={space.lg} />
      <HeavyBar />

      <Gutter style={{ paddingTop: space.xl, gap: space.md }}>
        {providers.map(p => (
          <Pressable
            key={p.id}
            accessibilityRole="button"
            accessibilityLabel={p.label}
            accessibilityState={{ disabled: busy !== null }}
            onPress={() => busy === null && go(p.id)}
            style={{
              height: 54,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: space.sm + 2,
              backgroundColor: p.primary ? c.heavy : c.surface,
              borderWidth: p.primary ? 0 : 1,
              borderColor: c.ink,
              opacity: busy && busy !== p.id ? 0.4 : 1,
            }}>
            <Icon name={p.icon} size={16} color={p.primary ? c.onHeavy : c.ink} weight={2.2} />
            <Title size={15.5} weight="700" color={p.primary ? c.onHeavy : c.ink}>
              {busy === p.id ? 'Signing in…' : p.label}
            </Title>
          </Pressable>
        ))}

        <Row gap={space.md} style={{ paddingVertical: space.sm }}>
          <View style={{ flexGrow: 1, height: 1, backgroundColor: c.rule }} />
          <Mono size={10} tone="ink3">
            OR
          </Mono>
          <View style={{ flexGrow: 1, height: 1, backgroundColor: c.rule }} />
        </Row>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Continue with email"
          onPress={() => busy === null && go('email')}
          style={{
            height: 54,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: c.rule,
            backgroundColor: c.surface,
          }}>
          <Title size={15.5} weight="600" tone="ink2">
            Continue with email
          </Title>
        </Pressable>
      </Gutter>

      <Spacer />

      <Dock divided={false}>
        <Mono size={11} tone="ink3" style={{ textAlign: 'center', lineHeight: 17 }}>
          By continuing you agree to the terms and the privacy policy.
        </Mono>
        <Gap h={space.sm} />
        <View style={{ alignItems: 'center' }}>
          <TextAction label="Read what we store" onPress={() => {}} size={11.5} />
        </View>
      </Dock>
    </Screen>
  );
}
