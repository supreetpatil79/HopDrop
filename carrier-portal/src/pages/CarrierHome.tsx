import { useQuery } from '@tanstack/react-query';
import { MATCH_ACTIVE_STATUSES, MATCH_COMPLETED_STATUSES, formatWorkflowStatus } from 'hopdrop-shared';
import { Link } from 'react-router-dom';
import { tripApi } from '../api/trip.api';
import { fetchCarrierMatches } from '../utils/matches';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

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
  const nextTrip = [...trips]
    .filter((trip) => trip.status === 'active')
    .sort((a, b) => new Date(a.departureTime).getTime() - new Date(b.departureTime).getTime())[0];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Carrier Dashboard</h1>
          <p className="text-sm text-text-muted">Manage live trips, incoming package matches, and delivery handoffs from one place.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="/send-package">
            <Button variant="ghost">Switch to Sender View</Button>
          </a>
          <Link to="/post-trip">
            <Button>Post a Trip</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <Card className="border-primary/20">
          <p className="text-xs uppercase tracking-wide text-text-muted">Live Trips</p>
          <p className="mt-2 text-2xl font-bold text-dark">{trips.length}</p>
          <p className="mt-1 text-sm text-text-muted">Routes currently posted from your account.</p>
        </Card>
        <Card className="border-primary/20">
          <p className="text-xs uppercase tracking-wide text-text-muted">Awaiting Review</p>
          <p className="mt-2 text-2xl font-bold text-dark">{proposedMatches.length}</p>
          <p className="mt-1 text-sm text-text-muted">New sender requests ready for accept or reject.</p>
        </Card>
        <Card className="border-primary/20">
          <p className="text-xs uppercase tracking-wide text-text-muted">Active Deliveries</p>
          <p className="mt-2 text-2xl font-bold text-dark">{activeMatches.length}</p>
          <p className="mt-1 text-sm text-text-muted">Matches moving through OTP, transit, or delivery.</p>
        </Card>
        <Card className="border-primary/20">
          <p className="text-xs uppercase tracking-wide text-text-muted">Delivered</p>
          <p className="mt-2 text-2xl font-bold text-dark">{completedMatches.length}</p>
          <p className="mt-1 text-sm text-text-muted">Completed carrier handoffs from your live data.</p>
        </Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold">Requests Needing Action</h2>
              <p className="text-sm text-text-muted">Open a match to accept, generate OTPs, or continue the handoff flow.</p>
            </div>
            <Link to="/incoming-requests">
              <Button variant="ghost">View All</Button>
            </Link>
          </div>

          {matches.length ? (
            <div className="space-y-2">
              {[...proposedMatches, ...activeMatches].slice(0, 4).map((match) => (
                <div key={match._id} className="rounded-lg border border-border px-3 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">
                        {match.deliveryRequest?.origin?.city} → {match.deliveryRequest?.destination?.city}
                      </p>
                      <p className="text-xs text-text-muted">
                        {match.deliveryRequest?.package?.description || 'Package request'} · {match.deliveryRequest?.package?.weightKg || '-'} kg
                      </p>
                    </div>
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                      {formatWorkflowStatus(match.status)}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-text-muted">
                    <span>Sender: {match.sender?.name || 'Sender'}</span>
                    <span>Trip: {match.trip?.modeOfTransport || 'carrier route'}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link to={`/active-delivery/${match._id}`}>
                      <Button>{match.status === 'proposed' ? 'Review Request' : 'Open Delivery'}</Button>
                    </Link>
                    <a href={`/track-delivery/${match._id}`}>
                      <Button variant="ghost">Open Sender Tracker</Button>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted">No live matches yet. Post a trip or wait for matching to complete.</p>
          )}
        </Card>

        <div className="space-y-3">
          <Card className="space-y-3">
            <h2 className="text-lg font-semibold">Next Departure</h2>
            {nextTrip ? (
              <div className="space-y-2">
                <p className="text-sm font-semibold">{nextTrip.origin?.city} → {nextTrip.destination?.city}</p>
                <p className="text-sm text-text-muted">
                  {new Date(nextTrip.departureTime).toLocaleString('en-IN', {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                  })}
                </p>
                <p className="text-sm text-text-muted">
                  {nextTrip.modeOfTransport} · ₹{nextTrip.pricePerKg}/kg · {nextTrip.availableCapacity?.weightKg} kg available
                </p>
              </div>
            ) : (
              <p className="text-sm text-text-muted">No active trip departure scheduled yet.</p>
            )}
          </Card>

          <Card className="space-y-3">
            <h2 className="text-lg font-semibold">Portal Flow</h2>
            <p className="text-sm text-text-muted">
              Sender requests appear here as soon as the backend creates a match. Accept the request here, then keep the same match open in both portals during pickup and delivery.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link to="/incoming-requests">
                <Button>Go to Incoming Requests</Button>
              </Link>
              <a href="/browse-carriers">
                <Button variant="ghost">See Sender Match View</Button>
              </a>
            </div>
          </Card>
        </div>
      </div>

      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">My Trips</h2>
          <Link to="/my-trips">
            <Button variant="ghost">Manage Trips</Button>
          </Link>
        </div>
        {trips.length ? (
          <div className="space-y-2">
            {trips.map((trip: any) => (
              <div key={trip._id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <div>
                  <p className="text-sm font-semibold">{trip.origin?.city} → {trip.destination?.city}</p>
                  <p className="text-xs text-text-muted">{new Date(trip.departureTime).toLocaleString('en-IN')}</p>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{trip.status}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-muted">No trips posted yet.</p>
        )}
      </Card>
    </div>
  );
}
