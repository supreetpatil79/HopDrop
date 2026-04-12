import { useEffect, useMemo, useState } from 'react';

export type MatchStatus =
  | 'proposed'
  | 'carrier_accepted'
  | 'sender_confirmed'
  | 'active'
  | 'pickup_pending'
  | 'picked_up'
  | 'in_transit'
  | 'delivery_pending'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'disputed';

export type DeliveryRequestStatus =
  | 'pending'
  | 'matched'
  | 'pickup_otp_sent'
  | 'picked_up'
  | 'in_transit'
  | 'delivery_otp_sent'
  | 'delivered'
  | 'cancelled'
  | 'expired';

export interface TimelineEntry {
  event: string;
  timestamp: string | Date;
  metadata?: {
    status?: string;
  };
}

export interface WorkflowStage {
  key: string;
  label: string;
  sublabel: string;
  icon: string;
  statuses: string[];
  events: string[];
}

type SocketLike = {
  emit: (event: string, payload?: unknown) => void;
  on: (event: string, listener: (payload: any) => void) => void;
  off: (event: string, listener?: (payload: any) => void) => void;
} | null;

type UseSocketHook = (matchId: string) => SocketLike;

export const MATCH_PENDING_STATUSES = ['proposed'] as const;
export const MATCH_ACTIVE_STATUSES = [
  'carrier_accepted',
  'sender_confirmed',
  'active',
  'pickup_pending',
  'picked_up',
  'in_transit',
  'delivery_pending'
] as const;
export const MATCH_COMPLETED_STATUSES = ['delivered', 'completed'] as const;
export const MATCH_LOCATION_TRACKING_STATUSES = ['picked_up', 'in_transit', 'delivery_pending', 'delivered'] as const;
export const DELIVERY_REQUEST_ACTIVE_STATUSES = [
  'matched',
  'pickup_otp_sent',
  'picked_up',
  'in_transit',
  'delivery_otp_sent',
  'delivered'
] as const;

export const MATCH_TIMELINE_STEPS = ['Matched', 'Payment Done', 'Pickup OTP', 'Picked Up', 'In Transit', 'Delivered'] as const;

export const MATCH_TIMELINE_STATUS_INDEX: Record<string, number> = {
  proposed: 0,
  carrier_accepted: 0,
  sender_confirmed: 1,
  active: 1,
  pickup_pending: 2,
  picked_up: 3,
  in_transit: 4,
  delivery_pending: 4,
  delivered: 5,
  completed: 5
};

export const DELIVERY_REQUEST_PROGRESS_BY_STATUS: Record<string, number> = {
  pending: 12,
  matched: 28,
  pickup_otp_sent: 44,
  picked_up: 62,
  in_transit: 78,
  delivery_otp_sent: 90,
  delivered: 100
};

export const CARRIER_STATUS_GUIDANCE: Record<string, string> = {
  proposed: 'Review the package request and accept it to open the sender confirmation step.',
  carrier_accepted: 'You accepted the request. The sender now needs to confirm and complete payment.',
  sender_confirmed: 'Sender confirmed. Once payment is marked active you can generate the pickup OTP.',
  active: 'Payment is secured. Generate the pickup OTP when you meet the sender.',
  pickup_pending: 'Pickup OTP is live. Keep this screen open and ask the sender to verify at handoff.',
  picked_up: 'Package is now in your care. Live tracking is broadcasting while you travel.',
  in_transit: 'Keep moving toward the destination. Generate the delivery OTP once you arrive.',
  delivery_pending: 'Delivery OTP is ready. Have the recipient verify it to complete the handoff.',
  delivered: 'Delivery is complete. Payout and review events will follow automatically.'
};

