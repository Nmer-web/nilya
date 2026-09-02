import React from 'react';
import { Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon } from '@/components/icon';
import { IconButton } from '@/components/icon-button';
import { PressableScale } from '@/components/ui';
import { color as C, radius, scale, space, touch, type } from '@/theme/tokens';

/**
 * The 48px search pill with a solid filter button pinned to its right edge.
 *
 * Pressing the bar opens the real search screen; the filter button opens the
 * filter sheet. Neither takes typing here — the bar is an entry point, and a
 * field that swallowed keystrokes without searching would be a dead control.
 */
export function SearchBar({
  placeholder = 'Search for brands, styles…',
  onPress,
  onFilterPress,
  filterActiveCount = 0,
  style,
}: {
  placeholder?: string;
  onPress: () => void;
  onFilterPress?: () => void;
  /** The number of live filters, so the button's label can say so. */
  filterActiveCount?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ height: touch.standard, justifyContent: 'center' }, style]}>
      <PressableScale
        onPress={onPress}
        scale={scale.cardPressed}
        motionRole="cardPress"
        accessibilityRole="search"
        accessibilityLabel={placeholder}
        style={{
          height: touch.standard,
          borderRadius: radius.radiusPill,
          borderCurve: 'continuous',
          backgroundColor: C.bgMuted,
          flexDirection: 'row',
          alignItems: 'center',
          gap: space.space12,
          paddingLeft: space.space16,
          paddingRight: onFilterPress ? touch.minimum + space.space12 : space.space16,
        }}
      >
        <Icon name="search" role="inline" color={C.textPrimary} decorative />
        <Text style={{ ...type.metadata, fontSize: 14, color: C.inkFaint, flex: 1 }} numberOfLines={1}>
          {placeholder}
        </Text>
      </PressableScale>

      {onFilterPress ? (
        <IconButton
          icon="sliders"
          variant="solid"
          label={filterActiveCount > 0 ? `Filters, ${filterActiveCount} active` : 'Filters'}
          accessibilityState={{ selected: filterActiveCount > 0 }}
          onPress={onFilterPress}
          style={{ position: 'absolute', right: 2, top: 2 }}
        />
      ) : null}
    </View>
  );
}
