import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  // Behind a reverse proxy (e.g. the web container's nginx), request.ip would
  // otherwise be the proxy's address and every client would share one
  // rate-limit bucket. TRUST_PROXY is the number of trusted proxy hops; leave
  // it unset when the API is exposed directly, or X-Forwarded-For is spoofable.
  const trustedProxyHops = Number(configService.get<string>('TRUST_PROXY'));
  if (Number.isInteger(trustedProxyHops) && trustedProxyHops > 0) {
    app.set('trust proxy', trustedProxyHops);
  }

  configureApp(app);

  // Handle SIGTERM/SIGINT so `docker stop` and rolling deploys shut down
  // gracefully. Node runs as PID 1 in the container, which has no default
  // signal handlers, so without this the process is SIGKILLed after the timeout.
  app.enableShutdownHooks();

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
