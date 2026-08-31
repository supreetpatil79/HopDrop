import { calculateQuote, calculateSafetyDepositAmount } from './utils/pricing';

describe('pricing utility', () => {
  it('keeps carrier payout separate from sender platform fee', () => {
    const quote = calculateQuote(
      {
        pricePerKg: 80
      } as any,
      {
        package: {
          category: 'documents',
          weightKg: 2,
          isFragile: false
        }
      } as any
    );

    expect(quote.carrierEarning).toBe(16000);
    expect(quote.platformFee).toBe(1920);
    expect(quote.totalCharge).toBe(17920);
    expect(quote.breakdown.carrierTakeRate).toBeCloseTo(16000 / 17920);
  });

  it('adds category, fragile, urgent, and high-value handling premiums', () => {
    const quote = calculateQuote(
      {
        pricePerKg: 100,
        carrier: {
          rating: { average: 4.9 },
          totalDeliveries: 30
        }
      } as any,
      {
        preferredDeliveryWindow: {
          earliest: new Date('2026-05-03T10:00:00.000Z'),
          latest: new Date('2026-05-03T16:00:00.000Z')
        },
        package: {
          category: 'electronics',
          weightKg: 3,
          isFragile: true,
          declaredValue: 60000
        }
      } as any
    );

    expect(quote.carrierEarning).toBeGreaterThan(30000);
    expect(quote.breakdown.categoryExtra).toBeGreaterThan(0);
    expect(quote.breakdown.fragileExtra).toBeGreaterThan(0);
    expect(quote.breakdown.urgencyExtra).toBeGreaterThan(0);
    expect(quote.breakdown.valueHandlingExtra).toBeGreaterThan(0);
    expect(quote.breakdown.reliabilityBonus).toBeGreaterThan(0);
  });

  it('bases safety deposit on declared value in paise with platform caps', () => {
    expect(
      calculateSafetyDepositAmount({
        package: {
          declaredValue: 10000
        }
      } as any)
    ).toBe(100000);

    expect(
      calculateSafetyDepositAmount({
        package: {
          declaredValue: 1000000
        }
      } as any)
    ).toBe(500000);
  });
});
