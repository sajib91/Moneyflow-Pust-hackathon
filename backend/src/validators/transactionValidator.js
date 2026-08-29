import { z } from 'zod';

export const listTransactionsSchema = z.object({
  query: z.object({
    type: z.enum(['incoming', 'outgoing', 'pending']).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0),
  }),
});