import apiClient from './client';

export async function getMarketOverview() {
  const { data } = await apiClient.get('/market-overview');
  return {
    coins: data.data || [],
    refreshedAt: data.refreshed_at || '',
    provider: data.market_data_provider || '',
  };
}

export async function searchCoins(query) {
  const { data } = await apiClient.get('/coins/search', {
    params: { query },
  });

  return data.data || [];
}

export async function getPlannerConfig() {
  const { data } = await apiClient.get('/app-config');
  return {
    marketDataProvider: data.data?.marketDataProvider || 'coingecko',
    marketDataProviderLabel: data.data?.marketDataProviderLabel || 'CoinGecko',
    historyWindowDays: Number(data.data?.historyWindowDays || 365),
  };
}
