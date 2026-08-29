import { config } from '../config/index.js';

export function generateIdempotencyKey() {
  return crypto.randomUUID();
}

export function getExpiryDate(hours = config.idempotencyTtlHours) {
  const date = new Date();
  date.setHours(date.getHours() + hours);
  return date;
}

export function isExpired(expiresAt) {
  return new Date() > new Date(expiresAt);
}