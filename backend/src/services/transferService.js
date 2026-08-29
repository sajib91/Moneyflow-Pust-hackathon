import { Prisma } from '@prisma/client';
import { InsufficientFundsError, SelfTransferError, NotFoundError } from '../errors/ApiError.js';
import prisma from '../config/prisma.js';
import * as accountRepo from '../repositories/accountRepository.js';
import * as transferRepo from '../repositories/transferRepository.js';
import * as idempotency from '../middlewares/idempotency.js';

function validateAmount(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error('amount must be a positive number');
  }
}

export async function sendMoney({ fromUserId, toUserId, amount, idempotencyKey, type = 'TRANSFER', moneyRequestId = null }) {
  validateAmount(amount);
  if (fromUserId === toUserId) throw new SelfTransferError();

  const amountDecimal = new Prisma.Decimal(amount);

  return prisma.$transaction(async (tx) => {
    await idempotency.checkIdempotency(fromUserId, idempotencyKey, tx);

    // Lock in deterministic order (lower userId first) to avoid deadlocks
    const [firstUserId, secondUserId] = [fromUserId, toUserId].sort();
    const firstAcc = await accountRepo.findAccountByUserId(tx, firstUserId, true);
    const secondAcc = await accountRepo.findAccountByUserId(tx, secondUserId, true);

    const sender = firstUserId === fromUserId ? firstAcc : secondAcc;
    const receiver = firstUserId === fromUserId ? secondAcc : firstAcc;

    if (!sender) throw new NotFoundError('Sender account');
    if (!receiver) throw new NotFoundError('Receiver account');

    if (sender.balance.lessThan(amountDecimal)) {
      throw new InsufficientFundsError(sender.balance);
    }

    await accountRepo.adjustBalance(tx, fromUserId, amountDecimal.negated());
    await accountRepo.adjustBalance(tx, toUserId, amountDecimal);

    const newSenderBalance = sender.balance.minus(amountDecimal);
    const newReceiverBalance = receiver.balance.plus(amountDecimal);

    const transfer = await transferRepo.createTransfer(tx, {
      type,
      status: 'SUCCEEDED',
      senderAccountId: sender.id,
      receiverAccountId: receiver.id,
      amount: amountDecimal,
      senderNameAtTime: sender.user.name,
      receiverNameAtTime: receiver.user.name,
      senderBalanceAfter: newSenderBalance,
      receiverBalanceAfter: newReceiverBalance,
      idempotencyKey,
      moneyRequestId,
    });

    const response = {
      transferId: transfer.id,
      amount: Number(amount),
      newBalance: newSenderBalance.toNumber(),
    };

    await idempotency.markIdempotencyCompleted(fromUserId, idempotencyKey, response, tx);
    return response;
  }, { isolationLevel: 'ReadCommitted' });
}

export async function getBalance(userId) {
  const balance = await accountRepo.getBalance(prisma, userId);
  return { balance: Number(balance) };
}