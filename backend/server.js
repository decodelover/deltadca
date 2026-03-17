const express = require('express');
const compression = require('compression');
const cors = require('cors');
const bcrypt = require('bcrypt');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const config = require('./config');
const { pool, verifyDatabaseConnection } = require('./db');
const {
    providerName,
    providerLabel,
    historyWindowDays,
    isWithinHistoryWindow,
    getHistoryWindowErrorMessage,
    getMarketOverviewData,
    searchCoinDirectory,
    calculateDcaResult,
    getMarketDataErrorResponse
} = require('./marketDataProvider');

// Initialize the Express Engine
const app = express();
const PORT = config.port;
const SALT_ROUNDS = 10;
const JWT_SECRET = config.jwtSecret;
const JWT_EXPIRES_IN = '24h';
const TOKEN_PREFIX = 'Bearer ';
const allowedOrigins = config.allowedOrigins;
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: config.apiRateLimitMax,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: (req) => req.path === '/health',
    message: {
        status: 'error',
        message: 'Too many requests hit the DeltaDCA API. Please wait a moment and try again.'
    }
});
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: config.authRateLimitMax,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {
        status: 'error',
        message: 'Too many sign-in attempts were detected. Please wait a few minutes and try again.'
    }
});

const generateToken = (user) => jwt.sign(
    {
        userId: user.id,
        email: user.email
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
);

const sanitizeUser = (userRecord) => ({
    id: userRecord.id,
    name: userRecord.name,
    email: userRecord.email
});

const buildSavedSimulationResponse = (row) => ({
    id: row.id,
    user_id: row.user_id,
    coin_id: row.coin_id,
    investment_amount: Number(row.investment_amount),
    frequency: row.frequency,
    frequency_in_days: row.frequency_in_days === null ? null : Number(row.frequency_in_days),
    start_date: row.start_date,
    end_date: row.end_date,
    total_invested: Number(row.total_invested),
    final_portfolio_value: Number(row.final_portfolio_value),
    profit_or_loss: Number(row.profit_or_loss),
    created_at: row.created_at
});

function parsePositiveNumber(value) {
    const parsedValue = Number(value);

    if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
        return null;
    }

    return parsedValue;
}

function parseNonNegativeNumber(value) {
    const parsedValue = Number(value);

    if (!Number.isFinite(parsedValue) || parsedValue < 0) {
        return null;
    }

    return parsedValue;
}

function isValidDateInput(value) {
    const parsedDate = new Date(value);
    return !Number.isNaN(parsedDate.getTime());
}

async function authenticateRequest(req, res, next) {
    try {
        const authorization = req.headers.authorization || '';

        if (!authorization.startsWith(TOKEN_PREFIX)) {
            return res.status(401).json({
                status: 'error',
                message: 'Authentication required.'
            });
        }

        const token = authorization.slice(TOKEN_PREFIX.length).trim();
        const payload = jwt.verify(token, JWT_SECRET);

        const userResult = await pool.query(
            `SELECT id, name, email
             FROM users
             WHERE id = $1`,
            [payload.userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(401).json({
                status: 'error',
                message: 'Your session is no longer valid. Please sign in again.'
            });
        }

        req.user = sanitizeUser(userResult.rows[0]);
        return next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({
                status: 'error',
                message: 'Your session has expired. Please sign in again.'
            });
        }

        return next(error);
    }
}

// ==========================================
// 1. MIDDLEWARE (Security & Parsers)
// ==========================================
app.disable('x-powered-by');

if (config.trustProxy) {
    app.set('trust proxy', 1);
}

app.use(helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: false
}));
app.use(compression());
app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.has(origin)) {
            return callback(null, true);
        }

        if (!config.isProduction && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
            return callback(null, true);
        }

        return callback(new Error('Origin not allowed by CORS'));
    },
    credentials: true
}));
app.use('/api', apiLimiter);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ==========================================
// 2. ROUTES (The API Endpoints)
// ==========================================

app.get('/', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'DeltaDCA API is online.',
        health_check: '/api/health'
    });
});

app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'DeltaDCA API is online.',
        environment: config.nodeEnv,
        uptime_seconds: Math.round(process.uptime()),
        market_data_provider: providerName,
        history_window_days: historyWindowDays
    });
});

app.get('/api/app-config', (req, res) => {
    res.status(200).json({
        status: 'success',
        data: {
            marketDataProvider: providerName,
            marketDataProviderLabel: providerLabel,
            historyWindowDays: historyWindowDays
        }
    });
});

app.get('/api/test-db', async (req, res, next) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.status(200).json({ status: 'success', message: 'Vault is unlocked!', database_time: result.rows[0].now });
    } catch (error) {
        next(error);
    }
});

