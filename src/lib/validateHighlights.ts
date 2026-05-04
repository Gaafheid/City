import { z } from 'zod';
import type { CityHighlights } from '@/types';

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

function isValidCoordinate(
  coords: { lat: number; lng: number },
  center: { lat: number; lng: number }
): boolean {
  if (coords.lat === 0 && coords.lng === 0) return false;
  if (coords.lat < -90 || coords.lat > 90) return false;
  if (coords.lng < -180 || coords.lng > 180) return false;
  if (Math.abs(coords.lat - center.lat) > 0.5) return false;
  if (Math.abs(coords.lng - center.lng) > 0.5) return false;
  return true;
}

export function validateAndFilterHighlights(
  raw: unknown,
  preferredCenter?: { lat: number; lng: number }
): CityHighlights {
  const parsed = CityHighlightsSchema.parse(raw);

  // Use the geocoder-verified center (from Photon) when available —
  // Claude Haiku sometimes returns wrong centerCoordinates for smaller cities.
  const center = preferredCenter ?? parsed.centerCoordinates;

  const filtered = parsed.highlights.filter((h) =>
    isValidCoordinate(h.coordinates, center)
  );

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
