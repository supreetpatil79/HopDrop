import { Clock, Star, Train, Bus, Car, Bike, Plane } from 'lucide-react';
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
  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-text-muted">
            {trip.origin?.city} → {trip.destination?.city}
          </p>
          <h3 className="text-lg font-semibold text-dark">{trip.carrier?.name || 'Carrier'}</h3>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-dark px-2 py-1 text-xs text-white">
          {iconMap[trip.modeOfTransport] || iconMap.other}
          {trip.modeOfTransport}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm text-text-muted">
        <span className="inline-flex items-center gap-1">
          <Clock className="h-4 w-4" />
          {new Date(trip.departureTime).toLocaleString()}
        </span>
        <span className="inline-flex items-center gap-1">
          <Star className="h-4 w-4 text-yellow-500" />
          {trip.carrier?.rating?.average?.toFixed?.(1) || '5.0'}
        </span>
        <span>{trip.availableCapacity?.weightKg}kg capacity</span>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm">
          <span className="font-semibold">₹{trip.pricePerKg}</span>
          <span className="text-text-muted"> / kg</span>
        </p>
        {actionLabel && onAction ? <Button onClick={onAction}>{actionLabel}</Button> : null}
      </div>
    </Card>
  );
}
