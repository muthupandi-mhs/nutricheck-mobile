import React from 'react';
import { KeyboardAvoidingView, Platform, type ViewStyle } from 'react-native';

/**
 * Keeps the bottom of a screen above the keyboard.
 *
 * Every screen with a field used to write this inline as
 * `behavior={Platform.OS === 'ios' ? 'padding' : undefined}`, which is the
 * long-standing React Native recipe and stopped being correct. On Android that
 * expression is `undefined`, meaning the view does nothing at all and the
 * layout relies entirely on `android:windowSoftInputMode="adjustResize"`
 * shrinking the window under it.
 *
 * That worked until edge-to-edge. React Native 0.81 made it the default on
 * Android and Android 15 enforces it: the app now draws behind the system bars,
 * so the window no longer resizes when the keyboard opens — the insets change
 * instead. `adjustResize` is still in the manifest and still ignored, so a
 * footer pinned outside the ScrollView simply stayed where it was, behind the
 * keyboard, on the one screen where the button is the entire point.
 *
 * `padding` on both platforms restores it: React Native measures the keyboard
 * from its own events rather than from a window resize, so it does not care
 * whether the window moved.
 *
 * If a footer ever sits too HIGH — floating above the keyboard with a gap — the
 * cause is the window resizing as well, and the fix is `height` on Android
 * rather than reverting to `undefined`. Reverting brings the bug back.
 */
export function KeyboardAvoid({
  children,
  offset = 0,
  style,
}: {
  children: React.ReactNode;
  /** Height of anything above this view that the keyboard should not count. */
  offset?: number;
  style?: ViewStyle;
}) {
  return (
    <KeyboardAvoidingView
      style={[{ flex: 1 }, style]}
      behavior="padding"
      // Android only fires keyboardDidShow, never keyboardWillShow, so the
      // adjustment lands a frame after the keyboard starts moving. Visible if
      // you look for it, and still better than a button that cannot be reached.
      keyboardVerticalOffset={offset}>
      {children}
    </KeyboardAvoidingView>
  );
}

/** Re-exported so call sites that only needed Platform for this can drop it. */
export const isIOS = Platform.OS === 'ios';
