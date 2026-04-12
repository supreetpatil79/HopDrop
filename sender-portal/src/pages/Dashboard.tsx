import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { deliveryApi } from '../api/delivery.api';
import { tripApi } from '../api/trip.api';
import { Card } from '../components/ui/Card';
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

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-2">
        <Card className="space-y-2">
          <h2 className="text-xl font-bold">Quick Actions</h2>
          <div className="flex flex-wrap gap-2">
            <a href="/carrier/post-trip">
              <Button>Post a Trip</Button>
            </a>
            <Link to="/send-package">
              <Button variant="secondary">Send a Package</Button>
            </Link>
          </div>
        </Card>

        <Card className="grid gap-2 md:grid-cols-3">
          <div>
            <p className="text-xs text-text-muted">This Week</p>
            <p className="font-bold text-dark">{formatINRPaise(earnings.week)}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted">This Month</p>
            <p className="font-bold text-dark">{formatINRPaise(earnings.month)}</p>
          </div>
          <div>
            <p className="text-xs text-text-muted">All Time</p>
            <p className="font-bold text-dark">{formatINRPaise(earnings.allTime)}</p>
          </div>
        </Card>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">As Sender</h2>
        {deliveries.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {deliveries.slice(0, 4).map((request: any) => (
              <DeliveryCard key={request._id} request={request} />
            ))}
          </div>
        ) : (
          <Card>
            <p className="text-sm text-text-muted">No delivery requests yet.</p>
          </Card>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">As Carrier</h2>
        {trips.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {trips.slice(0, 4).map((trip: any) => (
              <TripCard key={trip._id} trip={trip} />
            ))}
          </div>
        ) : (
          <Card>
            <p className="text-sm text-text-muted">No trips posted yet.</p>
          </Card>
        )}
      </section>
    </div>
  );
}
