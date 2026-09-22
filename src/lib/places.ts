import type { Coordinates } from '@/types';
import { haversineDistanceMeters, pointInBoundary, type CityBoundary } from './geo';

export interface PlaceCandidate {
  name: string;
  coordinates: Coordinates;
}

interface GeoSearchResult {
  title: string;
  lat: number;
  lon: number;
}

export async function fetchNearbyPlaces(
  city: string,
  center: Coordinates,
  boundary: CityBoundary | null,
): Promise<PlaceCandidate[]> {
  try {
    const url = new URL('https://en.wikipedia.org/w/api.php');
    url.search = new URLSearchParams({
      action: 'query',
      list: 'geosearch',
      gscoord: `${center.lat}|${center.lng}`,
      gsradius: '10000',
      gslimit: '100',
      format: 'json',
    }).toString();
    const res = await fetch(url, {
      signal: AbortSignal.timeout(6000),
      headers: { 'User-Agent': 'ViewTheTown/1.0 (https://viewthetown.com)' },
    });
    if (!res.ok) return [];

    const json = await res.json() as { query?: { geosearch?: GeoSearchResult[] } };
    return (json.query?.geosearch ?? [])
      .filter((place) => Number.isFinite(place.lat) && Number.isFinite(place.lon))
      .filter((place) => place.title.toLowerCase() !== city.toLowerCase())
      .filter((place) => haversineDistanceMeters(center, { lat: place.lat, lng: place.lon }) <= 8000)
      .filter((place) => !boundary || pointInBoundary(place.lon, place.lat, boundary))
      .slice(0, 40)
      .map((place) => ({ name: place.title, coordinates: { lat: place.lat, lng: place.lon } }));
  } catch {
    return [];
  }
}
