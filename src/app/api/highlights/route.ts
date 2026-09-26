import { NextRequest, NextResponse } from 'next/server';
import { generateCityHighlights } from '@/lib/claude';
import { validateAndFilterHighlights } from '@/lib/validateHighlights';
import { fetchCityBoundary, pointInBoundary } from '@/lib/geo';
import { fetchNearbyPlaces } from '@/lib/places';
import { trackSearch } from '@/lib/analytics';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import type { HighlightCategory } from '@/types';

const VALID_CATEGORIES: HighlightCategory[] = [
  'monument', 'museum', 'church', 'viewpoint', 'market', 'park', 'restaurant', 'neighbourhood', 'other',
];

interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  let city: string;
  let country: string;
  let center: { lat: number; lng: number } | undefined;
  let moreCategories: HighlightCategory[] = [];
  let excludeNames: string[] = [];
  try {
    const payload = await req.text();
    if (payload.length > 4096) {
      return NextResponse.json({ error: 'Request body is too large.' }, { status: 413 });
    }
    const body = JSON.parse(payload);
    city = String(body.city ?? '').trim().slice(0, 100);
    country = String(body.country ?? '').trim().slice(0, 100);
    const lat = parseFloat(body.lat);
    const lng = parseFloat(body.lng);
    if (body.more === true) {
      const categories = Array.isArray(body.categories) ? body.categories : [];
      const validCategories = categories.filter((value: unknown) =>
        typeof value === 'string' && VALID_CATEGORIES.includes(value as HighlightCategory)
      ) as HighlightCategory[];
      moreCategories = [...new Set(validCategories)].slice(0, 2);
      excludeNames = Array.isArray(body.excludeNames)
        ? body.excludeNames.filter((value: unknown): value is string => typeof value === 'string').slice(0, 100)
        : [];
      if (moreCategories.length === 0) {
        return NextResponse.json({ error: 'Choose at least one category.' }, { status: 400 });
      }
    }
    if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      center = { lat, lng };
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (!city) {
    return NextResponse.json({ error: 'City name is required.' }, { status: 400 });
  }

  const isMoreRequest = moreCategories.length > 0;
  const cache = isMoreRequest ? undefined : typeof caches === 'undefined'
    ? undefined
    : (caches as CacheStorage & { default?: Cache }).default;
  const cacheUrl = new URL('https://viewthetown.com/api/highlights/cached');
  cacheUrl.searchParams.set('v', '4');
  cacheUrl.searchParams.set('city', city.toLowerCase());
  cacheUrl.searchParams.set('country', country.toLowerCase());
  if (center) {
    cacheUrl.searchParams.set('lat', center.lat.toFixed(3));
    cacheUrl.searchParams.set('lng', center.lng.toFixed(3));
  }
  const cacheKey = new Request(cacheUrl);
  if (cache) {
    try {
      const hit = await cache.match(cacheKey);
      if (hit) {
        trackSearch(city, country, 'cached', Date.now() - t0);
        return NextResponse.json(await hit.json(), { headers: { 'X-Highlights-Cache': 'hit' } });
      }
    } catch (err) {
      console.warn('Highlight cache read failed:', err);
    }
  }

  const clientIp = req.headers.get('cf-connecting-ip');
  if (clientIp) {
    let limiter: RateLimiter | undefined;
    try {
      limiter = (getCloudflareContext().env as unknown as { HIGHLIGHTS_RATE_LIMIT?: RateLimiter }).HIGHLIGHTS_RATE_LIMIT;
    } catch {
      // The binding is unavailable under the plain Next.js local server.
    }
    if (!limiter) {
      console.error('Highlight rate limit binding is unavailable.');
      return NextResponse.json({ error: 'Highlights are temporarily unavailable.' }, { status: 503 });
    }
    const { success } = await limiter.limit({ key: clientIp });
    if (!success) {
      return NextResponse.json({ error: 'Too many searches. Please try again in a minute.' }, { status: 429 });
    }
  }

  const [boundary, nearbyPlaces] = await Promise.all([
    fetchCityBoundary(city, country, AbortSignal.timeout(8000)),
    center ? fetchNearbyPlaces(city, center, null) : Promise.resolve([]),
  ]);
  const candidates = boundary
    ? nearbyPlaces.filter((place) => pointInBoundary(place.coordinates.lng, place.coordinates.lat, boundary))
    : nearbyPlaces;

  let raw: unknown;
  try {
    raw = await generateCityHighlights(
      city,
      country,
      candidates.length >= 5 ? candidates : [],
      { categories: moreCategories, excludeNames },
    );
  } catch (err) {
    console.error('Claude API error:', err);
    trackSearch(city, country, 'error', Date.now() - t0);
    return NextResponse.json({ error: 'Failed to generate highlights. Please try again.' }, { status: 500 });
  }

  let validated;
  try {
    validated = validateAndFilterHighlights(raw, center, boundary);
  } catch (err) {
    const msg = err instanceof Error ? err.message : '';
    trackSearch(city, country, 'error', Date.now() - t0);
    if (msg === 'TOO_FEW_VALID_HIGHLIGHTS') {
      return NextResponse.json(
        { error: 'Could not generate reliable highlights for this city. Please try again or try a different city.' },
        { status: 422 }
      );
    }
    console.error('Validation error:', err);
    return NextResponse.json({ error: 'Highlight data validation failed. Please try again.' }, { status: 422 });
  }

  if (isMoreRequest) {
    validated.highlights = validated.highlights.filter((highlight) =>
      moreCategories.includes(highlight.category) &&
      !excludeNames.some((name) => name.toLowerCase() === highlight.name.toLowerCase())
    );
    if (validated.highlights.length === 0) {
      return NextResponse.json({ error: 'Could not find more places in those categories. Try another category.' }, { status: 422 });
    }
  }

  trackSearch(city, country, 'success', Date.now() - t0);
  const result = { data: validated };
  if (cache) {
    try {
      await cache.put(cacheKey, new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=604800' },
      }));
    } catch (err) {
      console.warn('Highlight cache write failed:', err);
    }
  }
  return NextResponse.json(result, { headers: { 'X-Highlights-Cache': cache ? 'miss' : 'unavailable' } });
}
