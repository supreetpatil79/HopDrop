import { useEffect, useMemo, useRef, useState } from 'react';
import { useMMILoader } from '../hooks';
import {
  Bike,
  Bus,
  Car,
  Navigation,
  Plane,
  Route,
  ShieldCheck,
  Sparkles,
  Train,
  Zap
} from 'lucide-react';

export interface RouteGeometryResponse {
  geometry: { coordinates: [number, number][] };
  distanceKm: number;
  durationHours: number;
}

export interface RoutePreviewMapProps {
  origin: { coords: [number, number]; city: string };
  destination: { coords: [number, number]; city: string };
  modeOfTransport?: 'flight' | 'train' | 'car' | 'bus' | 'bike' | 'other' | string;
  fetchRouteGeometry?: (params: {
    originLng: number;
    originLat: number;
    destLng: number;
    destLat: number;
  }) => Promise<RouteGeometryResponse>;
  onDistanceFetched?: (km: number, hours: number) => void;
}

function computeEstimatedStats(originCoords?: [number, number] | null, destCoords?: [number, number] | null, mode?: string) {
  if (!originCoords || !destCoords) {
    return { distanceKm: 650, durationHours: 8.5 };
  }
  const [lng1, lat1] = originCoords;
  const [lng2, lat2] = destCoords;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const crowKm = R * c;

  let factor = 1.25;
  let speedKmH = 75;

  if (mode === 'flight') {
    factor = 1.05;
    speedKmH = 720;
  } else if (mode === 'train') {
    factor = 1.15;
    speedKmH = 110;
  } else if (mode === 'bus') {
    factor = 1.28;
    speedKmH = 65;
  } else if (mode === 'bike') {
    factor = 1.35;
    speedKmH = 40;
  }

  const distanceKm = Math.max(Math.round(crowKm * factor), 25);
  const durationHours = +(distanceKm / speedKmH).toFixed(1);
  return { distanceKm, durationHours };
}

