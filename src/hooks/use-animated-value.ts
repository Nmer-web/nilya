import { useState } from 'react';
import { Animated, Platform } from 'react-native';

/**
 * A stable `Animated.Value` that survives re-renders.
 *
 * Neither obvious alternative works here:
 *  - React Native's own `useAnimatedValue` is not implemented by
 *    react-native-web, so importing it crashes on web.
 *  - `useRef(new Animated.Value(v)).current` reads a ref during render, which
 *    the `react-hooks/refs` rule rejects under React Compiler (enabled for this
 *    project via `experiments.reactCompiler` in app.json).
 *
 * Lazy state initialisation gives one value per component instance, created
 * once, on every platform — with neither problem.
 */
export function useAnimatedValue(initial: number): Animated.Value {
  const [value] = useState(() => new Animated.Value(initial));
  return value;
}

/**
 * Whether an animation may be handed to the native driver.
 *
 * react-native-web has no native animated module, so asking for one there logs
 * a warning per animation and falls back to the JS driver anyway. Native must
 * keep the real thing: the native driver is what lets a transform keep running
 * while the JS thread is busy, so this is a platform check and never a blanket
 * `false`. Only ever used for `transform` and `opacity`, the two properties the
 * native driver supports.
 */
export const NATIVE_DRIVER = Platform.OS !== 'web';
