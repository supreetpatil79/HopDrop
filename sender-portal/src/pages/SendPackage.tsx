import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Badge,
  EmptyState,
  PageHeader,
  StatCard,
  captureAnalyticsEvent,
  captureClientError,
  trackFunnelStep
} from 'hopdrop-shared';
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  IndianRupee,
  MapPinned,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  Truck,
  UserRound
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { deliveryApi } from '../api/delivery.api';
import { tripApi } from '../api/trip.api';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { RouteAutocomplete } from '../components/map/RouteAutocomplete';
import { RoutePreviewMap } from '../components/map/RoutePreviewMap';
import { Select } from '../components/ui/Select';
import { TextArea } from '../components/ui/TextArea';
import { formatDateTime } from '../utils/format';
import { deliveryFormSchema } from '../validators/forms';

const steps = [
  {
    title: 'Package details',
    description: 'Describe the parcel, weight, value, and handling expectations.'
  },
  {
    title: 'Route and recipient',
    description: 'Confirm the cities, delivery contact, and pickup time window.'
  },
  {
    title: 'Review and submit',
    description: 'Check live lane demand and publish the request to verified carriers.'
  }
] as const;

function getFirstErrorMessage(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') {
    return undefined;
  }

  if ('message' in error && typeof error.message === 'string' && error.message.length > 0) {
    return error.message;
  }

  const values = Array.isArray(error) ? error : Object.values(error);
  for (const value of values) {
    const message = getFirstErrorMessage(value);
    if (message) {
      return message;
    }
  }

  return undefined;
}

function toLocalDateTimeInputValue(date: Date) {
  const offset = date.getTimezoneOffset();
  const normalizedDate = new Date(date.getTime() - offset * 60_000);
  return normalizedDate.toISOString().slice(0, 16);
}

