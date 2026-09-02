/**
 * Normalises anything thrown into an `Error`.
 *
 * Supabase rejects with a `PostgrestError` — a plain object carrying `message`,
 * `code`, `details` and `hint`, and not an instance of `Error`. The obvious
 * `e instanceof Error ? e : new Error(String(e))` therefore turns every database
 * failure into the string "[object Object]", which is what the retry screens
 * were showing instead of the reason.
 *
 * Only `message` is surfaced. `details` and `hint` can quote the offending row,
 * so they stay out of anything rendered or logged.
 */
export function toError(e: unknown): Error {
  if (e instanceof Error) return e;

  if (typeof e === 'object' && e !== null) {
    const message = (e as { message?: unknown }).message;
    if (typeof message === 'string' && message.length > 0) return new Error(message);
  }

  return new Error(typeof e === 'string' && e ? e : 'Something went wrong');
}

const CONNECTION_FAILURE_MARKERS = [
  'failed to fetch',
  'load failed',
  'network request failed',
  'networkerror',
  'offline',
  'timed out',
  'timeout',
  'connection',
] as const;

/**
 * Detects transport-shaped failures without claiming that every API error is
 * an offline event. Supabase can throw Error instances or plain error objects,
 * so this intentionally shares the same normalisation boundary as useAsync.
 */
export function isLikelyConnectionError(error: unknown): boolean {
  const message = toError(error).message.toLowerCase();
  return CONNECTION_FAILURE_MARKERS.some((marker) => message.includes(marker));
}

/**
 * Produces a useful read error without rendering raw backend details. A
 * connection hint is included only when the transport-shaped message supports
 * it; all other failures retain an explicit Retry action in their caller.
 */
export function retryableReadMessage(error: unknown, unavailable: string): string {
  return isLikelyConnectionError(error)
    ? `${unavailable} Check your connection and try again.`
    : `${unavailable} Try again.`;
}
