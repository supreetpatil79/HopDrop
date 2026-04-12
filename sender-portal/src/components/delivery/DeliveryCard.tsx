import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

interface DeliveryCardProps {
  request: any;
}

export function DeliveryCard({ request }: DeliveryCardProps) {
  return (
    <Card className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-dark">{request.package?.description}</h3>
        <Badge tone={request.status === 'delivered' ? 'success' : 'neutral'}>{request.status}</Badge>
      </div>
      <p className="text-sm text-text-muted">
        {request.origin?.city} → {request.destination?.city}
      </p>
      <p className="text-sm text-text-muted">{request.package?.weightKg}kg · {request.package?.category}</p>
      <p className="text-sm font-semibold text-dark">
        {request.totalCharge ? `₹${(request.totalCharge / 100).toFixed(2)}` : 'Price pending'}
      </p>
    </Card>
  );
}
