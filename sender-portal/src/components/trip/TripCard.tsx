import { Bike, Bus, Car, Clock3, Plane, ShieldCheck, Star, Train } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

const iconMap: Record<string, JSX.Element> = {
  bus: <Bus className="h-3.5 w-3.5" />,
  train: <Train className="h-3.5 w-3.5" />,
  car: <Car className="h-3.5 w-3.5" />,
  bike: <Bike className="h-3.5 w-3.5" />,
  flight: <Plane className="h-3.5 w-3.5" />,
  other: <Train className="h-3.5 w-3.5" />
};

interface TripCardProps {
  trip: any;
  actionLabel?: string;
  onAction?: () => void;
}

export function TripCard({ trip, actionLabel, onAction }: TripCardProps) {
  const originCity = trip.origin?.city || 'Origin';
  const destCity = trip.destination?.city || 'Destination';
  const departureLabel = trip.departureTime
    ? new Date(trip.departureTime).toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'Departure pending';
  const rating = trip.carrier?.rating?.average ? Number(trip.carrier.rating.average).toFixed(1) : '5.0';

  return (
    <Card className="flex flex-col justify-between gap-4 p-5" interactive>
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-zinc-950">{originCity}</span>
              <span className="text-zinc-400 font-normal">→</span>
              <span className="text-base font-bold tracking-tight text-zinc-950">{destCity}</span>
            </div>
            <p className="text-xs text-zinc-500 font-medium">{trip.carrier?.name || 'Verified Carrier'}</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-xs font-medium capitalize text-zinc-700">
            {iconMap[trip.modeOfTransport] || iconMap.other}
            {trip.modeOfTransport || 'Transit'}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Departure</p>
            <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-zinc-800 tabular-nums">
              <Clock3 className="h-3 w-3 text-zinc-500" />
              {departureLabel}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Rating</p>
            <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-zinc-800">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              {rating}
            </p>
          </div>
          <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Capacity</p>
            <p className="mt-1 text-xs font-semibold text-zinc-800 tabular-nums">
              {trip.availableCapacity?.weightKg || '-'} kg
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-zinc-100 pt-3">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Rate</span>
          <p className="text-base font-bold text-zinc-950 tabular-nums">
            ₹{trip.pricePerKg}
            <span className="ml-1 text-xs font-normal text-zinc-500">/ kg</span>
          </p>
        </div>
        {actionLabel && onAction ? (
          <Button size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
            <ShieldCheck className="h-3.5 w-3.5" />
            Verified Escrow
          </span>
        )}
      </div>
    </Card>
  );
}
