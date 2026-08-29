# Moneflow - Money Movement Application

A small but engineering-focused money movement application built with Node.js, Express, React, PostgreSQL, and Prisma. Built for the PSTU National Hackathon 2026.

## Tech Stack

- **Backend**: Node.js + Express + Prisma + PostgreSQL
- **Frontend**: React + Vite + Tailwind CSS
- **Auth**: JWT + bcrypt

## Project Structure

```
Moneyflow-Pust-hackathon/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma
│   └── src/
│       ├── config/
│       ├── controllers/
│       ├── middlewares/
│       ├── repositories/
│       ├── routes/
│       ├── services/
│       ├── validators/
│       ├── utils/
│       ├── errors/
│       ├── app.js
│       └── server.js
└── frontend/
    └── src/
        ├── components/
        ├── context/
        ├── hooks/
        ├── pages/
        ├── routes/
        ├── services/
        ├── utils/
        ├── App.jsx
        └── main.jsx
```

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 14+
- npm

### Installation

Backend and frontend are separate npm projects — install and run each independently.

```bash
# 1. Create the database
sudo -u postgres psql
# inside psql:
#   CREATE DATABASE moneyflow;
#   \q

# 2. Backend setup
cd backend
cp .env.example .env
# edit .env: set DATABASE_URL, JWT_SECRET (32+ chars), DEFAULT_USER_BALANCE=100000
npm install
npm run db:generate
npm run db:migrate
npm run dev
# backend runs on http://localhost:3000

# 3. Frontend setup (separate terminal)
cd frontend
npm install
npm run dev
# frontend runs on http://localhost:5173 (or next free port)
```

### Available Scripts (run from inside `backend/` or `frontend/`)

```bash
# Backend
npm run dev              # Start backend with auto-reload
npm run db:generate      # Generate Prisma client
npm run db:migrate       # Run migrations
npm run db:studio        # Open Prisma Studio

# Frontend
npm run dev               # Start Vite dev server
npm run build              # Production build
```

## API Endpoints

### Authentication
- `POST /api/auth/register` — Register new user (auto-credits BDT 100,000)
- `POST /api/auth/login` — Login
- `GET /api/auth/me` — Get current user profile

### Transfers
- `POST /api/transfers/send` — Send money to another user
- `GET /api/transfers/balance` — Get current balance

### Users
- `GET /api/users/search?q=<query>` — Search users by name, email, or phone

### Requests
- `POST /api/requests` — Create money request
- `GET /api/requests` — List own requests
- `GET /api/requests/pending` — List pending requests for current user
- `POST /api/requests/:id/approve` — Approve a request (triggers the same transfer engine used by Send Money)
- `POST /api/requests/:id/reject` — Reject a request
- `POST /api/requests/:id/cancel` — Cancel own request

### Transactions
- `GET /api/transactions?type=incoming|outgoing` — List transactions, filterable by direction
- `GET /api/transactions/:id` — Get a single transaction's details

## Key Features

- **Atomic money transfers** — every transfer runs inside a single PostgreSQL transaction via Prisma's `$transaction`. If any step fails, the whole operation rolls back with no partial state.
- **Concurrency-safe balances** — before reading a balance for a transfer, both the sender's and receiver's account rows are locked with `SELECT ... FOR UPDATE`. This means a second concurrent transfer from the same account has to wait for the first to fully commit, and reads the *post-transfer* balance rather than a stale one — preventing double-spending.
- **Deterministic lock ordering** — accounts are always locked in a fixed order to prevent deadlocks between two transfers that touch the same pair of accounts in opposite directions.
- **Money request approval reuses the transfer engine** — `approveRequest` calls the same core transfer logic as a direct send, rather than duplicating debit/credit code.
- **Immutable transaction records** — every completed transfer creates one permanent `Transaction` row recording both parties' names and balances at the time, serving as the audit trail.
- **Backend is the sole source of truth for balances** — the frontend never sends or trusts a client-provided balance; every balance shown is fetched fresh from the API.
- **Money stored as `Decimal` in whole Taka** (not floating point), avoiding rounding errors in financial calculations.

## Concurrency — Proof

Tested by firing two simultaneous transfer requests from the same account (each for more than half the balance):

```
Transfer A (৳70,000): SUCCESS — newBalance: 30000
Transfer B (৳70,000): REJECTED — INSUFFICIENT_FUNDS, available: 30000
```

Note that the rejected request's error reports the balance *after* the first transfer had already committed (30,000, not the original 100,000) — proof that the row lock forced the second request to wait and read the true, up-to-date balance rather than racing against a stale read. Final balance was verified as exactly ৳30,000 — correct, and never negative.

## Known Limitations / Future Improvements

- Idempotency-key enforcement (preventing duplicate submissions from network retries) is not currently backed by persistent storage; the frontend disables the submit button during requests as a lighter-weight mitigation for the hackathon timeframe. A dedicated idempotency table would be the next addition.
- No notification system for incoming requests/transfers beyond the in-app Requests list.
- No pagination cursor beyond simple limit/offset.