# Consistent Validation & Error Handling

Every API response uses one of two envelopes:

## Success

```json
{
  "success": true,
  "data": {}
}
```

## Error

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_FUNDS",
    "message": "Insufficient balance.",
    "details": {}
  }
}
```

`details` is optional and only present when there is extra context (e.g. a
list of failed validation fields).

---

## Error-code catalog

| Code | HTTP | Meaning |
| --- | --- | --- |
| `VALIDATION_ERROR` | 400 | Request body/query/params failed schema validation (`details` lists each field) |
| `INVALID_AMOUNT` | 400 | Amount is missing, malformed, zero or negative (reserved for the service layer) |
| `INVALID_REFERENCE` | 400 | A referenced record does not exist (FK violation) |
| `AUTHENTICATION_REQUIRED` | 401 | Missing, invalid or expired bearer token |
| `INVALID_CREDENTIALS` | 401 | Wrong email/password at login (generic — no account enumeration) |
| `UNAUTHORIZED` | 401 | Generic authentication failure (legacy alias) |
| `USER_INACTIVE` | 403 | Account exists but is deactivated |
| `FORBIDDEN` | 403 | Authenticated but not allowed to perform the action |
| `RESOURCE_NOT_FOUND` | 404 | Resource or route does not exist |
| `EMAIL_EXISTS` | 409 | Duplicate email |
| `PHONE_EXISTS` | 409 | Duplicate phone |
| `DUPLICATE_OPERATION` | 409 | Idempotent operation already completed / DB duplicate |
| `REQUEST_NOT_PENDING` | 409 | State transition attempted on a non-pending request |
| `SELF_TRANSFER` | 400 | Sender and receiver are the same account |
| `INSUFFICIENT_FUNDS` | 400 | Balance is too low for the operation |
| `INTERNAL_ERROR` | 500 | Unexpected error — **never exposes implementation details** |

---

## Architecture

```
Request
  └─ route → validate(schema)  ← API-boundary validation (body/query/params)
        └─ authenticateUser    ← JWT verification (req.user)
              └─ controller    ← thin: calls service, respond(res, code, data)
                    └─ service ← business rules; throws AppError subclasses
                          └─ repository ← Prisma data access
                                └─ errorHandler (central) → consistent error JSON
```

### Files

| File | Responsibility |
| --- | --- |
| `src/validators/validation.js` | Zod schemas + `validate()` middleware + reusable rules (uuid, email, amount, pagination, status filter) |
| `src/errors/ApiError.js` | `AppError` base class + catalog classes (`ValidationError`, `InvalidCredentialsError`, `NotFoundError`, …) |
| `src/middlewares/errorHandler.js` | Central handler — maps `AppError`, Prisma errors and unknown errors to the envelope; logs internals server-side |
| `src/utils/respond.js` | `respond(res, status, data)` — the success envelope |
| `src/middlewares/auth.js` | `authenticateUser` (JWT → `req.user`) |
| `src/middlewares/authorization.js` | `authorizeResourceOwner`, `requireRole` |

### Boundary validation rules

| Input | Rule |
| --- | --- |
| `amount` | number or numeric string; `> 0`; at most 2 decimal places (e.g. `1500.50`); `0`, `-5`, `"abc"`, `10.999` rejected |
| `id` / `*UserId` | must be a valid UUID |
| `email` | valid email, ≤ 255 chars, normalized (trim + lowercase) |
| `limit` | integer 1–100 (default 20) |
| `offset` | integer ≥ 0 (default 0) |
| `type` (transactions) | one of `incoming`, `outgoing`, `pending` |
| `q` (search) | non-empty, ≤ 100 chars |
| `password` | 8–128 chars, at least one letter and one number |

---

## Internal errors never leak

- Stack traces, SQL, Prisma internals and unexpected messages are logged
  **server-side only**.
- Unknown/`PrismaClientValidationError` → `500 INTERNAL_ERROR` with a generic
  message and no details.
- Prisma known errors are mapped to safe codes:
  `P2002 → EMAIL_EXISTS / PHONE_EXISTS / DUPLICATE_OPERATION`,
  `P2003 → INVALID_REFERENCE`, `P2025 → RESOURCE_NOT_FOUND`.

## Examples

```bash
# Success
curl -s http://localhost:3000/api/auth/me -H "Authorization: Bearer $TOKEN"
# → {"success":true,"data":{"id":"...","name":"Ayesha Rahman","balance":"96650.50",...}}

# Validation error (invalid amount)
curl -s -X POST http://localhost:3000/api/transfers/send \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"toUserId":"<uuid>","amount":-50}'
# → {"success":false,"error":{"code":"VALIDATION_ERROR","message":"Validation failed","details":{"body.amount":"Amount must be greater than zero"}}}

# Invalid pagination
curl -s "http://localhost:3000/api/transactions?limit=0" -H "Authorization: Bearer $TOKEN"
# → {"success":false,"error":{"code":"VALIDATION_ERROR","message":"Validation failed","details":{"query.limit":"limit must be at least 1"}}}

# Invalid status filter
curl -s "http://localhost:3000/api/transactions?type=bogus" -H "Authorization: Bearer $TOKEN"
# → {"success":false,"error":{"code":"VALIDATION_ERROR","message":"Validation failed","details":{"query.type":"type must be one of: incoming, outgoing, pending"}}}

# Invalid credentials
curl -s -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' -d '{"email":"a@b.com","password":"wrong"}'
# → {"success":false,"error":{"code":"INVALID_CREDENTIALS","message":"Invalid email or password"}}

# Missing token
curl -s http://localhost:3000/api/auth/me
# → {"success":false,"error":{"code":"AUTHENTICATION_REQUIRED","message":"Authentication required"}}
```
