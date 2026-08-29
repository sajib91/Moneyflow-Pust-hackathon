import * as transferService from '../services/transferService.js';

export async function sendMoney(req, res, next) {
  try {
    const result = await transferService.sendMoney({
      fromUserId: req.user.id,
      toUserId: req.body.toUserId,
      amount: req.body.amount,
      idempotencyKey: req.idempotencyKey,
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getBalance(req, res, next) {
  try {
    const result = await transferService.getBalance(req.user.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}