import { Prisma } from '@prisma/client';
import { NotFoundError, ForbiddenError, InvalidRequestStateError, ConflictError } from '../errors/ApiError.js';
import prisma from '../config/prisma.js';
import * as userRepo from '../repositories/userRepository.js';
import * as requestRepo from '../repositories/requestRepository.js';
import * as transferService from './transferService.js';

function validateAmount(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error('amount must be a positive number');
  }
}

// Note: controller passes this as `payerId`, meaning "the user being asked to pay" —
// mapped here to the schema's `requestedFromId` field.
export async function createRequest({ requesterId, payerId, amount, idempotencyKey }) {
  validateAmount(amount);
  if (requesterId === payerId) throw new ConflictError('Cannot request from yourself', 'SELF_REQUEST');

  const amountDecimal = new Prisma.Decimal(amount);

  return prisma.$transaction(async (tx) => {
    const requester = await userRepo.findUserById(tx, requesterId);
    if (!requester) throw new NotFoundError('Requester');

    const requestedFrom = await userRepo.findUserById(tx, payerId);
    if (!requestedFrom) throw new NotFoundError('Payer');

    const request = await requestRepo.createMoneyRequest(tx, {
      idempotencyKey,
      requesterId,
      requestedFromId: payerId,
      amount: amountDecimal,
      status: 'PENDING',
    });

    return {
      requestId: request.id,
      status: 'PENDING',
      amount: Number(amount),
    };
  });
}

export async function approveRequest(userId, requestId) {
  const request = await requestRepo.findRequestById(prisma, requestId, false);
  if (!request) throw new NotFoundError('Request');
  if (request.requestedFromId !== userId) throw new ForbiddenError('Not the payer');
  if (request.status !== 'PENDING') {
    throw new InvalidRequestStateError(request.status, ['PENDING']);
  }

  // Reuses the core transfer engine — same locking, same validation, same ledger write.
  // Do not re-implement debit/credit here.
  const transferResult = await transferService.sendMoney({
    fromUserId: userId,
    toUserId: request.requesterId,
    amount: Number(request.amount),
    idempotencyKey: `req-${requestId}`,
    type: 'REQUEST_SETTLEMENT',
    moneyRequestId: requestId,
  });

  await requestRepo.updateRequestStatus(prisma, requestId, 'APPROVED');

  return {
    transferId: transferResult.transferId,
    requestId,
    status: 'APPROVED',
    newBalance: transferResult.newBalance,
  };
}

export async function rejectRequest(userId, requestId) {
  const request = await requestRepo.findRequestById(prisma, requestId);
  if (!request) throw new NotFoundError('Request');

  if (request.requestedFromId !== userId) throw new ForbiddenError('Not the payer');
  if (request.status !== 'PENDING') {
    throw new InvalidRequestStateError(request.status, ['PENDING']);
  }

  await requestRepo.updateRequestStatus(prisma, requestId, 'REJECTED');
  return { requestId, status: 'REJECTED' };
}

export async function cancelRequest(userId, requestId) {
  const request = await requestRepo.findRequestById(prisma, requestId);
  if (!request) throw new NotFoundError('Request');

  if (request.requesterId !== userId) throw new ForbiddenError('Not the requester');
  if (request.status !== 'PENDING') {
    throw new InvalidRequestStateError(request.status, ['PENDING']);
  }

  await requestRepo.updateRequestStatus(prisma, requestId, 'CANCELLED');
  return { requestId, status: 'CANCELLED' };
}

export async function getRequests(userId, limit = 20, offset = 0) {
  const requests = await requestRepo.findRequestsByUser(prisma, userId, limit, offset);
  return requests.map(formatRequest);
}

export async function getPendingRequestsForUser(userId) {
  const requests = await requestRepo.findPendingRequestsForUser(prisma, userId);
  return requests.map((r) => ({
    id: r.id,
    requester: { id: r.requester.id, name: r.requester.name, email: r.requester.email },
    amount: Number(r.amount),
    status: r.status,
    createdAt: r.createdAt,
  }));
}

function formatRequest(r) {
  return {
    id: r.id,
    requester: { id: r.requester.id, name: r.requester.name, email: r.requester.email },
    payer: { id: r.requestedFrom.id, name: r.requestedFrom.name, email: r.requestedFrom.email },
    amount: Number(r.amount),
    status: r.status,
    createdAt: r.createdAt,
    respondedAt: r.respondedAt,
  };
}
