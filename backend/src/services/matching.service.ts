import { DELIVERY_EVENT_TYPES, DOMAIN_TOPICS, MATCH_STATUS_EVENT_TYPES } from '../events/domainEvents';
import type { Types } from 'mongoose';
import mongoose from 'mongoose';
import { matchQueue } from '../config/redis';
import { DeliveryRequest, IDeliveryRequest } from '../models/DeliveryRequest';
import { Match } from '../models/Match';
import { Trip, ITrip } from '../models/Trip';
import { ApiError } from '../utils/ApiError';
import { isTransactionUnsupported } from '../utils/mongoTransactions';
import { calculateQuote } from '../utils/pricing';
import { scoreTrip } from '../utils/tripMatcher';
import { emitToTrip, emitToUser, notifyUser } from './notification.service';
import { appendOutboxEvents } from './outbox.service';
import { callRoutingSearch } from './routingSearch.service';

type TripCandidateRanking = {
  candidate_id: string;
  candidate_kind: 'trip';
  trip_id?: string;
  carrier_id?: string;
  score: number;
  reasons: string[];
};

type DeliveryRequestCandidateRanking = {
  candidate_id: string;
  candidate_kind: 'delivery_request';
  delivery_request_id?: string;
  sender_id?: string;
  score: number;
  reasons: string[];
};

function toOptionalCoords(location: {
  city?: string;
  state?: string;
  placeId?: string;
  coordinates?: { coordinates?: [number, number] };
}) {
  const coords = location.coordinates?.coordinates;

  return {
    city: location.city,
    state: location.state,
    place_id: location.placeId,
    latitude: coords?.[1] ?? null,
    longitude: coords?.[0] ?? null
  };
}

function serializeDeliveryRequest(req: IDeliveryRequest & { sender: Types.ObjectId | string }) {
  return {
    delivery_request_id: req._id?.toString() || '',
    sender_id: req.sender.toString(),
    origin: toOptionalCoords(req.origin),
    destination: toOptionalCoords(req.destination),
    pickup_window: {
      earliest: new Date(req.preferredDeliveryWindow.earliest).toISOString(),
      latest: new Date(req.preferredDeliveryWindow.latest).toISOString()
    },
    package: {
      weight_kg: req.package.weightKg,
      category: req.package.category,
      is_fragile: req.package.isFragile,
      declared_value: req.package.declaredValue
    }
  };
}

function serializeTrip(trip: any) {
  const carrier = trip.carrier || {};

  return {
    trip_id: trip._id.toString(),
    carrier_id: (carrier._id || trip.carrier).toString(),
    origin: toOptionalCoords(trip.origin),
    destination: toOptionalCoords(trip.destination),
    departure_time: new Date(trip.departureTime).toISOString(),
    estimated_arrival_time: trip.estimatedArrivalTime ? new Date(trip.estimatedArrivalTime).toISOString() : null,
    price_per_kg: trip.pricePerKg,
    available_capacity_weight_kg: trip.availableCapacity.weightKg,
    allowed_categories: trip.availableCapacity.allowedCategories || [],
    carrier_rating_average: carrier.rating?.average ?? 5,
    carrier_total_deliveries: carrier.totalDeliveries ?? 0
  };
}

async function rankTripsWithRoutingSearch(req: IDeliveryRequest, trips: any[]) {
  if (!trips.length) {
    return trips;
  }

  const ranked = await callRoutingSearch<{
    candidates: TripCandidateRanking[];
  }>(
    '/internal/v1/match/candidates',
    {
      delivery_request: serializeDeliveryRequest(req),
      trip_candidates: trips.map((trip) => serializeTrip(trip)),
      limit: Math.min(trips.length, 5)
    },
    10000
  );

  if (!ranked?.candidates?.length) {
    return null;
  }

  const byId = new Map(trips.map((trip) => [trip._id.toString(), trip]));
  const ordered = ranked.candidates
    .map((candidate) => byId.get(candidate.trip_id || candidate.candidate_id))
    .filter((trip): trip is any => Boolean(trip));
  const seen = new Set(ordered.map((trip: any) => trip._id.toString()));
  const remainder = trips.filter((trip) => !seen.has(trip._id.toString()));

  return [...ordered, ...remainder];
}

