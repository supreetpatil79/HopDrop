import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Clock, IndianRupee, Landmark, WalletCards } from 'lucide-react';
import { MATCH_ACTIVE_STATUSES, MATCH_COMPLETED_STATUSES, formatWorkflowStatus } from 'hopdrop-shared';
import { userApi } from '../api/user.api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { fetchCarrierMatches } from '../utils/matches';
import { formatDateTime, formatINRPaise } from '../utils/format';

function getMatchPayout(match: any) {
  return match.financials?.payoutToCarrier ?? match.payoutToCarrier ?? 0;
}

function getMatchPlatformFee(match: any) {
  return match.financials?.platformFee ?? Math.max((match.agreedPrice || 0) - getMatchPayout(match), 0);
}

function getMatchId(value: any) {
  return value?._id?.toString?.() || value?.toString?.() || '';
}

export default function Earnings() {
  const walletQuery = useQuery({ queryKey: ['wallet'], queryFn: () => userApi.wallet().then((r) => r.data.data) });
  const matchesQuery = useQuery({ queryKey: ['carrier-earnings-matches'], queryFn: fetchCarrierMatches });

  const wallet = walletQuery.data;
  const matches = matchesQuery.data || [];
  const transactions = wallet?.transactions || [];

  const metrics = useMemo(() => {
    const releasedMatchIds = new Set(
      transactions
        .filter((tx: any) => tx.type === 'carrier_payout' && tx.status === 'completed')
        .map((tx: any) => getMatchId(tx.match))
        .filter(Boolean)
    );
    const activeMatches = matches.filter((match: any) => MATCH_ACTIVE_STATUSES.includes(match.status));
    const completedMatches = matches.filter((match: any) => MATCH_COMPLETED_STATUSES.includes(match.status));
    const payoutTransactions = transactions.filter((tx: any) => tx.type === 'carrier_payout' && tx.status === 'completed');
    const pendingMatches = matches.filter((match: any) => {
      if (['cancelled', 'disputed'].includes(match.status)) {
        return false;
      }

      return !releasedMatchIds.has(match._id);
    });

    const routeTotals = pendingMatches.concat(completedMatches).reduce((acc: Record<string, { route: string; count: number; payout: number }>, match: any) => {
      const route = `${match.deliveryRequest?.origin?.city || 'Origin'} -> ${match.deliveryRequest?.destination?.city || 'Destination'}`;
      acc[route] ||= { route, count: 0, payout: 0 };
      acc[route].count += 1;
      acc[route].payout += getMatchPayout(match);
      return acc;
    }, {});

    return {
      activeCount: activeMatches.length,
      completedCount: completedMatches.length,
      releasedPayout: payoutTransactions.reduce((sum: number, tx: any) => sum + (tx.amount || 0), 0),
      pendingPayout: pendingMatches.reduce((sum: number, match: any) => sum + getMatchPayout(match), 0),
      bookedPayout: matches.reduce((sum: number, match: any) => sum + getMatchPayout(match), 0),
      platformFeesCoveredBySenders: matches.reduce((sum: number, match: any) => sum + getMatchPlatformFee(match), 0),
      averageCompletedPayout:
        completedMatches.length > 0
          ? Math.round(completedMatches.reduce((sum: number, match: any) => sum + getMatchPayout(match), 0) / completedMatches.length)
          : 0,
      topRoutes: Object.values(routeTotals)
        .sort((a, b) => b.payout - a.payout)
        .slice(0, 4),
      pipeline: pendingMatches
        .sort((a: any, b: any) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime())
        .slice(0, 6)
    };
  }, [matches, transactions]);

  if (walletQuery.isLoading || matchesQuery.isLoading) {
    return <Card>Loading earnings...</Card>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Carrier Earnings</h1>
          <p className="text-sm text-text-muted">Payouts, escrow, and package income from your live delivery pipeline.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/incoming-requests">
            <Button variant="ghost">Review Requests</Button>
          </Link>
          <Link to="/post-trip">
            <Button>Post Earning Route</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Card className="border-primary/20">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs uppercase tracking-wide text-text-muted">Available</p>
            <WalletCards className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-2 text-2xl font-bold text-dark">{formatINRPaise(wallet?.balance)}</p>
          <Button className="mt-3" disabled={!wallet?.balance}>Withdraw</Button>
        </Card>
        <Card className="border-primary/20">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs uppercase tracking-wide text-text-muted">Pending Payout</p>
            <Clock className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-2 text-2xl font-bold text-dark">{formatINRPaise(metrics.pendingPayout)}</p>
          <p className="mt-1 text-sm text-text-muted">{metrics.activeCount} active delivery handoffs</p>
        </Card>
        <Card className="border-primary/20">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs uppercase tracking-wide text-text-muted">Released</p>
            <IndianRupee className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-2 text-2xl font-bold text-dark">{formatINRPaise(metrics.releasedPayout)}</p>
          <p className="mt-1 text-sm text-text-muted">{metrics.completedCount} completed deliveries</p>
        </Card>
        <Card className="border-primary/20">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs uppercase tracking-wide text-text-muted">Escrow Held</p>
            <Landmark className="h-4 w-4 text-primary" />
          </div>
          <p className="mt-2 text-2xl font-bold text-dark">{formatINRPaise(wallet?.escrowHeld)}</p>
          <p className="mt-1 text-sm text-text-muted">Refundable deposits and locked payments.</p>
        </Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.25fr_0.75fr]">
        <Card className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold">Payout Pipeline</h2>
              <p className="text-sm text-text-muted">Jobs that can still turn into wallet balance.</p>
            </div>
            <p className="text-sm font-semibold text-primary">{formatINRPaise(metrics.bookedPayout)} booked</p>
          </div>

          {metrics.pipeline.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-text-muted">
                    <th className="px-2 py-2">Route</th>
                    <th className="px-2 py-2">Package</th>
                    <th className="px-2 py-2">Status</th>
                    <th className="px-2 py-2 text-right">Payout</th>
                    <th className="px-2 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {metrics.pipeline.map((match: any) => (
                    <tr key={match._id} className="border-b border-border/70">
                      <td className="px-2 py-2 font-medium">
                        {match.deliveryRequest?.origin?.city || '-'} to {match.deliveryRequest?.destination?.city || '-'}
                      </td>
                      <td className="px-2 py-2 text-text-muted">
                        {match.deliveryRequest?.package?.weightKg || '-'} kg {match.deliveryRequest?.package?.category || ''}
                      </td>
                      <td className="px-2 py-2">{formatWorkflowStatus(match.status)}</td>
                      <td className="px-2 py-2 text-right font-semibold">{formatINRPaise(getMatchPayout(match))}</td>
                      <td className="px-2 py-2">
                        <Link to={`/active-delivery/${match._id}`} className="inline-flex items-center text-primary">
                          <ArrowUpRight className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-text-muted">No pending payouts yet. Accepted jobs will appear here.</p>
          )}
        </Card>

        <div className="space-y-3">
          <Card className="space-y-3">
            <h2 className="text-lg font-semibold">Earning Quality</h2>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-text-muted">Avg Completed</p>
                <p className="mt-1 font-semibold">{formatINRPaise(metrics.averageCompletedPayout)}</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-text-muted">Sender Fees</p>
                <p className="mt-1 font-semibold">{formatINRPaise(metrics.platformFeesCoveredBySenders)}</p>
              </div>
            </div>
            <p className="text-sm text-text-muted">Carrier payout is tracked separately from sender platform fees.</p>
          </Card>

          <Card className="space-y-3">
            <h2 className="text-lg font-semibold">Best Routes</h2>
            {metrics.topRoutes.length ? (
              <div className="space-y-2">
                {metrics.topRoutes.map((route) => (
                  <div key={route.route} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
                    <div>
                      <p className="text-sm font-semibold">{route.route}</p>
                      <p className="text-xs text-text-muted">{route.count} package{route.count === 1 ? '' : 's'}</p>
                    </div>
                    <p className="text-sm font-semibold text-primary">{formatINRPaise(route.payout)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-muted">Route performance appears after you receive matches.</p>
            )}
          </Card>
        </div>
      </div>

      <Card>
        <h2 className="mb-3 text-lg font-semibold">Transaction History</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-text-muted">
                <th className="px-2 py-2">Date</th>
                <th className="px-2 py-2">Type</th>
                <th className="px-2 py-2">Amount</th>
                <th className="px-2 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx: any) => (
                <tr key={tx._id} className="border-b border-border/70">
                  <td className="px-2 py-2">{formatDateTime(tx.createdAt)}</td>
                  <td className="px-2 py-2">{tx.type}</td>
                  <td className="px-2 py-2">{formatINRPaise(tx.amount)}</td>
                  <td className="px-2 py-2">{tx.status}</td>
                </tr>
              ))}
              {!transactions.length ? (
                <tr>
                  <td className="px-2 py-4 text-text-muted" colSpan={4}>No wallet transactions yet.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
