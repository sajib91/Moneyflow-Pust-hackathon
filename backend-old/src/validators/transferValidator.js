import { z } from 'zod';

export const sendMoneySchema = z.object({
  body: z.object({
    toUserId: z.string().uuid(),
    amount: z.number().int().positive(),
    idempotencyKey: z.string().uuid().optional(),
  }),
});

export const searchUsersSchema = z.object({
  query: z.object({
    q: z.string().min(1).max(100),
    limit: z.coerce.number().int().min(1).max(50).default(10),
  }),
});