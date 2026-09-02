/** A truthful whole/one-decimal label calculated only from stored integer cents. */
export function formatPriceDropLabel(
  originalPriceCents: number | null,
  currentPriceCents: number
): string | null {
  if (
    originalPriceCents === null
    || !Number.isSafeInteger(originalPriceCents)
    || !Number.isSafeInteger(currentPriceCents)
    || originalPriceCents <= 0
    || currentPriceCents <= 0
    || currentPriceCents >= originalPriceCents
  ) {
    return null;
  }

  const exact = ((originalPriceCents - currentPriceCents) * 100) / originalPriceCents;
  if (!Number.isFinite(exact) || exact <= 0) return null;
  const rounded = Math.round(exact * 10) / 10;
  if (rounded === 0) return 'Less than 0.1% price drop';
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}% price drop`;
}
