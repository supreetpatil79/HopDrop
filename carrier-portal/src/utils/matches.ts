import { jobApi } from '../api/job.api';
import { matchApi } from '../api/match.api';
import { tripApi } from '../api/trip.api';

export async function fetchCarrierMatches() {
  try {
    return (await jobApi.available()).data.data as any[];
  } catch (_error) {
    // Older local backends may not expose carrier jobs yet.
  }

  const trips = (await tripApi.getMyTrips()).data.data as any[];
  const matchIds = Array.from(new Set(trips.flatMap((trip) => trip.matches || [])));

  if (!matchIds.length) {
    return [];
  }

  const matches = await Promise.all(
    matchIds.map((id) =>
      matchApi
        .getMatch(id)
        .then((response) => response.data.data)
        .catch(() => null)
    )
  );

  return matches.filter(Boolean) as any[];
}
