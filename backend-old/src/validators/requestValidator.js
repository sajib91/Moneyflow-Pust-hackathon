import { z } from 'zod';

export const createRequestSchema = z.object({
  body: z.object({
    fromUserId: z.string().uuid(),
    amount: z.number().int().positive(),
    idempotencyKey: z.string().uuid().optional(),
  }),
});

export const respondRequestSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});

export const cancelRequestSchema = z.object({
  params: z.object({
    id: z.string().uuid(),
  }),
});