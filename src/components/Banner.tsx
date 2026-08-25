import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { TextAction } from './Button';
import { Icon, IconName } from './Icon';
import { Row } from './Layout';
import { Body, Mono, Title } from './Type';

/**
 * A standing notice: offline, quota exhausted, pending sync.
 *
 * Every one of these states has to say what still works. "You are offline" is
 * an announcement; "You are offline — logs are queued and will sync" is
 * information the user can act on, and the difference decides whether they keep
 * logging or close the app.
 */
export function Banner({
  tone = 'est',
  icon,
  title,
  detail,
  action,
}: {
  tone?: 'est' | 'det';
  icon: IconName;
  title: string;
  detail?: string;
  action?: { label: string; onPress: () => void };
}) {
  const { c, space, rule } = useTheme();
  const accent = tone === 'est' ? c.est : c.det;
  const bg = tone === 'est' ? c.estBg : c.detBg;

  return (
    <View
      accessibilityLiveRegion="polite"
      style={{
        backgroundColor: bg,
        borderLeftWidth: rule.edge,
        borderLeftColor: accent,
        paddingVertical: space.md,
        paddingHorizontal: space.lg,
      }}>
      <Row gap={space.md} align="flex-start">
        <View style={{ paddingTop: 1 }}>
          <Icon name={icon} size={15} color={accent} weight={2.2} />
        </View>
        <View style={{ flexShrink: 1, gap: 3 }}>
          <Title size={13.5} weight="700" color={accent}>
            {title}
          </Title>
          {detail ? (
            <Body size={13} tone="ink2">
              {detail}
            </Body>
          ) : null}
          {action ? <TextAction label={action.label} onPress={action.onPress} tone={tone} size={11.5} /> : null}
        </View>
      </Row>
    </View>
  );
}

/**
 * An empty state.
 *
 * Every one names the next action rather than describing the absence — an
 * empty list that only says "nothing here yet" makes the user find the way
 * out themselves.
 */
export function EmptyState({
  title,
  detail,
  children,
}: {
  title: string;
  detail?: string;
  children?: React.ReactNode;
}) {
  const { c, space } = useTheme();
  return (
    <View style={{ paddingVertical: space.xxl, paddingHorizontal: space.gutter, gap: space.sm, alignItems: 'flex-start' }}>
      <View style={{ height: 3, width: 34, backgroundColor: c.rule, marginBottom: space.sm }} />
      <Title size={17} weight="700">
        {title}
      </Title>
      {detail ? (
        <Body size={14.5} tone="ink2">
          {detail}
        </Body>
      ) : null}
      {children ? <View style={{ paddingTop: space.sm, alignSelf: 'stretch' }}>{children}</View> : null}
    </View>
  );
}

/** The footnote under a screen that makes a health claim. Required, not decorative. */
export function Disclaimer({ text }: { text: string }) {
  const { c } = useTheme();
  return (
    <Row gap={7} align="flex-start" style={{ paddingBottom: 2 }}>
      <View style={{ paddingTop: 2 }}>
        <Icon name="info" size={13} color={c.ink3} weight={2} />
      </View>
      <Mono size={11} tone="ink3" style={{ flexShrink: 1, lineHeight: 16 }}>
        {text}
      </Mono>
    </Row>
  );
}
