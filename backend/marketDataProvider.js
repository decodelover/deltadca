const axios = require('axios');
const config = require('./config');

const MARKET_OVERVIEW_CACHE_MS = 60 * 1000;
const COIN_SEARCH_CACHE_MS = 5 * 60 * 1000;
const COIN_DIRECTORY_CACHE_MS = 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 15000;
const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);
const COINGECKO_API_BASE_URL = 'https://api.coingecko.com/api/v3';
const providerName = config.marketDataProvider;
const providerLabel = providerName === 'coinmarketcap' ? 'CoinMarketCap' : 'CoinGecko';
const historyWindowDays = config.marketHistoryWindowDays;
const marketOverviewCache = {
    value: null,
    expiresAt: 0
};
const coinSearchCache = new Map();
const coinDirectoryCache = {
    value: null,
    expiresAt: 0
};

function delay(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

function shouldRetryProviderRequest(error) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        return true;
    }

    return RETRYABLE_STATUS_CODES.has(error.response?.status);
}

async function fetchCoinGecko(url, requestConfig = {}, retries = 2) {
    let attempt = 0;

    while (true) {
        try {
            return await axios.get(url, {
                baseURL: COINGECKO_API_BASE_URL,
                timeout: REQUEST_TIMEOUT_MS,
                headers: {
                    Accept: 'application/json',
                    'User-Agent': 'DeltaDCA/1.0',
                    ...requestConfig.headers
                },
                ...requestConfig
            });
        } catch (error) {
            if (attempt >= retries || !shouldRetryProviderRequest(error)) {
                throw error;
            }

            attempt += 1;
            await delay(450 * (2 ** attempt));
        }
    }
}

async function fetchCoinMarketCap(url, requestConfig = {}, retries = 2) {
    let attempt = 0;

    while (true) {
        try {
            return await axios.get(url, {
                baseURL: config.coinmarketcapApiBaseUrl,
                timeout: REQUEST_TIMEOUT_MS,
                headers: {
                    Accept: 'application/json',
                    'X-CMC_PRO_API_KEY': config.coinmarketcapApiKey,
                    'User-Agent': 'DeltaDCA/1.0',
                    ...requestConfig.headers
                },
                ...requestConfig
            });
        } catch (error) {
            if (attempt >= retries || !shouldRetryProviderRequest(error)) {
                throw error;
            }

            attempt += 1;
            await delay(450 * (2 ** attempt));
        }
    }
}

function parseSeriesTimestamp(value) {
    const timestamp = new Date(value).getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
}

function buildCoinGeckoMarketCoinResponse(coin) {
    return {
        id: coin.id,
        symbol: coin.symbol,
        name: coin.name,
        image: coin.image,
        current_price: Number(coin.current_price),
        market_cap: Number(coin.market_cap),
        market_cap_rank: coin.market_cap_rank,
        total_volume: Number(coin.total_volume),
        price_change_percentage_24h: Number(coin.price_change_percentage_24h ?? 0),
        price_change_24h: Number(coin.price_change_24h ?? 0),
        high_24h: Number(coin.high_24h ?? 0),
        low_24h: Number(coin.low_24h ?? 0)
    };
}

function buildCoinGeckoSearchResponse(coin) {
    return {
        id: coin.id,
        symbol: coin.symbol,
        name: coin.name,
        market_cap_rank: coin.market_cap_rank,
        thumb: coin.thumb,
        large: coin.large
    };
}

function buildCoinMarketCapImageUrl(id) {
    return id ? `https://s2.coinmarketcap.com/static/img/coins/64x64/${id}.png` : '';
}

function buildCoinMarketCapMarketCoinResponse(asset) {
    const usdQuote = asset.quote?.USD || {};

    return {
        id: asset.slug || String(asset.id),
        symbol: String(asset.symbol || '').toLowerCase(),
        name: asset.name,
        image: buildCoinMarketCapImageUrl(asset.id),
        current_price: Number(usdQuote.price ?? 0),
        market_cap: Number(usdQuote.market_cap ?? 0),
        market_cap_rank: asset.cmc_rank ?? asset.rank ?? null,
        total_volume: Number(usdQuote.volume_24h ?? 0),
        price_change_percentage_24h: Number(usdQuote.percent_change_24h ?? 0),
        price_change_24h: Number(usdQuote.price ?? 0) * (Number(usdQuote.percent_change_24h ?? 0) / 100),
        high_24h: Number(usdQuote.price ?? 0),
        low_24h: Number(usdQuote.price ?? 0)
    };
}