async function retrieveTripsWithRoutingSearch(req: IDeliveryRequest) {
  const ranked = await callRoutingSearch<{
    candidates: TripCandidateRanking[];
  }>(
    '/internal/v1/match/candidates',
    {
      delivery_request: serializeDeliveryRequest(req),
      limit: 12
    },
    10000
  );

  if (!ranked?.candidates?.length) {
    return null;
  }

  const candidateIds = ranked.candidates
    .map((candidate) => candidate.trip_id || candidate.candidate_id)
    .filter((candidateId): candidateId is string => Boolean(candidateId) && mongoose.Types.ObjectId.isValid(candidateId));

  if (!candidateIds.length) {
    return null;
  }

  const trips = await Trip.find({
    _id: { $in: candidateIds },
    departureTime: {
      $gte: req.preferredDeliveryWindow.earliest,
      $lte: req.preferredDeliveryWindow.latest
    },
    status: 'active',
    safetyDepositPaid: true,
    'availableCapacity.weightKg': { $gte: req.package.weightKg },
    'availableCapacity.allowedCategories': req.package.category
  }).populate('carrier');

  const validTrips = trips.filter((trip: any) => !trip.carrier._id.equals(req.sender));
  if (!validTrips.length) {
    return [];
  }

  const byId = new Map(validTrips.map((trip) => [trip._id.toString(), trip]));
  return candidateIds.map((candidateId) => byId.get(candidateId)).filter((trip): trip is any => Boolean(trip));
}

async function rankRequestsWithRoutingSearch(trip: any, requests: IDeliveryRequest[]) {
  if (!requests.length) {
    return requests;
  }

  const ranked = await callRoutingSearch<{
    candidates: DeliveryRequestCandidateRanking[];
  }>(
    '/internal/v1/match/candidates',
    {
      trip: serializeTrip(trip),
      delivery_request_candidates: requests.map((request) => serializeDeliveryRequest(request)),
      limit: requests.length
    },
    10000
  );

  if (!ranked?.candidates?.length) {
    return null;
  }

  const byId = new Map(requests.map((request) => [request._id?.toString() || '', request]));
  const ordered = ranked.candidates
    .map((candidate) => byId.get(candidate.delivery_request_id || candidate.candidate_id))
    .filter((request): request is IDeliveryRequest => Boolean(request));
  const seen = new Set(ordered.map((request: any) => request._id.toString()));
  const remainder = requests.filter((request) => !seen.has(request._id?.toString() || ''));

  return [...ordered, ...remainder];
}

async function retrieveRequestsWithRoutingSearch(trip: any) {
  const ranked = await callRoutingSearch<{
    candidates: DeliveryRequestCandidateRanking[];
  }>(
    '/internal/v1/match/candidates',
    {
      trip: serializeTrip(trip),
      limit: 12
    },
    10000
  );

  if (!ranked?.candidates?.length) {
    return null;
  }

  const candidateIds = ranked.candidates
    .map((candidate) => candidate.delivery_request_id || candidate.candidate_id)
    .filter((candidateId): candidateId is string => Boolean(candidateId) && mongoose.Types.ObjectId.isValid(candidateId));

  if (!candidateIds.length) {
    return null;
  }

  const requests = await DeliveryRequest.find({
    _id: { $in: candidateIds },
    status: 'pending',
    paymentStatus: { $in: ['unpaid', 'paid'] },
    'package.weightKg': { $lte: trip.availableCapacity.weightKg },
    'package.category': { $in: trip.availableCapacity.allowedCategories },
    'preferredDeliveryWindow.earliest': { $lte: trip.departureTime },
    'preferredDeliveryWindow.latest': { $gte: trip.departureTime }
  });

  const byId = new Map(requests.map((request) => [request._id?.toString() || '', request]));
  return candidateIds.map((candidateId) => byId.get(candidateId)).filter(Boolean) as IDeliveryRequest[];
}

