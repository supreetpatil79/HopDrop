import { Bike, Bus, Car, Clock3, Plane, ShieldCheck, Star, Train } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

const iconMap: Record<string, JSX.Element> = {
  bus: <Bus className="h-4 w-4" />,
  train: <Train className="h-4 w-4" />,
  car: <Car className="h-4 w-4" />,
  bike: <Bike className="h-4 w-4" />,
  flight: <Plane className="h-4 w-4" />,
  other: <Train className="h-4 w-4" />
};

interface TripCardProps {
  trip: any;
  actionLabel?: string;
  onAction?: () => void;
}

export function TripCard({ trip, actionLabel, onAction }: TripCardProps) {
  const routeLabel = `${trip.origin?.city || 'Origin'} → ${trip.destination?.city || 'Destination'}`;
  const departureLabel = trip.departureTime ? new Date(trip.departureTime).toLocaleString('en-IN') : 'Departure pending';
  const rating = trip.carrier?.rating?.average?.toFixed?.(1) || '5.0';

  return (
    <Card className="space-y-4" interactive>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">{routeLabel}</p>
          <h3 className="text-xl font-semibold tracking-[-0.03em] text-dark">
            {trip.transportDetails?.name || trip.carrier?.name || 'Active trip'}
          </h3>
          <p className="text-sm leading-6 text-text-muted">
            Keep this route live to receive verified package matches and maintain OTP-secured handoff visibility.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-slate-100 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-dark">
          {iconMap[trip.modeOfTransport] || iconMap.other}
          {trip.modeOfTransport || 'other'}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border/70 bg-slate-50/80 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">Departure</p>
          <p className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-dark">
            <Clock3 className="h-4 w-4 text-primary" />
            {departureLabel}
          </p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-slate-50/80 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">Route trust</p>
          <p className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-dark">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            {rating}
          </p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-slate-50/80 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">Capacity</p>
          <p className="mt-2 text-sm font-medium text-dark">{trip.availableCapacity?.weightKg || '-'} kg</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">Rate</p>
          <p className="mt-1 text-lg font-semibold tracking-[-0.02em] text-dark">
            ₹{trip.pricePerKg}
            <span className="ml-1 text-sm font-medium text-text-muted">/ kg</span>
          </p>
        </div>
        {actionLabel && onAction ? (
          <Button onClick={onAction}>{actionLabel}</Button>
        ) : (
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            <ShieldCheck className="h-4 w-4" />
            Match ready
          </span>
        )}
      </div>
    </Card>
  );
}
