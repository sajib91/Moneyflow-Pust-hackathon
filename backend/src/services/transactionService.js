import prisma from '../config/prisma.js';
import * as transactionRepo from '../repositories/transactionRepository.js';
import * as requestRepo from '../repositories/requestRepository.js';

export async function getTransactions(userId, { type, limit = 20, offset = 0 } = {}) {
  const transactions = await transactionRepo.findTransactionsByUser(prisma, userId, { type, limit, offset });
  return transactions.map((t) => formatTransaction(t, userId));
}

export async function getTransactionById(userId, transactionId) {
  const transaction = await transactionRepo.findTransactionByIdForUser(prisma, transactionId, userId);
  if (!transaction) return null;
  return formatTransaction(transaction, userId);
}

export async function getPendingRequests(userId) {
  const requests = await requestRepo.findPendingRequestsForUser(prisma, userId);
  return requests.map((r) => ({
    id: r.id,
    requester: { id: r.requester.id, name: r.requester.name, email: r.requester.email },
    amount: Number(r.amount),
    status: r.status,
    createdAt: r.createdAt,
  }));
}

function formatTransaction(t, userId) {
  const direction = t.senderAccount.userId === userId ? 'SENT' : 'RECEIVED';
  return {
    id: t.id,
    type: t.type,
    direction,
    amount: Number(t.amount),
    counterpartyName: direction === 'SENT' ? t.receiverNameAtTime : t.senderNameAtTime,
    balanceAfter: direction === 'SENT' ? Number(t.senderBalanceAfter) : Number(t.receiverBalanceAfter),
    description: t.description,
    createdAt: t.createdAt,
  };
}
