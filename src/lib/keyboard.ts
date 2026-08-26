import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Whether the soft keyboard is up.
 *
 * Android only emits the `did` events, so both platforms subscribe to those;
 * iOS additionally gets the `will` pair, which fire early enough that the
 * layout change rides the keyboard's own animation instead of snapping after it.
 */
export function useKeyboardVisible(): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const events: Array<[string, boolean]> =
      Platform.OS === 'ios'
        ? [
            ['keyboardWillShow', true],
            ['keyboardWillHide', false],
          ]
        : [
            ['keyboardDidShow', true],
            ['keyboardDidHide', false],
          ];

    const subs = events.map(([name, next]) =>
      Keyboard.addListener(name as 'keyboardDidShow', () => setVisible(next)),
    );
    return () => subs.forEach(s => s.remove());
  }, []);

  return visible;
}
