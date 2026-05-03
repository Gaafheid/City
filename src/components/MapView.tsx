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
  monument:      '#ef4444',
  museum:        '#8b5cf6',
  church:        '#f59e0b',
  viewpoint:     '#06b6d4',
  market:        '#f97316',
  park:          '#22c55e',
  restaurant:    '#ec4899',
  neighbourhood: '#64748b',
  other:         '#6b7280',
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
    background: #22d3ee;
    border: 3px solid white;
    box-shadow: 0 0 0 4px rgba(34,211,238,0.25);
  `;
  return el;
}

function forceEnglishLabels(map: maplibregl.Map) {
  const englishField = ['coalesce', ['get', 'name:en'], ['get', 'name']] as maplibregl.ExpressionSpecification;
  map.getStyle().layers.forEach((layer) => {
    if (layer.type !== 'symbol') return;
    const layout = (layer as maplibregl.SymbolLayerSpecification).layout;
    if (layout && layout['text-field']) {
      try {
        map.setLayoutProperty(layer.id, 'text-field', englishField);
      } catch {
        // Some layers may reject the expression — skip them
      }
    }
  });
}

async function addCityBoundary(map: maplibregl.Map, city: string, country: string) {
  try {
    const q = [city, country].filter(Boolean).join(', ');
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&polygon_geojson=1&limit=1`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    if (!res.ok) return;
    const results = await res.json();
    const geojson = results[0]?.geojson;
    if (!geojson || !['Polygon', 'MultiPolygon'].includes(geojson.type)) return;

    if (map.getSource('city-boundary')) return; // already added

    map.addSource('city-boundary', {
      type: 'geojson',
      data: { type: 'Feature', geometry: geojson, properties: {} },
    });

    map.addLayer({
      id: 'city-boundary-fill',
      type: 'fill',
      source: 'city-boundary',
      paint: { 'fill-color': '#22d3ee', 'fill-opacity': 0.06 },
    });

    map.addLayer({
      id: 'city-boundary-line',
      type: 'line',
      source: 'city-boundary',
      paint: {
        'line-color': '#22d3ee',
        'line-width': 2,
        'line-opacity': 0.7,
        'line-dasharray': [5, 3],
      },
    });
  } catch {
    // Nominatim unavailable or no boundary — fail silently
  }
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
      // Force all labels to English
      forceEnglishLabels(map);

      // Fetch and draw city boundary outline
      addCityBoundary(map, cityData.city, cityData.country);

      // Add highlight markers
      cityData.highlights.forEach((h) => {
        const el = markerEl(h.category);
        new maplibregl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([h.coordinates.lng, h.coordinates.lat])
          .addTo(map);
        el.addEventListener('click', () => setSelectedHighlight(h));
      });

      // Fit to highlights
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

      {/* Category legend — dark themed */}
      <div
        className="absolute bottom-4 left-4 z-10 rounded-2xl p-3 max-w-[180px]"
        style={{
          background: 'rgba(2,6,23,0.85)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(34,211,238,0.12)',
        }}
      >
        {categories.map((cat) => (
          <div key={cat} className="flex items-center gap-2 py-0.5">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ background: CATEGORY_COLORS[cat] ?? '#6b7280' }}
            />
            <span className="text-xs text-slate-300 capitalize">{cat}</span>
          </div>
        ))}
      </div>

      {/* Location button */}
      <button
        onClick={geo.isWatching ? geo.stop : geo.start}
        className="absolute bottom-24 right-4 z-10 rounded-full w-12 h-12 flex items-center justify-center text-xl"
        style={{
          background: 'rgba(2,6,23,0.85)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(34,211,238,0.12)',
        }}
        title={geo.isWatching ? 'Stop tracking' : 'Start tracking location'}
      >
        {geo.isWatching ? '📍' : '🔍'}
      </button>

      {geo.error && (
        <div
          className="absolute bottom-40 left-4 right-4 z-10 rounded-xl p-3 text-sm"
          style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)',
            color: '#fca5a5',
          }}
        >
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
