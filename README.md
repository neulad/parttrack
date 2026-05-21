![Uploading Screenshot 2026-05-21 at 21.32.27.png…]()
# PartTrack

> Inventory management system for manufacturing stations — real-time stock tracking, shipment lifecycle management, and automated low-stock email alerts.

**Author:** Uladzimir Kireyeu — Student ID: 45138

---

## Screenshots

> **Add your own screenshots here before submission.**  
> Suggested captures: login page, Parts tab, low-stock row highlight, Log Shipment page, part history view, alert recipients panel.

| Parts | Part History |
|---|---|
| ![Parts](https://github.com/user-attachments/assets/81af56df-d28e-480e-9058-e58e80a8cf64) | ![Part History](https://github.com/user-attachments/assets/0ed179c8-3079-405c-83d3-f61575d42b5f) |

| Log Shipment | Alert Recipients |
|---|---|
| ![Log shipment](https://github.com/user-attachments/assets/9e132dae-6acd-4865-a0ea-32cbf53c7dcd) | ![Alert recipients](https://github.com/user-attachments/assets/fbe5d426-72cb-418e-b754-13de5552af9b) |

---

## Purpose

Manufacturing stations depend on a continuous supply of components. When a part runs low, the delay between noticing the shortage and placing a reorder can halt production. PartTrack solves this by:

1. Giving station delegates a simple interface to adjust stock counts as parts are consumed.
2. Tracking shipments from the moment an order is placed through to physical delivery.
3. Running an automated hourly background job that emails configured recipients when stock — accounting for parts already on the way — falls below the defined minimum.

---

## Features

| Feature | Description |
|---|---|
| **Role-based access** | `admin` manages all stations, parts, users, and alert recipients. `delegate` manages only their assigned station. |
| **Parts & stock** | Create parts with SKU, supplier, and minimum threshold. Adjust quantity via stepper or exact value. |
| **Shipment tracking** | Log an order with quantity and optional tracking link. In-transit count is shown alongside stock. |
| **Mark delivered** | Delegates mark a shipment as delivered; stock is updated atomically in a transaction. |
| **Unified history** | Per-part timeline merges quantity adjustments and deliveries with a filter dropdown. |
| **Audit log** | Every stock change is recorded with the acting user, old/new values, and an optional note. |
| **Low-stock alerts** | Hourly cron checks all parts. Emails are sent only when `qty + in_transit < threshold`. Progressive backoff: immediate → every 24 h (up to 3 times) → weekly on Monday 08:00. |
| **Pagination** | Server-side pagination on the parts list (`page` / `limit` query parameters). |
| **Input validation** | All API endpoints validated with `express-validator` — type coercion, length limits, format checks. |

---

## Tech Stack

### Backend
| Technology | Version | Role |
|---|---|---|
| Node.js | 20 (LTS) | Runtime |
| Express | 4.x | HTTP framework |
| PostgreSQL | 16 | Relational database |
| `pg` (node-postgres) | 8.x | Database driver |
| `node-pg-migrate` | 8.x | Schema versioning |
| `jsonwebtoken` | 9.x | JWT authentication |
| `bcryptjs` | 3.x | Password hashing |
| `express-validator` | 7.x | Request validation & sanitisation |
| `node-cron` | 4.x | Scheduled stock checks |
| `nodemailer` | 8.x | Email delivery |
| Jest | 29.x | Test runner |
| supertest | 7.x | HTTP integration testing |

### Frontend
| Technology | Version | Role |
|---|---|---|
| React | 18.x | UI library |
| Vite | 5.x | Build tool & dev server |
| React Router | 6.x | Client-side routing |
| Vanilla CSS | — | Styling (no framework) |

### Infrastructure
| Technology | Role |
|---|---|
| Docker / Docker Compose | Container orchestration |
| nginx (alpine) | Static file server + API reverse proxy |

---

## Architecture

The system is composed of three Docker containers that communicate over an internal Docker network:

```
Browser
  │
  ▼
nginx :80
  ├── /api/*  ──► Express :4000  ──► PostgreSQL :5432
  └── /*      ──► React SPA (static files)
```

### Directory layout

```
part_tracker/
├── backend/
│   ├── migrations/          # node-pg-migrate versioned schema files
│   ├── seeds/               # Development seed data
│   └── src/
│       ├── __tests__/       # Jest test suites
│       ├── db/              # pg pool singleton
│       ├── jobs/            # node-cron stock check job
│       ├── lib/             # nodemailer wrapper
│       ├── middleware/      # JWT auth middleware
│       └── routes/          # Express route handlers
├── frontend/
│   └── src/
│       ├── api/             # Fetch wrapper (API client)
│       ├── components/      # Shared React components
│       ├── context/         # React context (ToastContext)
│       └── pages/           # Page-level components
├── nginx/
│   └── default.conf         # Reverse proxy configuration
└── docker-compose.yml
```

### Key architectural decisions

**Separate `stock_levels` table**  
Stock quantity lives in its own table rather than a column on `parts`. This allows locking a single row (`SELECT … FOR UPDATE`) during concurrent writes without locking unrelated part metadata.

**In-transit suppression**  
An alert fires only when `quantity + pending shipment quantity < min_threshold`. This prevents notification noise when a reorder is already in flight.

**Progressive alert cadence**  
Cooldown escalates automatically: immediate on first detection → 24-hour gaps for the next two alerts → weekly (Monday 08:00) thereafter. Cooldowns are deleted automatically once stock recovers.

**Stateless JWT authentication**  
8-hour HS256 tokens. No refresh-token mechanism is required for an intranet deployment where users log in at the start of each shift.

**Transactions for multi-step writes**  
Every operation touching more than one table (create part + stock level, deliver shipment + update stock + audit entry) runs inside `BEGIN … COMMIT` with `ROLLBACK` on error, guaranteeing consistency.

**nginx as a single entry point**  
The frontend container serves the React build and reverse-proxies `/api/*` to the backend container. A single exposed port (`:80`) means no CORS configuration is necessary.

---

## UML Diagrams

Three PlantUML diagrams are provided in the `docs/` folder. Open each file, copy the full contents, and paste into **[plantuml.com/plantuml/uml](https://www.plantuml.com/plantuml/uml/)**.

| File | Diagram | What it shows |
|---|---|---|
| [`docs/diagram-1-components.puml`](docs/diagram-1-components.puml) | Component | Containers, internal services, and external actors |
| [`docs/diagram-2-er.puml`](docs/diagram-2-er.puml) | ER | All database tables and their relationships |
| [`docs/diagram-3-alert-sequence.puml`](docs/diagram-3-alert-sequence.puml) | Sequence | The automated low-stock alert flow end-to-end |

### Database schema (summary)

```
stations ──< parts ──── stock_levels   (1 part : 1 stock row)
                   ──< shipments
                   ──< audit_log
                   ──< email_cooldowns
users    ──< shipments
         ──< audit_log
         └──> stations  (station_id)
alert_recipients         (standalone — stores notification emails)
```

---

## Requirements

- Docker Desktop ≥ 4.x (includes Docker Compose v2)
- A `.env` file in the project root (see [Setup](#setup))
- For email alerts: a Gmail account with an App Password

---

## Setup

### 1. Clone the repository

```bash
git clone <repository-url>
cd part_tracker
```

### 2. Create the environment file

```bash
cp .env.example .env
```

Open `.env` and set at minimum `JWT_SECRET`. For email alerts, fill in the `EMAIL_*` variables.

```env
# Required — fail-fast on startup if missing
JWT_SECRET=change-me-to-a-long-random-string

NODE_ENV=development

# Public URL used in alert email links (no trailing slash)
APP_URL=http://localhost

# SMTP — leave blank to disable sending (alerts are logged to console instead)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=          # ← Gmail App Password
EMAIL_FROM=your-gmail@gmail.com
```

> **Gmail App Password:** provided separately by the student.

### 3. Start the stack

```bash
docker compose up -d --build
```

This will:
- Start PostgreSQL and wait for a healthy status
- Run all database migrations automatically
- Seed the database with sample stations, parts, and a default admin account
- Serve the frontend at **[http://localhost](http://localhost)**

### 4. Default credentials

| Email | Password | Role |
|---|---|---|
| `admin@parttrack.dev` | `admin123` | Admin |
| `delegate@parttrack.dev` | `delegate123` | Delegate |

### 5. Running the tests

```bash
docker compose exec backend npm test
```

Tests run entirely inside the container — no local Node.js installation is required.

---

## Environment Variables Reference

| Variable | Required | Default | Description |
|---|---|---|---|
| `JWT_SECRET` | **Yes** | — | JWT signing key. Application refuses to start if unset. |
| `NODE_ENV` | No | `development` | Node environment |
| `APP_URL` | No | `http://localhost` | Base URL embedded in alert email links |
| `EMAIL_HOST` | No | — | SMTP host. Leave blank to disable email. |
| `EMAIL_PORT` | No | `587` | SMTP port |
| `EMAIL_USER` | No | — | SMTP username |
| `EMAIL_PASS` | No | — | SMTP password / App Password |
| `EMAIL_FROM` | No | `noreply@parttrack.dev` | From address in outgoing emails |

---

## API Reference

All endpoints are prefixed `/api`. Protected routes require `Authorization: Bearer <token>`.

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/login` | Public | Returns a signed JWT |
| `GET` | `/stations` | Any | List stations |
| `POST` | `/stations` | Admin | Create station |
| `DELETE` | `/stations/:id` | Admin | Delete station (cascades to parts) |
| `GET` | `/parts?page&limit&station_id` | Any | Paginated parts list with in-transit count |
| `GET` | `/parts/:id` | Any | Single part detail |
| `POST` | `/parts` | Admin | Create part |
| `PATCH` | `/parts/:id/quantity` | Any | Adjust stock quantity |
| `DELETE` | `/parts/:id` | Admin | Delete part |
| `GET` | `/parts/:id/shipments` | Any | All shipments for a part |
| `POST` | `/parts/:id/shipments` | Any | Log a new shipment |
| `PATCH` | `/parts/:id/shipments/:sid/deliver` | Any | Mark shipment as delivered |
| `GET` | `/parts/:id/history` | Any | Unified event timeline |
| `GET` | `/admin/users` | Admin | List users |
| `POST` | `/admin/users` | Admin | Create user |
| `DELETE` | `/admin/users/:id` | Admin | Delete user |
| `GET` | `/admin/alert-recipients` | Admin | List alert email addresses |
| `POST` | `/admin/alert-recipients` | Admin | Add alert email address |
| `PUT` | `/admin/alert-recipients/:id` | Admin | Update alert email address |
| `DELETE` | `/admin/alert-recipients/:id` | Admin | Remove alert email address |
| `POST` | `/admin/check-stock` | Admin | Manually trigger stock check |

---

## Test Coverage

Tests live in `backend/src/__tests__/` and are run with Jest + supertest. The PostgreSQL pool is mocked — no live database is required.

| Suite | Tests | Coverage |
|---|---|---|
| `stockCheck.test.js` | 7 | `shouldAlert()` — all cooldown branches: first alert, 24 h gap, in-transit suppression, weekly Monday cadence, 144 h minimum gap |
| `auth.test.js` | 5 | `POST /auth/login` — missing fields, invalid email format, unknown user, wrong password, successful login |
| `parts.test.js` | 10 | `GET /parts` — unauthenticated 401, paginated response shape, invalid query params; `PATCH /:id/quantity` — negative value, non-numeric, 404, delegate 403; `POST /:id/shipments` — quantity < 1, invalid tracking URL |

**Total: 22 tests — all passing.**

---

## Design & Styling

The UI uses plain CSS custom properties — no component library or utility framework.

- **CSS variables** for a consistent colour palette (`--color-primary`, `--color-warning`, `--color-danger`, `--color-success`, etc.)
- **Low-stock rows** highlighted in amber only when `quantity + in_transit < min_threshold`, avoiding false highlights when a reorder is already in flight
- **Toast notifications** for all user feedback via a React context provider — no browser `alert()` calls
- **Custom dropdown** component to avoid layout shift and focus flicker on open/close
- **Responsive tables** with `table-wrap` overflow container for narrow viewports
- **Inline spinners** for all async operations — no page-level loading flicker

---

## Security

- Passwords hashed with bcrypt (cost factor 10)
- `JWT_SECRET` enforced from environment — hard fail at startup if missing
- All SQL queries use parameterised placeholders — no string interpolation
- All user inputs validated and sanitised with `express-validator` before reaching the database
- Role checks enforced at the middleware level on every protected route
- `.env` is gitignored and never committed to source control

---

## Stopping the stack

```bash
docker compose down        # stop containers, keep database volume
docker compose down -v     # stop containers and delete all data
```
