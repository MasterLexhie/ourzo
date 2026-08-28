import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { PublicRouteGuard } from './auth';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const reflector = app.get(Reflector);

  const allowOrigin =
    configService.get<string>('ALLOW_ORIGIN') || 'http://localhost:5173/';
  const origins = allowOrigin
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''));

  app.enableCors({
    origin: origins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowHeaders: ['Content-Type', 'Authorization', 'X-Workspace-Id'],
    exposedHeaders: ['Content-Length', 'X-Request-Id'],
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

  app.useGlobalGuards(new PublicRouteGuard(reflector));

  const config = new DocumentBuilder()
    .setTitle('Ourzo API')
    .setDescription('Ourzo SaaS Workspace API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(configService.get<number>('PORT') ?? 3000);
}

bootstrap().catch(console.error);
