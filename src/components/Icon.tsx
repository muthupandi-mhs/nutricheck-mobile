import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useTheme } from '../theme/ThemeProvider';

/**
 * The icon set. Drawn on a 24×24 grid, stroked, rounded joins, never filled.
 * Two rules keep a hand-rolled set from looking hand-rolled: one stroke weight
 * across the whole set, scaled inversely with size so a 14px glyph carries the
 * same optical weight as a 26px one; and nothing filled, since a filled glyph
 * breaks the density of a row that mixes them.
 */

export type IconName =
  | 'home'
  | 'chart'
  | 'user'
  | 'plus'
  | 'close'
  | 'search'
  | 'mic'
  | 'check'
  | 'arrowRight'
  | 'chevronLeft'
  | 'chevronRight'
  | 'chevronDown'
  | 'settings'
  | 'clock'
  | 'calendar'
  | 'alert'
  | 'info'
  | 'edit'
  | 'sparkle'
  // A bulb, for the thing the app remembers about you. Stroked and open like
  // the rest of the set: the filament is two lines rather than a filled glow,
  // because nothing here is filled and a lit bulb would be the only glyph in
  // the app claiming a state.
  | 'bulb'
  | 'trash'
  | 'undo'
  | 'offline'
  | 'flame'
  // Activity levels. One silhouette each rather than a set of figures: two
  // people at this size are the same two sticks, so it escalates by subject —
  // sitting, walking, training, burning — not by pose.
  | 'desk'
  | 'shoe'
  | 'dumbbell'
  | 'run'
  | 'bolt'
  // Objective. The same weighing dial three times, its needle low, level and
  // high — one metaphor in three states rather than three abstract arrows. An
  // arrow says "down"; a dial with the needle swung left says "less weight",
  // which is the actual question.
  | 'dialLow'
  | 'dialLevel'
  | 'dialHigh'
  | 'bookmark'
  | 'bowl'
  | 'leaf'
  | 'scale'
  | 'egg'
  | 'apple'
  | 'grain'
  | 'cup'
  | 'nut';

