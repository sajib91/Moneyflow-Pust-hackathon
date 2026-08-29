export function idempotencyMiddleware(req, res, next) {
  req.idempotencyKey = req.headers['idempotency-key'] || crypto.randomUUID();
  next();
}

export async function checkIdempotency() {
  // Idempotency table not in current schema — disabled for now.
  // Frontend disables the submit button during requests to prevent double-submits.
  return;
}

export async function markIdempotencyCompleted() {
  return;
}

export async function markIdempotencyFailed() {
  return;
}
