import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

export const env = createEnv({
  server: {
    databaseUrl: z.string().min(1),
  },
  runtimeEnv: {
    databaseUrl: process.env.DATABASE_URL,
  },
});
