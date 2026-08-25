import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useTheme } from '../theme/ThemeProvider';

/**
 * The icon set, traced from the design canvas.
 *
 * All of them are 24×24, stroked, never filled — a filled icon would read as a
 * different weight class next to Archivo and break the flat, drawn look the
 * canvas establishes. `strokeWidth` scales inversely with size so a 12px icon
 * has the same optical weight as a 22px one.
 */

export type IconName =
  | 'gear'
  | 'plus'
  | 'close'
  | 'search'
  | 'mic'
  | 'check'
  | 'arrowRight'
  | 'chevronLeft'
  | 'chevronRight'
  | 'chevronDown'
  | 'layers'
  | 'clock'
  | 'alert'
  | 'info'
  | 'pencil'
  | 'sparkle'
  | 'trash'
  | 'undo'
  | 'cloudOff'
  | 'chart'
  | 'flame';

type Props = {
  name: IconName;
  size?: number;
  /** Defaults to the current text colour. */
  color?: string;
  /** Optical weight. Overridden rarely; the default tracks size. */
  weight?: number;
};

export function Icon({ name, size = 18, color, weight }: Props) {
  const { c } = useTheme();
  const stroke = color ?? c.ink;
  const sw = weight ?? Math.max(1.5, 24 / size + 0.6);
  const common = {
    stroke,
    strokeWidth: sw,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'gear' && (
        <>
          <Circle cx={12} cy={12} r={3.2} {...common} />
          <Path
            d="M12 2.5v3M12 18.5v3M21.5 12h-3M5.5 12h-3M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1M18.7 18.7l-2.1-2.1M7.4 7.4L5.3 5.3"
            {...common}
          />
        </>
      )}
      {name === 'plus' && <Path d="M12 5v14M5 12h14" {...common} />}
      {name === 'close' && <Path d="M6 6l12 12M18 6L6 18" {...common} />}
      {name === 'search' && (
        <>
          <Circle cx={11} cy={11} r={7} {...common} />
          <Path d="M16.2 16.2L21 21" {...common} />
        </>
      )}
      {name === 'mic' && (
        <>
          <Rect x={9} y={2.5} width={6} height={11.5} rx={3} {...common} />
          <Path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3.5" {...common} />
        </>
      )}
      {name === 'check' && <Path d="M4.5 12.5l5 5 10-11" {...common} />}
      {name === 'arrowRight' && <Path d="M5 12h13M12.5 6l6 6-6 6" {...common} />}
      {name === 'chevronLeft' && <Path d="M14.5 5l-7 7 7 7" {...common} />}
      {name === 'chevronRight' && <Path d="M9.5 5l7 7-7 7" {...common} />}
      {name === 'chevronDown' && <Path d="M5 9.5l7 7 7-7" {...common} />}
      {name === 'layers' && (
        <Path d="M3 7.5l9-4.5 9 4.5-9 4.5zM3 12.5l9 4.5 9-4.5M3 17l9 4.5 9-4.5" {...common} />
      )}
      {name === 'clock' && (
        <>
          <Circle cx={12} cy={12} r={9} {...common} />
          <Path d="M12 7v5.2l3.2 2" {...common} />
        </>
      )}
      {name === 'alert' && <Path d="M12 3.5L22 20H2zM12 9.5v4.2M12 17v.1" {...common} />}
      {name === 'info' && (
        <>
          <Circle cx={12} cy={12} r={9.5} {...common} />
          <Path d="M12 7.5v5.5M12 16.4v.1" {...common} />
        </>
      )}
      {name === 'pencil' && <Path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17v3z" {...common} />}
      {name === 'sparkle' && (
        <Path
          d="M12 3v3.5M12 17.5V21M21 12h-3.5M6.5 12H3M18.4 5.6l-2.5 2.5M8.1 15.9l-2.5 2.5M18.4 18.4l-2.5-2.5M8.1 8.1L5.6 5.6"
          {...common}
        />
      )}
      {name === 'trash' && (
        <Path d="M4 6.5h16M9.5 6.5V4h5v2.5M6.5 6.5l1 14h9l1-14M10 10.5v6M14 10.5v6" {...common} />
      )}
      {name === 'undo' && <Path d="M4 9h10a5.5 5.5 0 1 1 0 11h-6M4 9l4-4M4 9l4 4" {...common} />}
      {name === 'cloudOff' && (
        <Path d="M3 3l18 18M7 18h9.5a4 4 0 0 0 1.2-7.8A6 6 0 0 0 8.3 7.4M5.6 10.4A4 4 0 0 0 7 18" {...common} />
      )}
      {name === 'chart' && <Path d="M4 20V9M10 20V4M16 20v-7M22 20H2" {...common} />}
      {name === 'flame' && (
        <Path d="M12 21c3.9 0 6.5-2.5 6.5-6 0-4.5-4-6.5-4.5-11-2 2-3 4-3 6-1-.5-1.5-1.5-1.5-3-2 2-4 4.5-4 8 0 3.5 2.6 6 6.5 6z" {...common} />
      )}
    </Svg>
  );
}
