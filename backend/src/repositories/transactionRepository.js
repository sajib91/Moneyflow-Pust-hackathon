export async function createTransaction(tx, data) {
  return tx.transaction.create({ data });
}

export async function createLedgerEntries(tx, entries) {
  return tx.transaction.createMany({ data: entries });
}

export async function findTransactionsByUser(tx, userId, options = {}) {
  const { type, limit = 20, offset = 0 } = options;
  const where = { userId };
  if (type) {
    where.type = type === 'incoming' ? 'CREDIT' : type === 'outgoing' ? 'DEBIT' : undefined;
  }
  return tx.transaction.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });
}

export async function findTransactionByReference(tx, referenceId, referenceType) {
  return tx.transaction.findFirst({
    where: { referenceId, referenceType },
  });
}