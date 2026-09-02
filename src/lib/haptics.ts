import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/** Events exhaustively allowed by the NILYA motion contract. */
export type SemanticHapticEvent =
  | 'favorite-confirmed'
  | 'selection-committed'
  | 'sell-entered'
  | 'publication-confirmed'
  | 'offer-sent'
  | 'important-confirmation';

const supported = Platform.OS === 'ios' || Platform.OS === 'android';

/**
 * Best-effort supplementary feedback. A rejection is intentionally ignored
 * because haptic availability never changes the real action's result.
 */
export function haptic(event: SemanticHapticEvent): void {
  if (!supported) return;

  const effect =
    event === 'selection-committed'
      ? Haptics.selectionAsync()
      : event === 'favorite-confirmed' || event === 'sell-entered'
        ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        : Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

  void effect.catch(() => {});
}
