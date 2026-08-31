import { Match } from '../models/Match';

const AVAILABLE_JOB_STATUSES = [
  'proposed',
  'carrier_accepted',
  'sender_confirmed',
  'active',
  'pickup_pending',
  'picked_up',
  'in_transit',
  'delivery_pending'
] as const;

export async function listAvailableJobs(carrierId: string) {
  const matches = await Match.find({
    carrier: carrierId,
    status: { $in: AVAILABLE_JOB_STATUSES }
  })
    .sort({ createdAt: -1 })
    .populate('deliveryRequest')
    .populate('sender', 'name phone rating')
    .populate('trip')
    .lean();

  return matches.map((match: any) => {
    const payoutToCarrier = match.payoutToCarrier || 0;
    const totalCharge = match.agreedPrice || match.deliveryRequest?.totalCharge || 0;
    const packageWeightKg = match.deliveryRequest?.package?.weightKg || 0;
    const platformFee = Math.max(totalCharge - payoutToCarrier, 0);

    return {
      ...match,
      financials: {
        payoutToCarrier,
        totalCharge,
        platformFee,
        payoutPerKg: packageWeightKg > 0 ? Math.round(payoutToCarrier / packageWeightKg) : 0,
        packageWeightKg
      }
    };
  });
}