export function Icon({
  name,
  size = 22,
  color,
  weight,
}: {
  name: IconName;
  size?: number;
  color?: string;
  /** Override optical weight. Defaults to a size-compensated 1.8 at 22px. */
  weight?: number;
}) {
  const { c } = useTheme();
  const stroke = color ?? c.ink;
  const sw = weight ?? Math.max(1.5, Math.min(2.4, 40 / size));
  const p = {
    stroke,
    strokeWidth: sw,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'home' && <Path d="M3.5 10.4 12 3.8l8.5 6.6V19a1.5 1.5 0 0 1-1.5 1.5h-3.2v-5.2H9.2v5.2H5A1.5 1.5 0 0 1 3.5 19z" {...p} />}
      {name === 'chart' && <Path d="M4 19.5V12M9.3 19.5V5.5M14.7 19.5v-9M20 19.5v-5" {...p} />}
      {name === 'user' && (
        <>
          <Circle cx={12} cy={8} r={3.6} {...p} />
          <Path d="M4.8 20a7.4 7.4 0 0 1 14.4 0" {...p} />
        </>
      )}
      {name === 'plus' && <Path d="M12 5.2v13.6M5.2 12h13.6" {...p} />}
      {name === 'close' && <Path d="M6.4 6.4l11.2 11.2M17.6 6.4L6.4 17.6" {...p} />}
      {name === 'search' && (
        <>
          <Circle cx={11} cy={11} r={6.8} {...p} />
          <Path d="M16 16l4.4 4.4" {...p} />
        </>
      )}
      {name === 'mic' && (
        <>
          <Rect x={9} y={2.8} width={6} height={11} rx={3} {...p} />
          <Path d="M5.6 11.4a6.4 6.4 0 0 0 12.8 0M12 17.8v3.4" {...p} />
        </>
      )}
      {name === 'check' && <Path d="M5 12.6l4.6 4.6L19 7.4" {...p} />}
      {name === 'arrowRight' && <Path d="M4.6 12h14.2M13 6.2l5.8 5.8-5.8 5.8" {...p} />}
      {name === 'chevronLeft' && <Path d="M14.6 5.6L8.2 12l6.4 6.4" {...p} />}
      {name === 'chevronRight' && <Path d="M9.4 5.6L15.8 12l-6.4 6.4" {...p} />}
      {name === 'chevronDown' && <Path d="M5.6 9.4L12 15.8l6.4-6.4" {...p} />}
      {name === 'settings' && (
        <>
          <Circle cx={12} cy={12} r={3.1} {...p} />
          <Path d="M12 2.6v2.6M12 18.8v2.6M21.4 12h-2.6M5.2 12H2.6M18.6 5.4l-1.8 1.8M7.2 16.8l-1.8 1.8M18.6 18.6l-1.8-1.8M7.2 7.2 5.4 5.4" {...p} />
        </>
      )}
      {name === 'clock' && (
        <>
          <Circle cx={12} cy={12} r={8.6} {...p} />
          <Path d="M12 7.2v5l3.2 2" {...p} />
        </>
      )}
      {/* A month block, not a page with a date on it: this opens a grid of
          days, and the tick marks at the top are the two hangers every
          calendar app has trained people to recognise at 22px. */}
      {name === 'calendar' && (
        <>
          <Rect x={3.2} y={5} width={17.6} height={16} rx={2.6} {...p} />
          <Path d="M3.2 9.6h17.6M8 2.8v4.2M16 2.8v4.2" {...p} />
        </>
      )}
      {name === 'alert' && (
        <>
          <Path d="M10.7 3.9 2.5 18.2A1.5 1.5 0 0 0 3.8 20.5h16.4a1.5 1.5 0 0 0 1.3-2.3L13.3 3.9a1.5 1.5 0 0 0-2.6 0z" {...p} />
          <Path d="M12 9.4v4.1M12 16.9v.1" {...p} />
        </>
      )}
      {name === 'info' && (
        <>
          <Circle cx={12} cy={12} r={8.8} {...p} />
          <Path d="M12 11.2v5M12 7.9v.1" {...p} />
        </>
      )}
      {name === 'edit' && <Path d="M4 20h4.2L20 8.2a2.2 2.2 0 0 0-3.1-3.1L5 16.9zM14.8 6.6l2.6 2.6" {...p} />}
      {name === 'bulb' && (
        <>
          {/* Glass, then the collar, then the base: three strokes so the shape
              survives at 14px, where a filament drawn inside the glass turns
              into a smudge. */}
          <Path
            d="M12 3.2a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2v.4h5.2v-.4c0-.8.4-1.5 1-2A6 6 0 0 0 12 3.2z"
            {...p}
          />
          <Path d="M9.4 18.4h5.2M10.4 20.8h3.2" {...p} />
        </>
      )}
      {name === 'sparkle' && (
        <Path d="M12 3.4l1.9 4.7 4.7 1.9-4.7 1.9L12 16.6l-1.9-4.7-4.7-1.9 4.7-1.9zM19 16l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" {...p} />
      )}
      {name === 'trash' && <Path d="M4.4 6.6h15.2M9.8 6.6V4.4h4.4v2.2M6.8 6.6l.9 13.1h8.6l.9-13.1M10.2 10.4v5.6M13.8 10.4v5.6" {...p} />}
      {name === 'undo' && <Path d="M4 9.4h10.6a5.4 5.4 0 1 1 0 10.8H8.6M4 9.4l4-4M4 9.4l4 4" {...p} />}
      {name === 'offline' && <Path d="M3 3l18 18M7.4 18.2h9a4.1 4.1 0 0 0 1.2-8A6.1 6.1 0 0 0 8.6 7.1M5.7 10.6a4.1 4.1 0 0 0 1.4 7.6" {...p} />}
      {name === 'desk' && (
        <>
          <Rect x={3.4} y={4.4} width={17.2} height={10.6} rx={1.8} {...p} />
          <Path d="M12 15v3.6M8.2 18.6h7.6" {...p} />
        </>
      )}
      {name === 'shoe' && (
        <Path
          d="M3.6 17.2h12.8c2.4 0 4-1 4-2.4 0-1.1-1-1.7-2.3-2.2l-4-1.5-2-2.5-2 1.6v2.6H3.6z"
          {...p}
        />
      )}
      {name === 'dumbbell' && (
        <Path d="M8.4 12h7.2M6.2 8.8v6.4M17.8 8.8v6.4M3.8 10.2v3.6M20.2 10.2v3.6" {...p} />
      )}
      {name === 'run' && (
        <>
          <Circle cx={14.8} cy={5.2} r={2.1} {...p} />
          <Path d="M12.8 9.6 9.2 12.2l2.9 2.5-1.7 5.4" {...p} />
          <Path d="M12.1 14.7l3.9 1 1.7 4.4" {...p} />
          <Path d="M12.9 11.1l3.9 1.4 2.4-1.7" {...p} />
        </>
      )}
      {/* Built off the same circle and centre as `scale`, so the dial reads as
          the same object each time and only the needle has moved. */}
      {name === 'dialLow' && (
        <>
          <Circle cx={12} cy={12} r={8.6} {...p} />
          <Path d="M12 12 6.4 8.6" {...p} />
        </>
      )}
      {name === 'dialLevel' && (
        <>
          <Circle cx={12} cy={12} r={8.6} {...p} />
          <Path d="M12 12V5.4" {...p} />
        </>
      )}
      {name === 'dialHigh' && (
        <>
          <Circle cx={12} cy={12} r={8.6} {...p} />
          <Path d="M12 12 17.6 8.6" {...p} />
        </>
      )}
      {name === 'bolt' && <Path d="M13.4 2.6 5.6 13.4h5.2l-.6 8 7.8-10.8h-5.2z" {...p} />}
      {name === 'flame' && <Path d="M12 21c3.8 0 6.4-2.5 6.4-5.9 0-4.4-3.9-6.4-4.4-10.8-2 2-3 3.9-3 5.9-1-.5-1.5-1.5-1.5-3-2 2-3.9 4.4-3.9 7.9C5.6 18.5 8.2 21 12 21z" {...p} />}
      {name === 'bookmark' && <Path d="M6.4 4.4h11.2v16l-5.6-4-5.6 4z" {...p} />}
      {name === 'bowl' && <Path d="M3.4 10.6h17.2a8.6 8.6 0 0 1-8.6 8.4 8.6 8.6 0 0 1-8.6-8.4zM8.4 7.4c0-1.4 1.2-2 1.2-3.2M12 7.4c0-1.4 1.2-2 1.2-3.2M15.6 7.4c0-1.4 1.2-2 1.2-3.2" {...p} />}
      {name === 'leaf' && <Path d="M4.6 19.4c-1.6-6.6 2.4-13 14.8-14.4 1.4 9.6-4 15.4-11.4 14.6M8 16.2c1.6-3.6 4.4-6.4 8-7.8" {...p} />}
      {name === 'scale' && (
        <>
          <Circle cx={12} cy={12} r={8.6} {...p} />
          <Path d="M12 12l4-4" {...p} />
        </>
      )}
      {name === 'egg' && <Path d="M12 3.4c3.4 0 6.2 5.2 6.2 9.2A6.2 6.2 0 0 1 12 20.6a6.2 6.2 0 0 1-6.2-8C5.8 8.6 8.6 3.4 12 3.4z" {...p} />}
      {name === 'apple' && <Path d="M12 8c-3.6-2.6-7.4.4-7.4 5 0 4 2.8 7.6 4.8 7.6 1.2 0 1.6-.8 2.6-.8s1.4.8 2.6.8c2 0 4.8-3.6 4.8-7.6 0-4.6-3.8-7.6-7.4-5zM12 8c0-2 1.2-3.6 3-4.2" {...p} />}
      {name === 'grain' && <Path d="M12 21V8M12 8c0-2.6 2-4.6 4.6-4.6 0 2.6-2 4.6-4.6 4.6zM12 8C12 5.4 10 3.4 7.4 3.4 7.4 6 9.4 8 12 8zM12 14.4c0-2.6 2-4.6 4.6-4.6 0 2.6-2 4.6-4.6 4.6zM12 14.4c0-2.6-2-4.6-4.6-4.6 0 2.6 2 4.6 4.6 4.6z" {...p} />}
      {name === 'cup' && <Path d="M4.6 6.6h12v6.8a5.4 5.4 0 0 1-10.8 0zM16.6 8.4h1.8a2.6 2.6 0 0 1 0 5.2h-1.8M4 20.6h13.2" {...p} />}
      {name === 'nut' && (
        <>
          <Path d="M12 3.6 20 8v8l-8 4.4L4 16V8z" {...p} />
          <Circle cx={12} cy={12} r={3.2} {...p} />
        </>
      )}
    </Svg>
  );
}
