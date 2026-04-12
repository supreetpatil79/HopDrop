import { TrackingMap as SharedTrackingMap } from 'hopdrop-shared';
import { useSocket } from '../../hooks/useSocket';

export function TrackingMap({ matchId }: { matchId: string }) {
  const socket = useSocket(matchId);

  return <SharedTrackingMap matchId={matchId} socket={socket} />;
}
