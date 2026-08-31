import { createJobApi } from 'hopdrop-shared';
import { api } from './client';

export const jobApi = createJobApi(api);
