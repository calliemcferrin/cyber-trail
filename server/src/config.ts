/**
 * Environment-driven configuration. Secrets and environment-specific values
 * come from the environment only — never hardcoded, never shipped to the client.
 */
import { z } from 'zod';

const EnvSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:5173')
    .transform((s) =>
      s
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean),
    ),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  // Fail fast and loud on misconfiguration — but don't leak values.
  console.error('[config] Invalid environment configuration.');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const config = {
  port: parsed.data.PORT,
  nodeEnv: parsed.data.NODE_ENV,
  corsOrigins: parsed.data.CORS_ORIGINS,
  isProd: parsed.data.NODE_ENV === 'production',
} as const;