export const SENDER_DELIVERY_STAGES: WorkflowStage[] = [
  {
    key: 'REQUEST_SENT',
    label: 'Requested',
    sublabel: 'Package details submitted',
    icon: '📦',
    statuses: ['proposed'],
    events: ['match_proposed']
  },
  {
    key: 'CARRIER_MATCHED',
    label: 'Matched',
    sublabel: 'Carrier found for your route',
    icon: '🤝',
    statuses: ['carrier_accepted', 'sender_confirmed'],
    events: ['carrier_accepted', 'sender_confirmed']
  },
  {
    key: 'PAYMENT_CONFIRMED',
    label: 'Payment Done',
    sublabel: 'Funds secured in escrow',
    icon: '🔒',
    statuses: ['active', 'pickup_pending'],
    events: ['payment_done', 'pickup_otp_generated']
  },
  {
    key: 'PICKED_UP',
    label: 'Picked Up',
    sublabel: 'OTP verified at handoff',
    icon: '✅',
    statuses: ['picked_up'],
    events: ['pickup_verified']
  },
  {
    key: 'IN_TRANSIT',
    label: 'In Transit',
    sublabel: 'Carrier en route',
    icon: '🚂',
    statuses: ['in_transit', 'delivery_pending'],
    events: ['delivery_otp_generated']
  },
  {
    key: 'DELIVERED',
    label: 'Delivered',
    sublabel: 'Package delivered to recipient',
    icon: '🎉',
    statuses: ['delivered', 'completed'],
    events: ['delivery_verified', 'completed']
  }
];

export const CARRIER_TRIP_STAGES: WorkflowStage[] = [
  { key: 'TRIP_POSTED', label: 'Trip Live', sublabel: 'Your trip is visible to senders', icon: '🟢', statuses: [], events: [] },
  {
    key: 'MATCH_RECEIVED',
    label: 'Match Found',
    sublabel: 'A package is available on this route',
    icon: '📦',
    statuses: ['proposed'],
    events: ['match_proposed']
  },
  {
    key: 'MATCH_ACCEPTED',
    label: 'Accepted',
    sublabel: 'Waiting for sender confirmation',
    icon: '🤝',
    statuses: ['carrier_accepted', 'sender_confirmed'],
    events: ['carrier_accepted', 'sender_confirmed']
  },
  {
    key: 'PAYMENT_RECEIVED',
    label: 'Payment',
    sublabel: 'Escrow secured for this delivery',
    icon: '🔒',
    statuses: ['active'],
    events: ['payment_done']
  },
  {
    key: 'PICKUP_OTP_READY',
    label: 'Pickup OTP',
    sublabel: 'Show the OTP to collect the parcel',
    icon: '🔢',
    statuses: ['pickup_pending'],
    events: ['pickup_otp_generated']
  },
  {
    key: 'PACKAGE_COLLECTED',
    label: 'Collected',
    sublabel: 'Package is now in your care',
    icon: '✅',
    statuses: ['picked_up'],
    events: ['pickup_verified']
  },
  {
    key: 'TRAVELLING',
    label: 'Travelling',
    sublabel: 'En route to the destination city',
    icon: '🚂',
    statuses: ['in_transit'],
    events: []
  },
  {
    key: 'DELIVERY_OTP_READY',
    label: 'Delivery OTP',
    sublabel: 'Recipient handoff verification is ready',
    icon: '🔢',
    statuses: ['delivery_pending'],
    events: ['delivery_otp_generated']
  },
  {
    key: 'DELIVERED_COMPLETE',
    label: 'Delivered',
    sublabel: 'Package handed over successfully',
    icon: '🎉',
    statuses: ['delivered'],
    events: ['delivery_verified']
  },
  {
    key: 'PAYOUT_DONE',
    label: 'Payout',
    sublabel: 'Earnings released to your wallet',
    icon: '💸',
    statuses: ['completed'],
    events: ['completed']
  }
];

