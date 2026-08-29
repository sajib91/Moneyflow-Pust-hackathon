import * as requestService from '../services/requestService.js';
import { respond } from '../utils/respond.js';

export async function createRequest(req, res, next) {
  try {
    const result = await requestService.createRequest({
      requesterId: req.user.id,
      payerId: req.body.fromUserId,
      amount: req.body.amount,
      idempotencyKey: req.idempotencyKey,
    });
    return respond(res, 201, result);
  } catch (err) {
    next(err);
  }
}

export async function approveRequest(req, res, next) {
  try {
    const result = await requestService.approveRequest(req.user.id, req.params.id);
    return respond(res, 200, result);
  } catch (err) {
    next(err);
  }
}

export async function rejectRequest(req, res, next) {
  try {
    const result = await requestService.rejectRequest(req.user.id, req.params.id);
    return respond(res, 200, result);
  } catch (err) {
    next(err);
  }
}

export async function cancelRequest(req, res, next) {
  try {
    const result = await requestService.cancelRequest(req.user.id, req.params.id);
    return respond(res, 200, result);
  } catch (err) {
    next(err);
  }
}

export async function getRequests(req, res, next) {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    const requests = await requestService.getRequests(req.user.id, limit, offset);
    return respond(res, 200, { requests });
  } catch (err) {
    next(err);
  }
}

export async function getPendingRequests(req, res, next) {
  try {
    const requests = await requestService.getPendingRequestsForUser(req.user.id);
    return respond(res, 200, { requests });
  } catch (err) {
    next(err);
  }
}