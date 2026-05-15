import type { Coordinates } from '@/types';

export function haversineDistanceMeters(a: Coordinates, b: Coordinates): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const a2 =
    sinDLat * sinDLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinDLng * sinDLng;
  return R * 2 * Math.atan2(Math.sqrt(a2), Math.sqrt(1 - a2));
}

// ── City boundary (Nominatim) ─────────────────────────────────────────────

interface GeoJSONPolygon {
  type: 'Polygon';
  coordinates: number[][][];
}

interface GeoJSONMultiPolygon {
  type: 'MultiPolygon';
  coordinates: number[][][][];
}

export type CityBoundary = GeoJSONPolygon | GeoJSONMultiPolygon;

// Ray-casting point-in-polygon (outer ring only — sufficient for city outlines)
function raycast(lng: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]; // GeoJSON order: [lng, lat]
    const [xj, yj] = ring[j];
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

export function pointInBoundary(lng: number, lat: number, boundary: CityBoundary): boolean {
  if (boundary.type === 'Polygon') {
    return raycast(lng, lat, boundary.coordinates[0]);
  }
  return boundary.coordinates.some((poly) => raycast(lng, lat, poly[0]));
}

/** Fetch the administrative boundary polygon for a city from Nominatim.
 *  Returns null if the city can't be found or has no polygon (just a point). */
export async function fetchCityBoundary(
  city: string,
  country: string,
  signal?: AbortSignal
): Promise<CityBoundary | null> {
  try {
    const q = [city, country].filter(Boolean).join(', ');
    const url =
      `https://nominatim.openstreetmap.org/search` +
      `?q=${encodeURIComponent(q)}&format=json&polygon_geojson=1&limit=1&accept-language=en`;

    const res = await fetch(url, {
      signal,
      headers: { 'User-Agent': 'ViewTheTown/1.0 (city highlights app)' },
    });
    if (!res.ok) return null;

    const results = await res.json() as Array<{ geojson?: { type: string } }>;
    const geojson = results[0]?.geojson;
    if (!geojson) return null;
    if (geojson.type !== 'Polygon' && geojson.type !== 'MultiPolygon') return null;

    return geojson as CityBoundary;
  } catch {
    return null; // Nominatim down, timeout, or no boundary — degrade gracefully
  }
}
