/**
 * Keeps native-stack headers disabled without registering the native header
 * height listener that can fire before a suspended route has mounted.
 */
export function renderHiddenStackHeader() {
  return null;
}
