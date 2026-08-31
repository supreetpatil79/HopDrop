import { formatWorkflowStatus } from 'hopdrop-shared';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';

interface DeliveryCardProps {
  request: any;
}

export function DeliveryCard({ request }: DeliveryCardProps) {
  const statusTone =
    request.status === 'delivered'
      ? 'success'
      : request.status === 'cancelled'
        ? 'danger'
        : request.status === 'pending'
          ? 'warning'
          : 'neutral';

  return (
    <Card className="space-y-4" interactive>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
            {request.origin?.city || 'Origin'} → {request.destination?.city || 'Destination'}
          </p>
          <h3 className="text-lg font-semibold tracking-[-0.03em] text-dark">{request.package?.description || 'Package request'}</h3>
          <p className="text-sm leading-6 text-text-muted">
            Recipient: {request.recipient?.name || 'Pending confirmation'} · {request.package?.category || 'Package'}
          </p>
        </div>
        <Badge tone={statusTone}>{formatWorkflowStatus(request.status || 'pending')}</Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-border/70 bg-slate-50/80 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">Package details</p>
          <p className="mt-2 text-sm font-medium text-dark">
            {request.package?.weightKg || '-'} kg · {request.package?.category || 'General'}
          </p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-slate-50/80 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">Current charge</p>
          <p className="mt-2 text-sm font-medium text-dark">
            {request.totalCharge ? `₹${(request.totalCharge / 100).toFixed(2)}` : 'Price pending'}
          </p>
        </div>
      </div>
    </Card>
  );
}
