import React from 'react';
import { Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { PressableScale } from '@/components/ui';
import { color as C, radius, scale, space, touch, type } from '@/theme/tokens';

/** A pill chip: ink when active, warm grey otherwise. */
export function FilterChip({
  label,
  active = false,
  onPress,
  accessibilityLabel,
  style,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <PressableScale
      onPress={onPress}
      scale={scale.buttonPressed}
      motionRole="selection"
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected: active }}
      style={[
        {
          minHeight: touch.minimum,
          paddingHorizontal: space.space20,
          borderRadius: radius.radiusPill,
          borderCurve: 'continuous',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: active ? C.textPrimary : C.bgMuted,
        },
        style,
      ]}
    >
      <Text
        style={{ ...type.metadataMedium, fontSize: 14, color: active ? C.textInverse : C.textPrimary }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </PressableScale>
  );
}

/**
 * A row of equal-width pills where at most one is active. Tapping the active
 * pill again clears the choice, so the row can always get back to "everything"
 * without needing a third pill the reference does not have.
 */
export function SegmentedPills<K extends string>({
  options,
  value,
  onChange,
  style,
}: {
  options: readonly { key: K; label: string }[];
  value: K | null;
  onChange: (next: K | null) => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      accessibilityRole="tablist"
      style={[{ flexDirection: 'row', gap: space.space12 }, style]}
    >
      {options.map((option) => {
        const active = option.key === value;
        return (
          <FilterChip
            key={option.key}
            label={option.label}
            active={active}
            accessibilityLabel={active ? `${option.label}, selected. Tap to show everything` : option.label}
            onPress={() => onChange(active ? null : option.key)}
            style={{ flex: 1 }}
          />
        );
      })}
    </View>
  );
}
