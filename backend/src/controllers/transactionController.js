import * as transactionService from '../services/transactionService.js';
import { respond } from '../utils/respond.js';
import { NotFoundError } from '../errors/ApiError.js';

export async function getTransactions(req, res, next) {
  try {
    const { type, limit = 20, offset = 0 } = req.query;
    const transactions = await transactionService.getTransactions(req.user.id, {
      type,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
    return respond(res, 200, { transactions });
  } catch (err) {
    next(err);
  }
}

export async function getTransactionById(req, res, next) {
  try {
    const transaction = await transactionService.getTransactionById(req.user.id, req.params.id);
    if (!transaction) {
      throw new NotFoundError('Transaction');
    }
    return respond(res, 200, transaction);
  } catch (err) {
    next(err);
  }
}