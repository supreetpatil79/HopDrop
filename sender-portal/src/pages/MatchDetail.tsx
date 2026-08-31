import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { useParams } from 'react-router-dom';
import { matchApi } from '../api/match.api';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { TextArea } from '../components/ui/TextArea';
import { MatchTimeline } from '../components/match/MatchTimeline';
import { LiveMap } from '../components/map/LiveMap';
import { RoutePreviewMap } from '../components/map/RoutePreviewMap';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import { ratingSchema } from '../validators/forms';


type RatingValues = {
  score: number;
  comment?: string;
};

export default function MatchDetail() {
  const { matchId = '' } = useParams();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const socket = useSocket(matchId);

  const [pickupOtpInput, setPickupOtpInput] = useState('');
  const [deliveryOtpInput, setDeliveryOtpInput] = useState('');
  const [generatedPickupOtp, setGeneratedPickupOtp] = useState<string | null>(null);
  const [generatedDeliveryOtp, setGeneratedDeliveryOtp] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({ lat: 12.9716, lng: 77.5946 });

  const matchQuery = useQuery({
    queryKey: ['match', matchId],
    queryFn: () => matchApi.getMatch(matchId).then((r) => r.data.data),
    enabled: Boolean(matchId)
  });

  const match = matchQuery.data;
  const carrierId = useMemo(() => match?.carrier?._id || match?.carrier, [match]);
  const senderId = useMemo(() => match?.sender?._id || match?.sender, [match]);
  const isCarrier = user?._id === carrierId;
  const isSender = user?._id === senderId;

  useEffect(() => {
    if (!socket) {
      return;
    }

    const refresh = () => queryClient.invalidateQueries({ queryKey: ['match', matchId] });

    socket.on('match:carrier_accepted', refresh);
    socket.on('otp:pickup_generated', refresh);
    socket.on('otp:pickup_verified', refresh);
    socket.on('otp:delivery_generated', refresh);
    socket.on('otp:delivery_verified', refresh);
    socket.on('location:update', (payload: any) => {
      if (payload?.lat && payload?.lng) {
        setCoords({ lat: payload.lat, lng: payload.lng });
      }
    });

    return () => {
      socket.off('match:carrier_accepted', refresh);
      socket.off('otp:pickup_generated', refresh);
      socket.off('otp:pickup_verified', refresh);
      socket.off('otp:delivery_generated', refresh);
      socket.off('otp:delivery_verified', refresh);
      socket.off('location:update');
    };
  }, [socket, queryClient, matchId]);

  const runMutation = (fn: () => Promise<any>, successMessage: string) =>
    fn()
      .then(() => {
        toast.success(successMessage);
        queryClient.invalidateQueries({ queryKey: ['match', matchId] });
      })
      .catch(() => toast.error('Action failed'));

  const { register, handleSubmit, formState: { errors }, reset } = useForm<RatingValues>({
    resolver: zodResolver(ratingSchema),
    defaultValues: { score: 5, comment: '' }
  });

  if (matchQuery.isLoading) {
    return <Card>Loading match details...</Card>;
  }

  if (matchQuery.isError) {
    return (
      <Card className="space-y-3">
        <h1 className="text-2xl font-bold">Match Detail</h1>
        <p className="text-sm text-text-muted">
          {((matchQuery.error as any)?.response?.data?.message as string | undefined) || 'We could not load this match right now.'}
        </p>
        <Button onClick={() => matchQuery.refetch()} disabled={matchQuery.isRefetching}>
          {matchQuery.isRefetching ? 'Retrying...' : 'Retry match'}
        </Button>
      </Card>
    );
  }

  if (!match) {
    return (
      <Card className="space-y-3">
        <h1 className="text-2xl font-bold">Match Detail</h1>
        <p className="text-sm text-text-muted">No live match data is available for this page yet.</p>
        <Button onClick={() => matchQuery.refetch()} disabled={matchQuery.isRefetching}>
          {matchQuery.isRefetching ? 'Refreshing...' : 'Refresh match'}
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {match.deliveryRequest?.origin?.city && match.deliveryRequest?.destination?.city ? (
        <RoutePreviewMap
          origin={{
            city: match.deliveryRequest.origin.city,
            coords: (match.deliveryRequest.origin as any).coordinates?.coordinates || [77.5946, 12.9716]
          }}
          destination={{
            city: match.deliveryRequest.destination.city,
            coords: (match.deliveryRequest.destination as any).coordinates?.coordinates || [72.8777, 19.076]
          }}
          modeOfTransport={match.trip?.modeOfTransport || 'train'}
        />
      ) : null}

      <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <Card className="space-y-2">
            <h1 className="text-2xl font-bold">Match Detail</h1>
            <p className="text-sm text-text-muted">
              {match.deliveryRequest?.origin?.city} → {match.deliveryRequest?.destination?.city}
            </p>
            <p className="text-sm">Current Status: <span className="font-semibold">{match.status}</span></p>
          </Card>


        <Card className="space-y-3">
          <h2 className="font-semibold">Status Timeline</h2>
          <MatchTimeline currentStatus={match.status} />
        </Card>

        <Card className="space-y-3">
          <h2 className="font-semibold">OTP Controls</h2>

          {isCarrier && match.status === 'proposed' ? (
            <div className="flex gap-2">
              <Button onClick={() => runMutation(() => matchApi.carrierAccept(matchId), 'Accepted')}>Accept</Button>
              <Button variant="danger" onClick={() => runMutation(() => matchApi.carrierReject(matchId), 'Rejected')}>
                Reject
              </Button>
            </div>
          ) : null}

          {isSender && match.status === 'carrier_accepted' ? (
            <div className="flex gap-2">
              <Button onClick={() => runMutation(() => matchApi.senderConfirm(matchId), 'Confirmed')}>Confirm</Button>
              <Button variant="danger" onClick={() => runMutation(() => matchApi.senderReject(matchId), 'Rejected')}>
                Reject
              </Button>
            </div>
          ) : null}

          {isCarrier ? (
            <div className="space-y-2">
              <Button onClick={() => runMutation(() => matchApi.generatePickupOtp(matchId).then((r) => setGeneratedPickupOtp(r.data.data.otp)), 'Pickup OTP generated')}>
                Show Pickup OTP to Sender
              </Button>
              {generatedPickupOtp ? <p className="rounded bg-dark px-3 py-2 text-center text-2xl font-bold text-primary">{generatedPickupOtp}</p> : null}
            </div>
          ) : null}

          {isSender ? (
            <div className="space-y-2">
              <Input label="Enter Pickup OTP" value={pickupOtpInput} onChange={(e) => setPickupOtpInput(e.target.value)} />
              <Button onClick={() => runMutation(() => matchApi.verifyPickupOtp(matchId, pickupOtpInput), 'Pickup verified')}>Verify Pickup OTP</Button>
            </div>
          ) : null}

          {isCarrier ? (
            <div className="space-y-2 border-t border-border pt-3">
              <Button onClick={() => runMutation(() => matchApi.generateDeliveryOtp(matchId).then((r) => setGeneratedDeliveryOtp(r.data.data.otp)), 'Delivery OTP generated')}>
                Generate Delivery OTP
              </Button>
              {generatedDeliveryOtp ? <p className="rounded bg-dark px-3 py-2 text-center text-2xl font-bold text-primary">{generatedDeliveryOtp}</p> : null}
            </div>
          ) : null}

          {isSender ? (
            <div className="space-y-2 border-t border-border pt-3">
              <Input label="Enter Delivery OTP" value={deliveryOtpInput} onChange={(e) => setDeliveryOtpInput(e.target.value)} />
              <Button onClick={() => runMutation(() => matchApi.verifyDeliveryOtp(matchId, deliveryOtpInput), 'Delivery verified')}>
                Verify Delivery OTP
              </Button>
            </div>
          ) : null}
        </Card>

        <Card className="space-y-2">
          <h2 className="font-semibold">Last-Mile Options</h2>
          {isCarrier ? (
            <Button
              onClick={() =>
                runMutation(
                  () => matchApi.requestRapido(matchId, { pickupCoords: [coords.lng, coords.lat], dropAddress: match.deliveryRequest?.recipient?.address || 'Destination' }),
                  'Rapido requested'
                )
              }
            >
              Request Rapido for Last Mile
            </Button>
          ) : (
            <p className="text-sm text-text-muted">Carrier can request Rapido after reaching destination.</p>
          )}
        </Card>

        {match.status === 'delivered' ? (
          <Card className="space-y-3">
            <h2 className="font-semibold">Rate Your Experience</h2>
            <form
              className="space-y-2"
              onSubmit={handleSubmit((values) =>
                runMutation(
                  () =>
                    matchApi.rate(matchId, {
                      score: Number(values.score),
                      comment: values.comment
                    }),
                  'Rating submitted'
                ).then(() => reset({ score: 5, comment: '' }))
              )}
            >
              <Input type="number" min={1} max={5} label="Score (1-5)" {...register('score', { valueAsNumber: true })} error={errors.score?.message} />
              <TextArea label="Comment" {...register('comment')} />
              <Button type="submit">Submit Rating</Button>
            </form>
          </Card>
        ) : null}
      </div>

      <div className="space-y-4">
        <Card className="space-y-2">
          <h2 className="font-semibold">Package</h2>
          {match.deliveryRequest?.package?.photoUrl ? (
            <img src={match.deliveryRequest.package.photoUrl} alt="Package" className="h-40 w-full rounded object-cover" />
          ) : (
            <div className="rounded bg-surface-alt p-4 text-sm text-text-muted">No package photo uploaded.</div>
          )}
          <p className="text-sm">{match.deliveryRequest?.package?.description}</p>
        </Card>

        <Card className="space-y-2">
          <h2 className="font-semibold">Recipient</h2>
          <p className="text-sm">{match.deliveryRequest?.recipient?.name}</p>
          <p className="text-sm text-text-muted">{match.deliveryRequest?.recipient?.phone}</p>
          <p className="text-sm text-text-muted">{match.deliveryRequest?.recipient?.address}</p>
        </Card>

        <Card className="space-y-2">
          <h2 className="font-semibold">Real-time Carrier Location</h2>
          <LiveMap lat={coords.lat} lng={coords.lng} />
          {isCarrier ? (
            <Button
              variant="ghost"
              onClick={() => socket?.emit('location:update', { matchId, lat: coords.lat + 0.01, lng: coords.lng + 0.01 })}
            >
              Send Location Update
            </Button>
          ) : null}
        </Card>
      </div>
    </div>
  </div>
  );
}

