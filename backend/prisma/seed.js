/**
 * Moneflow — database seed
 *
 * Populates the database with demo users and enough sample money movement
 * to demonstrate the dashboard.
 *
 * Rules honoured by this script:
 *  - Passwords are stored ONLY as bcrypt hashes (never plaintext).
 *  - Every account balance change is an explicit database operation
 *    (account.create / account.update) — no fake values anywhere.
 *  - The BDT 100,000 welcome credit is applied per account at creation time,
 *    exactly like the registration service does.
 *  - The script is idempotent: existing demo users are skipped untouched,
 *    and sample transactions are only inserted on a fresh seed.
 *
 * Run with:  npm run db:seed --workspace=backend   (or `prisma db seed`)
 * After a reset:  npm run db:reset --workspace=backend
 */
import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SALT_ROUNDS = 12;
const WELCOME_BALANCE = new Prisma.Decimal('100000.00'); // BDT 100,000
const ZERO = new Prisma.Decimal('0.00');

// ---------------------------------------------------------------------------
// Demo users — all share the same demo password (only its bcrypt hash is stored)
// ---------------------------------------------------------------------------
const DEMO_USERS = [
  { name: 'Ayesha Rahman', email: 'ayesha@moneflow.dev', phone: '+8801711000001', password: 'DemoPass123!' },
  { name: 'Rafiul Islam', email: 'rafi@moneflow.dev', phone: '+8801711000002', password: 'DemoPass123!' },
  { name: 'Nusrat Jahan', email: 'nusrat@moneflow.dev', phone: '+8801711000003', password: 'DemoPass123!' },
  { name: 'Tanvir Ahmed', email: 'tanvir@moneflow.dev', phone: '+8801711000004', password: 'DemoPass123!' },
  { name: 'Farhan Chowdhury', email: 'farhan@moneflow.dev', phone: '+8801711000005', password: 'DemoPass123!' },
  { name: 'Sadia Karim', email: 'sadia@moneflow.dev', phone: '+8801711000006', password: 'DemoPass123!' },
];

// ---------------------------------------------------------------------------
// Sample data — amounts in BDT. Each entry: [senderEmail, receiverEmail, amount, description, daysAgo]
// ---------------------------------------------------------------------------
const SAMPLE_TRANSFERS = [
  ['ayesha@moneflow.dev', 'rafi@moneflow.dev', '1500.00', 'Lunch at Kacchi Bhai', 32],
  ['nusrat@moneflow.dev', 'ayesha@moneflow.dev', '2750.50', 'Rent share — June', 28],
  ['rafi@moneflow.dev', 'tanvir@moneflow.dev', '800.00', 'Cricket match tickets', 24],
  ['tanvir@moneflow.dev', 'nusrat@moneflow.dev', '5000.00', 'Hotel booking refund', 21],
  ['ayesha@moneflow.dev', 'farhan@moneflow.dev', '3300.00', 'Team farewell gift', 17],
  ['farhan@moneflow.dev', 'sadia@moneflow.dev', '12500.00', 'Camera lens (Sony 35mm)', 12],
  ['sadia@moneflow.dev', 'farhan@moneflow.dev', '1200.00', 'Dinner at Star Kabab', 9],
  ['rafi@moneflow.dev', 'ayesha@moneflow.dev', '950.00', 'Books + coffee', 6],
  ['nusrat@moneflow.dev', 'tanvir@moneflow.dev', '2000.00', 'Pathao fare — airport', 3],
  ['ayesha@moneflow.dev', 'nusrat@moneflow.dev', '4250.00', 'Cox\u2019s Bazar weekend trip', 1],
];