function buildCoinMarketCapSearchResponse(asset) {
    const imageUrl = buildCoinMarketCapImageUrl(asset.id);

    return {
        id: asset.slug || String(asset.id),
        symbol: String(asset.symbol || '').toLowerCase(),
        name: asset.name,
        market_cap_rank: asset.rank ?? asset.cmc_rank ?? null,
        thumb: imageUrl,
        large: imageUrl
    };
}

function getHistoryWindowErrorMessage() {
    return `${providerLabel} is configured for historical ranges from the last ${historyWindowDays} days. Choose a more recent start date.`;
}

function isWithinHistoryWindow(startDate, endDate) {
    const today = new Date();
    const latestAllowedDate = Date.UTC(
        today.getUTCFullYear(),
        today.getUTCMonth(),
        today.getUTCDate()
    );
    const earliestAllowedDate = latestAllowedDate - (historyWindowDays * 24 * 60 * 60 * 1000);
    const startDateValue = Date.UTC(
        startDate.getUTCFullYear(),
        startDate.getUTCMonth(),
        startDate.getUTCDate()
    );
    const endDateValue = Date.UTC(
        endDate.getUTCFullYear(),
        endDate.getUTCMonth(),
        endDate.getUTCDate()
    );

    return (
        startDateValue >= earliestAllowedDate
        && endDateValue >= earliestAllowedDate
        && startDateValue <= latestAllowedDate
        && endDateValue <= latestAllowedDate
    );
}

function buildMarketDataError(status, message) {
    const error = new Error(message);
    error.marketDataStatus = status;
    error.isMarketDataError = true;
    return error;
}

async function getCoinMarketCapDirectory() {
    if (coinDirectoryCache.value && coinDirectoryCache.expiresAt > Date.now()) {
        return coinDirectoryCache.value;
    }

    const response = await fetchCoinMarketCap('/v1/cryptocurrency/map', {
        params: {
            listing_status: 'active',
            sort: 'cmc_rank',
            start: 1,
            limit: 5000
        }
    });

    const directory = Array.isArray(response.data?.data) ? response.data.data : [];

    coinDirectoryCache.value = directory;
    coinDirectoryCache.expiresAt = Date.now() + COIN_DIRECTORY_CACHE_MS;

    return directory;
}

async function getCoinGeckoMarketOverviewData() {
    const response = await fetchCoinGecko('/coins/markets', {
        params: {
            vs_currency: 'usd',
            order: 'market_cap_desc',
            per_page: 12,
            page: 1,
            sparkline: false,
            price_change_percentage: '24h'
        }
    });

    return Array.isArray(response.data)
        ? response.data.map(buildCoinGeckoMarketCoinResponse)
        : [];
}

async function getCoinMarketCapMarketOverviewData() {
    const response = await fetchCoinMarketCap('/v1/cryptocurrency/listings/latest', {
        params: {
            convert: 'USD',
            limit: 12,
            sort: 'market_cap'
        }
    });

    return Array.isArray(response.data?.data)
        ? response.data.data.map(buildCoinMarketCapMarketCoinResponse)
        : [];
}

async function getMarketOverviewData() {
    if (marketOverviewCache.value && marketOverviewCache.expiresAt > Date.now()) {
        return marketOverviewCache.value;
    }

    const marketCoins = providerName === 'coinmarketcap'
        ? await getCoinMarketCapMarketOverviewData()
        : await getCoinGeckoMarketOverviewData();

    marketOverviewCache.value = marketCoins;
    marketOverviewCache.expiresAt = Date.now() + MARKET_OVERVIEW_CACHE_MS;

    return marketCoins;
}

async function searchCoinGeckoDirectory(query) {
    const response = await fetchCoinGecko('/search', {
        params: {
            query
        }
    });

    return Array.isArray(response.data?.coins)
        ? response.data.coins
            .slice(0, 8)
            .map(buildCoinGeckoSearchResponse)
        : [];
}

