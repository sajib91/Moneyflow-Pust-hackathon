/**
 * Consistent success response shape:
 *   { success: true, data: {...} }
 *
 * Controllers call respond(res, 200, payload) instead of res.json() so
 * every success response has the same envelope.
 */
export function respond(res, statusCode, data = {}) {
  return res.status(statusCode).json({ success: true, data });
}
