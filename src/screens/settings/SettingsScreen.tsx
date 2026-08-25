import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SCENARIOS, getScenario, setScenario, type Scenario } from '../../api/mock/scenarios';
import { Disclaimer } from '../../components/Banner';
import { IconButton, PressableRow } from '../../components/Button';
import { OptionRow } from '../../components/Field';
import { Divider, Gap, Gutter, Hairline, Row, SplitRow } from '../../components/Layout';
import { Masthead, Screen } from '../../components/Screen';
import { Body, Eyebrow, Mono, Num, Title } from '../../components/Type';
import { ACTIVITY, ageFrom, OBJECTIVE_LABEL } from '../../lib/nutrition';
import { kcal } from '../../lib/format';
import { useTheme } from '../../theme/ThemeProvider';
import { useAppState } from '../../state/AppState';
import type { ScreenProps } from '../../navigation/types';

function SettingRow({
  title,
  value,
  onPress,
  destructive,
  last,
}: {
  title: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  last?: boolean;
}) {
  const { c, space } = useTheme();
  const body = (
    <SplitRow style={{ paddingVertical: 14, minHeight: 52 }}>
      <Title size={15} weight="600" tone={destructive ? 'est' : 'ink'}>
        {title}
      </Title>
      <Row gap={8}>
        {value ? (
          <Mono size={11.5} tone="ink3">
            {value}
          </Mono>
        ) : null}
        {onPress ? <IconButton name="chevronRight" size={15} color={c.ink3} onPress={onPress} style={{ width: 20, height: 20 }} accessibilityLabel={title} /> : null}
      </Row>
    </SplitRow>
  );
  return (
    <View>
      {onPress ? (
        <PressableRow onPress={onPress} accessibilityLabel={title} style={{ paddingHorizontal: space.gutter }}>
          {body}
        </PressableRow>
      ) : (
        <Gutter>{body}</Gutter>
      )}
      {!last && <Hairline />}
    </View>
  );
}

/**
 * Settings.
 *
 * Two things here are not decoration:
 *
 *  • **Export and delete are top-level rows**, not buried behind an account
 *    submenu. A health app that makes deletion hard is a health app people are
 *    right to distrust.
 *  • **The developer section** flips the failure scenarios in
 *    `src/api/mock/scenarios.ts` at runtime. Every row of USER-FLOWS §8 is a
 *    screen someone has to review; if the only way to see the offline state is
 *    to turn off wi-fi at the right moment, it does not get reviewed. This
 *    section disappears with the mock API.
 */
