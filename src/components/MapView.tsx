'use client';
import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
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

const CATEGORY_EMOJIS: Record<string, string> = {
  monument:      '🏛️',
  museum:        '🖼️',
  church:        '⛪',
  viewpoint:     '🔭',
  market:        '🛒',
  park:          '🌳',
  restaurant:    '🍴',
  neighbourhood: '🏘️',
  other:         '📍',
};

const DOT_ZOOM_THRESHOLD = 12;

// MapLibre positions this element with a transform. Keep its positioning absolute
// and put the visual states in children so zooming cannot shift the coordinate.
function markerEl(category: string): HTMLDivElement {
  const color = CATEGORY_COLORS[category] ?? '#6b7280';
  const emoji = CATEGORY_EMOJIS[category] ?? '📍';

  const wrapper = document.createElement('div');
  wrapper.style.cssText = [
    'position:absolute',
    'width:44px',
    'height:52px',
    'cursor:pointer',
    'user-select:none',
  ].join(';');

  const symbol = document.createElement('div');
  symbol.style.cssText = [
    'position:absolute',
    'top:0;left:0',
    'width:44px;height:44px',
    'border-radius:10px',
    'background:#0f172a',
    `border:2.5px solid ${color}`,
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'font-size:20px',
    'line-height:1',
=======
    'position:relative',
    'width:18px',
    'height:18px',
    'cursor:pointer',
    'border-radius:50%',
    `background:${color}`,
    'border:3px solid #0f172a',
    'box-shadow:0 0 0 2px rgba(255,255,255,0.9), 0 2px 6px rgba(0,0,0,0.45)',
>>>>>>> origin/main
    'box-sizing:border-box',
    'filter:drop-shadow(0 3px 6px rgba(0,0,0,0.45))',
  ].join(';');
  symbol.textContent = emoji;

  const tail = document.createElement('div');
  tail.style.cssText = [
    'position:absolute',
    'bottom:0;left:50%',
    'transform:translateX(-50%)',
    'width:0;height:0',
    'border-left:7px solid transparent',
    'border-right:7px solid transparent',
    `border-top:8px solid ${color}`,
  ].join(';');

  const dot = document.createElement('div');
  dot.style.cssText = [
    'position:absolute',
    'top:17px;left:17px',
    'width:18px;height:18px',
    'border-radius:50%',
    `background:${color}`,
    'border:3px solid #0f172a',
    'box-shadow:0 0 0 2px rgba(255,255,255,0.9), 0 2px 6px rgba(0,0,0,0.45)',
    'box-sizing:border-box',
    'display:none',
  ].join(';');

  wrapper.append(symbol, tail, dot);
  wrapper.dataset.markerSymbol = 'true';
  return wrapper;
}

function setMarkerZoom(el: HTMLDivElement, zoom: number) {
  const compact = zoom < DOT_ZOOM_THRESHOLD;
  const symbol = el.children[0] as HTMLElement;
  const tail = el.children[1] as HTMLElement;
  const dot = el.children[2] as HTMLElement;
  symbol.style.display = compact ? 'none' : 'flex';
  tail.style.display = compact ? 'none' : 'block';
  dot.style.display = compact ? 'block' : 'none';
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

function fireEvent(event: string, city: string, extra: string[]) {
  fetch('/api/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event, city, extra }),
  }).catch(() => {});
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

    maplibregl.setWorkerUrl('/maplibre/maplibre-gl-worker.mjs');
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: [cityData.centerCoordinates.lng, cityData.centerCoordinates.lat],
      zoom: 14,
    });

    mapRef.current = map;

    map.once('style.load', () => {
      // Force all labels to English
      forceEnglishLabels(map);

      // Fetch and draw city boundary outline
      addCityBoundary(map, cityData.city, cityData.country);
    });

    // Markers do not depend on vector tiles finishing their load.
    cityData.highlights.forEach((h) => {
      const el = markerEl(h.category);
      el.title = h.name;
      el.setAttribute('aria-label', h.name);
      new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([h.coordinates.lng, h.coordinates.lat])
        .addTo(map);
      setMarkerZoom(el, map.getZoom());
      el.addEventListener('click', () => {
        setSelectedHighlight(h);
        fireEvent('highlight_view', cityData.city, [h.name, h.category, 'tap']);
      });
    });

    map.on('zoom', () => {
      map.getContainer().querySelectorAll<HTMLDivElement>('[data-marker-symbol="true"]')
        .forEach((el) => setMarkerZoom(el, map.getZoom()));
    });

    if (cityData.highlights.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      cityData.highlights.forEach((h) => bounds.extend([h.coordinates.lng, h.coordinates.lat]));
      map.fitBounds(bounds, { padding: { top: 80, bottom: 160, left: 60, right: 60 }, maxZoom: 15 });
    }

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
            <span className="text-sm flex-shrink-0" style={{ lineHeight: 1 }}>
              {CATEGORY_EMOJIS[cat] ?? '📍'}
            </span>
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
          onView={() => {
            setSelectedHighlight(nearbyHighlight);
            dismiss(nearbyHighlight.id);
            fireEvent('highlight_view', cityData.city, [nearbyHighlight.name, nearbyHighlight.category, 'proximity']);
          }}
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
