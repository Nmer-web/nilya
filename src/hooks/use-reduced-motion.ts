import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export type ReducedMotionPolicy = {
  reduceMotion: boolean;
  allowOpacity: boolean;
  allowScale: boolean;
  allowTravel: boolean;
  allowRepeat: boolean;
};

/**
 * Tracks the platform preference both at launch and while NILYA is active.
 * This is local presentation state; it is not marketplace data and therefore
 * does not belong in Supabase or the application persistence layer.
 */
export function useReducedMotion(): ReducedMotionPolicy {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;

    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });

    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return {
    reduceMotion,
    allowOpacity: true,
    allowScale: !reduceMotion,
    allowTravel: !reduceMotion,
    allowRepeat: !reduceMotion,
  };
}
