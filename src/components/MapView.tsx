'use client';
import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { CityHighlights, Highlight, Coordinates } from '@/types';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useProximity } from '@/hooks/useProximity';
import HighlightSheet from './HighlightSheet';
import ProximityBanner from './ProximityBanner';

const CATEGORY_COLORS: Record<string, string> = {
  monument:     '#ef4444',
  museum:       '#8b5cf6',
  church:       '#f59e0b',
  viewpoint:    '#06b6d4',
  market:       '#f97316',
  park:         '#22c55e',
  restaurant:   '#ec4899',
  neighbourhood:'#64748b',
  other:        '#6b7280',
};

function markerEl(category: string): HTMLDivElement {
  const el = document.createElement('div');
  el.style.cssText = `
    width: 32px; height: 32px; border-radius: 50% 50% 50% 0;
    background: ${CATEGORY_COLORS[category] ?? '#6b7280'};
    transform: rotate(-45deg);
    border: 2px solid white;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    cursor: pointer;
  `;
  return el;
}

function userDotEl(): HTMLDivElement {
  const el = document.createElement('div');
  el.style.cssText = `
    width: 20px; height: 20px; border-radius: 50%;
    background: #2563eb;
    border: 3px solid white;
    box-shadow: 0 0 0 4px rgba(37,99,235,0.25);
  `;
  return el;
}

interface MapViewProps {
  cityData: CityHighlights;
}

export default function MapView({ cityData }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const [selectedHighlight, setSelectedHighlight] = useState<Highlight | null>(null);

  const geo = useGeolocation();

  const userCoords: Coordinates | null = geo.position
    ? { lat: geo.position.coords.latitude, lng: geo.position.coords.longitude }
    : null;

  const { nearbyHighlight, dismiss } = useProximity(userCoords, cityData.highlights);

  // Initialise map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [cityData.centerCoordinates.lng, cityData.centerCoordinates.lat],
      zoom: 14,
    });

    mapRef.current = map;

    map.on('load', () => {
      // Add highlight markers
      cityData.highlights.forEach((h) => {
        const el = markerEl(h.category);
        const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([h.coordinates.lng, h.coordinates.lat])
          .addTo(map);

        el.addEventListener('click', () => setSelectedHighlight(h));
      });

      // Fit bounds to all highlights
      const bounds = new maplibregl.LngLatBounds();
      cityData.highlights.forEach((h) => bounds.extend([h.coordinates.lng, h.coordinates.lat]));
      map.fitBounds(bounds, { padding: { top: 80, bottom: 160, left: 60, right: 60 }, maxZoom: 15 });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update user position dot
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !geo.position) return;

    const { latitude, longitude } = geo.position.coords;

    if (!userMarkerRef.current) {
      userMarkerRef.current = new maplibregl.Marker({ element: userDotEl() })
        .setLngLat([longitude, latitude])
        .addTo(map);
    } else {
      userMarkerRef.current.setLngLat([longitude, latitude]);
    }
  }, [geo.position]);

  const categories = [...new Set(cityData.highlights.map((h) => h.category))];

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Category legend */}
      <div className="absolute bottom-4 left-4 z-10 bg-white/90 backdrop-blur-sm rounded-2xl p-3 shadow-md max-w-[180px]">
        {categories.map((cat) => (
          <div key={cat} className="flex items-center gap-2 py-0.5">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ background: CATEGORY_COLORS[cat] ?? '#6b7280' }}
            />
            <span className="text-xs text-gray-700 capitalize">{cat}</span>
          </div>
        ))}
      </div>

      {/* Location button */}
      <button
        onClick={geo.isWatching ? geo.stop : geo.start}
        className="absolute bottom-24 right-4 z-10 bg-white rounded-full w-12 h-12 shadow-lg flex items-center justify-center text-xl"
        title={geo.isWatching ? 'Stop tracking' : 'Start tracking location'}
      >
        {geo.isWatching ? '📍' : '🔍'}
      </button>

      {geo.error && (
        <div className="absolute bottom-40 left-4 right-4 z-10 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
          {geo.error.code === 1
            ? 'Location access denied. Enable it in Settings → Safari → Location.'
            : 'Could not get your location. Please try again.'}
        </div>
      )}

      {nearbyHighlight && (
        <ProximityBanner
          highlight={nearbyHighlight}
          onView={() => { setSelectedHighlight(nearbyHighlight); dismiss(nearbyHighlight.id); }}
          onDismiss={() => dismiss(nearbyHighlight.id)}
        />
      )}

      {selectedHighlight && (
        <HighlightSheet
          highlight={selectedHighlight}
          onClose={() => setSelectedHighlight(null)}
        />
      )}
    </div>
  );
}
