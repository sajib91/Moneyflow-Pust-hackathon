# Database — PostgreSQL + Prisma

This document describes the PostgreSQL database schema, the Prisma workflow
commands, the seed behaviour, and every constraint enforced by the database.

> **Golden rule:** the account `balance` column in PostgreSQL is the **only**
> source of truth for how much money a user has. The frontend never computes
> or fakes balances — every balance is read from the `Account` table.

---

## 1. Prisma workflow commands

All commands run from the repository root (`npm run <script>`) or from
`backend/` (`npx prisma <command>`).

| Goal                          | Root command                    | Backend command                          |
| ----------------------------- | ------------------------------- | ---------------------------------------- |
| Validate the schema           | `npm run db:validate`           | `npx prisma validate`                    |
| Generate the Prisma Client    | `npm run db:generate`           | `npx prisma generate`                    |
| Create & apply a new migration| `npm run db:migrate`            | `npx prisma migrate dev --name <name>`   |
| Apply migrations (prod/CI)    | `npm run db:deploy`             | `npx prisma migrate deploy`              |
| Show migration status         | `npm run db:status`             | `npx prisma migrate status`              |
| Seed the database             | `npm run db:seed`               | `npx prisma db seed`                     |
| Reset the database + seed     | `npm run db:reset`              | `npx prisma migrate reset --force`       |
| Reset the database, no seed   | `npm run db:reset:no-seed`      | `npx prisma migrate reset --force --skip-seed` |
| Open Prisma Studio (GUI)      | `npm run db:studio`             | `npx prisma studio`                      |

### Database migration commands (step by step)

```bash
# 1. Configure the connection string
cp backend/.env.example backend/.env
#    edit backend/.env → DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/moneflow?schema=public"

# 2. Make sure the schema is valid and the client is generated
npm run db:validate
npm run db:generate

# 3. Create and apply a new migration (development)
#    Prisma diffs schema.prisma against the database, writes
#    backend/prisma/migrations/<timestamp>_<name>/migration.sql, applies it,
#    and regenerates the client.
cd backend
npx prisma migrate dev --name add_fee_column

# 4. Apply migrations in production / CI (never `migrate dev` there)
npm run db:deploy
```

### Database reset commands (development only)

```bash
# Full reset: drops ALL data, re-applies every migration from scratch,
# regenerates the client and runs the seed script automatically.
npm run db:reset

# Reset WITHOUT seeding (empty, migrated database)
npm run db:reset:no-seed

# If you only want to wipe seeded/demo data while keeping the schema:
npx prisma db execute --stdin <<'SQL'
TRUNCATE "Transaction", "MoneyRequest", "Account", "User" RESTART IDENTITY CASCADE;
SQL
```

> `prisma migrate reset` is destructive — never run it against a database you
> care about.

### Seed commands

```bash
# Seed a migrated (empty) database with demo users + sample data
npm run db:seed

# Equivalent single-step for a fresh demo environment
npm run db:reset
```

The seed command is registered in `backend/package.json`:

```json
"prisma": { "seed": "node prisma/seed.js" }
```

---

## 2. Schema overview

Four models, three enums (see `backend/prisma/schema.prisma`):

```
User ──1:1── Account ──1:N── Transaction ──N:1── MoneyRequest ──N:1── User
                                  │
                                  └── 1:N ── (each Transaction belongs to
                                       exactly one sender + one receiver Account)
```

- **User** — profile + bcrypt password hash.
- **Account** — exactly one per user; holds the `balance` (BDT, `DECIMAL(18,2)`).
- **Transaction** — append-only ledger row for every money movement
  (`TRANSFER` or `REQUEST_SETTLEMENT`), with immutable audit snapshots.
- **MoneyRequest** — "please pay me" request between two users with a
  lifecycle (`PENDING → APPROVED / REJECTED / CANCELLED`).

Enums: `TransactionType`, `TransactionStatus`, `RequestStatus`.

---

## 3. Seed behaviour

`backend/prisma/seed.js` creates:

- **6 demo users** — see credentials below.
- **BDT 100,000 welcome balance for every user**, applied by an explicit
  `account.create(...)` database operation (the same rule the registration
  service uses), **never** by faking values in the frontend.
- **10 transfers** between users (`TRANSFER`, `SUCCEEDED`), spread over the
  last ~5 weeks so the dashboard timeline looks alive.
- **6 money requests** in mixed states: 2 `PENDING`, 2 `APPROVED`,
  1 `REJECTED`, 1 `CANCELLED`.
- **2 settlement transactions** (`REQUEST_SETTLEMENT`) that move money for
  the two `APPROVED` requests.

Every transaction stores `senderBalanceAfter` / `receiverBalanceAfter`
snapshots, so each account balance can be audited against its history.

### Security rules the seed enforces

- Passwords are stored **only as bcrypt hashes** (12 salt rounds). Plaintext
  never reaches the database.
- Every balance change is an explicit `account.update` / `account.create`
  database operation inside a transaction — balances are never hard-coded in
  the frontend or computed there.
- The seed is **idempotent**: re-running it on an already-seeded database
  leaves existing users, balances and transactions untouched.

### Demo credentials

