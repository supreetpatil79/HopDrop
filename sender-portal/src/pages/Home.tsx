import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion, useInView } from 'framer-motion';
import {
  DELIVERY_REQUEST_ACTIVE_STATUSES,
  formatWorkflowStatus,
  getDeliveryRequestProgressPercent,
  trackCtaClick
} from 'hopdrop-shared';
import { ArrowRight, Clock3, KeyRound, Landmark, Package, Plane, Search, ShieldCheck, TrendingUp, Zap } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { deliveryApi } from '../api/delivery.api';
import { tripApi } from '../api/trip.api';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

// ---------------------------------------------------------------------------
// Data & Content (Purely Sender Focused)
// ---------------------------------------------------------------------------

const HOW_IT_WORKS = [
  {
    number: '01',
    icon: <Package className="h-4 w-4" />,
    title: 'Post your package',
    description:
      'Enter parcel details, pickup & drop cities, and recipient contact. Takes under 60 seconds.'
  },
  {
    number: '02',
    icon: <Zap className="h-4 w-4" />,
    title: 'Instant carrier matching',
    description:
      'Our spatial engine matches your request with verified travelers already scheduled on the corridor.'
  },
  {
    number: '03',
    icon: <KeyRound className="h-4 w-4" />,
    title: 'Dual-OTP secure handoff',
    description:
      'Carrier receives the parcel only after verifying the 6-digit Pickup OTP. The ₹10 seal locks the package.'
  },
  {
    number: '04',
    icon: <ShieldCheck className="h-4 w-4" />,
    title: 'Safe delivery & release',
    description:
      'Recipient confirms package condition with the final Delivery OTP. Escrow payment is settled automatically.'
  }
];

const TRUST_PILLARS = [
  {
    icon: <Landmark className="h-5 w-5 text-emerald-600" />,
    title: 'Multi-Party Escrow',
    description:
      'Your payment stays secured in platform escrow until recipient confirms intact delivery via OTP.'
  },
  {
    icon: <KeyRound className="h-5 w-5 text-emerald-600" />,
    title: 'Dual-OTP Verification',
    description:
      'Cryptographic 6-digit OTPs ensure chain of custody from your doorstep to the recipient.'
  },
  {
    icon: <ShieldCheck className="h-5 w-5 text-emerald-600" />,
    title: 'Government ID Verified',
    description:
      'Every carrier is Aadhaar/Govt ID verified and deposits a safety bond before accepting shipments.'
  }
];

const SENDER_QUOTES = [
  {
    quote:
      'I needed to send an urgent laptop charger to my colleague in Hyderabad. HopDrop matched a traveler leaving on the 2 PM flight. Arrived before dinner!',
    name: 'Priya Menon',
    role: 'Product Lead, Bengaluru',
    route: 'BLR → HYD',
    initials: 'PM'
  },
  {
    quote:
      'Sent urgent legal contracts to Mumbai for an urgent morning filing. 4.5 hours transit, real-time live updates, and the ₹10 seal was completely intact.',
    name: 'Aditya Sharma',
    role: 'Senior Advocate, New Delhi',
    route: 'DEL → MUM',
    initials: 'AS'
  },
  {
    quote:
      'As a boutique D2C brand, same-day intercity shipping gives us an unfair advantage. HopDrop is 2x faster than traditional air cargo at half the price.',
    name: 'Shreya Kapoor',
    role: 'Founder, Kira Essentials',
    route: 'PNQ → BLR',
    initials: 'SK'
  },
  {
    quote:
      'Urgent medical reports sent from Chennai to Bengaluru. Handed over at Central station and delivered directly to the hospital in 5 hours flat.',
    name: 'Vikram Sundaram',
    role: 'Healthcare Consultant, Chennai',
    route: 'MAA → BLR',
    initials: 'VS'
  }
];

// ---------------------------------------------------------------------------
// Animation Config
// ---------------------------------------------------------------------------

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0 }
};

const stagger = {
  show: { transition: { staggerChildren: 0.08 } }
};

