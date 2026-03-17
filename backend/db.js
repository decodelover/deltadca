const { Pool } = require('pg');
const config = require('./config');

const connectionOptions = config.databaseUrl
    ? {
        connectionString: config.databaseUrl
    }
    : {
        user: config.dbUser,
        password: config.dbPassword,
        host: config.dbHost,
        port: config.dbPort,
        database: config.dbName
    };

if (config.dbSsl) {
    connectionOptions.ssl = {
        rejectUnauthorized: false
    };
}

const pool = new Pool({
    ...connectionOptions,
    max: config.dbPoolMax,
    idleTimeoutMillis: config.dbIdleTimeoutMs,
    connectionTimeoutMillis: config.dbConnectionTimeoutMs
});

pool.on('error', (error) => {
    console.error('[DeltaDCA Vault] Unexpected PostgreSQL error:', error.message);
});

async function verifyDatabaseConnection() {
    await pool.query('SELECT 1');
    console.log('[DeltaDCA Vault] PostgreSQL connection established.');
}

module.exports = {
    pool,
    verifyDatabaseConnection
};
