import { z } from 'zod';

export const accountSchema = z.object({
  name: z.string().trim().min(2).max(80),
  type: z.string().min(1),
  currency: z.string().regex(/^[A-Z]{3}$/),
  verified_balance: z.coerce.number().finite(),
  workspace_id: z.string().uuid().or(z.string().min(1)),
});

export const transactionSchema = z.object({
  amount: z.coerce.number().positive(),
  currency: z.string().regex(/^[A-Z]{3}$/),
  type: z.enum(['credit', 'debit', 'transfer', 'adjustment']),
  description: z.string().trim().max(140).optional(),
});
