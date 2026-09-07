/**
 * Builds a Google Maps search URL for a location (CU13, CU14), preferring
 * coordinates when available and falling back to the address text.
 */
export function googleMapsUrl(
  latitude: number | null,
  longitude: number | null,
  address: string,
): string {
  if (latitude != null && longitude != null) {
    return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}
