import React from 'react';
import { View } from 'react-native';
import { PrimaryButton, TextAction } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { Divider, Gap, Gutter, HeavyBar, Row, Spacer, SplitRow } from '../../components/Layout';
import { Dock, Screen } from '../../components/Screen';
import { Body, Display, Eyebrow, Mono, Num } from '../../components/Type';
import { useTheme } from '../../theme/ThemeProvider';
import type { ScreenProps } from '../../navigation/types';

/**
 * One screen, one sentence about what the app does. No carousel.
 *
 * The demo block below the headline is the entire product argument made
 * literally: a sentence in, three numbers out. It is worth more than four
 * swipeable slides of benefit copy, and it costs the user nothing to skip.
 */
export function WelcomeScreen({ navigation }: ScreenProps<'Welcome'>) {
  const { c, space } = useTheme();

  return (
    <Screen>
      <Gutter>
        <Eyebrow size={11} tone="ink3">
          NUTRICHECK
        </Eyebrow>
        <Gap h={space.lg} />
        <Display size={38}>Log a meal in a sentence.</Display>
        <Gap h={space.md} />
        <Body size={16} tone="ink2">
          Type what you ate, the way you would say it. We work out the calories, protein and
          fiber — and show our working.
        </Body>
      </Gutter>

      <Gap h={space.xl} />
      <HeavyBar />

      <Gutter style={{ paddingTop: space.xl }}>
        <View
          style={{
            backgroundColor: c.surface,
            borderWidth: 1,
            borderColor: c.rule,
            borderTopWidth: 3,
            borderTopColor: c.est,
            padding: space.lg,
          }}>
          <Eyebrow size={10} tone="ink3">
            YOU TYPE
          </Eyebrow>
          <Gap h={space.sm} />
          <Body size={18} tone="ink" style={{ fontStyle: 'italic' }}>
            “two rotis, dal and a bowl of curd”
          </Body>
        </View>

        <Row gap={space.sm} style={{ paddingVertical: space.md, paddingLeft: 2 }}>
          <Icon name="arrowRight" size={15} color={c.det} weight={2.2} />
          <Mono size={10.5} tone="det">
            ABOUT TWO SECONDS LATER
          </Mono>
        </Row>

        <View style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.rule, padding: space.lg }}>
          <SplitRow>
            {[
              ['CALORIES', '482', ''],
              ['PROTEIN', '21', 'g'],
              ['FIBER', '12', 'g'],
            ].map(([label, value, unit]) => (
              <View key={label} style={{ gap: 3 }}>
                <Eyebrow size={9.5} tone="ink2">
                  {label}
                </Eyebrow>
                <Row gap={3} align="baseline">
                  <Display size={26}>{value}</Display>
                  {unit ? (
                    <Mono size={13} tone="ink2">
                      {unit}
                    </Mono>
                  ) : null}
                </Row>
              </View>
            ))}
          </SplitRow>
        </View>
      </Gutter>

      <Spacer />
      <Divider />

      <Gutter style={{ paddingVertical: space.md }}>
        <Row gap={space.sm}>
          <Icon name="check" size={13} color={c.det} weight={2.8} />
          <Num size={11.5} tone="ink2">
            No camera, no microphone, no notifications required
          </Num>
        </Row>
      </Gutter>

      <Dock divided={false}>
        <PrimaryButton label="Get started" onPress={() => navigation.navigate('SignIn')} />
        <Gap h={space.md} />
        <View style={{ alignItems: 'center' }}>
          <TextAction label="I already have an account" onPress={() => navigation.navigate('SignIn')} />
        </View>
      </Dock>
    </Screen>
  );
}