export function SettingsScreen({ navigation }: ScreenProps<'Settings'>) {
  const { c, space } = useTheme();
  const { profile, goal } = useAppState();
  const [scenario, setLocalScenario] = useState<Scenario>(getScenario());
  const [devOpen, setDevOpen] = useState(false);

  const pick = (s: Scenario) => {
    setScenario(s);
    setLocalScenario(s);
  };

  return (
    <Screen edges="top">
      <Masthead
        title="Settings"
        actions={[{ icon: 'close', onPress: () => navigation.goBack(), label: 'Close' }]}
      />

      <ScrollView contentContainerStyle={{ paddingBottom: space.xxl }}>
        <Gutter style={{ paddingTop: space.lg, paddingBottom: space.sm }}>
          <Eyebrow size={10} tone="ink2">
            TARGETS
          </Eyebrow>
        </Gutter>
        <SettingRow title="Daily calories" value={goal ? `${kcal(goal.kcal)} kcal` : '—'} onPress={() => navigation.navigate('GoalEditor')} />
        <SettingRow title="Protein" value={goal ? `${goal.proteinG} g` : '—'} onPress={() => navigation.navigate('GoalEditor')} />
        <SettingRow title="Fiber" value={goal ? `${goal.fiberG} g` : '—'} onPress={() => navigation.navigate('GoalEditor')} last />

        <Gap h={space.lg} />
        <Divider />

        <Gutter style={{ paddingTop: space.lg, paddingBottom: space.sm }}>
          <Eyebrow size={10} tone="ink2">
            ABOUT YOU
          </Eyebrow>
        </Gutter>
        <SettingRow title="Age" value={profile ? `${ageFrom(profile.birthDate)}` : '—'} />
        <SettingRow title="Height" value={profile ? `${profile.heightCm} cm` : '—'} />
        <SettingRow title="Weight" value={profile ? `${profile.weightKg} kg` : '—'} />
        <SettingRow title="Activity" value={profile ? ACTIVITY[profile.activityLevel].label.split('—')[0].trim() : '—'} />
        <SettingRow title="Objective" value={profile ? OBJECTIVE_LABEL[profile.objective] : '—'} last />

        <Gap h={space.lg} />
        <Divider />

        <Gutter style={{ paddingTop: space.lg, paddingBottom: space.sm }}>
          <Eyebrow size={10} tone="ink2">
            PERMISSIONS
          </Eyebrow>
          <Gap h={6} />
          <Body size={13.5} tone="ink2">
            Each of these is asked at the moment it is first useful, never up front. Nothing here is
            required to log a meal.
          </Body>
        </Gutter>
        <SettingRow title="Microphone" value="Not asked yet" />
        <SettingRow title="Reminders" value="Not asked yet" />
        <SettingRow title="Health data" value="Not asked yet" last />

        <Gap h={space.lg} />
        <Divider />

        <Gutter style={{ paddingTop: space.lg, paddingBottom: space.sm }}>
          <Eyebrow size={10} tone="ink2">
            YOUR DATA
          </Eyebrow>
        </Gutter>
        <SettingRow title="Export everything" value="JSON" onPress={() => {}} />
        <SettingRow title="Privacy and what we store" onPress={() => {}} />
        <SettingRow title="Delete account and all logs" destructive onPress={() => {}} last />

        <Gap h={space.lg} />
        <Divider />

        {/* ── developer ─────────────────────────────────────────────────── */}
        <PressableRow onPress={() => setDevOpen(o => !o)} accessibilityLabel="Developer options">
          <Gutter style={{ paddingTop: space.lg, paddingBottom: space.sm }}>
            <SplitRow>
              <Eyebrow size={10} tone="ink2">
                DEVELOPER — MOCK BACKEND
              </Eyebrow>
              <Mono size={10.5} tone="det">
                {devOpen ? 'hide' : scenario}
              </Mono>
            </SplitRow>
          </Gutter>
        </PressableRow>

        {devOpen && (
          <>
            <Gutter style={{ paddingBottom: space.md }}>
              <Body size={13.5} tone="ink2">
                Forces a failure path so its screen can be reviewed on demand. These vanish with the
                mock API — see <Mono size={12}>src/api/mock/</Mono>.
              </Body>
            </Gutter>
            <View style={{ borderTopWidth: 1, borderTopColor: c.rule }}>
              {SCENARIOS.map((s, i) => (
                <OptionRow
                  key={s.id}
                  title={s.label}
                  detail={s.detail}
                  selected={scenario === s.id}
                  onPress={() => pick(s.id)}
                  last={i === SCENARIOS.length - 1}
                />
              ))}
            </View>
            <Gutter style={{ paddingTop: space.md }}>
              <Num size={10.5} tone="ink3">
                Pull down on Today after switching — the scenario applies to the next request.
              </Num>
            </Gutter>
          </>
        )}

        <Gap h={space.xl} />
        <Gutter>
          <Disclaimer text="NutriCheck gives estimates for general wellness. It is not medical advice, and it is not a substitute for a clinician." />
          <Gap h={space.md} />
          <Mono size={10} tone="ink3">
            v0.1.0 · mock backend
          </Mono>
        </Gutter>
      </ScrollView>
    </Screen>
  );
}
