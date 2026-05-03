'use client';
import { useState, useEffect } from 'react';
import { getCachedHighlights, setCachedHighlights } from '@/lib/storage';
import type { CityHighlights } from '@/types';

interface UseHighlightsResult {
  data: CityHighlights | null;
  loading: boolean;
  error: string | null;
}

export function useHighlights(city: string, country: string): UseHighlightsResult {
  const [data, setData] = useState<CityHighlights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!city) return;

    const cached = getCachedHighlights(city, country);
    if (cached) {
      setData(cached);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchHighlights(retries = 1): Promise<void> {
      const abort = new AbortController();
      const timer = setTimeout(() => abort.abort(), 28000);
      try {
        const res = await fetch('/api/highlights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ city, country }),
          signal: abort.signal,
        });
        clearTimeout(timer);

        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          if (res.status === 422 && retries > 0) {
            return fetchHighlights(retries - 1);
          }
          throw new Error(json.error ?? 'Failed to load highlights.');
        }

        const json = await res.json();
        if (!cancelled) {
          setData(json.data);
          setCachedHighlights(city, country, json.data);
        }
      } catch (err) {
        clearTimeout(timer);
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
    return () => { cancelled = true; };
  }, [city, country]);

  return { data, loading, error };
}
