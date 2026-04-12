import { createMatchApi } from 'hopdrop-shared';
import { api } from './client';

export const matchApi = createMatchApi(api);
