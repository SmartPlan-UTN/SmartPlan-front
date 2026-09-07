/**
 * Parses a dynamic route segment (`params.id`) as a positive integer
 * database id. Returns `null` for anything else — `"foo"`, `"0"`,
 * `"-3"`, `"1.5"` — so the caller can respond with a 404 instead of
 * forwarding `Number("foo")` (`NaN`) to the API as if it were a real id.
 */
export function parsePositiveIntId(value: string): number | null {
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return parsed > 0 ? parsed : null;
}
