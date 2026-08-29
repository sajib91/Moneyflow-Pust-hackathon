export async function createMoneyRequest(tx, data) {
  return tx.moneyRequest.create({ data });
}

export async function findRequestById(tx, id, forUpdate = false) {
  if (forUpdate) {
    const rows = await tx.$queryRaw`
      SELECT * FROM "MoneyRequest" WHERE "id" = ${id}::uuid FOR UPDATE
    `;
    if (!rows[0]) return null;
    const request = rows[0];
    const [requester, requestedFrom] = await Promise.all([
      tx.user.findUnique({ where: { id: request.requesterId }, select: { id: true, name: true, email: true } }),
      tx.user.findUnique({ where: { id: request.requestedFromId }, select: { id: true, name: true, email: true } }),
    ]);
    return { ...request, requester, requestedFrom };
  }
  return tx.moneyRequest.findUnique({
    where: { id },
    include: {
      requester: { select: { id: true, name: true, email: true } },
      requestedFrom: { select: { id: true, name: true, email: true } },
    },
  });
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
      OR: [{ requesterId: userId }, { requestedFromId: userId }],
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
    include: {
      requester: { select: { id: true, name: true, email: true } },
      requestedFrom: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function findPendingRequestsForUser(tx, userId) {
  return tx.moneyRequest.findMany({
    where: { requestedFromId: userId, status: 'PENDING' },
    orderBy: { createdAt: 'desc' },
    include: {
      requester: { select: { id: true, name: true, email: true } },
    },
  });
}
