import React from 'react';
import { View } from 'react-native';

import { T } from '@/components/ui';
import type { OrderRow } from '@/lib/queries';
import { color as C, radius } from '@/theme/tokens';

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
      return { fg: C.success, bg: C.successBg };
    case 'bad':
      return { fg: C.error, bg: C.errorBg };
    case 'progress':
      return { fg: C.accent, bg: C.accentBg };
    default:
      return { fg: C.textSecondary, bg: C.surface };
  }
}

export function OrderStatusPill({ status }: { status: OrderStatus }) {
  const { fg, bg } = toneColors(ORDER_TONE[status]);
  return (
    <View
      style={{
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: radius.pill,
        backgroundColor: bg,
        borderWidth: 1,
        borderColor: fg,
      }}
    >
      <T w={600} size={11} color={fg}>
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
      <T size={12.5} color={C.textSecondary}>
        No payment recorded yet
      </T>
    );
  }

  return (
    <View style={{ gap: 2 }}>
      <T size={12.5} color={payment.status === 'failed' ? C.error : C.textSecondary}>
        {PAYMENT_LABEL[payment.status]}
      </T>
      {!!payment.last_error && payment.status === 'failed' && (
        <T size={12} color={C.error}>
          {payment.last_error}
        </T>
      )}
    </View>
  );
}
