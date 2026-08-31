import { DeliveryRequest, IDeliveryRequest } from '../models/DeliveryRequest';
import { Trip } from '../models/Trip';
import { env } from '../config/env';
import { calculateQuote } from '../utils/pricing';

export interface EstimatePricingInput {
  originCity: string;
  destinationCity: string;
  weightKg: number;
  category: 'documents' | 'clothing' | 'electronics' | 'food' | 'fragile' | 'medicine' | 'other';
  isFragile: boolean;
  declaredValue?: number;
}

export interface EstimateCarrierEarningsInput {
  originCity: string;
  destinationCity: string;
  capacityKg: number;
  categories: Array<'documents' | 'clothing' | 'electronics' | 'food' | 'fragile' | 'medicine' | 'other'>;
  pricePerKg?: number;
  modeOfTransport?: 'bus' | 'train' | 'car' | 'bike' | 'flight' | 'other';
  departureTime?: Date;
}

function createCityMatcher(city: string) {
  return new RegExp(`^${city.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
}

function roundToNearest(value: number, nearest: number) {
  return Math.max(nearest, Math.round(value / nearest) * nearest);
}

function median(values: number[]) {
  if (!values.length) {
    return null;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  return sorted.length % 2 === 0 ? Math.round((sorted[middle - 1] + sorted[middle]) / 2) : sorted[middle];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

const MODE_BASE_RATE_PER_KG: Record<NonNullable<EstimateCarrierEarningsInput['modeOfTransport']>, number> = {
  bike: 65,
  bus: 80,
  train: 90,
  car: 110,
  flight: 180,
  other: 95
};

function buildProjectionPackage(
  request: Partial<IDeliveryRequest>,
  fallback: {
    originCity: string;
    destinationCity: string;
    category: IDeliveryRequest['package']['category'];
    weightKg: number;
    departureTime?: Date;
  }
) {
  return {
    origin: request.origin || { city: fallback.originCity },
    destination: request.destination || { city: fallback.destinationCity },
    preferredDeliveryWindow: request.preferredDeliveryWindow || {
      earliest: new Date(),
      latest: fallback.departureTime || new Date(Date.now() + 36 * 60 * 60 * 1000)
    },
    package: {
      description: request.package?.description || 'Projected package',
      category: request.package?.category || fallback.category,
      weightKg: request.package?.weightKg || fallback.weightKg,
      isFragile: Boolean(request.package?.isFragile || fallback.category === 'fragile'),
      declaredValue: request.package?.declaredValue
    }
  } as IDeliveryRequest;
}

function projectTier(input: {
  label: string;
  ratePerKg: number;
  requests: IDeliveryRequest[];
  capacityKg: number;
  categories: EstimateCarrierEarningsInput['categories'];
  originCity: string;
  destinationCity: string;
  departureTime?: Date;
  utilizationFallback: number;
}) {
  let remainingCapacityKg = input.capacityKg;
  const selectedRequests: IDeliveryRequest[] = [];

  for (const request of input.requests) {
    const requestWeight = request.package.weightKg || 0;
    if (requestWeight <= remainingCapacityKg) {
      selectedRequests.push(request);
      remainingCapacityKg -= requestWeight;
    }
  }

  if (!selectedRequests.length) {
    const category = input.categories[0] || 'documents';
    const projectedWeightKg = clamp(input.capacityKg * input.utilizationFallback, 0.5, input.capacityKg);
    selectedRequests.push(
      buildProjectionPackage(
        {},
        {
          originCity: input.originCity,
          destinationCity: input.destinationCity,
          category,
          weightKg: Number(projectedWeightKg.toFixed(1)),
          departureTime: input.departureTime
        }
      )
    );
  }

  const trip = {
    pricePerKg: input.ratePerKg,
    modeOfTransport: 'other'
  } as any;

  const quotes = selectedRequests.map((request) => calculateQuote(trip, request));
  const occupiedWeightKg = selectedRequests.reduce((sum, request) => sum + (request.package.weightKg || 0), 0);
  const carrierPayout = quotes.reduce((sum, quote) => sum + quote.carrierEarning, 0);
  const platformFee = quotes.reduce((sum, quote) => sum + quote.platformFee, 0);
  const senderCharge = quotes.reduce((sum, quote) => sum + quote.totalCharge, 0);

  return {
    label: input.label,
    ratePerKg: input.ratePerKg,
    expectedPackages: selectedRequests.length,
    occupiedWeightKg: Number(occupiedWeightKg.toFixed(1)),
    carrierPayout,
    platformFee,
    senderCharge,
    payoutPerKg: occupiedWeightKg > 0 ? Math.round(carrierPayout / occupiedWeightKg) : 0
  };
}

export async function estimatePricing(input: EstimatePricingInput) {
  const matchingTrips = await Trip.find({
    'origin.city': createCityMatcher(input.originCity),
    'destination.city': createCityMatcher(input.destinationCity),
    status: 'active',
    safetyDepositPaid: true,
    'availableCapacity.weightKg': { $gte: input.weightKg },
    'availableCapacity.allowedCategories': input.category
  })
    .sort({ pricePerKg: 1, departureTime: 1 })
    .limit(10);

  const referenceTrip = matchingTrips[0];

  if (!referenceTrip) {
    return {
      carrierCount: 0,
      route: {
        originCity: input.originCity,
        destinationCity: input.destinationCity
      },
      estimate: null
    };
  }

  const quote = calculateQuote(referenceTrip, {
    package: {
      weightKg: input.weightKg,
      category: input.category,
      isFragile: input.isFragile,
      declaredValue: input.declaredValue
    }
  } as any);

  return {
    carrierCount: matchingTrips.length,
    route: {
      originCity: input.originCity,
      destinationCity: input.destinationCity
    },
    estimate: {
      ...quote,
      basedOnTripId: referenceTrip._id.toString(),
      pricePerKg: referenceTrip.pricePerKg
    }
  };
}

export async function estimateCarrierEarnings(input: EstimateCarrierEarningsInput) {
  const categories = Array.from(
    new Set((input.categories.length ? input.categories : ['documents']) as EstimateCarrierEarningsInput['categories'])
  ) as EstimateCarrierEarningsInput['categories'];
  const capacityKg = clamp(input.capacityKg, 0.5, 30);
  const modeOfTransport = input.modeOfTransport || 'other';

  const routeQuery = {
    'origin.city': createCityMatcher(input.originCity),
    'destination.city': createCityMatcher(input.destinationCity)
  };

  const requestQuery: Record<string, unknown> = {
    ...routeQuery,
    status: 'pending',
    paymentStatus: { $in: ['unpaid', 'paid'] },
    'package.weightKg': { $lte: capacityKg },
    'package.category': { $in: categories }
  };

  if (input.departureTime) {
    requestQuery['preferredDeliveryWindow.earliest'] = { $lte: input.departureTime };
    requestQuery['preferredDeliveryWindow.latest'] = { $gte: input.departureTime };
  }

  const [pendingRequests, competingTrips] = await Promise.all([
    DeliveryRequest.find(requestQuery).sort({ createdAt: -1 }).limit(25).lean(),
    Trip.find({
      ...routeQuery,
      status: 'active',
      safetyDepositPaid: true,
      'availableCapacity.weightKg': { $gte: 0.5 },
      'availableCapacity.allowedCategories': { $in: categories }
    })
      .sort({ departureTime: 1 })
      .limit(25)
      .lean()
  ]);

  const activeRates = competingTrips.map((trip) => trip.pricePerKg).filter((rate) => Number.isFinite(rate) && rate > 0);
  const medianRatePerKg = median(activeRates);
  const baseRate = medianRatePerKg || MODE_BASE_RATE_PER_KG[modeOfTransport];
  const pendingWeightKg = pendingRequests.reduce((sum, request) => sum + (request.package?.weightKg || 0), 0);
  const demandRatio = pendingWeightKg / capacityKg;
  const competitionPressure = competingTrips.length ? Math.min(competingTrips.length * 0.025, 0.18) : 0;
  const demandBoost = Math.min(pendingRequests.length * 0.035 + demandRatio * 0.08, 0.28);
  const categoryBoost = categories.some((category) => ['electronics', 'fragile', 'medicine'].includes(category)) ? 0.08 : 0;
  const recommendedRatePerKg = clamp(roundToNearest(baseRate * (1 + demandBoost + categoryBoost - competitionPressure), 10), 30, 500);
  const currentRatePerKg = input.pricePerKg ? clamp(input.pricePerKg, 20, 500) : recommendedRatePerKg;
  const utilizationFallback = pendingRequests.length ? clamp(demandRatio, 0.35, 1) : competingTrips.length ? 0.45 : 0.6;

  const typedRequests = pendingRequests as unknown as IDeliveryRequest[];
  const fastFill = projectTier({
    label: 'Fast fill',
    ratePerKg: clamp(roundToNearest(recommendedRatePerKg * 0.9, 10), 20, 500),
    requests: typedRequests,
    capacityKg,
    categories,
    originCity: input.originCity,
    destinationCity: input.destinationCity,
    departureTime: input.departureTime,
    utilizationFallback
  });
  const balanced = projectTier({
    label: 'Balanced',
    ratePerKg: recommendedRatePerKg,
    requests: typedRequests,
    capacityKg,
    categories,
    originCity: input.originCity,
    destinationCity: input.destinationCity,
    departureTime: input.departureTime,
    utilizationFallback
  });
  const premium = projectTier({
    label: 'Premium',
    ratePerKg: clamp(roundToNearest(recommendedRatePerKg * 1.18, 10), 20, 500),
    requests: typedRequests,
    capacityKg,
    categories,
    originCity: input.originCity,
    destinationCity: input.destinationCity,
    departureTime: input.departureTime,
    utilizationFallback: Math.max(utilizationFallback - 0.15, 0.25)
  });
  const current = projectTier({
    label: 'Your rate',
    ratePerKg: currentRatePerKg,
    requests: typedRequests,
    capacityKg,
    categories,
    originCity: input.originCity,
    destinationCity: input.destinationCity,
    departureTime: input.departureTime,
    utilizationFallback
  });

  const byCategory = categories.map((category) => {
    const matching = pendingRequests.filter((request) => request.package?.category === category);
    return {
      category,
      pendingPackages: matching.length,
      pendingWeightKg: Number(matching.reduce((sum, request) => sum + (request.package?.weightKg || 0), 0).toFixed(1))
    };
  });

  const demandScore = clamp(Math.round(pendingRequests.length * 12 + demandRatio * 35 - competingTrips.length * 4 + categoryBoost * 100), 0, 100);
  const insights = [
    pendingRequests.length
      ? `${pendingRequests.length} pending package${pendingRequests.length === 1 ? '' : 's'} fit this route and category mix.`
      : 'No pending package has this exact route yet, so the projection uses typical utilization.',
    competingTrips.length
      ? `${competingTrips.length} active carrier${competingTrips.length === 1 ? '' : 's'} are competing on this lane.`
      : 'No active carrier is competing on this lane right now.',
    recommendedRatePerKg > currentRatePerKg
      ? `You can likely raise this route toward Rs ${recommendedRatePerKg}/kg.`
      : recommendedRatePerKg < currentRatePerKg
        ? `Rs ${recommendedRatePerKg}/kg is the stronger fill-rate target for this lane.`
        : 'Your current rate is aligned with the balanced earning target.'
  ];

  return {
    route: {
      originCity: input.originCity,
      destinationCity: input.destinationCity
    },
    market: {
      pendingPackages: pendingRequests.length,
      pendingWeightKg: Number(pendingWeightKg.toFixed(1)),
      competingCarriers: competingTrips.length,
      lowestRatePerKg: activeRates.length ? Math.min(...activeRates) : null,
      medianRatePerKg,
      highestRatePerKg: activeRates.length ? Math.max(...activeRates) : null,
      demandScore
    },
    strategy: {
      currentRatePerKg,
      recommendedRatePerKg,
      floorRatePerKg: fastFill.ratePerKg,
      premiumRatePerKg: premium.ratePerKg,
      platformFeePercent: env.PLATFORM_FEE_PERCENT,
      carrierKeepsListedPayout: true
    },
    projection: {
      current,
      balanced,
      fastFill,
      premium
    },
    rateTiers: [fastFill, balanced, premium],
    categoryOpportunities: byCategory,
    insights
  };
}
