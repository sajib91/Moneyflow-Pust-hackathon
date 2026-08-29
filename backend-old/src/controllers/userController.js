import * as userService from '../services/userService.js';

export async function searchUsers(req, res, next) {
  try {
    const { q, limit = 10 } = req.query;
    const users = await userService.searchUsers(req.user.id, q, parseInt(limit));
    res.json({ users });
  } catch (err) {
    next(err);
  }
}