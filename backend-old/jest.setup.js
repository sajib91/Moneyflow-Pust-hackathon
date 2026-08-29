import { PrismaClient } from '@prisma/client';

global.prisma = new PrismaClient();

beforeAll(async () => {
  await global.prisma.$connect();
});

afterAll(async () => {
  await global.prisma.$disconnect();
});

afterEach(async () => {
  const models = [
    'idempotencyKey',
    'transaction',
    'moneyRequest',
    'transfer',
    'account',
    'user',
  ];
  for (const model of models) {
    await global.prisma[model].deleteMany();
  }
});