app.get('/api/market-overview', async (req, res, next) => {
    try {
        const marketCoins = await getMarketOverviewData();

        return res.status(200).json({
            status: 'success',
            data: marketCoins,
            refreshed_at: new Date().toISOString(),
            market_data_provider: providerName
        });
    } catch (error) {
        const errorResponse = getMarketDataErrorResponse(error, 'load market overview');
        return res.status(errorResponse.status).json({
            status: 'error',
            message: errorResponse.message
        });
    }
});

app.get('/api/coins/search', async (req, res, next) => {
    try {
        const query = String(req.query.query || '').trim();

        if (!query) {
            return res.status(200).json({
                status: 'success',
                data: []
            });
        }

        const results = await searchCoinDirectory(query);

        return res.status(200).json({
            status: 'success',
            data: results
        });
    } catch (error) {
        const errorResponse = getMarketDataErrorResponse(error, 'search assets');
        return res.status(errorResponse.status).json({
            status: 'error',
            message: errorResponse.message
        });
    }
});

app.post('/api/register', authLimiter, async (req, res, next) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                status: 'error',
                message: 'Name, email, and password are required.'
            });
        }

        const normalizedName = name.trim();
        const normalizedEmail = email.trim().toLowerCase();
        const normalizedPassword = String(password);

        if (!normalizedName || !normalizedEmail || normalizedPassword.length < 8) {
            return res.status(400).json({
                status: 'error',
                message: 'Provide a name, a valid email, and a password with at least 8 characters.'
            });
        }

        const existingUserResult = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            [normalizedEmail]
        );

        if (existingUserResult.rows.length > 0) {
            return res.status(400).json({ status: 'error', message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(normalizedPassword, SALT_ROUNDS);

        const newUserResult = await pool.query(
            `INSERT INTO users (name, email, password)
             VALUES ($1, $2, $3)
             RETURNING id, name, email`,
            [normalizedName, normalizedEmail, hashedPassword]
        );

        const user = newUserResult.rows[0];
        const token = generateToken(user);

        return res.status(201).json({
            status: 'success',
            token,
            user
        });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ status: 'error', message: 'User already exists' });
        }

        next(error);
    }
});

app.get('/api/me', authenticateRequest, async (req, res) => {
    return res.status(200).json({
        status: 'success',
        user: req.user
    });
});

app.post('/api/login', authLimiter, async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                status: 'error',
                message: 'Email and password are required.'
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const userResult = await pool.query(
            `SELECT id, name, email, password
             FROM users
             WHERE email = $1`,
            [normalizedEmail]
        );

        if (userResult.rows.length === 0) {
            return res.status(401).json({ status: 'error', message: 'Invalid credentials' });
        }

        const userRecord = userResult.rows[0];
        const isPasswordValid = await bcrypt.compare(password, userRecord.password);

        if (!isPasswordValid) {
            return res.status(401).json({ status: 'error', message: 'Invalid credentials' });
        }

        const user = {
            id: userRecord.id,
            name: userRecord.name,
            email: userRecord.email
        };

        const token = generateToken(user);

        return res.status(200).json({
            status: 'success',
            token,
            user
        });
    } catch (error) {
        next(error);
    }
});

app.get('/api/saved-simulations', authenticateRequest, async (req, res, next) => {
    try {
        const result = await pool.query(
            `SELECT
                id,
                user_id,
                coin_id,
                investment_amount,
                frequency,
                CASE
                    WHEN frequency ~ '^[0-9]+$' THEN frequency::integer
                    ELSE NULL
                END AS frequency_in_days,
                start_date::text AS start_date,
                end_date::text AS end_date,
                total_invested,
                final_portfolio_value,
                (final_portfolio_value - total_invested) AS profit_or_loss,
                created_at
             FROM saved_simulations
             WHERE user_id = $1
             ORDER BY created_at DESC`,
            [req.user.id]
        );

        return res.status(200).json({
            status: 'success',
            data: result.rows.map(buildSavedSimulationResponse)
        });
    } catch (error) {
        return next(error);
    }
});

