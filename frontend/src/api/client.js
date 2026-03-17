import axios from 'axios';

export const AUTH_STORAGE_KEY = 'deltadca.auth';
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  if (typeof window === 'undefined') {
    return config;
  }

  try {
    const rawSession = window.localStorage.getItem(AUTH_STORAGE_KEY);

    if (!rawSession) {
      return config;
    }

    const parsedSession = JSON.parse(rawSession);

    if (parsedSession?.token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${parsedSession.token}`;
    }
  } catch {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  }

  return config;
});

export function getApiErrorMessage(error, fallbackMessage = 'Something went wrong. Please try again.') {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return 'We could not reach DeltaDCA right now. Please try again in a moment.';
    }

    return error.response?.data?.message || error.message || fallbackMessage;
  }

  return fallbackMessage;
}

export default apiClient;
