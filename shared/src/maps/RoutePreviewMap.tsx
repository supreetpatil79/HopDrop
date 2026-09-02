import { useEffect, useMemo, useRef, useState } from 'react';
import { useMMILoader } from '../hooks';
import {
  Bike,
  Building2,
  Bus,
  Car,
  Cloud,
  Compass,
  Landmark,
  MapPin,
  Navigation,
  Plane,
  Route,
  ShieldCheck,
  Sparkles,
  Train,
  Trees,
  Wind,
  Zap
} from 'lucide-react';
import clsx from 'clsx';

export interface RouteGeometryResponse {
  geometry: { coordinates: [number, number][] };
  distanceKm: number;
  durationHours: number;
}

export interface RoutePreviewMapProps {
  origin: { coords: [number, number]; city: string };
  destination: { coords: [number, number]; city: string };
  modeOfTransport?: 'flight' | 'train' | 'car' | 'bus' | 'bike' | 'other' | string;
  fetchRouteGeometry: (params: {
    originLng: number;
    originLat: number;
    destLng: number;
    destLat: number;
  }) => Promise<RouteGeometryResponse>;
  onDistanceFetched?: (km: number, hours: number) => void;
}

function computeEstimatedStats(originCoords?: [number, number] | null, destCoords?: [number, number] | null) {
  if (!originCoords || !destCoords) {
    return { distanceKm: 650, durationHours: 9.5 };
  }
  const [lng1, lat1] = originCoords;
  const [lng2, lat2] = destCoords;
  const R = 6371; // Earth radius km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const crowKm = R * c;
  const roadKm = Math.max(Math.round(crowKm * 1.28), 35);
  const hours = +(roadKm / 65).toFixed(1);
  return { distanceKm: roadKm, durationHours: hours };
}

// Helper to get landmark illustration & name for Indian cities
function getCityLandmark(cityName?: string) {
  const q = (cityName || '').toLowerCase();
  if (q.includes('bengaluru') || q.includes('bangalore')) {
    return {
      name: 'Vidhana Soudha',
      badge: '🏛️ Bengaluru',
      svg: (
        <g className="fill-slate-700">
          <path d="M 4 28 L 44 28 L 44 14 L 38 14 L 38 8 L 24 0 L 10 8 L 10 14 L 4 14 Z" fill="#64748b" opacity="0.9" />
          <circle cx="24" cy="7" r="4" fill="#475569" />
          <rect x="23" y="1" width="2" height="3" fill="#0f172a" />
          <rect x="8" y="15" width="2" height="13" fill="#f8fafc" />
          <rect x="14" y="15" width="2" height="13" fill="#f8fafc" />
          <rect x="20" y="15" width="2" height="13" fill="#f8fafc" />
          <rect x="26" y="15" width="2" height="13" fill="#f8fafc" />
          <rect x="32" y="15" width="2" height="13" fill="#f8fafc" />
          <rect x="38" y="15" width="2" height="13" fill="#f8fafc" />
          <path d="M 21 28 L 21 20 Q 24 18 27 20 L 27 28 Z" fill="#0f172a" />
        </g>
      )
    };
  }
  if (q.includes('hyderabad') || q.includes('secunderabad')) {
    return {
      name: 'Charminar',
      badge: '🕌 Hyderabad',
      svg: (
        <g className="fill-slate-700">
          <rect x="8" y="12" width="32" height="16" fill="#64748b" opacity="0.9" />
          <path d="M 18 28 L 18 18 Q 24 14 30 18 L 30 28 Z" fill="#0f172a" />
          <rect x="6" y="2" width="4" height="26" fill="#475569" />
          <circle cx="8" cy="2" r="2.5" fill="#f59e0b" />
          <rect x="38" y="2" width="4" height="26" fill="#475569" />
          <circle cx="40" cy="2" r="2.5" fill="#f59e0b" />
          <rect x="12" y="8" width="24" height="4" fill="#334155" />
          <circle cx="24" cy="6" r="3" fill="#f59e0b" />
        </g>
      )
    };
  }
  if (q.includes('delhi') || q.includes('noida') || q.includes('gurgaon') || q.includes('gurugram')) {
    return {
      name: 'India Gate',
      badge: '🏛️ Delhi NCR',
      svg: (
        <g>
          <path d="M 8 28 L 14 28 L 14 6 L 8 6 Z" fill="#b45309" />
          <path d="M 34 28 L 40 28 L 40 6 L 34 6 Z" fill="#b45309" />
          <rect x="6" y="4" width="36" height="4" fill="#d97706" />
          <path d="M 14 28 L 14 16 Q 24 10 34 16 L 34 28 Z" fill="#0f172a" />
          <rect x="10" y="0" width="28" height="4" fill="#92400e" />
        </g>
      )
    };
  }
  if (q.includes('mumbai') || q.includes('bombay') || q.includes('thane')) {
    return {
      name: 'Gateway of India',
      badge: '🌊 Mumbai',
      svg: (
        <g>
          <rect x="6" y="10" width="36" height="18" fill="#475569" />
          <path d="M 18 28 L 18 16 Q 24 12 30 16 L 30 28 Z" fill="#0f172a" />
          <circle cx="24" cy="7" r="5" fill="#334155" />
          <rect x="4" y="6" width="6" height="22" fill="#334155" />
          <rect x="38" y="6" width="6" height="22" fill="#334155" />
        </g>
      )
    };
  }
  if (q.includes('chennai') || q.includes('madras')) {
    return {
      name: 'Central Station',
      badge: '🏛️ Chennai',
      svg: (
        <g>
          <rect x="6" y="16" width="36" height="12" fill="#dc2626" opacity="0.8" />
          <rect x="20" y="2" width="8" height="26" fill="#991b1b" />
          <circle cx="24" cy="8" r="2.5" fill="#f8fafc" stroke="#0f172a" strokeWidth="0.8" />
          <polygon points="20,2 24,-2 28,2" fill="#450a0a" />
        </g>
      )
    };
  }
  if (q.includes('kolkata') || q.includes('calcutta')) {
    return {
      name: 'Howrah Bridge',
      badge: '🌉 Kolkata',
      svg: (
        <g>
          <path d="M 4 28 L 12 6 L 16 6 L 24 16 L 32 6 L 36 6 L 44 28 Z" fill="none" stroke="#475569" strokeWidth="2.5" />
          <line x1="4" y1="28" x2="44" y2="28" stroke="#0f172a" strokeWidth="3" />
        </g>
      )
    };
  }
  if (q.includes('jaipur')) {
    return {
      name: 'Hawa Mahal',
      badge: '🏰 Jaipur',
      svg: (
        <g>
          <polygon points="24,2 6,28 42,28" fill="#f43f5e" opacity="0.85" />
          <circle cx="24" cy="8" r="2" fill="#fff1f2" />
          <circle cx="18" cy="16" r="2" fill="#fff1f2" />
          <circle cx="30" cy="16" r="2" fill="#fff1f2" />
          <circle cx="12" cy="24" r="2" fill="#fff1f2" />
          <circle cx="24" cy="24" r="2" fill="#fff1f2" />
          <circle cx="36" cy="24" r="2" fill="#fff1f2" />
        </g>
      )
    };
  }
  if (q.includes('pune')) {
    return {
      name: 'Shaniwar Wada',
      badge: '🛡️ Pune',
      svg: (
        <g>
          <rect x="6" y="10" width="10" height="18" fill="#52525b" />
          <rect x="32" y="10" width="10" height="18" fill="#52525b" />
          <rect x="14" y="16" width="20" height="12" fill="#3f3f46" />
          <path d="M 20 28 L 20 20 Q 24 18 28 20 L 28 28 Z" fill="#18181b" />
        </g>
      )
    };
  }
  return {
    name: `${cityName || 'City'} Hub`,
    badge: `🏙️ ${cityName || 'Metropolis'}`,
    svg: (
      <g className="fill-slate-600">
        <rect x="8" y="10" width="9" height="18" fill="#64748b" rx="1" />
        <rect x="20" y="4" width="10" height="24" fill="#475569" rx="1" />
        <rect x="33" y="12" width="8" height="16" fill="#64748b" rx="1" />
        <line x1="25" y1="0" x2="25" y2="4" stroke="#0f172a" strokeWidth="1.5" />
      </g>
    )
  };
}

