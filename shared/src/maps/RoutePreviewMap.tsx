import { useEffect, useRef, useState } from 'react';
import { useMMILoader } from '../hooks';

export interface RouteGeometryResponse {
  geometry: { coordinates: [number, number][] };
  distanceKm: number;
  durationHours: number;
}

export interface RoutePreviewMapProps {
  origin: { coords: [number, number]; city: string };
  destination: { coords: [number, number]; city: string };
  fetchRouteGeometry: (params: {
    originLng: number;
    originLat: number;
    destLng: number;
    destLat: number;
  }) => Promise<RouteGeometryResponse>;
  onDistanceFetched?: (km: number, hours: number) => void;
}

export function RoutePreviewMap({ origin, destination, fetchRouteGeometry, onDistanceFetched }: RoutePreviewMapProps) {
  const { error: loaderError, isLoaded, status: loaderStatus } = useMMILoader();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const fetchRouteGeometryRef = useRef(fetchRouteGeometry);
  const onDistanceFetchedRef = useRef(onDistanceFetched);
  const [routeStatus, setRouteStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [routeStats, setRouteStats] = useState<{ distanceKm: number; durationHours: number } | null>(null);

  useEffect(() => {
    fetchRouteGeometryRef.current = fetchRouteGeometry;
    onDistanceFetchedRef.current = onDistanceFetched;
  }, [fetchRouteGeometry, onDistanceFetched]);

  useEffect(() => {
    if (!isLoaded || !mapRef.current || !window.mappls || !origin.coords || !destination.coords) {
      return;
    }

    let active = true;
    const [originLng, originLat] = origin.coords;
    const [destinationLng, destinationLat] = destination.coords;
    setRouteStatus('loading');
    setRouteStats(null);

    mapInstance.current?.remove?.();

    const centerLng = (originLng + destinationLng) / 2;
    const centerLat = (originLat + destinationLat) / 2;

    mapInstance.current = new window.mappls.Map(mapRef.current, {
      center: [centerLat, centerLng],
      zoom: 6,
      zoomControl: false,
      scrollWheelZoom: false
    });

    new window.mappls.Marker({
      map: mapInstance.current,
      position: { lat: originLat, lng: originLng },
      popupHtml: `<b>${origin.city}</b> (Origin)`
    });

    new window.mappls.Marker({
      map: mapInstance.current,
      position: { lat: destinationLat, lng: destinationLng },
      popupHtml: `<b>${destination.city}</b> (Destination)`
    });

    void fetchRouteGeometryRef.current({
      originLng,
      originLat,
      destLng: destinationLng,
      destLat: destinationLat
    })
      .then(({ geometry, distanceKm, durationHours }) => {
        if (!active || !mapInstance.current) {
          return;
        }

        new window.mappls.Polyline({
          map: mapInstance.current,
          path: geometry.coordinates.map(([lng, lat]) => ({ lat, lng })),
          strokeColor: '#00C853',
          strokeOpacity: 0.9,
          strokeWeight: 4
        });
        setRouteStatus('ready');
        setRouteStats({ distanceKm, durationHours });
        onDistanceFetchedRef.current?.(distanceKm, durationHours);
      })
      .catch(() => {
        if (!active) {
          return;
        }

        setRouteStatus('error');
      });

    return () => {
      active = false;
      mapInstance.current?.remove?.();
      mapInstance.current = null;
    };
  }, [destination.city, destination.coords, isLoaded, origin.city, origin.coords]);

  const footerMessage = loaderError
    ? loaderError
    : routeStatus === 'loading'
      ? 'Loading route preview...'
      : routeStatus === 'error'
        ? 'Route preview unavailable right now. Your selected cities are still saved.'
        : routeStatus === 'ready'
          ? 'Route preview ready'
          : loaderStatus === 'loading'
            ? 'Loading map preview...'
            : 'Preparing route preview...';

  const footerTone = loaderError || routeStatus === 'error' ? 'text-amber-300' : routeStatus === 'ready' ? 'text-primary' : 'text-white/70';

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      {loaderError ? (
        <div className="flex h-64 items-center justify-center bg-surface-alt px-4 text-center text-sm text-text-muted">
          {loaderError}
        </div>
      ) : (
        <div ref={mapRef} className="h-64 w-full bg-surface-alt" />
      )}
      <div className="flex items-center justify-between bg-dark px-4 py-2 text-sm">
        <span className="text-white/80">
          {origin.city} → {destination.city}
        </span>
        <span className={`font-semibold ${footerTone}`}>{footerMessage}</span>
      </div>
      {routeStats ? (
        <div className="flex flex-wrap items-center gap-4 border-t border-border bg-surface-alt px-4 py-2 text-sm text-text-muted">
          <span>{Math.round(routeStats.distanceKm)} km</span>
          <span>{routeStats.durationHours.toFixed(1)} hrs</span>
        </div>
      ) : null}
    </div>
  );
}
