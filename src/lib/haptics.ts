import { Platform } from 'react-native';
import ReactNativeHapticFeedback, { HapticFeedbackTypes } from 'react-native-haptic-feedback';

/**
 * Used sparingly and semantically — a buzz on every tap is noise, and users
 * disable the whole system when an app abuses it.
 *
 *   select   moving between options: chips, segments, tabs, portion picks
 *   commit   something was recorded: a meal logged, targets saved
 *   undo     something was taken back
 *   warn     the app is refusing, or flagging an uncertainty
 *
 * Plain taps that only navigate get nothing. Navigation is not an event.
 */
const options = { enableVibrateFallback: false, ignoreAndroidSystemSettings: false };

const fire = (ios: HapticFeedbackTypes, android: HapticFeedbackTypes) => {
  try {
    ReactNativeHapticFeedback.trigger(Platform.OS === 'ios' ? ios : android, options);
  } catch {
    // A device with no haptic motor, or a user who disabled them. Not an error.
  }
};

export const haptics = {
  select: () => fire(HapticFeedbackTypes.selection, HapticFeedbackTypes.keyboardTap),
  commit: () => fire(HapticFeedbackTypes.notificationSuccess, HapticFeedbackTypes.effectHeavyClick),
  undo: () => fire(HapticFeedbackTypes.impactLight, HapticFeedbackTypes.effectTick),
  warn: () => fire(HapticFeedbackTypes.notificationWarning, HapticFeedbackTypes.effectDoubleClick),
};