async function appendMatchProposalOutbox(
  matchId: string,
  trip: any,
  req: IDeliveryRequest,
  quote: ReturnType<typeof calculateQuote>,
  session?: mongoose.ClientSession
) {
  await appendOutboxEvents(
    [
      {
        topic: DOMAIN_TOPICS.match,
        eventType: MATCH_STATUS_EVENT_TYPES.proposed,
        aggregateType: 'match',
        aggregateId: matchId,
        partitionKey: matchId,
        payload: {
          matchId,
          tripId: trip._id.toString(),
          deliveryRequestId: req._id?.toString() || '',
          carrierId: trip.carrier._id.toString(),
          senderId: req.sender.toString(),
          status: 'proposed',
          agreedPrice: quote.totalCharge,
          payoutToCarrier: quote.carrierEarning
        }
      },
      {
        topic: DOMAIN_TOPICS.delivery,
        eventType: DELIVERY_EVENT_TYPES.updated,
        aggregateType: 'delivery_request',
        aggregateId: req._id?.toString() || '',
        partitionKey: req._id?.toString() || '',
        payload: {
          requestId: req._id?.toString() || '',
          senderId: req.sender.toString(),
          origin: req.origin,
          destination: req.destination,
          preferredDeliveryWindow: req.preferredDeliveryWindow,
          package: req.package,
          status: 'matched',
          paymentStatus: req.paymentStatus,
          updates: {
            status: 'matched'
          }
        }
      }
    ],
    session
  );
}

async function emitMatchProposalCreated(trip: any, req: IDeliveryRequest, reqId: string, matchId: string) {
  await notifyUser({
    userId: trip.carrier._id,
    title: 'New Delivery Match',
    body: `New package request from ${req.origin.city} to ${req.destination.city}.`,
    type: 'match',
    metadata: { matchId }
  });

  await emitToUser(trip.carrier._id, 'match:proposed', {
    matchId,
    deliveryRequestId: reqId
  });

  await emitToTrip(trip._id.toString(), 'match:proposed', {
    matchId,
    deliveryRequestId: reqId
  });
}

async function createMatchWithoutTransaction(trip: any, req: IDeliveryRequest, reqId: string, quote: ReturnType<typeof calculateQuote>) {
  const query = { trip: trip._id, deliveryRequest: reqId };
  let match = await Match.findOne(query);
  let created = false;

  if (!match) {
    try {
      match = await Match.create({
        ...query,
        carrier: trip.carrier._id,
        sender: req.sender,
        status: 'proposed',
        agreedPrice: quote.totalCharge,
        payoutToCarrier: quote.carrierEarning,
        timeline: [{ event: 'match_proposed', actor: trip.carrier._id, metadata: { totalCharge: quote.totalCharge } }]
      });
      created = true;
    } catch (error: any) {
      if (error?.code === 11000) {
        match = await Match.findOne(query);
      } else {
        throw error;
      }
    }
  }

  if (!match) {
    throw new ApiError(500, 'Unable to create match proposal');
  }

  await Trip.findByIdAndUpdate(trip._id, { $addToSet: { matches: match._id } });
  await DeliveryRequest.findByIdAndUpdate(reqId, { $set: { status: 'matched' } });

  if (created) {
    await appendMatchProposalOutbox(match._id.toString(), trip, req, quote);
    await emitMatchProposalCreated(trip, req, reqId, match._id.toString());
  }

  return match;
}

async function createMatchProposal(trip: any, req: IDeliveryRequest) {
  const reqId = req._id?.toString();
  if (!reqId) {
    throw new ApiError(400, 'Delivery request id missing');
  }
  const quote = calculateQuote(trip.toObject ? trip.toObject() : trip, req);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const [match] = await Match.create(
      [
        {
          trip: trip._id,
          deliveryRequest: reqId,
          carrier: trip.carrier._id,
          sender: req.sender,
          status: 'proposed',
          agreedPrice: quote.totalCharge,
          payoutToCarrier: quote.carrierEarning,
          timeline: [{ event: 'match_proposed', actor: trip.carrier._id, metadata: { totalCharge: quote.totalCharge } }]
        }
      ],
      { session }
    );

    await Trip.findByIdAndUpdate(trip._id, { $addToSet: { matches: match._id } }, { session });
    await DeliveryRequest.findByIdAndUpdate(reqId, { $set: { status: 'matched' } }, { session });
    await appendMatchProposalOutbox(match._id.toString(), trip, req, quote, session);

    await session.commitTransaction();
    session.endSession();

    await emitMatchProposalCreated(trip, req, reqId, match._id.toString());

    return match;
  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();

    if (error?.code === 11000) {
      const existing = await Match.findOne({ trip: trip._id, deliveryRequest: reqId });
      if (existing) {
        return existing;
      }
    }

    if (isTransactionUnsupported(error)) {
      return createMatchWithoutTransaction(trip, req, reqId, quote);
    }

    throw error;
  }
}

