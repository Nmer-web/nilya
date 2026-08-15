import React from 'react';
import { View } from 'react-native';

import { ImageSlot } from '@/components/image-slot';
import { color as C, radius } from '@/theme/tokens';

/**
 * What is left of the prototype's card family.
 *
 * The cards themselves — `ProductCard`, `ProductGrid`, `PriceTile`,
 * `PriceTileGrid` and their numeric-id `FavouriteButton` — are gone. They were
 * typed to the mock `Product` and every one of them pushed a numeric catalog id
 * into `/listing/[id]`, a real route that can only resolve a UUID. The listing
 * card in `listing-card.tsx` is now the single card for marketplace listings,
 * typed to `ListingRow`.
 *
 * The thumbnail below is not a card and is not a duplicate: it carries no
 * price, no favourite and no tap target, because the row around it owns all
 * three. It stays because Chat, Inbox, Orders and Checkout are still on
 * prototype data and are not this task's to convert.
 */

/** Listing imagery is portrait everywhere — the card, the tile, the rail. */
const IMAGE_RATIO = 3 / 4;

/** Widths for the row thumbnail. Two sizes, so rows stop inventing their own. */
export const THUMB = { sm: 40, md: 54 } as const;

/**
 * The small listing thumbnail that sits inside a row — inbox conversations,
 * order lines, the chat header, the checkout summary.
 *
 * It exists because those six rows each invented their own well — 36x44, 40x48,
 * 52x64, 54x66 and 56x70, at radii of 7, 9 and 12 — so none shared the card's
 * 3:4 crop and most sat off the radius ladder. Bare numbers are why the step
 * that constrained the radii never caught them.
 */
export function ListingThumb({ width = THUMB.md }: { width?: number }) {
  return (
    <View
      style={{
        width,
        aspectRatio: IMAGE_RATIO,
        borderRadius: radius.sm,
        overflow: 'hidden',
        backgroundColor: C.surfaceSecondary,
      }}
    >
      <ImageSlot tiny />
    </View>
  );
}
