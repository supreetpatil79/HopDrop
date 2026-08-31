import { useEffect, useRef } from 'react';
import { useMMILoader } from '../hooks';
import { Crosshair, MapPin, Navigation, Radio } from 'lucide-react';

export interface MMIMapProps {
  center?: [number, number];
  zoom?: number;
  height?: number;
}

export function MMIMap({ center = [77.5946, 12.9716], zoom = 10, height = 320 }: MMIMapProps) {
  const { error, isLoaded } = useMMILoader();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);

  const [lng, lat] = center;

  useEffect(() => {
    if (!isLoaded || !window.mappls || !mapRef.current || mapInstance.current) {
      return;
    }

    mapInstance.current = new window.mappls.Map(mapRef.current, {
      center: [lat, lng],
      zoom
    });

    return () => {
      mapInstance.current?.remove?.();
      mapInstance.current = null;
    };
  }, [center, isLoaded, lat, lng, zoom]);

  const hasNativeMap = isLoaded && !error && window.mappls;

  if (hasNativeMap) {
    return <div ref={mapRef} style={{ width: '100%', height }} className="rounded-2xl border border-border" />;
  }

  return (
    <div
      style={{ height }}
      className="relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 shadow-2xl"
    >
      {/* Tactical Coordinate Grid */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(16,185,129,0.3) 1px, transparent 0)',
          backgroundSize: '24px 24px'
        }}
      />

      {/* Crosshair & Radar Pulse */}
      <div className="relative flex items-center justify-center">
        <div className="absolute h-24 w-24 animate-ping rounded-full bg-emerald-500/10" />
        <div className="absolute h-16 w-16 animate-pulse rounded-full bg-emerald-500/20" />
        <div className="relative flex h-12 w-12 items-center justify-center rounded-full border-2 border-emerald-400 bg-emerald-950 shadow-[0_0_25px_rgba(16,185,129,0.7)]">
          <MapPin className="h-6 w-6 text-emerald-300 animate-bounce" />
        </div>
      </div>

      {/* Target Coordinates Readout */}
      <div className="mt-4 rounded-xl border border-emerald-500/30 bg-slate-900/90 px-4 py-2 text-center shadow-xl backdrop-blur-md">
        <p className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400">
          <Radio className="h-3.5 w-3.5 animate-pulse text-emerald-400" />
          Location Lock
        </p>
        <p className="mt-0.5 text-sm font-semibold text-white">
          {lat.toFixed(4)}° N, {lng.toFixed(4)}° E
        </p>
      </div>

      {/* Bottom status chip */}
      <div className="absolute bottom-3 flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/80 px-3 py-1 text-[11px] text-slate-400 backdrop-blur-md">
        <Crosshair className="h-3 w-3 text-emerald-400" />
        <span>Corridor geocoding synced</span>
      </div>
    </div>
  );
}
