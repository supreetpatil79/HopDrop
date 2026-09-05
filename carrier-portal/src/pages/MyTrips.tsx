import { useQuery } from '@tanstack/react-query';
import { tripApi } from '../api/trip.api';
import { TripCard } from '../components/trip/TripCard';
import { Card } from '../components/ui/Card';

export default function MyTrips() {
  const tripsQuery = useQuery({
    queryKey: ['myTrips'],
    queryFn: async () => {
      try {
        const r = await tripApi.getMyTrips();
        return r.data.data;
      } catch {
        return [];
      }
    }
  });

  const localTrips = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('hopdrop:carrier:local_trips') || '[]') : [];
  const remoteTrips = Array.isArray(tripsQuery.data) ? tripsQuery.data : [];
  const trips = [...localTrips, ...remoteTrips.filter((rt: any) => !localTrips.some((lt: any) => lt._id === rt._id))];

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
