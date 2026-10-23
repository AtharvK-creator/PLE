import { z } from 'zod';

const envSchema = z.object({
  // App
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  APP_URL: z.string().url().default('http://localhost:3000'),
  API_URL: z.string().url().default('http://localhost:3001'),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DIRECT_URL: z.string().min(1, 'DIRECT_URL is required'),

  // Auth
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES: z.string().default('15m'),
  JWT_REFRESH_EXPIRES: z.string().default('7d'),
  COOKIE_SECRET: z.string().min(16, 'COOKIE_SECRET must be at least 16 characters'),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().min(1, 'GOOGLE_CLIENT_ID is required'),
  GOOGLE_CLIENT_SECRET: z.string().min(1, 'GOOGLE_CLIENT_SECRET is required'),
  GOOGLE_CALLBACK_URL: z
    .string()
    .url()
    .default('http://localhost:3001/api/v1/auth/google/callback'),

  // AI Gateway
  AI_PROVIDER: z.enum(['gemini', 'groq']).default('gemini'),
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
  GEMINI_MODEL: z.string().default('gemini-1.5-flash'),
  GEMINI_MODEL_QUIZ: z.string().default('gemini-1.5-flash'),
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().default('llama-3.3-70b-versatile'),
  GROQ_MODEL_QUIZ: z.string().default('llama-3.1-8b-instant'),

  // Analytics
  POSTHOG_KEY: z.string().optional(),
  POSTHOG_HOST: z.string().url().default('https://app.posthog.com'),

  // n8n Webhooks (optional)
  N8N_WEBHOOK_SECRET: z.string().optional(),
  N8N_WEBHOOK_URL: z.string().url().optional(),

  // SMTP (Nodemailer)
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().default('your_email@gmail.com'),
  SMTP_PASS: z.string().default('your_app_password'),
  MAIL_FROM: z.string().default('PLE Support <your_email@gmail.com>'),
  FRONTEND_URL: z.string().url().default('http://localhost:3005'),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    const errors = result.error.issues.map((issue) => `  • ${issue.path.join('.')}: ${issue.message}`).join('\n');
    throw new Error(`\n❌ Environment validation failed:\n${errors}\n\nCheck your .env file against .env.example`);
  }
  return result.data;
}