export default function SendPackage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const prefillOrigin = searchParams.get('originCity') || searchParams.get('origin') || '';
  const prefillDestination = searchParams.get('destinationCity') || searchParams.get('destination') || '';
  const [step, setStep] = useState(0);

  useEffect(() => {
    captureAnalyticsEvent('sender_delivery_request_started');
    trackFunnelStep('sender_activation', 'core_action_started', {
      action: 'delivery_request'
    });
  }, []);

  const {
    control,
    register,
    handleSubmit,
    setValue,
    trigger,
    watch,
    formState: { errors }
  } = useForm<any>({
    resolver: zodResolver(deliveryFormSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      package: {
        category: 'documents',
        weightKg: '',
        description: '',
        declaredValue: '',
        isFragile: false
      }
    }
  });
  const formErrors: any = errors;
  const [originPoint, setOriginPoint] = useState<{ city: string; placeId: string; coords: [number, number] } | null>(null);
  const [destinationPoint, setDestinationPoint] = useState<{ city: string; placeId: string; coords: [number, number] } | null>(null);

  useEffect(() => {
    if (prefillOrigin) {
      setValue('origin.city', prefillOrigin);
      setValue('origin.fullAddress', `${prefillOrigin}, India`);
      setValue('origin.placeId', `DEMO_${prefillOrigin.slice(0, 3).toUpperCase()}`);
      setOriginPoint({ city: prefillOrigin, placeId: `DEMO_${prefillOrigin.slice(0, 3).toUpperCase()}`, coords: [77.5946, 12.9716] });
    }
    if (prefillDestination) {
      setValue('destination.city', prefillDestination);
      setValue('destination.fullAddress', `${prefillDestination}, India`);
      setValue('destination.placeId', `DEMO_${prefillDestination.slice(0, 3).toUpperCase()}`);
      setDestinationPoint({ city: prefillDestination, placeId: `DEMO_${prefillDestination.slice(0, 3).toUpperCase()}`, coords: [72.8777, 19.076] });
    }
  }, [prefillOrigin, prefillDestination, setValue]);

  const currentDateTime = useMemo(() => toLocalDateTimeInputValue(new Date()), []);
  const pickupStart = watch('preferredDeliveryWindow.earliest');
  const pickupEndMinimum = pickupStart || currentDateTime;
  const pickupEnd = watch('preferredDeliveryWindow.latest');
  const packageWeightInput = watch('package.weightKg');
  const packageWeightValue = typeof packageWeightInput === 'string' ? Number.parseFloat(packageWeightInput) : Number(packageWeightInput);
  const packageWeight = Number.isFinite(packageWeightValue) ? packageWeightValue : 0;
  const packageCategory = watch('package.category') || 'documents';
  const packageDescription = watch('package.description');
  const packageIsFragile = Boolean(watch('package.isFragile'));
  const declaredValue = watch('package.declaredValue');
  const recipientName = watch('recipient.name');
  const recipientPhone = watch('recipient.phone');
  const recipientAddress = watch('recipient.address');

  const routeAvailabilityQuery = useQuery({
    queryKey: ['send-package-route-availability', originPoint?.city, destinationPoint?.city, packageWeight],
    queryFn: async () => {
      const response = await tripApi.getTrips({
        origin_city: originPoint?.city,
        destination_city: destinationPoint?.city,
        min_capacity_kg: packageWeight,
        page: 1,
        limit: 20
      });

      return response.data.data;
    },
    enabled: Boolean(originPoint?.city && destinationPoint?.city && packageWeight > 0)
  });

  const createMutation = useMutation({
    mutationFn: (payload: any) => deliveryApi.createRequest(payload),
    onSuccess: (response) => {
      const requestId = response.data.data._id;
      captureAnalyticsEvent('sender_delivery_request_submitted', {
        request_id: requestId
      });
      trackFunnelStep('sender_activation', 'core_action_completed', {
        action: 'delivery_request',
        request_id: requestId
      });
      toast.success('Delivery request posted');
      navigate(`/browse-trips?requestId=${requestId}`);
    },
    onError: (error: any) => {
      captureClientError(error, { source: 'sender_delivery_request_submit' });
      trackFunnelStep('sender_activation', 'core_action_failed', {
        action: 'delivery_request'
      });
      const message = error?.response?.data?.message || 'Unable to create the delivery request right now.';
      toast.error(message);
    }
  });

  const nextStep = async () => {
    try {
      const fieldMap = [
        ['package.category', 'package.description', 'package.weightKg'],
        [
          'origin.city',
          'destination.city',
          'recipient.name',
          'recipient.phone',
          'recipient.address',
          'preferredDeliveryWindow',
          'preferredDeliveryWindow.earliest',
          'preferredDeliveryWindow.latest'
        ],
        []
      ];

      const valid = await trigger(fieldMap[step] as any, { shouldFocus: true });
      if (step === 1 && (!originPoint?.placeId || !destinationPoint?.placeId)) {
        captureAnalyticsEvent('sender_delivery_request_validation_failed', {
          step: steps[step].title,
          reason: 'route_suggestions_incomplete'
        });
        toast.error('Please select both cities from the suggestions list.');
        return;
      }
      if (!valid) {
        captureAnalyticsEvent('sender_delivery_request_validation_failed', {
          step: steps[step].title
        });
        toast.error('Please fix the highlighted fields before continuing.');
        return;
      }

      captureAnalyticsEvent('sender_delivery_request_step_advanced', {
        from_step: steps[step].title,
        to_step: steps[Math.min(step + 1, steps.length - 1)].title
      });
      setStep((previousStep) => Math.min(previousStep + 1, steps.length - 1));
    } catch (error) {
      console.error('Failed to advance the Send Package form', error);
      captureClientError(error, { source: 'sender_delivery_request_next_step', step: steps[step].title });
      toast.error('We hit an unexpected issue while validating this step.');
    }
  };

  const liveTrips = routeAvailabilityQuery.data?.items || [];
  const availableCarrierCount = routeAvailabilityQuery.data?.total || 0;
  const lowestRate = liveTrips.reduce(
    (minimum: number, trip: any) => Math.min(minimum, Number(trip.pricePerKg) || Number.POSITIVE_INFINITY),
    Number.POSITIVE_INFINITY
  );
  const liveEstimate = Number.isFinite(lowestRate) ? Math.round(lowestRate * packageWeight * 1.12) : null;
  const selectedRouteLabel = originPoint && destinationPoint ? `${originPoint.city} -> ${destinationPoint.city}` : 'Route pending';
  const requestReadyForSubmit = Boolean(originPoint?.placeId && destinationPoint?.placeId && recipientName && packageWeight > 0);
  const activeStep = steps[step];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Sender workflow"
        title="Create a secure delivery request"
        description="Set the parcel details, lock in the pickup window, and publish to verified travelers without changing your existing delivery flow."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-white/85" padding="sm">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/10 bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-dark">Verified travelers only</p>
              <p className="text-sm leading-6 text-text-muted">Route discovery and matching stay limited to authenticated carriers.</p>
            </div>
          </div>
        </Card>
        <Card className="bg-white/85" padding="sm">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/10 bg-primary/10 text-primary">
              <PackageCheck className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-dark">OTP-secured handoff</p>
              <p className="text-sm leading-6 text-text-muted">Pickup and drop-off stay tied to recipient identity, route, and timing.</p>
            </div>
          </div>
        </Card>
        <Card className="bg-white/85" padding="sm">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/10 bg-primary/10 text-primary">
              <Truck className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-dark">Live route visibility</p>
              <p className="text-sm leading-6 text-text-muted">Lane demand, carrier availability, and next steps update without changing your APIs.</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_360px]">
        <Card className="space-y-6" padding="lg">
          <div className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">Dispatch request</p>
                <h2 className="text-2xl font-semibold tracking-[-0.03em] text-dark">{activeStep.title}</h2>
                <p className="max-w-2xl text-sm leading-6 text-text-muted">{activeStep.description}</p>
              </div>
              <Badge tone={requestReadyForSubmit ? 'success' : 'neutral'}>
                {requestReadyForSubmit ? 'Ready to publish' : 'Draft in progress'}
              </Badge>
            </div>

            <ol className="grid gap-3 md:grid-cols-3">
              {steps.map((stepItem, index) => {
                const isComplete = index < step;
                const isCurrent = index === step;

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
                        {isComplete ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                      </div>
                      <div className="min-w-0 space-y-1">
                        <p className="text-sm font-semibold text-dark">{stepItem.title}</p>
                        <p className="text-xs leading-5 text-text-muted">{stepItem.description}</p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          <form
            onSubmit={handleSubmit(
              (values) => createMutation.mutate(values),
              (invalidErrors) => {
                captureAnalyticsEvent('sender_delivery_request_validation_failed', {
                  step: activeStep.title,
                  stage: 'submit'
                });
                toast.error(getFirstErrorMessage(invalidErrors) || 'Please fix the highlighted fields before submitting.');
              }
            )}
            className="space-y-6"
          >
            {step === 0 ? (
              <div className="space-y-6">
                <div className="grid gap-4 lg:grid-cols-2">
                  <Select
                    label="Package category"
                    helperText="Used to filter carrier matches and shape pricing guidance."
                    {...register('package.category')}
                    error={formErrors?.package?.category?.message}
                  >
                    <option value="documents">Documents</option>
                    <option value="clothing">Clothing</option>
                    <option value="electronics">Electronics</option>
                    <option value="food">Food</option>
                    <option value="fragile">Fragile</option>
                    <option value="medicine">Medicine</option>
                    <option value="other">Other</option>
                  </Select>

                  <Controller
                    name="package.weightKg"
                    control={control}
                    render={({ field, fieldState }) => (
                      <Input
                        label="Package weight"
                        labelHint="Required"
                        type="number"
                        step="any"
                        helperText="Only enter the parcel weight, not outer packaging or totes."
                        suffix={<span className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">KG</span>}
                        value={field.value ?? ''}
                        onChange={(event) => {
                          const raw = event.target.value;
                          const parsed = Number.parseFloat(raw);
                          field.onChange(raw === '' || Number.isNaN(parsed) ? '' : parsed);
                        }}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                        error={fieldState.error?.message}
                      />
                    )}
                  />

                  <Input
                    label="Declared value"
                    type="number"
                    step="any"
                    helperText="Optional, but useful for support and payout review."
                    prefix={<span className="text-sm font-semibold text-text-muted">Rs.</span>}
                    {...register('package.declaredValue')}
                    error={formErrors?.package?.declaredValue?.message}
                  />

                  <Input
                    label="Photo URL"
                    placeholder="https://..."
                    helperText="Optional reference photo for the carrier during pickup."
                    {...register('package.photoUrl')}
                    error={formErrors?.package?.photoUrl?.message}
                  />

                  <div className="lg:col-span-2">
                    <Controller
                      name="package.description"
                      control={control}
                      render={({ field, fieldState }) => (
                        <TextArea
                          label="Package description"
                          labelHint="Required"
                          helperText="Mention what it is and anything the carrier should know before pickup."
                          value={field.value ?? ''}
                          onChange={(event) => field.onChange(event.target.value)}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                          error={fieldState.error?.message}
                        />
                      )}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200/80 bg-zinc-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-zinc-900">Special Handling</span>
                      {packageIsFragile ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                          ⚠️ Fragile Item
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-zinc-500">
                      Flag delicate or high-touch parcels (glass, electronics, cake) so carriers handle with extra care.
                    </p>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={Boolean(packageIsFragile)}
                    onClick={() => setValue('package.isFragile', !packageIsFragile, { shouldDirty: true, shouldValidate: true })}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                      packageIsFragile ? 'bg-zinc-950' : 'bg-zinc-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        packageIsFragile ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            ) : null}

            {step === 1 ? (
              <div className="space-y-6">
                <section className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold tracking-[-0.02em] text-dark">Pickup and destination</h3>
                    <p className="text-sm leading-6 text-text-muted">Choose both cities from the search list so matching stays geographically accurate.</p>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <RouteAutocomplete
                      label="Pickup city"
                      value={originPoint?.city || watch('origin.city') || ''}
                      field="origin"
                      helperText="Search and select the exact city or route point."
                      error={formErrors?.origin?.city?.message}
                      placeholder="Search origin city"
                      onInputChange={(city) => {
                        setOriginPoint(null);
                        setValue('origin.city', city, { shouldValidate: true });
                        setValue('origin.placeId', '', { shouldValidate: false });
                        setValue('origin.coordinates', undefined, { shouldValidate: false });
                      }}
                      onChange={(city, placeId, coords) => {
                        setOriginPoint({ city, placeId, coords });
                        setValue('origin.city', city, { shouldValidate: true });
                        setValue('origin.placeId', placeId, { shouldValidate: false });
                        setValue('origin.coordinates', { type: 'Point', coordinates: coords }, { shouldValidate: false });
                      }}
                    />
                    <RouteAutocomplete
                      label="Destination city"
                      value={destinationPoint?.city || watch('destination.city') || ''}
                      field="destination"
                      helperText="Select the delivery city from verified route suggestions."
                      error={formErrors?.destination?.city?.message}
                      placeholder="Search destination city"
                      onInputChange={(city) => {
                        setDestinationPoint(null);
                        setValue('destination.city', city, { shouldValidate: true });
                        setValue('destination.placeId', '', { shouldValidate: false });
                        setValue('destination.coordinates', undefined, { shouldValidate: false });
                      }}
                      onChange={(city, placeId, coords) => {
                        setDestinationPoint({ city, placeId, coords });
                        setValue('destination.city', city, { shouldValidate: true });
                        setValue('destination.placeId', placeId, { shouldValidate: false });
                        setValue('destination.coordinates', { type: 'Point', coordinates: coords }, { shouldValidate: false });
                      }}
                    />
                  </div>
                </section>

                {originPoint && destinationPoint ? (
                  <section className="space-y-3">
                    <div className="space-y-1">
                      <h3 className="text-lg font-semibold tracking-[-0.02em] text-dark">Route preview</h3>
                      <p className="text-sm leading-6 text-text-muted">Double-check the pickup and destination cities before you continue.</p>
                    </div>
                    <RoutePreviewMap origin={{ city: originPoint.city, coords: originPoint.coords }} destination={{ city: destinationPoint.city, coords: destinationPoint.coords }} />
                  </section>
                ) : null}

                <section className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold tracking-[-0.02em] text-dark">Recipient details</h3>
                    <p className="text-sm leading-6 text-text-muted">These details support delivery coordination, OTP handoff, and support follow-up.</p>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <Input
                      label="Recipient name"
                      autoComplete="name"
                      helperText="Shown to the carrier during secure handoff."
                      {...register('recipient.name')}
                      error={formErrors?.recipient?.name?.message}
                    />
                    <Input
                      label="Recipient phone"
                      autoComplete="tel"
                      inputMode="tel"
                      helperText="Used for pickup or delivery coordination."
                      {...register('recipient.phone')}
                      error={formErrors?.recipient?.phone?.message}
                    />
                    <div className="lg:col-span-2">
                      <TextArea
                        label="Recipient address"
                        autoComplete="street-address"
                        helperText="Include building name, area, landmark, or gate instructions."
                        {...register('recipient.address')}
                        error={formErrors?.recipient?.address?.message}
                      />
                    </div>
                  </div>
                </section>

                <section className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold tracking-[-0.02em] text-dark">Preferred pickup window</h3>
                    <p className="text-sm leading-6 text-text-muted">Give carriers a realistic window so they can confirm availability with confidence.</p>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <Input
                      label="Earliest pickup"
                      labelHint="Local time"
                      type="datetime-local"
                      min={currentDateTime}
                      helperText="Use the first acceptable handoff time."
                      {...register('preferredDeliveryWindow.earliest')}
                      error={formErrors?.preferredDeliveryWindow?.earliest?.message}
                    />
                    <Input
                      label="Latest pickup"
                      labelHint="Local time"
                      type="datetime-local"
                      min={pickupEndMinimum}
                      helperText="Must be later than the earliest pickup time."
                      {...register('preferredDeliveryWindow.latest')}
                      error={formErrors?.preferredDeliveryWindow?.latest?.message}
                    />
                  </div>
                </section>
              </div>
            ) : null}

            {step === 2 ? (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <StatCard
                    label="Route"
                    value={selectedRouteLabel}
                    description="Selected pickup and destination cities."
                    icon={<MapPinned className="h-5 w-5" />}
                  />
                  <StatCard
                    label="Live carriers"
                    value={routeAvailabilityQuery.isLoading ? '...' : `${availableCarrierCount}`}
                    description="Verified carriers matching this lane right now."
                    icon={<Truck className="h-5 w-5" />}
                  />
                  <StatCard
                    label="Indicative quote"
                    value={liveEstimate != null ? `Rs. ${liveEstimate}` : 'Pending'}
                    description="A live estimate based on current matching routes."
                    icon={<IndianRupee className="h-5 w-5" />}
                  />
                </div>

                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_0.85fr]">
                  <Card className="space-y-4 bg-surface-alt/75" padding="md">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm font-semibold text-dark">
                        <Sparkles className="h-4 w-4 text-primary" />
                        Live lane intelligence
                      </div>
                      <p className="text-sm leading-6 text-text-muted">Carrier availability refreshes from the existing trip feed without changing your request payload.</p>
                    </div>

                    {routeAvailabilityQuery.isLoading ? (
                      <div className="rounded-[22px] border border-border/80 bg-white/90 px-4 py-5 text-sm text-text-muted">
                        Checking active carriers, route pricing, and likely handoff speed for this lane.
                      </div>
                    ) : routeAvailabilityQuery.isError ? (
                      <EmptyState
                        title="Unable to load live route intelligence"
                        description="You can still submit the request. Retry if you want a fresher view of carrier supply first."
                        icon={<AlertCircle className="h-5 w-5" />}
                        actions={
                          <Button type="button" variant="ghost" onClick={() => void routeAvailabilityQuery.refetch()}>
                            Retry lookup
                          </Button>
                        }
                      />
                    ) : availableCarrierCount ? (
                      <div className="space-y-3">
                        {liveTrips.slice(0, 3).map((trip: any) => (
                          <div key={trip._id} className="rounded-[22px] border border-border/80 bg-white/95 p-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="space-y-1">
                                <p className="text-sm font-semibold text-dark">
                                  {`${trip.origin?.city || originPoint?.city} -> ${trip.destination?.city || destinationPoint?.city}`}
                                </p>
                                <p className="text-sm text-text-muted">
                                  {(trip.transportDetails?.name || trip.modeOfTransport || 'Verified route').toString()}
                                </p>
                              </div>
                              <Badge tone="success">Live lane</Badge>
                            </div>
                            <div className="mt-3 grid gap-2 text-sm text-text-muted sm:grid-cols-2">
                              <p>Departure: {formatDateTime(trip.departureTime)}</p>
                              <p>From Rs. {Math.round(Number(trip.pricePerKg || 0) * packageWeight)}</p>
                            </div>
                          </div>
                        ))}
                        <Button type="button" variant="ghost" onClick={() => void routeAvailabilityQuery.refetch()}>
                          Refresh carrier availability
                        </Button>
                      </div>
                    ) : (
                      <EmptyState
                        title="No live carriers on this lane yet"
                        description="You can still submit now. We will notify you when a verified trip appears for this route."
                        icon={<Truck className="h-5 w-5" />}
                        actions={
                          <Button type="button" variant="ghost" onClick={() => void routeAvailabilityQuery.refetch()}>
                            Check again
                          </Button>
                        }
                      />
                    )}
                  </Card>

                  <Card className="space-y-4" padding="md">
                    <div className="space-y-1">
                      <h3 className="text-lg font-semibold tracking-[-0.02em] text-dark">Submission review</h3>
                      <p className="text-sm leading-6 text-text-muted">A quick final check before the request goes live to matching carriers.</p>
                    </div>

                    <div className="space-y-3 text-sm">
                      <div className="rounded-2xl border border-border/80 bg-surface-alt/60 p-4">
                        <p className="font-semibold text-dark">Parcel</p>
                        <p className="mt-1 text-text-muted">
                          {packageDescription || 'Description pending'} · {packageCategory} · {packageWeight || 0} kg
                        </p>
                        <p className="mt-2 text-text-muted">
                          Declared value: {declaredValue ? `Rs. ${declaredValue}` : 'Not provided'}
                        </p>
                        <p className="mt-1 text-text-muted">Handling: {packageIsFragile ? 'Fragile handling requested' : 'Standard handling'}</p>
                      </div>

                      <div className="rounded-2xl border border-border/80 bg-surface-alt/60 p-4">
                        <p className="font-semibold text-dark">Recipient</p>
                        <p className="mt-1 text-text-muted">{recipientName || 'Recipient pending'}</p>
                        <p className="mt-1 text-text-muted">{recipientPhone || 'Phone pending'}</p>
                        <p className="mt-1 text-text-muted">{recipientAddress || 'Address pending'}</p>
                      </div>

                      <div className="rounded-2xl border border-border/80 bg-surface-alt/60 p-4">
                        <p className="font-semibold text-dark">Pickup window</p>
                        <p className="mt-1 text-text-muted">Earliest: {pickupStart ? formatDateTime(pickupStart) : 'Pending'}</p>
                        <p className="mt-1 text-text-muted">Latest: {pickupEnd ? formatDateTime(pickupEnd) : 'Pending'}</p>
                      </div>
                    </div>
                  </Card>
                </div>
              </div>
            ) : null}

            <div className="flex flex-col-reverse gap-3 border-t border-border/80 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="button"
                variant="ghost"
                disabled={step === 0 || createMutation.isPending}
                onClick={() => setStep((currentStep) => Math.max(0, currentStep - 1))}
              >
                Back
              </Button>
              <div className="flex flex-col gap-3 sm:flex-row">
                {step < steps.length - 1 ? (
                  <Button key="btn-continue" type="button" onClick={nextStep}>
                    Continue
                  </Button>
                ) : (
                  <Button key="btn-submit" type="submit" data-testid="submit-package-button" disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Submitting request...' : 'Submit and find carriers'}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </Card>

        <div className="space-y-4 xl:sticky xl:top-28 xl:self-start">
          <Card className="space-y-4" padding="md">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold tracking-[-0.02em] text-dark">Request snapshot</h3>
              <Badge tone={requestReadyForSubmit ? 'success' : 'neutral'}>
                {requestReadyForSubmit ? 'Structured' : 'Incomplete'}
              </Badge>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-surface-alt/70 p-4">
                <MapPinned className="mt-0.5 h-4 w-4 text-primary" />
                <div className="space-y-1">
                  <p className="font-semibold text-dark">Lane</p>
                  <p className="text-text-muted">{selectedRouteLabel}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-surface-alt/70 p-4">
                <PackageCheck className="mt-0.5 h-4 w-4 text-primary" />
                <div className="space-y-1">
                  <p className="font-semibold text-dark">Package</p>
                  <p className="text-text-muted">
                    {packageCategory} · {packageWeight || 0} kg
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-surface-alt/70 p-4">
                <UserRound className="mt-0.5 h-4 w-4 text-primary" />
                <div className="space-y-1">
                  <p className="font-semibold text-dark">Recipient</p>
                  <p className="text-text-muted">{recipientName || 'Add recipient details'}</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-border/70 bg-surface-alt/70 p-4">
                <CalendarClock className="mt-0.5 h-4 w-4 text-primary" />
                <div className="space-y-1">
                  <p className="font-semibold text-dark">Pickup window</p>
                  <p className="text-text-muted">{pickupStart ? formatDateTime(pickupStart) : 'Select delivery timing'}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="space-y-4 bg-surface-alt/80" padding="md">
            <h3 className="text-lg font-semibold tracking-[-0.02em] text-dark">Operational safeguards</h3>
            <div className="space-y-3 text-sm text-text-muted">
              <p>Only selected city suggestions are used for route matching, which keeps downstream pricing and carrier ranking reliable.</p>
              <p>Recipient contact and pickup timing stay in the same request payload, so existing OTP, payment, and match flows continue unchanged.</p>
              <p>Lane intelligence uses the live trip feed you already have. If pricing or supply cannot be loaded, submission still works.</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
