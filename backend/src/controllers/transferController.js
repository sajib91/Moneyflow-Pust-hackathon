import * as transferService from '../services/transferService.js';
import { respond } from '../utils/respond.js';

export async function sendMoney(req, res, next) {
  try {
    const result = await transferService.sendMoney({
      fromUserId: req.user.id,
      toUserId: req.body.toUserId,
      amount: req.body.amount,
      idempotencyKey: req.idempotencyKey,
    });
    return respond(res, 201, result);
  } catch (err) {
    next(err);
  }
}

export async function getBalance(req, res, next) {
  try {
    const result = await transferService.getBalance(req.user.id);
    return respond(res, 200, result);
  } catch (err) {
    next(err);
  }
}