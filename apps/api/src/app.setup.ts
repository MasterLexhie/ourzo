import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { PublicRouteGuard } from './auth';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

export const DEFAULT_ALLOW_ORIGIN = 'http://localhost:5173';

/** Parses ALLOW_ORIGIN (comma-separated) into exact origins without trailing slashes. */
export function parseAllowedOrigins(value: string | undefined): string[] {
  return (value || DEFAULT_ALLOW_ORIGIN)
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);
}

/**
 * Global HTTP configuration shared by the server (main.ts) and the e2e test
 * harness, so tests exercise exactly the production request pipeline.
 */
export function configureApp(app: INestApplication): void {
  const configService = app.get(ConfigService);
  const reflector = app.get(Reflector);

  app.enableCors({
    origin: parseAllowedOrigins(configService.get<string>('ALLOW_ORIGIN')),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Workspace-Id'],
    exposedHeaders: [
      'Content-Length',
      'X-Request-Id',
      'Retry-After',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
    ],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  app.useGlobalGuards(new PublicRouteGuard(reflector));
}
