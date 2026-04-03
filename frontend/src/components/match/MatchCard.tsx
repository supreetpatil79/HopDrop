import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface MatchCardProps {
  match: any;
  onOpen?: () => void;
}

export function MatchCard({ match, onOpen }: MatchCardProps) {
  return (
    <Card className="space-y-2">
      <p className="font-semibold">{match.deliveryRequest?.origin?.city} → {match.deliveryRequest?.destination?.city}</p>
      <p className="text-sm text-text-muted">Status: {match.status}</p>
      {onOpen ? <Button onClick={onOpen}>Open Match</Button> : null}
    </Card>
  );
}
