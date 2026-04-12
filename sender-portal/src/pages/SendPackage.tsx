import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { captureAnalyticsEvent, captureClientError, trackFunnelStep } from 'hopdrop-shared';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { deliveryApi } from '../api/delivery.api';
import { tripApi } from '../api/trip.api';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { RouteAutocomplete } from '../components/map/RouteAutocomplete';
import { RoutePreviewMap } from '../components/map/RoutePreviewMap';
import { Select } from '../components/ui/Select';
import { TextArea } from '../components/ui/TextArea';
import { deliveryFormSchema } from '../validators/forms';

const steps = ['Package', 'Route', 'Review'];

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

export default function SendPackage() {
  const navigate = useNavigate();
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
  const packageWeightInput = watch('package.weightKg');
  const packageWeightValue = typeof packageWeightInput === 'string' ? Number.parseFloat(packageWeightInput) : Number(packageWeightInput);
  const packageWeight = Number.isFinite(packageWeightValue) ? packageWeightValue : 0;

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
          'preferredDeliveryWindow.earliest',
          'preferredDeliveryWindow.latest'
        ],
        []
      ];

      const valid = await trigger(fieldMap[step] as any, { shouldFocus: true });
      if (step === 1 && (!originPoint?.placeId || !destinationPoint?.placeId)) {
        captureAnalyticsEvent('sender_delivery_request_validation_failed', {
          step: steps[step],
          reason: 'route_suggestions_incomplete'
        });
        toast.error('Please select both cities from the suggestions list.');
        return;
      }
      if (!valid) {
        captureAnalyticsEvent('sender_delivery_request_validation_failed', {
          step: steps[step]
        });
        toast.error('Please fix the highlighted fields before continuing.');
        return;
      }

      captureAnalyticsEvent('sender_delivery_request_step_advanced', {
        from_step: steps[step],
        to_step: steps[Math.min(step + 1, steps.length - 1)]
      });
      setStep((prev) => Math.min(prev + 1, steps.length - 1));
    } catch (error) {
      console.error('Failed to advance the Send Package form', error);
      captureClientError(error, { source: 'sender_delivery_request_next_step', step: steps[step] });
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
  const selectedRouteLabel = originPoint && destinationPoint ? `${originPoint.city} → ${destinationPoint.city}` : 'your route';

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">Send Package</h1>
      <p className="text-sm text-text-muted">Step {step + 1} of {steps.length}: {steps[step]}</p>

      <div className="h-2 overflow-hidden rounded bg-gray-200">
        <div className="h-full bg-primary transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
      </div>

      <Card className="space-y-4">
        <form
          onSubmit={handleSubmit(
            (values) => createMutation.mutate(values),
            (invalidErrors) => {
              captureAnalyticsEvent('sender_delivery_request_validation_failed', {
                step: steps[step],
                stage: 'submit'
              });
              toast.error(getFirstErrorMessage(invalidErrors) || 'Please fix the highlighted fields before submitting.');
            }
          )}
          className="space-y-4"
        >
          {step === 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              <Select label="Category" {...register('package.category')} error={formErrors?.package?.category?.message}>
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
                    label="Weight (kg)"
                    type="number"
                    step="any"
                    value={field.value ?? ''}
                    onChange={(e) => {
                      const raw = e.target.value;
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
              <div className="md:col-span-2">
                <Controller
                  name="package.description"
                  control={control}
                  render={({ field, fieldState }) => (
                    <TextArea
                      label="Description"
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value)}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                      error={fieldState.error?.message}
                    />
                  )}
                />
              </div>
              <Input
                label="Declared value (₹)"
                type="number"
                step="any"
                {...register('package.declaredValue')}
                error={formErrors?.package?.declaredValue?.message}
              />
              <Input label="Photo URL (optional)" {...register('package.photoUrl')} error={formErrors?.package?.photoUrl?.message} />
            </div>
          ) : null}

          {step === 1 ? (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="md:col-span-2">
                <RouteAutocomplete
                  label="Origin City"
                  value={originPoint?.city || watch('origin.city') || ''}
                  field="origin"
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
                {formErrors?.origin?.city?.message ? (
                  <p className="mt-1 text-xs text-red-600">{formErrors.origin.city.message}</p>
                ) : null}
              </div>
              <div className="md:col-span-2">
                <RouteAutocomplete
                  label="Destination City"
                  value={destinationPoint?.city || watch('destination.city') || ''}
                  field="destination"
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
                {formErrors?.destination?.city?.message ? (
                  <p className="mt-1 text-xs text-red-600">{formErrors.destination.city.message}</p>
                ) : null}
              </div>
              <Input label="Recipient Name" {...register('recipient.name')} error={formErrors?.recipient?.name?.message} />
              <Input label="Recipient Phone" {...register('recipient.phone')} error={formErrors?.recipient?.phone?.message} />
              <div className="md:col-span-2">
                <TextArea label="Recipient Address" {...register('recipient.address')} error={formErrors?.recipient?.address?.message} />
              </div>
              <Input
                label="Earliest Pickup"
                type="datetime-local"
                {...register('preferredDeliveryWindow.earliest')}
                error={formErrors?.preferredDeliveryWindow?.earliest?.message}
              />
              <Input
                label="Latest Pickup"
                type="datetime-local"
                {...register('preferredDeliveryWindow.latest')}
                error={formErrors?.preferredDeliveryWindow?.latest?.message}
              />
              {originPoint && destinationPoint ? (
                <div className="md:col-span-2">
                  <RoutePreviewMap origin={{ city: originPoint.city, coords: originPoint.coords }} destination={{ city: destinationPoint.city, coords: destinationPoint.coords }} />
                </div>
              ) : null}
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-3">
              <Card className="bg-surface-alt">
                <p className="font-semibold">Instant estimate</p>
                <p className="text-sm text-text-muted">
                  {routeAvailabilityQuery.isLoading
                    ? `Checking live carrier pricing for ${selectedRouteLabel}...`
                    : liveEstimate != null
                      ? `Live rates on ${selectedRouteLabel} currently start around Rs. ${liveEstimate} for this package weight, before final match confirmation.`
                      : `No live carrier quote is available for ${selectedRouteLabel} yet. Submit the request and we will notify you as soon as a verified trip appears.`}
                </p>
              </Card>
              <Card className="bg-surface-alt">
                <p className="font-semibold">Live carrier availability</p>
                <p className="text-sm text-text-muted">
                  {routeAvailabilityQuery.isLoading
                    ? 'Scanning active trips from verified carriers...'
                    : availableCarrierCount
                      ? `${availableCarrierCount} verified carrier${availableCarrierCount === 1 ? '' : 's'} currently match ${selectedRouteLabel}.`
                      : `No verified carrier is live for ${selectedRouteLabel} right now.`}
                </p>
              </Card>
            </div>
          ) : null}

          <div className="flex justify-between">
            <Button type="button" variant="ghost" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
              Back
            </Button>
            {step < steps.length - 1 ? (
              <Button type="button" onClick={nextStep}>
                Next
              </Button>
            ) : (
              <Button type="submit">Submit & Find Carriers</Button>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
}
