import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth';
import { AuthorizationModule } from './authorization';
import { OrganizationsModule } from './organizations';
import { InvitationsModule } from './invitations';
import { MembersModule } from './members';
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
