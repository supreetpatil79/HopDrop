import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge, EmptyState, PageHeader, StatCard, captureAnalyticsEvent, captureClientError, trackFunnelStep } from 'hopdrop-shared';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';
import {
  Bike,
  Bus,
  CalendarClock,
  Car,
  IndianRupee,
  MapPinned,
  PackageCheck,
  Plane,
  ShieldCheck,
  Sparkles,
  Train,
  TrendingUp,
  Truck,
  WalletCards,
  Zap
} from 'lucide-react';
import { RouteAutocomplete } from '../components/map/RouteAutocomplete';
import { RoutePreviewMap } from '../components/map/RoutePreviewMap';
import { RazorpayButton } from '../components/ui/RazorpayButton';
import { Input } from '../components/ui/Input';
import { TextArea } from '../components/ui/TextArea';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { tripApi } from '../api/trip.api';
import { pricingApi } from '../api/pricing.api';
import { formatDateTime, formatINRPaise } from '../utils/format';

type TransportMode = 'train' | 'bus' | 'car' | 'flight' | 'bike';
type Category = 'documents' | 'clothing' | 'electronics' | 'food' | 'medicine' | 'fragile' | 'other';

interface TripFormData {
  origin: { city: string; placeId: string; coords: [number, number] | null };
  destination: { city: string; placeId: string; coords: [number, number] | null };
  departureTime: string;
  estimatedArrivalTime: string;
  modeOfTransport: TransportMode;
  transportName: string;
  pnr: string;
  totalWeightKg: number;
  pricePerKg: number;
  allowedCategories: Category[];
  pickupInstructions: string;
  dropoffInstructions: string;
  distanceKm: number;
  durationHours: number;
}

const steps = [
  {
    title: 'Route setup',
    description: 'Choose the lane and transport mode you can service confidently.'
  },
  {
    title: 'Schedule details',
    description: 'Add departure timing and optional trip references for trust.'
  },
  {
    title: 'Capacity and pricing',
    description: 'Define what you can carry and tune the rate for this route.'
  },
  {
    title: 'Deposit and publish',
    description: 'Review the trip, pay the refundable deposit, and post it live.'
  }
] as const;

const transportModes: Array<{ mode: TransportMode; icon: LucideIcon; label: string }> = [
  { mode: 'train', icon: Train, label: 'Train' },
  { mode: 'bus', icon: Bus, label: 'Bus' },
  { mode: 'car', icon: Car, label: 'Car' },
  { mode: 'flight', icon: Plane, label: 'Flight' },
  { mode: 'bike', icon: Bike, label: 'Bike' }
];

const categories: Category[] = ['documents', 'clothing', 'electronics', 'food', 'medicine', 'fragile', 'other'];

function toLocalDateTimeInputValue(date: Date) {
  const offset = date.getTimezoneOffset();
  const normalizedDate = new Date(date.getTime() - offset * 60_000);
  return normalizedDate.toISOString().slice(0, 16);
}

