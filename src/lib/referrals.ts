export const REFERRAL_CODE_LENGTH = 12;
export const REFERRAL_CODE_PATTERN = /^[A-F0-9]{12}$/;

export function normalizeReferralCode(value: string): string {
  return value.trim().toUpperCase();
}

export function referralCodeError(value: string): string | null {
  const normalized = normalizeReferralCode(value);
  if (!normalized) return null;
  return REFERRAL_CODE_PATTERN.test(normalized)
    ? null
    : `Enter a valid ${REFERRAL_CODE_LENGTH}-character referral code.`;
}

export function referralInviteShareContent(code: string) {
  const normalized = normalizeReferralCode(code);
  return {
    title: 'Invite friends to NILYA',
    message: `Join me on NILYA. Use my referral code: ${normalized}`,
  };
}
