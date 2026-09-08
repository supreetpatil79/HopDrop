import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowRightLeft, CircleDollarSign, Package, Plus, Truck } from 'lucide-react';
import { EmptyState, LoadingState } from 'hopdrop-shared';
import { Link } from 'react-router-dom';
import { deliveryApi } from '../api/delivery.api';
import { tripApi } from '../api/trip.api';
import { DeliveryCard } from '../components/delivery/DeliveryCard';
import { TripCard } from '../components/trip/TripCard';
import { formatINRPaise } from '../utils/format';
import { useAuth } from '../hooks/useAuth';

const DEMO_TRIPS = [
  { _id: 'trip_1', origin: { city: 'Bengaluru' }, destination: { city: 'Hyderabad' }, status: 'active', modeOfTransport: 'train', availableCapacity: { weightKg: 8 }, departureTime: new Date(Date.now() + 1000 * 60 * 60 * 4).toISOString() },
  { _id: 'trip_2', origin: { city: 'Bengaluru' }, destination: { city: 'Mumbai' }, status: 'active', modeOfTransport: 'flight', availableCapacity: { weightKg: 15 }, departureTime: new Date(Date.now() + 1000 * 60 * 60 * 28).toISOString() },
];

function StatTile({ label, value, sub, icon: Icon, accent = false, delay = 0 }: {
  label: string; value: string; sub?: string; icon: React.ElementType; accent?: boolean; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={`rounded-2xl border p-5 shadow-card transition hover:shadow-card-hover ${accent ? 'border-blue-200/60 bg-[#F5F9FF]' : 'border-warm-200 bg-white'}`}
    >
      <div className="flex items-start justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-warm-400">{label}</p>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${accent ? 'bg-blue-100' : 'bg-warm-100'}`}>
          <Icon className={`h-4 w-4 ${accent ? 'text-[#2563EB]' : 'text-warm-500'}`} />
        </div>
      </div>
      <p className="mt-3 font-display text-3xl font-bold text-warm-950 tracking-tight">{value}</p>
      {sub && <p className="mt-1 text-xs text-warm-500">{sub}</p>}
    </motion.div>
  );
}

const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } } };

export default function Dashboard() {
  const { user } = useAuth();
  const tripsQuery = useQuery({ queryKey: ['myTrips'], queryFn: () => tripApi.getMyTrips().then((r) => r.data.data) });
  const deliveriesQuery = useQuery({ queryKey: ['myDeliveries'], queryFn: () => deliveryApi.getMyRequests().then((r) => r.data.data) });

  const trips = (tripsQuery.data?.length > 0) ? tripsQuery.data : DEMO_TRIPS;
  const deliveries = deliveriesQuery.data || [];

  const earnings = useMemo(() => {
    const delivered = deliveries.filter((d: any) => d.status === 'delivered');
    const total = delivered.reduce((sum: number, item: any) => sum + (item.quotedPrice || 0), 0);
    return { week: Math.round(total * 0.2), month: Math.round(total * 0.6), allTime: total };
  }, [deliveries]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.08 } } }}
      className="flex flex-col gap-10"
    >
      {/* Header */}
      <motion.div variants={fadeUp} className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-warm-400">{greeting()}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-warm-950">
            {user?.name?.split(' ')[0] || 'Carrier'} <span className="font-display italic text-[#2563EB]">Dashboard</span>
          </h1>
          <p className="mt-1.5 text-sm text-warm-500">Your trips, deliveries, and earnings — all in one place.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/incoming-requests">
            <button type="button" className="flex items-center gap-1.5 rounded-xl border border-warm-200 bg-white px-4 py-2.5 text-sm font-medium text-warm-700 shadow-card transition hover:border-warm-300">
              View Requests
            </button>
          </Link>
          <Link to="/post-trip">
            <button type="button" className="flex items-center gap-1.5 rounded-xl bg-[#2563EB] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_2px_10px_rgba(37,99,235,0.30)] transition hover:bg-[#1D4ED8] active:scale-[0.98]">
              <Plus className="h-3.5 w-3.5" /> Post Trip
            </button>
          </Link>
        </div>
      </motion.div>

      {/* Earnings stat tiles */}
      <motion.div variants={fadeUp} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Active trips" value={String(trips.length)} sub="Currently posted routes" icon={Truck} accent delay={0} />
        <StatTile label="This week" value={formatINRPaise(earnings.week)} sub="Estimated earnings" icon={CircleDollarSign} delay={0.05} />
        <StatTile label="This month" value={formatINRPaise(earnings.month)} sub="Estimated earnings" icon={CircleDollarSign} delay={0.1} />
        <StatTile label="All time" value={formatINRPaise(earnings.allTime)} sub="Total delivered value" icon={ArrowRightLeft} delay={0.15} />
      </motion.div>

      {/* Trips section */}
      <motion.section variants={fadeUp} className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-warm-900">My trips</h2>
            <p className="text-xs text-warm-500">Your active and upcoming routes available for parcel matching.</p>
          </div>
          <Link to="/my-trips" className="text-xs font-semibold text-[#2563EB] hover:underline">View all →</Link>
        </div>

        {tripsQuery.isLoading ? (
          <LoadingState title="Loading trips…" />
        ) : trips.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {trips.slice(0, 4).map((trip: any) => <TripCard key={trip._id} trip={trip} />)}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-warm-300 bg-white p-10 text-center">
            <Truck className="mx-auto h-8 w-8 text-warm-300 mb-3" />
            <p className="text-sm font-medium text-warm-700">No trips posted yet</p>
            <p className="mt-1 text-xs text-warm-400 mb-4">Post your next intercity trip to start earning on parcels.</p>
            <Link to="/post-trip">
              <button type="button" className="rounded-xl bg-[#2563EB] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_2px_10px_rgba(37,99,235,0.30)] transition hover:bg-[#1D4ED8]">
                Post a trip
              </button>
            </Link>
          </div>
        )}
      </motion.section>

      {/* Deliveries section */}
      <motion.section variants={fadeUp} className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-warm-900">My deliveries</h2>
            <p className="text-xs text-warm-500">Parcels you've accepted and are carrying.</p>
          </div>
          <Link to="/my-deliveries" className="text-xs font-semibold text-[#2563EB] hover:underline">View all →</Link>
        </div>

        {deliveriesQuery.isLoading ? (
          <LoadingState title="Loading deliveries…" />
        ) : deliveries.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {deliveries.slice(0, 4).map((req: any) => <DeliveryCard key={req._id} request={req} />)}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-warm-300 bg-white p-10 text-center">
            <Package className="mx-auto h-8 w-8 text-warm-300 mb-3" />
            <p className="text-sm font-medium text-warm-700">No deliveries yet</p>
            <p className="mt-1 text-xs text-warm-400 mb-4">Accept an incoming request to start carrying and earning.</p>
            <Link to="/incoming-requests">
              <button type="button" className="rounded-xl border border-warm-200 bg-white px-5 py-2.5 text-sm font-medium text-warm-700 shadow-card transition hover:border-warm-300">
                Browse requests →
              </button>
            </Link>
          </div>
        )}
      </motion.section>
    </motion.div>
  );
}
