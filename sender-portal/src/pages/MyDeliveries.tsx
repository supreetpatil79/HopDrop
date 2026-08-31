import { useQuery } from '@tanstack/react-query';
import { EmptyState, LoadingState, PageHeader } from 'hopdrop-shared';
import { Link } from 'react-router-dom';
import { deliveryApi } from '../api/delivery.api';
import { DeliveryCard } from '../components/delivery/DeliveryCard';
import { Button } from '../components/ui/Button';

export default function MyDeliveries() {
  const deliveriesQuery = useQuery({
    queryKey: ['myDeliveries'],
    queryFn: () => deliveryApi.getMyRequests().then((r) => r.data.data)
  });

  const requests = deliveriesQuery.data || [];

  if (deliveriesQuery.isLoading && !requests.length) {
    return <LoadingState title="Loading your deliveries" description="Fetching your active routes, parcel status, and latest handoff updates." />;
  }

  if (deliveriesQuery.isError && !requests.length) {
    return (
      <EmptyState
        title="We couldn't load your deliveries"
        description="Refresh the page to reconnect to your latest package requests."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Sender operations"
        title="My Deliveries"
        description="Monitor package status, recipient details, and charge visibility across every request you’ve posted."
        actions={
          <Link to="/send-package">
            <Button>New package request</Button>
          </Link>
        }
      />
      {requests.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {requests.map((request: any) => (
            <DeliveryCard key={request._id} request={request} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No delivery requests yet"
          description="Create your first package request to start matching against verified live trips."
          actions={
            <Link to="/send-package">
              <Button>Send a package</Button>
            </Link>
          }
        />
      )}
    </div>
  );
}
