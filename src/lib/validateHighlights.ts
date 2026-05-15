import { z } from 'zod';
import type { CityHighlights } from '@/types';
import { pointInBoundary, type CityBoundary } from './geo';

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

// Tight fallback bounding box (≈22 km) used when no polygon is available
const FALLBACK_BOX_DEG = 0.2;

function isCoordinateSane(coords: { lat: number; lng: number }): boolean {
  if (coords.lat === 0 && coords.lng === 0) return false;
  if (coords.lat < -90 || coords.lat > 90) return false;
  if (coords.lng < -180 || coords.lng > 180) return false;
  return true;
}

function isWithinBoundingBox(
  coords: { lat: number; lng: number },
  center: { lat: number; lng: number }
): boolean {
  return (
    Math.abs(coords.lat - center.lat) <= FALLBACK_BOX_DEG &&
    Math.abs(coords.lng - center.lng) <= FALLBACK_BOX_DEG
  );
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

    if (boundary) {
      // Strict check: point must be inside the actual city boundary polygon
      return pointInBoundary(h.coordinates.lng, h.coordinates.lat, boundary);
    }

    // Fallback: tight bounding box around the geocoder-verified city center
    return isWithinBoundingBox(h.coordinates, center);
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
