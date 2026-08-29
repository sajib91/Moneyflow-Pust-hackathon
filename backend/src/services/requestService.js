import { config } from '../config/index.js';
import { NotFoundError, ForbiddenError, InvalidRequestStateError, ConflictError, InsufficientFundsError } from '../errors/ApiError.js';
import prisma from '../config/prisma.js';
import * as userRepo from '../repositories/userRepository.js';
import * as accountRepo from '../repositories/accountRepository.js';
import * as requestRepo from '../repositories/requestRepository.js';
import * as transferRepo from '../repositories/transferRepository.js';
import * as transactionRepo from '../repositories/transactionRepository.js';
import * as idempotency from '../middlewares/idempotency.js';
import { takaToPoisha, validatePositiveInteger } from '../utils/money.js';

export async function createRequest({ requesterId, payerId, amount, idempotencyKey }) {
  validatePositiveInteger(amount, 'amount');
  if (requesterId === payerId) throw new ConflictError('Cannot request from yourself', 'SELF_REQUEST');

  const amountPoisha = takaToPoisha(amount);

  return prisma.$transaction(async (tx) => {
    await idempotency.checkIdempotency(requesterId, idempotencyKey, tx);

    const requester = await userRepo.findUserById(tx, requesterId);
    if (!requester) throw new NotFoundError('Requester');

    const payer = await userRepo.findUserById(tx, payerId);
    if (!payer) throw new NotFoundError('Payer');

    const request = await requestRepo.createMoneyRequest(tx, {
      idempotencyKey,
      requesterId,
      payerId,
      amount: amountPoisha,
      status: 'PENDING',
    });

    const response = {
      requestId: request.id,
      status: 'PENDING',
      amount,
    };

    await idempotency.markIdempotencyCompleted(requesterId, idempotencyKey, response, tx);

    return response;
  });
}

export async function approveRequest(userId, requestId) {
  return prisma.$transaction(async (tx) => {
    const request = await requestRepo.findRequestById(tx, requestId, true);
    if (!request) throw new NotFoundError('Request');

    if (request.payerId !== userId) throw new ForbiddenError('Not the payer');

    if (request.status !== 'PENDING') {
      throw new InvalidRequestStateError(request.status, ['PENDING']);
    }

    const amountPoisha = request.amount;
    const payerAccount = await accountRepo.findAccountByUserId(tx, userId, true);
    if (!payerAccount) throw new NotFoundError('Payer account');
    if (payerAccount.balance < amountPoisha) {
      throw new InsufficientFundsError(payerAccount.balance);
    }

    const requesterAccount = await accountRepo.findAccountByUserId(tx, request.requesterId, true);
    if (!requesterAccount) throw new NotFoundError('Requester account');

    await accountRepo.adjustBalance(tx, userId, -amountPoisha);
    await accountRepo.adjustBalance(tx, request.requesterId, amountPoisha);

    const transfer = await transferRepo.createTransfer(tx, {
      idempotencyKey: `req-${requestId}`,
      senderId: userId,
      receiverId: request.requesterId,
      amount: amountPoisha,
      status: 'SUCCEEDED',
    });

    const newPayerBalance = payerAccount.balance - amountPoisha;
    const newRequesterBalance = requesterAccount.balance + amountPoisha;

    await transactionRepo.createLedgerEntries(tx, [
      {
        type: 'DEBIT',
        userId,
        amount: amountPoisha,
        balanceAfter: newPayerBalance,
        referenceId: transfer.id,
        referenceType: 'TRANSFER',
        description: `Approved request from ${request.requester.name}`,
      },
      {
        type: 'CREDIT',
        userId: request.requesterId,
        amount: amountPoisha,
        balanceAfter: newRequesterBalance,
        referenceId: transfer.id,
        referenceType: 'TRANSFER',
        description: `Request approved by ${payerAccount.user?.name || 'user'}`,
      },
    ]);

    await requestRepo.updateRequestStatus(tx, requestId, 'APPROVED');

    return {
      transferId: transfer.id,
      requestId,
      status: 'APPROVED',
      newBalance: Number(newPayerBalance) / 100,
    };
  }, { isolationLevel: 'ReadCommitted' });
}

export async function rejectRequest(userId, requestId) {
  const request = await requestRepo.findRequestById(prisma, requestId);
  if (!request) throw new NotFoundError('Request');

  if (request.payerId !== userId) throw new ForbiddenError('Not the payer');
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
  return requests.map(formatRequest);
}

function formatRequest(r) {
  return {
    id: r.id,
    requester: { id: r.requester.id, name: r.requester.name, email: r.requester.email },
    payer: { id: r.payer.id, name: r.payer.name, email: r.payer.email },
    amount: Number(r.amount) / 100,
    status: r.status,
    createdAt: r.createdAt,
    respondedAt: r.respondedAt,
  };
}