import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * Subtle haptics.
 *
 * Reserved for moments that change state in a way the user committed to —
 * favouriting, switching tab, publishing, sending an offer, paying. Ordinary
 * navigation and scrolling stay silent: a device that buzzes on every tap
 * reads as broken rather than responsive.
 *
 * expo-haptics has no web implementation and older Android devices without a
 * vibrator reject, so every call is fire-and-forget and swallows its error.
 * Callers never need to await or guard.
 */

const enabled = Platform.OS === 'ios' || Platform.OS === 'android';

const run = (fn: () => Promise<void>) => {
  if (!enabled) return;
  void fn().catch(() => {});
};

/** Favourite, press of a primary action. */
export const tapLight = () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));

/** Tab change, segmented control, chip selection. */
export const tapSelect = () => run(() => Haptics.selectionAsync());

/** Published, offer sent, payment taken. */
export const tapSuccess = () =>
  run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));

/** Rejected input — a failed validation, not a caught exception. */
export const tapWarn = () =>
  run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
