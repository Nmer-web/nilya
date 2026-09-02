import { Stack } from 'expo-router';
import React from 'react';

import { renderHiddenStackHeader } from '@/components/hidden-stack-header';
import { DraftProvider } from '@/features/sell/DraftContext';
import { SellGate } from '@/features/sell/recovery';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { color as C, duration } from '@/theme/tokens';

/**
 * The Sell wizard's own stack: six steps and a confirmation.
 *
 * The draft lives in a provider mounted here, so it survives moving between
 * steps and is released when the seller leaves the flow. The recovery gate
 * wraps the stack for the same reason the old screen checked first: no new
 * listing starts while a previous publication is unresolved.
 */
export default function SellLayout() {
  const { reduceMotion } = useReducedMotion();
  return (
    <DraftProvider>
      <SellGate>
        <Stack
          screenOptions={{
            header: renderHiddenStackHeader,
            headerShown: false,
            contentStyle: { backgroundColor: C.background },
            animation: reduceMotion ? 'none' : 'slide_from_right',
            animationDuration: duration.standard,
          }}
        />
      </SellGate>
    </DraftProvider>
  );
}
