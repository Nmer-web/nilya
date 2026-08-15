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
