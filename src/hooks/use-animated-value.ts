import { useState } from 'react';
import { Animated } from 'react-native';

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
