# Moneflow - Money Movement Application

A small but engineering-focused money movement application built with Node.js, Express, React, PostgreSQL, and Prisma.

## Tech Stack

- **Backend**: Node.js + Express + Prisma + PostgreSQL
- **Frontend**: React + Vite + Tailwind CSS
- **Auth**: JWT + bcrypt
- **Testing**: Jest + Supertest

## Project Structure

```
moneflow/
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

```bash
# Install all dependencies
npm install

# Set up environment variables
cp backend/.env.example backend/.env
# Edit backend/.env with your DATABASE_URL and JWT_SECRET

# Validate schema, generate Prisma client and run migrations
npm run db:validate
npm run db:generate
npm run db:migrate

# Seed the database with demo users + sample data
npm run db:seed

# (or the single-step fresh demo setup: reset + migrations + seed)
npm run db:reset

# Start development servers
npm run dev
```

### Available Scripts

```bash
# Development
npm run dev              # Start both frontend and backend
npm run dev:backend      # Start backend only
npm run dev:frontend     # Start frontend only

# Database
npm run db:validate      # Validate prisma/schema.prisma
npm run db:generate      # Generate Prisma client
npm run db:migrate       # Create & apply a migration (dev)
npm run db:deploy        # Apply migrations in production / CI
npm run db:status        # Show migration status
npm run db:seed          # Seed demo users + sample data
npm run db:reset         # Reset database, re-migrate and re-seed (dev)
npm run db:reset:no-seed # Reset database only
npm run db:push          # Push schema changes (no migration history)
npm run db:studio        # Open Prisma Studio

# Testing
npm run test             # Run backend tests
npm run test:watch       # Run tests in watch mode

# Linting
npm run lint             # Lint all packages
```

### Database & Seed

The database is PostgreSQL managed by Prisma. Full documentation (schema,
constraints, commands, seed behaviour) lives in
[`docs/database.md`](docs/database.md).

```bash
# Migration commands
npm run db:migrate                 # create + apply a new migration (dev)
npm run db:deploy                  # apply migrations (prod/CI)

# Reset commands (development)
npm run db:reset                   # drop everything, re-migrate, re-seed
npm run db:reset:no-seed           # drop everything, re-migrate (empty DB)

# Seed commands
npm run db:seed                    # seed an empty, migrated database
```

**Demo accounts** (all have BDT 100,000 credited at signup / seed):

| Email                 | Password       |
| --------------------- | -------------- |
| ayesha@moneflow.dev   | `DemoPass123!` |
| rafi@moneflow.dev     | `DemoPass123!` |
| nusrat@moneflow.dev   | `DemoPass123!` |
| tanvir@moneflow.dev   | `DemoPass123!` |
| farhan@moneflow.dev   | `DemoPass123!` |
| sadia@moneflow.dev    | `DemoPass123!` |

**Balance integrity rules**

- Balances are stored **only** in PostgreSQL (`Account.balance`,
  `DECIMAL(18,2)`) and are the single source of truth — the frontend never
  fakes or computes them.
- Passwords are stored only as bcrypt hashes (12 rounds); plaintext never
  reaches the database.
- Every balance change is an explicit database operation inside a transaction
  (row-locked debits/credits), and every movement writes an immutable
  `Transaction` audit row with `senderBalanceAfter` / `receiverBalanceAfter`
  snapshots.
- Key DB constraints: unique email/phone, one account per user, idempotency
  keys unique per sender/requester, `ON DELETE RESTRICT` foreign keys, and
  PostgreSQL `ENUM` types for all status/type columns.

## API Endpoints

### Authentication

Full API documentation and curl examples: [`docs/auth.md`](docs/auth.md)

- `POST /api/auth/register` - Register new user (validates + normalizes email, bcrypt-hashes password, atomically creates user + account with BDT 100,000)
- `POST /api/auth/login` - Login, returns JWT (identity claims only)
- `GET /api/auth/me` - Get current user profile + balance (requires `Authorization: Bearer <token>`)

Security: passwords are stored only as bcrypt hashes; user identity always
comes from the verified JWT, never from the request body; duplicate emails
are rejected; errors never leak implementation details.

### Transfers
- `POST /api/transfers/send` - Send money to another user
- `GET /api/transfers/balance` - Get current balance
- `GET /api/transfers/users/search?q=<query>` - Search users

### Requests
- `POST /api/requests` - Create money request
- `GET /api/requests` - List own requests
- `GET /api/requests/pending` - List pending requests for current user
- `POST /api/requests/:id/approve` - Approve a request
- `POST /api/requests/:id/reject` - Reject a request
- `POST /api/requests/:id/cancel` - Cancel own request

### Transactions
- `GET /api/transactions` - List transactions (with filtering)
- `GET /api/transactions/:id` - Get transaction details

## Key Features

- **Atomic money transfers** using PostgreSQL transactions
- **Concurrent-safe balance updates** with row-level locking
- **Idempotency** for all money movement APIs
- **Immutable transaction records** for audit trail
- **Secure authentication** with JWT and bcrypt
- **Consistent error responses** across all endpoints

## Engineering Principles

- No TypeScript (pure JavaScript)
- No external financial integrations
- All money is simulated (BDT)
- New users get BDT 100,000 automatically
- Backend is the source of truth for balances
- Money stored as `DECIMAL(18,2)` BDT in PostgreSQL to avoid floating-point errors