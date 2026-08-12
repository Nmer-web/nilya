import { supabase } from '@/lib/supabase';

/**
 * Handling for the sawa://auth-callback deep link.
 *
 * Supabase can deliver a session back in two shapes and which one you get
 * depends on the client's flowType, so both are handled:
 *
 *   PKCE      sawa://auth-callback?code=<uuid>
 *   implicit  sawa://auth-callback#access_token=…&refresh_token=…&type=recovery
 *
 * and failures arrive as ?error=…&error_description=… in either position.
 * Parsing is done by hand rather than with Linking.parse() because that only
 * surfaces query parameters, and the implicit flow puts everything in the
 * fragment.
 */

export type AuthLinkResult =
  /** Session established; the user must now choose a new password. */
  | { kind: 'recovery' }
  /** Session established from a confirmation or magic link. */
  | { kind: 'signedIn' }
  /** Not an auth callback — some other deep link. */
  | { kind: 'ignored' }
  | { kind: 'error'; message: string };

function paramsOf(url: string): Record<string, string> {
  const out: Record<string, string> = {};
  const hash = url.indexOf('#');
  const query = url.indexOf('?');

  const collect = (segment: string) => {
    for (const pair of segment.split('&')) {
      if (!pair) continue;
      const eq = pair.indexOf('=');
      const key = eq === -1 ? pair : pair.slice(0, eq);
      const value = eq === -1 ? '' : pair.slice(eq + 1);
      try {
        out[decodeURIComponent(key)] = decodeURIComponent(value);
      } catch {
        // A malformed percent-escape shouldn't take the whole link down.
        out[key] = value;
      }
    }
  };

  if (query !== -1) collect(url.slice(query + 1, hash === -1 ? undefined : hash));
  if (hash !== -1) collect(url.slice(hash + 1));
  return out;
}

/**
 * Turn an incoming URL into a session. Safe to call with any deep link —
 * anything that isn't an auth callback returns `ignored`.
 */
export async function consumeAuthUrl(url: string): Promise<AuthLinkResult> {
  const params = paramsOf(url);

  if (params.error || params.error_description) {
    // Expired links are the common case here and the message Supabase sends
    // ("Email link is invalid or has expired") is already user-facing.
    return { kind: 'error', message: params.error_description || params.error };
  }

  const isRecovery = params.type === 'recovery';

  if (params.code) {
    const { error } = await supabase.auth.exchangeCodeForSession(params.code);
    if (error) return { kind: 'error', message: error.message };
    return { kind: isRecovery ? 'recovery' : 'signedIn' };
  }

  if (params.access_token && params.refresh_token) {
    const { error } = await supabase.auth.setSession({
      access_token: params.access_token,
      refresh_token: params.refresh_token,
    });
    if (error) return { kind: 'error', message: error.message };
    return { kind: isRecovery ? 'recovery' : 'signedIn' };
  }

  return { kind: 'ignored' };
}
