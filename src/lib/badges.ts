import type { IconName } from '@/components/icon';
import type { SellerBadgeIconKey, SellerBadgeRow } from '@/lib/database.types';

const BADGE_ICONS: Record<SellerBadgeIconKey, IconName> = {
  package: 'package',
  grid: 'grid',
  star: 'star',
  badgeCheck: 'badgeCheck',
  person: 'person',
  send: 'send',
};

export function sellerBadgeIcon(iconKey: SellerBadgeIconKey): IconName {
  return BADGE_ICONS[iconKey] ?? 'badgeCheck';
}

/** Presents historical badge seed copy under the current consumer brand. */
export function sellerBadgeCopy(value: string): string {
  return value.replace(/\bSAWA\b/g, 'NILYA');
}

export function earnedSellerBadgeCount(badges: readonly SellerBadgeRow[]): number {
  return badges.filter((badge) => badge.earned_at !== null).length;
}

export function lockedBadgeProgress(badge: SellerBadgeRow): {
  current: number;
  target: number;
  ratio: number;
} | null {
  if (badge.earned_at || badge.progress_current === null || badge.progress_target === null) {
    return null;
  }

  const target = Math.max(1, Math.trunc(badge.progress_target));
  const current = Math.min(target, Math.max(0, Math.trunc(badge.progress_current)));
  return { current, target, ratio: current / target };
}
