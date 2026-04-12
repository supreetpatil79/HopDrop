import { motion } from 'framer-motion';
import { DELIVERY_REQUEST_ACTIVE_STATUSES, formatWorkflowStatus, getDeliveryRequestProgressPercent, trackCtaClick } from 'hopdrop-shared';
import { ShieldCheck, KeyRound, Landmark } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { tripApi } from '../api/trip.api';
import { deliveryApi } from '../api/delivery.api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

const steps = [
  'Post your trip or package',
  'Get intelligently matched',
  'Verify secure pickup OTP',
  'Delivered and auto-settled'
];

export default function Home() {
  const tripsQuery = useQuery({
    queryKey: ['home-trips-summary'],
    queryFn: () => tripApi.getTrips({ page: 1, limit: 100 }).then((res) => res.data.data)
  });
  const deliveriesQuery = useQuery({
    queryKey: ['home-deliveries-summary'],
    queryFn: () => deliveryApi.getMyRequests().then((res) => res.data.data)
  });

  const tripItems = tripsQuery.data?.items || [];
  const deliveryItems = deliveriesQuery.data || [];
  const liveTrip = tripItems[0];
  const liveDelivery =
    deliveryItems.find((item: any) => DELIVERY_REQUEST_ACTIVE_STATUSES.includes(item.status)) || deliveryItems[0];
  const delivered = deliveryItems.filter((item: any) => item.status === 'delivered');
  const citySet = new Set<string>();
  tripItems.forEach((trip: any) => {
    if (trip.origin?.city) citySet.add(String(trip.origin.city));
    if (trip.destination?.city) citySet.add(String(trip.destination.city));
  });

  const stats = [
    { label: 'Total Deliveries', value: `${delivered.length || 0}` },
    { label: 'Cities Covered', value: `${citySet.size || 0}` },
    { label: 'Avg Delivery Time', value: delivered.length ? 'Live' : 'Pending' }
  ];

  const tickerItems = deliveryItems.slice(0, 8).map((item: any) => `${item.origin?.city} → ${item.destination?.city} · ${item.status}`);
  const routePulseProgress =
    liveDelivery?.status != null
      ? getDeliveryRequestProgressPercent(liveDelivery.status)
      : tripItems.length
        ? 35
        : 12;
  const routeHeadline = liveTrip ? `${liveTrip.origin?.city} → ${liveTrip.destination?.city}` : 'Waiting for the next verified route';
  const routeCaption = liveTrip
    ? `${liveTrip.transportDetails?.name || liveTrip.modeOfTransport} · Departs ${new Date(liveTrip.departureTime).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short'
      })}`
    : 'Carrier trips appear here as soon as they go live';
  const statusHeadline = liveDelivery ? `Request status: ${formatWorkflowStatus(liveDelivery.status)}` : 'Pickup and delivery checkpoints will light up here';
  const statusCaption = liveDelivery
    ? `${liveDelivery.origin?.city} → ${liveDelivery.destination?.city}`
    : 'Escrow, OTP, and live tracking updates appear after matching';

  return (
    <div className="space-y-12">
      <section className="relative overflow-hidden rounded-2xl border border-border bg-dark px-6 py-12 text-white md:px-10">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -left-20 bottom-0 h-56 w-56 rounded-full bg-white/10 blur-3xl" />

        <div className="relative grid gap-8 md:grid-cols-2 md:items-center">
          <div className="space-y-5">
            <p className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
              Intercity Logistics, Reimagined
            </p>
            <h1 className="text-3xl font-bold leading-tight md:text-5xl">Uber-style package delivery via real travelers.</h1>
            <p className="max-w-lg text-sm text-gray-300 md:text-base">
              If someone is already traveling tonight from your city to your destination, HopDrop lets them safely carry your parcel,
              verified with OTP checkpoints and escrow-backed payments.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/send-package">
                <Button onClick={() => trackCtaClick('sender_home_send_package', { surface: 'hero' })}>Send a Package</Button>
              </Link>
              <a href="/carrier/post-trip">
                <Button
                  variant="ghost"
                  className="border border-white/20 bg-white/10 text-white hover:bg-white/20"
                  onClick={() => trackCtaClick('sender_home_become_carrier', { surface: 'hero' })}
                >
                  I'm Travelling — Earn Money
                </Button>
              </a>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="rounded-xl border border-white/15 bg-white/5 p-5"
          >
            <p className="mb-3 text-sm text-gray-300">Live route pulse</p>
            <div className="space-y-4">
              <div className="rounded-lg border border-white/10 bg-dark-surface p-3">
                <p className="text-sm">{routeHeadline}</p>
                <p className="text-xs text-gray-400">{routeCaption}</p>
              </div>
              <div className="h-2 overflow-hidden rounded bg-white/10">
                <motion.div
                  initial={{ width: '10%' }}
                  animate={{
                    width: [
                      `${Math.max(routePulseProgress - 18, 10)}%`,
                      `${routePulseProgress}%`,
                      `${Math.min(routePulseProgress + 6, 100)}%`
                    ]
                  }}
                  transition={{ duration: 5, repeat: Infinity }}
                  className="h-full bg-primary"
                />
              </div>
              <div className="rounded-lg border border-white/10 bg-dark-surface p-3">
                <p className="text-sm">{statusHeadline}</p>
                <p className="text-xs text-gray-400">{statusCaption}</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="bg-white/80">
            <p className="text-sm text-text-muted">{stat.label}</p>
            <p className="mt-2 text-2xl font-bold text-dark">{stat.value}</p>
          </Card>
        ))}
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-dark">How HopDrop Works</h2>
        <div className="grid gap-3 md:grid-cols-4">
          {steps.map((step, idx) => (
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.07 }}
              viewport={{ once: true }}
            >
              <Card>
                <p className="text-xs font-semibold text-primary">STEP {idx + 1}</p>
                <p className="mt-2 text-sm font-medium">{step}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <Card className="flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <div>
            <p className="font-semibold">Safety Deposit Protected</p>
            <p className="text-sm text-text-muted">Carrier deposit held securely until completion.</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3">
          <KeyRound className="h-5 w-5 text-primary" />
          <div>
            <p className="font-semibold">OTP Verification</p>
            <p className="text-sm text-text-muted">Pickup and delivery both require OTP validation.</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3">
          <Landmark className="h-5 w-5 text-primary" />
          <div>
            <p className="font-semibold">Razorpay Secured</p>
            <p className="text-sm text-text-muted">Escrow simulation and payout-ready transactions.</p>
          </div>
        </Card>
      </section>

      <section className="overflow-hidden rounded-lg border border-border bg-white">
        <p className="border-b border-border px-4 py-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
          Recent Public Deliveries
        </p>
        <p className="ticker whitespace-nowrap py-3 text-sm text-text-muted">
          {tickerItems.length ? `${tickerItems.join(' · ')} ·` : 'Live deliveries will appear here as matches update ·'}
        </p>
      </section>
    </div>
  );
}
