import React, { useRef, useState } from 'react';
import { Text, View } from 'react-native';

import { formatPrice } from '@/components/listing-card';
import { FadeIn } from '@/components/skeleton';
import { Button, InlineError } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { respondToOffer } from '@/lib/mutations';
import type { OfferRow } from '@/lib/queries';
import { space } from '@/theme/tokens';

const STATE_LABEL: Record<OfferRow['state'], string> = {
  open: 'Pending',
  countered: 'Countered',
  accepted: 'Accepted',
  declined: 'Declined',
  withdrawn: 'Withdrawn',
  expired: 'Expired',
};

type OfferAction = 'accepted' | 'declined' | 'withdrawn';

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
  const [busy, setBusy] = useState<OfferAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef<OfferAction | null>(null);

  const isBuyer = me === offer.buyer_id;
  const isSeller = me === offer.seller_id;
  const actionableBuyerOffer = offer.state === 'open' && offer.counter_of === null;
  const attribution = offer.counter_of
    ? 'Counteroffer'
    : offer.state === 'countered'
      ? 'Offer countered'
      : isBuyer
        ? 'You offered'
        : 'Offer received';

  const respond = async (action: OfferAction) => {
    if (busyRef.current) return;
    busyRef.current = action;
    setBusy(action);
    setError(null);
    try {
      await respondToOffer(offer.id, action);
      haptic('important-confirmation');
      onChanged();
    } catch {
      setError('Could not update the offer. Try again.');
    } finally {
      busyRef.current = null;
      setBusy(null);
    }
  };

  const stateClassName = offer.state === 'accepted'
    ? 'text-nilya-success'
    : offer.state === 'declined'
      ? 'text-nilya-error-text'
      : offer.state === 'open' || offer.state === 'countered'
        ? 'text-nilya-text'
        : 'text-nilya-secondary';

  return (
    <FadeIn y={4}>
      <View className="gap-2 rounded-2xl border border-nilya-border bg-nilya-surface p-4">
        <View className="flex-row items-start gap-3">
          <View className="min-w-0 flex-1">
            <Text className="text-xs font-medium text-nilya-secondary">Offer</Text>
            <Text className="mt-1 text-xl font-bold text-nilya-text">
              {formatPrice(offer.amount_cents, currency)}
            </Text>
          </View>
          <Text className={`text-sm font-semibold ${stateClassName}`}>
            {STATE_LABEL[offer.state]}
          </Text>
        </View>

        <Text className="text-xs text-nilya-secondary">
          {attribution} -{' '}
          {new Date(offer.created_at).toLocaleDateString(undefined, {
            day: 'numeric',
            month: 'short',
          })}
        </Text>

        {actionableBuyerOffer && isBuyer && (
          <View className="mt-1 flex-row gap-2">
            <Button
              label={busy === 'withdrawn' ? 'Withdrawing...' : 'Withdraw'}
              variant="secondary"
              buttonSize="compact"
              disabled={!!busy}
              loading={busy === 'withdrawn'}
              loadingLabel="Withdrawing..."
              onPress={() => respond('withdrawn')}
              style={{ flex: 1 }}
            />
          </View>
        )}

        {actionableBuyerOffer && isSeller && (
          <View className="mt-1 flex-row gap-2">
            <Button
              label={busy === 'accepted' ? 'Accepting...' : 'Accept'}
              buttonSize="compact"
              disabled={!!busy}
              loading={busy === 'accepted'}
              loadingLabel="Accepting..."
              onPress={() => respond('accepted')}
              style={{ flex: 1 }}
            />
            <Button
              label={busy === 'declined' ? 'Declining...' : 'Decline'}
              variant="secondary"
              buttonSize="compact"
              disabled={!!busy}
              loading={busy === 'declined'}
              loadingLabel="Declining..."
              onPress={() => respond('declined')}
              style={{ flex: 1 }}
            />
          </View>
        )}

        {offer.state === 'accepted' && (
          <Text className="mt-1 text-xs leading-4 text-nilya-secondary">
            {isBuyer
              ? 'Open the listing to pay at this price.'
              : 'The buyer can now check out at this price.'}
          </Text>
        )}

        {!!error && <InlineError message={error} style={{ marginTop: space.space4 }} />}
      </View>
    </FadeIn>
  );
}
