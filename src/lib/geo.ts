import type { Place } from '../types';

const EARTH_RADIUS_M = 6371008.8;

/** Great-circle distance between two points, in metres. */
export function distanceMeters(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** "850 m" / "1.2 km" / "23 km" */
export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters)) return '—';
  if (meters < 1000) return `${Math.round(meters / 10) * 10} m`;
  if (meters < 10000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters / 1000)} km`;
}

/**
 * GeoJSON polygon approximating a circle, for drawing the wake-distance
 * ring on the map.
 */
export function circlePolygon(
  center: { latitude: number; longitude: number },
  radiusMeters: number,
  steps = 72,
): GeoJSON.Feature<GeoJSON.Polygon> {
  const coords: [number, number][] = [];
  const latRad = (center.latitude * Math.PI) / 180;
  const dLat = (radiusMeters / EARTH_RADIUS_M) * (180 / Math.PI);
  const dLon = dLat / Math.cos(latRad);
  for (let i = 0; i <= steps; i++) {
    const theta = (i / steps) * 2 * Math.PI;
    coords.push([
      center.longitude + dLon * Math.cos(theta),
      center.latitude + dLat * Math.sin(theta),
    ]);
  }
  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'Polygon', coordinates: [coords] },
  };
}

/** Reasonable map zoom so the whole wake circle is visible. */
export function zoomForRadius(radiusMeters: number): number {
  // Empirical: zoom 14 comfortably shows ~1 km radius on a phone screen.
  return Math.max(9, Math.min(16, 14 - Math.log2(radiusMeters / 1000)));
}

export function describePlace(p: Place): string {
  return p.name ?? p.address ?? `${p.latitude.toFixed(4)}, ${p.longitude.toFixed(4)}`;
}
