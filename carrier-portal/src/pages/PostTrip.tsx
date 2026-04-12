import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { captureAnalyticsEvent, captureClientError, trackFunnelStep } from 'hopdrop-shared';
import { RouteAutocomplete } from '../components/map/RouteAutocomplete';
import { RoutePreviewMap } from '../components/map/RoutePreviewMap';
import { RazorpayButton } from '../components/ui/RazorpayButton';
import { Input } from '../components/ui/Input';
import { tripApi } from '../api/trip.api';

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

const steps = ['Route', 'Schedule', 'Capacity', 'Deposit'];

const transportModes: Array<{ mode: TransportMode; icon: string; label: string }> = [
  { mode: 'train', icon: '🚂', label: 'Train' },
  { mode: 'bus', icon: '🚌', label: 'Bus' },
  { mode: 'car', icon: '🚗', label: 'Car' },
  { mode: 'flight', icon: '✈️', label: 'Flight' },
  { mode: 'bike', icon: '🏍️', label: 'Bike' }
];

const categories: Category[] = ['documents', 'clothing', 'electronics', 'food', 'medicine', 'fragile', 'other'];

export default function PostTrip() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
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

  const estimatedEarning = useMemo(() => Math.round(formData.pricePerKg * 5 * 0.88), [formData.pricePerKg]);

  const canProceed = () => {
    if (step === 1) {
      return Boolean(formData.origin.placeId && formData.destination.placeId);
    }
    if (step === 2) {
      return Boolean(formData.departureTime);
    }
    if (step === 3) {
      return formData.totalWeightKg > 0 && formData.allowedCategories.length > 0;
    }
    return true;
  };

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

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-2 py-4">
      <h1 className="text-3xl font-bold text-dark">Post Trip</h1>

      <div>
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-text-muted">Step {step} of {steps.length}: {steps[step - 1]}</span>
          <span className="font-semibold text-primary">{Math.round((step / steps.length) * 100)}%</span>
        </div>
        <div className="h-1.5 rounded bg-gray-200">
          <div className="h-full rounded bg-primary transition-all" style={{ width: `${(step / steps.length) * 100}%` }} />
        </div>
      </div>

      <div className="space-y-5 rounded-2xl border border-[#1e2130] bg-[#0f1117] p-6 text-white">
        {step === 1 ? (
          <div className="space-y-4">
            <RouteAutocomplete
              label="Origin City"
              value={formData.origin.city}
              field="origin"
              onInputChange={(city) =>
                setFormData((prev) => ({
                  ...prev,
                  origin: { city, placeId: '', coords: null }
                }))
              }
              onChange={(city, placeId, coords) => setFormData((prev) => ({ ...prev, origin: { city, placeId, coords } }))}
              placeholder="Where are you travelling from?"
            />

            <RouteAutocomplete
              label="Destination City"
              value={formData.destination.city}
              field="destination"
              onInputChange={(city) =>
                setFormData((prev) => ({
                  ...prev,
                  destination: { city, placeId: '', coords: null }
                }))
              }
              onChange={(city, placeId, coords) => setFormData((prev) => ({ ...prev, destination: { city, placeId, coords } }))}
              placeholder="Where are you going?"
            />

            <div>
              <label className="mb-2 block text-sm text-white/60">Transport Mode</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                {transportModes.map((mode) => (
                  <button
                    key={mode.mode}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, modeOfTransport: mode.mode }))}
                    className={`rounded-xl border-2 px-2 py-3 text-center transition ${formData.modeOfTransport === mode.mode ? 'border-primary bg-primary/10' : 'border-[#2a2d35] bg-[#1a1d23]'}`}
                  >
                    <div className="text-2xl">{mode.icon}</div>
                    <div className={`mt-1 text-xs ${formData.modeOfTransport === mode.mode ? 'text-primary' : 'text-white/60'}`}>{mode.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {formData.origin.coords && formData.destination.coords ? (
              <RoutePreviewMap
                origin={{ city: formData.origin.city, coords: formData.origin.coords }}
                destination={{ city: formData.destination.city, coords: formData.destination.coords }}
                onDistanceFetched={(km, hours) => setFormData((prev) => ({ ...prev, distanceKm: km, durationHours: hours }))}
              />
            ) : null}
          </div>
        ) : null}

        {step === 2 ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Departure Date & Time"
              type="datetime-local"
              min={new Date().toISOString().slice(0, 16)}
              value={formData.departureTime}
              onChange={(e) => setFormData((prev) => ({ ...prev, departureTime: e.target.value }))}
              className="bg-[#1a1d23] text-white"
            />
            <Input
              label="Estimated Arrival (optional)"
              type="datetime-local"
              value={formData.estimatedArrivalTime}
              onChange={(e) => setFormData((prev) => ({ ...prev, estimatedArrivalTime: e.target.value }))}
              className="bg-[#1a1d23] text-white"
            />
            <Input
              label="Transport Name"
              placeholder="Rajdhani Express"
              value={formData.transportName}
              onChange={(e) => setFormData((prev) => ({ ...prev, transportName: e.target.value }))}
              className="bg-[#1a1d23] text-white"
            />
            <Input
              label="PNR / Booking Reference"
              value={formData.pnr}
              onChange={(e) => setFormData((prev) => ({ ...prev, pnr: e.target.value }))}
              className="bg-[#1a1d23] text-white"
            />
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-5">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm text-white/70">
                <label>Max Weight You Can Carry</label>
                <span className="font-bold text-primary">{formData.totalWeightKg} kg</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={30}
                step={0.5}
                value={formData.totalWeightKg}
                onChange={(e) => setFormData((prev) => ({ ...prev, totalWeightKg: Number(e.target.value) }))}
                className="w-full accent-primary"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-sm text-white/70">
                <label>Your Rate</label>
                <span className="font-bold text-primary">₹{formData.pricePerKg}/kg</span>
              </div>
              <input
                type="range"
                min={20}
                max={500}
                step={10}
                value={formData.pricePerKg}
                onChange={(e) => setFormData((prev) => ({ ...prev, pricePerKg: Number(e.target.value) }))}
                className="w-full accent-primary"
              />
            </div>

            <div className="rounded-xl border border-primary/30 bg-primary/10 p-4">
              <div className="text-xs text-white/60">Estimated earnings (5kg package)</div>
              <div className="text-3xl font-bold text-primary">₹{estimatedEarning}</div>
              <div className="text-xs text-white/50">After 12% platform fee</div>
            </div>

            <div>
              <label className="mb-2 block text-sm text-white/60">What can you carry?</label>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        allowedCategories: prev.allowedCategories.includes(category)
                          ? prev.allowedCategories.filter((value) => value !== category)
                          : [...prev.allowedCategories, category]
                      }))
                    }
                    className={`rounded-full border px-3 py-1 text-sm capitalize ${formData.allowedCategories.includes(category) ? 'border-primary bg-primary/15 text-primary' : 'border-[#2a2d35] bg-[#1a1d23] text-white/60'}`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            <Input
              label="Pickup Instructions"
              placeholder="Platform 3, Bengaluru City Station"
              value={formData.pickupInstructions}
              onChange={(e) => setFormData((prev) => ({ ...prev, pickupInstructions: e.target.value }))}
              className="bg-[#1a1d23] text-white"
            />
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-[#2a2d35] bg-[#1a1d23] p-4">
              <div className="mb-3 text-xs font-semibold tracking-wider text-white/50">TRIP SUMMARY</div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between border-b border-[#2a2d35] pb-2"><span className="text-white/50">Route</span><span>{formData.origin.city} → {formData.destination.city}</span></div>
                <div className="flex justify-between border-b border-[#2a2d35] pb-2"><span className="text-white/50">Distance</span><span>{formData.distanceKm || '-'} km</span></div>
                <div className="flex justify-between border-b border-[#2a2d35] pb-2"><span className="text-white/50">Departure</span><span>{formData.departureTime ? new Date(formData.departureTime).toLocaleString('en-IN') : '-'}</span></div>
                <div className="flex justify-between border-b border-[#2a2d35] pb-2"><span className="text-white/50">Transport</span><span>{formData.modeOfTransport} · {formData.transportName || '-'}</span></div>
                <div className="flex justify-between border-b border-[#2a2d35] pb-2"><span className="text-white/50">Capacity</span><span>{formData.totalWeightKg} kg</span></div>
                <div className="flex justify-between"><span className="text-white/50">Rate</span><span>₹{formData.pricePerKg}/kg</span></div>
              </div>
            </div>

            <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4">
              <div className="mb-1 font-semibold text-amber-300">Safety Deposit: ₹500</div>
              <p className="text-sm text-white/70">Refundable deposit held while trip is active. Auto-released after successful delivery.</p>
            </div>

            <RazorpayButton
              label={submitting ? 'Posting trip...' : 'Pay ₹500 Safety Deposit & Post Trip'}
              amount={50000}
              onSuccess={(paymentId, orderId, signature) => void submitTrip(paymentId, orderId, signature)}
              createOrderFn={async () => {
                const res = await tripApi.createPreTripDepositOrder();
                return res.data.data;
              }}
            />
          </div>
        ) : null}
      </div>

      {step < 4 ? (
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setStep((prev) => Math.max(1, prev - 1))}
            disabled={step === 1}
            className={`rounded-md border px-6 py-2 ${step === 1 ? 'cursor-not-allowed border-[#2a2d35] text-white/30' : 'border-[#2a2d35] text-white/70 hover:bg-white/5'}`}
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => {
              if (canProceed()) {
                captureAnalyticsEvent('carrier_trip_post_step_advanced', {
                  from_step: steps[step - 1],
                  to_step: steps[Math.min(step, steps.length - 1)]
                });
                setStep((prev) => Math.min(4, prev + 1));
              } else {
                captureAnalyticsEvent('carrier_trip_post_validation_failed', {
                  step: steps[step - 1]
                });
                toast.error('Please complete required fields for this step');
              }
            }}
            className={`rounded-md px-8 py-2 font-bold ${canProceed() ? 'bg-primary text-black' : 'cursor-not-allowed bg-[#2a2d35] text-white/40'}`}
          >
            Next →
          </button>
        </div>
      ) : null}
    </div>
  );
}
