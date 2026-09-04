import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url().default('http://localhost:4000/api'),
  NEXT_PUBLIC_SITE_NAME: z.string().default('Blooming Beauty Skin'),
  NEXT_PUBLIC_SITE_URL: z.string().url().default('http://localhost:3000'),
});

function validateEnv() {
  if (typeof window !== 'undefined') return envSchema.parse(process.env);
  return envSchema.parse(process.env);
}

export const env = validateEnv();
