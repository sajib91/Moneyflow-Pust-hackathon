export async function createUser(tx, data) {
  return tx.user.create({ data });
}

export async function findUserByEmail(tx, email) {
  return tx.user.findUnique({ where: { email } });
}

export async function findUserByPhone(tx, phone) {
  return tx.user.findUnique({ where: { phone } });
}

export async function findUserById(tx, id) {
  return tx.user.findUnique({ where: { id } });
}

export async function searchUsers(tx, query, limit, excludeId) {
  return tx.user.findMany({
    where: {
      AND: [
        { active: true },
        { id: { not: excludeId } },
        {
          OR: [
            { email: { contains: query, mode: 'insensitive' } },
            { phone: { contains: query, mode: 'insensitive' } },
            { name: { contains: query, mode: 'insensitive' } },
          ],
        },
      ],
    },
    take: limit,
    select: { id: true, email: true, phone: true, name: true },
    orderBy: { name: 'asc' },
  });
}