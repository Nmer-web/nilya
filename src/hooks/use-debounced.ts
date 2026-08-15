import { useEffect, useState } from 'react';

/**
 * A value that settles.
 *
 * Search fires a query per keystroke otherwise: eight characters is eight
 * round trips, seven of which are thrown away before the eighth returns, and
 * they can land out of order. Waiting for the typing to pause costs one delay
 * and issues one request.
 */
export function useDebounced<T>(value: T, ms = 300): T {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);

  return settled;
}
