import { config } from '../config/index.js';
import { InsufficientFundsError, SelfTransferError, NotFoundError, ConflictError, IdempotencyConflictError } from '../errors/ApiError.js';
import prisma from '../config/prisma.js';
import * as userRepo from '../repositories/userRepository.js';
import * as accountRepo from '../repositories/accountRepository.js';
import * as transferRepo from '../repositories/transferRepository.js';
import * as transactionRepo from '../repositories/transactionRepository.js';
import * as idempotency from '../middlewares/idempotency.js';
import { takaToPoisha, validatePositiveInteger } from '../utils/money.js';

export async function sendMoney({ fromUserId, toUserId, amount, idempotencyKey }) {
  validatePositiveInteger(amount, 'amount');
  if (fromUserId === toUserId) throw new SelfTransferError();

  const amountPoisha = takaToPoisha(amount);

  return prisma.$transaction(async (tx) => {
    await idempotency.checkIdempotency(fromUserId, idempotencyKey, tx);

    const sender = await accountRepo.findAccountByUserId(tx, fromUserId, true);
    if (!sender) throw new NotFoundError('Sender account');

    if (sender.balance < amountPoisha) {
      throw new InsufficientFundsError(sender.balance);
    }

    const receiver = await accountRepo.findAccountByUserId(tx, toUserId, true);
    if (!receiver) throw new NotFoundError('Receiver account');

    await accountRepo.adjustBalance(tx, fromUserId, -amountPoisha);
    await accountRepo.adjustBalance(tx, toUserId, amountPoisha);

    const transfer = await transferRepo.createTransfer(tx, {
      idempotencyKey,
      senderId: fromUserId,
      receiverId: toUserId,
      amount: amountPoisha,
      status: 'SUCCEEDED',
    });

    const newSenderBalance = sender.balance - amountPoisha;
    const newReceiverBalance = receiver.balance + amountPoisha;

    await transactionRepo.createLedgerEntries(tx, [
      {
        type: 'DEBIT',
        userId: fromUserId,
        amount: amountPoisha,
        balanceAfter: newSenderBalance,
        referenceId: transfer.id,
        referenceType: 'TRANSFER',
        description: `Sent to ${receiver.user?.name || 'user'}`,
      },
      {
        type: 'CREDIT',
        userId: toUserId,
        amount: amountPoisha,
        balanceAfter: newReceiverBalance,
        referenceId: transfer.id,
        referenceType: 'TRANSFER',
        description: `Received from ${sender.user?.name || 'user'}`,
      },
    ]);

    const response = {
      transferId: transfer.id,
      amount,
      newBalance: Number(newSenderBalance) / 100,
    };

    await idempotency.markIdempotencyCompleted(fromUserId, idempotencyKey, response, tx);

    return response;
  }, { isolationLevel: 'ReadCommitted' });
}

export async function getBalance(userId) {
  const balance = await accountRepo.getBalance(prisma, userId);
  return { balance: Number(balance) / 100 };
}