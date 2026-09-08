import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, KeyRound, Landmark, Package, ShieldCheck, Zap } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { deliveryApi } from '../api/delivery.api';

// ─── Data ────────────────────────────────────────────────────────────────────

const HOW_IT_WORKS = [
  {
    number: '01',
    title: 'Post your package',
    description: 'Enter pickup & drop cities, parcel weight, and recipient details. Under 60 seconds.',
    icon: Package,
  },
  {
    number: '02',
    title: 'Instant carrier match',
    description: 'Our engine matches you with a verified traveler already headed to your destination.',
    icon: Zap,
  },
  {
    number: '03',
    title: 'OTP-secured handoff',
    description: 'Carrier receives the parcel only after verifying your 6-digit Pickup OTP. Zero room for fraud.',
    icon: KeyRound,
  },
  {
    number: '04',
    title: 'Delivered. Escrow released.',
    description: "Recipient confirms with the Delivery OTP. Payment is released automatically. Done.",
    icon: ShieldCheck,
  },
];

const TRUST = [
  { icon: Landmark, label: 'Escrow-backed payments', sub: 'Your money waits in escrow until the recipient confirms delivery.' },
  { icon: KeyRound, label: 'Dual-OTP chain of custody', sub: 'Every handoff is locked by a cryptographic 6-digit code.' },
  { icon: ShieldCheck, label: 'Aadhaar-verified carriers', sub: 'Every traveler is government-ID verified before their first trip.' },
];

const QUOTES = [
  { quote: 'Sent my laptop charger to Hyderabad by the 2 PM flight. Arrived before dinner.', name: 'Priya Menon', role: 'Product Lead, BLR', route: 'BLR → HYD', initials: 'PM' },
  { quote: 'Legal contracts to Mumbai for a morning filing — 4.5 hours transit, seal intact.', name: 'Aditya Sharma', role: 'Senior Advocate, DEL', route: 'DEL → MUM', initials: 'AS' },
  { quote: 'As a D2C brand, same-day intercity shipping gives us an edge. 2× faster, half the price.', name: 'Shreya Kapoor', role: 'Founder, Kira Essentials', route: 'PNQ → BLR', initials: 'SK' },
];

const LIVE_ROUTES = [
  { from: 'BLR', to: 'HYD', mode: 'Train', eta: '5h' },
  { from: 'DEL', to: 'MUM', mode: 'Flight', eta: '2.5h' },
  { from: 'CHN', to: 'BLR', mode: 'Bus', eta: '7h' },
  { from: 'PNQ', to: 'BLR', mode: 'Train', eta: '4h' },
];

