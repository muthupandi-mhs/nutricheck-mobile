import React, { useMemo } from 'react';
import { Button } from '../../components/Button';
import { Notice } from '../../components/Feedback';
import { Icon } from '../../components/Icon';
import { Row, Stack } from '../../components/Layout';
import { Press } from '../../components/Press';
import { Txt } from '../../components/Text';
import { deriveGoal } from '../../lib/nutrition';
import { useTheme } from '../../theme/ThemeProvider';
import { useOnboarding } from '../../state/Onboarding';
import { OnboardStep } from './OnboardStep';
import { useTargetsPrefetch } from './useTargetsPrefetch';
import type { ScreenProps } from '../../navigation/types';

const RATES = [0.25, 0.5, 0.75, 1.0];

/**
 * How fast, on its own screen.
 *
 * It shared the objective step and was the smaller half of it: a direction is
 * picked in a glance and a rate is a judgement, and the two sat under one
 * heading as though they were one question. Apart, each screen asks one thing.
 *
 * Only reached when there is a rate to pick. Somebody maintaining their weight
 * skips it, because "how fast would you like to stay the same" is not a
 * question — the objective step sends them straight on.
 *
 * A rate whose deficit would take the target below resting burn is disabled and
 * says so, rather than being offered and silently clipped on the next screen.
 */
export function RateScreen({ navigation }: ScreenProps<'OnboardRate'>) {
  const { space } = useTheme();
  const { draft, patch, toProfile } = useOnboarding();
  const targets = useTargetsPrefetch(navigation);

  const profile = toProfile();
  const goal = useMemo(() => deriveGoal(profile), [profile]);
  const rateAllowed = (rate: number) => !deriveGoal({ ...profile, rateKgPerWeek: rate }).basis.flooredAtBmr;

  const verb = draft.objective === 'gain' ? 'gain' : 'lose';

  return (
    <OnboardStep
      title={`How fast do you want to ${verb} it?`}
      footer={
        <Button
          label="See my targets"
          loading={targets.asking}
          onPress={targets.go}
          haptic="select"
        />
      }>
      <Stack gap={space.md}>
        {RATES.map(rate => (
          <RateRow
            key={rate}
            rate={rate}
            verb={verb}
            selected={draft.rateKgPerWeek === rate}
            allowed={rateAllowed(rate)}
            onPress={() => patch({ rateKgPerWeek: rate })}
          />
        ))}

        {RATES.some(r => !rateAllowed(r)) ? (
          <Txt role="bodySm" tone="secondary">
            Dimmed rates would put your target below your resting burn.
          </Txt>
        ) : null}

        {goal.basis.flooredAtBmr && (
          <Notice
            icon="alert"
            title="Held at your resting burn"
            detail="The rate you picked would set a target below what your body spends at rest. We do not go under it."
          />
        )}
      </Stack>
    </OnboardStep>
  );
}

/**
 * One rate, as a full-width row.
 *
 * The number sits in a fixed column so all four line up under each other
 * regardless of how many characters they have — 0.25 and 1 take the same width
 * of space, which is the whole reason a column of numbers reads as a scale
 * rather than as four separate labels.
 *
 * A disallowed rate stays on the list, dimmed, rather than disappearing. Four
 * options that become two as the weight is edited would be a scale that keeps
 * changing shape; and a rate that is missing tells nobody why, where one that
 * is visible and out of reach is explained by the line beneath.
 */
function RateRow({
  rate,
  verb,
  selected,
  allowed,
  onPress,
}: {
  rate: number;
  verb: string;
  selected: boolean;
  allowed: boolean;
  onPress: () => void;
}) {
  const { c, radius, space } = useTheme();

  return (
    <Press
      onPress={allowed ? onPress : undefined}
      disabled={!allowed}
      haptic="select"
      feedback="none"
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: !allowed }}
      accessibilityLabel={
        allowed
          ? `${verb} ${rate} kilograms per week, ${RATE_WORD[rate]}`
          : `${rate} kilograms per week is unavailable — it would take your target below your resting burn`
      }
      style={{
        opacity: allowed ? 1 : 0.35,
        backgroundColor: c.surface,
        borderRadius: radius.lg,
        borderWidth: 2,
        borderColor: selected ? c.ink : 'transparent',
        paddingVertical: space.lg,
        paddingHorizontal: space.lg,
      }}>
      <Row gap={space.lg}>
        {/* Right-aligned in a fixed column: the decimal points stack, so the
            four numbers read as one scale instead of four labels. */}
        <Txt
          role="h3"
          numeric
          color={selected ? c.ink : c.inkSecondary}
          style={{ width: 44, textAlign: 'right' }}>
          {rate}
        </Txt>
        <Txt role="body" color={selected ? c.ink : c.inkSecondary} style={{ flexGrow: 1 }}>
          {RATE_WORD[rate]}
        </Txt>
        {selected ? <Icon name="check" size={18} color={c.ink} weight={2.4} /> : null}
      </Row>
    </Press>
  );
}

/** What each rate feels like. The number is the amount; this is the meaning. */
const RATE_WORD: Record<number, string> = {
  0.25: 'Gentle',
  0.5: 'Steady',
  0.75: 'Brisk',
  1: 'Fast',
};
