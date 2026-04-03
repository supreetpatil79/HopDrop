interface TripTimelineProps {
  departureTime?: string;
  estimatedArrivalTime?: string;
}

export function TripTimeline({ departureTime, estimatedArrivalTime }: TripTimelineProps) {
  return (
    <div className="space-y-2 text-sm">
      <p><span className="font-semibold">Departure:</span> {departureTime ? new Date(departureTime).toLocaleString() : '-'}</p>
      <p><span className="font-semibold">ETA:</span> {estimatedArrivalTime ? new Date(estimatedArrivalTime).toLocaleString() : '-'}</p>
    </div>
  );
}
