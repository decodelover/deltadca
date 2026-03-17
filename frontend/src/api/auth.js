import apiClient from './client';

export async function registerUser(payload) {
  const { data } = await apiClient.post('/register', payload);
  return data;
}

export async function loginUser(payload) {
  const { data } = await apiClient.post('/login', payload);
  return data;
}

export async function getCurrentUser() {
  const { data } = await apiClient.get('/me');
  return data.user;
}
