/**
 * Calculates the great-circle distance between two lat/lng points
 * using the Haversine formula.
 *
 * @returns Distance in metres
 */
export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6_371_000; // Earth's mean radius in metres
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Formats a distance in metres to a human-readable string.
 * < 1 000 m  →  "342 m"
 * ≥ 1 000 m  →  "1.3 km"
 */
export function formatDistance(metres: number): string {
  if (metres < 1000) return `${Math.round(metres)} m`;
  return `${(metres / 1000).toFixed(1)} km`;
}

/**
 * Returns an approximate offset LatLng that is `metres` north of the origin.
 * Used to place the initial radius drag marker.
 */
export function offsetNorth(
  lat: number,
  lng: number,
  metres: number,
): { latitude: number; longitude: number } {
  const latOffset = metres / 111_320; // 1° latitude ≈ 111 320 m
  return { latitude: lat + latOffset, longitude: lng };
}
