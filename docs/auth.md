# Authentication API

Endpoints for registration, login and the authenticated profile endpoint.

Base URL: `http://localhost:3000/api` (dev)

| Endpoint | Method | Auth | Purpose |
| --- | --- | --- | --- |
| `/auth/register` | POST | public | Create user + account (BDT 100,000 welcome balance) |
| `/auth/login` | POST | public | Verify credentials, return JWT |
| `/auth/me` | GET | Bearer token | Return the authenticated user's profile + balance |

## Registration — `POST /api/auth/register`

Creates the user and their account **atomically** (single DB transaction):

1. Validates `name`, `email`, `phone`, `password`.
2. Normalizes the email (`trim` + `lowercase`) — stored emails are always
   canonical.
3. Rejects duplicate email (409 `EMAIL_EXISTS`) and duplicate phone
   (409 `PHONE_EXISTS`), including the race window (unique indexes + P2002
   handling).
4. Hashes the password with **bcrypt (cost 12)** — plaintext never reaches
   the database.
5. Creates `User` + `Account` with balance **BDT 100,000.00** in one
   transaction.

**Request body**

```json
{
  "name": "Ayesha Rahman",
  "email": "ayesha@moneflow.dev",
  "phone": "+8801711000001",
  "password": "DemoPass123!"
}
```

**Rules:** name 2–100 chars · valid email, max 255 · phone 11–15 digits with
optional `+` · password 8–128 chars with **at least one letter and one
number**.

**Success — `201 Created`** (no password hash ever returned)

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "0991f4c8-fa94-4734-8096-428b26f86472",
    "name": "Ayesha Rahman",
    "email": "ayesha@moneflow.dev",
    "phone": "+8801711000001"
  }
}
```

**Errors**

| Status | Code | Example |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | missing/invalid fields (`details` lists each field) |
| 409 | `EMAIL_EXISTS` | `{ "message": "Email already registered" }` |
| 409 | `PHONE_EXISTS` | `{ "message": "Phone number already registered" }` |

```json
{
  "error": "VALIDATION_ERROR",
  "message": "Validation failed",
  "details": {
    "body.password": "Password must contain at least one number",
    "body.email": "A valid email address is required"
  }
}
```

## Login — `POST /api/auth/login`

- Normalizes the email, loads the user, compares the password with
  **bcrypt**.
- Returns the same `401 "Invalid email or password"` whether the email is
  unknown, the account is deactivated, or the password is wrong — **no
  account enumeration**.
- The JWT contains **only identity claims** (`id`, `email`, plus `iat`/`exp`
  added by the library). No password, no balance, no sensitive data.

**Request body**

```json
{ "email": "ayesha@moneflow.dev", "password": "DemoPass123!" }
```

**Success — `200 OK`** (shape identical to register)

**Errors**

| Status | Code | Message |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | malformed email / missing password |
| 401 | `UNAUTHORIZED` | `"Invalid email or password"` |

## Profile — `GET /api/auth/me`

Protected by `authenticateUser`. The user identity is **always taken from
the verified JWT** (`req.user.id`) — a `userId` in the request body/query is
ignored.

**Headers:** `Authorization: Bearer <token>`

**Success — `200 OK`**

```json
{
  "id": "0991f4c8-fa94-4734-8096-428b26f86472",
  "name": "Ayesha Rahman",
  "email": "ayesha@moneflow.dev",
  "phone": "+8801711000001",
  "balance": "96650.50",
  "currency": "BDT",
  "createdAt": "2026-08-29T06:00:00.000Z"
}
```

**Errors**

| Status | Code | Message |
| --- | --- | --- |
| 401 | `UNAUTHORIZED` | missing header → `"Authentication required"` |
| 401 | `UNAUTHORIZED` | expired token → `"Session expired, please log in again"` |
| 401 | `UNAUTHORIZED` | invalid token → `"Invalid token"` |
| 401 | `UNAUTHORIZED` | deactivated user → `"User not found or deactivated"` |

## Middleware & authorization

- **`authenticateUser`** (`backend/src/middlewares/auth.js`) — verifies the
  bearer JWT, loads the user, rejects inactive accounts, sets `req.user`.
- **`authorizeResourceOwner(ownerId)`** and **`requireRole(...roles)`**
  (`backend/src/middlewares/authorization.js`) — run after
  `authenticateUser`; compare the resource owner against `req.user.id`
  (403 `FORBIDDEN` on mismatch). Never trust an owner id from the request
  body.

## Security notes

- Password hashes are bcrypt (12 rounds); never returned by any endpoint.
- `userId` is never accepted from request bodies for authenticated identity.
- Errors return curated messages only — stack traces and DB details are
  logged server-side, never sent to the client.
- Duplicate registration is prevented twice: application check (friendly
  409) and PostgreSQL unique indexes (race-proof P2002 → 409).

## Testing with curl

```bash
BASE=http://localhost:3000/api/auth

# Register (201)
curl -s -X POST $BASE/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Ayesha Rahman","email":"ayesha@moneflow.dev","phone":"+8801711000001","password":"DemoPass123!"}'

# Register again with the same email -> 409 EMAIL_EXISTS
curl -s -X POST $BASE/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Ayesha Rahman","email":"ayesha@moneflow.dev","phone":"+8801711000002","password":"DemoPass123!"}'

# Invalid registration -> 400 with per-field details
curl -s -X POST $BASE/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"A","email":"not-an-email","phone":"1","password":"short"}'

# Email normalization: "  AYESHA@Example.COM " is stored as "ayesha@example.com"
curl -s -X POST $BASE/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Case Test","email":"  AYESHA@Example.COM ","phone":"+8801711000099","password":"DemoPass123!"}'

# Login (200) — capture the token
TOKEN=$(curl -s -X POST $BASE/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"ayesha@moneflow.dev","password":"DemoPass123!"}' \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['token'])")
echo "TOKEN=$TOKEN"

# Login with wrong password -> 401
curl -s -X POST $BASE/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"ayesha@moneflow.dev","password":"WrongPass123!"}'

# Profile with token -> 200 (balance comes from PostgreSQL)
curl -s $BASE/me -H "Authorization: Bearer $TOKEN"

# Profile without token -> 401
curl -s $BASE/me

# Profile with invalid token -> 401
curl -s $BASE/me -H "Authorization: Bearer not.a.jwt"
```

### Expected status codes summary

| Scenario | Status |
| --- | --- |
| Successful registration | 201 |
| Successful login / profile | 200 |
| Invalid input (validation) | 400 |
| Wrong credentials / missing or invalid token | 401 |
| Duplicate email or phone | 409 |
