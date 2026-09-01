import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Icon } from '../../components/Icon';
import { Gap, Row } from '../../components/Layout';
import { Press } from '../../components/Press';
import { Txt } from '../../components/Text';
import { useTheme } from '../../theme/ThemeProvider';

/**
 * Gradient ids resolve by name, and three of these are on screen at once, so
 * each instance gets its own. Not `useId`, whose colons are invalid in a
 * `url(#…)` reference.
 */
let instances = 0;

/**
 * One dial: a ring, a figure inside it, and a label under it.
 *
 * Three of these across the top of Home, in the shape the reference uses —
 * equal circles, equal weight, each one a whole measure rather than a slice of
 * a bigger one. The single large ring said one thing very loudly; a row of
 * three says what the day actually consists of, and lets two of them be about
 * something other than calories.
 *
 * `progress` of null draws the track and nothing else, and the value shows
 * whatever the caller passes for "we do not know" — an em dash, never a zero.
 * A dial with no data must not look like a dial reading nought: the difference
 * between "you have not weighed yourself" and "you weigh nothing" is the whole
 * credibility of the screen.
 */
export function Dial({
  size,
  progress,
  value,
  unit,
  label,
  over,
  onPress,
  accessibilityLabel,
}: {
  size: number;
  /** 0–1, or null when there is nothing to draw. Over 1 is clamped by the caller. */
  progress: number | null;
  /** Pre-formatted. This draws numbers; it does not decide what they say. */
  value: string;
  unit?: string;
  label: string;
  /** Past the target: the arc completes and turns amber, as the old ring did. */
  over?: boolean;
  onPress?: () => void;
  accessibilityLabel: string;
}) {
  const { c, space } = useTheme();

  const id = React.useRef<string | null>(null);
  if (id.current === null) id.current = `dial${(instances += 1)}`;

  /**
   * The weight of the ring itself, at 6% of the diameter.
   *
   * This is the dial's presence: the circle's size is fixed by there being
   * three of them across one row, so the only thing that can make a dial read
   * as heavier or lighter is how thick its ring is drawn. Thin enough at 4% to
   * look like a hairline someone forgot to finish; past about 9% the arc
   * starts crowding the figure it is drawn around.
   */
  const stroke = Math.max(5, Math.round(size * 0.06));

  /**
   * A hairline of room inside the canvas, or the ring is shaved.
   *
   * At r = (size - stroke) / 2 the stroke reaches the exact edge of the SVG on
   * all four sides, and two things then eat into it: the arc's round cap,
   * which extends half a stroke past where the dash starts, and sub-pixel
   * rounding of the viewport itself. Both bite hardest at the top, where the
   * cap sits after the quarter-turn, and on the right where the width rounds
   * down — which is exactly where it was cutting.
   */
  const PAD = 2;
  const r = (size - stroke) / 2 - PAD;
  const circumference = 2 * Math.PI * r;
  const filled = progress === null ? 0 : Math.max(0, Math.min(progress, 1));

  return (
    <Press
      onPress={onPress}
      disabled={!onPress}
      feedback={onPress ? 'scale' : 'none'}
      haptic={onPress ? 'select' : null}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={accessibilityLabel}
      style={{ alignItems: 'center', flexGrow: 1, flexBasis: 0 }}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        {/* The face, in the same light as the page it sits on.

            Its own Svg, unrotated. The one below is turned a quarter turn so
            the arc starts at twelve o'clock, and a gradient defined inside it
            would be turned with it — a face lit from the left instead of from
            above, which is the one direction the page is not lit from.

            Same grey, same direction, far weaker. In the reference the inside
            of a ring is only a hair off the page — about #1E232A against
            #1A1E24 — so the disc is a suggestion of a face, not a plate: the
            ring is what you see, and the fill only stops the circle reading as
            a hole. */}
        <Svg width={size} height={size} style={{ position: 'absolute' }}>
          <Defs>
            <LinearGradient id={`${id.current}face`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={c.lift} stopOpacity={0.045} />
              <Stop offset="1" stopColor={c.lift} stopOpacity={0.012} />
            </LinearGradient>
          </Defs>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r - stroke / 2}
            fill={`url(#${id.current}face)`}
          />
        </Svg>

        <Svg
          width={size}
          height={size}
          style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
          <Defs>
            <LinearGradient id={id.current} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={over ? c.attention : c.ringFrom} />
              <Stop offset="1" stopColor={over ? c.attention : c.ringTo} />
            </LinearGradient>
          </Defs>

          {/* The unrun part of the ring, in a grey you can actually see.

              It was `sunken`, which is the colour of a well cut INTO a card —
              near-black, and on a near-black page that made the track vanish:
              a dial with nothing logged read as no dial at all, and a part-
              filled one read as an arc floating in space with no scale behind
              it. It is the same light as the face inside it now, a little
              denser: in the reference the ring and the disc it encloses are
              one material at two strengths, which is what makes a dial read as
              an object rather than as a hoop with something behind it. */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={c.lift}
            // Measured off the reference rather than guessed: its page reads
            // about #1A1E24 and its rings about #39404A, which is this grey at
            // roughly 0.15 over our own. Far enough above the page to hold a
            // scale behind a part-run arc, far enough below the ink that an
            // empty dial is furniture rather than a statement.
            strokeOpacity={0.15}
            strokeWidth={stroke}
          />

          {progress === null ? null : (
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={`url(#${id.current})`}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - filled)}
            />
          )}
        </Svg>

        <Row gap={2} align="baseline">
          <Txt
            role="h2"
            numeric
            tone={progress === null ? 'tertiary' : over ? 'attention' : 'ink'}
            style={{ fontSize: Math.round(size * 0.23), lineHeight: Math.round(size * 0.28) }}>
            {value}
          </Txt>
          {unit ? (
            <Txt role="caption" tone="tertiary">
              {unit}
            </Txt>
          ) : null}
        </Row>
      </View>

      <Gap h={space.sm} />

      {/* Label and chevron, as in the reference — the chevron is what says the
          dial is a door, and it is omitted when the dial does not open. */}
      <Row gap={3} align="center">
        <Txt role="caption" tone="secondary" caps style={{ letterSpacing: 1.2 }}>
          {label}
        </Txt>
        {onPress ? <Icon name="chevronRight" size={12} color={c.inkTertiary} weight={2.2} /> : null}
      </Row>
    </Press>
  );
}
