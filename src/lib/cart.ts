import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * The cart's storage.
 *
 * This is deliberately local, and it is the only marketplace state that is.
 * The schema has no cart table and no `order_items`: an order is exactly one
 * listing, enforced by `orders_one_live_per_listing`, and checkout creates one
 * order for one listing through the frozen `create-checkout` contract. A cart
 * therefore cannot be a row anywhere — it is a shortlist of listing ids kept
 * on this device, and every item in it is resolved against live `listings`
 * rows before anything about it is shown.
 *
 * Because it is device-local it does not follow the account: signing in on
 * another phone starts with an empty cart, and that is stated on the screen
 * rather than hidden.
 */
const KEY = 'nilya.cart.v1';

const UUID_PATTERN = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

export async function readCart(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    /* Only well-formed ids survive a read: anything else came from a corrupt
       write and would be navigated to as a listing id otherwise. */
    const ids = parsed.filter((value): value is string => typeof value === 'string' && UUID_PATTERN.test(value));
    return [...new Set(ids)];
  } catch {
    return [];
  }
}

export async function writeCart(ids: readonly string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    /* Storage unavailable: the cart still works for this session and simply
       does not survive the next launch. */
  }
}
