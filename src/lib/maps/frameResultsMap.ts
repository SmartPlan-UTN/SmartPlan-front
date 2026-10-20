/** Automatic framing only: the visitor remains free to zoom in manually. */
const MAX_FRAME_ZOOM = 15;

export function frameResultsMap(
  map: google.maps.Map,
  positions: google.maps.LatLngLiteral[],
  padding: number,
  animate = false,
): () => void {
  if (positions.length === 0) return () => undefined;

  const first = positions[0];
  if (positions.every(({ lat, lng }) => lat === first.lat && lng === first.lng)) {
    map.setCenter(first);
    map.setZoom(MAX_FRAME_ZOOM);
    return () => undefined;
  }

  const bounds = new google.maps.LatLngBounds();
  positions.forEach((position) => bounds.extend(position));
  if (animate) map.panTo(bounds.getCenter());

  // fitBounds can animate: reading getZoom immediately reads the old zoom.
  const listener = google.maps.event.addListenerOnce(map, "idle", () => {
    if ((map.getZoom() ?? 0) > MAX_FRAME_ZOOM) map.setZoom(MAX_FRAME_ZOOM);
  });
  map.fitBounds(bounds, padding);
  return () => listener.remove();
}