function scoreCoinMarketCapMatch(coin, query) {
    const normalizedName = String(coin.name || '').toLowerCase();
    const normalizedSymbol = String(coin.symbol || '').toLowerCase();
    const normalizedSlug = String(coin.slug || '').toLowerCase();

    if (normalizedSlug === query || normalizedSymbol === query || normalizedName === query) {
        return 0;
    }

    if (normalizedSlug.startsWith(query) || normalizedSymbol.startsWith(query) || normalizedName.startsWith(query)) {
        return 1;
    }

    if (normalizedSlug.includes(query) || normalizedSymbol.includes(query) || normalizedName.includes(query)) {
        return 2;
    }

    return 3;
}

async function searchCoinMarketCapDirectory(query) {
    const directory = await getCoinMarketCapDirectory();

    return directory
        .filter((coin) => {
            const normalizedName = String(coin.name || '').toLowerCase();
            const normalizedSymbol = String(coin.symbol || '').toLowerCase();
            const normalizedSlug = String(coin.slug || '').toLowerCase();

            return normalizedName.includes(query)
                || normalizedSymbol.includes(query)
                || normalizedSlug.includes(query);
        })
        .sort((left, right) => {
            const scoreDifference = scoreCoinMarketCapMatch(left, query) - scoreCoinMarketCapMatch(right, query);

            if (scoreDifference !== 0) {
                return scoreDifference;
            }

            return Number(left.rank ?? Number.MAX_SAFE_INTEGER) - Number(right.rank ?? Number.MAX_SAFE_INTEGER);
        })
        .slice(0, 8)
        .map(buildCoinMarketCapSearchResponse);
}

async function searchCoinDirectory(query) {
    const normalizedQuery = String(query || '').trim().toLowerCase();

    if (!normalizedQuery) {
        return [];
    }

    const cacheKey = `${providerName}:${normalizedQuery}`;
    const cachedResult = coinSearchCache.get(cacheKey);

    if (cachedResult && cachedResult.expiresAt > Date.now()) {
        return cachedResult.value;
    }

    const searchResults = providerName === 'coinmarketcap'
        ? await searchCoinMarketCapDirectory(normalizedQuery)
        : await searchCoinGeckoDirectory(normalizedQuery);

    coinSearchCache.set(cacheKey, {
        value: searchResults,
        expiresAt: Date.now() + COIN_SEARCH_CACHE_MS
    });

    return searchResults;
}

async function resolveCoinMarketCapAsset(query) {
    const normalizedQuery = String(query || '').trim().toLowerCase();
    const directory = await getCoinMarketCapDirectory();

    return directory.find((coin) => String(coin.slug || '').toLowerCase() === normalizedQuery)
        || directory.find((coin) => String(coin.symbol || '').toLowerCase() === normalizedQuery)
        || directory.find((coin) => String(coin.name || '').toLowerCase() === normalizedQuery)
        || null;
}

function extractCoinMarketCapQuotes(responseData, coinNumericId) {
    const rawData = responseData?.data;

    if (Array.isArray(rawData?.quotes)) {
        return rawData.quotes;
    }

    if (rawData && Array.isArray(rawData[String(coinNumericId)]?.quotes)) {
        return rawData[String(coinNumericId)].quotes;
    }

    if (Array.isArray(rawData)) {
        const matchedAsset = rawData.find((entry) => Number(entry?.id) === Number(coinNumericId));
        return Array.isArray(matchedAsset?.quotes) ? matchedAsset.quotes : [];
    }

    return [];
}

async function fetchHistoricalPriceSeries(coinId, startDate, endDate) {
    if (providerName === 'coinmarketcap') {
        const asset = await resolveCoinMarketCapAsset(coinId);

        if (!asset?.id) {
            throw buildMarketDataError(404, 'The selected asset could not be found. Choose a supported coin from the search results and try again.');
        }

        const response = await fetchCoinMarketCap('/v1/cryptocurrency/ohlcv/historical', {
            params: {
                id: asset.id,
                convert: 'USD',
                interval: 'daily',
                time_start: `${startDate}T00:00:00.000Z`,
                time_end: `${endDate}T23:59:59.999Z`
            }
        });

        const quotes = extractCoinMarketCapQuotes(response.data, asset.id);

        return quotes
            .map((quoteEntry) => {
                const timestamp = parseSeriesTimestamp(
                    quoteEntry.time_close || quoteEntry.time_open || quoteEntry.timestamp
                );
                const price = Number(
                    quoteEntry.quote?.USD?.close
                    ?? quoteEntry.quote?.USD?.price
                    ?? 0
                );

                return timestamp !== null && Number.isFinite(price) && price > 0
                    ? [timestamp, price]
                    : null;
            })
            .filter(Boolean);
    }

    const startUnix = Math.floor(new Date(startDate).getTime() / 1000);
    const endUnix = Math.floor(new Date(endDate).getTime() / 1000);
    const response = await fetchCoinGecko(`/coins/${encodeURIComponent(coinId)}/market_chart/range`, {
        params: {
            vs_currency: 'usd',
            from: startUnix,
            to: endUnix
        }
    });

    return Array.isArray(response.data?.prices) ? response.data.prices : [];
}

