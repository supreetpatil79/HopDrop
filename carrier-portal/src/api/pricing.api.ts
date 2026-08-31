import { createPricingApi } from 'hopdrop-shared';
import { api } from './client';

export const pricingApi = createPricingApi(api);
