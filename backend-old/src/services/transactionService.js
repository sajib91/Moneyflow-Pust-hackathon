import prisma from '../config/prisma.js';
import * as transactionRepo from '../repositories/transactionRepository.js';
import * as requestRepo from '../repositories/requestRepository.js';

export async function getTransactions(userId, { type, limit = 20, offset = 0 } = {}) {
  const transactions = await transactionRepo.findTransactionsByUser(prisma, userId, { type, limit, offset });
  return transactions.map(formatTransaction);
}

export async function getTransactionById(userId, transactionId) {
  const transaction = await prisma.transaction.findFirst({
    where: { id: transactionId, userId },
  });
  if (!transaction) return null;
  return formatTransaction(transaction);
}

export async function getPendingRequests(userId) {
  const requests = await requestRepo.findPendingRequestsForUser(prisma, userId);
  return requests.map((r) => ({
    id: r.id,
    requester: { id: r.requester.id, name: r.requester.name, email: r.requester.email },
    amount: Number(r.amount) / 100,
    status: r.status,
    createdAt: r.createdAt,
  }));
}

function formatTransaction(t) {
  return {
    id: t.id,
    type: t.type,
    amount: Number(t.amount) / 100,
    balanceAfter: Number(t.balanceAfter) / 100,
    referenceId: t.referenceId,
    referenceType: t.referenceType,
    description: t.description,
    createdAt: t.createdAt,
  };
}