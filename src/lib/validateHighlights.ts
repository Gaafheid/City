import { z } from 'zod';
import type { CityHighlights } from '@/types';
import { haversineDistanceMeters, pointInBoundary, type CityBoundary } from './geo';
import { MAX_TOURIST_RADIUS_METERS } from './places';

const CoordinatesSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});

const HighlightSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum([
    'monument', 'museum', 'church', 'viewpoint',
    'market', 'park', 'restaurant', 'neighbourhood', 'other',
  ]),
  coordinates: CoordinatesSchema,
  shortDescription: z.string(),
  backgroundInfo: z.string(),
  tips: z.string(),
  address: z.string(),
  openingHours: z.string().optional(),
  entryFee: z.string().optional(),
});

export const CityHighlightsSchema = z.object({
  city: z.string(),
  country: z.string(),
  centerCoordinates: CoordinatesSchema,
  highlights: z.array(HighlightSchema),
});

function isCoordinateSane(coords: { lat: number; lng: number }): boolean {
  if (coords.lat === 0 && coords.lng === 0) return false;
  if (coords.lat < -90 || coords.lat > 90) return false;
  if (coords.lng < -180 || coords.lng > 180) return false;
  return true;
}

function isWithinTouristRadius(
  coords: { lat: number; lng: number },
  center: { lat: number; lng: number }
): boolean {
  return haversineDistanceMeters(center, coords) <= MAX_TOURIST_RADIUS_METERS;
}

function isTransportInfrastructure(highlight: { name: string; category: string }): boolean {
  // Museums remain valid even when their name references railway history.
  if (highlight.category === 'museum' && /museum/i.test(highlight.name)) return false;
  return /\b(?:railway|train|bus|metro|tram) station\b|\b(?:airport|motorway|highway)\b/i.test(highlight.name);
}

export function validateAndFilterHighlights(
  raw: unknown,
  preferredCenter?: { lat: number; lng: number },
  boundary?: CityBoundary | null
): CityHighlights {
  const parsed = CityHighlightsSchema.parse(raw);

  // Photon geocoder center overrides Claude's (Haiku can give wrong coords)
  const center = preferredCenter ?? parsed.centerCoordinates;

  const filtered = parsed.highlights.filter((h) => {
    if (!isCoordinateSane(h.coordinates)) return false;
    if (isTransportInfrastructure(h)) return false;

    // Keep highlights visitor-relevant and close to the city centre even when
    // the returned boundary is a large municipality or county polygon.
    if (!isWithinTouristRadius(h.coordinates, center)) return false;

    // If we also have a precise boundary polygon, require the point to be inside it.
    if (boundary) {
      return pointInBoundary(h.coordinates.lng, h.coordinates.lat, boundary);
    }

    return true;
  });

  if (filtered.length < 5) {
    throw new Error('TOO_FEW_VALID_HIGHLIGHTS');
  }

  return {
    ...parsed,
    centerCoordinates: center,
    highlights: filtered,
    generatedAt: Date.now(),
  };
}
