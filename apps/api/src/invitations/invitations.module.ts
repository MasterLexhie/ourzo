import { Module } from '@nestjs/common';
import { InvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations.service';
import { InvitationsRepository } from './repositories/invitations.repository';
import { PrismaModule } from '@/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [InvitationsController],
  providers: [InvitationsService, InvitationsRepository],
  exports: [InvitationsService, InvitationsRepository],
})
export class InvitationsModule {}
