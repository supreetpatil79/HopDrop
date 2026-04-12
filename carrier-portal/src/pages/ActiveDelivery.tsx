import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CARRIER_STATUS_GUIDANCE, MATCH_LOCATION_TRACKING_STATUSES, formatWorkflowStatus } from 'hopdrop-shared';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { matchApi } from '../api/match.api';
import { useSocket } from '../hooks/useSocket';
import { useLocationBroadcast } from '../hooks/useLocationBroadcast';
import { TripStatusBar } from '../components/status/TripStatusBar';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { OTPDisplay } from '../components/otp/OTPDisplay';
import { OTPVerify } from '../components/otp/OTPVerify';
import { TrackingMap } from '../components/map/TrackingMap';
import { getSenderMatchHref } from '../utils/portal';

export default function ActiveDelivery() {
  const { matchId = '' } = useParams();
  const queryClient = useQueryClient();
  const socket = useSocket(matchId);
  const [pickupOtp, setPickupOtp] = useState<string>('');
  const [deliveryOtp, setDeliveryOtp] = useState<string>('');

  const matchQuery = useQuery({
    queryKey: ['carrier-match', matchId],
    queryFn: () => matchApi.getMatch(matchId).then((res) => res.data.data),
    enabled: Boolean(matchId),
    refetchInterval: 8000
  });

  const match = matchQuery.data;
  const shouldBroadcast = ['picked_up', 'in_transit', 'delivery_pending'].includes(match?.status || '');
  useLocationBroadcast(socket, matchId, shouldBroadcast);

  useEffect(() => {
    if (match?.otp?.pickup?.code) {
      setPickupOtp(match.otp.pickup.code);
    }
    if (match?.otp?.delivery?.code) {
      setDeliveryOtp(match.otp.delivery.code);
    }
  }, [match?.otp?.pickup?.code, match?.otp?.delivery?.code]);

  useEffect(() => {
    if (!socket) {
      return;
    }
    const refresh = () => queryClient.invalidateQueries({ queryKey: ['carrier-match', matchId] });
    socket.on('match:status_changed', refresh);
    return () => {
      socket.off('match:status_changed', refresh);
    };
  }, [socket, queryClient, matchId]);

  const run = useMutation({
    mutationFn: async (action: 'accept' | 'reject' | 'pickup' | 'delivery' | 'delivery_verify') => {
      if (action === 'accept') return matchApi.carrierAccept(matchId);
      if (action === 'reject') return matchApi.carrierReject(matchId);
      if (action === 'pickup') return matchApi.generatePickupOtp(matchId);
      if (action === 'delivery') return matchApi.generateDeliveryOtp(matchId);
      if (action === 'delivery_verify') return matchApi.verifyDeliveryOtp(matchId, deliveryOtp);
      throw new Error('Unsupported action');
    },
    onSuccess: (res: any, action) => {
      if (action === 'pickup') setPickupOtp(res?.data?.data?.otp || '');
      if (action === 'delivery') setDeliveryOtp(res?.data?.data?.otp || '');
      toast.success('Action complete');
      queryClient.invalidateQueries({ queryKey: ['carrier-match', matchId] });
    },
    onError: (error: any) => toast.error(error?.response?.data?.message || 'Action failed')
  });

  if (matchQuery.isLoading) {
    return <Card>Loading active delivery...</Card>;
  }

  if (matchQuery.isError) {
    return (
      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">We couldn't load this delivery workspace yet</h2>
        <p className="text-sm text-text-muted">
          {((matchQuery.error as any)?.response?.data?.message as string | undefined) || 'The latest delivery details could not be fetched. Please retry.'}
        </p>
        <Button onClick={() => matchQuery.refetch()} disabled={matchQuery.isRefetching}>
          {matchQuery.isRefetching ? 'Retrying...' : 'Retry workspace'}
        </Button>
      </Card>
    );
  }

  if (!match) {
    return (
      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">Delivery workspace unavailable</h2>
        <p className="text-sm text-text-muted">
          This match is not ready to render yet. Refresh once the latest status sync completes.
        </p>
        <Button onClick={() => matchQuery.refetch()} disabled={matchQuery.isRefetching}>
          {matchQuery.isRefetching ? 'Refreshing...' : 'Refresh workspace'}
        </Button>
      </Card>
    );
  }

  const canAccept = match.status === 'proposed';
  const waitingForSender = match.status === 'carrier_accepted';
  const canGeneratePickupOtp = ['sender_confirmed', 'active'].includes(match.status);
  const canGenerateDeliveryOtp = ['picked_up', 'in_transit'].includes(match.status);
  const showTrackingMap = MATCH_LOCATION_TRACKING_STATUSES.includes(match.status);

  return (
    <div className="space-y-4">
      <TripStatusBar matchId={matchId} currentStatus={match.status} timeline={match.timeline || []} />

      <Card className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Carrier Delivery Workspace</h2>
            <p className="text-sm text-text-muted">
              {match.deliveryRequest?.origin?.city} → {match.deliveryRequest?.destination?.city} · {formatWorkflowStatus(match.status)}
            </p>
          </div>
          <a href={getSenderMatchHref(matchId)}>
            <Button variant="ghost">Open Sender Tracker</Button>
          </a>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-lg border border-border px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-text-muted">Sender</p>
            <p className="mt-2 font-semibold">{match.sender?.name || 'Sender'}</p>
            <p className="text-sm text-text-muted">{match.sender?.phone || 'Phone hidden'}</p>
          </div>
          <div className="rounded-lg border border-border px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-text-muted">Package</p>
            <p className="mt-2 font-semibold">{match.deliveryRequest?.package?.description || 'Package request'}</p>
            <p className="text-sm text-text-muted">{match.deliveryRequest?.package?.weightKg || '-'} kg · {match.deliveryRequest?.package?.category || 'category pending'}</p>
          </div>
          <div className="rounded-lg border border-border px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-text-muted">Recipient</p>
            <p className="mt-2 font-semibold">{match.deliveryRequest?.recipient?.name || 'Recipient'}</p>
            <p className="text-sm text-text-muted">{match.deliveryRequest?.recipient?.address || 'Destination address pending'}</p>
          </div>
          <div className="rounded-lg border border-border px-3 py-3">
            <p className="text-xs uppercase tracking-wide text-text-muted">Payout</p>
            <p className="mt-2 font-semibold">₹{Math.round((match.payoutToCarrier || 0) / 100)}</p>
            <p className="text-sm text-text-muted">Agreed price ₹{Math.round((match.agreedPrice || 0) / 100)}</p>
          </div>
        </div>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">Actions</h2>
        <p className="text-sm text-text-muted">{CARRIER_STATUS_GUIDANCE[match.status] || 'Follow the delivery flow shown above.'}</p>
        <div className="flex flex-wrap gap-2">
          {canAccept ? <Button onClick={() => run.mutate('accept')} disabled={run.isPending}>Accept Match</Button> : null}
          {canAccept ? <Button variant="danger" onClick={() => run.mutate('reject')} disabled={run.isPending}>Reject</Button> : null}
          {canGeneratePickupOtp ? (
            <Button onClick={() => run.mutate('pickup')} disabled={run.isPending}>
              Generate Pickup OTP
            </Button>
          ) : null}
          {canGenerateDeliveryOtp ? (
            <Button onClick={() => run.mutate('delivery')} disabled={run.isPending}>
              Generate Delivery OTP
            </Button>
          ) : null}
        </div>
        {waitingForSender ? (
          <div className="rounded-lg border border-dashed border-border px-3 py-3 text-sm text-text-muted">
            This match is accepted on your side. The sender now needs to confirm it from their tracker before pickup can start.
          </div>
        ) : null}
      </Card>

      {pickupOtp ? <OTPDisplay otp={pickupOtp} title="Pickup OTP" /> : null}
      {deliveryOtp ? <OTPDisplay otp={deliveryOtp} title="Delivery OTP" /> : null}

      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">Live Tracking</h2>
        {showTrackingMap ? (
          <TrackingMap matchId={matchId} />
        ) : (
          <p className="text-sm text-text-muted">
            Tracking becomes active after pickup is verified and stays live until final delivery.
          </p>
        )}
      </Card>

      {match.status === 'delivery_pending' || deliveryOtp ? (
        <Card className="space-y-3">
          <h2 className="text-lg font-semibold">Recipient Delivery OTP Verify</h2>
          <OTPVerify
            label="Delivery OTP"
            onVerify={async (otp) => {
              await matchApi.verifyDeliveryOtp(matchId, otp);
              toast.success('Delivery OTP verified');
              queryClient.invalidateQueries({ queryKey: ['carrier-match', matchId] });
            }}
          />
        </Card>
      ) : null}
    </div>
  );
}
