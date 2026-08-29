import * as authService from '../services/authService.js';

export async function register(req, res, next) {
  try {
    // Identity comes from validated request body (no userId accepted here).
    const result = await authService.register({
      email: req.body.email,
      phone: req.body.phone,
      name: req.body.name,
      password: req.body.password,
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getProfile(req, res, next) {
  try {
    // req.user.id comes from the verified JWT — never from the request body.
    const profile = await authService.getProfile(req.user.id);
    res.json(profile);
  } catch (err) {
    next(err);
  }
}
