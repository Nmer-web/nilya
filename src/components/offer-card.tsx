import React, { useState } from 'react';
import { View } from 'react-native';

import { formatPrice } from '@/components/listing-card';
import { Button, T } from '@/components/ui';
import { respondToOffer } from '@/lib/mutations';
import type { OfferRow } from '@/lib/queries';
import { color as C, radius, space } from '@/theme/tokens';

/**
 * The six `offer_state` values, in the words the UI shows.
 *
 * `expired` is included because the column can hold it — whatever sweeps
 * `expires_at` sets it, and a row in that state must not render blank.
 */
const STATE_LABEL: Record<OfferRow['state'], string> = {
  open: 'Pending',
  countered: 'Countered',
  accepted: 'Accepted',
  declined: 'Declined',
  withdrawn: 'Withdrawn',
  expired: 'Expired',
};

/**
 * An offer inside a conversation.
 *
 * The actions shown are exactly the ones the policies permit: the seller
 * answers, the buyer withdraws, and only while the offer is still live. An
 * accepted offer shows no buttons at all — the next step is checkout, which is
 * the buyer's to take from the listing.
 */
export function OfferCard({
  offer,
  me,
  currency,
  onChanged,
}: {
  offer: OfferRow;
  me: string | null;
  currency: string;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState<null | 'accepted' | 'declined' | 'withdrawn'>(null);
  const [error, setError] = useState<string | null>(null);

  const mine = me === offer.buyer_id;
  const live = offer.state === 'open' || offer.state === 'countered';

  const respond = async (action: 'accepted' | 'declined' | 'withdrawn') => {
    if (busy) return;
    setBusy(action);
    setError(null);
    try {
      await respondToOffer(offer.id, action);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update the offer');
    } finally {
      setBusy(null);
    }
  };

  const tone =
    offer.state === 'accepted' ? C.success : offer.state === 'open' ? C.accent : C.textSecondary;

  return (
    <View
      style={{
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: C.border,
        backgroundColor: C.surface,
        padding: 14,
        gap: 8,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
        <T w={700} size={17} style={{ flex: 1 }}>
          {formatPrice(offer.amount_cents, currency)}
        </T>
        <T w={600} size={11.5} color={tone}>
          {STATE_LABEL[offer.state]}
        </T>
      </View>

      <T size={12.5} color={C.textSecondary}>
        {mine ? 'You offered' : 'Offer received'} ·{' '}
        {new Date(offer.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
      </T>

      {live && (
        <View style={{ flexDirection: 'row', gap: 7, marginTop: 2 }}>
          {mine ? (
            <Button
              label={busy === 'withdrawn' ? 'Withdrawing…' : 'Withdraw'}
              variant="outline"
              height={40}
              size={13.5}
              disabled={!!busy}
              onPress={() => respond('withdrawn')}
              style={{ flex: 1, borderRadius: 11 }}
            />
          ) : (
            <>
              <Button
                label={busy === 'accepted' ? 'Accepting…' : 'Accept'}
                height={40}
                size={13.5}
                disabled={!!busy}
                onPress={() => respond('accepted')}
                style={{ flex: 1, borderRadius: 11 }}
              />
              <Button
                label={busy === 'declined' ? 'Declining…' : 'Decline'}
                variant="outline"
                height={40}
                size={13.5}
                disabled={!!busy}
                onPress={() => respond('declined')}
                style={{ flex: 1, borderRadius: 11 }}
              />
            </>
          )}
        </View>
      )}

      {offer.state === 'accepted' && (
        <T size={12} color={C.textSecondary} lh={17} style={{ marginTop: 2 }}>
          {mine
            ? 'Open the listing to pay at this price.'
            : 'The buyer can now check out at this price.'}
        </T>
      )}

      {!!error && (
        <T size={12} color={C.error} style={{ marginTop: space.xs }}>
          {error}
        </T>
      )}
    </View>
  );
}
