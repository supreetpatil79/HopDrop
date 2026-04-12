import { createDeliveryApi } from 'hopdrop-shared';
import { api } from './client';

export const deliveryApi = createDeliveryApi(api);
