import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  Box,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Filter,
  MapPin,
  Package,
  Plane,
  RefreshCw,
  Search,
  ShieldCheck,
  Star,
  Train,
  Truck,
  User,
  Zap
} from 'lucide-react';
import clsx from 'clsx';
import { EmptyState, LoadingState, PageHeader } from 'hopdrop-shared';
import { deliveryApi } from '../api/delivery.api';
import { matchApi } from '../api/match.api';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export default function MyShipments() {
  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'delivered' | 'matching'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const deliveriesQuery = useQuery({
    queryKey: ['my-deliveries-all'],
    queryFn: () => deliveryApi.getMyRequests().then((r) => r.data.data)
  });

  const requests = deliveriesQuery.data || [];

  const filteredRequests = requests.filter((req: any) => {
    const status = (req.status || '').toLowerCase();
    const isDelivered = status === 'delivered';
    const isActive = ['picked_up', 'in_transit', 'matched', 'active', 'accepted', 'confirmed'].includes(status);
    const isMatching = ['created', 'pending', 'open', 'searching'].includes(status);

    if (filterTab === 'active' && !isActive) return false;
    if (filterTab === 'delivered' && !isDelivered) return false;
    if (filterTab === 'matching' && !isMatching) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const origin = (req.origin?.city || '').toLowerCase();
      const dest = (req.destination?.city || '').toLowerCase();
      const desc = (req.package?.description || '').toLowerCase();
      const recipient = (req.recipient?.name || '').toLowerCase();
      return origin.includes(q) || dest.includes(q) || desc.includes(q) || recipient.includes(q);
    }

    return true;
  });

  if (deliveriesQuery.isLoading && !requests.length) {
    return (
      <LoadingState
        title="Loading your shipments"
        description="Fetching your intercity parcel routes, carrier matches, and real-time delivery timelines."
      />
    );
  }

  const activeCount = requests.filter((r: any) =>
    ['picked_up', 'in_transit', 'matched', 'active', 'accepted', 'confirmed'].includes(r.status)
  ).length;

  const deliveredCount = requests.filter((r: any) => r.status === 'delivered').length;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6">
      {/* ── HEADER ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-zinc-950 text-white shadow-2xs">
              <Package className="h-4 w-4" />
            </span>
            <h1 className="text-xl font-extrabold tracking-tight text-zinc-950 sm:text-2xl">
              Shipment Tracking & History
            </h1>
          </div>
          <p className="text-xs text-zinc-600 sm:text-sm">
            Monitor real-time package milestones, OTP security checkpoints, and receipt history across every dispatch.
          </p>
        </div>

        <Link to="/send-package">
          <Button size="sm" className="whitespace-nowrap font-bold">
            + Send New Parcel
          </Button>
        </Link>
      </div>

      {/* ── SUMMARY STATS BAR ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Total Dispatches</p>
          <p className="text-lg font-black text-zinc-950">{requests.length}</p>
        </div>
        <div className="rounded-2xl border border-blue-200/80 bg-blue-50/50 p-4 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700">In Transit</p>
          <p className="text-lg font-black text-blue-950">{activeCount}</p>
        </div>
        <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/50 p-4 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Delivered</p>
          <p className="text-lg font-black text-emerald-950">{deliveredCount}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-xs">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Tamper Seal Escrow</p>
          <p className="text-xs font-bold text-emerald-600">100% Protected</p>
        </div>
      </div>

      {/* ── FILTER & SEARCH BAR ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-200 pb-3">
        <div className="flex gap-1.5 overflow-x-auto">
          <button
            onClick={() => setFilterTab('all')}
            className={clsx(
              'rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all',
              filterTab === 'all'
                ? 'bg-zinc-950 text-white shadow-2xs'
                : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950'
            )}
          >
            All Shipments ({requests.length})
          </button>
          <button
            onClick={() => setFilterTab('active')}
            className={clsx(
              'rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all',
              filterTab === 'active'
                ? 'bg-zinc-950 text-white shadow-2xs'
                : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950'
            )}
          >
            In Transit ({activeCount})
          </button>
          <button
            onClick={() => setFilterTab('delivered')}
            className={clsx(
              'rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all',
              filterTab === 'delivered'
                ? 'bg-zinc-950 text-white shadow-2xs'
                : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950'
            )}
          >
            Delivered ({deliveredCount})
          </button>
          <button
            onClick={() => setFilterTab('matching')}
            className={clsx(
              'rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all',
              filterTab === 'matching'
                ? 'bg-zinc-950 text-white shadow-2xs'
                : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950'
            )}
          >
            Awaiting Match
          </button>
        </div>

        <div className="relative min-w-[220px]">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by city or item..."
            className="w-full rounded-xl border border-zinc-200 bg-white pl-8 pr-3 py-1.5 text-xs text-zinc-950 focus:border-zinc-950 focus:outline-none"
          />
        </div>
      </div>

      {/* ── SHIPMENTS LIST ── */}
      {filteredRequests.length ? (
        <div className="space-y-4">
          {filteredRequests.map((req: any) => {
            const isDelivered = req.status === 'delivered';
            const isInTransit = ['picked_up', 'in_transit'].includes(req.status);
            const isMatched = ['matched', 'confirmed', 'accepted'].includes(req.status);

            return (
              <div
                key={req._id}
                className="group relative overflow-hidden rounded-3xl border border-zinc-200/90 bg-white p-5 shadow-xs transition-all hover:border-zinc-300 hover:shadow-md"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  {/* Left: Corridor & Package Info */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-extrabold text-zinc-950">
                        {req.origin?.city || 'Origin'}
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-zinc-400" />
                      <span className="text-sm font-extrabold text-zinc-950">
                        {req.destination?.city || 'Destination'}
                      </span>

                      {/* Status Badge */}
                      {isDelivered ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" /> Delivered
                        </span>
                      ) : isInTransit ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[10px] font-bold text-blue-700 animate-pulse">
                          <Zap className="h-3 w-3" /> In Transit
                        </span>
                      ) : isMatched ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10px] font-bold text-amber-700">
                          <Clock className="h-3 w-3" /> Carrier Paired
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 border border-zinc-200 px-2.5 py-0.5 text-[10px] font-bold text-zinc-600">
                          <Search className="h-3 w-3" /> Matching Trips
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-600">
                      <span className="font-medium text-zinc-900">
                        📦 {req.package?.description || 'Package'} ({req.package?.weightKg || 1} kg)
                      </span>
                      <span>
                        👤 Recipient: <strong className="text-zinc-800">{req.recipient?.name || 'Contact'}</strong>
                      </span>
                      {req.banknoteSerial && (
                        <span className="font-mono text-[11px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          RBI Seal: {req.banknoteSerial}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions & Tracking Link */}
                  <div className="flex items-center gap-2">
                    <Link to={`/deliveries/${req._id}/matches`}>
                      <Button variant="ghost" size="sm" className="text-xs">
                        View Matches
                      </Button>
                    </Link>

                    <Link to={req.activeMatchId ? `/track/${req.activeMatchId}` : `/deliveries/${req._id}/matches`}>
                      <Button size="sm" className="text-xs font-bold">
                        Live Tracking →
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Progress Mini Bar */}
                <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center justify-between text-[10px] font-semibold text-zinc-500">
                  <span className={clsx(req.status ? 'text-emerald-700 font-bold' : '')}>
                    1. Created
                  </span>
                  <span>→</span>
                  <span className={clsx(isMatched || isInTransit || isDelivered ? 'text-emerald-700 font-bold' : '')}>
                    2. Carrier Accepted
                  </span>
                  <span>→</span>
                  <span className={clsx(isInTransit || isDelivered ? 'text-emerald-700 font-bold' : '')}>
                    3. Picked Up (OTP)
                  </span>
                  <span>→</span>
                  <span className={clsx(isDelivered ? 'text-emerald-700 font-bold' : '')}>
                    4. Delivered (OTP)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="No shipments found"
          description="Post an intercity package dispatch request to start matching against verified live travelers."
          actions={
            <Link to="/send-package">
              <Button>Send a package now</Button>
            </Link>
          }
        />
      )}
    </div>
  );
}
