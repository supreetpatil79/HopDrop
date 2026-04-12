import { useEffect, useRef } from 'react';
import type { Socket } from 'socket.io-client';
import { useMMILoader } from '../hooks';

export interface TrackingMapProps {
  matchId: string;
  socket: Socket | null;
}

export function TrackingMap({ matchId, socket }: TrackingMapProps) {
  const { error, isLoaded } = useMMILoader();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const carrierMarker = useRef<any>(null);

  useEffect(() => {
    if (!isLoaded || !mapRef.current || !window.mappls || mapInstance.current) {
      return;
    }

    mapInstance.current = new window.mappls.Map(mapRef.current, {
      center: [20.5937, 78.9629],
      zoom: 5
    });
  }, [isLoaded]);

  useEffect(() => {
    if (!socket || !mapInstance.current) {
      return;
    }

    socket.emit('join:match', { matchId });

    const onCarrierLocation = ({ lat, lng }: { lat: number; lng: number }) => {
      if (!carrierMarker.current) {
        carrierMarker.current = new window.mappls.Marker({
          map: mapInstance.current,
          position: { lat, lng },
          popupHtml: '<b>Your carrier</b>'
        });
        mapInstance.current.setCenter([lat, lng]);
        mapInstance.current.setZoom(10);
        return;
      }

      carrierMarker.current.setPosition({ lat, lng });
    };

    socket.on('carrier:location', onCarrierLocation);
    return () => {
      socket.off('carrier:location', onCarrierLocation);
    };
  }, [socket, matchId]);

  return (
    <div className="overflow-hidden rounded-2xl border-2 border-primary/30">
      {error ? (
        <div className="flex h-80 items-center justify-center bg-surface-alt px-4 text-center text-sm text-text-muted">
          {error}
        </div>
      ) : (
        <div ref={mapRef} className="h-80 w-full" />
      )}
      <div className="flex items-center gap-2 bg-dark px-4 py-3">
        <div className="h-2 w-2 animate-pulse rounded-full bg-primary shadow-[0_0_10px_#00c853]" />
        <span className="text-sm font-medium text-primary">{error ? 'Live tracking map unavailable' : 'Live tracking active'}</span>
        <span className="ml-auto text-xs text-white/40">Updates every 10s</span>
      </div>
    </div>
  );
}
