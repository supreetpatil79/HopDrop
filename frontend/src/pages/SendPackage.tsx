import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { deliveryApi } from '../api/delivery.api';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { TextArea } from '../components/ui/TextArea';
import { deliveryFormSchema } from '../validators/forms';

const steps = ['Package', 'Route', 'Review'];

export default function SendPackage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    formState: { errors }
  } = useForm<any>({
    resolver: zodResolver(deliveryFormSchema),
    defaultValues: {
      package: {
        category: 'documents',
        weightKg: 1,
        isFragile: false
      }
    }
  });
  const formErrors: any = errors;

  const createMutation = useMutation({
    mutationFn: (payload: any) => deliveryApi.createRequest(payload),
    onSuccess: (response) => {
      const requestId = response.data.data._id;
      toast.success('Delivery request posted');
      navigate(`/browse-trips?requestId=${requestId}`);
    }
  });

  const nextStep = async () => {
    const fieldMap = [
      ['package.category', 'package.description', 'package.weightKg'],
      ['origin.city', 'destination.city', 'recipient.name', 'recipient.phone', 'recipient.address', 'preferredDeliveryWindow.earliest'],
      []
    ];

    const valid = await trigger(fieldMap[step] as any);
    if (!valid) {
      return;
    }

    setStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">Send Package</h1>
      <p className="text-sm text-text-muted">Step {step + 1} of {steps.length}: {steps[step]}</p>

      <div className="h-2 overflow-hidden rounded bg-gray-200">
        <div className="h-full bg-primary transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
      </div>

      <Card className="space-y-4">
        <form onSubmit={handleSubmit((values) => createMutation.mutate(values))} className="space-y-4">
          {step === 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              <Select label="Category" {...register('package.category')}>
                <option value="documents">Documents</option>
                <option value="clothing">Clothing</option>
                <option value="electronics">Electronics</option>
                <option value="food">Food</option>
                <option value="fragile">Fragile</option>
                <option value="medicine">Medicine</option>
                <option value="other">Other</option>
              </Select>
              <Input
                label="Weight (kg)"
                type="number"
                step="0.1"
                {...register('package.weightKg', { valueAsNumber: true })}
                error={formErrors?.package?.weightKg?.message}
              />
              <div className="md:col-span-2">
                <TextArea label="Description" {...register('package.description')} error={formErrors?.package?.description?.message} />
              </div>
              <Input label="Declared value (₹)" type="number" {...register('package.declaredValue', { valueAsNumber: true })} />
              <Input label="Photo URL (optional)" {...register('package.photoUrl')} />
            </div>
          ) : null}

          {step === 1 ? (
            <div className="grid gap-3 md:grid-cols-2">
              <Input label="Origin City" {...register('origin.city')} error={formErrors?.origin?.city?.message} />
              <Input label="Destination City" {...register('destination.city')} error={formErrors?.destination?.city?.message} />
              <Input label="Recipient Name" {...register('recipient.name')} error={formErrors?.recipient?.name?.message} />
              <Input label="Recipient Phone" {...register('recipient.phone')} error={formErrors?.recipient?.phone?.message} />
              <div className="md:col-span-2">
                <TextArea label="Recipient Address" {...register('recipient.address')} error={formErrors?.recipient?.address?.message} />
              </div>
              <Input label="Earliest Pickup" type="datetime-local" {...register('preferredDeliveryWindow.earliest')} />
              <Input label="Latest Pickup" type="datetime-local" {...register('preferredDeliveryWindow.latest')} />
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-3">
              <Card className="bg-surface-alt">
                <p className="font-semibold">Instant estimate</p>
                <p className="text-sm text-text-muted">Expected quote will be generated after matching with carrier rates.</p>
              </Card>
              <Card className="bg-surface-alt">
                <p className="font-semibold">Live carrier availability</p>
                <p className="text-sm text-text-muted">3 carriers available on this route today (estimated)</p>
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