export async function findMatches(deliveryRequestId: string) {
  const req = await DeliveryRequest.findById(deliveryRequestId);
  if (!req) {
    throw new ApiError(404, 'Delivery request not found');
  }

  const retrievedTrips = await retrieveTripsWithRoutingSearch(req);
  if (retrievedTrips?.length) {
    return Promise.all(retrievedTrips.slice(0, 5).map((trip) => createMatchProposal(trip, req)));
  }

  const trips = await Trip.find({
    'origin.city': { $regex: new RegExp(req.origin.city, 'i') },
    'destination.city': { $regex: new RegExp(req.destination.city, 'i') },
    departureTime: {
      $gte: req.preferredDeliveryWindow.earliest,
      $lte: req.preferredDeliveryWindow.latest
    },
    status: 'active',
    safetyDepositPaid: true,
    'availableCapacity.weightKg': { $gte: req.package.weightKg },
    'availableCapacity.allowedCategories': req.package.category
  }).populate('carrier');

  const validTrips = trips.filter((trip: any) => !trip.carrier._id.equals(req.sender));
  const rankedTrips = await rankTripsWithRoutingSearch(req, validTrips);

  if (rankedTrips) {
    return Promise.all(rankedTrips.slice(0, 5).map((trip) => createMatchProposal(trip, req)));
  }

  const scored = validTrips
    .map((trip: any) => ({
      trip,
      score: scoreTrip(trip.toObject ? trip.toObject() : trip, req)
    }))
    .sort((a, b) => b.score - a.score);

  return Promise.all(scored.slice(0, 5).map(({ trip }) => createMatchProposal(trip, req)));
}

export async function queueMatching(deliveryRequestId: string) {
  await matchQueue.add(
    'findMatches',
    { deliveryRequestId },
    {
      removeOnComplete: 100,
      removeOnFail: 100,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 }
    }
  );
}

export async function matchTripAgainstPendingRequests(tripId: string) {
  const trip = await Trip.findById(tripId).populate('carrier');
  if (!trip) {
    throw new ApiError(404, 'Trip not found');
  }

  const retrievedRequests = await retrieveRequestsWithRoutingSearch(trip);
  if (retrievedRequests?.length) {
    const created: any[] = [];
    for (const req of retrievedRequests) {
      if (req.sender.toString() === trip.carrier._id.toString()) {
        continue;
      }

      const match = await createMatchProposal(trip, req);
      created.push(match);
    }

    return created;
  }

  const requests = await DeliveryRequest.find({
    status: 'pending',
    paymentStatus: { $in: ['unpaid', 'paid'] },
    'origin.city': { $regex: new RegExp(trip.origin.city, 'i') },
    'destination.city': { $regex: new RegExp(trip.destination.city, 'i') },
    'package.weightKg': { $lte: trip.availableCapacity.weightKg },
    'package.category': { $in: trip.availableCapacity.allowedCategories },
    'preferredDeliveryWindow.earliest': { $lte: trip.departureTime },
    'preferredDeliveryWindow.latest': { $gte: trip.departureTime }
  });

  const rankedRequests = await rankRequestsWithRoutingSearch(trip, requests as unknown as IDeliveryRequest[]);
  const requestsToProcess = rankedRequests || requests;

  const created: any[] = [];
  for (const req of requestsToProcess) {
    if (req.sender.toString() === trip.carrier._id.toString()) {
      continue;
    }

    const match = await createMatchProposal(trip, req as unknown as IDeliveryRequest);
    created.push(match);
  }

  return created;
}

export async function estimateFromTrip(trip: ITrip, req: IDeliveryRequest) {
  return calculateQuote(trip, req);
}
