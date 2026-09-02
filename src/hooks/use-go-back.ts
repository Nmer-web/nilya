import { useRouter } from 'expo-router';
import { useCallback } from 'react';

/** Wherever `router.replace` will go, without naming where that type lives. */
type Destination = Parameters<ReturnType<typeof useRouter>['replace']>[0];

/**
 * Going back from a screen that may have nothing behind it.
 *
 * `router.back()` on the first screen of a stack does nothing but log "The
 * action 'GO_BACK' was not handled by any navigator", and that is not a rare
 * case: a shared link or a notification opens a product, an order or a chat
 * directly, and in development every reload lands straight on the current
 * route. The back control is drawn either way, so it needs somewhere to go —
 * the screen's natural parent — rather than being a button that does nothing.
 */
export function useGoBack(fallback: Destination = '/') {
  const router = useRouter();

  return useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace(fallback);
  }, [router, fallback]);
}
