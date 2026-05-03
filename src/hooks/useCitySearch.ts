'use client';
import { useState, useEffect, useRef } from 'react';

export interface CitySuggestion {
  name: string;
  country: string;
  region: string;
  lat: number;
  lng: number;
  key: string;
}

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    name?: string;
    country?: string;
    state?: string;
    county?: string;
    osm_id?: number;
  };
}

export function useCitySearch(query: string) {
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (abortRef.current) abortRef.current.abort();

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    timerRef.current = setTimeout(async () => {
      const abort = new AbortController();
      abortRef.current = abort;

      try {
        const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(trimmed)}&limit=6&layer=city&layer=district`;
        const res = await fetch(url, { signal: abort.signal });
        if (!res.ok) throw new Error('fetch failed');
        const json = await res.json();

        const features: PhotonFeature[] = json.features ?? [];
        const seen = new Set<string>();

        const results: CitySuggestion[] = [];
        for (const f of features) {
          const p = f.properties;
          const name = p.name;
          const country = p.country;
          if (!name || !country) continue;

          const region = p.state ?? p.county ?? '';
          const key = `${name}|${country}|${region}`;
          if (seen.has(key)) continue;
          seen.add(key);

          results.push({
            name,
            country,
            region,
            lat: f.geometry.coordinates[1],
            lng: f.geometry.coordinates[0],
            key,
          });
        }

        setSuggestions(results);
      } catch {
        // AbortError or network error — leave suggestions as-is
      } finally {
        setLoading(false);
      }
    }, 320);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [query]);

  return { suggestions, loading };
}
