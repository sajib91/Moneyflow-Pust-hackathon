export async function createAccount(tx, userId, balance) {
  return tx.account.create({
    data: { userId, balance },
  });
}

export async function findAccountByUserId(tx, userId, forUpdate = false) {
  if (forUpdate) {
    const rows = await tx.$queryRaw`
      SELECT * FROM "Account" WHERE "userId" = ${userId}::uuid FOR UPDATE
    `;
    if (!rows[0]) return null;
    const account = rows[0];
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });
    return { ...account, user };
  }
  return tx.account.findUnique({
    where: { userId },
    include: { user: { select: { name: true, email: true } } },
  });
}

export async function adjustBalance(tx, userId, delta) {
  return tx.account.update({
    where: { userId },
    data: { balance: { increment: delta } },
  });
}

export async function getBalance(tx, userId) {
  const account = await tx.account.findUnique({
    where: { userId },
    select: { balance: true },
  });
  return account?.balance ?? 0;
}