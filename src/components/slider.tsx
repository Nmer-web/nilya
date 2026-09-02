import React, { useState } from 'react';
import { View, type GestureResponderEvent } from 'react-native';

import { color as C, elevation, radius, space, touch } from '@/theme/tokens';

const KNOB = space.space24;

/**
 * Single-thumb range control using NILYA's canonical neutral control language.
 *
 * Hand-rolled so the existing responder behavior stays intact without another
 * native dependency. It uses the
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
      style={{ minHeight: touch.minimum, justifyContent: 'center' }}
    >
      <View style={{ height: space.space4, borderRadius: radius.radiusPill, backgroundColor: C.border }} />
      <View
        style={{
          position: 'absolute',
          left: 0,
          width: knobLeft + KNOB / 2,
          height: space.space4,
          borderRadius: radius.radiusPill,
          backgroundColor: C.textPrimary,
        }}
      />
      <View
        style={{
          position: 'absolute',
          left: knobLeft,
          width: KNOB,
          height: KNOB,
          borderRadius: radius.radiusPill,
          backgroundColor: C.textPrimary,
          borderWidth: 2,
          borderColor: C.surface,
          ...elevation.raised,
        }}
      />
    </View>
  );
}
