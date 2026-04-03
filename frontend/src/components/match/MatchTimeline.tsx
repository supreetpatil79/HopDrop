const steps = ['Matched', 'Payment Done', 'Pickup OTP', 'Picked Up', 'In Transit', 'Delivered'];

interface MatchTimelineProps {
  currentStatus?: string;
}

const statusIndexMap: Record<string, number> = {
  proposed: 0,
  carrier_accepted: 0,
  sender_confirmed: 1,
  active: 1,
  pickup_pending: 2,
  picked_up: 3,
  in_transit: 4,
  delivery_pending: 4,
  delivered: 5
};

export function MatchTimeline({ currentStatus }: MatchTimelineProps) {
  const activeIndex = statusIndexMap[currentStatus || 'proposed'] ?? 0;

  return (
    <div className="space-y-3">
      {steps.map((step, index) => (
        <div key={step} className="flex items-center gap-3">
          <span
            className={`h-3 w-3 rounded-full ${
              index <= activeIndex ? 'bg-primary' : 'bg-gray-300'
            }`}
          />
          <span className={`text-sm ${index <= activeIndex ? 'text-dark font-semibold' : 'text-text-muted'}`}>{step}</span>
        </div>
      ))}
    </div>
  );
}
