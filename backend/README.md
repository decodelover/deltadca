# DeltaDCA Backend

The backend is an Express API that handles authentication, market-data-backed DCA calculations, market overview queries, and saved simulations stored in PostgreSQL.

## Environment

Create `backend/.env` from `backend/.env.example`.

Production requires:

- `JWT_SECRET`
- `FRONTEND_URL` or `ALLOWED_ORIGINS`
- `MARKET_DATA_PROVIDER`
- `MARKET_HISTORY_WINDOW_DAYS`
- Either `DATABASE_URL` or the full `DB_*` set

If you use CoinMarketCap, also provide:

- `COINMARKETCAP_API_KEY`

## Commands

```bash
npm install
npm start
```

## Security and launch behavior

- Helmet security headers
- API and auth rate limiting
- CORS allowlist enforcement
- PostgreSQL startup validation
- Graceful shutdown on `SIGINT` and `SIGTERM`
