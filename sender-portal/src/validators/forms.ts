import { z } from 'zod';

const optionalCoercedNumber = (label: string) =>
  z
    .union([
      z.literal(''),
      z.coerce.number({
        invalid_type_error: `${label} must be a valid number`
      })
    ])
    .transform((value) => (value === '' ? undefined : value));

const optionalUrl = z.preprocess((value) => (value === '' ? undefined : value), z.string().url().optional());

const pickupWindowSchema = z
  .object({
    earliest: z.string().min(1, 'Earliest pickup is required'),
    latest: z.string().min(1, 'Latest pickup is required')
  })
  .superRefine((value, ctx) => {
    const earliest = new Date(value.earliest);
    const latest = new Date(value.latest);

    if (Number.isNaN(earliest.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['earliest'],
        message: 'Earliest pickup must be a valid date and time'
      });
    }

    if (Number.isNaN(latest.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['latest'],
        message: 'Latest pickup must be a valid date and time'
      });
    }

    if (!Number.isNaN(earliest.getTime()) && !Number.isNaN(latest.getTime()) && latest <= earliest) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['latest'],
        message: 'Latest pickup must be later than earliest pickup'
      });
    }
  });

const locationSchema = z.object({
  city: z.string().min(2, 'City is required'),
  state: z.string().optional(),
  placeId: z.string().optional(),
  coordinates: z
    .object({
      type: z.literal('Point').default('Point'),
      coordinates: z.tuple([z.number(), z.number()])
    })
    .optional(),
  fullAddress: z.string().optional()
});

export const loginSchema = z.object({
  phone: z.string().min(10),
  otp: z.string().length(6)
});

export const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10),
  otp: z.string().length(6)
});

export const tripFormSchema = z.object({
  origin: locationSchema,
  destination: locationSchema,
  departureTime: z.string().min(1),
  estimatedArrivalTime: z.string().optional(),
  modeOfTransport: z.enum(['bus', 'train', 'car', 'bike', 'flight', 'other']),
  transportDetails: z.object({
    name: z.string().optional(),
    pnr: z.string().optional(),
    seatNumber: z.string().optional()
  }),
  availableCapacity: z.object({
    weightKg: z.coerce.number().min(1).max(30),
    dimensionsCm: z
      .object({
        length: z.coerce.number().optional(),
        width: z.coerce.number().optional(),
        height: z.coerce.number().optional()
      })
      .optional(),
    allowedCategories: z.array(z.enum(['documents', 'clothing', 'electronics', 'food', 'fragile', 'medicine', 'other'])).min(1)
  }),
  pricePerKg: z.coerce.number().min(1),
  pickupInstructions: z.string().optional(),
  dropoffInstructions: z.string().optional()
});

export const deliveryFormSchema = z.object({
  origin: locationSchema,
  destination: locationSchema,
  package: z.object({
    description: z
      .string()
      .trim()
      .min(1, 'Description is required')
      .min(3, 'Description must be at least 3 characters'),
    category: z.enum(['documents', 'clothing', 'electronics', 'food', 'fragile', 'medicine', 'other']),
    weightKg: z.preprocess(
      (value) => (value === '' || value == null ? undefined : value),
      z.coerce
        .number({
          invalid_type_error: 'Weight must be a valid number',
          required_error: 'Weight is required'
        })
        .min(0.1, 'Weight must be at least 0.1 kg')
        .max(30, 'Weight cannot exceed 30 kg for passenger baggage')
    ),
    dimensionsCm: z
      .object({
        length: z.coerce.number().optional(),
        width: z.coerce.number().optional(),
        height: z.coerce.number().optional()
      })
      .optional(),
    isFragile: z.boolean().default(false),
    declaredValue: optionalCoercedNumber('Declared value').optional(),
    photoUrl: optionalUrl
  }),
  recipient: z.object({
    name: z.string().min(2, 'Recipient name must be at least 2 characters'),
    phone: z.string().min(10, 'Recipient phone must be at least 10 digits'),
    address: z.string().min(5, 'Recipient address must be at least 5 characters')
  }),
  preferredDeliveryWindow: pickupWindowSchema
});

export const ratingSchema = z.object({
  score: z.coerce.number().int().min(1).max(5),
  comment: z.string().optional()
});
