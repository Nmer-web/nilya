import React, { useState } from 'react';
import { View, type GestureResponderEvent } from 'react-native';

import { color as C } from '@/theme/tokens';

const KNOB = 22;

/**
 * Single-thumb range control matching the design's styled `input[type=range]`:
 * a 3px track, black progress fill and a cream-ringed knob.
 *
 * Hand-rolled rather than pulled from a package so the knob and track match the
 * design exactly and the app keeps one fewer native dependency. It uses the
 * View responder props directly, so each handler closes over the current
 * geometry and no mutable refs are involved.
 */
export function Slider({
  value,
  min,
  max,
  onChange,
  label,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  label?: string;
}) {
  const [width, setWidth] = useState(0);

  const seek = (e: GestureResponderEvent) => {
    const usable = Math.max(width - KNOB, 1);
    const ratio = Math.min(1, Math.max(0, (e.nativeEvent.locationX - KNOB / 2) / usable));
    onChange(Math.round(min + ratio * (max - min)));
  };

  const ratio = (value - min) / (max - min || 1);
  const knobLeft = ratio * Math.max(width - KNOB, 0);

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={seek}
      onResponderMove={seek}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min, max, now: value }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        if (e.nativeEvent.actionName === 'increment') onChange(Math.min(max, value + 10));
        if (e.nativeEvent.actionName === 'decrement') onChange(Math.max(min, value - 10));
      }}
      style={{ height: 36, justifyContent: 'center' }}
    >
      <View style={{ height: 3, borderRadius: 2, backgroundColor: C.border }} />
      <View
        style={{
          position: 'absolute',
          left: 0,
          width: knobLeft + KNOB / 2,
          height: 3,
          borderRadius: 2,
          backgroundColor: C.text,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: knobLeft,
          width: KNOB,
          height: KNOB,
          borderRadius: KNOB / 2,
          backgroundColor: C.text,
          borderWidth: 3,
          borderColor: C.surface,
          shadowColor: '#000',
          shadowOpacity: 0.25,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 1 },
          elevation: 3,
        }}
      />
    </View>
  );
}
