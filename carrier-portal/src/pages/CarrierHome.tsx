import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowRightLeft, CircleDollarSign, Route, ShieldCheck, TrendingUp, Zap } from 'lucide-react';
import { EmptyState, LoadingState, PageHeader, StatCard } from 'hopdrop-shared';
import { MATCH_ACTIVE_STATUSES, MATCH_COMPLETED_STATUSES, formatWorkflowStatus } from 'hopdrop-shared';
import { Link } from 'react-router-dom';
import { tripApi } from '../api/trip.api';
import { fetchCarrierMatches } from '../utils/matches';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { formatINRPaise } from '../utils/format';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CARRIER_QUOTES = [
  {
    text: '"I carry 2 parcels every weekend to Hyderabad. It completely covers my Vande Bharat ticket and I earn ₹600 extra on top."',
    name: 'Karthik R.',
    route: 'BLR → HYD'
  },
  {
    text: '"I was already flying to Mumbai. 3 envelopes later, my flight was free. Takes 10 minutes total."',
    name: 'Anjali M.',
    route: 'BLR → MUM'
  },
  {
    text: '"First time I carried a parcel I thought it would be complicated. It was just a photo, a seal, and a 6-digit code. Nothing else."',
    name: 'Rohan D.',
    route: 'DEL → JAI'
  }
];

const PAYOUT_TIERS = [
  { parcel: '1st parcel', payout: '₹350', note: 'Base handover', color: 'bg-emerald-500' },
  { parcel: '2nd parcel', payout: '₹200', note: 'Incremental effort', color: 'bg-emerald-400' },
  { parcel: '3rd parcel', payout: '₹150', note: 'Near-zero effort', color: 'bg-emerald-300' },
  { parcel: '4th+ each', payout: '₹100', note: 'Passive income', color: 'bg-emerald-200' }
];

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }
  }
};

