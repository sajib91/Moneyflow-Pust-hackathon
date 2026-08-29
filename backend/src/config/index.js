import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  // BDT amount credited to every new account (schema stores DECIMAL(18,2) BDT).
  defaultUserBalance: process.env.DEFAULT_USER_BALANCE || '100000',
  idempotencyTtlHours: parseInt(process.env.IDEMPOTENCY_TTL_HOURS || '24', 10),
};

if (!config.jwt.secret || config.jwt.secret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters');
}