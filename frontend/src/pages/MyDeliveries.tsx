import { useQuery } from '@tanstack/react-query';
import { deliveryApi } from '../api/delivery.api';
import { DeliveryCard } from '../components/delivery/DeliveryCard';
import { Card } from '../components/ui/Card';

export default function MyDeliveries() {
  const deliveriesQuery = useQuery({
    queryKey: ['myDeliveries'],
    queryFn: () => deliveryApi.getMyRequests().then((r) => r.data.data)
  });

  const requests = deliveriesQuery.data || [];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">My Deliveries</h1>
      {requests.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          {requests.map((request: any) => (
            <DeliveryCard key={request._id} request={request} />
          ))}
        </div>
      ) : (
        <Card>
          <p className="text-sm text-text-muted">No delivery requests yet.</p>
        </Card>
      )}
    </div>
  );
}
