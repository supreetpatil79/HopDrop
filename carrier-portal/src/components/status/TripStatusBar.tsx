import { createTripStatusBar } from 'hopdrop-shared';
import { useSocket } from '../../hooks/useSocket';

export const TripStatusBar = createTripStatusBar(useSocket);
