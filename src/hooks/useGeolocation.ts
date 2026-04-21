'use client';
import { useState, useRef, useCallback } from 'react';

export interface GeolocationState {
  position: GeolocationPosition | null;
  error: GeolocationPositionError | null;
  isWatching: boolean;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    position: null,
    error: null,
    isWatching: false,
  });
  const watchId = useRef<number | null>(null);

  const start = useCallback(() => {
    if (!navigator.geolocation) {
      setState((s) => ({
        ...s,
        error: { code: 2, message: 'Geolocation not supported', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError,
      }));
      return;
    }

    setState((s) => ({ ...s, isWatching: true, error: null }));

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => setState((s) => ({ ...s, position: pos, error: null })),
      (err) => setState((s) => ({ ...s, error: err, isWatching: false })),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, []);

  const stop = useCallback(() => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setState((s) => ({ ...s, isWatching: false }));
  }, []);

  return { ...state, start, stop };
}
