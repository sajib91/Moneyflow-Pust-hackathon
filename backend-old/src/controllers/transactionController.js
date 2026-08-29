import * as transactionService from '../services/transactionService.js';

export async function getTransactions(req, res, next) {
  try {
    const { type, limit = 20, offset = 0 } = req.query;
    const transactions = await transactionService.getTransactions(req.user.id, {
      type,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
    res.json({ transactions });
  } catch (err) {
    next(err);
  }
}

export async function getTransactionById(req, res, next) {
  try {
    const transaction = await transactionService.getTransactionById(req.user.id, req.params.id);
    if (!transaction) {
      return res.status(404).json({ error: 'NOT_FOUND', message: 'Transaction not found' });
    }
    res.json(transaction);
  } catch (err) {
    next(err);
  }
}