import { useQuery } from '@tanstack/react-query';
import { tripApi } from '../api/trip.api';
import { TripCard } from '../components/trip/TripCard';
import { Card } from '../components/ui/Card';

export default function MyTrips() {
  const tripsQuery = useQuery({ queryKey: ['myTrips'], queryFn: () => tripApi.getMyTrips().then((r) => r.data.data) });

  const trips = tripsQuery.data || [];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">My Trips</h1>
      {trips.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {trips.map((trip: any) => (
            <TripCard key={trip._id} trip={trip} />
          ))}
        </div>
      ) : (
        <Card>
          <p className="text-sm text-text-muted">No trips found.</p>
        </Card>
      )}
    </div>
  );
}
