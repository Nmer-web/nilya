import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon } from '@/components/icon';
import { T } from '@/components/ui';
import { color as C } from '@/theme/tokens';

/**
 * Stand-in for the design's `<image-slot>` web component.
 *
 * The prototype ships every listing as an unfilled slot, so this renders that
 * same empty state: a muted well, the photo glyph and the item's name. `tiny`
 * mirrors `data-tiny`, which suppresses the caption on thumbnail-sized slots.
 */
export function ImageSlot({
  label,
  tiny,
  glyph,
  style,
}: {
  label?: string;
  tiny?: boolean;
  /** Override the glyph size; defaults to a size that suits the slot. */
  glyph?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        {
          flex: 1,
          backgroundColor: C.well,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 10,
          gap: 6,
        },
        style,
      ]}
    >
      <View style={{ opacity: tiny ? 0.28 : 0.42 }}>
        <Icon name="image" size={glyph ?? (tiny ? 16 : 26)} color={C.textTertiary} />
      </View>
      {!tiny && !!label && (
        <T
          w={500}
          size={11}
          color={C.textTertiary}
          tracking={0.11}
          numberOfLines={2}
          style={{ textAlign: 'center', opacity: 0.75 }}
        >
          {label}
        </T>
      )}
    </View>
  );
}
