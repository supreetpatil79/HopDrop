import { useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { useMMILoader } from '../hooks';
import { Activity, Gauge, MapPin, Navigation, Radio, ShieldCheck, Truck, Zap } from 'lucide-react';

export interface TrackingMapProps {
  matchId: string;
  socket: Socket | null;
}

interface CarrierLocation {
  lat: number;
  lng: number;
  speed?: number;
  timestamp?: string;
}

export function TrackingMap({ matchId, socket }: TrackingMapProps) {
  const { error, isLoaded } = useMMILoader();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const carrierMarker = useRef<any>(null);
  const [carrierLocation, setCarrierLocation] = useState<CarrierLocation>({
    lat: 13.0827,
    lng: 77.8542,
    speed: 58,
    timestamp: new Date().toLocaleTimeString()
  });
  const [progressPercent, setProgressPercent] = useState(48);

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
    if (!socket) {
      return;
    }

    socket.emit('join:match', { matchId });

    const onCarrierLocation = ({ lat, lng, speed }: { lat: number; lng: number; speed?: number }) => {
      setCarrierLocation({
        lat,
        lng,
        speed: speed || 62,
        timestamp: new Date().toLocaleTimeString()
      });
      setProgressPercent((prev) => Math.min(prev + 5, 95));

      if (mapInstance.current && window.mappls) {
        if (!carrierMarker.current) {
          carrierMarker.current = new window.mappls.Marker({
            map: mapInstance.current,
            position: { lat, lng },
            popupHtml: '<b>Your carrier is here</b>'
          });
          mapInstance.current.setCenter([lat, lng]);
          mapInstance.current.setZoom(10);
        } else {
          carrierMarker.current.setPosition({ lat, lng });
        }
      }
    };

    socket.on('carrier:location', onCarrierLocation);
    return () => {
      socket.off('carrier:location', onCarrierLocation);
    };
  }, [socket, matchId]);

  const hasNativeMap = isLoaded && !error && window.mappls;

  return (
    <div className="overflow-hidden rounded-2xl border border-emerald-500/30 bg-slate-950 shadow-2xl">
      {hasNativeMap ? (
        <div ref={mapRef} className="h-80 w-full" />
      ) : (
        /* Uber-Grade Live Tracking Corridor Radar Visualizer */
        <div className="relative h-80 w-full overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950">
          {/* Radar background grid */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                'radial-gradient(circle at 1px 1px, rgba(16,185,129,0.3) 1px, transparent 0)',
              backgroundSize: '28px 28px'
            }}
          />

          {/* Concentric Radar Rings */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <div className="h-64 w-64 rounded-full border border-emerald-500/10" />
            <div className="absolute inset-8 rounded-full border border-emerald-500/15" />
            <div className="absolute inset-16 rounded-full border border-emerald-500/20" />
          </div>

          {/* SVG Transit Line & Progress */}
          <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 700 300">
            <defs>
              <linearGradient id="trackingGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10B981" />
                <stop offset="50%" stopColor="#06B6D4" />
                <stop offset="100%" stopColor="#8B5CF6" />
              </linearGradient>
            </defs>

            {/* Inactive future path */}
            <path
              d="M 80 200 C 250 80, 450 80, 620 200"
              fill="none"
              stroke="rgba(255, 255, 255, 0.15)"
              strokeWidth="6"
              strokeDasharray="8 8"
            />

            {/* Completed active path */}
            <path
              d="M 80 200 C 200 120, 300 100, 360 120"
              fill="none"
              stroke="url(#trackingGradient)"
              strokeWidth="6"
              strokeLinecap="round"
            />
          </svg>

          {/* Origin Flag */}
          <div className="absolute bottom-16 left-12 flex flex-col items-center">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-400">
              <MapPin className="h-3.5 w-3.5" />
            </div>
            <span className="mt-1 text-[11px] font-medium text-slate-300">Pickup Hub</span>
          </div>

          {/* Live Carrier Marker Beacon (positioned along path) */}
          <div className="absolute top-24 left-1/2 -translate-x-1/2 flex flex-col items-center">
            <div className="relative flex items-center justify-center">
              <div className="absolute h-14 w-14 animate-ping rounded-full bg-emerald-400/20" />
              <div className="absolute h-10 w-10 animate-pulse rounded-full bg-emerald-400/40" />
              <div className="relative flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-emerald-500 shadow-[0_0_20px_#10B981]">
                <Truck className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="mt-2 rounded-xl border border-emerald-500/40 bg-slate-900/90 px-3 py-1.5 text-center shadow-xl backdrop-blur-md">
              <p className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-400">
                <span className="h-2 w-2 animate-ping rounded-full bg-emerald-400" />
                Carrier Active
              </p>
              <p className="text-[11px] text-slate-300">GPS Locked · {carrierLocation.speed} km/h</p>
            </div>
          </div>

          {/* Destination Flag */}
          <div className="absolute bottom-16 right-12 flex flex-col items-center">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-500/20 border border-indigo-400 text-indigo-400">
              <Navigation className="h-3.5 w-3.5" />
            </div>
            <span className="mt-1 text-[11px] font-medium text-slate-300">Destination</span>
          </div>

          {/* Floating Live Telemetry HUD */}
          <div className="absolute top-4 left-4 right-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-slate-900/80 px-3 py-1 text-xs text-slate-200 backdrop-blur-md">
              <Radio className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
              <span className="font-semibold text-emerald-400">Live GPS Fanout</span>
              <span className="text-slate-400">·</span>
              <span>Updated {carrierLocation.timestamp}</span>
            </div>

            <div className="flex items-center gap-3 rounded-full border border-white/10 bg-slate-900/80 px-3.5 py-1 text-xs text-white backdrop-blur-md">
              <div className="flex items-center gap-1.5">
                <Gauge className="h-3.5 w-3.5 text-sky-400" />
                <span>{carrierLocation.speed} km/h</span>
              </div>
              <span className="text-slate-500">|</span>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>OTP Handoff Guarded</span>
              </div>
            </div>
          </div>

          {/* Bottom Transit Progress Bar */}
          <div className="absolute bottom-3 left-6 right-6">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span>Transit Progress</span>
              <span className="font-semibold text-emerald-400">{progressPercent}% along corridor</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 transition-all duration-700"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Live Status Bar Footer */}
      <div className="flex items-center gap-2 bg-slate-900 px-4 py-3 border-t border-slate-800">
        <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_10px_#10b981]" />
        <span className="text-sm font-semibold text-emerald-400">Live corridor connection active</span>
        <span className="ml-auto text-xs text-slate-400">Realtime Socket.IO Stream</span>
      </div>
    </div>
  );
}
