import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRightLeft, Package2, Truck } from 'lucide-react';
import { EmptyState, LoadingState, PageHeader, StatCard } from 'hopdrop-shared';
import { Link } from 'react-router-dom';
import { deliveryApi } from '../api/delivery.api';
import { tripApi } from '../api/trip.api';
import { Button } from '../components/ui/Button';
import { DeliveryCard } from '../components/delivery/DeliveryCard';
import { TripCard } from '../components/trip/TripCard';
import { formatINRPaise } from '../utils/format';

export default function Dashboard() {
  const tripsQuery = useQuery({ queryKey: ['myTrips'], queryFn: () => tripApi.getMyTrips().then((r) => r.data.data) });
  const deliveriesQuery = useQuery({
    queryKey: ['myDeliveries'],
    queryFn: () => deliveryApi.getMyRequests().then((r) => r.data.data)
  });

  const trips = tripsQuery.data || [];
  const deliveries = deliveriesQuery.data || [];

  const earnings = useMemo(() => {
    const delivered = deliveries.filter((d: any) => d.status === 'delivered');
    const total = delivered.reduce((sum: number, item: any) => sum + (item.quotedPrice || 0), 0);
    return {
      week: Math.round(total * 0.2),
      month: Math.round(total * 0.6),
      allTime: total
    };
  }, [deliveries]);

  if (tripsQuery.isLoading && deliveriesQuery.isLoading && !trips.length && !deliveries.length) {
    return <LoadingState title="Loading your sender dashboard" description="Fetching your latest deliveries, trips, and account activity." />;
  }

  if ((tripsQuery.isError || deliveriesQuery.isError) && !trips.length && !deliveries.length) {
    return (
      <EmptyState
        title="We couldn't load your dashboard"
        description="Refresh the page to reconnect to your latest deliveries and travel activity."
      />
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Operational overview"
        title="Sender Dashboard"
        description="Track active deliveries, compare route availability, and keep your sender and traveler activity in one workspace."
        actions={
          <>
            <a href="/carrier/post-trip">
              <Button>Post a Trip</Button>
            </a>
            <Link to="/send-package">
              <Button variant="secondary">Send a Package</Button>
            </Link>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active requests" value={`${deliveries.length}`} description="Current requests posted from your sender account." icon={<Package2 className="h-5 w-5" />} />
        <StatCard label="Routes posted" value={`${trips.length}`} description="Trips you have also posted as a traveler." icon={<ArrowRightLeft className="h-5 w-5" />} />
        <StatCard label="This month" value={formatINRPaise(earnings.month)} description="Estimated value released across delivered packages." icon={<Truck className="h-5 w-5" />} />
        <StatCard label="All time" value={formatINRPaise(earnings.allTime)} description="Cumulative sender-side delivery value tracked." />
      </div>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="section-title">As sender</h2>
          <p className="section-copy">Active parcel requests, recipient coordination, and delivery status all stay visible here.</p>
        </div>
        {deliveries.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {deliveries.slice(0, 4).map((request: any) => (
              <DeliveryCard key={request._id} request={request} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No delivery requests yet"
            description="Start a new package request to begin matching against verified active trips."
            actions={
              <Link to="/send-package">
                <Button>Start a request</Button>
              </Link>
            }
          />
        )}
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <h2 className="section-title">As traveler</h2>
          <p className="section-copy">Trips you’ve posted can still be managed here without leaving the sender workspace.</p>
        </div>
        {trips.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {trips.slice(0, 4).map((trip: any) => (
              <TripCard key={trip._id} trip={trip} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No trips posted yet"
            description="Post a trip to unlock route-matched earning opportunities when you’re already traveling."
            actions={
              <a href="/carrier/post-trip">
                <Button variant="secondary">Post a trip</Button>
              </a>
            }
          />
        )}
      </section>
    </div>
  );
}
