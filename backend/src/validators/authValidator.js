// Backward-compatibility shim — all shared validation now lives in
// ./validation.js. Keep imports working for legacy code.
export { validate, registerSchema, loginSchema } from './validation.js';
