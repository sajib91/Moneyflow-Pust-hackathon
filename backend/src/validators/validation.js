import { z } from 'zod';
import { ValidationError } from '../errors/ApiError.js';

// =============================================================================
// Shared validation middleware
// Parses and validates body/query/params at the API boundary, writes the
// normalized values back, and turns Zod failures into a ValidationError.
// =============================================================================

export function validate(schema) {
  return (req, res, next) => {
    try {
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      if (parsed.body !== undefined) req.body = parsed.body;
      if (parsed.query !== undefined) req.query = parsed.query;
      if (parsed.params !== undefined) req.params = parsed.params;
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        const details = err.errors.reduce((acc, e) => {
          acc[e.path.join('.')] = e.message;
          return acc;
        }, {});
        return next(new ValidationError(details));
      }
      next(err);
    }
  };
}

// =============================================================================
// Reusable field rules
// =============================================================================

export const idSchema = z
  .string({ required_error: 'ID is required' })
  .uuid({ message: 'ID must be a valid UUID' });

export const emailSchema = z
  .string({ required_error: 'Email is required' })
  .trim()
  .toLowerCase()
  .max(255, 'Email must be at most 255 characters')
  .email('A valid email address is required');

export const nameSchema = z
  .string({ required_error: 'Name is required' })
  .trim()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name must be at most 100 characters');

export const phoneSchema = z
  .string({ required_error: 'Phone number is required' })
  .trim()
  .min(11, 'Phone number must be at least 11 characters')
  .max(15, 'Phone number must be at most 15 characters')
  .regex(/^\+?[0-9]+$/, 'Phone number may only contain digits (and an optional leading +)');

export const passwordSchema = z
  .string({ required_error: 'Password is required' })
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

// Money in BDT. Accepts numbers or numeric strings, always positive,
// at most 2 decimal places (poisha precision). Returns "100.00"-style string.
export const bdtAmountSchema = z
  .union([z.number(), z.string()], {
    errorMap: () => ({ message: 'Amount must be a number' }),
  })
  .transform((v, ctx) => {
    let n;
    if (typeof v === 'string') {
      const s = v.trim();
      if (s === '' || !/^\d+(\.\d{1,2})?$/.test(s)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Amount must be a positive number with at most two decimal places',
        });
        return z.NEVER;
      }
      n = Number(s);
    } else {
      n = v;
    }
    if (!Number.isFinite(n) || n <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Amount must be greater than zero' });
      return z.NEVER;
    }
    if (Math.round(n * 100) / 100 !== n) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Amount must have at most two decimal places',
      });
      return z.NEVER;
    }
    return n.toFixed(2);
  });

// Pagination: limit 1..100 (default 20), offset >= 0 (default 0).
export const paginationSchema = {
  limit: z.coerce.number({ invalid_type_error: 'limit must be a number' }).int('limit must be an integer').min(1, 'limit must be at least 1').max(100, 'limit must be at most 100').default(20),
  offset: z.coerce.number({ invalid_type_error: 'offset must be a number' }).int('offset must be an integer').min(0, 'offset must be at least 0').default(0),
};

// Valid transaction status filters.
export const TRANSACTION_STATUS_FILTERS = ['incoming', 'outgoing', 'pending'];

export const transactionStatusFilterSchema = z.enum(TRANSACTION_STATUS_FILTERS, {
  errorMap: () => ({ message: `type must be one of: ${TRANSACTION_STATUS_FILTERS.join(', ')}` }),
});

// =============================================================================
// Endpoint schemas
// =============================================================================

export const registerSchema = z.object({
  body: z.object({
    email: emailSchema,
    phone: phoneSchema,
    name: nameSchema,
    password: passwordSchema,
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: emailSchema,
    password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required'),
  }),
});

export const sendMoneySchema = z.object({
  body: z.object({
    toUserId: idSchema,
    amount: bdtAmountSchema,
    description: z.string().trim().max(255, 'Description must be at most 255 characters').optional(),
  }),
});

export const searchUsersSchema = z.object({
  query: z.object({
    q: z.string({ required_error: 'q is required' }).trim().min(1, 'q must not be empty').max(100, 'q must be at most 100 characters'),
    ...paginationSchema,
  }),
});

export const createRequestSchema = z.object({
  body: z.object({
    fromUserId: idSchema,
    amount: bdtAmountSchema,
    description: z.string().trim().max(255, 'Description must be at most 255 characters').optional(),
  }),
});

export const requestIdParamSchema = z.object({
  params: z.object({
    id: idSchema,
  }),
});

export const cancelRequestSchema = requestIdParamSchema;

export const listTransactionsSchema = z.object({
  query: z.object({
    type: transactionStatusFilterSchema.optional(),
    ...paginationSchema,
  }),
});

export const transactionIdParamSchema = z.object({
  params: z.object({
    id: idSchema,
  }),
});
