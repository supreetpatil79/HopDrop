import { createUserApi } from 'hopdrop-shared';
import { api } from './client';

export const userApi = createUserApi(api);
