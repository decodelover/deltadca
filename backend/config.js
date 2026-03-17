require('dotenv').config({ quiet: true });

const DEFAULT_LOCAL_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
    'http://localhost:4173',
    'http://127.0.0.1:4173'
];
const DEVELOPMENT_JWT_SECRET = 'development-only-deltadca-jwt-secret-change-this-before-production';
const SUPPORTED_MARKET_DATA_PROVIDERS = new Set(['coingecko', 'coinmarketcap']);

function parseNumber(value, fallback) {
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}

function parseBoolean(value, fallback = false) {
    if (value === undefined) {
        return fallback;
    }

    return String(value).trim().toLowerCase() === 'true';
}

function splitList(value) {
    return String(value || '')
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);
}

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';
const requestedMarketDataProvider = String(
    process.env.MARKET_DATA_PROVIDER || (process.env.COINMARKETCAP_API_KEY ? 'coinmarketcap' : 'coingecko')
)
    .trim()
    .toLowerCase();
const marketDataProvider = SUPPORTED_MARKET_DATA_PROVIDERS.has(requestedMarketDataProvider)
    ? requestedMarketDataProvider
    : 'coingecko';
const marketHistoryWindowDays = parseNumber(
    process.env.MARKET_HISTORY_WINDOW_DAYS,
    marketDataProvider === 'coinmarketcap' ? 730 : 365
);

const configuredOrigins = [
    process.env.FRONTEND_URL,
    ...splitList(process.env.ALLOWED_ORIGINS)
].filter(Boolean);
const allowedOrigins = new Set([
    ...configuredOrigins,
    ...(isProduction ? [] : DEFAULT_LOCAL_ORIGINS)
]);

const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
const hasDiscreteDatabaseConfig = ['DB_USER', 'DB_PASSWORD', 'DB_HOST', 'DB_PORT', 'DB_NAME']
    .every((key) => Boolean(process.env[key]));

const missingVariables = [];

if (!hasDatabaseUrl && !hasDiscreteDatabaseConfig) {
    missingVariables.push('DATABASE_URL or DB_USER/DB_PASSWORD/DB_HOST/DB_PORT/DB_NAME');
}

if (isProduction && !process.env.JWT_SECRET) {
    missingVariables.push('JWT_SECRET');
}

if (isProduction && allowedOrigins.size === 0) {
    missingVariables.push('FRONTEND_URL or ALLOWED_ORIGINS');
}

if (requestedMarketDataProvider && !SUPPORTED_MARKET_DATA_PROVIDERS.has(requestedMarketDataProvider)) {
    missingVariables.push('MARKET_DATA_PROVIDER must be either coingecko or coinmarketcap');
}

if (marketDataProvider === 'coinmarketcap' && !process.env.COINMARKETCAP_API_KEY) {
    missingVariables.push('COINMARKETCAP_API_KEY');
}

if (missingVariables.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVariables.join(', ')}`);
}

module.exports = {
    nodeEnv,
    isProduction,
    port: parseNumber(process.env.PORT, 5000),
    jwtSecret: process.env.JWT_SECRET || DEVELOPMENT_JWT_SECRET,
    frontendUrl: process.env.FRONTEND_URL || '',
    allowedOrigins,
    databaseUrl: process.env.DATABASE_URL || '',
    dbUser: process.env.DB_USER || '',
    dbPassword: process.env.DB_PASSWORD || '',
    dbHost: process.env.DB_HOST || '',
    dbPort: parseNumber(process.env.DB_PORT, 5432),
    dbName: process.env.DB_NAME || '',
    dbSsl: parseBoolean(process.env.DB_SSL, isProduction),
    trustProxy: parseBoolean(process.env.TRUST_PROXY, isProduction),
    apiRateLimitMax: parseNumber(process.env.API_RATE_LIMIT_MAX, 300),
    authRateLimitMax: parseNumber(process.env.AUTH_RATE_LIMIT_MAX, 12),
    dbPoolMax: parseNumber(process.env.DB_POOL_MAX, 10),
    dbIdleTimeoutMs: parseNumber(process.env.DB_IDLE_TIMEOUT_MS, 30000),
    dbConnectionTimeoutMs: parseNumber(process.env.DB_CONNECTION_TIMEOUT_MS, 10000),
    marketDataProvider,
    marketHistoryWindowDays,
    coinmarketcapApiKey: process.env.COINMARKETCAP_API_KEY || '',
    coinmarketcapApiBaseUrl: process.env.COINMARKETCAP_API_BASE_URL || 'https://pro-api.coinmarketcap.com'
};