app.post('/api/saved-simulations', authenticateRequest, async (req, res, next) => {
    try {
        const {
            coinId,
            investmentAmount,
            frequencyInDays,
            startDate,
            endDate,
            totalInvested,
            finalPortfolioValue
        } = req.body;

        const normalizedCoinId = String(coinId || '').trim().toLowerCase();
        const parsedInvestmentAmount = parsePositiveNumber(investmentAmount);
        const parsedFrequencyInDays = parsePositiveNumber(frequencyInDays);
        const parsedTotalInvested = parsePositiveNumber(totalInvested);
        const parsedFinalPortfolioValue = parseNonNegativeNumber(finalPortfolioValue);

        if (
            !normalizedCoinId
            || parsedInvestmentAmount === null
            || parsedFrequencyInDays === null
            || parsedTotalInvested === null
            || parsedFinalPortfolioValue === null
            || !startDate
            || !endDate
        ) {
            return res.status(400).json({
                status: 'error',
                message: 'Complete the simulation payload before saving it.'
            });
        }

        if (!isValidDateInput(startDate) || !isValidDateInput(endDate) || new Date(startDate) > new Date(endDate)) {
            return res.status(400).json({
                status: 'error',
                message: 'Start and end dates must be valid, and the end date must not be before the start date.'
            });
        }

        const savedSimulationResult = await pool.query(
            `INSERT INTO saved_simulations (
                user_id,
                coin_id,
                investment_amount,
                frequency,
                start_date,
                end_date,
                total_invested,
                final_portfolio_value
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING
                id,
                user_id,
                coin_id,
                investment_amount,
                frequency,
                CASE
                    WHEN frequency ~ '^[0-9]+$' THEN frequency::integer
                    ELSE NULL
                END AS frequency_in_days,
                start_date::text AS start_date,
                end_date::text AS end_date,
                total_invested,
                final_portfolio_value,
                (final_portfolio_value - total_invested) AS profit_or_loss,
                created_at`,
            [
                req.user.id,
                normalizedCoinId,
                parsedInvestmentAmount,
                String(Math.round(parsedFrequencyInDays)),
                startDate,
                endDate,
                parsedTotalInvested,
                parsedFinalPortfolioValue
            ]
        );

        return res.status(201).json({
            status: 'success',
            data: buildSavedSimulationResponse(savedSimulationResult.rows[0])
        });
    } catch (error) {
        return next(error);
    }
});

app.delete('/api/saved-simulations/:simulationId', authenticateRequest, async (req, res, next) => {
    try {
        const { simulationId } = req.params;

        const deleteResult = await pool.query(
            `DELETE FROM saved_simulations
             WHERE id = $1 AND user_id = $2
             RETURNING id`,
            [simulationId, req.user.id]
        );

        if (deleteResult.rows.length === 0) {
            return res.status(404).json({
                status: 'error',
                message: 'Saved simulation not found.'
            });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Saved simulation removed.'
        });
    } catch (error) {
        return next(error);
    }
});

// THE DELTADCA MATH ENGINE (Fully Functional)
app.post('/api/calculate', async (req, res, next) => {
    try {
        const { coinId, investmentAmount, startDate, endDate, frequencyInDays } = req.body;

        if (!coinId || !investmentAmount || !startDate || !endDate || !frequencyInDays) {
            return res.status(400).json({ status: 'error', message: 'Missing required fields.' });
        }

        const parsedStartDate = new Date(startDate);
        const parsedEndDate = new Date(endDate);

        if (!isValidDateInput(startDate) || !isValidDateInput(endDate) || parsedStartDate > parsedEndDate) {
            return res.status(400).json({
                status: 'error',
                message: 'Provide valid dates and ensure the end date is not before the start date.'
            });
        }

        if (!isWithinHistoryWindow(parsedStartDate, parsedEndDate)) {
            return res.status(400).json({
                status: 'error',
                message: getHistoryWindowErrorMessage()
            });
        }

        const data = await calculateDcaResult({
            coinId,
            investmentAmount,
            startDate,
            endDate,
            frequencyInDays
        });

        res.status(200).json({
            status: 'success',
            data
        });
    } catch (error) {
        console.error('Math Engine Error:', error.message);
        const errorResponse = getMarketDataErrorResponse(error, 'calculate DCA');
        return res.status(errorResponse.status).json({
            status: 'error',
            message: errorResponse.message
        });
    }
});

// ==========================================
// 3. GLOBAL ERROR HANDLER
// ==========================================
app.use((req, res) => {
    res.status(404).json({
        status: 'error',
        message: 'Route not found.'
    });
});

app.use((err, req, res, next) => {
    console.error('Critical Server Error:', err.message);
    res.status(err.status || 500).json({ status: 'error', message: err.message || 'Internal Server Error' });
});

// ==========================================
// 4. INITIATE SERVER
// ==========================================
let shutdownHandlersRegistered = false;

function registerShutdownHandlers(server) {
    if (shutdownHandlersRegistered) {
        return;
    }

    shutdownHandlersRegistered = true;

    const shutdown = (signal) => {
        console.log(`[DeltaDCA Core] ${signal} received. Shutting down gracefully.`);

        server.close(async () => {
            try {
                await pool.end();
            } finally {
                process.exit(0);
            }
        });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
}

async function startServer(port = PORT) {
    try {
        await verifyDatabaseConnection();

        const server = await new Promise((resolve, reject) => {
            const instance = app.listen(port, () => {
                console.log(`[DeltaDCA Core] API listening on port ${port} (${config.nodeEnv}).`);
                resolve(instance);
            });

            instance.on('error', reject);
        });

        registerShutdownHandlers(server);
        return server;
    } catch (error) {
        console.error('[DeltaDCA Core] Failed to boot:', error.message);
        throw error;
    }
}

if (require.main === module) {
    void startServer().catch(() => {
        process.exit(1);
    });
}

module.exports = app;
module.exports.app = app;
module.exports.startServer = startServer;