export function formatWorkflowStatus(status?: string) {
  if (!status) {
    return 'Awaiting updates';
  }

  return status
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function getDeliveryRequestProgressPercent(status?: string) {
  if (!status) {
    return 12;
  }

  return DELIVERY_REQUEST_PROGRESS_BY_STATUS[status] || 18;
}

export function getMatchTimelineIndex(status?: string) {
  return MATCH_TIMELINE_STATUS_INDEX[status || 'proposed'] ?? 0;
}

export function mapMatchStatusToSenderStage(status?: string) {
  const map: Record<string, string> = {
    pending: 'REQUEST_SENT',
    proposed: 'REQUEST_SENT',
    carrier_accepted: 'CARRIER_MATCHED',
    sender_confirmed: 'CARRIER_MATCHED',
    active: 'PAYMENT_CONFIRMED',
    pickup_pending: 'PAYMENT_CONFIRMED',
    picked_up: 'PICKED_UP',
    in_transit: 'IN_TRANSIT',
    delivery_pending: 'IN_TRANSIT',
    delivered: 'DELIVERED',
    completed: 'DELIVERED'
  };

  return map[status || ''] || 'REQUEST_SENT';
}

export function mapMatchStatusToCarrierStage(status?: string) {
  const map: Record<string, string> = {
    proposed: 'MATCH_RECEIVED',
    carrier_accepted: 'MATCH_ACCEPTED',
    sender_confirmed: 'MATCH_ACCEPTED',
    active: 'PAYMENT_RECEIVED',
    pickup_pending: 'PICKUP_OTP_READY',
    picked_up: 'PACKAGE_COLLECTED',
    in_transit: 'TRAVELLING',
    delivery_pending: 'DELIVERY_OTP_READY',
    delivered: 'DELIVERED_COMPLETE',
    completed: 'PAYOUT_DONE'
  };

  return map[status || ''] || 'TRIP_POSTED';
}

export function findTimelineEntry(stage: WorkflowStage, timeline: TimelineEntry[]) {
  return [...timeline].reverse().find((entry) => {
    const status = entry.metadata?.status;
    return (status ? stage.statuses.includes(status) : false) || stage.events.includes(entry.event);
  });
}

function renderStageTime(entry?: TimelineEntry) {
  if (!entry) {
    return null;
  }

  return new Date(entry.timestamp).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function MatchTimeline({ currentStatus }: { currentStatus?: string }) {
  const activeIndex = getMatchTimelineIndex(currentStatus);

  return (
    <div className="space-y-3">
      {MATCH_TIMELINE_STEPS.map((step, index) => (
        <div key={step} className="flex items-center gap-3">
          <span className={`h-3 w-3 rounded-full ${index <= activeIndex ? 'bg-primary' : 'bg-gray-300'}`} />
          <span className={`text-sm ${index <= activeIndex ? 'font-semibold text-dark' : 'text-text-muted'}`}>{step}</span>
        </div>
      ))}
    </div>
  );
}

export function createDeliveryStatusBar(useSocketHook: UseSocketHook) {
  return function DeliveryStatusBar({
    matchId,
    currentStatus,
    timeline
  }: {
    matchId: string;
    currentStatus: string;
    timeline: TimelineEntry[];
  }) {
    const socket = useSocketHook(matchId);
    const [liveStatus, setLiveStatus] = useState(currentStatus);

    useEffect(() => {
      setLiveStatus(currentStatus);
    }, [currentStatus]);

    useEffect(() => {
      if (!socket) {
        return;
      }

      socket.emit('join:match', { matchId });
      const onStatus = ({ status }: { status: string }) => setLiveStatus(status);
      socket.on('match:status_changed', onStatus);

      return () => {
        socket.off('match:status_changed', onStatus);
      };
    }, [socket, matchId]);

    const activeStageKey = useMemo(() => mapMatchStatusToSenderStage(liveStatus), [liveStatus]);
    const activeIndex = Math.max(SENDER_DELIVERY_STAGES.findIndex((stage) => stage.key === activeStageKey), 0);

    return (
      <div className="rounded-2xl border border-[#1e2130] bg-[#0f1117] p-6 font-sans">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Delivery Status</h3>
            <p className="text-xs text-white/40">Match #{matchId.slice(-8).toUpperCase()}</p>
          </div>
          <div
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              activeIndex >= SENDER_DELIVERY_STAGES.length - 1
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-sky-400 bg-sky-400/10 text-sky-400'
            }`}
          >
            {activeIndex >= SENDER_DELIVERY_STAGES.length - 1 ? 'Delivered' : 'In Progress'}
          </div>
        </div>

        <div className="relative">
          <div className="absolute left-[5%] right-[5%] top-5 h-0.5 bg-[#1e2130]">
            <div
              className="h-full bg-gradient-to-r from-primary to-sky-400 transition-all duration-700"
              style={{ width: `${(activeIndex / (SENDER_DELIVERY_STAGES.length - 1)) * 100}%` }}
            />
          </div>

          <div className="relative z-10 grid grid-cols-2 gap-4 sm:grid-cols-6">
            {SENDER_DELIVERY_STAGES.map((stage, index) => {
              const isDone = index < activeIndex;
              const isActive = index === activeIndex;
              const event = findTimelineEntry(stage, timeline);

              return (
                <div key={stage.key} className="flex flex-col items-center gap-2 text-center">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-full border-2 text-lg transition-all ${
                      isDone
                        ? 'border-primary bg-primary text-black'
                        : isActive
                          ? 'border-primary bg-primary/15 text-white shadow-[0_0_20px_rgba(0,200,83,0.35)]'
                          : 'border-[#2a2d35] bg-[#1a1d23] text-white/60'
                    }`}
                  >
                    {isDone ? '✓' : stage.icon}
                  </div>
                  <div className={`text-xs ${isDone ? 'text-primary' : isActive ? 'text-white' : 'text-white/50'}`}>{stage.label}</div>
                  {event ? <div className="text-[10px] text-white/35">{renderStageTime(event)}</div> : null}
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3">
          <div className="text-2xl">{SENDER_DELIVERY_STAGES[activeIndex]?.icon}</div>
          <div>
            <div className="text-sm font-semibold text-primary">{SENDER_DELIVERY_STAGES[activeIndex]?.label}</div>
            <div className="text-xs text-white/60">{SENDER_DELIVERY_STAGES[activeIndex]?.sublabel}</div>
          </div>
          <div className="ml-auto h-2 w-2 animate-pulse rounded-full bg-primary" />
        </div>
      </div>
    );
  };
}

