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
import { ACTIVITY, ageFrom, OBJECTIVE_LABEL } from '../../lib/nutrition';
import { useTheme } from '../../theme/ThemeProvider';
import { useAppState } from '../../state/AppState';
import type { ScreenProps } from '../../navigation/types';

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
 * submenu, and permissions are listed with their state so "what does this app
 * have access to" is one screen away. All of them are currently "not asked".
 */
export function YouScreen({ navigation }: ScreenProps<'You'>) {
  const { space } = useTheme();
  const api = useApi();
  const { profile, goal } = useAppState();


  return (
    <Screen scrollable>
      {/* Pushed now, not a tab, so it needs its own way back. */}
      <Header title="You" leading={{ icon: 'chevronLeft', onPress: () => navigation.goBack(), label: 'Back' }} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: space.huge }}>
        <Gutter>
          <Stack gap={space.xl}>
            {/* identity */}
            <Card>
              <Row gap={space.lg}>
                <FoodGlyph name="you" seed="account" size={56} icon="user" />
                <Stack gap={4} style={{ flexShrink: 1 }}>
                  <Txt role="h3">Your account</Txt>
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
              </Row>
            </Card>

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

            {/* permissions */}
            <Stack gap={space.md}>
              <SectionLabel>Permissions</SectionLabel>
              <Txt role="bodySm" tone="secondary">
                Each is asked at the moment it first becomes useful, never up front. None is required to log
                a meal.
              </Txt>
              <Card padded={false}>
                <SettingRow icon="mic" title="Microphone" value="Not asked" first />
                <SettingRow icon="clock" title="Meal reminders" value="Not asked" />
                <SettingRow icon="scale" title="Health data" value="Not asked" last />
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
