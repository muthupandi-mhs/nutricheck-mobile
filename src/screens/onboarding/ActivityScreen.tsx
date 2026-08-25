import React from 'react';
import { ScrollView, View } from 'react-native';
import { PrimaryButton } from '../../components/Button';
import { OptionRow, StepBar } from '../../components/Field';
import { Gap, Gutter, HeavyBar } from '../../components/Layout';
import { Dock, Screen } from '../../components/Screen';
import { Body, Display, Eyebrow } from '../../components/Type';
import { ACTIVITY } from '../../lib/nutrition';
import { useTheme } from '../../theme/ThemeProvider';
import { useOnboarding } from '../../state/Onboarding';
import type { ActivityLevel } from '../../api/types';
import type { ScreenProps } from '../../navigation/types';

/**
 * Activity level, in plain language.
 *
 * The five options map onto multipliers from 1.2 to 1.9, and the user never
 * sees one. "Desk job, little exercise" is a question someone can answer
 * correctly about themselves; "1.2×" is a question about a formula they have
 * not been shown, and it is answered wrong more often than it is answered.
 */
export function ActivityScreen({ navigation }: ScreenProps<'OnboardActivity'>) {
  const { c, space } = useTheme();
  const { draft, patch } = useOnboarding();

  const levels = Object.keys(ACTIVITY) as ActivityLevel[];

  return (
    <Screen edges="top">
      <StepBar step={3} of={6} />

      <Gutter>
        <Eyebrow size={10.5} tone="ink2">
          STEP 3 OF 6
        </Eyebrow>
        <Gap h={space.sm} />
        <Display size={32}>How active are you?</Display>
        <Gap h={space.sm} />
        <Body size={15.5} tone="ink2">
          Across a normal week, not your best one. Pick low if you are unsure — it is easier to
          notice a target that is too small than one that is too large.
        </Body>
      </Gutter>

      <Gap h={space.lg} />
      <HeavyBar />

      <ScrollView contentContainerStyle={{ paddingVertical: space.sm }}>
        <View style={{ borderBottomWidth: 1, borderBottomColor: c.rule }}>
          {levels.map((level, i) => (
            <OptionRow
              key={level}
              title={ACTIVITY[level].label}
              detail={ACTIVITY[level].detail}
              selected={draft.activityLevel === level}
              onPress={() => patch({ activityLevel: level })}
              last={i === levels.length - 1}
            />
          ))}
        </View>
      </ScrollView>

      <Dock>
        <PrimaryButton label="Continue" onPress={() => navigation.navigate('OnboardObjective')} />
      </Dock>
    </Screen>
  );
}
