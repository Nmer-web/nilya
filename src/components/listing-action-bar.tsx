import React from 'react';
import { View } from 'react-native';

import { Icon } from '@/components/icon';
import { PressableScale, T } from '@/components/ui';
import { color as C, radius, scale, space, touch } from '@/theme/tokens';

/** Bottom padding that keeps the last Product Detail row above this bar. */
export function listingActionBarContentClearance(bottomInset: number) {
  return (
    space.space12 +
    touch.large +
    Math.max(bottomInset, space.space12) +
    space.space24
  );
}

/**
 * The bar pinned above the safe area on Product Detail.
 *
 * A muted "Buy now" on the left goes straight to checkout; the wide primary
 * button on the right adds the listing to the device-local bag, or opens the
 * bag once it is there. Nothing is drawn when the listing cannot be bought —
 * the seller's own item, a paused seller, a withdrawn listing — so no control
 * is ever shown that cannot act.
 */
export function ListingActionBar({
  bottomInset,
  inCart,
  onBuyNow,
  onAddToCart,
  onViewCart,
}: {
  bottomInset: number;
  inCart: boolean;
  onBuyNow?: () => void;
  onAddToCart?: () => void;
  onViewCart: () => void;
}) {
  if (!onBuyNow && !onAddToCart && !inCart) return null;

  const primary = inCart
    ? { label: 'View bag', icon: 'check' as const, onPress: onViewCart }
    : onAddToCart
      ? { label: 'Add to Bag', icon: 'bag' as const, onPress: onAddToCart }
      : null;

  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10,
        borderTopWidth: 1,
        borderTopColor: C.border,
        backgroundColor: C.background,
        paddingHorizontal: space.space20,
        paddingTop: space.space12,
        paddingBottom: Math.max(bottomInset, space.space12),
        flexDirection: 'row',
        gap: space.space12,
      }}
    >
      {onBuyNow ? (
        <PressableScale
          onPress={onBuyNow}
          scale={scale.buttonPressed}
          accessibilityRole="button"
          accessibilityLabel="Buy this product now"
          style={{
            minHeight: touch.large,
            paddingHorizontal: space.space24,
            borderRadius: radius.radiusLarge,
            borderCurve: 'continuous',
            backgroundColor: C.bgMuted,
            alignItems: 'center',
            justifyContent: 'center',
            flex: primary ? 0 : 1,
          }}
        >
          <T variant="button">Buy now</T>
        </PressableScale>
      ) : null}

      {primary ? (
        <PressableScale
          onPress={primary.onPress}
          scale={scale.buttonPressed}
          accessibilityRole="button"
          accessibilityLabel={primary.label}
          accessibilityState={{ selected: inCart }}
          style={{
            flex: 1,
            minHeight: touch.large,
            borderRadius: radius.radiusLarge,
            borderCurve: 'continuous',
            backgroundColor: C.primary,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: space.space8,
          }}
        >
          <Icon name={primary.icon} role="inline" color={C.textInverse} decorative />
          <T variant="button" color={C.textInverse}>
            {primary.label}
          </T>
        </PressableScale>
      ) : null}
    </View>
  );
}
