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

# Generate Prisma client and run migrations
npm run db:generate
npm run db:migrate

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
npm run db:generate      # Generate Prisma client
npm run db:migrate       # Run migrations
npm run db:push          # Push schema changes
npm run db:studio        # Open Prisma Studio

# Testing
npm run test             # Run backend tests
npm run test:watch       # Run tests in watch mode

# Linting
npm run lint             # Lint all packages
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user (auto-credits BDT 100,000)
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user profile

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
- Money stored as integers (poisha) to avoid floating-point errors