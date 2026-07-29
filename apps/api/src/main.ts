import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { mkdirSync } from 'fs';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setGlobalPrefix('api/v1', {
    exclude: ['health'],
  });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.use(cookieParser());

  const configService = app.get(ConfigService);

  // diskStorage (see uploads/uploads.controller.ts) doesn't create its
  // destination directory itself - ensure it exists before the first upload.
  // Served via useStaticAssets, which registers directly on the underlying
  // Express app - independent of setGlobalPrefix, so /uploads/<file> stays
  // an un-versioned path even though the upload POST endpoint itself lives
  // under /api/v1/uploads/images like every other route.
  const uploadDir = configService.get<string>('UPLOAD_DIR') ?? '/app/uploads';
  mkdirSync(uploadDir, { recursive: true });
  app.useStaticAssets(uploadDir, { prefix: '/uploads' });

  const allowedOrigins = (configService.get<string>('ALLOWED_REDIRECT_URLS') ?? '')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean);
  app.enableCors({ origin: allowedOrigins, credentials: true });

  const port = configService.get<number>('PORT') ?? 3000;
  await app.listen(port, '0.0.0.0');
}
bootstrap();
