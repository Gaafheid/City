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

// Max distance (≈11 km) from the geocoder-verified city centre.
// Applied even when a boundary polygon is available so that a large
// municipality polygon (e.g. the full county) cannot let distant highlights
// slip through.
const MAX_DIST_DEG = 0.1;

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
    Math.abs(coords.lat - center.lat) <= MAX_DIST_DEG &&
    Math.abs(coords.lng - center.lng) <= MAX_DIST_DEG
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

    // Always check bounding box first — prevents distant highlights that happen
    // to be inside a large municipality / county polygon from slipping through.
    if (!isWithinBoundingBox(h.coordinates, center)) return false;

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
