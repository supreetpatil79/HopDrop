export const DOMAIN_TOPICS = {
  trip: 'trip.lifecycle',
  delivery: 'delivery.lifecycle',
  match: 'match.lifecycle',
  payment: 'payment.lifecycle',
  notification: 'notification.dispatch',
  realtime: 'realtime.dispatch'
} as const;

export const TRIP_EVENT_TYPES = {
  posted: 'TripPosted',
  updated: 'TripUpdated',
  cancelled: 'TripCancelled'
} as const;

export const DELIVERY_EVENT_TYPES = {
  requested: 'DeliveryRequested',
  updated: 'DeliveryUpdated',
  cancelled: 'DeliveryCancelled',
  paid: 'DeliveryPaid'
} as const;

export const MATCH_STATUS_EVENT_TYPES: Record<string, string> = {
  proposed: 'MatchProposed',
  carrier_accepted: 'CarrierAccepted',
  sender_confirmed: 'SenderConfirmed',
  active: 'MatchActivated',
  pickup_pending: 'PickupOtpGenerated',
  picked_up: 'PickupVerified',
  in_transit: 'TransitStarted',
  delivery_pending: 'DeliveryOtpGenerated',
  delivered: 'DeliveryCompleted',
  completed: 'PayoutCompleted',
  cancelled: 'MatchCancelled',
  disputed: 'MatchDisputed'
};

export function getMatchStatusEventType(status: string) {
  return MATCH_STATUS_EVENT_TYPES[status] || 'MatchUpdated';
}
