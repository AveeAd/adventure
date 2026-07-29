import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  PORT: z.coerce.number().int().positive().default(3000),
  JWT_ACCESS_SECRET: z.string().min(1, 'JWT_ACCESS_SECRET is required'),
  JWT_ACCESS_TTL: z.string().min(1).default('15m'),
  JWT_REFRESH_SECRET: z.string().min(1, 'JWT_REFRESH_SECRET is required'),
  JWT_REFRESH_TTL: z.string().min(1).default('7d'),
  GOOGLE_CLIENT_ID: z.string().min(1, 'GOOGLE_CLIENT_ID is required'),
  GOOGLE_CLIENT_SECRET: z.string().min(1, 'GOOGLE_CLIENT_SECRET is required'),
  GOOGLE_CALLBACK_URL: z.string().min(1, 'GOOGLE_CALLBACK_URL is required'),
  ADMIN_EMAILS: z.string().default(''),
  ALLOWED_REDIRECT_URLS: z.string().min(1, 'ALLOWED_REDIRECT_URLS is required'),
  UPLOAD_DIR: z.string().min(1).default('/app/uploads'),
  MAX_UPLOAD_SIZE_MB: z.coerce.number().int().positive().default(5),
  // The API's own externally-reachable origin (same value the frontends bake
  // in as VITE_API_URL) - needed so uploaded-file URLs returned to clients
  // are absolute. A relative "/uploads/x.png" would resolve against
  // whichever origin embeds it (the public site's domain in prod, not the
  // API's), which is wrong across the multi-frontend/subdomain deploy.
  PUBLIC_API_URL: z.string().min(1).default('http://localhost:3000'),
});

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => envSchema.parse(config),
    }),
  ],
})
export class ConfigModule {}
