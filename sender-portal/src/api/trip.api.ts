import { createTripApi } from 'hopdrop-shared';
import { api } from './client';

export const tripApi = createTripApi(api);
