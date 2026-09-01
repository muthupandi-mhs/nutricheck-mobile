import React from 'react';
import { ScrollView, View } from 'react-native';
import { useApi } from '../../api/client';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Chip';
import { Disclaimer } from '../../components/Feedback';
import { FoodGlyph } from '../../components/FoodGlyph';
import { Icon, IconName } from '../../components/Icon';
import { Divider, Gutter, Row, Stack } from '../../components/Layout';
import { Press } from '../../components/Press';
import { Header, Screen } from '../../components/Screen';
import { SectionLabel, Txt } from '../../components/Text';
import { kcal } from '../../lib/format';
import { endGoogleSession } from '../../lib/googleSession';
import { ACTIVITY, ageFrom, OBJECTIVE_LABEL } from '../../lib/nutrition';
import { useTheme } from '../../theme/ThemeProvider';
import type { UserProfile } from '../../api/types';
import { useAppState } from '../../state/AppState';
import type { ScreenProps } from '../../navigation/types';

/**
 * Their name, as much of it as they gave.
 *
 * Undefined rather than an empty string when there is neither, so the caller
 * has one thing to test — a blank name and a missing one are the same fact
 * about the account, and only one of them should be expressible.
 */
function fullName(profile: UserProfile | null): string | undefined {
  const name = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ').trim();
  return name || undefined;
}

/** Hoisted out of the screen so the list is not rebuilt on every state change. */
function SettingRow({
  icon,
  title,
  value,
  onPress,
  destructive,
  first,
  last,
}: {
  icon?: IconName;
  title: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  first?: boolean;
  last?: boolean;
}) {
  const { c, space, radius } = useTheme();

  const body = (
    <Row gap={space.md} style={{ paddingHorizontal: space.xl, paddingVertical: space.lg, minHeight: 58 }}>
      {icon && <Icon name={icon} size={20} color={destructive ? c.danger : c.inkSecondary} />}
      <Txt role="body" color={destructive ? c.danger : c.ink} style={{ flexGrow: 1 }}>
        {title}
      </Txt>
      {value ? (
        <Txt role="bodySm" tone="tertiary" numeric>
          {value}
        </Txt>
      ) : null}
      {onPress ? <Icon name="chevronRight" size={17} color={c.inkTertiary} /> : null}
    </Row>
  );

  const shape = {
    borderTopLeftRadius: first ? radius.lg : 0,
    borderTopRightRadius: first ? radius.lg : 0,
    borderBottomLeftRadius: last ? radius.lg : 0,
    borderBottomRightRadius: last ? radius.lg : 0,
  };

  return (
    <View>
      {onPress ? (
        <Press onPress={onPress} feedback="none" accessibilityLabel={title} style={shape}>
          {body}
        </Press>
      ) : (
        body
      )}
      {!last && <Divider inset={space.xl + (icon ? 20 + space.md : 0)} />}
    </View>
  );
}

/**
 * You. Export and delete are top-level rows rather than buried under an account
 * submenu, and the identity card is the way into the profile rather than a row
 * further down — a summary you cannot act on is where people press first.
 *
 * There was a permissions section here, listing the microphone, reminders and
 * health data with their state. Every one of them read "Not asked", because the
 * app asks at the moment of use and none of those moments has arrived — so it
 * was three rows of furniture answering a question nobody had, and the one
 * place a user could get the impression something had been granted. The OS
 * settings app is where a granted permission is actually reviewed and revoked;
 * this can come back when there is a state worth reporting.
 */
