import { formatFrequency } from './formatters';

const SAVED_SIMULATIONS_STORAGE_KEY = 'deltadca.saved-simulations';

function createRecordId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `dca-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readSavedSimulationStore() {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    return JSON.parse(window.localStorage.getItem(SAVED_SIMULATIONS_STORAGE_KEY) || '{}');
  } catch {
    window.localStorage.removeItem(SAVED_SIMULATIONS_STORAGE_KEY);
    return {};
  }
}

function writeSavedSimulationStore(store) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(SAVED_SIMULATIONS_STORAGE_KEY, JSON.stringify(store));
}

export function normalizeSavedSimulation(simulation) {
  const rawFrequency = simulation.frequency ?? simulation.frequency_label ?? '';
  const frequencyInDays = Number(
    simulation.frequency_in_days
      ?? simulation.frequencyInDays
      ?? rawFrequency
      ?? 0,
  ) || 0;

  const totalInvested = Number(simulation.total_invested ?? simulation.totalInvested ?? 0);
  const finalPortfolioValue = Number(
    simulation.final_portfolio_value ?? simulation.finalPortfolioValue ?? 0,
  );

  return {
    id: simulation.id || createRecordId(),
    userId: simulation.user_id || simulation.userId || null,
    coinId: simulation.coin_id || simulation.coinId || 'unknown',
    investmentAmount: Number(simulation.investment_amount ?? simulation.investmentAmount ?? 0),
    frequencyInDays,
    frequencyLabel: simulation.frequency_label || formatFrequency(rawFrequency || frequencyInDays),
    startDate: simulation.start_date || simulation.startDate || '',
    endDate: simulation.end_date || simulation.endDate || '',
    totalInvested,
    finalPortfolioValue,
    profitOrLoss: Number(
      simulation.profit_or_loss
        ?? simulation.profitOrLoss
        ?? (finalPortfolioValue - totalInvested),
    ),
    createdAt: simulation.created_at || simulation.createdAt || new Date().toISOString(),
    source: simulation.source || 'remote',
  };
}

export function getLocalSavedSimulations(userId) {
  if (!userId) {
    return [];
  }

  const store = readSavedSimulationStore();
  const simulations = store[userId] || [];
  return simulations.map(normalizeSavedSimulation);
}

export function saveLocalSimulation(userId, simulation) {
  if (!userId) {
    return [];
  }

  const store = readSavedSimulationStore();
  const nextRecord = normalizeSavedSimulation({
    id: createRecordId(),
    user_id: userId,
    coin_id: simulation.coinId,
    investment_amount: Number(simulation.investmentAmount),
    frequency_in_days: Number(simulation.frequencyInDays),
    start_date: simulation.startDate,
    end_date: simulation.endDate,
    total_invested: Number(simulation.totalInvested),
    final_portfolio_value: Number(simulation.finalPortfolioValue),
    profit_or_loss: Number(simulation.profitOrLoss),
    created_at: new Date().toISOString(),
    source: 'local-cache',
  });

  const userSimulations = store[userId] || [];
  store[userId] = [nextRecord, ...userSimulations].slice(0, 30);
  writeSavedSimulationStore(store);

  return store[userId].map(normalizeSavedSimulation);
}

export function replaceLocalSavedSimulations(userId, simulations) {
  if (!userId) {
    return [];
  }

  const store = readSavedSimulationStore();
  store[userId] = simulations.map((simulation) => normalizeSavedSimulation(simulation));
  writeSavedSimulationStore(store);

  return store[userId].map(normalizeSavedSimulation);
}

export function deleteLocalSimulation(userId, simulationId) {
  if (!userId) {
    return [];
  }

  const store = readSavedSimulationStore();
  const simulations = store[userId] || [];
  store[userId] = simulations.filter((simulation) => simulation.id !== simulationId);
  writeSavedSimulationStore(store);

  return store[userId].map(normalizeSavedSimulation);
}
