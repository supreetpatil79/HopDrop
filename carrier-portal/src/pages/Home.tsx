import { motion } from 'framer-motion';
import { ShieldCheck, KeyRound, Landmark } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

const stats = [
  { label: 'Total Deliveries', value: '18,420+' },
  { label: 'Cities Covered', value: '220+' },
  { label: 'Avg Delivery Time', value: '14.2 hrs' }
];

const steps = [
  'Post your trip or package',
  'Get intelligently matched',
  'Verify secure pickup OTP',
  'Delivered and auto-settled'
];

export default function Home() {
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
                <Button>Send a Package</Button>
              </Link>
              <Link to="/post-trip">
                <Button variant="ghost" className="border border-white/20 bg-white/10 text-white hover:bg-white/20">
                  I'm Travelling — Earn Money
                </Button>
              </Link>
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
                <p className="text-sm">Bengaluru → Mumbai</p>
                <p className="text-xs text-gray-400">Rajdhani Express · Departs 11:30 PM</p>
              </div>
              <div className="h-2 overflow-hidden rounded bg-white/10">
                <motion.div
                  initial={{ width: '10%' }}
                  animate={{ width: ['10%', '90%', '40%'] }}
                  transition={{ duration: 5, repeat: Infinity }}
                  className="h-full bg-primary"
                />
              </div>
              <div className="rounded-lg border border-white/10 bg-dark-surface p-3">
                <p className="text-sm">Package secured via Pickup OTP</p>
                <p className="text-xs text-gray-400">Escrow auto-release after delivery verification</p>
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
          Bengaluru → Mumbai · Documents delivered in 13h · Chennai → Pune · Medicines delivered in 10h · Delhi → Jaipur ·
          Electronics delivered in 8h ·
        </p>
      </section>
    </div>
  );
}