// Money requests: [requesterEmail, requestedFromEmail, amount, description, daysAgo, status, respondedDaysAgo?]
const SAMPLE_REQUESTS = [
  ['ayesha@moneflow.dev', 'rafi@moneflow.dev', '2000.00', 'Fuel for Dhaka\u2013Sylhet trip', 20, 'APPROVED', 19],
  ['nusrat@moneflow.dev', 'ayesha@moneflow.dev', '1100.00', 'Electricity bill — shared flat', 5, 'PENDING', null],
  ['tanvir@moneflow.dev', 'farhan@moneflow.dev', '4200.00', 'Shared server bill', 15, 'APPROVED', 14],
  ['farhan@moneflow.dev', 'sadia@moneflow.dev', '600.00', 'Chai & snacks', 10, 'REJECTED', 9],
  ['sadia@moneflow.dev', 'rafi@moneflow.dev', '750.00', 'Movie tickets', 2, 'PENDING', null],
  ['rafi@moneflow.dev', 'nusrat@moneflow.dev', '2500.00', 'Birthday gift pool', 13, 'CANCELLED', 12],
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function daysAgo(days, hour = 12, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function log(...args) {
  console.log('[seed]', ...args);
}

// ---------------------------------------------------------------------------
// 1) Demo users + welcome balance (BDT 100,000 each)
// ---------------------------------------------------------------------------
async function createDemoUsers() {
  // Hash every password up-front so no plaintext ever touches the DB.
  const hashedPasswords = new Map();
  for (const u of DEMO_USERS) {
    hashedPasswords.set(u.email, await bcrypt.hash(u.password, SALT_ROUNDS));
  }

  const results = await prisma.$transaction(async (tx) => {
    const rows = [];
    for (const u of DEMO_USERS) {
      const existing = await tx.user.findUnique({ where: { email: u.email } });
      if (existing) {
        rows.push({ user: existing, created: false });
        continue;
      }

      const user = await tx.user.create({
        data: {
          name: u.name,
          email: u.email,
          phone: u.phone,
          password: hashedPasswords.get(u.email),
          createdAt: daysAgo(40),
        },
      });

      // Explicit database operation: the account is created with the
      // welcome balance — never updated "for free" afterwards.
      await tx.account.create({
        data: {
          userId: user.id,
          balance: WELCOME_BALANCE,
          createdAt: daysAgo(40),
        },
      });

      rows.push({ user, created: true });
    }
    return rows;
  });

  const created = results.filter((r) => r.created).length;
  const skipped = results.filter((r) => !r.created).length;
  log(`users: ${created} created, ${skipped} already existed`);

  return {
    usersByEmail: Object.fromEntries(results.map((r) => [r.user.email, r.user])),
    allFresh: skipped === 0 && created === DEMO_USERS.length,
  };
}

// ---------------------------------------------------------------------------
// 2) Sample transfers + money requests + settlements
// ---------------------------------------------------------------------------
async function seedSampleData(usersByEmail) {
  const existingSeedData = await prisma.transaction.count({
    where: { idempotencyKey: { startsWith: 'seed-' } },
  });
  if (existingSeedData > 0) {
    log('sample data already present — skipping (use `npm run db:reset` for a fully fresh demo)');
    return;
  }

  // accountsByEmail for balance bookkeeping inside the transaction
  const accounts = await prisma.account.findMany({
    where: { userId: { in: Object.values(usersByEmail).map((u) => u.id) } },
  });
  const accountByUserId = Object.fromEntries(accounts.map((a) => [a.userId, a]));
  const balanceByUserId = Object.fromEntries(
    accounts.map((a) => [a.userId, new Prisma.Decimal(a.balance.toString())]),
  );
  const accountOf = (email) => accountByUserId[usersByEmail[email].id];

  let txnIndex = 0;
  let reqIndex = 0;
  let settlementIndex = 0;

  await prisma.$transaction(async (tx) => {
    // ---- Transfers (in chronological order) ----
    const sortedTransfers = [...SAMPLE_TRANSFERS].sort((a, b) => b[4] - a[4]);
    for (const [senderEmail, receiverEmail, amountStr, description, days] of sortedTransfers) {
      txnIndex += 1;
      const amount = new Prisma.Decimal(amountStr);
      const sender = accountOf(senderEmail);
      const receiver = accountOf(receiverEmail);
      const senderUser = usersByEmail[senderEmail];
      const receiverUser = usersByEmail[receiverEmail];

      // Apply balance changes with explicit DB operations.
      await tx.account.update({
        where: { id: sender.id },
        data: { balance: { decrement: amount } },
      });
      await tx.account.update({
        where: { id: receiver.id },
        data: { balance: { increment: amount } },
      });

      // Keep the in-memory ledger in sync so snapshots are exact.
      const senderBalanceAfter = balanceByUserId[sender.userId].minus(amount);
      const receiverBalanceAfter = balanceByUserId[receiver.userId].plus(amount);
      balanceByUserId[sender.userId] = senderBalanceAfter;
      balanceByUserId[receiver.userId] = receiverBalanceAfter;

      await tx.transaction.create({
        data: {
          type: 'TRANSFER',
          status: 'SUCCEEDED',
          senderAccountId: sender.id,
          receiverAccountId: receiver.id,
          amount,
          currency: 'BDT',
          senderNameAtTime: senderUser.name,
          receiverNameAtTime: receiverUser.name,
          senderBalanceAfter,
          receiverBalanceAfter,
          idempotencyKey: `seed-transfer-${String(txnIndex).padStart(2, '0')}`,
          description,
          createdAt: daysAgo(days, 14 + (txnIndex % 8), txnIndex * 7 % 60),
        },
      });
    }

    // ---- Money requests ----
    for (const [requesterEmail, requestedFromEmail, amountStr, description, days, status, respondedDays] of SAMPLE_REQUESTS) {
      reqIndex += 1;
      const request = await tx.moneyRequest.create({
        data: {
          requesterId: usersByEmail[requesterEmail].id,
          requestedFromId: usersByEmail[requestedFromEmail].id,
          amount: new Prisma.Decimal(amountStr),
          currency: 'BDT',
          description,
          status,
          idempotencyKey: `seed-request-${String(reqIndex).padStart(2, '0')}`,
          createdAt: daysAgo(days, 11, reqIndex * 13 % 60),
          respondedAt: respondedDays ? daysAgo(respondedDays, 18, reqIndex * 11 % 60) : null,
        },
      });

      // ---- Settlements for APPROVED requests ----
      if (status === 'APPROVED') {
        settlementIndex += 1;
        const amount = new Prisma.Decimal(amountStr);
        const payer = accountOf(requestedFromEmail); // the one who pays
        const receiver = accountOf(requesterEmail); // the one who receives
        const payerUser = usersByEmail[requestedFromEmail];
        const receiverUser = usersByEmail[requesterEmail];

        await tx.account.update({
          where: { id: payer.id },
          data: { balance: { decrement: amount } },
        });
        await tx.account.update({
          where: { id: receiver.id },
          data: { balance: { increment: amount } },
        });

        const payerBalanceAfter = balanceByUserId[payer.userId].minus(amount);
        const receiverBalanceAfter = balanceByUserId[receiver.userId].plus(amount);
        balanceByUserId[payer.userId] = payerBalanceAfter;
        balanceByUserId[receiver.userId] = receiverBalanceAfter;

        await tx.transaction.create({
          data: {
            type: 'REQUEST_SETTLEMENT',
            status: 'SUCCEEDED',
            senderAccountId: payer.id,
            receiverAccountId: receiver.id,
            amount,
            currency: 'BDT',
            senderNameAtTime: payerUser.name,
            receiverNameAtTime: receiverUser.name,
            senderBalanceAfter: payerBalanceAfter,
            receiverBalanceAfter: receiverBalanceAfter,
            idempotencyKey: `seed-settlement-${String(settlementIndex).padStart(2, '0')}`,
            description: `Request settled: ${description}`,
            moneyRequestId: request.id,
            createdAt: daysAgo(respondedDays ?? days, 19, settlementIndex * 17 % 60),
          },
        });
      }
    }
  });

  log(`sample data: ${txnIndex} transfers, ${reqIndex} money requests, ${settlementIndex} settlements created`);
  log('final balances (source of truth: PostgreSQL):');
  for (const u of DEMO_USERS) {
    const b = balanceByUserId[usersByEmail[u.email].id];
    log(`  ${u.email.padEnd(28)} ${b.toFixed(2)} BDT`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  log('seeding database...');
  const { usersByEmail, allFresh } = await createDemoUsers();

  if (allFresh) {
    await seedSampleData(usersByEmail);
  } else {
    log('database already contains demo users — sample data not re-created.');
    log('For a complete fresh demo dataset run:  npm run db:reset --workspace=backend');
  }

  log('done ✓');
}

main()
  .catch((err) => {
    console.error('[seed] FAILED:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
