import { IDeliveryRequest } from '../models/DeliveryRequest';
import { ITrip } from '../models/Trip';
import { env } from '../config/env';

type PackageCategory = IDeliveryRequest['package']['category'];

const CATEGORY_MULTIPLIER: Record<PackageCategory, number> = {
  documents: 1,
  clothing: 1,
  electronics: 1.18,
  food: 1.08,
  fragile: 1.22,
  medicine: 1.16,
  other: 1.05
};

const CATEGORY_MIN_PAYOUT_PAISE: Record<PackageCategory, number> = {
  documents: 5900,
  clothing: 6900,
  electronics: 11900,
  food: 7900,
  fragile: 12900,
  medicine: 9900,
  other: 7900
};

function safeNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function calculateUrgencyMultiplier(req: IDeliveryRequest) {
  const earliest = req.preferredDeliveryWindow?.earliest ? new Date(req.preferredDeliveryWindow.earliest).getTime() : NaN;
  const latest = req.preferredDeliveryWindow?.latest ? new Date(req.preferredDeliveryWindow.latest).getTime() : NaN;

  if (!Number.isFinite(earliest) || !Number.isFinite(latest) || latest <= earliest) {
    return 0;
  }

  const windowHours = (latest - earliest) / (60 * 60 * 1000);
  if (windowHours <= 8) {
    return 0.2;
  }
  if (windowHours <= 24) {
    return 0.12;
  }
  if (windowHours <= 48) {
    return 0.06;
  }
  return 0;
}

function calculateReliabilityMultiplier(trip: ITrip) {
  const carrier = (trip as any).carrier;
  const averageRating = safeNumber(carrier?.rating?.average, 0);
  const completedDeliveries = safeNumber(carrier?.totalDeliveries, 0);

  if (averageRating >= 4.8 && completedDeliveries >= 20) {
    return 0.05;
  }
  if (averageRating >= 4.6 && completedDeliveries >= 8) {
    return 0.03;
  }
  return 0;
}

function calculateValueHandlingExtra(req: IDeliveryRequest, category: PackageCategory) {
  const declaredValueRupees = safeNumber(req.package.declaredValue, 0);
  if (declaredValueRupees <= 5000) {
    return 0;
  }

  const riskRate = category === 'electronics' || category === 'fragile' ? 0.006 : 0.004;
  return Math.min(Math.round(declaredValueRupees * 100 * riskRate), 75000);
}

export function calculateSafetyDepositAmount(req: Pick<IDeliveryRequest, 'package'>) {
  const declaredValueRupees = safeNumber(req.package.declaredValue, 0);
  const declaredValueDeposit = declaredValueRupees > 0 ? Math.round(declaredValueRupees * 100 * 0.1) : 0;

  return Math.min(Math.max(declaredValueDeposit, env.DEFAULT_SAFETY_DEPOSIT_PAISE), 500000);
}

export function calculateQuote(trip: ITrip, req: IDeliveryRequest) {
  const category = req.package.category || 'other';
  const weightKg = Math.max(safeNumber(req.package.weightKg, 0), 0.1);
  const pricePerKg = Math.max(safeNumber(trip.pricePerKg, 0), 1);
  const basePrice = Math.round(pricePerKg * weightKg * 100);
  const categoryExtra = Math.round(basePrice * (CATEGORY_MULTIPLIER[category] - 1));
  const fragileExtra = req.package.isFragile ? Math.round(basePrice * 0.18) : 0;
  const urgencyExtra = Math.round(basePrice * calculateUrgencyMultiplier(req));
  const valueHandlingExtra = calculateValueHandlingExtra(req, category);
  const reliabilityBonus = Math.round(basePrice * calculateReliabilityMultiplier(trip));
  const rawCarrierEarning = basePrice + categoryExtra + fragileExtra + urgencyExtra + valueHandlingExtra + reliabilityBonus;
  const minPayout = Math.max(CATEGORY_MIN_PAYOUT_PAISE[category], Math.round(weightKg * 4500));
  const minPayoutAdjustment = Math.max(minPayout - rawCarrierEarning, 0);
  const carrierEarning = rawCarrierEarning + minPayoutAdjustment;

  const platformFeeRate = env.PLATFORM_FEE_PERCENT / 100;
  const platformFee = Math.round(carrierEarning * platformFeeRate);
  const totalCharge = carrierEarning + platformFee;
  const safetyDepositAmount = calculateSafetyDepositAmount(req);

  return {
    quoteVersion: 'carrier-payout-v2',
    carrierEarning,
    platformFee,
    platformFeeRate,
    totalCharge,
    safetyDepositAmount,
    breakdown: {
      basePrice,
      categoryExtra,
      fragileExtra,
      urgencyExtra,
      valueHandlingExtra,
      reliabilityBonus,
      minPayoutAdjustment,
      weightKg: req.package.weightKg,
      pricePerKg: trip.pricePerKg,
      category,
      categoryMultiplier: CATEGORY_MULTIPLIER[category],
      carrierTakeRate: carrierEarning > 0 ? carrierEarning / totalCharge : 0
    }
  };
}
