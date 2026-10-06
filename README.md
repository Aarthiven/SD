# ⚡ SALESTORM

> A high-scale e-commerce flash-sale backend system built for the System Design Hackathon.

---

## Overview

SALESTORM handles the core challenge of flash sales: **many users competing for limited inventory at the same time**. It uses PostgreSQL row-level locking inside atomic transactions to guarantee that inventory can never go negative and no item is ever sold twice.

---

## Architecture

```
Frontend (React + Vite)
        │
        │  REST API
        ▼
Backend (Node.js + Express)
  ├── Routes
  ├── Controllers
  ├── Services
  ├── Repositories  ──▶  PostgreSQL (via Prisma)
  └── Middleware
```

See [`docs/architecture.md`](docs/architecture.md) for the full HLD, ER diagram, and sequence diagrams.  
See [`docs/ADR.md`](docs/ADR.md) for Architecture Decision Records.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS 3, React Router, Axios |
| **Backend** | Node.js, Express.js (CommonJS) |
| **ORM** | Prisma 5 |
| **Database** | PostgreSQL 15+ |
| **Testing** | Jest, Supertest |
| **Config** | dotenv |

---

## How to Run

### Prerequisites
- Node.js 18+
- PostgreSQL running locally (or Docker)

### Start PostgreSQL (Docker)
```bash
docker run --name salestorm-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=salestorm \
  -p 5432:5432 -d postgres
```

### Backend

```bash
cd backend

# 1. Copy and configure environment
cp .env.example .env
# Edit DATABASE_URL if needed

# 2. Install dependencies
npm install

# 3. Run database migration
npx prisma migrate dev --name init

# 4. Seed the database (1 product + 5 users)
npx prisma db seed

# 5. Start the development server
npm run dev
# → http://localhost:5000
```

### Frontend

```bash
cd frontend

npm install
npm run dev
# → http://localhost:5173
```

**First-time setup:** Open the app, click **"Set User ID"** in the navbar, and paste any `id` from the seeded `User` table. Find it with:
```bash
cd backend && npx prisma studio
```

---

## How to Test

```bash
cd backend
npm test
```

### Test Coverage
| Test Suite | Scenario |
|---|---|
| `overselling.test.js` | 200 concurrent requests → ≤ 100 succeed, qty ≥ 0 |
| `idempotency.test.js` | Same idempotency key → only 1 reservation created |
| `payment.test.js` | SUCCESS / FAILED / TIMEOUT / duplicate payment |
| `orderLifecycle.test.js` | Full RESERVED → CONFIRMED and RESERVED → CANCELLED flows |

---

## Full User Flow

```
1. Home page       →  Browse flash sale products
2. Product Detail  →  Select quantity → Reserve
3. Checkout        →  Confirm order → Place Order
4. Payment         →  Click SUCCESS / FAILED / TIMEOUT
5. My Orders       →  View order and payment status
```

---

## How SALESTORM Prevents Overselling

Every reservation goes through a **PostgreSQL transaction with `SELECT FOR UPDATE`**:

```sql
BEGIN;
SELECT * FROM "Inventory" WHERE "productId" = $1 FOR UPDATE;
-- ↑ All other transactions WAIT here until this one commits

-- Check availability (always sees true current value)
-- UPDATE inventory atomically
-- INSERT reservation record
COMMIT;
```

This serialises all concurrent writes to the same inventory row at the **database level**. No application-level locks, no Redis, no queues — just a battle-tested PostgreSQL primitive. The result: if 1000 users try to buy the last item simultaneously, exactly 1 succeeds and 999 receive a `409 Conflict`.
