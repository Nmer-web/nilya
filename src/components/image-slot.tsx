import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';

import { Icon } from '@/components/icon';
import { T } from '@/components/ui';
import { color as C } from '@/theme/tokens';

/**
 * Stand-in for a listing photo.
 *
 * Every listing currently ships unfilled, so this is the empty state: a muted
 * well, the photo glyph and the item's name. Deliberately static rather than
 * shimmering — a shimmer promises an image that is about to arrive, and a grid
 * of placeholders that pulse forever reads as a stuck loading screen. The
 * shimmering counterpart lives in `skeleton.tsx` for genuinely pending data.
 *
 * `tiny` suppresses the caption on thumbnail-sized slots.
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
      <View style={{ opacity: tiny ? 0.25 : 0.34 }}>
        <Icon name="image" size={glyph ?? (tiny ? 16 : 26)} color={C.textTertiary} strokeWidth={1.5} />
      </View>
      {!tiny && !!label && (
        <T
          w={500}
          size={11}
          color={C.textTertiary}
          tracking={0.11}
          numberOfLines={2}
          style={{ textAlign: 'center', opacity: 0.6 }}
        >
          {label}
        </T>
      )}
    </View>
  );
}
