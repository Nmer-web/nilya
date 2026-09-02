import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'nilya.search.recent.v1';
const LIMIT = 6;

/**
 * Normalises user-entered search history without inventing suggestions. Earlier
 * groups win, which lets a search made during hydration stay ahead of the
 * device record being loaded.
 */
export function mergeRecentSearches(...groups: readonly (readonly string[])[]): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];

  for (const group of groups) {
    for (const raw of group) {
      const term = raw.trim();
      const key = term.toLocaleLowerCase();
      if (!term || seen.has(key)) continue;
      seen.add(key);
      merged.push(term);
      if (merged.length === LIMIT) return merged;
    }
  }

  return merged;
}

export async function readRecentSearches(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return mergeRecentSearches(parsed.filter((value): value is string => typeof value === 'string'));
  } catch {
    return [];
  }
}

export async function writeRecentSearches(terms: readonly string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(mergeRecentSearches(terms)));
  } catch {
    // Search remains fully usable for the current session if device storage is unavailable.
  }
}
