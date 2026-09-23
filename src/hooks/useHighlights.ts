'use client';
import { useState, useEffect } from 'react';
import { getCachedHighlights, setCachedHighlights } from '@/lib/storage';
import type { CityHighlights, HighlightCategory } from '@/types';

interface UseHighlightsResult {
  data: CityHighlights | null;
  loading: boolean;
  error: string | null;
  loadingMore: boolean;
  moreError: string | null;
  loadMore: (categories: HighlightCategory[]) => Promise<boolean>;
}

export function useHighlights(
  city: string,
  country: string,
  center?: { lat: number; lng: number }
): UseHighlightsResult {
  const [data, setData] = useState<CityHighlights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState<string | null>(null);

  useEffect(() => {
    if (!city) return;

    const cached = getCachedHighlights(city, country);
    if (cached) {
      setData(cached);
      setLoading(false);
      return;
    }

    let cancelled = false;
    let controller: AbortController | null = null;

    async function fetchHighlights(): Promise<void> {
      try {
        for (let attempt = 0; attempt < 2; attempt++) {
          controller = new AbortController();
          const timer = setTimeout(() => controller?.abort(), 50000);
          let res: Response;
          try {
            res = await fetch('/api/highlights', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ city, country, lat: center?.lat, lng: center?.lng }),
              signal: controller.signal,
            });
          } finally {
            clearTimeout(timer);
          }

          if (!res.ok) {
            const json = await res.json().catch(() => ({}));
            if (res.status === 422 && attempt === 0) continue;
            throw new Error(json.error ?? 'Failed to load highlights.');
          }

          const json = await res.json();
          if (!cancelled) {
            setData(json.data);
            setCachedHighlights(city, country, json.data);
          }
          return;
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error && err.name === 'AbortError'
            ? 'This city took too long to load. Please try again.'
            : (err instanceof Error ? err.message : 'Something went wrong.');
          setError(msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchHighlights();
    return () => { cancelled = true; controller?.abort(); };
  }, [city, country, center?.lat, center?.lng]);

  async function loadMore(categories: HighlightCategory[]): Promise<boolean> {
    if (!data || loadingMore || categories.length === 0 || categories.length > 2) return false;
    setLoadingMore(true);
    setMoreError(null);
    try {
      const res = await fetch('/api/highlights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city,
          country,
          lat: center?.lat,
          lng: center?.lng,
          more: true,
          categories,
          excludeNames: data.highlights.map((highlight) => highlight.name),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? 'Could not load more highlights.');

      const incoming = json.data as CityHighlights;
      const existingNames = new Set(data.highlights.map((highlight) => highlight.name.toLowerCase()));
      const additions = incoming.highlights.filter((highlight) => !existingNames.has(highlight.name.toLowerCase()));
      const merged = { ...data, highlights: [...data.highlights, ...additions], generatedAt: Date.now() };
      setData(merged);
      setCachedHighlights(city, country, merged);
      return additions.length > 0;
    } catch (err) {
      setMoreError(err instanceof Error ? err.message : 'Could not load more highlights.');
      return false;
    } finally {
      setLoadingMore(false);
    }
  }

  return { data, loading, error, loadingMore, moreError, loadMore };
}
