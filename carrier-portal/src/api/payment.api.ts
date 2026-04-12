import { createPaymentApi } from 'hopdrop-shared';
import { api } from './client';

export const paymentApi = createPaymentApi(api);
