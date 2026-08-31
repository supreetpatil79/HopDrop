import toast from 'react-hot-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { EmptyState, LoadingState, PageHeader } from 'hopdrop-shared';
import { MATCH_ACTIVE_STATUSES, formatWorkflowStatus } from 'hopdrop-shared';
import { Link } from 'react-router-dom';
import { matchApi } from '../api/match.api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { fetchCarrierMatches } from '../utils/matches';
import { formatINRPaise } from '../utils/format';

export default function IncomingRequests() {
  const queryClient = useQueryClient();
  const matchesQuery = useQuery({
    queryKey: ['carrier-incoming-matches'],
    queryFn: fetchCarrierMatches
  });

  const actionMutation = useMutation({
    mutationFn: async (payload: { type: 'accept' | 'reject'; matchId: string }) => {
      if (payload.type === 'accept') {
        return matchApi.carrierAccept(payload.matchId);
      }

      return matchApi.carrierReject(payload.matchId);
    },
    onSuccess: (_response, payload) => {
      toast.success(payload.type === 'accept' ? 'Match accepted' : 'Match rejected');
      queryClient.invalidateQueries({ queryKey: ['carrier-incoming-matches'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Unable to update this match right now.');
    }
  });

  const matches = matchesQuery.data || [];
  const proposedMatches = matches.filter((match) => match.status === 'proposed');
  const activeMatches = matches.filter((match) => MATCH_ACTIVE_STATUSES.includes(match.status));

  if (matchesQuery.isLoading && !matches.length) {
    return (
      <LoadingState
        title="Loading incoming requests"
        description="Fetching newly matched sender requests and current delivery handoffs."
      />
    );
  }

  if (matchesQuery.isError && !matches.length) {
    return (
      <EmptyState
        title="We couldn't load incoming requests"
        description="Refresh the page to reconnect to your latest matched delivery requests."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Match queue"
        title="Incoming Requests"
        description="Matches created by the sender portal appear here automatically as soon as the backend pairs them to your trip."
        actions={
          <a href="/browse-carriers">
            <Button variant="ghost">Open Sender Match List</Button>
          </a>
        }
      />

      {matches.length ? (
        <div className="space-y-4">
          <Card className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="section-title text-lg">Awaiting your decision</h2>
                <p className="section-copy">Accept here to hand the match off to sender confirmation and payment-ready pickup.</p>
              </div>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{proposedMatches.length} pending</span>
            </div>

            {proposedMatches.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {proposedMatches.map((match) => (
                  <Card key={match._id} className="space-y-4 border-primary/20" interactive>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                        {match.deliveryRequest?.origin?.city} → {match.deliveryRequest?.destination?.city}
                      </p>
                      <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-dark">
                        {match.deliveryRequest?.package?.description || 'Package request'} · {match.deliveryRequest?.package?.weightKg || '-'} kg
                      </p>
                    </div>
                    <div className="text-sm leading-6 text-text-muted">
                      Sender: {match.sender?.name || 'Sender'} · Recipient: {match.deliveryRequest?.recipient?.name || 'Recipient'}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="rounded-2xl border border-border/70 bg-slate-50/80 px-3 py-3">
                        <p className="text-xs text-text-muted">Your Payout</p>
                        <p className="mt-1 font-semibold text-dark">{formatINRPaise(match.financials?.payoutToCarrier ?? match.payoutToCarrier)}</p>
                      </div>
                      <div className="rounded-2xl border border-border/70 bg-slate-50/80 px-3 py-3">
                        <p className="text-xs text-text-muted">Payout/kg</p>
                        <p className="mt-1 font-semibold text-dark">{formatINRPaise(match.financials?.payoutPerKg)}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={() => actionMutation.mutate({ type: 'accept', matchId: match._id })}
                        disabled={actionMutation.isPending}
                      >
                        Accept Match
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => actionMutation.mutate({ type: 'reject', matchId: match._id })}
                        disabled={actionMutation.isPending}
                      >
                        Reject
                      </Button>
                      <Link to={`/active-delivery/${match._id}`}>
                        <Button variant="ghost">Open Details</Button>
                      </Link>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState title="No new requests waiting on you" description="We'll surface new matched packages here as soon as they arrive." />
            )}
          </Card>

          <Card className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="section-title text-lg">In progress</h2>
                <p className="section-copy">These matches already moved past proposal and should stay in sync with the sender tracker.</p>
              </div>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{activeMatches.length} live</span>
            </div>

            {activeMatches.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {activeMatches.map((match) => (
                  <Card key={match._id} className="space-y-4" interactive>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
                          {match.deliveryRequest?.origin?.city} → {match.deliveryRequest?.destination?.city}
                        </p>
                        <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-dark">
                          {match.deliveryRequest?.package?.description || 'Package request'}
                        </p>
                      </div>
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                        {formatWorkflowStatus(match.status)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link to={`/active-delivery/${match._id}`}>
                        <Button>Resume Delivery</Button>
                      </Link>
                      <span className="inline-flex items-center rounded-xl border border-border/70 bg-slate-50/80 px-3 py-2 text-sm font-semibold text-primary">
                        {formatINRPaise(match.financials?.payoutToCarrier ?? match.payoutToCarrier)}
                      </span>
                      <a href={`/track-delivery/${match._id}`}>
                        <Button variant="ghost">Sender Tracker</Button>
                      </a>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState title="No active delivery handoffs yet" description="Accepted matches will move here once pickup, OTP, and live tracking start." />
            )}
          </Card>
        </div>
      ) : (
        <EmptyState title="No incoming matches right now" description="Keep your trips active and this board will populate as soon as the backend pairs a sender request to your route." />
      )}
    </div>
  );
}
