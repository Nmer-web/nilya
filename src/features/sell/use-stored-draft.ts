import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { hasStoredDraft } from '@/features/sell/draft';

/** Whether a draft is waiting on this device; re-checked whenever the screen regains focus. */
export function useStoredDraft(): boolean {
  const [exists, setExists] = useState(false);
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void hasStoredDraft().then((value) => {
        if (!cancelled) setExists(value);
      });
      return () => {
        cancelled = true;
      };
    }, [])
  );
  return exists;
}