const TICKER_ITEMS = [
  'BLR → HYD · Delivered',
  'DEL → MUM · In Transit',
  'PNQ → BLR · Matched',
  'CHN → BLR · Delivered',
  'HYD → DEL · In Transit',
  'MUM → PNQ · Matched',
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function RouteCard({ from, to, mode, eta, delay = 0 }: { from: string; to: string; mode: string; eta: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="flex items-center gap-3 rounded-2xl border border-warm-200 bg-white p-4 shadow-card"
    >
      <div className="flex flex-col items-center gap-1 min-w-[32px]">
        <span className="text-[11px] font-bold text-warm-900">{from}</span>
        <div className="relative w-0.5 h-6 bg-warm-200">
          <motion.div
            className="absolute top-0 w-0.5 bg-[#FF5C28] rounded-full"
            animate={{ height: ['0%', '100%', '0%'] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay }}
          />
        </div>
        <span className="text-[11px] font-bold text-warm-900">{to}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-warm-900">{mode}</p>
        <p className="text-[11px] text-warm-500">~{eta} transit</p>
      </div>
      <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Live
      </span>
    </motion.div>
  );
}

function QuoteCarousel() {
  const [idx, setIdx] = useState(0);
  const q = QUOTES[idx];
  return (
    <div className="relative">
      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.3 }}
          className="rounded-2xl border border-warm-200 bg-white p-6 shadow-card"
        >
          <div className="mb-3 text-2xl text-[#FF5C28] font-display leading-none">"</div>
          <p className="text-sm font-medium text-warm-800 leading-relaxed mb-4">{q.quote}</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-[#FF5C28] flex items-center justify-center text-[11px] font-bold text-white">
                {q.initials}
              </div>
              <div>
                <p className="text-xs font-semibold text-warm-900">{q.name}</p>
                <p className="text-[11px] text-warm-500">{q.role}</p>
              </div>
            </div>
            <span className="text-[11px] font-mono font-semibold text-warm-400 border border-warm-200 rounded-full px-2.5 py-0.5">{q.route}</span>
          </div>
        </motion.div>
      </AnimatePresence>
      <div className="mt-3 flex justify-center gap-1.5">
        {QUOTES.map((_, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-5 bg-[#FF5C28]' : 'w-1.5 bg-warm-300'}`}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

export default function Home() {
  const deliveriesQuery = useQuery({ queryKey: ['recentDeliveries'], queryFn: () => deliveryApi.getMyRequests().then((r) => r.data.data), retry: 1 });

  const recentItems: string[] = (deliveriesQuery.data || []).slice(0, 6).map((d: any) => `${d.origin?.city} → ${d.destination?.city}`);
  const tickerItems = recentItems.length >= 3 ? recentItems : TICKER_ITEMS;
  const doubled = [...tickerItems, ...tickerItems];

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-16 pb-24"
    >
      {/* ── HERO ── */}
      <motion.section variants={fadeUp} className="relative pt-6 lg:pt-12">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          {/* Left — headline */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#FF5C28]/20 bg-[#FFF0EB] px-3.5 py-1.5 text-[12px] font-semibold text-[#E04520]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#FF5C28] animate-pulse" />
              Same-day intercity delivery — 173 cities
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-warm-950 sm:text-5xl lg:text-[52px] lg:leading-[1.1]">
              Your package travels{' '}
              <span className="font-display italic text-[#FF5C28]">with people.</span>
            </h1>

            <p className="text-base text-warm-500 leading-relaxed max-w-md">
              Hitch matches your parcel with verified travelers already going your way.
              Faster than couriers. Cheaper than air cargo. Every handoff secured by OTP.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Link to="/send-package">
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-xl bg-[#FF5C28] px-6 py-3 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(255,92,40,0.35)] transition-all hover:bg-[#E04520] hover:shadow-[0_6px_20px_rgba(255,92,40,0.40)] active:scale-[0.98]"
                >
                  Send a package <ArrowRight className="h-4 w-4" />
                </button>
              </Link>
              <Link to="/browse-carriers">
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-xl border border-warm-200 bg-white px-6 py-3 text-sm font-medium text-warm-700 shadow-card transition hover:border-warm-300 hover:text-warm-900"
                >
                  Browse carriers
                </button>
              </Link>
            </div>

            {/* Social proof micro-bar */}
            <div className="flex items-center gap-4 pt-2">
              <div className="flex -space-x-2">
                {['PM', 'AS', 'SK', 'RD'].map((initials) => (
                  <div key={initials} className="h-7 w-7 rounded-full border-2 border-white bg-warm-200 flex items-center justify-center text-[9px] font-bold text-warm-700">
                    {initials}
                  </div>
                ))}
              </div>
              <p className="text-xs text-warm-500">
                <span className="font-semibold text-warm-900">2,400+</span> packages delivered safely
              </p>
            </div>
          </div>

          {/* Right — live routes panel */}
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-warm-400">Active corridors now</span>
              <Link to="/browse-carriers" className="text-[11px] font-semibold text-[#FF5C28] hover:underline">
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {LIVE_ROUTES.map((r, i) => (
                <RouteCard key={r.from + r.to} {...r} delay={i * 0.08} />
              ))}
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3 pt-1">
              {[
                { value: '173', label: 'Cities' },
                { value: '4.5h', label: 'Avg transit' },
                { value: '₹180', label: 'Avg cost/kg' },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl border border-warm-200 bg-white p-4 text-center shadow-card">
                  <p className="text-xl font-bold text-warm-950 font-display">{s.value}</p>
                  <p className="text-[11px] text-warm-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.section>

      {/* ── LIVE TICKER ── */}
      <motion.section variants={fadeUp}>
        <div className="rounded-2xl border border-warm-200 bg-white overflow-hidden shadow-card">
          <div className="flex items-center justify-between border-b border-warm-100 px-5 py-3">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-warm-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live delivery feed
            </div>
            <Link to="/browse-carriers" className="text-[11px] font-semibold text-[#FF5C28] hover:underline">
              All corridors →
            </Link>
          </div>
          <div className="ticker-wrap py-3.5 px-5">
            <div className="ticker-inner gap-8">
              {doubled.map((item, i) => (
                <span key={i} className="mr-8 text-sm font-medium text-warm-600">
                  <span className="text-warm-300 mr-1">·</span> {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </motion.section>

      {/* ── HOW IT WORKS ── */}
      <motion.section variants={fadeUp}>
        <div className="mb-8 text-center">
          <span className="eyebrow-brand">How it works</span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-warm-950">
            Send in 4 steps. <span className="font-display italic text-[#FF5C28]">Simple.</span>
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {HOW_IT_WORKS.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="group relative rounded-2xl border border-warm-200 bg-white p-6 shadow-card transition-all hover:border-[#FF5C28]/30 hover:shadow-[0_8px_24px_-8px_rgba(255,92,40,0.12)]"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF0EB] transition group-hover:bg-[#FF5C28]">
                  <step.icon className="h-4.5 w-4.5 text-[#FF5C28] transition group-hover:text-white" />
                </div>
                <span className="font-mono text-[11px] font-bold text-warm-300">{step.number}</span>
              </div>
              <h3 className="text-sm font-bold text-warm-900 mb-1.5">{step.title}</h3>
              <p className="text-xs text-warm-500 leading-relaxed">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* ── RUPEE 10 SEAL + TRUST FEATURE ── */}
      <motion.section variants={fadeUp}>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* ₹10 seal */}
          <div className="relative overflow-hidden rounded-3xl bg-warm-950 p-8 text-white">
            <div
              className="absolute inset-0 opacity-[0.04]"
              style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '22px 22px' }}
            />
            <div className="relative z-10 space-y-5">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-[#FF5C28]/30 bg-[#FF5C28]/10 px-3 py-1 text-[11px] font-semibold text-[#FF7A50]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#FF5C28] animate-pulse" />
                Zero-hardware tamper seal
              </div>
              <div>
                <h3 className="text-2xl font-bold leading-tight">The ₹10 Banknote Seal</h3>
                <p className="mt-2 text-sm text-warm-400 leading-relaxed">
                  Tape any ₹10 note across the box seam. The app scans its RBI serial number and locks it to your shipment. If it's torn — the carrier can't proceed.
                </p>
              </div>
              <div className="space-y-2.5 border-y border-white/10 py-4">
                {[
                  'Tape a ₹10 note across the package seam',
                  'AI scans & logs the unique serial number',
                  'Serial is bound to the Pickup OTP',
                  'Recipient checks seal before sharing Delivery OTP',
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-xs font-medium text-warm-300">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#FF5C28]" />
                    {step}
                  </div>
                ))}
              </div>
              <Link to="/send-package">
                <button
                  type="button"
                  className="w-full rounded-xl bg-white py-3 text-sm font-bold text-warm-950 transition hover:bg-warm-100 active:scale-[0.98]"
                >
                  Send a package now
                </button>
              </Link>
            </div>
          </div>

          {/* Trust pillars */}
          <div className="flex flex-col gap-4">
            {TRUST.map((t, i) => (
              <motion.div
                key={t.label}
                initial={{ opacity: 0, x: 16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex items-start gap-4 rounded-2xl border border-warm-200 bg-white p-5 shadow-card transition hover:border-[#FF5C28]/20"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF0EB]">
                  <t.icon className="h-5 w-5 text-[#FF5C28]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-warm-900">{t.label}</h3>
                  <p className="mt-1 text-xs text-warm-500 leading-relaxed">{t.sub}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ── TESTIMONIALS ── */}
      <motion.section variants={fadeUp}>
        <div className="mb-6">
          <span className="eyebrow">Real senders</span>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-warm-950">
            Trusted across <span className="font-display italic text-[#FF5C28]">India.</span>
          </h2>
        </div>
        <QuoteCarousel />
      </motion.section>

      {/* ── CTA BANNER ── */}
      <motion.section variants={fadeUp}>
        <div className="relative overflow-hidden rounded-3xl bg-[#FF5C28] p-10 text-center">
          <div
            className="absolute inset-0 opacity-[0.06]"
            style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '22px 22px' }}
          />
          <div className="relative z-10 space-y-5">
            <h2 className="text-3xl font-bold text-white tracking-tight">
              Ready to send your first package?
            </h2>
            <p className="text-sm text-white/70 max-w-md mx-auto">
              It takes under 60 seconds to post. Carriers are waiting on your corridor right now.
            </p>
            <Link to="/send-package">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-sm font-bold text-[#FF5C28] shadow-[0_4px_20px_rgba(0,0,0,0.12)] transition hover:shadow-[0_8px_28px_rgba(0,0,0,0.16)] active:scale-[0.98]"
              >
                Post your package <ArrowRight className="h-4 w-4" />
              </button>
            </Link>
          </div>
        </div>
      </motion.section>
    </motion.div>
  );
}
