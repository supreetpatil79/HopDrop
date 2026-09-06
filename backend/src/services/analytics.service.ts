import { User } from '../models/User';
import { Match } from '../models/Match';
import { DeliveryRequest } from '../models/DeliveryRequest';
import { Trip } from '../models/Trip';
import { AnalyticsEvent } from '../models/AnalyticsEvent';

export async function getAnalyticsSummary() {
  const now = new Date();
  const d1 = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    newUsersD1,
    newUsersD7,
    newUsersD30,
    totalTrips,
    activeTrips,
    totalDeliveries,
    pendingDeliveries,
    totalMatches,
    completedMatches,
    activeMatchesCount
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ createdAt: { $gte: d1 } }),
    User.countDocuments({ createdAt: { $gte: d7 } }),
    User.countDocuments({ createdAt: { $gte: d30 } }),
    Trip.countDocuments(),
    Trip.countDocuments({ status: { $in: ['upcoming', 'active'] } }),
    DeliveryRequest.countDocuments(),
    DeliveryRequest.countDocuments({ status: 'pending' }),
    Match.countDocuments(),
    Match.countDocuments({ status: 'delivered' }),
    Match.countDocuments({ status: { $in: ['proposed', 'accepted', 'in_transit'] } })
  ]);

  return {
    users: { total: totalUsers, d1: newUsersD1, d7: newUsersD7, d30: newUsersD30 },
    trips: { total: totalTrips, active: activeTrips },
    deliveries: { total: totalDeliveries, pending: pendingDeliveries },
    matches: { total: totalMatches, completed: completedMatches, active: activeMatchesCount },
    conversionRate: totalMatches > 0 ? ((completedMatches / totalMatches) * 100).toFixed(1) : '0'
  };
}

export async function getMatchFunnel() {
  const [requested, matched, accepted, inTransit, delivered, cancelled] = await Promise.all([
    DeliveryRequest.countDocuments(),
    Match.countDocuments(),
    Match.countDocuments({ status: 'accepted' }),
    Match.countDocuments({ status: 'in_transit' }),
    Match.countDocuments({ status: 'delivered' }),
    Match.countDocuments({ status: 'cancelled' })
  ]);

  return [
    { stage: 'Delivery Requested', count: requested },
    { stage: 'Match Found', count: matched },
    { stage: 'Carrier Accepted', count: accepted },
    { stage: 'In Transit', count: inTransit },
    { stage: 'Delivered', count: delivered },
    { stage: 'Cancelled', count: cancelled }
  ];
}

export async function getDwellByPage() {
  const result = await AnalyticsEvent.aggregate([
    { $match: { event: 'dwell', durationMs: { $gt: 0 } } },
    {
      $group: {
        _id: '$page',
        avgDwellMs: { $avg: '$durationMs' },
        count: { $sum: 1 }
      }
    },
    { $sort: { avgDwellMs: -1 } },
    { $limit: 20 }
  ]);

  return result.map((r) => ({
    page: r._id,
    avgDwellSec: Math.round(r.avgDwellMs / 1000),
    sessions: r.count
  }));
}

export async function getSignupTrend(days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const result = await User.aggregate([
    { $match: { createdAt: { $gte: since } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  return result.map((r) => ({ date: r._id, signups: r.count }));
}

export async function recordDwellEvent(data: {
  userId?: string;
  sessionId: string;
  page: string;
  durationMs: number;
}) {
  await AnalyticsEvent.create({
    ...data,
    event: 'dwell'
  });
}
