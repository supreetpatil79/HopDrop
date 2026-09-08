import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, CircleDollarSign, MapPin, Package, ShieldCheck, Truck, Zap } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { tripApi } from '../api/trip.api';
import { fetchCarrierMatches } from '../utils/matches';
import { formatINRPaise } from '../utils/format';

// ─── Data ────────────────────────────────────────────────────────────────────

const PAYOUT_TIERS = [
  { label: '1st parcel', payout: '₹350', sub: 'Base handover bonus' },
  { label: '2nd parcel', payout: '₹200', sub: 'Incremental effort' },
  { label: '3rd parcel', payout: '₹150', sub: 'Near-zero effort' },
  { label: '4th+ each', payout: '₹100', sub: 'Passive per parcel' },
];

const HOW_IT_WORKS = [
  { icon: MapPin, step: '01', title: 'Post your trip', desc: 'Enter your route, date, and how much bag space you have. Takes 90 seconds.' },
  { icon: Package, step: '02', title: 'Accept a request', desc: "We surface matched parcels on your exact corridor. Accept what suits you." },
  { icon: ShieldCheck, step: '03', title: 'OTP pickup handoff', desc: 'Meet the sender, verify the 6-digit OTP, scan the ₹10 seal. Parcel is yours.' },
  { icon: CircleDollarSign, step: '04', title: 'Get paid at delivery', desc: 'Recipient confirms with Delivery OTP. Escrow releases your payout instantly.' },
];

const CARRIER_QUOTES = [
  { quote: 'I carry 2 parcels every weekend to Hyderabad. It covers my Vande Bharat ticket and I earn ₹600 extra.', name: 'Karthik R.', route: 'BLR → HYD', initials: 'KR' },
  { quote: 'I was already flying to Mumbai. 3 envelopes later, my flight was free. Takes 10 minutes total.', name: 'Anjali M.', route: 'BLR → MUM', initials: 'AM' },
  { quote: 'Photo, seal, 6-digit code. Nothing else. First time I did it I thought it would be complicated.', name: 'Rohan D.', route: 'DEL → JAI', initials: 'RD' },
];

const TICKER = [
  'BLR → HYD · ₹680 earned', 'DEL → MUM · ₹420 earned',
  'PNQ → BLR · ₹530 earned', 'CHN → BLR · ₹350 earned',
  'HYD → DEL · ₹780 earned',
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function EarningsCard() {
  const [kg, setKg] = useState(5);
  const est = kg <= 2 ? 350 : kg <= 5 ? 550 : kg <= 10 ? 750 : 950;

  return (
    <div className="rounded-2xl border border-warm-200 bg-white p-6 shadow-card">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-warm-400 mb-4">Earnings estimator</p>
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-warm-700">Spare capacity</span>
            <span className="font-mono text-sm font-bold text-warm-900">{kg} kg</span>
          </div>
          <input
            type="range" min={1} max={20} step={1} value={kg}
            onChange={(e) => setKg(Number(e.target.value))}
            className="w-full accent-[#2563EB]"
          />
        </div>
        <div className="rounded-xl bg-[#EFF6FF] border border-blue-100 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-blue-600 font-medium">You could earn</p>
            <p className="text-2xl font-bold text-[#2563EB] font-display mt-0.5">₹{est}</p>
          </div>
          <span className="text-xs text-blue-500">per trip</span>
        </div>
      </div>
    </div>
  );
}

function QuoteCarousel() {
  const [idx, setIdx] = useState(0);
  const q = CARRIER_QUOTES[idx];
  return (
    <div>
      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.3 }}
          className="rounded-2xl border border-warm-200 bg-white p-6 shadow-card"
        >
          <div className="mb-3 text-2xl text-[#2563EB] font-display leading-none">"</div>
          <p className="text-sm font-medium text-warm-800 leading-relaxed mb-4">{q.quote}</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-[#2563EB] flex items-center justify-center text-[11px] font-bold text-white">{q.initials}</div>
              <p className="text-xs font-semibold text-warm-900">{q.name}</p>
            </div>
            <span className="text-[11px] font-mono font-semibold text-warm-400 border border-warm-200 rounded-full px-2.5 py-0.5">{q.route}</span>
          </div>
        </motion.div>
      </AnimatePresence>
      <div className="mt-3 flex justify-center gap-1.5">
        {CARRIER_QUOTES.map((_, i) => (
          <button key={i} onClick={() => setIdx(i)} className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-5 bg-[#2563EB]' : 'w-1.5 bg-warm-300'}`} />
        ))}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };
const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } } };

export default function CarrierHome() {
  const doubled = [...TICKER, ...TICKER];

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col gap-16 pb-24">

      {/* ── HERO ── */}
      <motion.section variants={fadeUp} className="pt-6 lg:pt-12">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          {/* Left */}
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/60 bg-blue-50 px-3.5 py-1.5 text-[12px] font-semibold text-blue-700">
              <span className="h-1.5 w-1.5 rounded-full bg-[#2563EB] animate-pulse" />
              Earn on every intercity trip you take
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-warm-950 sm:text-5xl lg:text-[52px] lg:leading-[1.1]">
              Your trip already pays.{' '}
              <span className="font-display italic text-[#2563EB]">Make it earn.</span>
            </h1>

            <p className="text-base text-warm-500 leading-relaxed max-w-md">
              Accept parcels on your existing route. Zero detours. Zero overhead. Every handoff is OTP-secured and every payout is escrow-guaranteed.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Link to="/post-trip">
                <button type="button" className="flex items-center gap-2 rounded-xl bg-[#2563EB] px-6 py-3 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(37,99,235,0.35)] transition-all hover:bg-[#1D4ED8] hover:shadow-[0_6px_20px_rgba(37,99,235,0.40)] active:scale-[0.98]">
                  Post your trip <ArrowRight className="h-4 w-4" />
                </button>
              </Link>
              <Link to="/incoming-requests">
                <button type="button" className="flex items-center gap-2 rounded-xl border border-warm-200 bg-white px-6 py-3 text-sm font-medium text-warm-700 shadow-card transition hover:border-warm-300 hover:text-warm-900">
                  Browse requests
                </button>
              </Link>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <div className="flex -space-x-2">
                {['KR', 'AM', 'RD', 'VK'].map((initials) => (
                  <div key={initials} className="h-7 w-7 rounded-full border-2 border-white bg-[#2563EB]/15 flex items-center justify-center text-[9px] font-bold text-[#2563EB]">{initials}</div>
                ))}
              </div>
              <p className="text-xs text-warm-500"><span className="font-semibold text-warm-900">1,800+</span> active carriers across India</p>
            </div>
          </div>

          {/* Right — earnings estimator + payout tiers */}
          <div className="space-y-4">
            <EarningsCard />
            <div className="grid grid-cols-2 gap-3">
              {PAYOUT_TIERS.map((tier, i) => (
                <motion.div
                  key={tier.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="rounded-xl border border-warm-200 bg-white p-4 shadow-card"
                >
                  <p className="font-display text-xl font-bold text-[#2563EB]">{tier.payout}</p>
                  <p className="text-[11px] font-semibold text-warm-800 mt-0.5">{tier.label}</p>
                  <p className="text-[10px] text-warm-500 mt-0.5">{tier.sub}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </motion.section>

      {/* ── TICKER ── */}
      <motion.section variants={fadeUp}>
        <div className="rounded-2xl border border-warm-200 bg-white overflow-hidden shadow-card">
          <div className="flex items-center justify-between border-b border-warm-100 px-5 py-3">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-warm-400">
              <span className="h-1.5 w-1.5 rounded-full bg-[#2563EB] animate-pulse" />
              Live carrier earnings feed
            </div>
            <Link to="/my-trips" className="text-[11px] font-semibold text-[#2563EB] hover:underline">My trips →</Link>
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
            Earn in 4 steps. <span className="font-display italic text-[#2563EB]">Simple.</span>
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {HOW_IT_WORKS.map((s, i) => (
            <motion.div
              key={s.step}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="group rounded-2xl border border-warm-200 bg-white p-6 shadow-card transition-all hover:border-[#2563EB]/30 hover:shadow-[0_8px_24px_-8px_rgba(37,99,235,0.12)]"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 transition group-hover:bg-[#2563EB]">
                  <s.icon className="h-4.5 w-4.5 text-[#2563EB] transition group-hover:text-white" />
                </div>
                <span className="font-mono text-[11px] font-bold text-warm-300">{s.step}</span>
              </div>
              <h3 className="text-sm font-bold text-warm-900 mb-1.5">{s.title}</h3>
              <p className="text-xs text-warm-500 leading-relaxed">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* ── TESTIMONIALS ── */}
      <motion.section variants={fadeUp}>
        <div className="mb-6">
          <span className="eyebrow">Real carriers</span>
          <h2 className="mt-3 text-2xl font-bold tracking-tight text-warm-950">
            Carriers earning across <span className="font-display italic text-[#2563EB]">India.</span>
          </h2>
        </div>
        <QuoteCarousel />
      </motion.section>

      {/* ── CTA BANNER ── */}
      <motion.section variants={fadeUp}>
        <div className="relative overflow-hidden rounded-3xl bg-[#2563EB] p-10 text-center">
          <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
          <div className="relative z-10 space-y-5">
            <h2 className="text-3xl font-bold text-white tracking-tight">Your next trip is already half-paid.</h2>
            <p className="text-sm text-white/70 max-w-md mx-auto">Post your route, accept a parcel, and get paid at delivery. No extra work — you're already going there.</p>
            <Link to="/post-trip">
              <button type="button" className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-sm font-bold text-[#2563EB] shadow-[0_4px_20px_rgba(0,0,0,0.12)] transition hover:shadow-[0_8px_28px_rgba(0,0,0,0.16)] active:scale-[0.98]">
                Post your trip <ArrowRight className="h-4 w-4" />
              </button>
            </Link>
          </div>
        </div>
      </motion.section>
    </motion.div>
  );
}
