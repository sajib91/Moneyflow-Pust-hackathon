export async function createTransfer(tx, data) {
  return tx.transfer.create({ data });
}

export async function findTransferByIdempotencyKey(tx, key) {
  return tx.transfer.findUnique({ where: { idempotencyKey: key } });
}

export async function findTransfersByUser(tx, userId, limit, offset) {
  return tx.transfer.findMany({
    where: {
      OR: [{ senderId: userId }, { receiverId: userId }],
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
    include: {
      sender: { select: { id: true, name: true, email: true } },
      receiver: { select: { id: true, name: true, email: true } },
    },
  });
}