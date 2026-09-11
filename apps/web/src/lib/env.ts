import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z.preprocess(
    (value) => value === '' || value == null ? '/api' : value,
    z.string().refine(
      (value) => value.startsWith('/') || z.string().url().safeParse(value).success,
      'NEXT_PUBLIC_API_URL must be a URL or same-origin path',
    ),
  ),
  NEXT_PUBLIC_SITE_NAME: z.string().default('Blooming Beauty Skin'),
  NEXT_PUBLIC_SITE_URL: z.string().url().default('http://localhost:3000'),
});

function validateEnv() {
  if (typeof window !== 'undefined') return envSchema.parse(process.env);
  return envSchema.parse(process.env);
}

export const env = validateEnv();
