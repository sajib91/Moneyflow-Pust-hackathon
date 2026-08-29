export async function createTransfer(tx, data) {
  return tx.transaction.create({ data });
}

export async function findTransferByIdempotencyKey(tx, senderAccountId, key) {
  return tx.transaction.findUnique({
    where: { senderAccountId_idempotencyKey: { senderAccountId, idempotencyKey: key } },
  });
}

export async function findTransfersByUser(tx, accountId, limit, offset) {
  return tx.transaction.findMany({
    where: {
      OR: [{ senderAccountId: accountId }, { receiverAccountId: accountId }],
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });
}