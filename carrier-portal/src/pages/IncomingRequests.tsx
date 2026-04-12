import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MATCH_ACTIVE_STATUSES, formatWorkflowStatus } from 'hopdrop-shared';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { matchApi } from '../api/match.api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { fetchCarrierMatches } from '../utils/matches';

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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Incoming Requests</h1>
          <p className="text-sm text-text-muted">Matches created by the sender portal appear here automatically as soon as the backend pairs them to your trip.</p>
        </div>
        <a href="/browse-carriers">
          <Button variant="ghost">Open Sender Match List</Button>
        </a>
      </div>

      {matches.length ? (
        <div className="space-y-4">
          <Card className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold">Awaiting Your Decision</h2>
                <p className="text-sm text-text-muted">Accept here to hand the match off to sender confirmation and payment-ready pickup.</p>
              </div>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{proposedMatches.length} pending</span>
            </div>

            {proposedMatches.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {proposedMatches.map((match) => (
                  <Card key={match._id} className="space-y-3 border-primary/20">
                    <div>
                      <p className="font-semibold">{match.deliveryRequest?.origin?.city} → {match.deliveryRequest?.destination?.city}</p>
                      <p className="text-xs text-text-muted">
                        {match.deliveryRequest?.package?.description || 'Package request'} · {match.deliveryRequest?.package?.weightKg || '-'} kg
                      </p>
                    </div>
                    <div className="text-xs text-text-muted">
                      Sender: {match.sender?.name || 'Sender'} · Recipient: {match.deliveryRequest?.recipient?.name || 'Recipient'}
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
              <p className="text-sm text-text-muted">No new matches are waiting on you right now.</p>
            )}
          </Card>

          <Card className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold">In Progress</h2>
                <p className="text-sm text-text-muted">These matches already moved past proposal and should stay in sync with the sender tracker.</p>
              </div>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{activeMatches.length} live</span>
            </div>

            {activeMatches.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {activeMatches.map((match) => (
                  <Card key={match._id} className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{match.deliveryRequest?.origin?.city} → {match.deliveryRequest?.destination?.city}</p>
                        <p className="text-xs text-text-muted">{match.deliveryRequest?.package?.description || 'Package request'}</p>
                      </div>
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                        {formatWorkflowStatus(match.status)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link to={`/active-delivery/${match._id}`}>
                        <Button>Resume Delivery</Button>
                      </Link>
                      <a href={`/track-delivery/${match._id}`}>
                        <Button variant="ghost">Sender Tracker</Button>
                      </a>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-muted">No active delivery handoffs yet.</p>
            )}
          </Card>
        </div>
      ) : (
        <Card>
          <p className="text-sm text-text-muted">No incoming matches right now.</p>
        </Card>
      )}
    </div>
  );
}
