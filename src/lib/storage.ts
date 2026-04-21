import type { CityHighlights, CachedCity } from '@/types';

const CACHE_PREFIX = 'v1:highlights:';
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function cacheKey(city: string): string {
  return CACHE_PREFIX + city.toLowerCase().replace(/\s+/g, '-');
}

export function getCachedHighlights(city: string): CityHighlights | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(cacheKey(city));
    if (!raw) return null;
    const entry: CachedCity = JSON.parse(raw);
    if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
      localStorage.removeItem(cacheKey(city));
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

export function setCachedHighlights(city: string, data: CityHighlights): void {
  if (typeof window === 'undefined') return;
  try {
    const entry: CachedCity = { data, cachedAt: Date.now() };
    localStorage.setItem(cacheKey(city), JSON.stringify(entry));
  } catch {
    // Storage quota exceeded — silently skip caching
  }
}
