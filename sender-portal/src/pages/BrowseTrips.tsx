import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { EmptyState, LoadingState, PageHeader } from 'hopdrop-shared';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { deliveryApi } from '../api/delivery.api';
import { tripApi } from '../api/trip.api';
import { Select } from '../components/ui/Select';
import { TripCard } from '../components/trip/TripCard';
import { Button } from '../components/ui/Button';

export default function BrowseTrips() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestId = searchParams.get('requestId') || '';
  const [sortBy, setSortBy] = useState<'price' | 'departure' | 'rating'>('price');
  const [cityFilter, setCityFilter] = useState('');

  const matchesQuery = useQuery({
    queryKey: ['deliveryMatches', requestId],
    queryFn: () => deliveryApi.getMatches(requestId).then((r) => r.data.data),
    enabled: Boolean(requestId),
    refetchInterval: (query) => {
      if (!requestId) {
        return false;
      }
      const currentMatches = (query.state.data as any[] | undefined) || [];
      return currentMatches.length ? 10000 : 2000;
    }
  });

  const publicTripsQuery = useQuery({
    queryKey: ['publicVerifiedTrips'],
    queryFn: () => tripApi.getTrips({ status: 'active' }).then((r) => r.data.data),
    enabled: !requestId,
    staleTime: 10000
  });

  const matches = matchesQuery.data || [];
  const publicTrips = publicTripsQuery.data || [];

  const displayedTrips = useMemo(() => {
    if (requestId) {
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
    }

    let filtered = [...publicTrips];
    if (cityFilter.trim()) {
      const q = cityFilter.trim().toLowerCase();
      filtered = filtered.filter(
        (t: any) =>
          t.origin?.city?.toLowerCase().includes(q) ||
          t.destination?.city?.toLowerCase().includes(q) ||
          t.carrier?.name?.toLowerCase().includes(q)
      );
    }

    if (sortBy === 'price') {
      return filtered.sort((a: any, b: any) => (a.pricePerKg || 0) - (b.pricePerKg || 0));
    }
    if (sortBy === 'departure') {
      return filtered.sort(
        (a: any, b: any) => new Date(a.departureTime || 0).getTime() - new Date(b.departureTime || 0).getTime()
      );
    }
    return filtered.sort((a: any, b: any) => (b.carrier?.rating?.average || 0) - (a.carrier?.rating?.average || 0));
  }, [requestId, matches, publicTrips, sortBy, cityFilter]);

  if (requestId && matchesQuery.isLoading && !matches.length) {
    return (
      <LoadingState
        title="Looking for matching trips"
        description="We’re scanning live verified routes and will refresh this board as carriers become available."
      />
    );
  }

  if (!requestId && publicTripsQuery.isLoading && !publicTrips.length) {
    return (
      <LoadingState
        title="Loading verified carrier corridors"
        description="Connecting to active transit routes across major Indian transit hubs."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={requestId ? 'Matching board' : 'Verified carrier network'}
        title={requestId ? 'Browse Matching Trips' : 'Active Carrier Corridors'}
        description={
          requestId
            ? 'Compare live verified routes for your package by price, departure time, and carrier trust signal.'
            : 'Explore scheduled carrier routes across India. Select any corridor to instantly send a package with a verified traveller.'
        }
        actions={
          <Button onClick={() => navigate('/send-package')}>
            {requestId ? 'Edit Package Request' : 'Post New Package'}
          </Button>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-border/80 bg-white/85 p-4 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.45)]">
        {!requestId ? (
          <div className="flex flex-1 items-center gap-2">
            <input
              type="text"
              placeholder="Search by city (e.g. Bengaluru, Mumbai, Delhi)..."
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="w-full max-w-sm rounded-xl border border-border/70 bg-slate-50 px-3.5 py-2 text-sm text-dark placeholder:text-text-muted focus:border-primary focus:outline-none"
            />
          </div>
        ) : (
          <p className="text-sm leading-6 text-text-muted">
            Results refresh automatically while the backend keeps matching your request against active routes.
          </p>
        )}
        <div className="w-52">
          <Select label="Sort trips" value={sortBy} onChange={(e) => setSortBy(e.target.value as any)}>
            <option value="price">Sort by Price</option>
            <option value="departure">Sort by Departure</option>
            <option value="rating">Sort by Rating</option>
          </Select>
        </div>
      </div>

      {displayedTrips.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {displayedTrips.map((item: any) => {
            if (requestId) {
              return (
                <TripCard
                  key={item._id}
                  trip={{ ...item.trip, carrier: item.carrier, modeOfTransport: item.trip?.modeOfTransport }}
                  actionLabel="Request Carrier"
                  onAction={() => navigate(`/matches/${item._id}`)}
                />
              );
            }

            return (
              <TripCard
                key={item._id}
                trip={item}
                actionLabel="Send with Carrier"
                onAction={() =>
                  navigate(
                    `/send-package?originCity=${encodeURIComponent(item.origin?.city || '')}&destinationCity=${encodeURIComponent(item.destination?.city || '')}`
                  )
                }
              />
            );
          })}
        </div>
      ) : (
        <EmptyState
          title={
            requestId
              ? matchesQuery.isFetching
                ? 'Refreshing live carrier matches'
                : "We're still looking for carriers"
              : 'No active carrier corridors found'
          }
          description={
            requestId
              ? 'Matching is running in the background. This board updates automatically as soon as a carrier is available.'
              : 'Try searching for a different city or post your package request directly.'
          }
          actions={
            <Button onClick={() => navigate('/send-package')}>
              {requestId ? 'View Deliveries' : 'Post Package Request'}
            </Button>
          }
        />
      )}
    </div>
  );
}
