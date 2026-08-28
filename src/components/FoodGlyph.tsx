import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Icon, IconName } from './Icon';

/**
 * The tinted glyph at the head of every food row. The tint derives from the food
 * id, so a food keeps its colour across screens and sessions — re-rolling it per
 * render is what makes a coloured list look cheap.
 */

/** Food name → category glyph. Ordered: the first match wins. */
const RULES: Array<[RegExp, IconName]> = [
  [/oat|rice|roti|bread|chapati|poha|grain|pasta|noodle|cereal/i, 'grain'],
  [/dal|lentil|rajma|bean|chickpea|chana/i, 'bowl'],
  [/chicken|egg|fish|mutton|beef|pork|paneer|tofu|whey|protein/i, 'egg'],
  [/milk|yogurt|yoghurt|curd|dahi|cheese|cream|lassi/i, 'cup'],
  [/coffee|tea|latte|espresso|flat white|juice|water|soda/i, 'cup'],
  [/almond|nut|peanut|cashew|seed|butter/i, 'nut'],
  [/spinach|palak|salad|broccoli|kale|veg|greens/i, 'leaf'],
  [/apple|banana|mango|orange|berry|fruit|grape/i, 'apple'],
];

export const glyphFor = (name: string): IconName => {
  for (const [pattern, icon] of RULES) if (pattern.test(name)) return icon;
  return 'bowl';
};

export function FoodGlyph({
  name,
  seed,
  size = 44,
  icon,
  shape = 'rounded',
}: {
  name: string;
  /** Stable tint key. Defaults to the name; pass the food id where you have it. */
  seed?: string;
  size?: number;
  icon?: IconName;
  /**
   * `round` makes the tile a circle, matching a button.
   *
   * Defaulted to `rounded` so this is opt-in per screen rather than a change to
   * every food row in the app at once. The two are not interchangeable: a
   * rounded square reads as a thumbnail — a stand-in for a photograph of the
   * food — and a circle reads as a control. Use `round` where the row IS the
   * control and there is nothing else on it to tap.
   */
  shape?: 'rounded' | 'round';
}) {
  const { c, radius, glyphTint } = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: shape === 'round' ? radius.pill : radius.md,
        backgroundColor: glyphTint(seed ?? name),
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Icon name={icon ?? glyphFor(name)} size={size * 0.5} color={c.inkSecondary} weight={1.7} />
    </View>
  );
}
