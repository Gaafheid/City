'use client';
import { useState, useRef, useEffect } from 'react';
import { haversineDistanceMeters } from '@/lib/geo';
import type { Highlight, Coordinates } from '@/types';

const PROXIMITY_METERS = 100;

export function useProximity(userPosition: Coordinates | null, highlights: Highlight[]) {
  const [nearbyHighlight, setNearbyHighlight] = useState<Highlight | null>(null);
  const dismissedIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!userPosition || highlights.length === 0) return;

    let closest: Highlight | null = null;
    let closestDist = Infinity;

    for (const h of highlights) {
      const dist = haversineDistanceMeters(userPosition, h.coordinates);
      if (dist <= PROXIMITY_METERS && dist < closestDist && !dismissedIds.current.has(h.id)) {
        closest = h;
        closestDist = dist;
      }
    }

    setNearbyHighlight(closest);
  }, [userPosition, highlights]);

  const dismiss = (id: string) => {
    dismissedIds.current.add(id);
    setNearbyHighlight(null);
  };

  return { nearbyHighlight, dismiss };
}
