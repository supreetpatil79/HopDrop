import { createDeliveryStatusBar } from 'hopdrop-shared';
import { useSocket } from '../../hooks/useSocket';

export const DeliveryStatusBar = createDeliveryStatusBar(useSocket);
