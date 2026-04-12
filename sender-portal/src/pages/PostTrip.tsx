import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { tripApi } from '../api/trip.api';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { tripFormSchema } from '../validators/forms';

const steps = ['Route', 'Schedule', 'Capacity', 'Safety Deposit'];

export default function PostTrip() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    formState: { errors }
  } = useForm<any>({
    resolver: zodResolver(tripFormSchema),
    defaultValues: {
      modeOfTransport: 'train',
      availableCapacity: {
        weightKg: 5,
        dimensionsCm: {},
        allowedCategories: ['documents']
      },
      transportDetails: {}
    }
  });
  const formErrors: any = errors;

  const createTripMutation = useMutation({
    mutationFn: async (payload: any) => {
      const tripResponse = await tripApi.createTrip(payload);
      const trip = tripResponse.data.data;

      const orderRes = await tripApi.payDeposit(trip._id);
      const order = orderRes.data.data.order || { id: orderRes.data.data.orderId || `mock_order_${Date.now()}` };

      await tripApi.confirmDeposit(trip._id, {
        razorpayOrderId: order.id,
        razorpayPaymentId: `mock_pay_${Date.now()}`,
        razorpaySignature: 'mock_signature'
      });

      return trip;
    },
    onSuccess: () => {
      toast.success('Trip posted and deposit processed');
      navigate('/my-trips');
    },
    onError: () => toast.error('Trip created, but deposit confirmation failed. You can retry from My Trips.')
  });

  const nextStep = async () => {
    const fieldMap = [
      ['origin.city', 'destination.city', 'modeOfTransport'],
      ['departureTime', 'estimatedArrivalTime', 'transportDetails.name'],
      ['availableCapacity.weightKg', 'availableCapacity.allowedCategories', 'pricePerKg'],
      []
    ];

    const valid = await trigger(fieldMap[step] as any);
    if (!valid) {
      return;
    }

    setStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const prevStep = () => setStep((prev) => Math.max(0, prev - 1));

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">Post Trip</h1>
      <p className="text-sm text-text-muted">Step {step + 1} of {steps.length}: {steps[step]}</p>

      <div className="h-2 overflow-hidden rounded bg-gray-200">
        <div className="h-full bg-primary transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
      </div>

      <Card className="space-y-4">
        <form onSubmit={handleSubmit((values) => createTripMutation.mutate(values))} className="space-y-4">
          {step === 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              <Input label="Origin City" {...register('origin.city')} error={formErrors?.origin?.city?.message} />
              <Input label="Destination City" {...register('destination.city')} error={formErrors?.destination?.city?.message} />
              <Select label="Transport Mode" {...register('modeOfTransport')}>
                <option value="bus">Bus</option>
                <option value="train">Train</option>
                <option value="car">Car</option>
                <option value="bike">Bike</option>
                <option value="flight">Flight</option>
                <option value="other">Other</option>
              </Select>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="grid gap-3 md:grid-cols-2">
              <Input label="Departure" type="datetime-local" {...register('departureTime')} error={formErrors?.departureTime?.message} />
              <Input label="Estimated Arrival" type="datetime-local" {...register('estimatedArrivalTime')} error={formErrors?.estimatedArrivalTime?.message} />
              <Input label="Transport Name" placeholder="Rajdhani Express" {...register('transportDetails.name')} />
              <Input label="PNR (optional)" {...register('transportDetails.pnr')} />
            </div>
          ) : null}

          {step === 2 ? (
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                label="Weight Capacity (kg)"
                type="number"
                min={1}
                max={30}
                {...register('availableCapacity.weightKg', { valueAsNumber: true })}
                error={formErrors?.availableCapacity?.weightKg?.message}
              />
              <Input
                label="Price per kg (₹)"
                type="number"
                min={1}
                {...register('pricePerKg', { valueAsNumber: true })}
                error={formErrors?.pricePerKg?.message}
              />
              <Input label="Allowed Categories (comma separated)" {...register('availableCapacity.allowedCategories.0')} />
              <Input label="Pickup Instructions" {...register('pickupInstructions')} />
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-3">
              <Card className="bg-surface-alt">
                <h3 className="font-semibold">Safety Deposit</h3>
                <p className="text-sm text-text-muted">₹500 deposit held in escrow until delivery confirmation.</p>
              </Card>

              <Card className="bg-surface-alt">
                <h3 className="font-semibold">Summary</h3>
                <p className="text-sm text-text-muted">{watch('origin.city')} → {watch('destination.city')}</p>
                <p className="text-sm text-text-muted">{watch('modeOfTransport')} · {watch('availableCapacity.weightKg')}kg capacity</p>
                <p className="text-sm text-text-muted">₹{watch('pricePerKg')} per kg</p>
              </Card>
            </div>
          ) : null}

          <div className="flex justify-between">
            <Button type="button" variant="ghost" onClick={prevStep} disabled={step === 0}>
              Back
            </Button>
            {step < steps.length - 1 ? (
              <Button type="button" onClick={nextStep}>
                Next
              </Button>
            ) : (
              <Button type="submit" disabled={createTripMutation.isPending}>
                Confirm & Pay Deposit
              </Button>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
}
