import { IDeliveryRequest } from '../models/DeliveryRequest';
import { ITrip } from '../models/Trip';

export function calculateQuote(trip: ITrip, req: IDeliveryRequest) {
  const basePrice = trip.pricePerKg * req.package.weightKg * 100;
  const fragileExtra = req.package.isFragile ? basePrice * 0.2 : 0;
  const urgencyExtra = 0;
  const carrierEarning = Math.round(basePrice + fragileExtra + urgencyExtra);

  const platformFeeRate = 0.12;
  const platformFee = Math.round(carrierEarning * platformFeeRate);
  const totalCharge = carrierEarning + platformFee;

  const safetyDepositAmount = Math.min(Math.round(req.package.declaredValue! * 0.1) || 50000, 500000);

  return {
    carrierEarning,
    platformFee,
    totalCharge,
    safetyDepositAmount,
    breakdown: {
      basePrice,
      fragileExtra,
      weightKg: req.package.weightKg,
      pricePerKg: trip.pricePerKg
    }
  };
}
