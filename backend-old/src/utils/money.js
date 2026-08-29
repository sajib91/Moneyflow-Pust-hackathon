export const POISHA_PER_TAKA = 100n;

export function takaToPoisha(taka) {
  if (!Number.isInteger(taka) || taka <= 0) {
    throw new Error('Amount must be a positive integer');
  }
  return BigInt(taka) * POISHA_PER_TAKA;
}

export function poishaToTaka(poisha) {
  return Number(poisha) / Number(POISHA_PER_TAKA);
}

export function formatTaka(poisha) {
  const taka = poishaToTaka(poisha);
  return new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    minimumFractionDigits: 2,
  }).format(taka);
}

export function validatePositiveInteger(value, fieldName = 'amount') {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${fieldName} must be a positive integer`);
  }
}

export function add(a, b) {
  return a + b;
}

export function subtract(a, b) {
  return a - b;
}

export function isGreaterOrEqual(a, b) {
  return a >= b;
}