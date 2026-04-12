import { useEffect, useRef } from 'react';
import { useMMILoader } from '../hooks';

export interface MMIMapProps {
  center?: [number, number];
  zoom?: number;
  height?: number;
}

export function MMIMap({ center = [77.5946, 12.9716], zoom = 10, height = 320 }: MMIMapProps) {
  const { error, isLoaded } = useMMILoader();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);

  useEffect(() => {
    if (!isLoaded || !window.mappls || !mapRef.current || mapInstance.current) {
      return;
    }

    mapInstance.current = new window.mappls.Map(mapRef.current, {
      center: [center[1], center[0]],
      zoom
    });

    return () => {
      mapInstance.current?.remove?.();
      mapInstance.current = null;
    };
  }, [center, isLoaded, zoom]);

  if (error) {
    return (
      <div style={{ height }} className="flex items-center justify-center rounded-lg border border-border bg-surface-alt px-4 text-center text-sm text-text-muted">
        {error}
      </div>
    );
  }

  return <div ref={mapRef} style={{ width: '100%', height }} className="rounded-lg border border-border" />;
}
