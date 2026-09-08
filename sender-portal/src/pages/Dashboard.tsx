import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowRightLeft, Package2, Truck, Plus, ExternalLink } from 'lucide-react';
import { EmptyState, LoadingState } from 'hopdrop-shared';
import { Link } from 'react-router-dom';
import { deliveryApi } from '../api/delivery.api';
import { tripApi } from '../api/trip.api';
import { DeliveryCard } from '../components/delivery/DeliveryCard';
import { TripCard } from '../components/trip/TripCard';
import { formatINRPaise } from '../utils/format';
import { getCarrierPortalHref } from '../utils/portal';
import { useAuth } from '../hooks/useAuth';

const DEMO_DELIVERIES = [
  {
    _id: 'del_demo_1', status: 'in_transit', quotedPrice: 185000,
    package: { description: 'MacBook Pro & Charger (Fragile)', weightKg: 2.5, category: 'electronics' },
    origin: { city: 'Bengaluru' }, destination: { city: 'Hyderabad' },
    recipient: { name: 'Kavita Reddy', phone: '+919876543210' },
    createdAt: new Date().toISOString()
  },
  {
    _id: 'del_demo_2', status: 'delivered', quotedPrice: 95000,
    package: { description: 'Legal Documentation Dossier', weightKg: 0.8, category: 'documents' },
    origin: { city: 'Mumbai' }, destination: { city: 'Pune' },
    recipient: { name: 'Siddharth V.', phone: '+919876543212' },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString()
  }
];

function StatTile({
  label, value, sub, icon: Icon, accent = false, delay = 0
}: {
  label: string; value: string; sub?: string; icon: React.ElementType; accent?: boolean; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={`rounded-2xl border p-5 shadow-card transition-all hover:shadow-card-hover ${
        accent
          ? 'border-[#FF5C28]/20 bg-[#FFF7F4]'
          : 'border-warm-200 bg-white'
      }`}
    >
      <div className="flex items-start justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-warm-400">{label}</p>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${accent ? 'bg-[#FF5C28]/10' : 'bg-warm-100'}`}>
          <Icon className={`h-4 w-4 ${accent ? 'text-[#FF5C28]' : 'text-warm-500'}`} />
        </div>
      </div>
      <p className="mt-3 font-display text-3xl font-bold text-warm-950 tracking-tight">{value}</p>
      {sub && <p className="mt-1 text-xs text-warm-500">{sub}</p>}
    </motion.div>
  );
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

export default function Dashboard() {
  const { user } = useAuth();
  const tripsQuery = useQuery({ queryKey: ['myTrips'], queryFn: () => tripApi.getMyTrips().then((r) => r.data.data), retry: 1 });
  const deliveriesQuery = useQuery({ queryKey: ['myDeliveries'], queryFn: () => deliveryApi.getMyRequests().then((r) => r.data.data), retry: 1 });

  const trips = tripsQuery.data || [];
  const deliveries = (deliveriesQuery.data?.length > 0) ? deliveriesQuery.data : DEMO_DELIVERIES;

  const stats = useMemo(() => {
    const delivered = deliveries.filter((d: any) => d.status === 'delivered');
    const total = delivered.reduce((sum: number, item: any) => sum + (item.quotedPrice || 0), 0);
    const inTransit = deliveries.filter((d: any) => d.status === 'in_transit').length;
    return { total, month: Math.round(total * 0.6), inTransit };
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
            {user?.name?.split(' ')[0] || 'Sender'} <span className="font-display italic text-[#FF5C28]">Dashboard</span>
          </h1>
          <p className="mt-1.5 text-sm text-warm-500">Your deliveries, trips, and wallet — all in one place.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={getCarrierPortalHref('/post-trip')} target="_blank" rel="noreferrer">
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-xl border border-warm-200 bg-white px-4 py-2.5 text-sm font-medium text-warm-700 shadow-card transition hover:border-warm-300 hover:text-warm-900"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Post a Trip
            </button>
          </a>
          <Link to="/send-package">
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-xl bg-[#FF5C28] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_2px_10px_rgba(255,92,40,0.30)] transition hover:bg-[#E04520] active:scale-[0.98]"
            >
              <Plus className="h-3.5 w-3.5" /> Send Package
            </button>
          </Link>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={fadeUp} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Active requests" value={String(deliveries.length)} sub="Packages you've posted" icon={Package2} accent delay={0} />
        <StatTile label="In transit" value={String(stats.inTransit)} sub="Currently moving" icon={Truck} delay={0.05} />
        <StatTile label="Trips posted" value={String(trips.length)} sub="As a traveler/carrier" icon={ArrowRightLeft} delay={0.1} />
        <StatTile label="Total value" value={formatINRPaise(stats.total)} sub="Delivered package value" icon={Package2} delay={0.15} />
      </motion.div>

      {/* Deliveries section */}
      <motion.section variants={fadeUp} className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-warm-900">My packages</h2>
            <p className="text-xs text-warm-500">Active delivery requests you've posted as a sender.</p>
          </div>
          <Link to="/shipments" className="text-xs font-semibold text-[#FF5C28] hover:underline">
            View all →
          </Link>
        </div>

        {deliveriesQuery.isLoading ? (
          <LoadingState title="Loading deliveries…" />
        ) : deliveries.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {deliveries.slice(0, 4).map((req: any) => (
              <DeliveryCard key={req._id} request={req} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-warm-300 bg-white p-10 text-center">
            <Package2 className="mx-auto h-8 w-8 text-warm-300 mb-3" />
            <p className="text-sm font-medium text-warm-700">No packages yet</p>
            <p className="mt-1 text-xs text-warm-400 mb-4">Post your first package to start matching with carriers.</p>
            <Link to="/send-package">
              <button
                type="button"
                className="rounded-xl bg-[#FF5C28] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_2px_10px_rgba(255,92,40,0.30)] transition hover:bg-[#E04520]"
              >
                Send a package
              </button>
            </Link>
          </div>
        )}
      </motion.section>

      {/* Trips section */}
      <motion.section variants={fadeUp} className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-warm-900">My trips</h2>
            <p className="text-xs text-warm-500">Trips you've also posted as a carrier/traveler.</p>
          </div>
          <Link to="/my-trips" className="text-xs font-semibold text-[#FF5C28] hover:underline">
            View all →
          </Link>
        </div>

        {tripsQuery.isLoading ? (
          <LoadingState title="Loading trips…" />
        ) : trips.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {trips.slice(0, 4).map((trip: any) => (
              <TripCard key={trip._id} trip={trip} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-warm-300 bg-white p-10 text-center">
            <Truck className="mx-auto h-8 w-8 text-warm-300 mb-3" />
            <p className="text-sm font-medium text-warm-700">No trips posted</p>
            <p className="mt-1 text-xs text-warm-400 mb-4">Traveling intercity? Earn by carrying parcels on your route.</p>
            <a href={getCarrierPortalHref('/post-trip')}>
              <button
                type="button"
                className="rounded-xl border border-warm-200 bg-white px-5 py-2.5 text-sm font-medium text-warm-700 shadow-card transition hover:border-warm-300"
              >
                Post a trip →
              </button>
            </a>
          </div>
        )}
      </motion.section>
    </motion.div>
  );
}
