import { IDeliveryRequest } from '../models/DeliveryRequest';
import { ITrip } from '../models/Trip';

export function scoreTrip(trip: ITrip & { carrier: { rating?: { average?: number } } }, req: IDeliveryRequest): number {
  let score = 100;

  const hoursUntilDeparture = (new Date(trip.departureTime).getTime() - Date.now()) / 3600000;
  score -= Math.min(hoursUntilDeparture, 24);

  const carrierRating = trip.carrier?.rating?.average ?? 5;
  score += carrierRating * 5;

  const estimatedPrice = trip.pricePerKg * req.package.weightKg;
  score -= estimatedPrice / 1000;

  return score;
}
