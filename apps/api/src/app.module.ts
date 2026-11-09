import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth';
import { AuthorizationModule } from './authorization';
import { OrganizationsModule } from './organizations';
import { InvitationsModule } from './invitations';
import { MembersModule } from './members';
import { ProjectsModule } from './projects';
import { TasksModule } from './tasks';
import { UsageModule } from './usage';
import { NotificationsModule } from './notifications';
import { AuditModule } from './audit';
import { ApiKeysModule } from './api-keys';
import { RateLimitModule } from './rate-limit';
import { HealthModule } from './common/health/health.module';
import { RequestContextMiddleware } from './common/request-context';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    AuthorizationModule,
    OrganizationsModule,
    InvitationsModule,
    MembersModule,
    ProjectsModule,
    TasksModule,
    UsageModule,
    NotificationsModule,
    AuditModule,
    ApiKeysModule,
    RateLimitModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
