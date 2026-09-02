import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  EMPTY_ONBOARDING,
  readOnboarding,
  writeOnboarding,
  type LanguageCode,
  type OnboardingState,
} from '@/lib/onboarding';

/**
 * First-run state, shared.
 *
 * A provider rather than a hook each caller instantiates: the root navigator
 * decides whether to mount the flow at all, and the last step is what marks it
 * complete. Two separate copies of that boolean would leave the navigator
 * reading a stale one and the flow would replay on the next launch.
 *
 * `loading` is part of the contract. The value comes off AsyncStorage
 * asynchronously, and the navigator must not choose between onboarding and the
 * app until it has resolved — otherwise a returning user gets a frame of the
 * welcome screen before it corrects itself.
 */
type OnboardingContext = OnboardingState & {
  loading: boolean;
  setLanguage: (code: LanguageCode) => void;
  setCountry: (iso: string) => void;
  complete: () => void;
  /** Clears the record — the flow replays on the next launch. */
  reset: () => void;
};

const Ctx = createContext<OnboardingContext | null>(null);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<OnboardingState>(EMPTY_ONBOARDING);
  const [loading, setLoading] = useState(true);
  const stateRef = useRef<OnboardingState>(EMPTY_ONBOARDING);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const stored = await readOnboarding();
      if (cancelled) return;
      stateRef.current = stored;
      setState(stored);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* Written through on every change: the flow is short and the record is tiny,
     so there is no reason to batch and risk losing a step to a crash. */
  const update = useCallback((patch: Partial<OnboardingState>) => {
    const next = { ...stateRef.current, ...patch };
    stateRef.current = next;
    setState(next);
    void writeOnboarding(next);
  }, []);

  const value = useMemo<OnboardingContext>(
    () => ({
      ...state,
      loading,
      setLanguage: (language) => update({ language }),
      setCountry: (country) => update({ country: country.toUpperCase() }),
      complete: () => update({ completed: true }),
      reset: () => update(EMPTY_ONBOARDING),
    }),
    [state, loading, update]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOnboarding() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useOnboarding must be used inside <OnboardingProvider>');
  return ctx;
}