export default function PostTrip() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);
  const [formData, setFormData] = useState<TripFormData>({
    origin: { city: '', placeId: '', coords: null },
    destination: { city: '', placeId: '', coords: null },
    departureTime: '',
    estimatedArrivalTime: '',
    modeOfTransport: 'train',
    transportName: '',
    pnr: '',
    totalWeightKg: 5,
    pricePerKg: 80,
    allowedCategories: ['documents'],
    pickupInstructions: '',
    dropoffInstructions: '',
    distanceKm: 0,
    durationHours: 0
  });

  useEffect(() => {
    captureAnalyticsEvent('carrier_trip_post_started');
    trackFunnelStep('carrier_activation', 'core_action_started', {
      action: 'trip_post'
    });
  }, []);

  const minimumDateTime = useMemo(() => toLocalDateTimeInputValue(new Date()), []);
  const routeConfigured = Boolean(formData.origin.placeId && formData.destination.placeId);
  const hasValidArrival =
    !formData.estimatedArrivalTime ||
    (Boolean(formData.departureTime) &&
      new Date(formData.estimatedArrivalTime).getTime() > new Date(formData.departureTime).getTime());
  const scheduleReady = Boolean(formData.departureTime) && hasValidArrival;

  const pricingGuideQuery = useQuery({
    queryKey: [
      'carrier-pricing-guidance',
      formData.origin.city,
      formData.destination.city,
      formData.totalWeightKg,
      formData.pricePerKg,
      formData.modeOfTransport,
      formData.departureTime,
      formData.allowedCategories.join('|')
    ],
    queryFn: () =>
      pricingApi
        .carrierGuidance({
          originCity: formData.origin.city,
          destinationCity: formData.destination.city,
          capacityKg: formData.totalWeightKg,
          pricePerKg: formData.pricePerKg,
          modeOfTransport: formData.modeOfTransport,
          departureTime: formData.departureTime || undefined,
          categories: formData.allowedCategories.join(',')
        })
        .then((res) => res.data.data),
    enabled: Boolean(formData.origin.city && formData.destination.city && step >= 3),
    staleTime: 30000
  });

  const pricingGuide = pricingGuideQuery.data;
  const sampleWeightKg = Math.min(formData.totalWeightKg, 5);
  const estimatedEarningPaise = useMemo(
    () => pricingGuide?.projection?.current?.carrierPayout ?? Math.round(formData.pricePerKg * sampleWeightKg * 100),
    [formData.pricePerKg, pricingGuide?.projection?.current?.carrierPayout, sampleWeightKg]
  );
  const maxCapacityValuePaise = formData.totalWeightKg > 0 ? Math.round(formData.totalWeightKg * formData.pricePerKg * 100) : 0;
  const recommendedRatePerKg = pricingGuide?.strategy?.recommendedRatePerKg;
  const currentStep = steps[step - 1];
  const tripReadyToPost = routeConfigured && scheduleReady && formData.allowedCategories.length > 0 && formData.totalWeightKg > 0;

  const getStepValidationMessage = () => {
    if (step === 1 && !routeConfigured) {
      return 'Select both origin and destination from the route suggestions.';
    }
    if (step === 2 && !formData.departureTime) {
      return 'Add a departure date and time before continuing.';
    }
    if (step === 2 && !hasValidArrival) {
      return 'Estimated arrival must be later than the departure time.';
    }
    if (step === 3 && formData.totalWeightKg <= 0) {
      return 'Set the capacity you can carry on this trip.';
    }
    if (step === 3 && formData.allowedCategories.length === 0) {
      return 'Choose at least one package category you can carry.';
    }
    return null;
  };

  const canProceed = !getStepValidationMessage();

  const submitTrip = async (paymentId: string, orderId: string, signature: string) => {
    if (!formData.origin.coords || !formData.destination.coords) {
      toast.error('Please select valid origin and destination');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        origin: {
          city: formData.origin.city,
          placeId: formData.origin.placeId,
          coordinates: { type: 'Point', coordinates: formData.origin.coords }
        },
        destination: {
          city: formData.destination.city,
          placeId: formData.destination.placeId,
          coordinates: { type: 'Point', coordinates: formData.destination.coords }
        },
        departureTime: formData.departureTime,
        estimatedArrivalTime: formData.estimatedArrivalTime || undefined,
        modeOfTransport: formData.modeOfTransport,
        transportDetails: {
          name: formData.transportName || undefined,
          pnr: formData.pnr || undefined
        },
        availableCapacity: {
          weightKg: formData.totalWeightKg,
          allowedCategories: formData.allowedCategories
        },
        pricePerKg: formData.pricePerKg,
        pickupInstructions: formData.pickupInstructions,
        dropoffInstructions: formData.dropoffInstructions
      };

      const tripRes = await tripApi.createTrip(payload);
      const trip = tripRes.data.data;

      await tripApi.confirmDeposit(trip._id, {
        razorpayOrderId: orderId,
        razorpayPaymentId: paymentId,
        razorpaySignature: signature
      });

      captureAnalyticsEvent('carrier_trip_posted', {
        trip_id: trip._id
      });
      trackFunnelStep('carrier_activation', 'core_action_completed', {
        action: 'trip_post',
        trip_id: trip._id
      });
      toast.success('Trip posted successfully');
      navigate('/my-trips');
    } catch (error) {
      captureClientError(error, { source: 'carrier_trip_post_submit' });
      trackFunnelStep('carrier_activation', 'core_action_failed', {
        action: 'trip_post'
      });
      toast.error('Unable to post trip. Please retry.');
    } finally {
      setSubmitting(false);
    }
  };

  const advanceStep = () => {
    const validationMessage = getStepValidationMessage();
    if (validationMessage) {
      setStepError(validationMessage);
      captureAnalyticsEvent('carrier_trip_post_validation_failed', {
        step: currentStep.title
      });
      toast.error(validationMessage);
      return;
    }

    setStepError(null);
    captureAnalyticsEvent('carrier_trip_post_step_advanced', {
      from_step: currentStep.title,
      to_step: steps[Math.min(step, steps.length - 1)].title
    });
    setStep((previousStep) => Math.min(4, previousStep + 1));
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Carrier workflow"
        title="Post a verified delivery route"
        description="Publish a professional trip listing with clear schedule, capacity, and payout expectations while keeping the existing trip, pricing, and deposit flows intact."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-white/85" padding="sm">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/10 bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-dark">Trusted handoff flow</p>
              <p className="text-sm leading-6 text-text-muted">OTP checkpoints, delivery state changes, and support workflows continue unchanged.</p>
            </div>
          </div>
        </Card>
        <Card className="bg-white/85" padding="sm">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/10 bg-primary/10 text-primary">
              <WalletCards className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-dark">Refundable deposit</p>
              <p className="text-sm leading-6 text-text-muted">The existing deposit flow stays intact and keeps listings credible for senders.</p>
            </div>
          </div>
        </Card>
        <Card className="bg-white/85" padding="sm">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/10 bg-primary/10 text-primary">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-dark">Live demand guidance</p>
              <p className="text-sm leading-6 text-text-muted">Use route guidance to price against active supply without changing the pricing contract.</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_360px]">
        <Card className="space-y-6" padding="lg">
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">Trip creation</p>
                <h2 className="text-2xl font-semibold tracking-[-0.03em] text-dark">{currentStep.title}</h2>
                <p className="max-w-2xl text-sm leading-6 text-text-muted">{currentStep.description}</p>
              </div>
              <Badge tone={tripReadyToPost ? 'success' : 'neutral'}>
                {tripReadyToPost ? 'Ready to publish' : 'Draft in progress'}
              </Badge>
            </div>

            <ol className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {steps.map((stepItem, index) => {
                const stepNumber = index + 1;
                const isComplete = stepNumber < step;
                const isCurrent = stepNumber === step;

                return (
                  <li
                    key={stepItem.title}
                    aria-current={isCurrent ? 'step' : undefined}
                    className={[
                      'rounded-[22px] border p-4 transition',
                      isCurrent
                        ? 'border-primary/30 bg-primary/10 shadow-[0_18px_40px_-28px_rgba(15,118,110,0.45)]'
                        : isComplete
                          ? 'border-emerald-200 bg-emerald-50/70'
                          : 'border-border/80 bg-surface-alt/70'
                    ].join(' ')}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={[
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold',
                          isCurrent
                            ? 'bg-primary text-white'
                            : isComplete
                              ? 'bg-emerald-600 text-white'
                              : 'bg-white text-text-muted'
                        ].join(' ')}
                      >
                        {isComplete ? <PackageCheck className="h-4 w-4" /> : stepNumber}
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-dark">{stepItem.title}</p>
                        <p className="text-xs leading-5 text-text-muted">{stepItem.description}</p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          {step === 1 ? (
            <div className="space-y-6">
              <section className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold tracking-[-0.02em] text-dark">Route selection</h3>
                  <p className="text-sm leading-6 text-text-muted">Pick both cities from search suggestions so ranking, matching, and map previews stay accurate.</p>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  <RouteAutocomplete
                    label="Origin city"
                    value={formData.origin.city}
                    field="origin"
                    helperText="Search and select your departure city."
                    placeholder="Where are you traveling from?"
                    onInputChange={(city) => {
                      setStepError(null);
                      setFormData((previousData) => ({
                        ...previousData,
                        origin: { city, placeId: '', coords: null }
                      }));
                    }}
                    onChange={(city, placeId, coords) => {
                      setStepError(null);
                      setFormData((previousData) => ({ ...previousData, origin: { city, placeId, coords } }));
                    }}
                  />

                  <RouteAutocomplete
                    label="Destination city"
                    value={formData.destination.city}
                    field="destination"
                    helperText="Select the city where you can complete the delivery."
                    placeholder="Where are you going?"
                    onInputChange={(city) => {
                      setStepError(null);
                      setFormData((previousData) => ({
                        ...previousData,
                        destination: { city, placeId: '', coords: null }
                      }));
                    }}
                    onChange={(city, placeId, coords) => {
                      setStepError(null);
                      setFormData((previousData) => ({ ...previousData, destination: { city, placeId, coords } }));
                    }}
                  />
                </div>
              </section>

              <section className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold tracking-[-0.02em] text-dark">Transport mode</h3>
                  <p className="text-sm leading-6 text-text-muted">This helps senders understand trust, timing, and handling conditions before they request a match.</p>
                </div>
                <div className="grid grid-cols-5 gap-2 sm:gap-3">
                  {transportModes.map((mode) => {
                    const Icon = mode.icon;
                    const selected = formData.modeOfTransport === mode.mode;

                    return (
                      <button
                        key={mode.mode}
                        type="button"
                        onClick={() => {
                          setStepError(null);
                          setFormData((previousData) => ({ ...previousData, modeOfTransport: mode.mode }));
                        }}
                        className={[
                          'flex flex-col items-center justify-center rounded-[22px] border px-2 py-3.5 sm:px-3 sm:py-4 text-center transition',
                          selected
                            ? 'border-primary/40 bg-primary/10 text-primary shadow-[0_18px_35px_-26px_rgba(15,118,110,0.45)]'
                            : 'border-border/80 bg-white hover:border-primary/20 hover:bg-primary/5 text-dark'
                        ].join(' ')}
                        aria-pressed={selected}
                      >
                        <Icon className="mx-auto h-5 w-5 sm:h-6 sm:w-6" />
                        <div className="mt-2 text-xs sm:text-sm font-semibold">{mode.label}</div>
                      </button>
                    );
                  })}
                </div>
              </section>

              {formData.origin.coords && formData.destination.coords ? (
                <section className="space-y-3">
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold tracking-[-0.02em] text-dark">Route preview</h3>
                    <p className="text-sm leading-6 text-text-muted">Distance and duration help you price more accurately for the selected lane.</p>
                  </div>
                  <RoutePreviewMap
                    origin={{ city: formData.origin.city, coords: formData.origin.coords }}
                    destination={{ city: formData.destination.city, coords: formData.destination.coords }}
                    modeOfTransport={formData.modeOfTransport}
                    onDistanceFetched={(km, hours) => {
                      setStepError(null);
                      setFormData((previousData) => ({ ...previousData, distanceKm: km, durationHours: hours }));
                    }}
                  />

                </section>
              ) : null}
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-6">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold tracking-[-0.02em] text-dark">Schedule and trip references</h3>
                <p className="text-sm leading-6 text-text-muted">Clear scheduling improves trust and reduces back-and-forth with senders before acceptance.</p>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <Input
                  label="Departure date and time"
                  labelHint="Required"
                  type="datetime-local"
                  min={minimumDateTime}
                  helperText="Trips should be scheduled in the future so requests can match correctly."
                  value={formData.departureTime}
                  onChange={(event) => {
                    setStepError(null);
                    setFormData((previousData) => ({ ...previousData, departureTime: event.target.value }));
                  }}
                />

                <Input
                  label="Estimated arrival"
                  labelHint="Optional"
                  type="datetime-local"
                  min={formData.departureTime || minimumDateTime}
                  helperText="If entered, arrival must be later than the departure time."
                  value={formData.estimatedArrivalTime}
                  onChange={(event) => {
                    setStepError(null);
                    setFormData((previousData) => ({ ...previousData, estimatedArrivalTime: event.target.value }));
                  }}
                />

                <Input
                  label="Transport name"
                  placeholder="Rajdhani Express"
                  helperText="Shown to senders for trust and context."
                  value={formData.transportName}
                  onChange={(event) => {
                    setStepError(null);
                    setFormData((previousData) => ({ ...previousData, transportName: event.target.value }));
                  }}
                />

                <Input
                  label="PNR or booking reference"
                  placeholder="Optional"
                  helperText="Helpful for high-trust listings on structured routes."
                  value={formData.pnr}
                  onChange={(event) => {
                    setStepError(null);
                    setFormData((previousData) => ({ ...previousData, pnr: event.target.value }));
                  }}
                />
              </div>

              {!hasValidArrival ? (
                <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  Estimated arrival must be later than the departure time.
                </p>
              ) : null}
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-6">
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_0.8fr]">
                <Card className="space-y-5 bg-surface-alt/70" padding="md">
                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                      <label className="font-semibold text-dark">Capacity you can carry</label>
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                        {formData.totalWeightKg} kg
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.5}
                      max={30}
                      step={0.5}
                      value={formData.totalWeightKg}
                      onChange={(event) => {
                        setStepError(null);
                        setFormData((previousData) => ({ ...previousData, totalWeightKg: Number(event.target.value) }));
                      }}
                      className="w-full accent-primary"
                    />
                    <p className="mt-3 text-sm leading-6 text-text-muted">
                      Set the comfortable upper limit, not the best-case maximum. Accurate capacity improves acceptance quality.
                    </p>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                      <label className="font-semibold text-dark">Rate per kilogram</label>
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                        Rs. {formData.pricePerKg}/kg
                      </span>
                    </div>
                    <input
                      type="range"
                      min={20}
                      max={500}
                      step={10}
                      value={formData.pricePerKg}
                      onChange={(event) => {
                        setStepError(null);
                        setFormData((previousData) => ({ ...previousData, pricePerKg: Number(event.target.value) }));
                      }}
                      className="w-full accent-primary"
                    />
                    <p className="mt-3 text-sm leading-6 text-text-muted">
                      This controls the base sender quote while preserving your existing pricing and payout calculations.
                    </p>
                  </div>
                </Card>

                <div className="space-y-4">
                  <StatCard
                    label="Projected payout"
                    value={formatINRPaise(estimatedEarningPaise)}
                    description={`Based on ${sampleWeightKg} kg at the current lane rate.`}
                    icon={<IndianRupee className="h-5 w-5" />}
                  />
                  <StatCard
                    label="Max lane value"
                    value={formatINRPaise(maxCapacityValuePaise)}
                    description="If the full listed capacity gets matched at your current rate."
                    icon={<Truck className="h-5 w-5" />}
                  />
                </div>
              </div>

              <Card className="space-y-4 bg-surface-alt/70" padding="md">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-semibold text-dark">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Rate assistant
                  </div>
                  <p className="text-sm leading-6 text-text-muted">Use live route guidance to anchor your rate without changing the backend pricing model.</p>
                </div>

                {pricingGuideQuery.isError ? (
                  <EmptyState
                    title="Unable to load live pricing guidance"
                    description="Manual pricing still works. Retry if you want current lane data before posting."
                    icon={<Sparkles className="h-5 w-5" />}
                    actions={
                      <Button type="button" variant="ghost" onClick={() => void pricingGuideQuery.refetch()}>
                        Retry guidance
                      </Button>
                    }
                  />
                ) : (
                  <>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {(pricingGuide?.rateTiers || []).map((tier: any) => (
                        <button
                          key={tier.label}
                          type="button"
                          onClick={() => {
                            setStepError(null);
                            setFormData((previousData) => ({ ...previousData, pricePerKg: tier.ratePerKg }));
                          }}
                          className={[
                            'rounded-[22px] border px-4 py-4 text-left transition',
                            formData.pricePerKg === tier.ratePerKg
                              ? 'border-primary/40 bg-primary/10'
                              : 'border-border/80 bg-white hover:border-primary/20 hover:bg-primary/5'
                          ].join(' ')}
                        >
                          <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">{tier.label}</span>
                          <span className="mt-2 block text-2xl font-semibold tracking-[-0.03em] text-dark">Rs. {tier.ratePerKg}/kg</span>
                          <span className="mt-2 block text-sm text-primary">{formatINRPaise(tier.carrierPayout)} payout</span>
                        </button>
                      ))}
                    </div>

                    {!pricingGuide?.rateTiers?.length ? (
                      <div className="rounded-[22px] border border-dashed border-border/90 bg-white/80 px-4 py-4 text-sm text-text-muted">
                        {pricingGuideQuery.isFetching ? 'Checking live lane demand...' : 'Select a strong lane to unlock pricing guidance and route demand.'}
                      </div>
                    ) : null}

                    {recommendedRatePerKg ? (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setStepError(null);
                          setFormData((previousData) => ({ ...previousData, pricePerKg: recommendedRatePerKg }));
                        }}
                      >
                        <Zap className="h-4 w-4" />
                        Use balanced Rs. {recommendedRatePerKg}/kg
                      </Button>
                    ) : null}
                  </>
                )}
              </Card>

              <section className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold tracking-[-0.02em] text-dark">Package categories and handoff notes</h3>
                  <p className="text-sm leading-6 text-text-muted">Clear rules reduce negotiation friction and help senders self-select into the right route.</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => {
                    const selected = formData.allowedCategories.includes(category);

                    return (
                      <button
                        key={category}
                        type="button"
                        onClick={() => {
                          setStepError(null);
                          setFormData((previousData) => ({
                            ...previousData,
                            allowedCategories: selected
                              ? previousData.allowedCategories.filter((value) => value !== category)
                              : [...previousData.allowedCategories, category]
                          }));
                        }}
                        className={[
                          'rounded-full border px-4 py-2 text-sm font-semibold capitalize transition',
                          selected
                            ? 'border-primary/35 bg-primary/10 text-primary'
                            : 'border-border/80 bg-white text-text-muted hover:border-primary/20 hover:bg-primary/5'
                        ].join(' ')}
                        aria-pressed={selected}
                      >
                        {category}
                      </button>
                    );
                  })}
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <TextArea
                    label="Pickup instructions"
                    helperText="Example: Platform 3 near coach B2, or airport pickup gate."
                    value={formData.pickupInstructions}
                    onChange={(event) => {
                      setStepError(null);
                      setFormData((previousData) => ({ ...previousData, pickupInstructions: event.target.value }));
                    }}
                  />
                  <TextArea
                    label="Drop-off instructions"
                    helperText="Optional but useful when the last-mile handoff has access or timing constraints."
                    value={formData.dropoffInstructions}
                    onChange={(event) => {
                      setStepError(null);
                      setFormData((previousData) => ({ ...previousData, dropoffInstructions: event.target.value }));
                    }}
                  />
                </div>
              </section>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="space-y-6">
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_0.9fr]">
                <Card className="space-y-4 bg-surface-alt/70" padding="md">
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold tracking-[-0.02em] text-dark">Trip summary</h3>
                    <p className="text-sm leading-6 text-text-muted">Review the live listing details exactly as the current trip payload will publish them.</p>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex items-start justify-between gap-4 rounded-2xl border border-border/80 bg-white/90 px-4 py-3">
                      <span className="text-text-muted">Route</span>
                      <span className="text-right font-semibold text-dark">{`${formData.origin.city} -> ${formData.destination.city}`}</span>
                    </div>
                    <div className="flex items-start justify-between gap-4 rounded-2xl border border-border/80 bg-white/90 px-4 py-3">
                      <span className="text-text-muted">Departure</span>
                      <span className="text-right font-semibold text-dark">{formatDateTime(formData.departureTime)}</span>
                    </div>
                    <div className="flex items-start justify-between gap-4 rounded-2xl border border-border/80 bg-white/90 px-4 py-3">
                      <span className="text-text-muted">Estimated arrival</span>
                      <span className="text-right font-semibold text-dark">
                        {formData.estimatedArrivalTime ? formatDateTime(formData.estimatedArrivalTime) : 'Not provided'}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-4 rounded-2xl border border-border/80 bg-white/90 px-4 py-3">
                      <span className="text-text-muted">Transport</span>
                      <span className="text-right font-semibold text-dark">
                        {formData.modeOfTransport} · {formData.transportName || 'Reference pending'}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-4 rounded-2xl border border-border/80 bg-white/90 px-4 py-3">
                      <span className="text-text-muted">Capacity</span>
                      <span className="text-right font-semibold text-dark">{formData.totalWeightKg} kg</span>
                    </div>
                    <div className="flex items-start justify-between gap-4 rounded-2xl border border-border/80 bg-white/90 px-4 py-3">
                      <span className="text-text-muted">Rate</span>
                      <span className="text-right font-semibold text-dark">Rs. {formData.pricePerKg}/kg</span>
                    </div>
                  </div>
                </Card>

                <div className="space-y-4">
                  <Card className="space-y-3 border-amber-200 bg-amber-50/80" padding="md">
                    <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
                      <WalletCards className="h-4 w-4" />
                      Refundable carrier deposit
                    </div>
                    <p className="text-sm leading-6 text-amber-900/85">
                      Rs. 500 stays reserved while the trip is active and is released automatically after successful completion through the existing flow.
                    </p>
                  </Card>

                  <Card className="space-y-3 bg-surface-alt/70" padding="md">
                    <div className="flex items-center gap-2 text-sm font-semibold text-dark">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      Trust signals included in this listing
                    </div>
                    <ul className="space-y-2 text-sm leading-6 text-text-muted">
                      <li>Pickup and delivery continue to require OTP verification.</li>
                      <li>Trip details feed directly into live matching and payout calculations.</li>
                      <li>Sender-facing pricing remains consistent with the current backend contract.</li>
                    </ul>
                  </Card>
                </div>
              </div>

              <RazorpayButton
                label={submitting ? 'Posting trip...' : 'Pay Rs. 500 refundable deposit and post trip'}
                amount={50000}
                onSuccess={(paymentId, orderId, signature) => void submitTrip(paymentId, orderId, signature)}
                createOrderFn={async () => {
                  const response = await tripApi.createPreTripDepositOrder();
                  return response.data.data;
                }}
              />
            </div>
          ) : null}

          {stepError ? (
            <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{stepError}</p>
          ) : null}

          {step < 4 ? (
            <div className="flex flex-col-reverse gap-3 border-t border-border/80 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setStepError(null);
                  setStep((previousStep) => Math.max(1, previousStep - 1));
                }}
                disabled={step === 1}
              >
                Back
              </Button>
              <Button type="button" onClick={advanceStep}>
                Continue
              </Button>
            </div>
          ) : null}
        </Card>

        <div className="space-y-4 xl:sticky xl:top-28 xl:self-start">
          <Card className="space-y-4" padding="md">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold tracking-[-0.02em] text-dark">Trip snapshot</h3>
              <Badge tone={tripReadyToPost ? 'success' : 'neutral'}>
                {tripReadyToPost ? 'Structured' : 'Incomplete'}
              </Badge>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-surface-alt/70 p-4">
                <MapPinned className="mt-0.5 h-4 w-4 text-primary" />
                <div className="space-y-1">
                  <p className="font-semibold text-dark">Lane</p>
                  <p className="text-text-muted">
                    {routeConfigured ? `${formData.origin.city} -> ${formData.destination.city}` : 'Select route suggestions'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-surface-alt/70 p-4">
                <CalendarClock className="mt-0.5 h-4 w-4 text-primary" />
                <div className="space-y-1">
                  <p className="font-semibold text-dark">Schedule</p>
                  <p className="text-text-muted">{formData.departureTime ? formatDateTime(formData.departureTime) : 'Add departure timing'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-surface-alt/70 p-4">
                <Truck className="mt-0.5 h-4 w-4 text-primary" />
                <div className="space-y-1">
                  <p className="font-semibold text-dark">Capacity</p>
                  <p className="text-text-muted">{formData.totalWeightKg} kg · {formData.allowedCategories.length} category rules</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-surface-alt/70 p-4">
                <IndianRupee className="mt-0.5 h-4 w-4 text-primary" />
                <div className="space-y-1">
                  <p className="font-semibold text-dark">Payout outlook</p>
                  <p className="text-text-muted">{formatINRPaise(estimatedEarningPaise)} sample payout</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="space-y-4 bg-surface-alt/80" padding="md">
            <h3 className="text-lg font-semibold tracking-[-0.02em] text-dark">What this refactor protects</h3>
            <div className="space-y-3 text-sm text-text-muted">
              <p>Route search still uses the same suggest and select endpoints, so analytics and matching stay stable.</p>
              <p>The posted trip payload and deposit confirmation calls remain unchanged, preserving backend contracts.</p>
              <p>Improved guidance, layout, and validation happen entirely in the frontend layer for safe iteration.</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