| Name              | Email                 | Phone          | Password       |
| ----------------- | --------------------- | -------------- | -------------- |
| Ayesha Rahman     | ayesha@moneflow.dev   | +8801711000001 | `DemoPass123!` |
| Rafiul Islam      | rafi@moneflow.dev     | +8801711000002 | `DemoPass123!` |
| Nusrat Jahan      | nusrat@moneflow.dev   | +8801711000003 | `DemoPass123!` |
| Tanvir Ahmed      | tanvir@moneflow.dev   | +8801711000004 | `DemoPass123!` |
| Farhan Chowdhury  | farhan@moneflow.dev   | +8801711000005 | `DemoPass123!` |
| Sadia Karim       | sadia@moneflow.dev    | +8801711000006 | `DemoPass123!` |

After a fresh seed, the balances stored in PostgreSQL are:

| User              | Balance (BDT) |
| ----------------- | ------------- |
| Ayesha Rahman     | 96,650.50     |
| Rafiul Islam      | 97,750.00     |
| Nusrat Jahan      | 104,499.50    |
| Tanvir Ahmed      | 102,000.00    |
| Farhan Chowdhury  | 87,800.00     |
| Sadia Karim       | 111,300.00    |

---

## 4. Resulting database constraints

### Primary keys
- `User.id`, `Account.id`, `Transaction.id`, `MoneyRequest.id` — `TEXT` UUID
  (generated by the app via `@default(uuid())`).

### Unique constraints
| Constraint | Effect |
| --- | --- |
| `User_email_key` | No two users may share an email. |
| `User_phone_key` | No two users may share a phone number (nullable — multiple `NULL`s allowed). |
| `Account_userId_key` | One-to-one: a user can have **exactly one** account (the `Account.userId` foreign key is also unique). |
| `Transaction_senderAccountId_idempotencyKey_key` | **Idempotency:** one `idempotencyKey` per sender account. Replaying a request returns the same transaction instead of double-moving money. |
| `MoneyRequest_requesterId_idempotencyKey_key` | **Idempotency:** one `idempotencyKey` per requester. |

### Foreign keys (all `ON DELETE RESTRICT` — auditable records are protected)
| Constraint | Rule |
| --- | --- |
| `Account_userId_fkey` | Every account belongs to a real user; you cannot delete a user who still has an account. |
| `Transaction_senderAccountId_fkey` | Every transaction has a real sender account (immutable history). |
| `Transaction_receiverAccountId_fkey` | Every transaction has a real receiver account. |
| `Transaction_moneyRequestId_fkey` | Optional link to the money request a settlement pays off. |
| `MoneyRequest_requesterId_fkey` | The requester (who receives) is a real user. |
| `MoneyRequest_requestedFromId_fkey` | The requested-from user (who pays) is a real user. |

> `RESTRICT` means you cannot delete a user/account/request that is still
> referenced by a transaction — this is what keeps the money-movement audit
> trail append-only.

### Check-like guarantees (data types)
- `Account.balance` / `Transaction.amount` / `MoneyRequest.amount` are
  `DECIMAL(18,2)` — up to 18 digits, exactly 2 decimal places (BDT poisha).
  No floating-point rounding.
- `Transaction.amount` and `MoneyRequest.amount` are defined as "always
  positive" in the schema; sign is enforced by application code
  (`utils/money.js` validates positive values) — the DB column has no CHECK
  constraint, so the service layer must never insert negatives.
- Enumerated columns (`type`, `status`) are real PostgreSQL `ENUM` types —
  invalid values are rejected at the database level.

### Indexes (query performance)
- `User_name_idx` — user search by name.
- `Transaction_senderAccountId_createdAt_idx`, `Transaction_receiverAccountId_createdAt_idx` — "my history, newest first".
- `Transaction_status_idx` — status filters.
- `Transaction_moneyRequestId_idx` — settlement lookups.
- `MoneyRequest_requestedFromId_status_createdAt_idx` — the hot read "pending requests for me".
- `MoneyRequest_requesterId_createdAt_idx` — "my sent requests".

---

## 5. Balance integrity rules (how money stays correct)

1. **Balance comes from PostgreSQL only.** The frontend renders whatever the
   API returns; it never stores or fabricates a balance.
2. **Transfers and settlements are atomic.** They run inside a single DB
   transaction that locks the two accounts (`SELECT ... FOR UPDATE`), checks
   sufficient funds, debits the sender, credits the receiver, writes the
   ledger row with post-balance snapshots, and commits — or rolls back
   everything.
3. **Idempotency keys** prevent double-spending on retries (unique per sender).
4. **The welcome credit (BDT 100,000)** is applied at account creation by an
   explicit database operation in the same transaction that creates the user —
   both in the registration service and in the seed.

### Service-layer alignment note

This schema stores balances and amounts as BDT `DECIMAL(18,2)` (e.g.
`100000.00`). The service/repository layer must pass values in BDT units
(Prisma `Decimal`, number or string) — the legacy poisha helpers in
`backend/src/utils/money.js` and the old `Transfer`-based repositories were
written for an earlier integer-poisha schema and need updating when wiring the
services to this schema. The seed script already follows the new
`DECIMAL(18,2)` convention.