const stagger = {
  show: { transition: { staggerChildren: 0.08 } }
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function CarrierHome() {
  const tripsQuery = useQuery({
    queryKey: ['carrier-home-trips'],
    queryFn: () => tripApi.getMyTrips().then((res) => res.data.data)
  });
  const matchesQuery = useQuery({
    queryKey: ['carrier-home-matches'],
    queryFn: fetchCarrierMatches
  });

  const trips = tripsQuery.data || [];
  const matches = matchesQuery.data || [];
  const proposedMatches = matches.filter((match) => match.status === 'proposed');
  const activeMatches = matches.filter((match) => MATCH_ACTIVE_STATUSES.includes(match.status));
  const completedMatches = matches.filter((match) => MATCH_COMPLETED_STATUSES.includes(match.status));

  const pendingPayout = [...proposedMatches, ...activeMatches].reduce(
    (sum, match) => sum + (match.financials?.payoutToCarrier ?? match.payoutToCarrier ?? 0),
    0
  );
  const deliveredPayout = completedMatches.reduce(
    (sum, match) => sum + (match.financials?.payoutToCarrier ?? match.payoutToCarrier ?? 0),
    0
  );
  const totalEarned = deliveredPayout + pendingPayout;
  // Ticket coverage progress: assume ₹1500 covers a round-trip train ticket
  const ticketCoveragePercent = Math.min(Math.round((totalEarned / 150000) * 100), 100); // in paise

  const nextTrip = [...trips]
    .filter((trip) => trip.status === 'active')
    .sort((a, b) => new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime())[0];

  if (tripsQuery.isLoading && matchesQuery.isLoading && !trips.length && !matches.length) {
    return (
      <LoadingState
        title="Loading your carrier workspace"
        description="Fetching your trips, incoming requests, and live payout activity."
      />
    );
  }

  if ((tripsQuery.isError || matchesQuery.isError) && !trips.length && !matches.length) {
    return (
      <EmptyState
        title="We couldn't load your carrier workspace"
        description="Refresh the page to reconnect to your latest route postings and package requests."
      />
    );
  }

  return (
    <motion.div
      className="space-y-8"
      variants={stagger}
      initial="hidden"
      animate="show"
    >
      {/* ── HEADER ── */}
      <motion.div variants={fadeUp}>
        <PageHeader
          eyebrow="Carrier Console"
          title="Carrier Dashboard"
          description="Active routes, incoming sender requests, OTP checkpoints, and instant escrow settlements."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <a href="/send-package">
                <Button variant="ghost" size="sm">
                  Switch to Sender
                </Button>
              </a>
              <Link to="/post-trip">
                <Button variant="primary" size="sm">
                  Post Travel Route
                </Button>
              </Link>
            </div>
          }
        />
      </motion.div>

      {/* ── STAT CARDS ── */}
      <motion.div
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        variants={stagger}
      >
        {[
          {
            label: 'Active Routes',
            value: `${trips.length}`,
            description: 'Corridors currently posted.',
            icon: <Route className="h-4 w-4" />
          },
          {
            label: 'Awaiting Review',
            value: `${proposedMatches.length}`,
            description: 'New incoming matches.',
            icon: <ArrowRightLeft className="h-4 w-4" />
          },
          {
            label: 'In Delivery',
            value: `${activeMatches.length}`,
            description: 'OTP / in-transit state.',
            icon: <ShieldCheck className="h-4 w-4" />
          },
          {
            label: 'Pending Payout',
            value: formatINRPaise(pendingPayout),
            description: `${formatINRPaise(deliveredPayout)} delivered.`,
            icon: <CircleDollarSign className="h-4 w-4" />
          }
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            variants={fadeUp}
            transition={{ delay: i * 0.07 }}
          >
            <StatCard
              label={stat.label}
              value={stat.value}
              description={stat.description}
              icon={stat.icon}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* ── EARNINGS MOTIVATOR ── */}
      <motion.div variants={fadeUp}>
        <Card variant="dark" className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Ticket Coverage Tracker
                </span>
              </div>
              <h2 className="text-lg font-bold text-white">
                {ticketCoveragePercent >= 100
                  ? '🎉 Your round-trip is fully covered!'
                  : `You're ${ticketCoveragePercent}% toward covering your round-trip ticket.`}
              </h2>
              <p className="text-sm text-zinc-400">
                Carry 3–5 parcels on your next trip to reach ₹1,500 — the average Vande Bharat round-trip fare.
              </p>
            </div>
            <Link to="/post-trip">
              <Button variant="subtle" size="sm">
                <Zap className="h-3.5 w-3.5" />
                Post a Trip
              </Button>
            </Link>
          </div>

          {/* Progress bar */}
          <div className="mt-4 space-y-1.5">
            <div className="flex justify-between text-[11px] font-medium text-zinc-400">
              <span>₹0</span>
              <span className="font-mono">{ticketCoveragePercent}% of ₹1,500 target</span>
              <span>₹1,500</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
              <motion.div
                initial={{ width: '5%' }}
                animate={{ width: `${Math.max(ticketCoveragePercent, 5)}%` }}
                transition={{ duration: 1.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="h-full rounded-full bg-emerald-500"
              />
            </div>
          </div>
        </Card>
      </motion.div>

      {/* ── MAIN CONTENT GRID ── */}
      <motion.div variants={fadeUp} className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
        {/* Actionable Requests */}
        <Card className="space-y-4 p-5" padding="none">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-zinc-950">Actionable Requests</h2>
              <p className="text-xs text-zinc-500">Accept requests, generate handover OTPs, or track settlement.</p>
            </div>
            <Link to="/incoming-requests">
              <Button variant="ghost" size="sm" className="text-xs">View All</Button>
            </Link>
          </div>

          {matches.length ? (
            <div className="space-y-3">
              {[...proposedMatches, ...activeMatches].slice(0, 4).map((match, i) => (
                <motion.div
                  key={match._id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-4 space-y-3 transition-all duration-200 hover:border-zinc-300 hover:bg-white hover:shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-zinc-950">
                        {match.deliveryRequest?.origin?.city} → {match.deliveryRequest?.destination?.city}
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {match.deliveryRequest?.package?.description || 'Package parcel'} · {match.deliveryRequest?.package?.weightKg || '-'} kg
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      {formatWorkflowStatus(match.status)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200/60 pt-2.5 text-xs text-zinc-500">
                    <span>
                      Sender: <strong className="text-zinc-800 font-semibold">{match.sender?.name || 'Verified Sender'}</strong>
                    </span>
                    <span className="font-bold text-zinc-950 tabular-nums">
                      Payout: {formatINRPaise(match.financials?.payoutToCarrier ?? match.payoutToCarrier)}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <Link to={`/active-delivery/${match._id}`}>
                      <Button size="sm" className="text-xs">
                        {match.status === 'proposed' ? 'Accept / Review' : 'Open Delivery Flow'}
                      </Button>
                    </Link>
                    <a href={`/track-delivery/${match._id}`}>
                      <Button variant="ghost" size="sm" className="text-xs">
                        View Sender Radar
                      </Button>
                    </a>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No active matches yet"
              description="Post a travel route to start receiving matched packages on your route."
            />
          )}
        </Card>

        {/* Right column */}
        <div className="space-y-4">
          {/* Next Departure */}
          <Card className="space-y-3 p-5" padding="none">
            <h2 className="text-base font-bold text-zinc-950">Next Departure</h2>
            {nextTrip ? (
              <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-3.5 space-y-1.5">
                <p className="text-sm font-bold text-zinc-950">
                  {nextTrip.origin?.city} → {nextTrip.destination?.city}
                </p>
                <p className="text-xs text-zinc-500">
                  {new Date(nextTrip.departureTime).toLocaleString('en-IN', {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                  })}
                </p>
                <p className="text-xs text-zinc-700 font-medium">
                  {nextTrip.modeOfTransport} · ₹{nextTrip.pricePerKg}/kg · {nextTrip.availableCapacity?.weightKg} kg remaining
                </p>
              </div>
            ) : (
              <EmptyState
                title="No departure scheduled"
                description="Post your upcoming route to match with nearby package senders."
              />
            )}
          </Card>

          {/* Quick Workflow */}
          <Card className="space-y-3 p-5" padding="none">
            <h2 className="text-base font-bold text-zinc-950">Quick Workflow</h2>
            <p className="text-xs leading-relaxed text-zinc-500">
              When matched, generate a 6-digit Pickup OTP for the sender. Upon dropoff, generate the Delivery OTP to auto-release your escrow payout.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Link to="/incoming-requests">
                <Button size="sm" className="text-xs">Incoming Requests</Button>
              </Link>
              <Link to="/my-trips">
                <Button variant="ghost" size="sm" className="text-xs">Manage Trips</Button>
              </Link>
            </div>
          </Card>
        </div>
      </motion.div>

      {/* ── PAYOUT EXPLAINER ── */}
      <motion.div variants={fadeUp}>
        <Card className="p-6 space-y-5" interactive>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              How your payout works
            </span>
            <h2 className="mt-1 text-base font-bold text-zinc-950">
              Batching more parcels = higher platform margin you keep
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              Your travel cost is fixed. Every additional parcel you carry is near-zero incremental effort.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {PAYOUT_TIERS.map((tier, i) => (
              <motion.div
                key={tier.parcel}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="rounded-xl border border-zinc-200/80 bg-zinc-50/60 p-4"
              >
                <div className={`h-1.5 w-8 rounded-full mb-3 ${tier.color}`} />
                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">{tier.parcel}</p>
                <p className="text-xl font-bold tabular-nums text-zinc-950 mt-1">{tier.payout}</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">{tier.note}</p>
              </motion.div>
            ))}
          </div>

          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3.5">
            <p className="text-xs font-semibold text-zinc-700">
              💡 Example: Carry 5 parcels on one BLR → HYD trip = ₹900 payout.
              That's your entire Vande Bharat round-trip ticket paid for — plus ₹600 in your pocket.
            </p>
          </div>
        </Card>
      </motion.div>

      {/* ── CARRIER QUOTE ── */}
      <motion.div variants={fadeUp}>
        <Card className="p-6" accent="emerald" interactive>
          <p className="text-sm font-medium italic leading-relaxed text-zinc-700">
            {CARRIER_QUOTES[0].text}
          </p>
          <div className="mt-4 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-950 text-[10px] font-bold text-white">
              {CARRIER_QUOTES[0].name[0]}
            </span>
            <div>
              <p className="text-xs font-bold text-zinc-900">{CARRIER_QUOTES[0].name}</p>
              <p className="text-[11px] text-zinc-500">{CARRIER_QUOTES[0].route} · Verified Carrier</p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* ── ACTIVE TRAVEL CORRIDORS ── */}
      <motion.div variants={fadeUp}>
        <Card className="space-y-4 p-5" padding="none">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <h2 className="text-base font-bold text-zinc-950">Active Travel Corridors</h2>
            <Link to="/my-trips">
              <Button variant="ghost" size="sm" className="text-xs">Manage Trips</Button>
            </Link>
          </div>
          {trips.length ? (
            <div className="space-y-2">
              {trips.map((trip: any, i: number) => (
                <motion.div
                  key={trip._id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-3.5 transition-all duration-200 hover:border-zinc-300 hover:bg-white hover:shadow-sm"
                >
                  <div>
                    <p className="text-sm font-bold text-zinc-950">
                      {trip.origin?.city} → {trip.destination?.city}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {new Date(trip.departureTime).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {trip.status}
                  </span>
                </motion.div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No trips posted yet"
              description="Post a trip to begin receiving route-matched package opportunities."
            />
          )}
        </Card>
      </motion.div>
    </motion.div>
  );
}
