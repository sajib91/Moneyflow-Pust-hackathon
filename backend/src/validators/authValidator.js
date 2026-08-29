import { z } from 'zod';

// ---------------------------------------------------------------------------
// Field rules
// ---------------------------------------------------------------------------

// Normalized here (trim + lowercase) AND again in the service layer
// (defense in depth): stored emails are always lowercase, trimmed.
const emailSchema = z
  .string({ required_error: 'Email is required' })
  .trim()
  .toLowerCase()
  .max(255, 'Email must be at most 255 characters')
  .email('A valid email address is required');

const nameSchema = z
  .string({ required_error: 'Name is required' })
  .trim()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name must be at most 100 characters');

const phoneSchema = z
  .string({ required_error: 'Phone number is required' })
  .trim()
  .min(11, 'Phone number must be at least 11 characters')
  .max(15, 'Phone number must be at most 15 characters')
  .regex(/^\+?[0-9]+$/, 'Phone number may only contain digits (and an optional leading +)');

const passwordSchema = z
  .string({ required_error: 'Password is required' })
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Express middleware
// ---------------------------------------------------------------------------

export function validate(schema) {
  return (req, res, next) => {
    try {
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      // Zod string transforms (trim/lowercase) are applied to the parsed
      // values; write them back so downstream layers see clean, normalized
      // data. Only touch req.body when the schema actually validates one.
      if (parsed.body !== undefined) {
        req.body = parsed.body;
      }
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        const details = err.errors.reduce((acc, e) => {
          acc[e.path.join('.')] = e.message;
          return acc;
        }, {});
        return res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details,
        });
      }
      next(err);
    }
  };
}
