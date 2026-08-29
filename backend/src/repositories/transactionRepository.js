export async function findTransactionsByUser(tx, userId, options = {}) {
  const { type, limit = 20, offset = 0 } = options;

  const where = {
    OR: [
      { senderAccount: { userId } },
      { receiverAccount: { userId } },
    ],
  };

  if (type === 'incoming') {
    where.OR = [{ receiverAccount: { userId } }];
  } else if (type === 'outgoing') {
    where.OR = [{ senderAccount: { userId } }];
  }

  return tx.transaction.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
    include: {
      senderAccount: { select: { userId: true } },
      receiverAccount: { select: { userId: true } },
    },
  });
}

export async function findTransactionByIdForUser(tx, transactionId, userId) {
  return tx.transaction.findFirst({
    where: {
      id: transactionId,
      OR: [
        { senderAccount: { userId } },
        { receiverAccount: { userId } },
      ],
    },
    include: {
      senderAccount: { select: { userId: true } },
      receiverAccount: { select: { userId: true } },
    },
  });
}
