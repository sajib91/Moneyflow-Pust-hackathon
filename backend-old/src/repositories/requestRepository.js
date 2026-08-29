export async function createMoneyRequest(tx, data) {
  return tx.moneyRequest.create({ data });
}

export async function findRequestById(tx, id, forUpdate = false) {
  return tx.moneyRequest.findUnique({
    where: { id },
    lock: forUpdate ? { mode: 'update' } : undefined,
    include: {
      requester: { select: { id: true, name: true, email: true } },
      payer: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function findRequestByIdempotencyKey(tx, key) {
  return tx.moneyRequest.findUnique({ where: { idempotencyKey: key } });
}

export async function updateRequestStatus(tx, id, status) {
  return tx.moneyRequest.update({
    where: { id },
    data: {
      status,
      respondedAt: status !== 'PENDING' ? new Date() : undefined,
    },
  });
}

export async function findRequestsByUser(tx, userId, limit, offset) {
  return tx.moneyRequest.findMany({
    where: {
      OR: [{ requesterId: userId }, { payerId: userId }],
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
    include: {
      requester: { select: { id: true, name: true, email: true } },
      payer: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function findPendingRequestsForUser(tx, userId) {
  return tx.moneyRequest.findMany({
    where: { payerId: userId, status: 'PENDING' },
    orderBy: { createdAt: 'desc' },
    include: {
      requester: { select: { id: true, name: true, email: true } },
    },
  });
}