export function RoutePreviewMap({
  origin,
  destination,
  modeOfTransport = 'train',
  fetchRouteGeometry,
  onDistanceFetched
}: RoutePreviewMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const { isLoaded, error: loaderError } = useMMILoader();
  const [apiStats, setApiStats] = useState<{ distanceKm: number; durationHours: number } | null>(null);

  const normalizedMode = (modeOfTransport || 'train').toLowerCase();
  const fallbackStats = useMemo(
    () => computeEstimatedStats(origin.coords, destination.coords, normalizedMode),
    [origin.coords, destination.coords, normalizedMode]
  );
  const activeStats = apiStats || fallbackStats;

  useEffect(() => {
    let active = true;
    if (fetchRouteGeometry && origin.coords && destination.coords) {
      fetchRouteGeometry({
        originLng: origin.coords[0],
        originLat: origin.coords[1],
        destLng: destination.coords[0],
        destLat: destination.coords[1]
      })
        .then((res) => {
          if (active && res) {
            setApiStats({ distanceKm: res.distanceKm, durationHours: res.durationHours });
            onDistanceFetched?.(res.distanceKm, res.durationHours);
          }
        })
        .catch(() => {
          if (active) {
            onDistanceFetched?.(fallbackStats.distanceKm, fallbackStats.durationHours);
          }
        });
    } else {
      onDistanceFetched?.(fallbackStats.distanceKm, fallbackStats.durationHours);
    }
    return () => {
      active = false;
    };
  }, [origin.coords, destination.coords, fetchRouteGeometry, fallbackStats, onDistanceFetched]);

  const modeData = useMemo(() => {
    switch (normalizedMode) {
      case 'flight':
        return {
          icon: <Plane className="h-4 w-4" />,
          badge: 'Skyway Flight',
          speedText: '840 km/h Airspeed',
          color: '#0284c7',
          glow: 'rgba(2, 132, 199, 0.4)',
          originType: 'Origin Airport',
          destType: 'Destination Airport',
          tagline: 'Direct air corridor with non-stop passenger baggage transit'
        };
      case 'car':
        return {
          icon: <Car className="h-4 w-4" />,
          badge: 'Expressway Route',
          speedText: '110 km/h Highway',
          color: '#6366f1',
          glow: 'rgba(99, 102, 241, 0.4)',
          originType: 'Pickup Hub',
          destType: 'Doorstep Drop',
          tagline: 'High-speed interstate expressway with dedicated vehicle transit'
        };
      case 'bus':
        return {
          icon: <Bus className="h-4 w-4" />,
          badge: 'Intercity Bus',
          speedText: '80 km/h Highway',
          color: '#d97706',
          glow: 'rgba(217, 119, 6, 0.4)',
          originType: 'Bus Terminal',
          destType: 'City Hub',
          tagline: 'Reliable trunk route connection across state highways'
        };
      case 'bike':
        return {
          icon: <Bike className="h-4 w-4" />,
          badge: 'City Courier',
          speedText: '45 km/h Relay',
          color: '#e11d48',
          glow: 'rgba(225, 29, 72, 0.4)',
          originType: 'Metro Point',
          destType: 'Express Drop',
          tagline: 'Point-to-point intra-city rapid courier corridor'
        };
      case 'train':
      default:
        return {
          icon: <Train className="h-4 w-4" />,
          badge: 'High-Speed Rail',
          speedText: '130 km/h Rail Track',
          color: '#10b981',
          glow: 'rgba(16, 185, 129, 0.4)',
          originType: 'Rail Junction',
          destType: 'Central Terminal',
          tagline: 'Dedicated electrified railway corridor with zero highway congestion'
        };
    }
  }, [normalizedMode]);

  const hasNativeMap = isLoaded && !loaderError && window.mappls;
  const curvePath = 'M 60 145 Q 250 25 440 145';

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-zinc-200/90 bg-zinc-950 text-white shadow-md transition-all duration-300">
      {hasNativeMap ? (
        <div ref={mapRef} className="h-60 w-full" />
      ) : (
        <div className="relative flex flex-col justify-between overflow-hidden">
          {/* ── TOP HEADER STRIP ── */}
          <div className="flex items-center justify-between border-b border-zinc-800/80 bg-zinc-900/90 px-4 py-2.5 backdrop-blur-md">
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-zinc-200 border border-zinc-700">
                {modeData.icon}
              </span>
              <div className="flex items-center gap-1.5 truncate text-xs font-bold text-white">
                <span>{origin.city || 'Origin'}</span>
                <span className="text-zinc-500 font-normal">→</span>
                <span>{destination.city || 'Destination'}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="rounded-full border border-zinc-700 bg-zinc-800/90 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-300">
                {modeData.badge}
              </span>
            </div>
          </div>

          {/* ── RADAR VECTOR CANVAS ── */}
          <div className="relative h-48 sm:h-56 w-full select-none overflow-hidden bg-radial from-zinc-900 via-zinc-950 to-black">
            {/* Subtle radar coordinate grid */}
            <div
              className="absolute inset-0 opacity-15 pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(circle at 1px 1px, #94a3b8 1px, transparent 0)',
                backgroundSize: '24px 24px'
              }}
            />

            {/* FLOATING CENTER TELEMETRY CHIP */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-full border border-zinc-700/80 bg-zinc-900/90 px-3.5 py-1 text-xs font-medium text-zinc-200 shadow-xl backdrop-blur-md whitespace-nowrap">
              <Sparkles className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span className="font-bold text-white tabular-nums">{Math.round(activeStats.distanceKm).toLocaleString('en-IN')} km</span>
              <span className="text-zinc-600">·</span>
              <span className="text-emerald-400 font-bold tabular-nums">~{activeStats.durationHours} hrs</span>
              <span className="text-zinc-600">·</span>
              <span className="text-zinc-400 text-[11px] font-mono">{modeData.speedText.split(' ')[0]}</span>
            </div>

            {/* SVG CORRIDOR PATH WITH GLOWING TRAIL & PULSE */}
            <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 500 180">
              <defs>
                <path id="transitArc" d={curvePath} fill="none" />

                <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Background Path Track */}
              <path d={curvePath} fill="none" stroke="#27272a" strokeWidth="6" strokeLinecap="round" />
              <path d={curvePath} fill="none" stroke="#3f3f46" strokeWidth="2" strokeDasharray="6 8" strokeLinecap="round" />

              {/* Glowing Active Corridor Overlay */}
              <path
                d={curvePath}
                fill="none"
                stroke={modeData.color}
                strokeWidth="2.5"
                filter="url(#glowFilter)"
                strokeDasharray="12 16"
                className="animate-[dash_6s_linear_infinite]"
              />

              {/* ANIMATED GLIDING SPRITE ALONG CORRIDOR */}
              <g>
                <animateMotion dur="4.8s" repeatCount="indefinite" rotate="auto">
                  <mpath href="#transitArc" />
                </animateMotion>

                {/* Glowing vehicle beacon */}
                <circle cx="0" cy="0" r="10" fill={modeData.glow} className="animate-pulse" />
                <circle cx="0" cy="0" r="4.5" fill="#ffffff" stroke={modeData.color} strokeWidth="2" />
                <polygon points="4,0 -4,-3 -4,3" fill="#ffffff" />
              </g>

              {/* Origin Node */}
              <circle cx="60" cy="145" r="8" fill="rgba(16, 185, 129, 0.2)" />
              <circle cx="60" cy="145" r="4.5" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />

              {/* Destination Node */}
              <circle cx="440" cy="145" r="8" fill="rgba(56, 189, 248, 0.2)" />
              <circle cx="440" cy="145" r="4.5" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" />
            </svg>

            {/* ── ORIGIN STATION BADGE ── */}
            <div className="absolute bottom-3 left-3 sm:left-6 z-10 flex flex-col items-start">
              <div className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/90 px-2.5 py-1 shadow-lg backdrop-blur-sm">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-400">{modeData.originType}</p>
                  <p className="text-xs font-bold text-white leading-tight">{origin.city || 'Origin City'}</p>
                </div>
              </div>
            </div>

            {/* ── DESTINATION STATION BADGE ── */}
            <div className="absolute bottom-3 right-3 sm:right-6 z-10 flex flex-col items-end">
              <div className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/90 px-2.5 py-1 shadow-lg backdrop-blur-sm">
                <Navigation className="h-3 w-3 text-sky-400 shrink-0" />
                <div className="text-right">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-sky-400">{modeData.destType}</p>
                  <p className="text-xs font-bold text-white leading-tight">{destination.city || 'Destination City'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── BOTTOM SECURITY TRUST FOOTER ── */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800/80 bg-zinc-900/90 px-4 py-2 text-xs text-zinc-400">
            <div className="flex items-center gap-1.5 text-[11px]">
              <Route className="h-3.5 w-3.5 text-zinc-500" />
              <span className="text-zinc-300 truncate">{modeData.tagline}</span>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
                <ShieldCheck className="h-3.5 w-3.5" />
                RBI ₹10 Nonce Protected
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold text-zinc-400">
                <Zap className="h-3.5 w-3.5 text-amber-400" />
                Instant Escrow Lock
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
