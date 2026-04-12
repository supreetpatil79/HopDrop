import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { deliveryApi } from '../api/delivery.api';
import { Card } from '../components/ui/Card';
import { Select } from '../components/ui/Select';
import { TripCard } from '../components/trip/TripCard';

export default function BrowseTrips() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestId = searchParams.get('requestId') || '';
  const [sortBy, setSortBy] = useState<'price' | 'departure' | 'rating'>('price');

  const matchesQuery = useQuery({
    queryKey: ['deliveryMatches', requestId],
    queryFn: () => deliveryApi.getMatches(requestId).then((r) => r.data.data),
    enabled: Boolean(requestId)
  });

  const matches = matchesQuery.data || [];

  const sorted = useMemo(() => {
    const copy = [...matches];

    if (sortBy === 'price') {
      return copy.sort((a: any, b: any) => (a.agreedPrice || 0) - (b.agreedPrice || 0));
    }

    if (sortBy === 'departure') {
      return copy.sort(
        (a: any, b: any) =>
          new Date(a.trip?.departureTime || 0).getTime() - new Date(b.trip?.departureTime || 0).getTime()
      );
    }

    return copy.sort((a: any, b: any) => (b.carrier?.rating?.average || 0) - (a.carrier?.rating?.average || 0));
  }, [matches, sortBy]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Browse Matching Trips</h1>
        <div className="w-48">
          <Select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
            <option value="price">Sort by Price</option>
            <option value="departure">Sort by Departure</option>
            <option value="rating">Sort by Rating</option>
          </Select>
        </div>
      </div>

      {sorted.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {sorted.map((match: any) => (
            <TripCard
              key={match._id}
              trip={{ ...match.trip, carrier: match.carrier, modeOfTransport: match.trip?.modeOfTransport }}
              actionLabel="Request Carrier"
              onAction={() => navigate(`/matches/${match._id}`)}
            />
          ))}
        </div>
      ) : (
        <Card>
          <p className="font-semibold">We're looking for carriers.</p>
          <p className="text-sm text-text-muted">We'll notify you when one is available on your route.</p>
        </Card>
      )}
    </div>
  );
}
