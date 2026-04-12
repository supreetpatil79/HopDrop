export const PACKAGE_CATEGORIES = ['documents', 'clothing', 'electronics', 'food', 'medicine', 'fragile', 'other'] as const;

export const SENDER_STATUS_STAGES = [
  'REQUEST_SENT',
  'CARRIER_MATCHED',
  'PAYMENT_CONFIRMED',
  'PICKUP_SCHEDULED',
  'PICKED_UP',
  'IN_TRANSIT',
  'OUT_FOR_DELIVERY',
  'DELIVERED'
] as const;

export const CARRIER_STATUS_STAGES = [
  'TRIP_POSTED',
  'MATCH_RECEIVED',
  'MATCH_ACCEPTED',
  'PAYMENT_RECEIVED',
  'PICKUP_OTP_READY',
  'PACKAGE_COLLECTED',
  'TRAVELLING',
  'DELIVERY_OTP_READY',
  'DELIVERED_COMPLETE',
  'PAYOUT_DONE'
] as const;
