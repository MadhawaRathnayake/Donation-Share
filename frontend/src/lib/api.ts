import axios from 'axios';
import type { AxiosError } from 'axios';
import { config } from './config';
import type { ApiError } from '../types/domain';

const api = axios.create({
  baseURL: config.apiUrl,
  timeout: 15_000,
});

export const setAuthToken = (token: string | null) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

export const toApiError = (error: unknown): ApiError => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<Partial<ApiError>>;
    return {
      code: axiosError.response?.data?.code || `HTTP_${axiosError.response?.status || 0}`,
      message: axiosError.response?.data?.message || axiosError.message || 'The request could not be completed.',
      fieldErrors: axiosError.response?.data?.fieldErrors,
      status: axiosError.response?.status,
    };
  }

  if (typeof error === 'object' && error && 'message' in error) {
    return error as ApiError;
  }

  return { code: 'UNKNOWN', message: 'Something went wrong. Please try again.' };
};

export default api;
