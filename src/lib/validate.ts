/**
 * Client-side form checks. These exist to save a round trip and give a
 * pointed message — the authoritative rules are Supabase's (and the
 * minimum length below must stay in step with auth.minimum_password_length
 * in supabase/config.toml, currently 8).
 */

/** Deliberately loose: the confirmation email is the real address check. */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const MIN_PASSWORD = 8;

export function emailError(value: string): string | null {
  const v = value.trim();
  if (!v) return 'Enter your email address.';
  if (!EMAIL.test(v)) return 'That does not look like an email address.';
  return null;
}

export function passwordError(value: string): string | null {
  if (!value) return 'Enter a password.';
  if (value.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters.`;
  return null;
}

export function nameError(value: string): string | null {
  const v = value.trim();
  if (!v) return 'Enter your name.';
  if (v.length > 60) return 'That name is too long.';
  return null;
}
