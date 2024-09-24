import z from 'zod';

export const pageContextSchema = z
  .object({
    searchParams: z
      .object({
        error: z.string().optional(),
      })
      .optional(),
  })
  .optional();
