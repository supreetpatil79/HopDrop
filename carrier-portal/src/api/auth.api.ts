import { createAuthApi } from 'hopdrop-shared';
import { api } from './client';

export const authApi = createAuthApi(api);