export function YouScreen({ navigation }: ScreenProps<'You'>) {
  const { c, space } = useTheme();
  const api = useApi();
  const { profile, goal } = useAppState();


  return (
    <Screen scrollable>
      {/* Pushed now, not a tab, so it needs its own way back. */}
      <Header title="You" leading={{ icon: 'chevronLeft', onPress: () => navigation.goBack(), label: 'Back' }} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: space.huge }}>
        <Gutter>
          <Stack gap={space.xl}>
            {/* identity — and the way into the profile, which is the only
                screen that can change any of what this card is showing. It is
                the card itself rather than a row further down: a summary you
                cannot act on is the place people press first anyway. */}
            <Press
              onPress={() => navigation.navigate('ProfileEditor')}
              feedback="scale"
              accessibilityLabel="Your profile"
              accessibilityHint="Change your name, body details, activity and goal">
              <Card>
                <Row gap={space.lg}>
                  <FoodGlyph name="you" seed="account" size={56} icon="user" />
                  <Stack gap={4} style={{ flexGrow: 1, flexShrink: 1 }}>
                    {/* Their name where the card used to say "Your account",
                        which is a label for a card already sitting under a
                        heading saying You. Accounts made before the name step
                        have none, and fall back to what was always there. */}
                    <Txt role="h3" numberOfLines={1}>
                      {fullName(profile) ?? 'Your account'}
                    </Txt>
                    <Txt role="bodySm" tone="secondary">
                      {profile
                        ? `${ageFrom(profile.birthDate)} · ${profile.heightCm} cm · ${profile.weightKg} kg`
                        : 'Profile not set'}
                    </Txt>
                    {profile && (
                      <Row gap={space.sm} wrap style={{ paddingTop: 2 }}>
                        <Badge label={ACTIVITY[profile.activityLevel].short} />
                        <Badge label={OBJECTIVE_LABEL[profile.objective]} tone="success" />
                      </Row>
                    )}
                  </Stack>
                  {/* The same chevron every other pressable row carries. A
                      card that opens something and a card that only reports
                      look identical without it. */}
                  <Icon name="chevronRight" size={17} color={c.inkTertiary} />
                </Row>
              </Card>
            </Press>

            {/* targets */}
            <Stack gap={space.md}>
              <SectionLabel>Targets</SectionLabel>
              <Card padded={false}>
                <SettingRow
                  icon="flame"
                  title="Daily calories"
                  value={goal ? `${kcal(goal.kcal)} kcal` : '—'}
                  onPress={() => navigation.navigate('GoalEditor')}
                  first
                />
                <SettingRow
                  icon="egg"
                  title="Protein"
                  value={goal ? `${goal.proteinG} g` : '—'}
                  onPress={() => navigation.navigate('GoalEditor')}
                />
                <SettingRow
                  icon="leaf"
                  title="Fibre"
                  value={goal ? `${goal.fiberG} g` : '—'}
                  onPress={() => navigation.navigate('GoalEditor')}
                  last
                />
              </Card>
            </Stack>

            {/* data */}
            <Stack gap={space.md}>
              <SectionLabel>Your data</SectionLabel>
              <Card padded={false}>
                <SettingRow icon="bookmark" title="Export everything" value="JSON" onPress={() => {}} first />
                <SettingRow icon="info" title="Privacy and what we store" onPress={() => {}} />
                <SettingRow icon="settings" title="Change password" onPress={() => {}} />
                <SettingRow
                  icon="undo"
                  title="Sign out"
                  onPress={async () => {
                    await api.logout();
                    // Google's session outlives ours. Without this the next
                    // "Continue with Google" reuses this account with no
                    // chooser — so the phone with two accounts on it, or one
                    // being handed over, cannot actually switch. Here rather
                    // than in the transport on purpose: this is the
                    // deliberate "I want out", not an expired token.
                    await endGoogleSession();
                    // On the root stack itself now — there is no parent to reach for.
                    navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
                  }}
                />
                <SettingRow icon="trash" title="Delete account and all logs" destructive onPress={() => {}} last />
              </Card>
            </Stack>

            <Stack gap={space.md}>
              <Disclaimer text="NutriCheck gives estimates for general wellness. It is not medical advice and is not a substitute for a clinician." />
              <Txt role="caption" tone="tertiary">
                v0.1.0
              </Txt>
            </Stack>
          </Stack>
        </Gutter>
      </ScrollView>
    </Screen>
  );
}
