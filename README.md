# JobScheduler

**Print shop operations platform** — service catalog & instant pricing, MoMo deposits, appointment slots, production scheduling, team chat, and analytics.

Built for a real print business workflow: customers order online with fixed GHS prices, pay an **80% MoMo deposit**, book **system-generated time slots**, and track production until completion.

📄 **[Download System Guide (PDF)](docs/JobScheduler-System-Guide.pdf)** — full visual documentation with diagrams, tech stack, API reference, and price list.

To regenerate the PDF after editing this README: `npm run docs:pdf`

---

## Table of contents

- [System at a glance](#system-at-a-glance)
- [How the business flow works](#how-the-business-flow-works)
- [User roles & portals](#user-roles--portals)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Service catalog & pricing (GHS)](#service-catalog--pricing-ghs)
- [Shop hours & contact](#shop-hours--contact)
- [Database overview](#database-overview)
- [API reference](#api-reference)
- [Project structure](#project-structure)
- [Local development](#local-development)
- [Database migrations](#database-migrations)
- [Deployment (Vercel + Neon)](#deployment-vercel--neon)
- [Environment variables](#environment-variables)
- [Related docs](#related-docs)

---

## System at a glance

```mermaid
flowchart LR
  subgraph clients [Web clients]
    A[Admin dashboard]
    W[Worker portal]
    C[Customer portal]
  end

  subgraph vercel [Vercel]
    SPA[React SPA /static]
    API[Express API /api]
  end

  subgraph data [Data & realtime]
    DB[(Neon PostgreSQL)]
    WS[Socket.IO local only]
  end

  A --> SPA
  W --> SPA
  C --> SPA
  SPA --> API
  SPA -. optional .-> WS
  API --> DB
  WS --> DB
```

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | React 19, React Router 7, CRA | Three role-based portals |
| **Backend** | Node.js, Express 5 | REST API + JWT auth |
| **Database** | PostgreSQL (Neon) | Jobs, services, users, chat, alerts |
| **Hosting** | Vercel | Static SPA + serverless API |
| **Realtime** | Socket.IO | Live chat (long-lived Node host only) |

---

## How the business flow works

Every customer order follows the same rules:

```mermaid
flowchart TD
  S1[1. Select service & size] --> S2[2. See unit price & total]
  S2 --> S3{Quote required?}
  S3 -->|No| S4[3. Pay 80% MoMo deposit]
  S3 -->|Yes| S6[3. Book appointment slot]
  S4 --> S5[Enter MoMo ref + amount]
  S5 --> S6
  S6 --> S7[4. Review & submit order]
  S7 --> S8[Admin verifies MoMo]
  S8 --> S9[Production: Ready → In Progress → Completed]
```

### Customer rules (enforced in code)

| Rule | Implementation |
|------|----------------|
| **Instant pricing** | Prices loaded from `shop_services` DB table; total = unit × quantity (or tiered yards) |
| **80% deposit** | `deposit_required = total × 0.8`; validated on client and server |
| **MoMo before slot** | Wizard order: Service → **Deposit** → Slot → Submit |
| **Slots only** | No manual date picker; `/api/schedule/available-slots` |
| **5 PM cutoff** | Last bookable slot ends at **17:00** (same-day rule) |
| **Break excluded** | No slots **12:30 – 13:00** daily |
| **Work after deposit** | Jobs cannot go **Ready** or enter auto-scheduler until deposit is **Received** |
| **Quote services** | Digital Flag & Signage: admin sets price → customer pays deposit |

### MoMo payment flow

```mermaid
sequenceDiagram
  participant C as Customer
  participant API as Express API
  participant A as Admin

  C->>API: Submit order + MoMo ref/amount/phone
  API->>API: deposit_verification_status = pending
  A->>API: Confirm or reject deposit
  alt Confirmed
    API->>API: deposit_status = Received
    Note over API: Job can be scheduled / marked Ready
  else Rejected
    API->>C: Customer resubmits payment
  end
```

---

## User roles & portals

```mermaid
flowchart TB
  subgraph admin [Admin /dashboard]
    AD[Dashboard & analytics]
    AJ[Jobs CRUD & payments]
    AM[Machines & schedule]
    AS[Services & price list]
    AT[Team & feedback]
    AC[Live chat]
  end

  subgraph worker [Worker /worker]
    WD[Assigned jobs]
    WS2[Schedule view]
    WA[Activity & alerts]
  end

  subgraph customer [Customer /portal]
    CP[Dashboard & price list]
    CO[Order service wizard]
    CJ[Job timeline & MoMo]
    CF[Feedback & chat]
  end
```

| Role | Login | Main capabilities |
|------|-------|-------------------|
| **Admin** | `/login` → `/dashboard` | Full shop control: jobs, machines, schedule, services/prices, MoMo verification, analytics, team |
| **Worker** | `/login` → `/worker` | Assigned jobs, status updates, schedule, alerts, chat |
| **Customer** | `/register` or `/login` → `/portal` | Order services, pay MoMo deposit, book slots, track jobs, message shop |

### Admin routes

| Path | Feature |
|------|---------|
| `/dashboard` | KPIs, job overview |
| `/jobs` | Job list, search, status |
| `/jobs/new`, `/jobs/edit/:id` | Manual job entry (back office) |
| `/machines` | Equipment & substrate compatibility |
| `/schedule` | Timeline + drag-and-drop + auto-schedule |
| `/services` | **Upload/edit service catalog & GHS prices** |
| `/analytics` | Revenue, utilization, on-time rate |
| `/alerts` | Risk, late, rush, underutilization |
| `/team` | Customers & workers |
| `/feedback` | Customer message threads |
| `/chat` | Live team messaging |
| `/activity` | Shop-floor activity feed |

### Customer routes

| Path | Feature |
|------|---------|
| `/portal` | Dashboard, how-it-works, full price list |
| `/portal/jobs/new` | **Order wizard** (service → deposit → slot) |
| `/portal/jobs/:id` | Job detail, MoMo status, timeline |
| `/portal/feedback` | Feedback to shop |
| `/portal/chat` | Live chat |

---

## Tech stack

### Frontend

| Package | Version | Use |
|---------|---------|-----|
| React | 19.x | UI framework |
| React Router | 7.x | Role-based routing |
| Axios | 1.x | HTTP client + JWT interceptors |
| date-fns | 4.x | Dates & formatting |
| Framer Motion | 12.x | Page transitions |
| AOS | 2.x | Scroll animations |
| @dnd-kit | 6.x | Schedule drag-and-drop |
| Socket.IO client | 4.x | Live chat |
| React Icons | 5.x | Icon set |
| Create React App | 5.x | Build toolchain |

### Backend

| Package | Version | Use |
|---------|---------|-----|
| Express | 5.x | HTTP API |
| pg | 8.x | PostgreSQL pool |
| bcryptjs | 3.x | Password hashing |
| jsonwebtoken | 9.x | JWT sessions (7-day) |
| Socket.IO | 4.x | Chat WebSocket |
| dotenv | 17.x | Environment config |

### Infrastructure

| Service | Role |
|---------|------|
| **Vercel** | Hosts React build + `/api` serverless functions |
| **Neon** | Serverless PostgreSQL with SSL |
| **GitHub** | Source control & Vercel deploy trigger |

---

## Architecture

```mermaid
flowchart TB
  subgraph browser [Browser]
    RC[React components]
    CTX[Auth / Theme / Chat contexts]
    API_CLIENT[services/api.js]
  end

  subgraph serverless [server/ + api/index.js]
    MW[JWT middleware]
    R_JOBS[routes/jobs]
    R_SVC[routes/services]
    R_SCH[routes/schedule]
    R_AUTH[routes/auth]
    STORE[utils/serviceStore]
    SLOTS[utils/appointmentSlots]
    SCHED[utils/scheduler]
  end

  RC --> CTX --> API_CLIENT
  API_CLIENT -->|REST /api/*| MW
  MW --> R_JOBS & R_SVC & R_SCH & R_AUTH
  R_SVC --> STORE
  R_JOBS --> STORE & SLOTS
  R_SCH --> SLOTS & SCHED
  STORE & R_JOBS --> DB[(PostgreSQL)]
```

### Smart scheduling (production)

Auto-scheduler (`server/utils/scheduler.js`):

1. Pick jobs with **deposit received**, no machine assigned  
2. Sort by **priority** (Rush first) then **due date**  
3. **Group by substrate + finishing** to reduce changeovers  
4. Assign first **compatible machine**; slot after last job on that machine  
5. Estimate duration from product type + quantity  

Manual overrides via `/schedule` drag-and-drop or `PUT /api/schedule/:jobId`.

### Authentication

- JWT in `localStorage` (`jobscheduler_token`)
- Roles: `admin`, `worker`, `customer`
- Production fallback: JWT secret derived from `DATABASE_URL` if `JWT_SECRET` unset (set `JWT_SECRET` in prod for best practice)
- Bootstrap admin via `INITIAL_ADMIN_EMAIL` / `INITIAL_ADMIN_PASSWORD` when no admin exists

---

## Service catalog & pricing (GHS)

Prices live in the **`shop_services`** database table (seeded on first catalog load). Admins edit them at **`/services`**.

### Fixed-size services

| Service | Options & prices (GHS) |
|---------|------------------------|
| **DTF Printing** | A4 ₵5 · A3 ₵10 · A2 ₵20 |
| **Banner Printing** | 3×4 ₵180 · 4×4 ₵200 · 5×4 ₵230 · 6×4 ₵250 · 8×4 ₵300 · 8×8 ₵350 |
| **Sticker Printing** | A4 ₵5 · A3 ₵10 · A2 ₵15 · 4out ₵20 |
| **Wooden Frame** | 12×16 ₵160 · 15×19 ₵200 · 19×23 ₵300 · 20×30 ₵450 · 24×36 ₵600 |
| **T-Shirt Printing** | Jersey ₵50 · Silk ₵55 · Cotton ₵60 · Lacoste ₵70 |

### Per square foot

| Service | Price |
|---------|-------|
| Sticker | ₵3.0 / sq ft |
| Banner | ₵3.5 / sq ft |
| One-way vision | ₵6.0 / sq ft |
| Reflective sticker | ₵8.0 / sq ft |

### Tiered

| Service | Tiers |
|---------|-------|
| **Material — Cloth Printing** | 1–49 yards ₵45/yd · 50–99 ₵43/yd · 100+ ₵40/yd |

### Quote on request

| Service | Notes |
|---------|-------|
| Digital Flag Printing | Available now — admin sets quote |
| Signage / 3D Signboard | Price depends on size and letters |

**Deposit rule:** all priced orders require **80% of total** via MoMo before production starts.

---

## Shop hours & contact

| | |
|---|---|
| **Mon – Thu** | 7:30 AM – 6:00 PM |
| **Friday** | 7:30 AM – 7:00 PM |
| **Saturday** | 10:00 AM – 6:00 PM |
| **Sunday** | Closed |
| **Break** | Daily 12:30 PM – 1:00 PM |
| **Same-day cutoff** | Send work by **5:00 PM** latest |

| Contact | |
|---------|---|
| **Call** | 0542917636 / 0207924080 |
| **WhatsApp** | 0542917636 |
| **MoMo** | 05429176360 — Tetteh Henry |

---

## Database overview

Schema is applied via `server/apply-schema.js` (no separate SQL migration files).

```mermaid
erDiagram
  users ||--o{ jobs : "owns (customer)"
  users ||--o{ jobs : "assigned_worker"
  shop_services ||--o{ jobs : "service_id"
  machines ||--o{ jobs : "machine_id"
  jobs ||--o{ job_updates : "activity"
  jobs ||--o{ alerts : "alerts"
  users ||--o{ feedback : "feedback"
  chat_threads ||--o{ chat_messages : "messages"

  users {
    int id PK
    string email
    string role
    string name
  }

  shop_services {
    string id PK
    string name
    string pricing_type
    jsonb config
    boolean active
  }

  jobs {
    int id PK
    string po_number
    string service_id
    decimal total_cost
    decimal deposit_required
    string deposit_verification_status
    date due_date
    time due_time
    string status
  }

  machines {
    int id PK
    string name
    string type
    text[] compatibility
  }
```

### Key `jobs` payment fields

| Column | Description |
|--------|-------------|
| `total_cost` | Order total (GHS) |
| `deposit_required` | 80% of total |
| `deposit_received` | Confirmed amount |
| `deposit_status` | `Pending` / `Received` |
| `deposit_momo_phone` | Customer MoMo number |
| `deposit_momo_reference` | Transaction ID |
| `deposit_submitted_amount` | Amount customer paid |
| `deposit_verification_status` | `none` / `pending` / `confirmed` / `rejected` |

---

## API reference

Base URL: `{host}/api` — all protected routes need `Authorization: Bearer <token>`.

### Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Customer registration |
| POST | `/auth/login` | Login (all roles) |
| GET | `/auth/me` | Current user profile |

### Services & catalog

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/services/catalog` | Public | Active services, price list, hours, contact |
| POST | `/services/calculate` | Public | Price calculation |
| GET | `/services/manage` | Admin | All services |
| POST | `/services/manage` | Admin | Create service |
| PUT | `/services/manage/:id` | Admin | Update service |
| DELETE | `/services/manage/:id` | Admin | Deactivate service |

### Jobs

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/jobs` | All | List jobs (scoped by role) |
| POST | `/jobs` | Customer/Admin | Create job (customer = catalog flow) |
| GET | `/jobs/:id` | All | Job detail |
| PUT | `/jobs/:id` | Admin | Update job |
| PATCH | `/jobs/:id/status` | Admin/Worker | Status change |
| PATCH | `/jobs/:id/submit-deposit` | Customer | Submit MoMo payment |
| PATCH | `/jobs/:id/verify-deposit` | Admin | Confirm/reject MoMo |
| PATCH | `/jobs/:id/quote` | Admin | Set quote pricing |
| PATCH | `/jobs/:id/payment` | Admin | Record deposit/final payment |

### Schedule

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/schedule/available-slots` | All | Bookable appointment slots |
| GET | `/schedule` | Admin/Worker | Production schedule |
| POST | `/schedule/auto-schedule` | Admin | Run auto-scheduler |
| PUT | `/schedule/:jobId` | Admin | Manual schedule update |

### Other

| Prefix | Features |
|--------|----------|
| `/machines` | Equipment CRUD |
| `/analytics` | Admin reports |
| `/alerts` | Notifications |
| `/users` | Team management |
| `/feedback` | Customer feedback |
| `/activity` | Job activity feed |
| `/chat` | Messaging threads |
| GET `/health` | API health check |

---

## Project structure

```
jobscheduling-1/
├── api/
│   └── index.js                 # Vercel serverless entry → server/index.js
├── public/                      # Static assets, logo, manifest
├── src/
│   ├── components/
│   │   ├── ServiceOrderForm.js  # Customer order wizard
│   │   ├── DepositPaymentForm.js
│   │   ├── ShopInfoPanel.js
│   │   ├── JobPayment.js        # Admin MoMo verify + quotes
│   │   └── Layout/              # Navbar, Sidebar
│   ├── context/                 # Auth, Theme, ChatSocket
│   ├── hooks/
│   │   └── useServiceCatalog.js
│   ├── layouts/                 # Admin, Worker, Customer shells
│   ├── pages/
│   │   ├── customer/            # Customer portal pages
│   │   ├── worker/              # Worker portal pages
│   │   └── ServiceManagement.js # Admin price list editor
│   ├── services/api.js          # Axios + API modules
│   └── utils/
│       ├── shopConfig.js        # Hours, contact, 80% deposit
│       └── servicePricing.js    # Client-side price math
├── server/
│   ├── config/database.js       # Pool + schema init
│   ├── routes/                  # Express route modules
│   ├── utils/
│   │   ├── serviceStore.js      # DB-backed catalog
│   │   ├── appointmentSlots.js  # Slot generation (5 PM cutoff)
│   │   ├── scheduler.js         # Auto-scheduler
│   │   └── catalogData.js       # Default seed prices
│   ├── apply-schema.js          # Run migrations
│   └── index.js                 # Express app
├── vercel.json                  # Vercel builds & routes
└── package.json
```

---

## Local development

### Prerequisites

- Node.js 18+ (20+ recommended)
- PostgreSQL (Neon connection string or local)
- npm

### Install & run

```bash
# Clone
git clone https://github.com/bvggies/jobscheduling.git
cd jobscheduling

# Frontend
npm install

# Backend
cd server && npm install && cd ..

# Environment — root .env
echo 'REACT_APP_API_URL=http://localhost:5000/api' > .env

# Environment — server/.env
cat > server/.env << 'EOF'
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
PORT=5000
NODE_ENV=development
JWT_SECRET=dev-secret-change-me
INITIAL_ADMIN_EMAIL=admin@yourshop.local
INITIAL_ADMIN_PASSWORD=YourSecurePass123
EOF

# Apply schema
cd server && node apply-schema.js && cd ..

# Terminal 1 — API
npm run server

# Terminal 2 — React
npm start
```

Open **http://localhost:3000**

| Script | Command | Description |
|--------|---------|-------------|
| Frontend dev | `npm start` | CRA dev server :3000 |
| Backend | `npm run server` | Express + Socket.IO :5000 |
| Backend watch | `npm run server:dev` | Nodemon |
| Production build | `npm run build` | Output to `build/` |
| Schema | `cd server && node apply-schema.js` | Apply DB schema |

---

## Database migrations

There are no versioned SQL migration files. Schema is managed in `server/config/database.js` and applied with:

```bash
cd server
DATABASE_URL="your-neon-connection-string" node apply-schema.js
```

This creates tables, indexes, default machines, and bootstraps an admin user if none exists.

---

## Deployment (Vercel + Neon)

```mermaid
flowchart LR
  GH[GitHub push] --> VC[Vercel build]
  VC --> STATIC[Static React /build]
  VC --> FN[Serverless /api/index.js]
  FN --> NEON[(Neon PostgreSQL)]
  STATIC --> USERS[Users browser]
  USERS --> STATIC
  USERS --> FN
```

1. Create a [Neon](https://neon.tech) project and copy the connection string  
2. Import repo in [Vercel](https://vercel.com)  
3. Set environment variables (see below)  
4. Deploy — run `apply-schema.js` against Neon once  
5. Set `REACT_APP_API_URL=https://your-app.vercel.app/api` and redeploy  

See also: [DEPLOYMENT.md](DEPLOYMENT.md) · [VERCEL_DEPLOY.md](VERCEL_DEPLOY.md) · [SETUP_ENV.md](SETUP_ENV.md)

### Socket.IO on Vercel

Vercel serverless **cannot host WebSockets**. Live chat uses HTTP on Vercel by default. For realtime chat, set `REACT_APP_WS_ORIGIN` to a long-lived Node host running `server/index.js`.

---

## Environment variables

### Vercel / production

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon PostgreSQL connection string |
| `NODE_ENV` | Yes | `production` |
| `JWT_SECRET` | Recommended | Signing key for JWT |
| `REACT_APP_API_URL` | Yes | e.g. `https://your-app.vercel.app/api` |
| `INITIAL_ADMIN_EMAIL` | Optional | First admin bootstrap email |
| `INITIAL_ADMIN_PASSWORD` | Optional | First admin bootstrap password |
| `REACT_APP_WS_ORIGIN` | Optional | Socket.IO host for live chat |
| `REACT_APP_CHAT_SOCKET` | Optional | `true` / `false` to force chat socket |

### Local (`server/.env`)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Postgres connection |
| `PORT` | API port (default 5000) |
| `JWT_SECRET` | JWT signing secret |

### Local (root `.env`)

| Variable | Description |
|----------|-------------|
| `REACT_APP_API_URL` | `http://localhost:5000/api` |

---

## Related docs

| Document | Contents |
|----------|----------|
| **[JobScheduler-System-Guide.pdf](docs/JobScheduler-System-Guide.pdf)** | **Full visual PDF** — diagrams, tech stack, flows, API, pricing |
| [QUICKSTART.md](QUICKSTART.md) | Fast setup guide |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Full deploy walkthrough |
| [VERCEL_DEPLOY.md](VERCEL_DEPLOY.md) | Vercel-specific notes |
| [SETUP_ENV.md](SETUP_ENV.md) | Environment configuration |
| [TROUBLESHOOTING.md](TROUBLESHOOTING.md) | Common issues |
| [START_SERVER.md](START_SERVER.md) | Running the API locally |

---

## License

MIT License

## Support

Open an issue on [GitHub](https://github.com/bvggies/jobscheduling/issues).
