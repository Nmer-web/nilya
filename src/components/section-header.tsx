import React from 'react';
import { Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Tap } from '@/components/ui';
import { color as C, space, touch, type } from '@/theme/tokens';

/** A section title with an optional "See all" that goes somewhere real. */
export function SectionHeader({
  title,
  actionLabel = 'See all',
  onAction,
  style,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: space.space12,
          minHeight: touch.minimum,
        },
        style,
      ]}
    >
      <Text style={{ ...type.sectionTitle, color: C.textPrimary, flex: 1 }} numberOfLines={1} accessibilityRole="header">
        {title}
      </Text>
      {onAction ? (
        <Tap
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={`${actionLabel}, ${title}`}
          hitSlop={8}
          style={{ minHeight: touch.minimum, justifyContent: 'center' }}
        >
          <Text style={{ ...type.metadataMedium, color: C.textPrimary }}>{actionLabel}</Text>
        </Tap>
      ) : null}
    </View>
  );
}