async function calculateDcaResult({ coinId, investmentAmount, startDate, endDate, frequencyInDays }) {
    const prices = await fetchHistoricalPriceSeries(coinId, startDate, endDate);

    if (!prices || prices.length === 0) {
        throw buildMarketDataError(404, 'No price data found for this range.');
    }

    let totalInvested = 0;
    let totalCryptoAccumulated = 0;
    const msPerDay = 24 * 60 * 60 * 1000;
    const frequencyMs = Number(frequencyInDays) * msPerDay;
    let nextInvestmentTime = new Date(startDate).getTime();

    for (let index = 0; index < prices.length; index += 1) {
        const [timestamp, price] = prices[index];

        if (timestamp >= nextInvestmentTime) {
            totalInvested += Number(investmentAmount);
            totalCryptoAccumulated += (Number(investmentAmount) / price);
            nextInvestmentTime += frequencyMs;
        }
    }

    const currentPrice = Number(prices[prices.length - 1][1] ?? 0);
    const finalPortfolioValue = totalCryptoAccumulated * currentPrice;
    const profitOrLoss = finalPortfolioValue - totalInvested;
    const percentageChange = totalInvested > 0
        ? ((profitOrLoss / totalInvested) * 100).toFixed(2)
        : '0.00';

    return {
        coinId,
        totalInvested: totalInvested.toFixed(2),
        totalCryptoAccumulated: totalCryptoAccumulated.toFixed(6),
        currentPrice: currentPrice.toFixed(2),
        finalPortfolioValue: finalPortfolioValue.toFixed(2),
        profitOrLoss: profitOrLoss.toFixed(2),
        percentageChange: `${percentageChange}%`
    };
}

function getMarketDataErrorResponse(error, actionLabel = 'load market data') {
    if (error?.isMarketDataError) {
        return {
            status: error.marketDataStatus || 500,
            message: error.message
        };
    }

    if (error.response?.status === 404) {
        return {
            status: 404,
            message: 'The selected asset could not be found. Choose a supported coin from the search results and try again.'
        };
    }

    if (providerName === 'coinmarketcap' && (error.response?.status === 401 || error.response?.status === 403)) {
        return {
            status: 503,
            message: 'CoinMarketCap access is not configured correctly. Confirm the API key and plan permissions, then try again.'
        };
    }

    if (error.response?.status === 429) {
        return {
            status: 503,
            message: 'The live price feed is rate-limited right now. Please wait a moment and run the plan again.'
        };
    }

    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        return {
            status: 504,
            message: 'The live price feed took too long to respond. Please try the plan again.'
        };
    }

    if (providerName === 'coinmarketcap' && error.response?.status === 400) {
        return {
            status: 400,
            message: 'CoinMarketCap rejected the historical data request. Confirm your plan supports the requested range and try again.'
        };
    }

    if (providerName === 'coingecko' && error.response?.data?.error?.status?.error_code === 10012) {
        return {
            status: 400,
            message: getHistoryWindowErrorMessage()
        };
    }

    return {
        status: 500,
        message: `Failed to ${actionLabel}. The upstream ${providerLabel} price API may be unavailable or the asset may be invalid.`
    };
}

module.exports = {
    providerName,
    providerLabel,
    historyWindowDays,
    isWithinHistoryWindow,
    getHistoryWindowErrorMessage,
    getMarketOverviewData,
    searchCoinDirectory,
    calculateDcaResult,
    getMarketDataErrorResponse
};
