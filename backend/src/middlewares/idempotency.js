import { config } from '../config/index.js';
import { getExpiryDate } from '../utils/idempotency.js';
import { IdempotencyConflictError } from '../errors/ApiError.js';
import prisma from '../config/prisma.js';

export function idempotencyMiddleware(req, res, next) {
  const key = req.headers['idempotency-key'] || req.body.idempotencyKey;
  if (!key) {
    req.idempotencyKey = crypto.randomUUID();
    return next();
  }

  req.idempotencyKey = key;
  next();
}

export async function checkIdempotency(userId, key, tx) {
  const existing = await tx.idempotencyKey.findUnique({
    where: { userId_key: { userId, key } },
  });

  if (existing) {
    if (existing.status === 'COMPLETED') {
      throw new IdempotencyConflictError(existing.response);
    }
    if (existing.status === 'PENDING' && !isExpired(existing.expiresAt)) {
      throw new IdempotencyConflictError({ message: 'Request in progress' });
    }
  }

  await tx.idempotencyKey.upsert({
    where: { userId_key: { userId, key } },
    create: {
      userId,
      key,
      status: 'PENDING',
      expiresAt: getExpiryDate(),
    },
    update: {
      status: 'PENDING',
      expiresAt: getExpiryDate(),
    },
  });
}

export async function markIdempotencyCompleted(userId, key, response, tx) {
  await tx.idempotencyKey.update({
    where: { userId_key: { userId, key } },
    data: { status: 'COMPLETED', response },
  });
}

export async function markIdempotencyFailed(userId, key, tx) {
  await tx.idempotencyKey.update({
    where: { userId_key: { userId, key } },
    data: { status: 'FAILED' },
  });
}

function isExpired(expiresAt) {
  return new Date() > new Date(expiresAt);
}