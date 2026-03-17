# DeltaDCA Frontend

The frontend is a React and Vite application that powers the DeltaDCA planner, authentication screens, saved plans view, and live market overview.

## Environment

Create `frontend/.env` from `frontend/.env.example`.

- `VITE_API_BASE_URL`: public API origin including `/api`
- `VITE_PROXY_TARGET`: optional local proxy target for Vite dev and preview

## Commands

```bash
npm install
npm run dev -- --host localhost
npm run lint
npm run build
```

## Production notes

- The app expects a live backend URL through `VITE_API_BASE_URL`
- SPA routing support is included through `public/_redirects` and `nginx.conf`
- The production container is defined in `frontend/Dockerfile`
