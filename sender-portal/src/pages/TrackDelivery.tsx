import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MATCH_LOCATION_TRACKING_STATUSES, formatWorkflowStatus } from 'hopdrop-shared';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { matchApi } from '../api/match.api';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { DeliveryStatusBar } from '../components/status/DeliveryStatusBar';
import { TrackingMap } from '../components/map/TrackingMap';
import { getCarrierMatchHref } from '../utils/portal';

export default function TrackDelivery() {
  const { matchId = '' } = useParams();
  const queryClient = useQueryClient();
  const [pickupOtp, setPickupOtp] = useState('');
  const [deliveryOtp, setDeliveryOtp] = useState('');

  const matchQuery = useQuery({
    queryKey: ['trackMatch', matchId],
    queryFn: () => matchApi.getMatch(matchId).then((res) => res.data.data),
    enabled: Boolean(matchId),
    refetchInterval: 8_000
  });

  const runMutation = useMutation({
    mutationFn: async (payload: { type: 'pickup' | 'delivery' | 'confirm' | 'reject'; otp?: string }) => {
      if (payload.type === 'confirm') {
        return matchApi.senderConfirm(matchId);
      }
      if (payload.type === 'reject') {
        return matchApi.senderReject(matchId);
      }
      if (payload.type === 'pickup') {
        return matchApi.verifyPickupOtp(matchId, payload.otp || '');
      }
      return matchApi.verifyDeliveryOtp(matchId, payload.otp || '');
    },
    onSuccess: (_response, payload) => {
      const successMessage =
        payload.type === 'confirm'
          ? 'Carrier confirmed and delivery activated'
          : payload.type === 'reject'
            ? 'Carrier option declined'
            : 'OTP verified';
      toast.success(successMessage);
      queryClient.invalidateQueries({ queryKey: ['trackMatch', matchId] });
    },
    onError: (error: any, payload) => {
      const fallback =
        payload.type === 'confirm' || payload.type === 'reject'
          ? 'Unable to update this match right now.'
          : 'OTP verification failed';
      toast.error(error?.response?.data?.message || fallback);
    }
  });

  if (matchQuery.isLoading) {
    return <Card>Loading delivery tracker...</Card>;
  }

  if (matchQuery.isError) {
    return (
      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">We couldn't load this delivery yet</h2>
        <p className="text-sm text-text-muted">
          {((matchQuery.error as any)?.response?.data?.message as string | undefined) || 'The tracker request failed. Please retry in a moment.'}
        </p>
        <Button onClick={() => matchQuery.refetch()} disabled={matchQuery.isRefetching}>
          {matchQuery.isRefetching ? 'Retrying...' : 'Retry tracker'}
        </Button>
      </Card>
    );
  }

  if (!matchQuery.data) {
    return (
      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">Delivery tracker unavailable</h2>
        <p className="text-sm text-text-muted">
          We couldn't find live match details for this delivery yet. Please refresh and try again.
        </p>
        <Button onClick={() => matchQuery.refetch()} disabled={matchQuery.isRefetching}>
          {matchQuery.isRefetching ? 'Refreshing...' : 'Refresh tracker'}
        </Button>
      </Card>
    );
  }

  const match = matchQuery.data;
  const needsSenderDecision = match.status === 'carrier_accepted';
  const showPickupVerification = match.status === 'pickup_pending';
  const showDeliveryVerification = match.status === 'delivery_pending';
  const showLiveTracking = MATCH_LOCATION_TRACKING_STATUSES.includes(match.status);

  return (
    <div className="space-y-4">
      <DeliveryStatusBar matchId={matchId} currentStatus={match.status} timeline={match.timeline || []} />

      <Card className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Delivery Command Center</h2>
            <p className="text-sm text-text-muted">
              {match.deliveryRequest?.origin?.city} → {match.deliveryRequest?.destination?.city} · {formatWorkflowStatus(match.status)}
            </p>
          </div>
          <a href={getCarrierMatchHref(matchId)}>
            <Button variant="ghost">Open Carrier View</Button>
          </a>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-border px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-text-muted">Carrier</p>
            <p className="mt-2 font-semibold">{match.carrier?.name || 'Assigned carrier'}</p>
            <p className="text-sm text-text-muted">{match.trip?.modeOfTransport || 'Route in progress'}</p>
          </div>
          <div className="rounded-lg border border-border px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-text-muted">Package</p>
            <p className="mt-2 font-semibold">{match.deliveryRequest?.package?.description || 'Delivery package'}</p>
            <p className="text-sm text-text-muted">{match.deliveryRequest?.package?.weightKg || '-'} kg · {match.deliveryRequest?.package?.category || 'category pending'}</p>
          </div>
          <div className="rounded-lg border border-border px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-text-muted">Recipient</p>
            <p className="mt-2 font-semibold">{match.deliveryRequest?.recipient?.name || 'Recipient'}</p>
            <p className="text-sm text-text-muted">{match.deliveryRequest?.recipient?.address || 'Destination address pending'}</p>
          </div>
        </div>
      </Card>

      {needsSenderDecision ? (
        <Card className="space-y-3 border-primary/30">
          <h2 className="text-lg font-semibold">Carrier Accepted Your Request</h2>
          <p className="text-sm text-text-muted">
            Confirm this carrier to lock the match and let pickup OTP generation begin. If you reject, this match is cancelled and you can wait for other trips.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => runMutation.mutate({ type: 'confirm' })} disabled={runMutation.isPending}>
              Confirm Carrier
            </Button>
            <Button variant="danger" onClick={() => runMutation.mutate({ type: 'reject' })} disabled={runMutation.isPending}>
              Reject Match
            </Button>
          </div>
        </Card>
      ) : null}

      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">Live Carrier Tracking</h2>
        {showLiveTracking ? (
          <TrackingMap matchId={matchId} />
        ) : (
          <p className="text-sm text-text-muted">
            Live tracking will appear here once pickup is verified and the carrier starts moving toward the destination.
          </p>
        )}
      </Card>

      {showPickupVerification || showDeliveryVerification ? (
        <Card className="space-y-3">
          <h2 className="text-lg font-semibold">OTP Verification</h2>

          <div className="grid gap-3 md:grid-cols-2">
            {showPickupVerification ? (
              <div className="space-y-2">
                <Input label="Enter Pickup OTP" value={pickupOtp} onChange={(e) => setPickupOtp(e.target.value)} />
                <Button onClick={() => runMutation.mutate({ type: 'pickup', otp: pickupOtp })} disabled={runMutation.isPending}>
                  Verify Pickup OTP
                </Button>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border px-3 py-4 text-sm text-text-muted">
                Pickup OTP verification will appear once the carrier generates the handoff code.
              </div>
            )}

            {showDeliveryVerification ? (
              <div className="space-y-2">
                <Input label="Enter Delivery OTP" value={deliveryOtp} onChange={(e) => setDeliveryOtp(e.target.value)} />
                <Button onClick={() => runMutation.mutate({ type: 'delivery', otp: deliveryOtp })} disabled={runMutation.isPending}>
                  Verify Delivery OTP
                </Button>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border px-3 py-4 text-sm text-text-muted">
                Delivery OTP verification becomes available when the carrier reaches the destination.
              </div>
            )}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
