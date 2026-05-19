# PartTrack

B2B robot station parts inventory tracker — university project.

## Quick start

```bash
cp .env.example .env
docker compose up --build
```

- Frontend → http://localhost
- Backend API → http://localhost:4000/api (also proxied through Nginx at /api)

## Demo accounts

| Email | Password | Role |
|---|---|---|
| admin@parttrack.dev | admin123 | Admin |
| alpha@parttrack.dev | delegate123 | Delegate (Alpha Station) |
| beta@parttrack.dev | delegate123 | Delegate (Beta Station) |

## Stack

- **Backend** — Node.js + Express 4, port 4000
- **Database** — PostgreSQL 16, node-pg-migrate
- **Auth** — JWT (8 h) + bcryptjs (cost 10), roles: admin / delegate
- **Background job** — node-cron (hourly), fires email alerts for low stock
- **Email** — Nodemailer; Ethereal auto-account in dev (preview URL printed to logs), Gmail SMTP in prod (set EMAIL_* vars)
- **Frontend** — React 18 + Vite 5 + React Router 6
- **Serving** — Nginx reverse-proxies /api → backend, SPA fallback for everything else

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| JWT_SECRET | supersecretjwtkey | JWT signing key |
| NODE_ENV | development | |
| EMAIL_HOST | *(blank → Ethereal)* | SMTP host |
| EMAIL_PORT | 587 | SMTP port |
| EMAIL_USER | | SMTP username |
| EMAIL_PASS | | SMTP password / App Password |
| EMAIL_FROM | noreply@parttrack.dev | From address |
| ALERT_TO | admin@parttrack.dev | Low-stock alert recipient |

## Features

- **Admin dashboard** — 4 tabs: Parts (all stations), Stations CRUD, Users CRUD, Audit Log
- **Delegate dashboard** — scoped to their assigned station only
- **Quantity control** — stepper (±Δ with preview) or exact value; nothing saved until Confirm
- **Low-stock highlights** — rows turn amber when quantity < min_threshold
- **Stock-check cron** — runs hourly; 24 h cooldown per part to avoid email spam
- **Manual trigger** — "Run stock check now" button in admin toolbar