export function createTripStatusBar(useSocketHook: UseSocketHook) {
  return function TripStatusBar({
    matchId,
    currentStatus,
    timeline = []
  }: {
    matchId: string;
    currentStatus: string;
    timeline?: TimelineEntry[];
  }) {
    const socket = useSocketHook(matchId);
    const [status, setStatus] = useState(currentStatus);

    useEffect(() => {
      setStatus(currentStatus);
    }, [currentStatus]);

    useEffect(() => {
      if (!socket) {
        return;
      }

      socket.emit('join:match', { matchId });
      const onStatus = ({ status: next }: { status: string }) => setStatus(next);
      socket.on('match:status_changed', onStatus);

      return () => {
        socket.off('match:status_changed', onStatus);
      };
    }, [socket, matchId]);

    const activeIndex = useMemo(
      () => CARRIER_TRIP_STAGES.findIndex((stage) => stage.key === mapMatchStatusToCarrierStage(status)),
      [status]
    );

    return (
      <div className="rounded-2xl border border-[#1e2130] bg-[#0f1117] p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Trip Progress</h3>
            <p className="text-xs text-white/40">Match #{matchId.slice(-6).toUpperCase()}</p>
          </div>
          <span
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              activeIndex >= CARRIER_TRIP_STAGES.length - 2
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-sky-400 bg-sky-400/10 text-sky-400'
            }`}
          >
            {activeIndex >= CARRIER_TRIP_STAGES.length - 2 ? 'Near Complete' : 'In Progress'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {CARRIER_TRIP_STAGES.map((stage, index) => {
            const isDone = index < activeIndex;
            const isActive = index === activeIndex;
            const event = findTimelineEntry(stage, timeline);

            return (
              <div
                key={stage.key}
                className={`rounded-xl border px-3 py-3 transition-all ${
                  isDone
                    ? 'border-primary/40 bg-primary/10'
                    : isActive
                      ? 'border-primary bg-[#141923] shadow-[0_0_20px_rgba(0,200,83,0.2)]'
                      : 'border-[#1e2130] bg-[#141923]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={isDone || isActive ? 'text-primary' : 'text-white/50'}>{isDone ? '✓' : stage.icon}</span>
                  <span className={`text-xs font-semibold ${isDone || isActive ? 'text-white' : 'text-white/45'}`}>{stage.label}</span>
                </div>
                <p className="mt-2 text-[11px] leading-4 text-white/45">{stage.sublabel}</p>
                {event ? <div className="mt-2 text-[10px] text-white/35">{renderStageTime(event)}</div> : null}
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3">
          <div className="text-2xl">{CARRIER_TRIP_STAGES[Math.max(activeIndex, 0)]?.icon}</div>
          <div>
            <div className="text-sm font-semibold text-primary">{CARRIER_TRIP_STAGES[Math.max(activeIndex, 0)]?.label}</div>
            <div className="text-xs text-white/60">{CARRIER_TRIP_STAGES[Math.max(activeIndex, 0)]?.sublabel}</div>
          </div>
          <div className="ml-auto h-2 w-2 animate-pulse rounded-full bg-primary" />
        </div>
      </div>
    );
  };
}
