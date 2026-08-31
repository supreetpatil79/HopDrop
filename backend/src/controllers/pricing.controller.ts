import { Request, Response } from 'express';
import { z } from 'zod';
import { estimateCarrierEarnings, estimatePricing } from '../services/pricing.service';
import { ApiResponse } from '../utils/ApiResponse';

const pricingEstimateQuerySchema = z.object({
  originCity: z.string().trim().min(2),
  destinationCity: z.string().trim().min(2),
  weightKg: z.coerce.number().positive(),
  category: z.enum(['documents', 'clothing', 'electronics', 'food', 'fragile', 'medicine', 'other']).default('documents'),
  isFragile: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((value) => {
      if (typeof value === 'boolean') {
        return value;
      }

      return value === 'true';
    }),
  declaredValue: z.coerce.number().positive().optional()
});

const categorySchema = z.enum(['documents', 'clothing', 'electronics', 'food', 'fragile', 'medicine', 'other']);

const carrierGuidanceQuerySchema = z.object({
  originCity: z.string().trim().min(2),
  destinationCity: z.string().trim().min(2),
  capacityKg: z.coerce.number().positive().max(30),
  pricePerKg: z.coerce.number().positive().optional(),
  modeOfTransport: z.enum(['bus', 'train', 'car', 'bike', 'flight', 'other']).optional(),
  departureTime: z.coerce.date().optional(),
  categories: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((value) => {
      if (!value) {
        return ['documents'];
      }

      return (Array.isArray(value) ? value : value.split(','))
        .map((item) => item.trim())
        .filter(Boolean);
    })
    .pipe(z.array(categorySchema).min(1))
});

export async function estimatePricingController(req: Request, res: Response) {
  const query = pricingEstimateQuerySchema.parse(req.query);
  const data = await estimatePricing({
    originCity: query.originCity,
    destinationCity: query.destinationCity,
    weightKg: query.weightKg,
    category: query.category,
    isFragile: query.isFragile,
    declaredValue: query.declaredValue
  });

  res.status(200).json(new ApiResponse('Pricing estimate fetched', data));
}

export async function carrierGuidanceController(req: Request, res: Response) {
  const query = carrierGuidanceQuerySchema.parse(req.query);
  const data = await estimateCarrierEarnings({
    originCity: query.originCity,
    destinationCity: query.destinationCity,
    capacityKg: query.capacityKg,
    pricePerKg: query.pricePerKg,
    modeOfTransport: query.modeOfTransport,
    departureTime: query.departureTime,
    categories: query.categories
  });

  res.status(200).json(new ApiResponse('Carrier earning guidance fetched', data));
}
