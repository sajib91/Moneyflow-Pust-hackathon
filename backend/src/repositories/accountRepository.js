export async function createAccount(tx, userId, balance) {
  return tx.account.create({
    data: { userId, balance },
  });
}

export async function findAccountByUserId(tx, userId, forUpdate = false) {
  return tx.account.findUnique({
    where: { userId },
    lock: forUpdate ? { mode: 'update' } : undefined,
  });
}

export async function adjustBalance(tx, userId, delta) {
  return tx.account.update({
    where: { userId },
    data: {
      balance: { increment: delta },
      version: { increment: 1 },
    },
  });
}

export async function getBalance(tx, userId) {
  const account = await tx.account.findUnique({
    where: { userId },
    select: { balance: true },
  });
  return account?.balance ?? 0n;
}