function TrustMetrics() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-40px' });

  const metrics = [
    { value: '18,400+', label: 'Parcels Delivered', icon: <Package className="h-4 w-4 text-emerald-600" /> },
    { value: '28', label: 'Active Transit Corridors', icon: <Plane className="h-4 w-4 text-blue-600" /> },
    { value: '4.2 hrs', label: 'Average Transit Time', icon: <Clock3 className="h-4 w-4 text-amber-600" /> },
    { value: '99.8%', label: 'Intact Delivery Rate', icon: <TrendingUp className="h-4 w-4 text-violet-600" /> }
  ];

  return (
    <div ref={ref} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((m, i) => (
        <motion.div
          key={m.label}
          initial={{ opacity: 0, y: 16 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: i * 0.08, duration: 0.4 }}
        >
          <Card className="p-5" interactive>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{m.label}</span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100">{m.icon}</div>
            </div>
            <p className="mt-3 text-2xl font-bold tracking-tight text-zinc-950 tabular-nums">{m.value}</p>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

function QuoteCarousel() {
  const [active, setActive] = useState(0);

  return (
    <div className="space-y-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="relative p-6 sm:p-8" interactive>
            <span className="absolute right-6 top-4 select-none font-serif text-8xl leading-none text-zinc-100" aria-hidden="true">
              &ldquo;
            </span>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {SENDER_QUOTES[active].route}
            </span>

            <p className="mt-4 text-base font-medium italic leading-relaxed text-zinc-800">
              &ldquo;{SENDER_QUOTES[active].quote}&rdquo;
            </p>

            <div className="mt-6 flex items-center gap-3 border-t border-zinc-100 pt-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-xs font-bold text-white">
                {SENDER_QUOTES[active].initials}
              </span>
              <div>
                <p className="text-xs font-bold text-zinc-900">{SENDER_QUOTES[active].name}</p>
                <p className="text-[11px] text-zinc-500">{SENDER_QUOTES[active].role}</p>
              </div>
            </div>
          </Card>
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center justify-center gap-2">
        {SENDER_QUOTES.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setActive(i)}
            aria-label={`Show quote ${i + 1}`}
            className={[
              'rounded-full transition-all duration-200',
              i === active ? 'h-2 w-6 bg-zinc-950' : 'h-2 w-2 bg-zinc-300 hover:bg-zinc-400'
            ].join(' ')}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function Home() {
  const tripsQuery = useQuery({
    queryKey: ['home-trips-summary'],
    queryFn: () => tripApi.getTrips({ page: 1, limit: 10 }).then((res) => res.data.data)
  });
  const deliveriesQuery = useQuery({
    queryKey: ['home-deliveries-summary'],
    queryFn: () => deliveryApi.getMyRequests().then((res) => res.data.data)
  });

  const tripItems = tripsQuery.data?.items || [];
  const deliveryItems = deliveriesQuery.data || [];
  const liveTrip = tripItems[0];
  const liveDelivery =
    deliveryItems.find((item: any) => DELIVERY_REQUEST_ACTIVE_STATUSES.includes(item.status)) ||
    deliveryItems[0];

  const tickerItems = deliveryItems
    .slice(0, 8)
    .map(
      (item: any) =>
        `${item.origin?.city} → ${item.destination?.city} · ${formatWorkflowStatus(item.status)}`
    );

  const routePulseProgress =
    liveDelivery?.status != null
      ? getDeliveryRequestProgressPercent(liveDelivery.status)
      : tripItems.length
        ? 45
        : 15;

  return (
    <motion.div className="space-y-12" variants={stagger} initial="hidden" animate="show">
      {/* ── SENDER HERO ── */}
      <motion.section
        variants={fadeUp}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 px-6 py-12 text-white shadow-2xl md:px-10"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            background:
              'radial-gradient(ellipse 70% 50% at 60% 80%, rgba(16,185,129,0.20) 0%, transparent 70%)'
          }}
        />

        <div className="relative grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/90 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-emerald-400">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              Verified Intercity Parcel Network
            </div>

            <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl md:text-5xl">
              Fast, secure intercity parcel delivery
              <br />
              <span className="text-emerald-400">with verified travelers.</span>
            </h1>

            <p className="max-w-xl text-sm leading-relaxed text-zinc-400 sm:text-base">
              Send packages across India on scheduled flights, trains, and direct express routes.
              Protected by dual-OTP custody verification and automated escrow settlement.
            </p>

            <div className="flex flex-wrap gap-3 pt-1">
              <Link to="/send-package">
                <Button
                  variant="secondary"
                  size="lg"
                  className="bg-white text-zinc-950 font-bold hover:bg-zinc-100 shadow-md"
                  onClick={() => trackCtaClick('sender_home_send_package', { surface: 'hero' })}
                >
                  Send a Package <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
              <Link to="/browse-carriers">
                <Button
                  variant="subtle"
                  size="lg"
                  onClick={() => trackCtaClick('sender_home_browse_carriers', { surface: 'hero' })}
                >
                  <Search className="h-4 w-4 mr-1.5" /> Browse Active Corridors
                </Button>
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-5 pt-1 text-xs font-medium text-zinc-400">
              {[
                { icon: <ShieldCheck className="h-4 w-4 text-emerald-400" />, label: 'Multi-Party Escrow' },
                { icon: <KeyRound className="h-4 w-4 text-emerald-400" />, label: 'Dual OTP Lock' },
                { icon: <Clock3 className="h-4 w-4 text-emerald-400" />, label: 'Same-Day Intercity' }
              ].map(({ icon, label }) => (
                <span key={label} className="flex items-center gap-1.5">
                  {icon}
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Right: Live Transit HUD */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                  Live Corridor Feed
                </span>
              </div>
              <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-400 font-mono">
                ACTIVE
              </span>
            </div>

            <div className="space-y-3">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  Next Departure Corridor
                </span>
                <p className="text-sm font-bold text-white flex items-center justify-between">
                  <span>{liveTrip ? `${liveTrip.origin?.city} → ${liveTrip.destination?.city}` : 'Bengaluru → Hyderabad'}</span>
                  <span className="text-xs font-semibold text-emerald-400">Available</span>
                </p>
                <p className="text-xs text-zinc-400">
                  {liveTrip
                    ? `${liveTrip.transportDetails?.name || liveTrip.modeOfTransport} · ${liveTrip.availableCapacity?.weightKg} kg space`
                    : 'Daily Vande Bharat Express & Flights · Sub-6 hr arrival'}
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] text-zinc-400 font-medium">
                  <span>Corridor Transit Status</span>
                  <span className="font-mono">{routePulseProgress}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                  <motion.div
                    initial={{ width: '20%' }}
                    animate={{ width: `${routePulseProgress}%` }}
                    transition={{ duration: 1.2, ease: 'easeOut' }}
                    className="h-full bg-emerald-500 rounded-full"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  Active Package Tracking
                </span>
                <p className="text-sm font-bold text-white">
                  {liveDelivery ? `Status: ${formatWorkflowStatus(liveDelivery.status)}` : 'Ready to Dispatch'}
                </p>
                <p className="text-xs text-zinc-400">
                  {liveDelivery ? `${liveDelivery.origin?.city} → ${liveDelivery.destination?.city}` : 'Post your package to start live GPS & OTP tracking'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ── METRICS ── */}
      <motion.section variants={fadeUp}>
        <div className="mb-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Network Telemetry</span>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-zinc-950 sm:text-2xl">Proven reliability at scale</h2>
        </div>
        <TrustMetrics />
      </motion.section>

      {/* ── HOW IT WORKS ── */}
      <motion.section variants={fadeUp}>
        <div className="mb-6">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Step by Step</span>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-zinc-950 sm:text-2xl">How to send a package</h2>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Timeline */}
          <div className="space-y-4">
            {HOW_IT_WORKS.map((step, idx) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.08 }}
                className="flex items-start gap-4 rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-xs transition-all hover:border-zinc-300"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-950 text-white font-mono text-sm font-bold">
                  {step.number}
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-950">{step.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-500">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* ₹10 Banknote Tamper Seal Card */}
          <Card variant="dark" className="flex flex-col justify-between gap-6 p-6 sm:p-8">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Zero-Hardware Security Protocol
              </span>
              <h3 className="mt-3 text-xl font-bold text-white">The ₹10 Banknote Tamper Seal</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                No expensive proprietary packaging needed. Simply tape any ₹10 currency note across the box seam.
                The app scans its unique RBI serial number and cryptographically locks it to your shipment manifest.
              </p>
            </div>

            <div className="space-y-3 border-y border-zinc-800 py-4">
              {[
                '1. Tape a ₹10 note across the package opening seam',
                '2. AI scans and logs the unique RBI serial number',
                '3. Serial is bound to the Pickup OTP handoff',
                '4. Recipient verifies seal is untorn before sharing Delivery OTP'
              ].map((text, idx) => (
                <div key={idx} className="flex items-center gap-2.5 text-xs text-zinc-300 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                  {text}
                </div>
              ))}
            </div>

            <Link to="/send-package">
              <Button variant="secondary" fullWidth className="bg-white text-zinc-950 font-bold hover:bg-zinc-100">
                Send a Package Now
              </Button>
            </Link>
          </Card>
        </div>
      </motion.section>

      {/* ── TESTIMONIALS ── */}
      <motion.section variants={fadeUp}>
        <div className="mb-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Sender Reviews</span>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-zinc-950 sm:text-2xl">Trusted by senders across India</h2>
        </div>
        <QuoteCarousel />
      </motion.section>

      {/* ── TRUST PILLARS ── */}
      <motion.section variants={fadeUp} className="grid gap-4 sm:grid-cols-3">
        {TRUST_PILLARS.map((pillar, i) => (
          <motion.div
            key={pillar.title}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
          >
            <Card className="h-full space-y-2 p-5" interactive>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                {pillar.icon}
              </div>
              <h3 className="text-sm font-bold text-zinc-950">{pillar.title}</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">{pillar.description}</p>
            </Card>
          </motion.div>
        ))}
      </motion.section>

      {/* ── RECENT TICKER ── */}
      <motion.section variants={fadeUp}>
        <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Recent Deliveries Feed</span>
            <Link to="/browse-carriers" className="text-xs font-semibold text-zinc-950 hover:underline">
              View all corridors →
            </Link>
          </div>
          <p className="ticker whitespace-nowrap py-3 text-sm text-zinc-600 font-medium">
            {tickerItems.length
              ? `${tickerItems.join('  ·  ')}  ·  `
              : 'Bengaluru → Hyderabad (Delivered)  ·  Delhi → Mumbai (In Transit)  ·  Pune → Bengaluru (Matched)  ·  '}
          </p>
        </div>
      </motion.section>
    </motion.div>
  );
}
