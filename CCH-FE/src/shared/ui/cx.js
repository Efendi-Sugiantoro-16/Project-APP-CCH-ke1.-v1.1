/**
 * Join truthy class names. Keeps conditional class strings readable without
 * pulling in an external dependency.
 */
export function cx(...values) {
  return values.filter(Boolean).join(' ')
}