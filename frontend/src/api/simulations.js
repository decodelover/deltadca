import apiClient from './client';

export async function calculateSimulation(payload) {
  const { data } = await apiClient.post('/calculate', payload);
  return data.data;
}

export async function getSavedSimulations() {
  const { data } = await apiClient.get('/saved-simulations');
  return data.data || data.simulations || [];
}

export async function saveSimulation(payload) {
  const { data } = await apiClient.post('/saved-simulations', payload);
  return data.data;
}

export async function deleteSavedSimulation(simulationId) {
  const { data } = await apiClient.delete(`/saved-simulations/${simulationId}`);
  return data;
}
