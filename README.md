# DeltaDCA

DeltaDCA is a full-stack crypto dollar-cost averaging planner. It lets users run live DCA backtests against market data, review projected outcomes, create accounts, and save simulations to PostgreSQL.

## Stack

- Frontend: React 19, Vite, Tailwind CSS, Axios, Recharts
- Backend: Express 5, PostgreSQL, JWT auth, CoinMarketCap or CoinGecko market data
- Deployment-ready extras: production env validation, CORS controls, rate limiting, Dockerfiles, and a full Docker Compose launch path

## Local development

### 1. Backend

Create `backend/.env` from `backend/.env.example`, then install and run:

```bash
cd backend
npm install
npm start
```

### 2. Frontend

Create `frontend/.env` from `frontend/.env.example`, then install and run:

```bash
cd frontend
npm install
npm run dev -- --host localhost
```

## Production environment

### Backend

The API requires these values in production:

- `NODE_ENV=production`
- `JWT_SECRET`
- `FRONTEND_URL` or `ALLOWED_ORIGINS`
- `MARKET_DATA_PROVIDER`
- `MARKET_HISTORY_WINDOW_DAYS`
- Either `DATABASE_URL` or all `DB_*` variables

If you choose `MARKET_DATA_PROVIDER=coinmarketcap`, also set:

- `COINMARKETCAP_API_KEY`

### Frontend

The frontend requires:

- `VITE_API_BASE_URL`

Example values are provided in:

- `backend/.env.example`
- `frontend/.env.example`
- `.env.production.example`

## Docker launch

This repo now includes:

- `backend/Dockerfile`
- `frontend/Dockerfile`
- `frontend/nginx.conf`
- `docker-compose.prod.yml`

To launch the full stack with PostgreSQL:

1. Copy `.env.production.example` to `.env.production`
2. Replace the placeholder secrets and URLs
3. Run:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up --build -d
```

The compose stack will:

- start PostgreSQL
- initialize tables from `backend/database.sql`
- build and run the API
- build and serve the frontend through Nginx

## Pre-launch checklist

- Set a strong `JWT_SECRET`
- Point `FRONTEND_URL` and `VITE_API_BASE_URL` at your real domains
- Add a valid `COINMARKETCAP_API_KEY` if you are using CoinMarketCap
- Use a production PostgreSQL database and credentials
- Enable HTTPS at your hosting layer or reverse proxy
- Confirm your market-data provider plan supports the historical range you expose in the UI
- Run `npm run lint` and `npm run build` in `frontend`
- Verify `/api/health`, auth, simulation save/delete, and planner calculations after deployment
