/**
 * Builds a Google Maps search URL for a location (CU13, CU14), preferring
 * coordinates when available and falling back to the address text. A Google
 * Place ID, when known, makes Maps open that exact place (Maps URLs
 * `query_place_id`), so a place SmartPlan has no coordinates for still
 * opens in the right spot without SmartPlan storing a position.
 */
export function googleMapsUrl(
  latitude: number | null,
  longitude: number | null,
  address: string,
  googlePlaceId?: string | null,
): string {
  if (googlePlaceId) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}&query_place_id=${encodeURIComponent(googlePlaceId)}`;
  }
  if (latitude != null && longitude != null) {
    return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}
