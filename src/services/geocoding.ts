import type { GeocodeResult } from '../types';

/**
 * Destination search uses OpenStreetMap's Nominatim service: free, global
 * and keyless. We follow its usage policy — an identifying User-Agent,
 * debounced queries (done by the caller) and only explicit user searches.
 * Search text leaves the device; the user's own position never does.
 */
const BASE = 'https://nominatim.openstreetmap.org';
const HEADERS = {
  'User-Agent': 'WakeyStop/1.0 (open-source location alarm; android)',
  Accept: 'application/json',
};

interface NominatimItem {
  display_name: string;
  name?: string;
  lat: string;
  lon: string;
}

export async function searchPlaces(
  query: string,
  opts: { signal?: AbortSignal; near?: { latitude: number; longitude: number } } = {},
): Promise<GeocodeResult[]> {
  const params = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    limit: '7',
    addressdetails: '0',
  });
  if (opts.near) {
    // Soft bias towards the user's region without restricting results.
    const { latitude, longitude } = opts.near;
    params.set(
      'viewbox',
      [longitude - 2, latitude + 2, longitude + 2, latitude - 2].join(','),
    );
  }
  const res = await fetch(`${BASE}/search?${params}`, {
    headers: HEADERS,
    signal: opts.signal,
  });
  if (!res.ok) throw new Error(`Search failed (${res.status})`);
  const items = (await res.json()) as NominatimItem[];
  return items.map((it) => ({
    name: it.name || it.display_name.split(',')[0].trim(),
    address: it.display_name,
    latitude: parseFloat(it.lat),
    longitude: parseFloat(it.lon),
  }));
}

export async function reverseGeocode(
  latitude: number,
  longitude: number,
  signal?: AbortSignal,
): Promise<GeocodeResult | null> {
  const params = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
    format: 'jsonv2',
    zoom: '16',
  });
  try {
    const res = await fetch(`${BASE}/reverse?${params}`, { headers: HEADERS, signal });
    if (!res.ok) return null;
    const it = (await res.json()) as NominatimItem & { error?: string };
    if (it.error || !it.display_name) return null;
    return {
      name: it.name || it.display_name.split(',')[0].trim(),
      address: it.display_name,
      latitude,
      longitude,
    };
  } catch {
    return null;
  }
}
