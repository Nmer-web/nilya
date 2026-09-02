import React from 'react';
import { View } from 'react-native';

import { T } from '@/components/ui';
import type { OrderRow } from '@/lib/queries';
import { color as C, radius, space } from '@/theme/tokens';

type OrderStatus = OrderRow['status'];
type PaymentStatus = NonNullable<OrderRow['payment']>['status'];

/**
 * The eight `order_status` values, in the words a person would use.
 *
 * Exactly the enum and nothing besides: a ninth label here would be a state the
 * database cannot hold, and a missing one would render blank.
 */
const ORDER_LABEL: Record<OrderStatus, string> = {
  pending_payment: 'Awaiting payment',
  paid: 'Paid',
  shipped: 'Shipped',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
  disputed: 'Disputed',
};

/** Ink for settled, accent for in-flight, red for anything unwound. */
const ORDER_TONE: Record<OrderStatus, 'neutral' | 'progress' | 'good' | 'bad'> = {
  pending_payment: 'progress',
  paid: 'good',
  shipped: 'progress',
  delivered: 'good',
  completed: 'good',
  cancelled: 'bad',
  refunded: 'bad',
  disputed: 'bad',
};

const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  requires_payment_method: 'Payment not started',
  processing: 'Payment processing',
  succeeded: 'Payment confirmed',
  failed: 'Payment failed',
  refunded: 'Refunded',
  partially_refunded: 'Partially refunded',
};

function toneColors(tone: 'neutral' | 'progress' | 'good' | 'bad') {
  switch (tone) {
    case 'good':
      return { fg: C.success, bg: C.successSurface };
    case 'bad':
      return { fg: C.error, bg: C.errorSurface };
    case 'progress':
      return { fg: C.primary, bg: C.surface };
    default:
      return { fg: C.textSecondary, bg: C.surface };
  }
}

export function OrderStatusPill({ status }: { status: OrderStatus }) {
  const { fg, bg } = toneColors(ORDER_TONE[status]);
  return (
    <View
      accessible
      accessibilityLabel={`Order status: ${ORDER_LABEL[status]}`}
      style={{
        paddingHorizontal: space.space8,
        paddingVertical: space.space4,
        borderRadius: radius.radiusPill,
        backgroundColor: bg,
        borderWidth: 1,
        borderColor: fg,
      }}
    >
      <T variant="caption" color={fg}>
        {ORDER_LABEL[status]}
      </T>
    </View>
  );
}

/**
 * What Stripe says, kept separate from what the order says.
 *
 * They are two different facts — an order can be `paid` while a later refund
 * leaves the payment `partially_refunded` — and collapsing them into one badge
 * would lose the distinction.
 */
export function PaymentStatusLine({ payment }: { payment: OrderRow['payment'] }) {
  if (!payment) {
    return (
      <T variant="metadata" color={C.textSecondary}>
        No payment recorded yet
      </T>
    );
  }

  return (
    <View accessibilityLiveRegion="polite" style={{ gap: space.space4 }}>
      <T variant="metadata" color={payment.status === 'failed' ? C.errorText : C.textSecondary}>
        {PAYMENT_LABEL[payment.status]}
      </T>
      {!!payment.last_error && payment.status === 'failed' && (
        <T variant="caption" color={C.errorText}>
          Stripe could not confirm this payment. Refresh to check the latest status.
        </T>
      )}
    </View>
  );
}