export function RoutePreviewMap({
  origin,
  destination,
  modeOfTransport = 'train',
  fetchRouteGeometry,
  onDistanceFetched
}: RoutePreviewMapProps) {
  const { error: loaderError, isLoaded } = useMMILoader();
  const mapRef = useRef<HTMLDivElement>(null);
  const fetchRouteGeometryRef = useRef(fetchRouteGeometry);
  const onDistanceFetchedRef = useRef(onDistanceFetched);
  const [routeStats, setRouteStats] = useState<{ distanceKm: number; durationHours: number } | null>(null);

  const fallbackStats = useMemo(
    () => computeEstimatedStats(origin.coords, destination.coords),
    [origin.coords, destination.coords]
  );

  const activeStats = routeStats || fallbackStats;

  useEffect(() => {
    fetchRouteGeometryRef.current = fetchRouteGeometry;
    onDistanceFetchedRef.current = onDistanceFetched;
  }, [fetchRouteGeometry, onDistanceFetched]);

  useEffect(() => {
    if (origin.coords && destination.coords) {
      const [originLng, originLat] = origin.coords;
      const [destLng, destLat] = destination.coords;
      fetchRouteGeometryRef.current({ originLng, originLat, destLng, destLat })
        .then(({ distanceKm, durationHours }) => {
          setRouteStats({ distanceKm, durationHours });
          onDistanceFetchedRef.current?.(distanceKm, durationHours);
        })
        .catch(() => {
          onDistanceFetchedRef.current?.(fallbackStats.distanceKm, fallbackStats.durationHours);
        });
    }
  }, [origin.coords, destination.coords, fallbackStats.distanceKm, fallbackStats.durationHours]);

  const normalizedMode = (modeOfTransport || 'train').toLowerCase();

  const originLandmark = useMemo(() => getCityLandmark(origin.city), [origin.city]);
  const destLandmark = useMemo(() => getCityLandmark(destination.city), [destination.city]);

  const modeData = useMemo(() => {
    switch (normalizedMode) {
      case 'flight':
        return {
          mode: 'flight',
          title: 'Direct Jet Airway',
          speed: '840 km/h Airspeed',
          badge: 'Skyway Flight',
          accentBg: 'bg-sky-50',
          accentText: 'text-sky-700',
          accentBorder: 'border-sky-200',
          originLabel: 'ORIGIN AIRPORT',
          destLabel: 'DEST AIRPORT',
          tagline: 'High-altitude airway with non-stop aerial transit'
        };
      case 'car':
        return {
          mode: 'car',
          title: 'National Highway (NH-44)',
          speed: '110 km/h Express Drive',
          badge: 'Scenic Expressway',
          accentBg: 'bg-indigo-50',
          accentText: 'text-indigo-700',
          accentBorder: 'border-indigo-200',
          originLabel: 'PICKUP HUB',
          destLabel: 'DOORSTEP DROP',
          tagline: 'Lush roadside drive with non-stop highway transit'
        };
      case 'bus':
        return {
          mode: 'bus',
          title: 'Intercity AC Sleeper',
          speed: '80 km/h Highway Cruiser',
          badge: 'Intercity Trunk',
          accentBg: 'bg-amber-50',
          accentText: 'text-amber-700',
          accentBorder: 'border-amber-200',
          originLabel: 'BUS TERMINAL',
          destLabel: 'CITY HUB',
          tagline: 'Reliable trunk route connection across state highways'
        };
      case 'bike':
        return {
          mode: 'bike',
          title: 'Express City Relay',
          speed: '45 km/h Quick Courier',
          badge: 'Rapid Metro Relay',
          accentBg: 'bg-rose-50',
          accentText: 'text-rose-700',
          accentBorder: 'border-rose-200',
          originLabel: 'METRO HUB',
          destLabel: 'EXPRESS DROP',
          tagline: 'Agile point-to-point courier handoff through city corridors'
        };
      case 'train':
      default:
        return {
          mode: 'train',
          title: 'Vande Bharat High-Speed Rail',
          speed: '130 km/h Track Speed',
          badge: 'Electrified Rail',
          accentBg: 'bg-emerald-50',
          accentText: 'text-emerald-700',
          accentBorder: 'border-emerald-200',
          originLabel: 'RAIL JUNCTION',
          destLabel: 'CENTRAL TERMINAL',
          tagline: 'Dedicated electrified railway corridor with zero traffic'
        };
    }
  }, [normalizedMode]);

  const hasNativeMap = isLoaded && !loaderError && window.mappls;

  // Master Bezier corridor path definition
  const curveD = 'M 80 155 Q 300 30 520 155';

  return (
    <div className="group relative overflow-hidden rounded-3xl border border-zinc-200/90 bg-white shadow-xs transition-all duration-300">
      {hasNativeMap ? (
        <div ref={mapRef} className="h-64 w-full" />
      ) : (
        <div className="relative overflow-hidden bg-white">
          {/* ── HEADER STRIP ── */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 bg-zinc-50/80 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <div className={clsx('flex h-6 w-6 items-center justify-center rounded-lg border shadow-2xs', modeData.accentBg, modeData.accentBorder)}>
                {modeData.mode === 'train' && <Train className="h-3.5 w-3.5 text-emerald-600" />}
                {modeData.mode === 'flight' && <Plane className="h-3.5 w-3.5 text-sky-600" />}
                {modeData.mode === 'car' && <Car className="h-3.5 w-3.5 text-indigo-600" />}
                {modeData.mode === 'bus' && <Bus className="h-3.5 w-3.5 text-amber-600" />}
                {modeData.mode === 'bike' && <Bike className="h-3.5 w-3.5 text-rose-600" />}
              </div>
              <span className="text-xs font-bold text-zinc-900 tracking-tight">
                {origin.city || 'Origin'} <span className="text-zinc-400 font-normal">→</span> {destination.city || 'Destination'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className={clsx('rounded-full border px-2.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase', modeData.accentBg, modeData.accentText, modeData.accentBorder)}>
                {modeData.badge}
              </span>
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-mono font-medium text-zinc-600">
                {modeData.speed}
              </span>
            </div>
          </div>

          {/* ── LIVING GAME-STYLE CANVAS (ANIMATED GPU-ACCELERATED SVG) ── */}
          <div className="relative h-64 sm:h-72 w-full select-none overflow-hidden bg-gradient-to-b from-slate-50/70 via-white to-slate-50/50">
            {/* Ambient dot matrix grid */}
            <div
              className="absolute inset-0 opacity-25 pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(circle at 1px 1px, #cbd5e1 1px, transparent 0)',
                backgroundSize: '22px 22px'
              }}
            />

            {/* ═════════════════════════════════════════════════════════════════
                CITY SPECIAL LANDMARKS (Vidhana Soudha, Charminar, India Gate, etc.)
                ═════════════════════════════════════════════════════════════════ */}

            {/* Origin City Iconic Landmark (Left Anchor) */}
            <div className="absolute top-7 left-10 sm:left-14 flex flex-col items-center pointer-events-none z-10">
              <svg className="w-12 h-9 drop-shadow-xs" viewBox="0 0 48 32">
                {originLandmark.svg}
              </svg>
              <span className="mt-1 rounded-full border border-slate-200 bg-white/90 px-2 py-0.5 text-[9px] font-bold text-slate-700 shadow-2xs">
                {originLandmark.name}
              </span>
            </div>

            {/* Destination City Iconic Landmark (Right Anchor) */}
            <div className="absolute top-7 right-10 sm:right-14 flex flex-col items-center pointer-events-none z-10">
              <svg className="w-12 h-9 drop-shadow-xs" viewBox="0 0 48 32">
                {destLandmark.svg}
              </svg>
              <span className="mt-1 rounded-full border border-slate-200 bg-white/90 px-2 py-0.5 text-[9px] font-bold text-slate-700 shadow-2xs">
                {destLandmark.name}
              </span>
            </div>

            {/* ═════════════════════════════════════════════════════════════════
                DUAL-SIDED SCENERY WITH STRICT MODE-ISOLATED MICRO-DETAILS
                ═════════════════════════════════════════════════════════════════ */}
            <div className="absolute inset-0 pointer-events-none">
              {/* ── 🚆 TRAIN SCENERY: 3-ASPECT SIGNAL POST & CHAINAGE ── */}
                  {/* Indian Railways 3-Aspect Track Signal Post */}
                  <div className="hidden sm:flex absolute top-16 left-[28%] flex-col items-center z-10">
                    <div className="flex flex-col items-center rounded-sm bg-zinc-900 px-1 py-1 shadow-sm border border-zinc-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-950 mb-0.5" />
                      <span className="h-1.5 w-1.5 rounded-full bg-yellow-950 mb-0.5" />
                      <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
                    </div>
                    <div className="w-0.5 h-6 bg-zinc-600" />
                    <div className="rounded bg-zinc-200 px-1 py-0.2 text-[6px] font-mono font-bold text-zinc-800">
                      S-14
                    </div>
                  </div>

                  <div className="hidden sm:flex absolute top-16 right-[28%] flex-col items-center z-10">
                    <div className="flex flex-col items-center rounded-sm bg-zinc-900 px-1 py-1 shadow-sm border border-zinc-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-950 mb-0.5" />
                      <span className="h-1.5 w-1.5 rounded-full bg-yellow-950 mb-0.5" />
                      <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
                    </div>
                    <div className="w-0.5 h-6 bg-zinc-600" />
                  </div>

                  {/* Indian Railways Chainage Milestone Post */}
                  <div className="hidden md:flex absolute bottom-14 left-[35%] items-center gap-1 rounded bg-yellow-400 border border-zinc-900 px-1.5 py-0.5 text-[8px] font-black text-zinc-950 shadow-2xs">
                    KM 342/12
                  </div>

                  {/* Electrified Rail Corridor Badge */}
                  <div className="hidden md:flex absolute bottom-14 right-[35%] items-center gap-1 rounded bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 text-[8px] font-extrabold text-emerald-900 shadow-2xs">
                    ⚡ 25kV AC ELECTRIFIED
                  </div>

              {/* ── ✈️ FLIGHT SCENERY: ATC TOWER, SURVEILLANCE RADAR, HIGH-ALTITUDE CLOUDS & ATC FREQUENCY ── */}
              {modeData.mode === 'flight' && (
                <>
                  {/* Origin Air Traffic Control (ATC) Tower (Left Runway Approach) */}
                  <div className="absolute top-11 left-[155px] flex flex-col items-center z-10 drop-shadow-xs">
                    {/* Flashing Red Aviation Obstruction Beacon */}
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444] animate-ping mb-0.5" />
                    {/* Lightning / Comms Antenna Mast */}
                    <div className="w-0.5 h-3 bg-slate-600" />
                    {/* Glass Control Cab & Concrete Pylon */}
                    <svg className="w-8 h-12" viewBox="0 0 32 48">
                      {/* Glass Cab */}
                      <polygon points="4,8 28,8 24,18 8,18" fill="#0284c7" stroke="#0369a1" strokeWidth="1" />
                      <line x1="10" y1="8" x2="11" y2="18" stroke="#bae6fd" strokeWidth="0.8" />
                      <line x1="16" y1="8" x2="16" y2="18" stroke="#bae6fd" strokeWidth="0.8" />
                      <line x1="22" y1="8" x2="21" y2="18" stroke="#bae6fd" strokeWidth="0.8" />
                      {/* Walkway Railing Deck */}
                      <rect x="2" y="18" width="28" height="2.5" fill="#334155" rx="0.5" />
                      <line x1="3" y1="16.5" x2="29" y2="16.5" stroke="#64748b" strokeWidth="0.6" />
                      {/* Tapered Concrete Shaft */}
                      <polygon points="9,20.5 23,20.5 21,46 11,46" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1" />
                      {/* Base Facility */}
                      <rect x="6" y="44" width="20" height="4" fill="#64748b" rx="1" />
                    </svg>
                    <div className="rounded bg-sky-950 border border-sky-700 px-1 py-0.2 text-[6.5px] font-mono font-bold text-sky-300 shadow-2xs -mt-1">
                      ATC TWR
                    </div>
                  </div>

                  {/* Destination Primary Surveillance Radar (PSR) Station (Right Approach) */}
                  <div className="absolute top-11 right-[155px] flex flex-col items-center z-10 drop-shadow-xs">
                    {/* Rotating Radar Beacon Blip */}
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse mb-0.5" />
                    <svg className="w-8 h-12" viewBox="0 0 32 48">
                      {/* Parabolic Radar Dish */}
                      <path d="M 6 8 Q 16 1 26 8" stroke="#0f172a" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                      <line x1="16" y1="4.5" x2="16" y2="13" stroke="#475569" strokeWidth="1.5" />
                      {/* Lattice Radar Pylon */}
                      <polygon points="12,13 20,13 23,44 9,44" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1" />
                      <line x1="12" y1="20" x2="20" y2="28" stroke="#94a3b8" strokeWidth="0.8" />
                      <line x1="20" y1="20" x2="12" y2="28" stroke="#94a3b8" strokeWidth="0.8" />
                      <line x1="11" y1="28" x2="21" y2="36" stroke="#94a3b8" strokeWidth="0.8" />
                      <line x1="21" y1="28" x2="11" y2="36" stroke="#94a3b8" strokeWidth="0.8" />
                      {/* Base Station */}
                      <rect x="6" y="44" width="20" height="4" fill="#334155" rx="1" />
                    </svg>
                    <div className="rounded bg-zinc-900 border border-zinc-700 px-1 py-0.2 text-[6.5px] font-mono font-bold text-emerald-400 shadow-2xs -mt-1">
                      RADAR PSR
                    </div>
                  </div>

                  {/* High-Altitude V-Flock of Migrating Birds */}
                  <div className="absolute top-12 left-[32%] flex items-center gap-2 opacity-75 animate-[pulse_4s_ease-in-out_infinite]">
                    <svg className="w-4 h-3 text-slate-600 fill-slate-500" viewBox="0 0 16 12">
                      <path d="M 0 6 Q 4 0 8 6 Q 12 0 16 6 Q 12 4 8 8 Q 4 4 0 6 Z" />
                    </svg>
                    <svg className="w-3.5 h-2.5 text-slate-600 fill-slate-500 -mt-3" viewBox="0 0 16 12">
                      <path d="M 0 6 Q 4 0 8 6 Q 12 0 16 6 Q 12 4 8 8 Q 4 4 0 6 Z" />
                    </svg>
                    <svg className="w-3 h-2 text-slate-500 fill-slate-400 mt-2" viewBox="0 0 16 12">
                      <path d="M 0 6 Q 4 0 8 6 Q 12 0 16 6 Q 12 4 8 8 Q 4 4 0 6 Z" />
                    </svg>
                  </div>

                  <div className="absolute top-6 right-[30%] flex items-center gap-1.5 opacity-65 animate-[pulse_5s_ease-in-out_infinite]">
                    <svg className="w-3.5 h-2.5 text-slate-500 fill-slate-400" viewBox="0 0 16 12">
                      <path d="M 0 6 Q 4 0 8 6 Q 12 0 16 6 Q 12 4 8 8 Q 4 4 0 6 Z" />
                    </svg>
                    <svg className="w-3 h-2 text-slate-500 fill-slate-400 -mt-2" viewBox="0 0 16 12">
                      <path d="M 0 6 Q 4 0 8 6 Q 12 0 16 6 Q 12 4 8 8 Q 4 4 0 6 Z" />
                    </svg>
                  </div>

                  {/* Cirrus & Cumulus Clouds */}
                  <div className="absolute top-6 left-[22%] flex items-center opacity-70 animate-[pulse_4s_ease-in-out_infinite]">
                    <Cloud className="h-7 w-7 text-sky-200 fill-sky-100/90" />
                  </div>
                  <div className="absolute top-2 left-[48%] flex items-center opacity-80 animate-[pulse_5s_ease-in-out_infinite]">
                    <Cloud className="h-9 w-9 text-sky-200 fill-sky-100/90" />
                  </div>
                  <div className="absolute top-8 right-[22%] flex items-center opacity-70 animate-[pulse_4.5s_ease-in-out_infinite]">
                    <Cloud className="h-7 w-7 text-sky-200 fill-sky-100/90" />
                  </div>

                  {/* ATC VHF Radio Frequency & Transponder Squawk Callout */}
                  <div className="absolute bottom-14 left-[185px] flex items-center gap-1.5 rounded-full bg-sky-950/90 border border-sky-500/40 px-2.5 py-0.5 text-[8px] font-mono font-bold text-sky-300 shadow-md backdrop-blur-xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                    <span>ATC 118.1 MHz</span>
                    <span className="text-sky-500">|</span>
                    <span className="text-emerald-300">SQUAWK 4321</span>
                  </div>

                  {/* Airway Vector Corridor & Altitude Clearance Badge */}
                  <div className="absolute bottom-14 right-[185px] flex items-center gap-1.5 rounded-full bg-slate-900/90 border border-slate-700 px-2.5 py-0.5 text-[8px] font-mono font-bold text-slate-300 shadow-md">
                    <span className="text-sky-400">✈️ AIRWAY W20</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-amber-300">FL340 RADAR CONTACT</span>
                  </div>
                </>
              )}

              {/* ── 🚗 CAR SCENERY: FASTAG TOLL GANTRY & HIGHWAY TREES ── */}
              {modeData.mode === 'car' && (
                <>
                  <div className="absolute top-14 left-[180px] flex items-end gap-1 opacity-90">
                    <svg className="w-4 h-6 text-emerald-600 fill-emerald-500" viewBox="0 0 24 32">
                      <polygon points="12,2 4,14 8,14 3,22 9,22 9,28 15,28 15,22 21,22 16,14 20,14" />
                    </svg>
                    <svg className="w-5 h-7 text-teal-700 fill-teal-600" viewBox="0 0 24 32">
                      <circle cx="12" cy="11" r="7.5" />
                      <rect x="10.5" y="18" width="3" height="10" fill="#78350f" />
                    </svg>
                  </div>

                  <div className="absolute top-4 left-[285px] flex items-end gap-1 opacity-90">
                    <svg className="w-5 h-7 text-emerald-600 fill-emerald-500" viewBox="0 0 24 32">
                      <polygon points="12,2 4,14 8,14 3,22 9,22 9,28 15,28 15,22 21,22 16,14 20,14" />
                    </svg>
                  </div>

                  <div className="absolute top-14 right-[180px] flex items-end gap-1 opacity-90">
                    <svg className="w-5 h-7 text-teal-700 fill-teal-600" viewBox="0 0 24 32">
                      <circle cx="12" cy="11" r="7.5" />
                      <rect x="10.5" y="18" width="3" height="10" fill="#78350f" />
                    </svg>
                    <svg className="w-4 h-6 text-emerald-600 fill-emerald-500" viewBox="0 0 24 32">
                      <polygon points="12,2 4,14 8,14 3,22 9,22 9,28 15,28 15,22 21,22 16,14 20,14" />
                    </svg>
                  </div>

                  <div className="absolute bottom-12 left-[190px] flex items-end gap-1.5 opacity-90">
                    <svg className="w-5 h-7 text-emerald-600 fill-emerald-500" viewBox="0 0 24 32">
                      <polygon points="12,2 4,14 8,14 3,22 9,22 9,28 15,28 15,22 21,22 16,14 20,14" />
                    </svg>
                    <svg className="w-4 h-6 text-green-700 fill-green-600" viewBox="0 0 24 32">
                      <circle cx="12" cy="10" r="8" />
                      <rect x="10.5" y="18" width="3" height="10" fill="#78350f" />
                    </svg>
                  </div>

                  <div className="absolute bottom-6 left-[280px] flex items-end gap-2 opacity-90">
                    <svg className="w-4 h-6 text-emerald-700 fill-emerald-600" viewBox="0 0 24 32">
                      <polygon points="12,2 4,14 8,14 3,22 9,22 9,28 15,28 15,22 21,22 16,14 20,14" />
                    </svg>
                    <svg className="w-5 h-7 text-emerald-600 fill-emerald-500" viewBox="0 0 24 32">
                      <circle cx="12" cy="11" r="7.5" />
                      <rect x="10.5" y="18" width="3" height="10" fill="#78350f" />
                    </svg>
                  </div>

                  <div className="absolute bottom-12 right-[190px] flex items-end gap-1.5 opacity-90">
                    <svg className="w-4 h-6 text-green-700 fill-green-600" viewBox="0 0 24 32">
                      <circle cx="12" cy="10" r="8" />
                      <rect x="10.5" y="18" width="3" height="10" fill="#78350f" />
                    </svg>
                    <svg className="w-5 h-7 text-emerald-600 fill-emerald-500" viewBox="0 0 24 32">
                      <polygon points="12,2 4,14 8,14 3,22 9,22 9,28 15,28 15,22 21,22 16,14 20,14" />
                    </svg>
                  </div>

                  <div className="absolute bottom-14 left-[230px] rounded bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 text-[8px] font-extrabold text-emerald-900 shadow-2xs">
                    FASTag TOLL CLEAR
                  </div>
                  <div className="absolute bottom-14 right-[230px] rounded bg-amber-400 px-1 py-0.5 text-[8px] font-extrabold text-zinc-950 shadow-2xs">
                    NH-44 EXPRESSWAY
                  </div>
                </>
              )}

              {/* ── 🚌 BUS SCENERY: HIGHWAY DHABA BADGE ── */}
              {modeData.mode === 'bus' && (
                <>
                  <div className="absolute bottom-14 left-[240px] rounded bg-amber-100 border border-amber-300 px-1.5 py-0.5 text-[8px] font-bold text-amber-900 shadow-2xs">
                    ☕ 24x7 Highway Dhaba
                  </div>
                  <div className="absolute top-14 left-[200px] opacity-80">
                    <svg className="w-5 h-7 text-emerald-600 fill-emerald-500" viewBox="0 0 24 32">
                      <polygon points="12,2 4,14 8,14 3,22 9,22 9,28 15,28 15,22 21,22 16,14 20,14" />
                    </svg>
                  </div>
                  <div className="absolute top-14 right-[200px] opacity-80">
                    <svg className="w-5 h-7 text-emerald-600 fill-emerald-500" viewBox="0 0 24 32">
                      <polygon points="12,2 4,14 8,14 3,22 9,22 9,28 15,28 15,22 21,22 16,14 20,14" />
                    </svg>
                  </div>
                </>
              )}

              {/* ── 🛵 BIKE SCENERY: 5G METRO TOWER ── */}
              {modeData.mode === 'bike' && (
                <div className="absolute bottom-14 left-[250px] rounded bg-rose-100 border border-rose-300 px-1.5 py-0.5 text-[8px] font-bold text-rose-900 shadow-2xs">
                  📡 5G City Corridor Relay
                </div>
              )}
            </div>

            {/* ═════════════════════════════════════════════════════════════════
                PRIMARY SVG PATH & GPU-ACCELERATED ANIMATED VEHICLE SPRITES
                ═════════════════════════════════════════════════════════════════ */}
            <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 600 230">
              <defs>
                <path id="masterTransitPath" d={curveD} fill="none" />

                <linearGradient id="flightGradientV3" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#0284c7" stopOpacity="0.9" />
                  <stop offset="50%" stopColor="#38bdf8" stopOpacity="1" />
                  <stop offset="100%" stopColor="#0284c7" stopOpacity="0.9" />
                </linearGradient>

                <linearGradient id="vandeSilverGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#e2e8f0" />
                  <stop offset="40%" stopColor="#ffffff" />
                  <stop offset="100%" stopColor="#cbd5e1" />
                </linearGradient>

                <linearGradient id="carBodyGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#312e81" />
                  <stop offset="50%" stopColor="#4f46e5" />
                  <stop offset="100%" stopColor="#6366f1" />
                </linearGradient>
              </defs>

              {/* ── 1. TRAIN TRACK (Dual Rails & Ties) ── */}
              {modeData.mode === 'train' && (
                <g>
                  <path d={curveD} fill="none" stroke="#f1f5f9" strokeWidth="18" strokeLinecap="round" />
                  <path d={curveD} fill="none" stroke="#64748b" strokeWidth="14" strokeDasharray="2.5 11" strokeLinecap="butt" />
                  <path d={curveD} fill="none" stroke="#334155" strokeWidth="2" strokeLinecap="round" transform="translate(0, -4.5)" />
                  <path d={curveD} fill="none" stroke="#334155" strokeWidth="2" strokeLinecap="round" transform="translate(0, 4.5)" />
                  <path d={curveD} fill="none" stroke="#10b981" strokeWidth="1.5" strokeDasharray="6 20" className="animate-[dash_8s_linear_infinite]" />
                </g>
              )}

              {/* ── 2. FLIGHT SKYWAY ── */}
              {modeData.mode === 'flight' && (
                <g>
                  <path d={curveD} fill="none" stroke="#e0f2fe" strokeWidth="10" strokeLinecap="round" />
                  <path d={curveD} fill="none" stroke="url(#flightGradientV3)" strokeWidth="2.5" strokeDasharray="8 10" strokeLinecap="round" />
                </g>
              )}

              {/* ── 3. HIGHWAY ROAD ── */}
              {(modeData.mode === 'car' || modeData.mode === 'bus') && (
                <g>
                  <path d={curveD} fill="none" stroke="#1e293b" strokeWidth="18" strokeLinecap="round" />
                  <path d={curveD} fill="none" stroke="#fbbf24" strokeWidth="1" transform="translate(0, -7)" />
                  <path d={curveD} fill="none" stroke="#fbbf24" strokeWidth="1" transform="translate(0, 7)" />
                  <path d={curveD} fill="none" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="7 9" />
                </g>
              )}

              {/* ── 4. BIKE PATH ── */}
              {modeData.mode === 'bike' && (
                <g>
                  <path d={curveD} fill="none" stroke="#ffe4e6" strokeWidth="10" strokeLinecap="round" />
                  <path d={curveD} fill="none" stroke="#e11d48" strokeWidth="2.5" strokeDasharray="6 8" strokeLinecap="round" />
                </g>
              )}

              {/* ═════════════════════════════════════════════════════════════════
                  HIGH-PHYSICS VEHICLES GLIDING SMOOTHLY ALONG CORRIDOR
                  ═════════════════════════════════════════════════════════════════ */}

              {/* ── 🚆 ENGINEERING-GRADE HIGH-SPEED BULLET TRAIN (VANDE BHARAT) ── */}
              {modeData.mode === 'train' && (
                <g>
                  <animateMotion dur="5.5s" repeatCount="indefinite" rotate="auto">
                    <mpath href="#masterTransitPath" />
                  </animateMotion>

                  {/* High-Beam Headlight Projection */}
                  <polygon points="26,-3 58,-14 58,14 26,3" fill="rgba(254, 240, 138, 0.45)" />

                  {/* ── COACH 2 (Rear Coach) ── */}
                  <rect x="-68" y="-5.5" width="22" height="11" rx="2" fill="url(#vandeSilverGradient)" stroke="#0f172a" strokeWidth="1" />
                  <rect x="-67" y="-1" width="20" height="2" fill="#0284c7" />
                  <rect x="-65" y="-4" width="16" height="3" rx="0.5" fill="#0f172a" />
                  <circle cx="-62" cy="5.5" r="2" fill="#334155" />
                  <circle cx="-52" cy="5.5" r="2" fill="#334155" />

                  {/* Gangway Coupler 1 */}
                  <rect x="-46" y="-3" width="3" height="6" rx="0.5" fill="#1e293b" />

                  {/* ── COACH 1 (Middle Coach) ── */}
                  <rect x="-43" y="-5.5" width="22" height="11" rx="2" fill="url(#vandeSilverGradient)" stroke="#0f172a" strokeWidth="1" />
                  <rect x="-42" y="-1" width="20" height="2" fill="#0284c7" />
                  <rect x="-40" y="-4" width="16" height="3" rx="0.5" fill="#0f172a" />
                  <circle cx="-37" cy="5.5" r="2" fill="#334155" />
                  <circle cx="-27" cy="5.5" r="2" fill="#334155" />

                  {/* Gangway Coupler 2 */}
                  <rect x="-21" y="-3" width="3" height="6" rx="0.5" fill="#1e293b" />

                  {/* ── AERODYNAMIC LOCOMOTIVE BULLET NOSE ── */}
                  <path
                    d="M -18 -6 L 10 -6 Q 22 -6 26 -1 Q 28 0 26 1 Q 22 6 10 6 L -18 6 Z"
                    fill="url(#vandeSilverGradient)"
                    stroke="#0f172a"
                    strokeWidth="1.2"
                    filter="drop-shadow(0 3px 6px rgba(0,0,0,0.2))"
                  />
                  <path d="M -16 0.5 L 14 0.5 Q 20 0.5 24 1.5 L -16 1.5 Z" fill="#0284c7" />
                  <path d="M -16 2.5 L 14 2.5 Q 18 2.5 21 3.5 L -16 3.5 Z" fill="#ea580c" />
                  <path d="M 8 -4 L 18 -4 Q 22 -1 18 0 L 8 0 Z" fill="#0f172a" />
                  <polyline points="-10,-6 -6,-11 -2,-11 2,-6" fill="none" stroke="#059669" strokeWidth="1.2" strokeLinecap="round" />
                  <circle cx="-4" cy="-11" r="1" fill="#f59e0b" />
                  <circle cx="-12" cy="5.5" r="2" fill="#0f172a" />
                  <circle cx="-2" cy="5.5" r="2" fill="#0f172a" />
                  <circle cx="10" cy="5.5" r="2" fill="#0f172a" />
                  <circle cx="25" cy="-0.8" r="1.3" fill="#fef08a" />
                  <circle cx="25" cy="0.8" r="1.3" fill="#fef08a" />
                </g>
              )}

              {/* ── ✈️ TWIN-ENGINE COMMERCIAL AIRLINER ── */}
              {modeData.mode === 'flight' && (
                <g>
                  <animateMotion dur="5.5s" repeatCount="indefinite" rotate="auto">
                    <mpath href="#masterTransitPath" />
                  </animateMotion>
                  <line x1="-38" y1="-8" x2="-14" y2="-8" stroke="#bae6fd" strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />
                  <line x1="-38" y1="8" x2="-14" y2="8" stroke="#bae6fd" strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />
                  <path
                    d="M 2 0 L -8 -18 L -4 -18 L 8 -2 L 8 2 L -4 18 L -8 18 L 2 0 Z"
                    fill="#f8fafc"
                    stroke="#0284c7"
                    strokeWidth="1.2"
                    filter="drop-shadow(0 3px 6px rgba(2,132,199,0.25))"
                  />
                  <circle cx="-6" cy="-18" r="1.5" fill="#ef4444" />
                  <circle cx="-6" cy="18" r="1.5" fill="#22c55e" />
                  <rect x="-4" y="-10" width="8" height="4" rx="1.5" fill="#334155" stroke="#0284c7" strokeWidth="1" />
                  <rect x="-4" y="6" width="8" height="4" rx="1.5" fill="#334155" stroke="#0284c7" strokeWidth="1" />
                  <path
                    d="M -18 0 Q -18 -4 -8 -4 L 12 -4 Q 18 -3 20 0 Q 18 3 12 3 L -8 3 Q -18 4 -18 0 Z"
                    fill="#ffffff"
                    stroke="#0284c7"
                    strokeWidth="1.5"
                  />
                  <path d="M 12 -2.5 L 16 -1.5 Q 17 0 16 1.5 L 12 2.5 Z" fill="#0f172a" />
                  <polygon points="-16,-1 -20,-8 -17,-8 -13,-1" fill="#0284c7" />
                  <polygon points="-16,1 -20,8 -17,8 -13,1" fill="#0284c7" />
                </g>
              )}

              {/* ── 🚗 FASTBACK SEDAN ── */}
              {modeData.mode === 'car' && (
                <g>
                  <animateMotion dur="5.5s" repeatCount="indefinite" rotate="auto">
                    <mpath href="#masterTransitPath" />
                  </animateMotion>
                  <polygon points="16,-3 46,-9 46,9 16,3" fill="rgba(251, 191, 36, 0.4)" />
                  <path
                    d="M -16 4 L -16 -2 Q -16 -4 -10 -4 L -4 -4 L 3 -7 Q 5 -8 9 -7 L 14 -3 Q 18 -1 18 2 L 18 4 Z"
                    fill="url(#carBodyGradient)"
                    stroke="#1e1b4b"
                    strokeWidth="1.2"
                    filter="drop-shadow(0 2px 4px rgba(0,0,0,0.25))"
                  />
                  <path d="M -3 -3.5 L 3 -6.5 Q 5 -7 8 -6.5 L 12 -3.5 Z" fill="#0f172a" opacity="0.9" />
                  <circle cx="-9" cy="4.5" r="3" fill="#0f172a" />
                  <circle cx="-9" cy="4.5" r="1.5" fill="#94a3b8" />
                  <circle cx="11" cy="4.5" r="3" fill="#0f172a" />
                  <circle cx="11" cy="4.5" r="1.5" fill="#94a3b8" />
                  <circle cx="17" cy="0" r="1.2" fill="#fef08a" />
                  <rect x="-16" y="-2" width="1.5" height="3" fill="#ef4444" />
                </g>
              )}

              {/* ── 🚌 VOLVO SLEEPER BUS ── */}
              {modeData.mode === 'bus' && (
                <g>
                  <animateMotion dur="5.5s" repeatCount="indefinite" rotate="auto">
                    <mpath href="#masterTransitPath" />
                  </animateMotion>
                  <polygon points="18,-4 46,-10 46,10 18,4" fill="rgba(251, 191, 36, 0.35)" />
                  <rect x="-20" y="-7" width="36" height="13" rx="3.5" fill="#ffffff" stroke="#d97706" strokeWidth="1.5" filter="drop-shadow(0 2px 5px rgba(0,0,0,0.2))" />
                  <path d="M -18 1 L 6 1 L 10 3 L -18 3 Z" fill="#f59e0b" />
                  <rect x="-16" y="-5" width="28" height="4.5" rx="1" fill="#0f172a" />
                  <circle cx="-14" cy="6" r="2.5" fill="#0f172a" />
                  <circle cx="-8" cy="6" r="2.5" fill="#0f172a" />
                  <circle cx="9" cy="6" r="2.5" fill="#0f172a" />
                  <circle cx="16" cy="1" r="1.2" fill="#fef08a" />
                </g>
              )}

              {/* ── 🛵 COURIER BIKE ── */}
              {modeData.mode === 'bike' && (
                <g>
                  <animateMotion dur="5.5s" repeatCount="indefinite" rotate="auto">
                    <mpath href="#masterTransitPath" />
                  </animateMotion>
                  <circle cx="-8" cy="4" r="3.5" fill="#0f172a" />
                  <circle cx="-8" cy="4" r="1.5" fill="#ffffff" />
                  <circle cx="8" cy="4" r="3.5" fill="#0f172a" />
                  <circle cx="8" cy="4" r="1.5" fill="#ffffff" />
                  <polyline points="-8,4 0,4 4,-1 8,4" fill="none" stroke="#e11d48" strokeWidth="2" />
                  <circle cx="-1" cy="-7" r="2.5" fill="#0f172a" />
                  <path d="M -3 -4 L 1 -4 L 3 -1 L -1 2 Z" fill="#0284c7" />
                  <circle cx="9" cy="-1" r="1.2" fill="#fef08a" />
                </g>
              )}
            </svg>

            {/* ── ORIGIN STATION / AIRPORT / HUB ── */}
            <div className="absolute bottom-3 left-4 sm:left-6 flex flex-col items-center z-10">
              <div className={clsx('flex h-7 w-7 items-center justify-center rounded-full border-2 shadow-2xs', modeData.accentBg, modeData.accentBorder)}>
                <MapPin className={clsx('h-3.5 w-3.5', modeData.accentText)} />
              </div>
              <div className={clsx('mt-1.5 rounded-lg border px-2.5 py-0.5 text-center shadow-xs backdrop-blur-xs', modeData.accentBg, modeData.accentBorder)}>
                <p className={clsx('text-[8px] font-extrabold uppercase tracking-widest', modeData.accentText)}>
                  {modeData.originLabel}
                </p>
                <p className="text-xs font-bold text-zinc-950">{origin.city || 'Origin City'}</p>
              </div>
            </div>

            {/* ── DESTINATION STATION / AIRPORT / HUB ── */}
            <div className="absolute bottom-3 right-4 sm:right-6 flex flex-col items-center z-10">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-50 border-2 border-blue-300 shadow-2xs">
                <Navigation className="h-3.5 w-3.5 text-blue-700" />
              </div>
              <div className="mt-1.5 rounded-lg border border-blue-200 bg-blue-50/90 px-2.5 py-0.5 text-center shadow-xs backdrop-blur-xs">
                <p className="text-[8px] font-extrabold uppercase tracking-widest text-blue-700">
                  {modeData.destLabel}
                </p>
                <p className="text-xs font-bold text-zinc-950">{destination.city || 'Destination City'}</p>
              </div>
            </div>

            {/* ── CENTER DISTANCE & TELEMETRY CHIP ── */}
            <div className="absolute top-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full border border-zinc-200/90 bg-white/95 px-3 py-1 text-[11px] font-semibold text-zinc-800 shadow-xs backdrop-blur-xs z-20 whitespace-nowrap">
              <Sparkles className="h-3.5 w-3.5 text-amber-500 shrink-0" />
              <span className="font-bold text-zinc-950 tabular-nums">{Math.round(activeStats.distanceKm).toLocaleString('en-IN')} km</span>
              <span className="text-zinc-300">·</span>
              <span className="text-zinc-600 tabular-nums">~{activeStats.durationHours.toFixed(1)}h</span>
              <span className="text-zinc-300">·</span>
              <span className="font-medium text-zinc-600">{modeData.title.split(' ')[0]}</span>
            </div>
          </div>

          {/* ── FOOTER TRUST & SECURITY STRIP ── */}
          <div className="flex flex-wrap items-center justify-between border-t border-zinc-100 bg-zinc-50/80 px-4 py-2 text-xs text-zinc-500">
            <div className="flex items-center gap-2 font-medium">
              <Route className="h-3.5 w-3.5 text-zinc-400" />
              <span className="text-zinc-700">{modeData.tagline}</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                RBI ₹10 Serial Tamper-Sealed
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 text-zinc-600 text-[11px]">
                <Zap className="h-3.5 w-3.5 text-amber-500" />
                Sub-50ms Handoff Lock
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
